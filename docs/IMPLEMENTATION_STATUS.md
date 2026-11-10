# Implementation Status

**Recorded:** 2026-11-11  
**Specification baseline:** docs/MASTER_SPEC.md  
**Repository:** diethoon/ashford-village-simulator

## Repository bootstrap

- [x] Independent Ashford repository exists and is private.
- [x] Root engineering directive and canonical master specification are present.
- [x] Decision log records the confirmed world-to-dialogue causality requirement.
- [x] Runtime LLM/API use remains prohibited.
- [ ] Existing standalone inn prototype source and its original regression suite have not yet been imported into this GitHub repository. The prior local package/deployment artifact is not evidence that those files are currently present here.

## Implemented in this repository

- [x] TypeScript project/test configuration for an isolated dialogue-core slice.
- [x] Typed NPC, event, knowledge, emotion, memory, resource, and dialogue contracts.
- [x] Event awareness channels for direct experience, observation, public information, testimony, and rumor.
- [x] Information transmission checks that require the source NPC to know the event; rumor confidence is reduced and source provenance retained.
- [x] Event-linked emotional appraisal and gradual emotion decay, with memory retained separately.
- [x] Dialogue candidate filtering by speaker, intent, topic, personal knowledge, emotion, and actual NPC resource quantities.
- [x] Atomic world-event commit for the prototype slice: resource deltas are validated before state mutation; the resulting event is then propagated only to eligible NPCs.
- [x] Market-fire vertical-slice test cases covering different knowledge, emotional response, dialogue, resource loss, and rejection of invalid resource transitions. CI verifies 10/10 tests and strict TypeScript checks.
- [x] GitHub Actions workflow file for type-checking and core tests.

## Verification status

- Code and test files have been committed to the repository.
- The GitHub Actions workflow file is present.
- [x] GitHub Actions run b886845c7f62355d62be8d83d1be2dad3e642cfe passed: TypeScript type-check succeeded and all 10 world-dialogue tests passed (0 failures). See https://github.com/diethoon/ashford-village-simulator/actions/runs/42907614102.
- [ ] The TypeScript core slice is not yet wired into the playable inn UI or the earlier standalone prototype.
- [ ] Runtime no-network/no-LLM checks for the complete application remain pending because the earlier application source has not yet been imported into this repository.

## Known gaps

- The dialogue core is a first executable slice, not a complete scalable dialogue engine.
- Emotion appraisal currently uses a deliberately small rule set and a few traits/tags; it is not a finished appraisal model.
- Knowledge transfer currently models one event at a time; social rumor propagation, geographic reach, credibility, memory distortion, and group information networks remain future work.
- Dialogue lines in the test fixture demonstrate the contract only; the actual NPC content catalogue remains to be authored.
- The current event pipeline handles NPC-owned numeric resources; general inventory ownership, market stock, household food, locations, object damage, and quest transitions must use the canonical engine's own state-transition contracts when integrated.
- Persistence of knowledge, emotions, event provenance, and dialogue history is not yet implemented in the save layer.
- The prior inn slice and its deployment must be imported and integrated before this core can be called part of the playable app.

## Next engineering sequence

1. Verify type-check and test results through a successful CI run; resolve any compile/test failures.
2. Import and inspect the existing inn prototype source, tests, and current save schema into this repository without reviving superseded behavior.
3. Integrate event/knowledge/emotion/dialogue projections into the canonical engine action lifecycle rather than maintaining a parallel world state.
4. Add actual inn NPC dialogue variants driven by world events, resource state, memories, relationship state, and personal knowledge.
5. Add save migration and deterministic replay tests for event knowledge, emotion causes, memories, and dialogue history.
6. Expand beyond the inn only after the vertical slice proves coherent over multi-day tests.


## World-dialogue CI milestone (2026-11-11)

- User-confirmed requirement recorded as ADR-008: conversation content, delivery, and emotions must match the current world and the specific NPC's experience or knowledge.
- Added a causal world-dialogue contract and a market-fire scenario in which the directly affected shopkeeper and an unrelated witness form different emotional reactions; a distant uninformed resident cannot speak about the event.
- Added atomic resource delta validation so a world event cannot partially apply when a resource quantity would become invalid.
- GitHub Actions verification: commit a9d02726c6cc0b83fb855c0f8e789a6921479d6e, 12 tests passed, 0 failed; TypeScript type-check passed. The expanded suite also verifies relationship changes and target-specific emotional responses after betrayal.
- This verifies the isolated TypeScript dialogue-core slice only. It does NOT yet verify integration with the legacy playable inn prototype, the full browser app, or a deployment.


## Relationship-aware dialogue milestone (2026-11-11)

- World events can now carry relationship deltas that are validated and applied atomically with resource changes.
- Personal emotions linked to betrayal or theft identify the NPC target, allowing the reaction to be directed at the responsible person.
- Dialogue entries can require relationship thresholds with the current listener, so a guarded or angry response is selected only for the relevant person and only when the speaker knows the event.
- GitHub Actions verification: commit a9d02726c6cc0b83fb855c0f8e789a6921479d6e, type-check passed, 12 tests passed, 0 failed.
- Still a prototype-scale ruleset; event appraisal, social propagation, dialogue authoring coverage, persistence and playable-app integration remain open work.


## Inn character voice content milestone (2026-11-11)

- Added stable voice profiles for Ellen, Bram, Mira, and Dain, each with distinct traits, concerns, speech habits, and factual boundaries.
- Added authored greeting lines for all four residents. The same greeting intent produces four distinct character-specific utterances.
- Added an inn lost-satchel scenario: Mira's line reflects firsthand worry; Ellen's line reflects what she witnessed and explicitly avoids claiming she saw a theft; Bram cannot discuss the event before learning about it.
- Added a distinct `worry` emotional state for personal property loss rather than treating every adverse event as generic fear.
- GitHub Actions verification: commit 16974c8e871860ca64c21d4113699afedd6e8fca, type-check passed, 14 tests passed, 0 failed.
- The authored content is a testable content module, not yet connected to the prototype's browser UI.
