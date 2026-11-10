# World ↔ Dialogue Causality Contract

> Parent authority: docs/ASHFORD_SSOT.md §17  
> Related design: docs/DIALOGUE_SYSTEM.md  
> Status: Required architecture contract; detailed tuning values remain provisional  
> Runtime constraint: zero LLM calls and zero required network calls

## 1. The central rule

Dialogue is not a decorative layer placed on top of the simulation. It is the audible and visible expression of what a particular person has experienced, learned, believes, feels, wants, fears, and remembers in the current world.

A world change must be capable of changing conversation. A conversation must never claim that a change happened unless the simulation confirms it.

The same event must not produce one universal village-wide reaction. The event is objective; each NPC's access to it and interpretation of it are personal.

## 2. Causal pipeline

The required logical pipeline is:

**WorldState → WorldEvent → Perception / Delivery → PersonalKnowledge → Appraisal → Emotion / Memory / Goal / Relationship → DialogueContext → DialogueSelection → Utterance**

Player interaction can feed back into the world only through:

**PlayerInput → Intent → ProposedCommand → CoreValidation → StateMutation → NewWorldEvent**

Each stage has a distinct responsibility:

| Stage | Owns | Must not do |
|---|---|---|
| World state | Objective present facts and resources | Assume every NPC knows every fact |
| World event | What changed, when, why, and who was involved | Mutate dialogue text |
| Perception/delivery | Which NPC learned what, by which channel | Teleport knowledge to all residents |
| Personal knowledge | Facts, testimony, rumors, beliefs, confidence and sources | Rewrite objective truth |
| Appraisal | How an NPC evaluates an event against their own life | Apply the same emotion to everyone |
| Emotion/memory/goals | Personal consequences over time | Replace stable personality or erase history |
| Dialogue context | The speaker's current known and felt situation | Read hidden world facts as personal knowledge |
| Dialogue selection | Which authored line or template is valid and fitting | Invent unsupported claims or change world state |
| Core command validation | Whether an action can actually happen | Trust a dialogue string as proof |

## 3. Event contract

A meaningful event must carry enough structure for downstream systems to reason about it.

Conceptual fields:
- **id:** stable unique event ID
- **tick:** exact world tick
- **type:** typed event category
- **actorIds:** agents responsible for the event
- **subjectIds:** people, places, groups or objects the event concerns
- **locationId:** where it occurred, when applicable
- **tags:** semantic tags such as food, market, family, danger, debt
- **severity:** normalized impact magnitude, with a documented range
- **outcome:** beneficial, harmful, mixed or neutral from the event's objective perspective
- **causeEventIds:** causal predecessors
- **evidence:** facts actually established by the simulation
- **visibility:** private, witnessed, local-public or village-public
- **requiredObservation:** what a witness had to be able to see/hear/experience

Events record what happened. They do not decide how every NPC feels about it.

## 4. Information acquisition contract

### 4.1 Channels

At minimum, distinguish:

- **Direct experience:** the NPC was a participant or directly experienced the consequence.
- **Direct observation:** the NPC was an eligible witness at the time and place.
- **Testimony:** another NPC communicated what they know.
- **Rumor:** information is passed through an uncertain social chain.
- **Public information:** a notice, bell, public meeting or other explicit broadcast reached the NPC.

Do not treat proximity alone as knowledge. The event's observation conditions and the NPC's actual availability must be checked.

### 4.2 Provenance

Every personal knowledge claim must preserve:
- referenced event or fact;
- acquisition channel;
- source NPC or public source, where applicable;
- acquisition tick;
- confidence / reliability;
- whether it is firsthand or secondhand;
- current belief state (accepted, uncertain, disputed, rejected).

A rumor passed from A to B to C must retain its origin and chain. C must not sound as certain as a firsthand witness unless C independently verifies it.

### 4.3 No omniscient dialogue

Dialogue conditions may depend on:
- the speaker's personal knowledge;
- valid current perception (what can be seen or heard here and now);
- public facts explicitly available to them;
- a permitted narrative exception that is itself recorded.

They may not query the unrestricted world database and silently treat its contents as the speaker's knowledge.

## 5. Personal appraisal and emotional continuity

