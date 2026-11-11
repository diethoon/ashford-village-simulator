import { observeWorldEvent } from "./awareness.js";
import type { EventCommitResult, GoalDelta, NpcState, SimulationSnapshot, WorldEvent } from "./types.js";

function isValidGoalTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed: Record<string, string[]> = {
    unresolved: ["active", "failed", "abandoned"],
    active: ["delegated", "completed", "failed", "abandoned"],
    delegated: ["active", "completed", "failed", "abandoned"],
    completed: [],
    failed: [],
    abandoned: []
  };
  return (allowed[from] ?? []).includes(to);
}

function eventReferencesExist(npcs: NpcState[], event: WorldEvent): boolean {
  const ids = new Set(npcs.map((npc) => npc.id));
  const eventParticipants = [
    ...event.actorIds,
    ...event.affectedNpcIds,
    ...event.witnessNpcIds,
    ...event.publicNoticeNpcIds
  ];
  const relationshipParticipants = (event.relationshipDeltas ?? [])
    .flatMap((change) => [change.npcId, change.targetNpcId]);
  const goalParticipants = (event.goalDeltas ?? []).map((change) => change.npcId);
  const needParticipants = (event.needDeltas ?? []).map((change) => change.npcId);
  return [...eventParticipants, ...relationshipParticipants, ...goalParticipants, ...needParticipants]
    .every((id) => ids.has(id));
}

/**
 * Commits a canonical state transition and its event as one atomic operation.
 * Resource changes are validated before any NPC, event, or knowledge state is
 * changed. The event is then delivered only to eligible participants/witnesses.
 */
