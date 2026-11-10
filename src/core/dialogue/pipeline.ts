import { observeWorldEvent } from "./awareness.js";
import type { EventCommitResult, NpcState, SimulationSnapshot, WorldEvent } from "./types.js";

function eventReferencesExist(npcs: NpcState[], event: WorldEvent): boolean {
  const ids = new Set(npcs.map((npc) => npc.id));
  return [
    ...event.affectedNpcIds,
    ...event.witnessNpcIds,
    ...event.publicNoticeNpcIds
  ].every((id) => ids.has(id));
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

  const committedNpcs = state.npcs.map((npc) => changedResources.get(npc.id) ?? npc);
  const eventSnapshot = { ...event, tags: [...event.tags], resourceDeltas: [...(event.resourceDeltas ?? [])] };
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
