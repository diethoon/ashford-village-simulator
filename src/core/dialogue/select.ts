import { knownTags } from "./awareness.js";
import type {
  DialogueEntry,
  DialogueRequest,
  DialogueSelection,
  DialogueVariant,
  EmotionLabel,
  NpcState
} from "./types.js";

function activeEmotions(npc: NpcState): Set<EmotionLabel> {
  return new Set(
    npc.emotions.filter((emotion) => emotion.intensity >= 0.1).map((emotion) => emotion.label)
  );
}

function matchesResources(
  npc: NpcState,
  requirements: NonNullable<DialogueEntry["requiredResources"]>
): boolean {
  return requirements.every((requirement) => {
    const value = npc.resources[requirement.resourceId] ?? 0;
    if (requirement.min !== undefined && value < requirement.min) return false;
    if (requirement.max !== undefined && value > requirement.max) return false;
    return true;
  });
}

function validVariant(
  variant: DialogueVariant,
  styleTags: Set<string>,
  emotions: Set<EmotionLabel>
): boolean {
  if (variant.requiredEmotionLabels?.some((label) => !emotions.has(label))) return false;
  if (variant.forbiddenEmotionLabels?.some((label) => emotions.has(label))) return false;
  if (variant.requiredStyleTags?.some((tag) => !styleTags.has(tag))) return false;
  return true;
}

function variantScore(variant: DialogueVariant, styleTags: Set<string>): number {
  const styleScore = (variant.preferredStyleTags ?? [])
    .filter((tag) => styleTags.has(tag)).length;
  return styleScore + (variant.default ? 0.1 : 0);
}

export function selectDialogue(
  npc: NpcState,
  entries: DialogueEntry[],
  request: DialogueRequest
): DialogueSelection | null {
  const tags = knownTags(npc);
  const emotions = activeEmotions(npc);
  const styleTags = new Set([
    ...npc.voice.styleTags,
    ...npc.emotions
      .filter((emotion) => emotion.intensity >= 0.1)
      .flatMap((emotion) => emotion.deliveryTags)
  ]);
  const requestedTopics = new Set(request.topicTags ?? []);

  const candidates = entries
    .filter((entry) => !entry.speakerId || entry.speakerId === npc.id)
    .filter((entry) => entry.intent === request.intent)
    .filter((entry) => entry.topicTags.length === 0 ||
      entry.topicTags.some((topic) => requestedTopics.has(topic)))
    .filter((entry) => (entry.requiredKnowledgeTags ?? []).every((tag) => tags.has(tag)))
    .filter((entry) => (entry.requiredKnowledgeEventIds ?? []).every((id) =>
      npc.knowledge.some((record) => record.eventId === id)
    ))
    .filter((entry) => (entry.requiredEmotionLabels ?? []).every((label) => emotions.has(label)))
    .filter((entry) => matchesResources(npc, entry.requiredResources ?? []))
    .map((entry) => {
      const validVariants = entry.variants
        .filter((variant) => validVariant(variant, styleTags, emotions))
        .sort((a, b) =>
          variantScore(b, styleTags) - variantScore(a, styleTags) ||
          a.id.localeCompare(b.id)
        );
      const variant = validVariants[0];
      if (!variant) return null;

      const topicScore = entry.topicTags.filter((tag) => requestedTopics.has(tag)).length;
      const speakerScore = entry.speakerId === npc.id ? 3 : 0;
      const knowledgeScore = (entry.requiredKnowledgeTags ?? []).length;
      const emotionScore = (entry.requiredEmotionLabels ?? []).length;
      return {
        entry,
        variant,
        score: topicScore + speakerScore + knowledgeScore + emotionScore +
          variantScore(variant, styleTags)
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));

  const selected = candidates[0];
  if (!selected) return null;

  const referencedKnowledge = npc.knowledge.filter((record) =>
    (selected.entry.requiredKnowledgeEventIds ?? []).includes(record.eventId) ||
    (selected.entry.requiredKnowledgeTags ?? []).some((tag) => record.tags.includes(tag))
  );
  const emotionCauseEventIds = npc.emotions
    .filter((emotion) => emotions.has(emotion.label))
    .map((emotion) => emotion.causeEventId);

  const text = selected.variant.text
    .replaceAll("{speaker}", npc.name)
    .replaceAll("{listener}", request.listenerName ?? "당신");

  return {
    entryId: selected.entry.id,
    variantId: selected.variant.id,
    speakerId: npc.id,
    text,
    justifiedByEventIds: [...new Set(referencedKnowledge.map((record) => record.eventId))].sort(),
    emotionCauseEventIds: [...new Set(emotionCauseEventIds)].sort()
  };
}
