export type KnowledgeChannel =
  | "direct_experience"
  | "direct_observation"
  | "testimony"
  | "rumor"
  | "public_information";

export type BeliefStatus = "accepted" | "uncertain" | "disputed" | "rejected";

export type EmotionLabel =
  | "fear"
  | "worry"
  | "anger"
  | "grief"
  | "relief"
  | "joy"
  | "guilt"
  | "curiosity"
  | "suspicion"
  | "hope"
  | "resentment";

export type EventOutcome = "beneficial" | "harmful" | "mixed" | "neutral";

export interface KnowledgeRecord {
  eventId: string;
  summary: string;
  tags: string[];
  channel: KnowledgeChannel;
  sourceNpcId?: string;
  originNpcIds: string[];
  learnedAtTick: number;
  confidence: number;
  belief: BeliefStatus;
}

export interface EmotionState {
  label: EmotionLabel;
  intensity: number;
  causeEventId: string;
  startedAtTick: number;
  lastUpdatedTick: number;
  decayPerTick: number;
  targetNpcId?: string;
  deliveryTags: string[];
}

export interface MemoryRecord {
  id: string;
  eventId: string;
  summary: string;
  learnedAtTick: number;
  importance: number;
  sourceChannel: KnowledgeChannel;
}

export interface RelationshipState {
  trust: number;
  affinity: number;
  respect: number;
  fear: number;
}

export interface RelationshipDelta {
  npcId: string;
  targetNpcId: string;
  trust?: number;
  affinity?: number;
  respect?: number;
  fear?: number;
}

export interface RelationshipRequirement {
  target: "listener";
  trust?: { min?: number; max?: number };
  affinity?: { min?: number; max?: number };
  respect?: { min?: number; max?: number };
  fear?: { min?: number; max?: number };
}

export interface NpcState {
  id: string;
  name: string;
  occupation: string;
  traits: {
    emotionalReactivity: number;
    threatSensitivity: number;
    compassion: number;
    pragmatism: number;
  };
  voice: {
    styleTags: string[];
    formality: number;
    bluntness: number;
    warmth: number;
  };
  concerns: string[];
  goals: Array<{ id: string; tags: string[]; priority: number }>;
  resources: Record<string, number>;
  knowledge: KnowledgeRecord[];
  emotions: EmotionState[];
  memories: MemoryRecord[];
  relationships: Record<string, RelationshipState>;
}

export interface ResourceDelta {
  npcId: string;
  resourceId: string;
  delta: number;
}

export interface WorldEvent {
  id: string;
  tick: number;
  type: string;
  summary: string;
  tags: string[];
  locationId?: string;
  actorIds: string[];
  affectedNpcIds: string[];
  witnessNpcIds: string[];
  publicNoticeNpcIds: string[];
  severity: number;
  outcome: EventOutcome;
  resourceDeltas?: ResourceDelta[];
  relationshipDeltas?: RelationshipDelta[];
  resolvesEventIds?: string[];
}

export interface SimulationSnapshot {
  tick: number;
  npcs: NpcState[];
  events: WorldEvent[];
}

export type EventCommitResult =
  | { ok: true; state: SimulationSnapshot }
  | { ok: false; state: SimulationSnapshot; error: string };

export type DialogueIntent =
  | "greeting"
  | "comment"
  | "answer"
  | "request"
  | "offer"
  | "refuse"
  | "warn"
  | "comfort"
  | "bargain"
  | "farewell";

export interface ResourceRequirement {
  resourceId: string;
  min?: number;
  max?: number;
}

export interface DialogueVariant {
  id: string;
  requiredEmotionLabels?: EmotionLabel[];
  forbiddenEmotionLabels?: EmotionLabel[];
  requiredStyleTags?: string[];
  preferredStyleTags?: string[];
  text: string;
  default?: boolean;
}

export interface DialogueEntry {
  id: string;
  speakerId?: string;
  intent: DialogueIntent;
  topicTags: string[];
  requiredKnowledgeTags?: string[];
  requiredKnowledgeEventIds?: string[];
  requiredEmotionLabels?: EmotionLabel[];
  requiredResources?: ResourceRequirement[];
  requiredRelationship?: RelationshipRequirement;
  variants: DialogueVariant[];
}

export interface DialogueRequest {
  intent: DialogueIntent;
  topicTags?: string[];
  listenerId?: string;
  listenerName?: string;
  tick: number;
}

export interface DialogueSelection {
  entryId: string;
  variantId: string;
  speakerId: string;
  text: string;
  justifiedByEventIds: string[];
  emotionCauseEventIds: string[];
}
