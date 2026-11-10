# Dialogue System Design — Ashford

> Parent authority: docs/ASHFORD_SSOT.md, especially Section 6  
> Status: Implementation design proposal; schema and scoring constants are not yet frozen  
> Runtime constraint: zero LLM calls, zero required network calls

## 1. Design target

The goal is not to fake an infinite language model. The goal is to make each resident feel like a particular person who knows particular things, wants particular things, remembers particular events, and expresses them in a recognizable voice.

Dialogue quality is produced by the combination of authored character content, world state, knowledge boundaries, social context, and deterministic selection. It must never be produced by allowing text to mutate the simulation.

## 2. Separate five kinds of data

1. **Character identity** — stable biography, values, temperament, occupation, social position.
2. **Voice profile** — vocabulary, syntax, rhythm, formality, verbal habits, conversational tactics.
3. **Knowledge state** — facts witnessed, information heard, beliefs, rumors, confidence, source and time acquired.
4. **Social/emotional state** — relationship to the listener, current mood, active needs, recent emotional events.
5. **Dialogue content** — authored lines, semantic intent, topic, conditions, slots and permitted variants.

Do not collapse these into a single personality score. A person can be blunt but kind, distrustful but polite, or frightened while trying to sound confident.

## 3. Content record model

A dialogue entry should carry meaning and constraints, not just a string.

Suggested conceptual fields:

- id: stable content identifier
- speakerId: optional character restriction
- intent: greeting, answer, ask, offer, refuse, bargain, warn, comfort, joke, evade, confess, farewell, etc.
- topics: semantic topic identifiers
- conditions: requirements over time, location, knowledge, relationship, mood, goals, events and quest state
- knowledgeRefs: facts or rumors the line relies on
- emotionalTone: compatible emotional states
- relationshipRange: compatible relationship contexts
- text: authored text or typed template
- slots: typed semantic values permitted in the template
- priority: narrative importance
- cooldownKey: repetition group
- fallbackClass: optional fallback category

A content validator must reject unknown topic IDs, missing required slots, impossible speaker restrictions, invalid knowledge references, and incompatible grammatical forms.

## 4. Candidate selection

For each conversation turn:

1. Build a compact dialogue context from the simulation state.
2. Determine the player's likely intent and topic using local rules.
3. Filter out entries whose hard conditions fail.
4. Filter out entries that rely on knowledge the speaker does not possess.
5. Score remaining entries by intent match, topic relevance, character specificity, relationship fit, emotional fit, current goal relevance, and narrative priority.
6. Apply repetition penalties to recently used lines and structural patterns.
7. Select deterministically using the world's seeded random stream to break near-equal ties.
8. Render typed slots and grammatical variants.
9. Return the line plus optional structured follow-up actions.
10. Route any chosen action through the simulation command validator.

The selector must not choose a line merely because it sounds good if its factual prerequisites are false.

## 5. Character voice is authored, not painted on

Each major NPC should have a voice sheet containing:

- vocabulary range and preferred expressions;
- sentence length and rhythm;
- directness and degree of politeness;
- humor, metaphor and rhetorical habits;
- emotional concealment or expressiveness;
- preferred forms of address;
- subjects they avoid;
- conversational tactics under stress;
- phrases they use rarely, with explicit cooldowns;
- examples of what they would and would not say.

Write important lines in the character's actual voice. Avoid taking one generic sentence and mechanically swapping a few synonyms for every resident. Voice rules should help select and compose content, not erase the author's work.

## 6. Typed composition, not arbitrary word replacement

Templates should use semantic slot types, for example:

- PersonName
- FamiliarName
- PlaceName
- ItemName
- CurrencyAmount
- TimeExpression
- KnownFact
- Rumor
- GoalDescription
- RelationshipAddress
- ProfessionTerm

A slot resolver must verify that the speaker can refer to the value, that the value exists, and that the grammatical form is valid. Korean requires special care for particles, honorifics, counters and speech levels. Prefer authored grammatical alternatives or a tested Korean morphology layer over naive string concatenation.

A template should have a coherent speech act and grammatical frame. Do not combine random fragments from unrelated sentences.

## 7. Knowledge and truth

Represent at least these distinctions:

- World fact: what is objectively true in the simulation.
- Observation: what this NPC personally perceived.
- Testimony: what another source told this NPC.
- Rumor: information with uncertain reliability and a traceable source chain.
- Belief: what the NPC currently thinks is true.
- Deception: a deliberate attempt to cause another person to believe something false.

Dialogue must query the NPC's knowledge, not the global world database, unless the NPC has a justified way to know. A wrong statement is allowed only when it is explainable by ignorance, mistaken inference, unreliable testimony, memory error, or intentional deception.

## 8. Memory and conversational continuity

Do not store every line forever. Store consequential interaction events:

- promise made or broken;
- gift, debt, trade or favor;
- insult, threat, betrayal or apology;
- important information learned;
- personal disclosure;
- witnessed help or harm;
- repeated pattern that changes trust or expectations.

