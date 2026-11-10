import type {
  BeliefStatus,
  KnowledgeChannel,
  KnowledgeRecord,
  NpcState,
  WorldEvent
} from "./types.js";
import { applyKnownEventResponse } from "./emotion.js";
import { evaluateGoalRulesFromKnowledge } from "./goals.js";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function beliefFromConfidence(confidence: number): BeliefStatus {
  if (confidence >= 0.85) return "accepted";
  if (confidence >= 0.45) return "uncertain";
  return "disputed";
}

function upsertKnowledge(
  npc: NpcState,
  record: KnowledgeRecord
): NpcState {
  const existingIndex = npc.knowledge.findIndex((item) => item.eventId === record.eventId);

  if (existingIndex < 0) {
    return { ...npc, knowledge: [...npc.knowledge, record] };
  }

  const existing = npc.knowledge[existingIndex]!;
  if (existing.confidence >= record.confidence) return npc;

  const knowledge = [...npc.knowledge];
  knowledge[existingIndex] = record;
  return { ...npc, knowledge };
}

function addKnowledgeAndReact(
  npc: NpcState,
  event: WorldEvent,
  record: KnowledgeRecord
): NpcState {
  const updated = upsertKnowledge(npc, record);
  if (updated === npc) return npc;
  const emotionallyUpdated = applyKnownEventResponse(updated, event, record);
  return evaluateGoalRulesFromKnowledge(emotionallyUpdated, event, record);
}

/**
 * Gives an NPC firsthand knowledge only when the event says they were
 * directly affected, witnessed it, or explicitly received a public notice.
 * Being alive in the same world is not a knowledge channel.
 */
export function observeWorldEvent(npc: NpcState, event: WorldEvent): NpcState {
  let channel: KnowledgeChannel | undefined;

  if (event.affectedNpcIds.includes(npc.id)) {
    channel = "direct_experience";
  } else if (event.witnessNpcIds.includes(npc.id)) {
    channel = "direct_observation";
  } else if (event.publicNoticeNpcIds.includes(npc.id)) {
    channel = "public_information";
  }

  if (!channel) return npc;

  const record: KnowledgeRecord = {
    eventId: event.id,
    summary: event.summary,
    tags: [...event.tags],
    channel,
    originNpcIds: [],
    learnedAtTick: event.tick,
    confidence: channel === "public_information" ? 0.95 : 1,
    belief: channel === "public_information" ? "accepted" : "accepted"
  };

  return addKnowledgeAndReact(npc, event, record);
}

/**
 * Transfers only information the speaker actually knows. Rumors lose
 * confidence and preserve the original source chain.
 */
export function transmitEventKnowledge(
  source: NpcState,
  recipient: NpcState,
  event: WorldEvent,
  channel: "testimony" | "rumor",
  learnedAtTick: number,
  transmissionReliability: number
): NpcState {
  const sourceRecord = source.knowledge.find((item) => item.eventId === event.id);
  if (!sourceRecord) return recipient;

  const reliability = clamp01(transmissionReliability);
  const confidence = clamp01(sourceRecord.confidence * reliability);
  const record: KnowledgeRecord = {
    eventId: event.id,
    summary: sourceRecord.summary,
    tags: [...sourceRecord.tags],
    channel,
    sourceNpcId: source.id,
    originNpcIds: [...sourceRecord.originNpcIds, source.id],
    learnedAtTick,
    confidence,
    belief: beliefFromConfidence(confidence)
  };

  return addKnowledgeAndReact(recipient, event, record);
}

export function knowsEvent(npc: NpcState, eventId: string): boolean {
  return npc.knowledge.some((record) => record.eventId === eventId);
}

export function knownTags(npc: NpcState): Set<string> {
  return new Set(npc.knowledge.flatMap((record) => record.tags));
}
