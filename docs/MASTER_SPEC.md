# ASHFORD: A LIVING WORLD — MASTER SPECIFICATION

**Status:** CONFIRMED BASELINE  
**Baseline date:** 2026-11-11  
**Scope:** Product, runtime, simulation, dialogue, content, persistence, and development authority.  
**Canonical repository:** diethoon/ashford-village-simulator

## 1. Product definition

Build a persistent, systemic, text-first sandbox RPG set in a living medieval-fantasy village. The player inhabits the world rather than selecting from a prewritten sequence of quests. NPCs have identities, households, needs, resources, relationships, knowledge, plans, memories, and schedules. The world produces situations; situations can become opportunities, conflicts, and quests when agents cannot resolve them alone.

The target experience combines:
- systemic environmental and object interaction freedom;
- authored, high-quality character and quest content;
- an autonomous population with meaningful daily lives;
- a coherent economy and social network;
- dialogue that expresses the actual, changing world through each character's own knowledge, emotions, history, and voice;
- consequences that persist and can be inspected or replayed.

This is not an LLM improv-chat game. It is a simulation-first sandbox with authored narrative content layered on top.

## 2. Non-negotiable design pillars

1. **World before quest list.** Quests emerge from causal world state and unmet goals.
2. **Entities must exist.** A traveler mentioned by dialogue or rumor must be a real NPC instance with identity, location, state, knowledge, and lifecycle.
3. **Contextual freedom.** Available actions derive from the selected actor, target, object properties, location, player capabilities, current conditions, and state. Do not repeat one generic action menu for every entity.
4. **Canonical simulation.** The engine is the sole authority for world state and state changes.
5. **LLM-free runtime.** No gameplay-time LLM/API calls. Authoring-time assistance is allowed.
6. **Consequences over cosmetic choices.** Actions cost time/resources and produce inspectable state changes/events.
7. **Persistence and pause.** Closing the game pauses simulation; reopening resumes saved state.
8. **Deterministic testability.** Seeded randomness, event logs, stable IDs, and reproducible test cases.
9. **Incremental proof.** Build complete vertical slices and verify them in the playable app before broad expansion.
10. **World-to-dialogue causality.** A character's words, knowledge, tone, emotions, conversational options, and requests must match their actual circumstances and what they personally know. World changes must affect dialogue through explicit causal steps, not cosmetic text changes.

## 3. Confirmed world frame

- Setting: fictional medieval-fantasy agricultural settlement, working name Ashford.
- Target baseline population: approximately 100 residents, 24–25 households.
- Simulation horizon: 365 days per year.
- Residents are individuals, not decorative labels. Household membership and shared consumption do not erase personal identity, property, money, or relationships.
- The inn is the first deep vertical slice. It is not the entire game and must be designed as a reusable pattern for other locations.
- Initial population/job counts and facilities are balancing assumptions, not immutable lore.

## 4. Runtime boundary

The runtime is deterministic application code. It may execute authored dialogue trees, data templates, rules, utility scoring, schedule logic, local parsers, and simulation events. It must not call an LLM to interpret an action, decide a character's thoughts, generate a quest, adjudicate outcomes, or write dialogue during play.

Natural-language input is not required to be fully understood. The primary interaction interface is a context-sensitive affordance/action system. A constrained local intent parser may be evaluated as an optional input aid, but it cannot be an authority and is not required for the current roadmap.

## 5. Canonical world model

The canonical state includes at minimum:
- world clock, calendar, deterministic random seed, and simulation version;
- locations, routes, buildings, fixtures, and interactable objects;
- NPC identities, attributes, needs, health, moods, occupations, schedules, homes, households, inventories, money, goals, memories, knowledge, beliefs/rumors, emotion causes, and relationships;
- household membership, shared resources, personal property, debts, and obligations;
- market inventories, production inputs/outputs, prices, currency flows, and storage;
- events, information channels, active situations, quests, objective states, and outcomes;
- player location, condition, inventory, money, reputation, and known information.

All persistent entities have stable IDs. Display names are not primary keys.

## 6. Simulation contract

