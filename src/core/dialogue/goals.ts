import type { KnowledgeRecord, NpcGoal, NpcState, WorldEvent } from "./types.js";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Instantiates or activates goals from an NPC's own authored rules, but only
 * after that NPC has acquired sufficiently credible personal knowledge.
 *
 * This function never reads another NPC's knowledge or the unrestricted world
 * state. It is deterministic and safe to call for direct experience,
 * observation, testimony, or rumor delivery.
 */
export function evaluateGoalRulesFromKnowledge(
  npc: NpcState,
  event: WorldEvent,
  knowledge: KnowledgeRecord
): NpcState {
  if (knowledge.eventId !== event.id || knowledge.belief === "rejected" || knowledge.confidence < 0.35) {
    return npc;
  }

  let goals = npc.goals;
  let changed = false;

  for (const rule of [...(npc.goalRules ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!rule.id.trim() || !rule.goalId.trim() || !rule.text.trim()) continue;
    if (!Number.isFinite(rule.priority) || rule.priority < 0 || rule.priority > 1) continue;
    if (!Number.isFinite(rule.minimumSeverity ?? 0) ||
        event.severity < (rule.minimumSeverity ?? 0)) continue;
    if (rule.triggerTags.length === 0 ||
        !rule.triggerTags.some((tag) => knowledge.tags.includes(tag))) continue;
    if (rule.eligibleKnowledgeChannels?.length &&
        !rule.eligibleKnowledgeChannels.includes(knowledge.channel)) continue;
    if (rule.goalTags.length === 0) continue;

    const existingIndex = goals.findIndex((goal) => goal.id === rule.goalId);
    if (existingIndex >= 0) {
      const existing = goals[existingIndex]!;
      if (existing.status === "unresolved") {
        if (goals === npc.goals) goals = [...goals];
        goals[existingIndex] = {
          ...existing,
          status: "active",
          originEventIds: [...new Set([...(existing.originEventIds ?? []), event.id])]
        };
        changed = true;
      } else if (existing.status === "active" || existing.status === "delegated") {
        if (!(existing.originEventIds ?? []).includes(event.id)) {
          if (goals === npc.goals) goals = [...goals];
          goals[existingIndex] = {
            ...existing,
            originEventIds: [...(existing.originEventIds ?? []), event.id]
          };
          changed = true;
        }
      }
      // Completed, failed, and abandoned goals are terminal and are not revived.
      continue;
    }

    const priority = Math.round(
      clamp01(rule.priority * (0.7 + event.severity * 0.3) * knowledge.confidence) * 100
    ) / 100;
    goals = [...goals, {
      id: rule.goalId,
      tags: [...rule.goalTags],
      priority,
      status: "active",
      text: rule.text,
      originEventIds: [event.id]
    } satisfies NpcGoal];
    changed = true;
  }

  return changed ? { ...npc, goals } : npc;
}