An event is appraised separately by every NPC with a reason to perceive or learn it.

Appraisal inputs should include:
- personal involvement and direct impact;
- relevance to active needs and goals;
- whether a valued person or group is affected;
- relationship to the actors and victims;
- severity and perceived likelihood of recurrence;
- perceived responsibility, fairness, blame and controllability;
- the NPC's stable traits, values and prior memories.

Examples:
- A fire at the market may produce fear in a shopkeeper whose livelihood is there, anger in someone who suspects arson, relief in a rival whose shop was spared, grief in a family whose member was injured, and curiosity in a child who only heard a rumor.
- A successful harvest may create relief for a farmer, new bargaining confidence for a grain merchant, and concern for a miller anticipating a crowded workload.
- The objective event is the same; relevance, knowledge and appraisal differ.

### 5.1 Stable identity vs transient state

Keep these concepts separate:

- **Personality:** stable tendencies and values.
- **Voice identity:** stable linguistic habits and preferred forms of expression.
- **Mood:** slower-moving affective baseline.
- **Emotion:** event-linked and target-linked response such as fear, anger, grief, relief, pride or guilt.
- **Delivery state:** how the current emotion changes sentence length, hesitation, politeness, directness, volume or willingness to speak.

Fear may make a blunt person speak more cautiously; it should not turn them into a permanently polite and flowery speaker. Anger may shorten their sentences; it should not erase their vocabulary or identity.

### 5.2 Emotional persistence

Emotions need:
- an originating event or explicit internal cause;
- intensity and target;
- start tick;
- persistence or decay policy;
- resolution conditions;
- links to memory and any resulting behavior.

Do not instantly clear fear when the immediate scene ends if the danger remains unresolved. Do not preserve acute panic forever after the danger has passed. Mood may change more slowly than a short emotion impulse. Long-term trust, grief or resentment may persist through memory and relationship even after acute emotion fades.

## 6. The world must change what can be said

The dialogue engine must derive current conversational affordances from the simulation rather than just select a line by the current weather.

A world event may cause:
- new topics to become available after the NPC learns about it;
- old topics to become stale or corrected after new evidence;
- a request to become urgent because supplies are running out;
- an offer to disappear because the NPC no longer owns the item;
- a promise or accusation to become relevant because of a remembered event;
- a friendly tone to become guarded after a betrayal;
- an apology or gratitude line to become available after a consequence is repaired;
- a quest-related request to be withdrawn if the problem has already been solved;
- an NPC to refuse work because a family member is ill or their own needs are critical.

These are not merely dialogue filters. They should reflect updated goals, resources, relationships and world state. Dialogue is downstream of those changes.

## 7. Dialogue entry validity contract

Every dialogue entry should define:
- speaker restriction or eligible character archetype;
- speech act / intent;
- topic;
- required knowledge claims or knowledge tags;
- forbidden conditions / contradictions;
- emotional and relationship compatibility;
- world-state predicates that are legitimately observable by this speaker;
- voice/style variants;
- required typed slots;
- event or memory references where it is a callback;
- cooldown / repetition key;
- optional proposed follow-up actions.

A content validator should reject impossible knowledge requirements, missing slots, unknown event tags, impossible entity references and contradictory conditions.

A selector must hard-filter invalid entries before scoring style or narrative quality. No amount of character fit can make an uninformed line valid.

## 8. Voice and emotion composition

Use a two-part process:

1. Select a semantically valid line or line family based on intent, knowledge, event context, goal and relationship.
2. Select an authored voice/delivery variant compatible with the stable voice profile and current affective state.

Do not take a generic line and merely swap synonyms. Do not randomly add stutters, exclamation marks or ellipses to simulate emotion. Important character lines should be written in that character's voice. Reusable templates should have coherent grammatical frames and typed semantic slots.

For Korean dialogue, delivery must preserve speech level, honorifics, address terms, particles, age/status conventions and character-specific vocabulary. An emotional shift can alter politeness or sentence rhythm only when that behavior is defined for the character.

## 9. State feedback from conversation

Conversation can itself create world events, but only through validated actions.

