import { commitWorldEvent } from "../dialogue/pipeline.js";
import type {
  GoalDelta,
  KnowledgeChannel,
  NpcActionRule,
  NpcState,
  SimulationSnapshot,
  WorldEvent
} from "../dialogue/types.js";

export interface AutonomyEvidence {
  eventId: string;
  channel: KnowledgeChannel;
  confidence: number;
}

export interface AutonomyNeedContribution {
  needId: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface AutonomyCapabilityEvidence {
  capabilityId: string;
  proficiency: number;
  required: number;
}

export interface AutonomyDecision {
  npcId: string;
  npcName: string;
  ruleId: string;
  kind: NpcActionRule["kind"];
  score: number;
  goalId?: string;
  goalText?: string;
  goalPriority?: number;
  evidence: AutonomyEvidence[];
  needContributions: AutonomyNeedContribution[];
  capabilities: AutonomyCapabilityEvidence[];
  reason: string;
}

export type AutonomyStepResult =
  | { ok: true; acted: false; state: SimulationSnapshot; decision: null; reason: "no_eligible_action" }
  | { ok: true; acted: true; state: SimulationSnapshot; decision: AutonomyDecision; event: WorldEvent }
  | { ok: false; acted: false; state: SimulationSnapshot; decision: AutonomyDecision; error: string };

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function validRule(rule: NpcActionRule): boolean {
  if (!rule.id.trim() || !isNormalized(rule.baseUtility)) return false;
  if (!Number.isInteger(rule.durationTicks) || rule.durationTicks < 1) return false;
  if (rule.cooldownTicks !== undefined &&
      (!Number.isInteger(rule.cooldownTicks) || rule.cooldownTicks < 0)) return false;
  if (!rule.result.eventType.trim() || !rule.result.summary.trim() ||
      rule.result.tags.length === 0 || !isNormalized(rule.result.severity)) return false;
  if (rule.kind === "self_resolve" && !rule.goalId) return false;
  if (rule.kind === "maintain_need" && (!rule.requiredNeeds || rule.requiredNeeds.length === 0)) return false;
  if (rule.goalPriorityWeight !== undefined && !isNormalized(rule.goalPriorityWeight)) return false;
  if (Object.values(rule.needWeights ?? {}).some((weight) => !isNormalized(weight))) return false;
  if (Object.values(rule.resourceCosts ?? {}).some((cost) => !Number.isFinite(cost) || cost < 0)) return false;
  return true;
}

function hasResourceRequirements(npc: NpcState, rule: NpcActionRule): boolean {
  for (const requirement of rule.requiredResources ?? []) {
    const value = npc.resources[requirement.resourceId] ?? 0;
    if (!Number.isFinite(value)) return false;
    if (requirement.min !== undefined && value < requirement.min) return false;
    if (requirement.max !== undefined && value > requirement.max) return false;
  }
  for (const [resourceId, cost] of Object.entries(rule.resourceCosts ?? {})) {
    if ((npc.resources[resourceId] ?? 0) < cost) return false;
  }
  return true;
}

function matchingEvidence(
  npc: NpcState,
  rule: NpcActionRule,
  state: SimulationSnapshot
): AutonomyEvidence[] | null {
  const requiredTags = rule.requiredKnowledgeTags ?? [];
  if (requiredTags.length === 0) return [];
  const minimumConfidence = rule.minimumKnowledgeConfidence ?? 0.35;
  if (!isNormalized(minimumConfidence)) return null;
  const knownEventIds = new Set(state.events.map((event) => event.id));
  const matched = npc.knowledge
    .filter((record) =>
      knownEventIds.has(record.eventId) &&
      record.belief !== "rejected" &&
      record.confidence >= minimumConfidence &&
      requiredTags.every((tag) => record.tags.includes(tag)) &&
      (!rule.requiredKnowledgeChannels?.length ||
        rule.requiredKnowledgeChannels.includes(record.channel))
    )
    .sort((a, b) =>
      b.confidence - a.confidence ||
      b.learnedAtTick - a.learnedAtTick ||
      a.eventId.localeCompare(b.eventId)
    );
  if (matched.length === 0) return null;
  return matched.map((record) => ({
    eventId: record.eventId,
    channel: record.channel,
    confidence: record.confidence
  }));
}

function evaluateRule(
  state: SimulationSnapshot,
  npc: NpcState,
  rule: NpcActionRule
): AutonomyDecision | null {
  if (!validRule(rule)) return null;

  let goal = undefined as NpcState["goals"][number] | undefined;
  if (rule.goalId) {
    goal = npc.goals.find((item) => item.id === rule.goalId);
    const requiredStatuses = rule.requiredGoalStatuses ??
      (rule.kind === "self_resolve" ? ["active", "delegated"] as const : []);
    if (!goal || !requiredStatuses.includes(goal.status)) return null;
  } else if (rule.requiredGoalStatuses?.length) {
    return null;
  }

  const evidence = matchingEvidence(npc, rule, state);
  if (evidence === null) return null;

  const needs = npc.needs ?? [];
  for (const requirement of rule.requiredNeeds ?? []) {
    const need = needs.find((item) => item.id === requirement.needId);
    if (!need || !isNormalized(need.value) ||
        (requirement.minValue !== undefined && need.value < requirement.minValue)) return null;
  }

  const capabilities: AutonomyCapabilityEvidence[] = [];
  for (const requirement of rule.requiredCapabilities ?? []) {
    const capability = npc.capabilities?.find((item) => item.id === requirement.capabilityId);
    const required = requirement.minProficiency ?? 0;
    if (!capability || !isNormalized(capability.proficiency) ||
        !isNormalized(required) || capability.proficiency < required) return null;
    capabilities.push({
      capabilityId: capability.id,
      proficiency: capability.proficiency,
      required
    });
  }

  if (!hasResourceRequirements(npc, rule)) return null;

  if (rule.cooldownTicks && state.events.some((event) =>
    event.actionRuleId === rule.id &&
    event.actorIds.includes(npc.id) &&
    state.tick - event.tick < rule.cooldownTicks!
  )) return null;

  const needContributions = Object.entries(rule.needWeights ?? {})
    .map(([needId, weight]) => {
      const need = needs.find((item) => item.id === needId);
      return need ? {
        needId,
        value: need.value,
        weight,
        contribution: need.value * weight
      } : null;
    })
    .filter((value): value is AutonomyNeedContribution => value !== null)
    .sort((a, b) => a.needId.localeCompare(b.needId));

  const goalContribution = goal
    ? goal.priority * (rule.goalPriorityWeight ?? 0)
    : 0;
  const needContribution = needContributions.reduce((sum, item) => sum + item.contribution, 0);
  const score = Math.round(clamp01(rule.baseUtility + goalContribution + needContribution) * 10000) / 10000;

  const reasonParts: string[] = [];
  if (goal) reasonParts.push(`goal:${goal.id} priority=${goal.priority.toFixed(2)}`);
  if (evidence.length) {
    reasonParts.push(`knowledge:${evidence.map((item) => `${item.channel}/${item.confidence.toFixed(2)}`).join(",")}`);
  }
  if (capabilities.length) {
    reasonParts.push(`capability:${capabilities.map((item) => `${item.capabilityId}/${item.proficiency.toFixed(2)}`).join(",")}`);
  }
  if (needContributions.length) {
    reasonParts.push(`need:${needContributions.map((item) => `${item.needId}/${item.value.toFixed(2)}`).join(",")}`);
  }

  return {
    npcId: npc.id,
    npcName: npc.name,
    ruleId: rule.id,
    kind: rule.kind,
    score,
    ...(goal ? { goalId: goal.id, goalText: goal.text, goalPriority: goal.priority } : {}),
    evidence,
    needContributions,
    capabilities,
    reason: reasonParts.join(" · ") || "authored action priority"
  };
}

/** Returns all eligible actions in stable utility order without mutating world state. */
export function evaluateNpcActions(state: SimulationSnapshot): AutonomyDecision[] {
  return state.npcs
    .flatMap((npc) => (npc.actionRules ?? [])
      .map((rule) => evaluateRule(state, npc, rule))
      .filter((decision): decision is AutonomyDecision => decision !== null))
    .sort((a, b) =>
      b.score - a.score ||
      a.npcId.localeCompare(b.npcId) ||
      a.ruleId.localeCompare(b.ruleId)
    );
}

export function selectNpcAction(state: SimulationSnapshot): AutonomyDecision | null {
  return evaluateNpcActions(state)[0] ?? null;
}

/**
 * Executes exactly one highest-utility autonomous action. It never mutates the
 * snapshot directly: all costs, need changes, goal transitions and knowledge
 * propagation go through commitWorldEvent's atomic validation path.
 */
export function runNpcAutonomyStep(state: SimulationSnapshot): AutonomyStepResult {
  const decision = selectNpcAction(state);
  if (!decision) {
    return { ok: true, acted: false, state, decision: null, reason: "no_eligible_action" };
  }

  const npc = state.npcs.find((item) => item.id === decision.npcId);
  const rule = npc?.actionRules?.find((item) => item.id === decision.ruleId);
  if (!npc || !rule) {
    return { ok: false, acted: false, state, decision, error: "Selected action rule disappeared before execution." };
  }

  const goal = rule.goalId ? npc.goals.find((item) => item.id === rule.goalId) : undefined;
  const tick = state.tick + rule.durationTicks;
  const goalDeltas: GoalDelta[] = [...(rule.result.additionalGoalDeltas ?? [])];
  if (goal && rule.result.goalStatus) {
    goalDeltas.push({ npcId: npc.id, goalId: goal.id, status: rule.result.goalStatus });
  }
  const resolvesEventIds = rule.result.resolvesGoalOriginEvents && goal
    ? [...new Set(goal.originEventIds ?? [])]
    : [];
  const paidResources = Object.entries(rule.resourceCosts ?? {})
    .filter(([, cost]) => cost !== 0)
    .map(([resourceId, cost]) => ({ npcId: npc.id, resourceId, delta: -cost }));

  const event: WorldEvent = {
    id: `event:autonomy:${npc.id}:${rule.id}:${tick}`,
    tick,
    type: rule.result.eventType,
    summary: rule.result.summary,
    tags: [...rule.result.tags],
    actorIds: [npc.id],
    affectedNpcIds: [...new Set([npc.id, ...(rule.result.affectedNpcIds ?? [])])],
    witnessNpcIds: [...new Set(rule.result.witnessNpcIds ?? [])],
    publicNoticeNpcIds: [...new Set(rule.result.publicNoticeNpcIds ?? [])],
    severity: rule.result.severity,
    outcome: rule.result.outcome,
    resourceDeltas: [...paidResources, ...(rule.result.resourceDeltas ?? [])],
    relationshipDeltas: [],
    goalDeltas,
    needDeltas: [...(rule.result.needDeltas ?? [])],
    actionRuleId: rule.id,
    ...(resolvesEventIds.length ? { resolvesEventIds } : {})
  };

  const committed = commitWorldEvent(state, event);
  if (!committed.ok) {
    return { ok: false, acted: false, state, decision, error: committed.error };
  }
  return { ok: true, acted: true, state: committed.state, decision, event };
}