export function commitWorldEvent(
  state: SimulationSnapshot,
  event: WorldEvent
): EventCommitResult {
  if (event.tick < state.tick) {
    return { ok: false, state, error: "Event tick cannot move world time backwards." };
  }
  if (state.events.some((existing) => existing.id === event.id)) {
    return { ok: false, state, error: `Duplicate event id: ${event.id}` };
  }
  const unknownResolvedEvents = (event.resolvesEventIds ?? [])
    .filter((resolvedId) => !state.events.some((existing) => existing.id === resolvedId));
  if (unknownResolvedEvents.length > 0) {
    return {
      ok: false,
      state,
      error: `Cannot resolve unknown event(s): ${unknownResolvedEvents.join(", ")}`
    };
  }
  if (!eventReferencesExist(state.npcs, event)) {
    return { ok: false, state, error: "Event references an unknown NPC." };
  }

  const npcById = new Map(state.npcs.map((npc) => [npc.id, npc]));
  const totals = new Map<string, { npcId: string; resourceId: string; delta: number }>();

  for (const change of event.resourceDeltas ?? []) {
    if (!Number.isFinite(change.delta)) {
      return { ok: false, state, error: "Resource delta must be a finite number." };
    }
    const key = `${change.npcId}::${change.resourceId}`;
    const current = totals.get(key);
    totals.set(key, {
      npcId: change.npcId,
      resourceId: change.resourceId,
      delta: (current?.delta ?? 0) + change.delta
    });
  }

  for (const change of totals.values()) {
    const npc = npcById.get(change.npcId);
    if (!npc) {
      return { ok: false, state, error: `Unknown resource owner: ${change.npcId}` };
    }
    const current = npc.resources[change.resourceId] ?? 0;
    if (!Number.isFinite(current) || current + change.delta < 0) {
      return {
        ok: false,
        state,
        error: `Resource transition would create an invalid quantity: ${change.npcId}/${change.resourceId}`
      };
    }
  }

  const needTotals = new Map<string, { npcId: string; needId: string; delta: number }>();
  for (const change of event.needDeltas ?? []) {
    if (!Number.isFinite(change.delta)) {
      return { ok: false, state, error: "Need delta must be a finite number." };
    }
    const key = `${change.npcId}::${change.needId}`;
    const current = needTotals.get(key);
    needTotals.set(key, {
      npcId: change.npcId,
      needId: change.needId,
      delta: (current?.delta ?? 0) + change.delta
    });
  }

  for (const change of needTotals.values()) {
    const npc = npcById.get(change.npcId);
    const need = npc?.needs?.find((item) => item.id === change.needId);
    const next = (need?.value ?? Number.NaN) + change.delta;
    if (!need || !Number.isFinite(need.value) || next < 0 || next > 1) {
      return {
        ok: false,
        state,
        error: `Need transition would leave the valid range or references an unknown need: ${change.npcId}/${change.needId}`
      };
    }
  }

  const relationshipTotals = new Map<string, {
    npcId: string;
    targetNpcId: string;
    trust: number;
    affinity: number;
    respect: number;
    fear: number;
  }>();

  for (const change of event.relationshipDeltas ?? []) {
    const values = [change.trust, change.affinity, change.respect, change.fear]
      .filter((value): value is number => value !== undefined);
    if (values.some((value) => !Number.isFinite(value))) {
      return { ok: false, state, error: "Relationship deltas must be finite numbers." };
    }
    const key = `${change.npcId}::${change.targetNpcId}`;
    const existing = relationshipTotals.get(key) ?? {
      npcId: change.npcId,
      targetNpcId: change.targetNpcId,
      trust: 0,
      affinity: 0,
      respect: 0,
      fear: 0
    };
    relationshipTotals.set(key, {
      ...existing,
      trust: existing.trust + (change.trust ?? 0),
      affinity: existing.affinity + (change.affinity ?? 0),
      respect: existing.respect + (change.respect ?? 0),
      fear: existing.fear + (change.fear ?? 0)
    });
  }

  for (const change of relationshipTotals.values()) {
    const npc = npcById.get(change.npcId)!;
    const current = npc.relationships[change.targetNpcId] ?? {
      trust: 0.5, affinity: 0.5, respect: 0.5, fear: 0
    };
    const next = [
      current.trust + change.trust,
      current.affinity + change.affinity,
      current.respect + change.respect,
      current.fear + change.fear
    ];
    if (next.some((value) => value < 0 || value > 1)) {
      return {
        ok: false,
        state,
        error: `Relationship transition would leave the valid range: ${change.npcId}/${change.targetNpcId}`
      };
    }
  }

  const goalDeltas = new Map<string, GoalDelta>();
  for (const change of event.goalDeltas ?? []) {
    const key = `${change.npcId}::${change.goalId}`;
    const prior = goalDeltas.get(key);
    if (prior && prior.status !== change.status) {
      return { ok: false, state, error: `Conflicting goal updates in event: ${key}` };
    }
    goalDeltas.set(key, change);
  }

  for (const change of goalDeltas.values()) {
    const npc = npcById.get(change.npcId)!;
    const goal = npc.goals.find((item) => item.id === change.goalId);
    if (!goal) {
      return { ok: false, state, error: `Unknown NPC goal: ${change.npcId}/${change.goalId}` };
    }
    if (!isValidGoalTransition(goal.status, change.status)) {
      return {
        ok: false,
        state,
        error: `Invalid goal transition: ${change.npcId}/${change.goalId} ${goal.status} -> ${change.status}`
      };
    }
  }

  const changedResources = new Map<string, NpcState>();
  for (const change of totals.values()) {
    const npc = changedResources.get(change.npcId) ?? npcById.get(change.npcId)!;
    changedResources.set(change.npcId, {
      ...npc,
      resources: {
        ...npc.resources,
        [change.resourceId]: (npc.resources[change.resourceId] ?? 0) + change.delta
      }
    });
  }

  const changedRelationships = new Map<string, NpcState>();
  for (const change of relationshipTotals.values()) {
    const npc = changedRelationships.get(change.npcId) ??
      changedResources.get(change.npcId) ??
      npcById.get(change.npcId)!;
    const current = npc.relationships[change.targetNpcId] ?? {
      trust: 0.5, affinity: 0.5, respect: 0.5, fear: 0
    };
    changedRelationships.set(change.npcId, {
      ...npc,
      relationships: {
        ...npc.relationships,
        [change.targetNpcId]: {
          trust: current.trust + change.trust,
          affinity: current.affinity + change.affinity,
          respect: current.respect + change.respect,
          fear: current.fear + change.fear
        }
      }
    });
  }

  const changedGoals = new Map<string, NpcState>();
  for (const change of goalDeltas.values()) {
    const npc = changedGoals.get(change.npcId) ??
      changedRelationships.get(change.npcId) ??
      changedResources.get(change.npcId) ??
      npcById.get(change.npcId)!;
    changedGoals.set(change.npcId, {
      ...npc,
      goals: npc.goals.map((goal) =>
        goal.id === change.goalId ? { ...goal, status: change.status } : goal
      )
    });
  }

  const changedNeeds = new Map<string, NpcState>();
  for (const change of needTotals.values()) {
    const npc = changedNeeds.get(change.npcId) ??
      changedGoals.get(change.npcId) ??
      changedRelationships.get(change.npcId) ??
      changedResources.get(change.npcId) ??
      npcById.get(change.npcId)!;
    changedNeeds.set(change.npcId, {
      ...npc,
      needs: (npc.needs ?? []).map((need) =>
        need.id === change.needId ? { ...need, value: need.value + change.delta } : need
      )
    });
  }

  const committedNpcs = state.npcs.map((npc) =>
    changedNeeds.get(npc.id) ??
    changedGoals.get(npc.id) ??
    changedRelationships.get(npc.id) ??
    changedResources.get(npc.id) ??
    npc
  );
  const eventSnapshot = {
    ...event,
    tags: [...event.tags],
    resourceDeltas: [...(event.resourceDeltas ?? [])],
    relationshipDeltas: [...(event.relationshipDeltas ?? [])],
    goalDeltas: [...(event.goalDeltas ?? [])],
    needDeltas: [...(event.needDeltas ?? [])],
    resolvesEventIds: [...(event.resolvesEventIds ?? [])]
  };
  const informedNpcs = committedNpcs.map((npc) => observeWorldEvent(npc, eventSnapshot));

  return {
    ok: true,
    state: {
      tick: event.tick,
      npcs: informedNpcs,
      events: [...state.events, eventSnapshot]
    }
  };
}