Examples:
- a promise creates an obligation with a due condition;
- a disclosed fact adds knowledge to the listener, with the speaker as source;
- a lie may create a false belief if the listener accepts it, while the objective world remains unchanged;
- an insult can cause a social event and affect the relationship;
- a trade offer does not transfer property until accepted and validated;
- a quest request does not create a quest until its world conditions and acceptance rules pass.

A dialogue line saying "I'll pay you tomorrow" is not itself proof of payment. A line saying "I heard the bridge collapsed" is not proof that the bridge collapsed.

## 10. Required scenario tests

### Scenario A — Market fire
- Fire event occurs at the market.
- Only eligible witnesses and affected participants immediately gain firsthand knowledge.
- A shopkeeper loses stock and gains a high-priority livelihood concern; a passerby witnesses the fire but has no stock loss; a distant farmer knows nothing.
- The shopkeeper's later dialogue mentions their actual loss and urgent needs, not generic fire commentary.
- The passerby can describe only what they witnessed.
- The farmer cannot discuss the fire until information reaches them.

### Scenario B — Harvest failure
- The harvest outcome updates actual food stocks and market supply.
- A farmer's food security and household goal state change.
- A merchant's expected supply and pricing decisions change.
- A caregiver's concern about vulnerable residents may increase.
- The same news leads to different emotional and conversational reactions based on each NPC's goals and relationships.
- When food is replenished, urgency and available requests change again.

### Scenario C — Betrayal and apology
- A betrayal event changes the victim's memory and relationship state.
- Their stable voice remains recognizable, but trust, willingness to disclose, and emotional delivery change.
- A later apology is evaluated against the remembered harm and whether reparative action occurred.
- Forgiveness is not a fixed dialogue flag; it depends on personality, relationship history, evidence and consequences.

### Scenario D — Rumor correction
- A rumor spreads with provenance and uncertainty.
- NPCs may repeat it as a rumor, not confirmed fact.
- When stronger evidence arrives, belief confidence and dialogue update.
- NPCs who never received the correction may continue to believe the old rumor until informed.

## 11. Performance and determinism

- Event propagation should be incremental and scheduled; do not recalculate every NPC's entire biography after every small event.
- Relevance indexes may identify NPCs whose goals, relationships, location or knowledge intersect an event.
- All updates must still be reproducible and order-stable.
- Store enough event, knowledge, emotion and memory state to preserve continuity after saving.
- Optimizations must not silently convert personal information into global omniscience.

## 12. Acceptance criteria

The contract is not implemented merely because these words exist in documentation. Completion requires executable tests proving:
- the same world event causes distinct personal reactions;
- an NPC's knowledge changes only through valid acquisition;
- dialogue reflects current world resources, goals and relationships;
- stable voice identity survives changing emotions;
- emotional states persist and resolve for causal reasons;
- contradictory or uninformed lines are filtered out;
- player dialogue changes world state only through validated commands;
- the same inputs and seed reproduce the same knowledge, emotion and dialogue results.


## 13. Relationship consequences and person-targeted speech

Events that change interpersonal trust or hostility may carry explicit, validated relationship consequences. These are applied with the same atomic world transition as resource changes; an invalid relationship delta rejects the entire transition rather than leaving a partially updated world.

- A relationship record is directional: Mira's trust in Dain is not the same value as Dain's trust in Mira.
- An event must identify the affected relationship owner and the target person.
- Event-linked emotions such as anger, suspicion, gratitude, or resentment should retain the person or group they concern when that target is known.
- Dialogue selection may depend on the current listener. A guarded or accusatory line aimed at Dain must not be selected when the player is speaking to Bram.
- A relationship-dependent line also needs its factual memory/knowledge requirement. Low trust alone does not authorize a character to describe an event they never learned about.
- Apologies, restitution, repeated cooperation, threats and broken promises should change relationship state only through explicit world events with defined conditions.

Acceptance scenario: after a betrayal, the victim remembers the event, develops an emotion directed at the responsible person, and loses trust in that person. The victim's stable voice remains recognizable. The victim uses a more guarded or accusatory response only when speaking to the responsible person and only when the betrayal is in their personal knowledge. A valid apology or restitution may later alter the relationship, but does not erase the memory automatically.
