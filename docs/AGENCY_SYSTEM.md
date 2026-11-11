# NPC Agency and Utility Action System

**Parent authority:** `docs/MASTER_SPEC.md` §§6–8, 11, 14  
**Related contracts:** `docs/GOAL_SYSTEM.md`, `docs/WORLD_DIALOGUE_CAUSALITY.md`  
**Runtime:** deterministic TypeScript; no network or LLM calls

## 1. Purpose

NPC autonomy must be observable world behavior, not flavor text. The engine evaluates actions from each resident's personal state, then commits one selected action through the canonical world-event pipeline.

The first slice deliberately implements a small, testable utility planner rather than a general-purpose planning framework.

## 2. Per-resident action rules

Each NPC may own authored `actionRules`. A rule can require:
- a personal goal and allowed goal statuses;
- personal knowledge tags, acquisition channels, and minimum confidence;
- need urgency thresholds;
- capability proficiency;
- current resources and resource costs;
- a cooldown since the same rule last produced an event.

Supported action kinds:
- `self_resolve`: an NPC attempts to complete one of their own active/delegated goals;
- `maintain_need`: an NPC takes a routine action to reduce an unmet need, without requiring a quest.

Rules are per-resident data. They do not grant omniscient access to world events.

## 3. Knowledge and evidence guards

A rule with `requiredKnowledgeTags` must find at least one personal knowledge record that:
1. references an event in the current canonical event history;
2. contains every required tag;
3. is not rejected;
4. meets the minimum confidence;
5. uses an allowed knowledge channel, if configured.

The planner exposes the event ID, channel, and confidence as decision evidence. It never reads another NPC's knowledge to authorize the actor.

## 4. Utility calculation

For each eligible NPC/rule pair:

`score = clamp01(baseUtility + goalPriority × goalPriorityWeight + Σ(needValue × needWeight))`

Missing or ineligible prerequisites remove the candidate; they do not merely lower its score. Candidate order is deterministic: descending score, then stable NPC ID, then stable rule ID.

The score ranks currently eligible actions. It is not a success probability and does not imply that an action will always succeed in future, richer simulations.

## 5. Action commit contract

One autonomy step executes exactly one best candidate:
1. Re-read the actor and authored rule from the supplied snapshot.
2. Compute the action tick from its duration.
3. Construct a stable action event ID and record the rule ID.
4. Translate resource costs, need deltas, and goal transitions into event deltas.
5. Include the originating event IDs when the action resolves its goal's cause.
6. Pass the event to `commitWorldEvent`.

The pipeline validates all references and ranges before committing any change. Invalid outcomes leave the original snapshot untouched. Only after the commit do affected/witness NPCs receive personal knowledge of the new event.

## 6. Current vertical slice

- Mira may find her missing satchel by searching the inn, but only after she personally experienced the loss, has an active `recover_satchel` goal, meets the security-need threshold, and possesses sufficient search proficiency.
- Her action completes her own goal and Ellen's linked `help_guest` goal because Ellen witnesses the recovery.
- The original loss event is marked as resolved, relevant worry is cleared by the existing causal emotion resolver, and both NPCs gain knowledge through their own experience/observation.
- Bram can independently take a short rest when his fatigue need crosses its threshold.

The demo's autonomy control advances one committed action at a time. It is a prototype affordance for explicit time advancement, not a real-time background loop.

## 7. Explicit limits

Not yet implemented:
- continuous need decay and daily need generation;
- time-of-day schedules and work-hour constraints;
- location graph reachability and travel;
- NPC-to-NPC negotiation, delegation, and task assignment;
- contested resources and action reservation;
- multi-step plans, retries, stochastic outcomes, and failure recovery;
- a full action catalog for the approximately 100-resident village.

Do not call this a complete autonomous society. It is the first verified utility-action loop.