A memory record should include the event, participants, time, emotional significance, confidence, source and whether it has been resolved. Later dialogue can refer to these memories when relevant.

Memory should influence behavior and relationships through explicit rules. A line such as "I remember what you did" is not sufficient by itself; the underlying event and its effects must exist.

## 9. Repetition and content scarcity

Track both exact line IDs and structural patterns. A character should not repeat the same greeting on every interaction simply because it is the highest-scoring candidate.

Use:
- per-character cooldowns;
- topic-specific recent history;
- opening/closing pattern penalties;
- context-sensitive alternatives;
- short neutral fallbacks;
- explicit intentional repetition for catchphrases or callbacks.

When no rich line is available, prefer a brief truthful response over a fabricated fact or an obviously random sentence.

## 10. Player freedom without an LLM

Support three input paths:

### A. Explicit dialogue actions
Ask, tell, offer, request, threaten, persuade, apologize, leave, and other supported speech acts. These are reliable and easy to test.

### B. Topic-driven questions
The player can ask about a person, place, event, item, rumor, job, relationship or goal. Topic and intent are resolved locally.

### C. Free-text interpretation
A local parser maps text to a structured intent:
- action / speech act;
- target;
- topic or entity;
- referenced item or amount;
- stance or tone;
- confidence and ambiguity.

Use dictionaries, aliases, context, grammar patterns, entity matching and optional local morphology. When the parser is uncertain, ask a clarification question rather than taking an irreversible action.

This will not understand every possible sentence. The supported vocabulary and patterns can expand over time, and the interface should always offer reliable explicit actions as a fallback.

## 11. Conversation response contract

A dialogue response should be data, not a side effect. Conceptually:

- renderedText
- speakerId
- selectedEntryId
- referencedKnowledgeIds
- emotionalTone
- availablePlayerReplies
- proposedActions
- memoryEventsToRecord

The simulation validates and commits any proposed action. A dialogue response alone cannot transfer money, items, ownership, quest state, reputation or location.

## 12. Test matrix

At minimum, test:

- The same question produces meaningfully different answers from distinct NPCs.
- One NPC changes their answer when relationship, mood, goal or recent events change.
- A character cannot disclose a fact they have not learned.
- Rumors preserve source and uncertainty.
- Important personal lines are selected only under their intended conditions.
- Recent lines and structural patterns are penalized.
- Every template resolves all required slots and Korean grammar variants.
- Ambiguous free text does not execute a costly or irreversible action.
- Dialogue does not mutate simulation state without a validated command.
- Identical state, content version and random seed produce the same selected response.

## 13. Production strategy

Prioritize authored content where it matters most:

1. Major NPCs: deep voice sheets, personal dialogue, secrets, relationships and story-specific lines.
2. Recurring secondary NPCs: distinct voice profiles and broad situation/topic coverage.
3. Background residents: concise identity, occupation-specific knowledge, a small but coherent set of reactions.
4. Generic service interactions: shared functional content with character-specific framing.

Do not attempt to write thousands of lines before the dialogue engine exists. First build the schema, validator, selector, renderer and test harness; then author content against real game contexts and measure repetition and coverage.


## 14. World-to-dialogue causality is mandatory

See docs/WORLD_DIALOGUE_CAUSALITY.md and SSOT §17. This section is normative for implementation.

A dialogue response must be causally grounded in the current world and in the speaker's personal access to it. The required chain is:

**World change → event → personal observation or information delivery → knowledge/belief → emotional appraisal → memory/goal/relationship consequences → dialogue context → authored utterance.**

The chain is not allowed to skip personal knowledge. A world fact existing in the simulation does not mean every NPC knows it. Every line that describes an event must be backed by the speaker's memory, knowledge record, testimony, rumor, or currently valid direct perception.

### 14.1 World changes must alter conversations

Dialogue selection must be able to respond to changes in:
- actual resources and ownership (an NPC cannot offer stock they no longer has);
- health, safety, household and livelihood status;
- current goals, urgency, obligations and unresolved problems;
- relationship changes and remembered interactions;
- recently learned events, evidence and corrections;
- emotional state with a traceable cause.

A resolved problem must remove or change obsolete requests. A worsening problem may make a previously casual request urgent. A repaired relationship may unlock different dialogue, but must not erase remembered harm.

### 14.2 Emotion must influence delivery without erasing voice

Stable personality and voice profile are kept separate from transient mood, event-linked emotion and immediate delivery. Candidate selection first validates meaning and knowledge, then chooses an authored delivery variant compatible with the character and current affect. Do not manufacture emotion by random punctuation or indiscriminate stuttering.

### 14.3 Required output trace

For debugging and validation, a response should be traceable to:
- selected dialogue entry and variant IDs;
- the NPC's knowledge/event IDs that justify its factual claims;
- the emotion causes that influenced delivery;
- the world-state predicates and personal resources that made the line eligible.

The trace is development metadata; the player need not see it.

### 14.4 Failure behavior

If no line is both factually valid and contextually appropriate, choose a truthful neutral fallback or ask for clarification. Do not choose a more dramatic line that violates knowledge, current resources, relationship, or world state.
