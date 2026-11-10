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
- [x] Market-fire vertical-slice test cases covering different knowledge, emotional response, dialogue, resource loss, and rejection of invalid resource transitions.
- [x] GitHub Actions workflow file for type-checking and core tests.

## Verification status

- Code and test files have been committed to the repository.
- The GitHub Actions workflow file is present.
- [ ] A workflow run has not yet been observed. The Actions API currently returns zero workflow runs, so the new TypeScript tests and type-check must not yet be described as passing.
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