- Use an event-driven scheduler with meaningful time slices (e.g. hourly or scheduled activity boundaries), not per-frame simulation.
- Player actions consume explicit time and possibly resources.
- NPC schedules, utility-driven decisions, household needs, market activity, and active situations update at appropriate simulation ticks.
- Daily settlement handles aggregate consumption, production, wages, debts, and population statistics; it must not replace all intra-day activity with one opaque daily update.
- Off-screen actors can progress only through modeled reachable actions, resources, information, and time.
- Simulation advancement is explicit and reproducible. No hidden real-time background clock.
- Canonical state changes are committed atomically before their resulting events are projected into NPC awareness and derived presentation.

## 7. Action lifecycle

Every state-changing action follows:

**DiscoverAffordances → Validate(actor,target,context) → Reserve/Charge(time,resources) → ApplyAtomicTransition → EmitWorldEvents → UpdateKnowledgeAndProjections**

UI may request an action but cannot directly change canonical state. Rejected actions do not apply partial effects. Actions must state their preconditions, costs, effects, and event outputs.

## 8. NPC agency

NPCs use a layered model:
- identity and relatively stable traits;
- dynamic needs and condition;
- goals and commitments;
- knowledge and memory with provenance;
- emotions and appraisals caused by events;
- candidate actions and utility scoring;
- schedule, capability, and resource constraints;
- relationships and social obligations;
- a stable personal voice whose delivery can respond to mood and emotion.

Utility AI is the initial decision mechanism. GOAP/behavior trees may be added where planning complexity requires them. Do not introduce all three frameworks everywhere without a demonstrated need.

NPCs act on what they know, can reach, can afford, and can plausibly do. They do not know all world state. A rumor or deduction must have an acquisition path. NPCs should often solve their own problems; player-facing requests arise only when delegation is plausible and the player is reachable/appropriate.

## 9. World events, knowledge, and dialogue

### 9.1 Causal pipeline

The required relationship is:

**Canonical World Change → World Event → NPC Perception / Information Delivery → Personal Knowledge and Belief → Emotional Appraisal → Memory / Goal / Relationship Consequences → Dialogue Context → Authored Utterance**

Player conversation can change the world only through a separate validated command path:

**Player Input → Intent / Action Proposal → Core Validation → Atomic State Change → New World Event**

Dialogue is not decorative flavor text. It is the character-specific expression of the current simulation state and personal experience.

### 9.2 Knowledge integrity

- Direct experience, direct observation, testimony, rumor, and public information are distinct acquisition channels.
- Every personal knowledge claim retains the event/fact reference, source, channel, acquisition time, confidence, and belief status.
- A world fact is not automatically known to every NPC.
- Testimony can only transfer information the source actually knows.
- Rumors preserve origin and carrier chains; confidence may decrease or become disputed as information spreads.
- A mistaken statement is permitted only when the NPC has a causal basis for the belief, such as poor evidence, unreliable testimony, mistaken inference, memory error, or deception.
- Dialogue cannot read the unrestricted world state as if it were the speaker's personal knowledge.

### 9.3 Personal emotional appraisal

The same event can produce different reactions based on each NPC's involvement, goals, needs, relationships, values, traits, perceived blame, severity, and control. A shopkeeper whose stock burns may fear for their livelihood; a witness may be curious about what happened; a rival may feel relief; a relative of an injured person may grieve.

Personality and voice identity are relatively stable. Mood and event-linked emotions are dynamic. Emotions must have causes, targets where relevant, intensity, start time, persistence/decay rules, and resolution conditions. Emotion changes behavior and delivery but must not replace the character's identity.

### 9.4 World state must alter conversational affordances

Changes in resources, ownership, health, safety, relationships, goals, obligations, evidence, and unresolved situations must affect what an NPC can truthfully say, offer, request, refuse, or discuss. A merchant cannot offer stock they no longer owns. A quest request must change or disappear when the underlying problem is resolved. A once-friendly NPC may become guarded after remembered betrayal.

### 9.5 Voice and authored expression

