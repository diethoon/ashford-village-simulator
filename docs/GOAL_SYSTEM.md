# NPC Goal Emergence and Evaluation

**Parent authority:** `docs/MASTER_SPEC.md` §§8–11  
**Related contracts:** `docs/WORLD_DIALOGUE_CAUSALITY.md`, `docs/DIALOGUE_SYSTEM.md`  
**Status:** Incremental implementation contract; full utility planning is deferred  
**Runtime:** deterministic TypeScript; no LLM or required network calls

## 1. Purpose

An NPC goal is a personal commitment derived from what that NPC needs, values, knows, can do, and is currently experiencing. A global event is not automatically a quest and is not automatically known to every person.

The required direction is:

`World Event → Personal Knowledge → Personal Goal Rule → Goal State → Action/Dialogue Eligibility`

Goal generation must be repeatable from the same state, event, and personal knowledge.

## 2. Authored goal rules

Each NPC may define zero or more `NpcGoalRule` records:
- `id`: stable rule ID;
- `goalId`: stable personal goal ID to instantiate or activate;
- `triggerTags`: one or more semantic tags required on the NPC's personal knowledge record;
- `goalTags`: semantic tags carried by the resulting goal;
- `text`: authored player-facing summary of the personal objective;
- `priority`: authored base importance normalized to 0..1;
- `minimumSeverity`: optional minimum event severity;
- `eligibleKnowledgeChannels`: optional allowed personal acquisition channels.

Rules are per NPC, not global NPC templates. Two people may have different rules for the same event. A rule may respond to direct experience while another responds to direct observation or testimony.

## 3. Activation guardrails

A rule may run only when all of the following hold:
1. The NPC has a personal knowledge record for the exact event.
2. The knowledge record is not rejected and has confidence of at least 0.35.
3. The event meets the rule's minimum severity.
4. At least one trigger tag appears in the personal knowledge record.
5. The acquisition channel is permitted by the rule, when a channel list is specified.
6. The rule has valid IDs, non-empty trigger/goal tags and text, and a normalized priority.

The rule engine does not inspect another NPC's knowledge, and it does not treat event existence as universal knowledge.

## 4. Goal state transitions

- An absent goal is instantiated as `active` when a rule matches.
- An existing `unresolved` goal becomes `active` when a rule matches.
- An `active` or `delegated` goal may record additional originating event IDs without duplicating the goal.
- `completed`, `failed`, and `abandoned` goals are terminal and are never revived by a later matching event.
- Explicit event `goalDeltas` remain available for validated progression and resolution. They are not required for initial emergence.

Newly instantiated priority is deterministic and incorporates the event severity and knowledge confidence:

`effectivePriority = clamp01(basePriority × (0.7 + 0.3 × eventSeverity) × knowledgeConfidence)`

The goal records the originating event IDs so UI and dialogue can show the actual cause.

## 5. Player-facing requests

A player-facing affordance is not created just because a goal exists. It requires:
- active or delegated goal status;
- a personal knowledge record whose tags intersect the goal's tags;
- a valid authored dialogue entry with matching knowledge, emotion, resource, relationship, and goal conditions.

The UI must call the same eligibility helper used by the dialogue system. A completed, failed, or abandoned goal cannot continue to show its old help request.

## 6. Current implementation boundary

Implemented:
- deterministic rule evaluation after direct experience, direct observation, public information, testimony, or rumor delivery;
- personal knowledge confidence and channel restrictions;
- per-NPC goal instantiation/activation;
- origin event tracking and severity/confidence-weighted priority;
- terminal-state protection;
- goal board and world-pulse UI projections with evidence channel and confidence;
- tests proving that informed NPCs can create different goals while uninformed NPCs do not.

Implemented in the first deterministic agency slice:
- per-NPC authored action rules with personal goal, knowledge-channel, need, capability, resource, and cooldown prerequisites;
- stable candidate evaluation and utility ordering with inspectable decision evidence;
- one-action simulation steps that convert the selected NPC action into a canonical world event;
- atomic resource/need/goal consequences through the world-event commit pipeline;
- self-resolution of Mira's satchel goal without player intervention, including the linked innkeeper goal and the originating event.

Not yet implemented:
- continuous need decay and utility scoring over all candidate goals;
- full schedule, geographic reachability, and multi-agent resource allocation for autonomous action;
- broad NPC self-resolution across the village's full object, inventory, and location systems;
- delegation thresholds and agent-to-agent task negotiation;
- competition among multiple NPCs over the same objective;
- objective graphs and full emergent quest instances.

Do not describe the current rule evaluator as a complete autonomous planner or as proof of full quest emergence. Those require the missing needs, capabilities, action lifecycle, and objective models above.
