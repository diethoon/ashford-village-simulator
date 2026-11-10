import type {
  EmotionLabel,
  EmotionState,
  KnowledgeRecord,
  NpcState,
  WorldEvent
} from "./types.js";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function intersects(left: string[], right: string[]): boolean {
  return left.some((item) => right.includes(item));
}

function emotionFor(
  npc: NpcState,
  event: WorldEvent,
  knowledge: KnowledgeRecord
): EmotionLabel {
  const tags = event.tags;
  const directlyAffected = event.affectedNpcIds.includes(npc.id);

  if (event.outcome === "beneficial") {
    return directlyAffected ? "joy" : "relief";
  }

  if (tags.includes("death") || tags.includes("bereavement")) {
    return "grief";
  }

  if (tags.includes("betrayal") || tags.includes("theft")) {
    return directlyAffected ? "anger" : "suspicion";
  }

  if (event.outcome === "harmful" && (tags.includes("danger") || tags.includes("fire"))) {
    const goalTags = npc.goals
      .filter((goal) => goal.priority > 0)
      .flatMap((goal) => goal.tags);
    const personallyRelevant = intersects(tags, [...npc.concerns, ...goalTags]);

    if (directlyAffected) return "fear";
    if (knowledge.channel === "direct_observation" && !personallyRelevant) {
      return "curiosity";
    }
    if (npc.traits.compassion >= 0.8 && tags.includes("injury")) return "grief";
    return "fear";
  }

  if (knowledge.channel === "rumor" || knowledge.channel === "testimony") {
    return "curiosity";
  }

  if (event.outcome === "mixed") return "hope";
  return "curiosity";
}

function deliveryFor(label: EmotionLabel): string[] {
  switch (label) {
    case "fear":
      return ["guarded", "hesitant", "urgent"];
    case "anger":
      return ["blunt", "forceful", "tense"];
    case "grief":
      return ["subdued", "hesitant", "quiet"];
    case "relief":
      return ["relaxed", "warm"];
    case "joy":
      return ["warm", "animated"];
    case "guilt":
      return ["hesitant", "apologetic"];
    case "curiosity":
      return ["questioning", "alert"];
    case "suspicion":
      return ["guarded", "measured"];
    case "hope":
      return ["optimistic", "warm"];
    case "resentment":
      return ["cold", "guarded"];
  }
}

function calculateIntensity(
  npc: NpcState,
  event: WorldEvent,
  knowledge: KnowledgeRecord
): number {
  const directlyAffected = event.affectedNpcIds.includes(npc.id);
  const witnessed = event.witnessNpcIds.includes(npc.id);
  const impact = directlyAffected ? 1 : witnessed ? 0.6 : 0.3;
  const goalTags = npc.goals
    .filter((goal) => goal.priority > 0)
    .flatMap((goal) => goal.tags);
  const relevant = intersects(event.tags, [...npc.concerns, ...goalTags]) ? 1 : 0.25;
  const informationFactor = knowledge.confidence;
  const base = event.severity * (
    0.18 +
    impact * 0.36 +
    relevant * 0.24 +
    npc.traits.threatSensitivity * 0.12 +
    npc.traits.compassion * (directlyAffected ? 0.04 : 0.1)
  );

  return clamp01(base * npc.traits.emotionalReactivity * informationFactor);
}

export function applyKnownEventResponse(
  npc: NpcState,
  event: WorldEvent,
  knowledge: KnowledgeRecord
): NpcState {
  const label = emotionFor(npc, event, knowledge);
  const intensity = calculateIntensity(npc, event, knowledge);
  const existingIndex = npc.emotions.findIndex(
    (emotion) => emotion.label === label && emotion.causeEventId === event.id
  );

  const nextEmotion: EmotionState = {
    label,
    intensity,
    causeEventId: event.id,
    startedAtTick: knowledge.learnedAtTick,
    lastUpdatedTick: knowledge.learnedAtTick,
    decayPerTick: 0.015,
    deliveryTags: deliveryFor(label)
  };

  const emotions = [...npc.emotions];
  if (existingIndex >= 0) {
    emotions[existingIndex] = {
      ...emotions[existingIndex]!,
      intensity: Math.max(emotions[existingIndex]!.intensity, intensity),
      lastUpdatedTick: knowledge.learnedAtTick
    };
  } else if (intensity >= 0.05) {
    emotions.push(nextEmotion);
  }

  const memoryImportance = clamp01(event.severity * (
    event.affectedNpcIds.includes(npc.id) ? 1 : 0.65
  ));
  const memories = npc.memories.some((memory) => memory.eventId === event.id)
    ? npc.memories
    : memoryImportance >= 0.2
      ? [...npc.memories, {
          id: `memory:${npc.id}:${event.id}`,
          eventId: event.id,
          summary: knowledge.summary,
          learnedAtTick: knowledge.learnedAtTick,
          importance: memoryImportance,
          sourceChannel: knowledge.channel
        }]
      : npc.memories;

  return { ...npc, emotions, memories };
}

/**
 * Emotion fades gradually. The causal memory remains after the acute
 * emotional response fades, so forgetting a feeling does not erase history.
 */
export function decayEmotions(npc: NpcState, currentTick: number): NpcState {
  const emotions = npc.emotions
    .map((emotion) => {
      const elapsed = Math.max(0, currentTick - emotion.lastUpdatedTick);
      const remaining = emotion.intensity * Math.pow(1 - emotion.decayPerTick, elapsed);
      return { ...emotion, intensity: remaining, lastUpdatedTick: currentTick };
    })
    .filter((emotion) => emotion.intensity >= 0.05);

  return { ...npc, emotions };
}