Major characters need personally authored lines and voice profiles. Reusable dialogue may use semantic templates, but only with typed slots and grammatical validation. Stable voice habits and transient emotional delivery are selected separately and combined coherently. Random punctuation, arbitrary synonym substitution, and generic dialogue with only names replaced do not count as character voice.

### 9.6 Factual validation and fallback

Before an utterance is displayed, validate speaker knowledge, source confidence, current world/resource predicates, relevant memory, relationship state, emotion cause, and time/place consistency. If no suitable line exists, use a truthful neutral response or ask for clarification. Never prefer dramatic but unsupported dialogue over a modest truthful line.

## 10. Rumor and social knowledge

Rumor is not omniscient exposition. Each rumor records its source entity/event, carrier, time, location, confidence, and audience/knowledge path. Dialogue may only use what that NPC knows or reasonably infers. If the referred entity has departed, dialogue must state a historically accurate version, not claim the person is currently present.

## 11. Quest emergence

A quest can be proposed only from a canonical event, an NPC's unmet goal, a social/economic situation, or an existing quest's consequences. An NPC should seek self-resolution first. A player-facing request is justified when the NPC lacks capability/resources, requires cooperation, or judges delegation worthwhile.

Every quest has an origin, issuer, goal, objective graph, preconditions, funding/reward source, deadline where relevant, completion/failure/cancellation criteria, discovery channel, knowledge conditions, and world consequences. Multiple resolution paths are preferred. Quest state advances through world events and actions, not UI labels.

## 12. Persistence

- Local browser persistence is acceptable for a single-device MVP.
- Target: versioned saves, migration, integrity validation, deterministic seed, canonical state, event history, NPC knowledge, emotion causes, dialogue history, and provenance.
- Save on meaningful transitions and explicit checkpoints; surface save failures.
- On game close, simulation pauses. On return, resume from last committed save; do not simulate elapsed wall-clock time.
- Save/load must preserve the causal continuity between events, what each NPC learned, what they remember, and how unresolved emotions/goals affect future dialogue.

## 13. Architecture direction

- UI: React + TypeScript responsive web/PWA target.
- Core: independently testable TypeScript simulation modules, separate from UI.
- Persistence: IndexedDB target; localStorage only as a small-prototype adapter.
- Delivery: GitHub as source of truth; separate Vercel project for web; Render/Cloudflare only when a concrete backend, storage, or networking need exists.
- Android: PWA first, then Capacitor packaging after mobile UX and persistence are stable.

A lightweight static web shell may be used for early vertical slices, but simulation rules must remain modular and portable. Do not mistake the temporary delivery shell for final architecture.

## 14. Quality definition

A feature is not complete merely because a button renders. It is complete when its behavior is valid in world context, state changes through the engine, consequences are observable, persistence works, and automated regression tests cover the relevant invariants.

Dialogue quality is not complete merely because an NPC has multiple strings. It requires:
- different NPCs to react to the same event according to different lived circumstances;
- each speaker to know only information they have acquired;
- world changes to alter relevant topics, offers, requests, and truthful claims;
- transient emotions to shape delivery without erasing stable character voice;
- memories and relationship changes to persist and affect later interactions.

## 15. Out of scope until explicitly approved

- Runtime LLM generation or LLM-based NPC brains.
- A claim of perfect human-level society simulation.
- Multiplayer, shared online world, or cloud synchronization.
- Unbounded procedural narrative with no authored quality controls.
- Fixed quest spawn schedules presented as emergent quests.
- Universal omniscient dialogue that exposes world-state facts to every NPC.

## 16. Subordinate specifications

- docs/DIALOGUE_SYSTEM.md
- docs/WORLD_DIALOGUE_CAUSALITY.md
- docs/IMPLEMENTATION_STATUS.md
- docs/DECISION_LOG.md
- docs/legacy/LEGACY_REGISTER.md

Additional subsystem documents may be added when their contents and implementation scope are ready. They remain subordinate to this master specification.

## 17. Change history

| Version | Date | Change | Status |
|---|---|---|---|
| 1.0 | 2026-11-11 | Establish canonical Ashford master specification and incorporate user-confirmed world-to-dialogue causality | CONFIRMED BASELINE |
