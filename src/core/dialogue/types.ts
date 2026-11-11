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

export type GoalStatus =
  | "unresolved"
  | "active"
  | "delegated"
  | "completed"
  | "failed"
  | "abandoned";

export interface NpcGoal {
  id: string;
  tags: string[];
  priority: number;
  status: GoalStatus;
  text?: string;
  /** Event IDs that caused this personal goal to emerge or become relevant. */
  originEventIds?: string[];
}

export interface NpcGoalRule {
  id: string;
  goalId: string;
  triggerTags: string[];
  goalTags: string[];
  text: string;
  /** Authored base importance, normalized to 0..1. */
  priority: number;
  minimumSeverity?: number;
  eligibleKnowledgeChannels?: KnowledgeChannel[];
}

export interface GoalDelta {
  npcId: string;
  goalId: string;
  status: GoalStatus;
}

export interface GoalRequirement {
  goalId: string;
  statuses: GoalStatus[];
}

export interface NpcNeedState {
  id: string;
  /** Normalized urgency: 0 = satisfied, 1 = critically unmet. */
  value: number;
}

export interface NpcCapabilityState {
  id: string;
  /** Normalized proficiency from 0 to 1. */
  proficiency: number;
}

export interface NpcActionNeedRequirement {
  needId: string;
  minValue?: number;
}

export interface NpcActionCapabilityRequirement {
  capabilityId: string;
  minProficiency?: number;
}

export interface NpcActionResourceRequirement {
  resourceId: string;
  min?: number;
  max?: number;
}

export interface NpcActionResult {
  eventType: string;
  summary: string;
  tags: string[];
  severity: number;
  outcome: EventOutcome;
  /** Applies to the rule's goal. Terminal/progress states only. */
  goalStatus?: "delegated" | "completed" | "failed" | "abandoned";
  /** Resolves the goal's originating events when the action completes it. */
  resolvesGoalOriginEvents?: boolean;
  additionalGoalDeltas?: GoalDelta[];
  resourceDeltas?: ResourceDelta[];
  needDeltas?: NeedDelta[];
  affectedNpcIds?: string[];
  witnessNpcIds?: string[];
  publicNoticeNpcIds?: string[];
}

export interface NpcActionRule {
  id: string;
  kind: "self_resolve" | "maintain_need";
  goalId?: string;
  requiredGoalStatuses?: GoalStatus[];
  requiredKnowledgeTags?: string[];
  requiredKnowledgeChannels?: KnowledgeChannel[];
  minimumKnowledgeConfidence?: number;
  requiredNeeds?: NpcActionNeedRequirement[];
  requiredCapabilities?: NpcActionCapabilityRequirement[];
  requiredResources?: NpcActionResourceRequirement[];
  /** Positive quantities paid by the acting NPC before the outcome is committed. */
  resourceCosts?: Record<string, number>;
  baseUtility: number;
  goalPriorityWeight?: number;
  needWeights?: Record<string, number>;
  durationTicks: number;
  cooldownTicks?: number;
  result: NpcActionResult;
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
  goals: NpcGoal[];
  /** Optional authored rules; goals are instantiated only after personal knowledge arrives. */
  goalRules?: NpcGoalRule[];
  /** Dynamic needs and capabilities used by the deterministic utility planner. */
  needs?: NpcNeedState[];
  capabilities?: NpcCapabilityState[];
  /** Per-person authored action candidates; eligibility is evaluated against canonical state. */
  actionRules?: NpcActionRule[];
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

export interface NeedDelta {
  npcId: string;
  needId: string;
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
  goalDeltas?: GoalDelta[];
  needDeltas?: NeedDelta[];
  /** Authored action rule that initiated this event, when the event came from NPC agency. */
  actionRuleId?: string;
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
  requiredKnowledgeChannels?: KnowledgeChannel[];
  requiredEmotionLabels?: EmotionLabel[];
  requiredResources?: ResourceRequirement[];
  requiredRelationship?: RelationshipRequirement;
  requiredGoals?: GoalRequirement[];
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
