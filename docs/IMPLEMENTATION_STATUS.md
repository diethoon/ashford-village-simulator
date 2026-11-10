# Implementation Status

**Recorded:** 2026-11-11  
**Specification baseline:** docs/MASTER_SPEC.md  
**Repository:** diethoon/ashford-village-simulator

## Verified in the current repository

### World and dialogue core
- [x] Typed NPC state includes stable voice/personality, personal goals, knowledge provenance, memories, event-linked emotions, resources, and directional relationships.
- [x] World events distinguish direct experience, direct observation, testimony, rumor, and public information.
- [x] An NPC can only transmit information about an event they personally know.
- [x] Dialogue entries can require personal knowledge, acquisition channel, emotion, actual resources, listener relationship, and NPC goal status.
- [x] Dialogue candidates with unmet goal conditions are filtered out before selection.
- [x] Event-linked emotions can target a responsible NPC and resolve when a verified later event resolves their cause.
- [x] World events can atomically update resources, relationships, and NPC goals. Invalid changes reject the whole event without partial state mutation.
- [x] Goal transitions validate the goal identity and allowed lifecycle. Terminal goals cannot silently become active again.
- [x] Goal-backed UI affordances use the same simulation-owned eligibility helper as the dialogue core.
- [x] Knowledge delivery evaluates each NPC's authored goal rules; generated goals retain origin event IDs and severity/confidence-weighted priority.
- [x] Test coverage proves uninformed NPCs do not create goals, rumor recipients can create only channel-permitted goals, and terminal goals are not revived.

### Authored inn residents and browser vertical slice
- [x] Four distinct resident voice profiles and authored greetings: Ellen, Bram, Mira, and Dain.
- [x] NPC-specific goal rules instantiate Mira's `recover_satchel` and Ellen's `help_guest` goals only after their own direct experience or observation of the satchel-loss event.
- [x] The loss event gives Mira firsthand knowledge and Ellen witness knowledge; uninformed residents cannot discuss it.
- [x] Mira and Ellen can make different help requests tied to their own active goals and personal knowledge.
- [x] Bram can discuss the incident only after Ellen transmits it as a rumor; his line explicitly identifies it as hearsay.
- [x] Satchel recovery completes Mira's and Ellen's goals, resolves the event-linked worry, preserves the historical memory, and disables the request affordance.
- [x] Recovery unlocks new gratitude/relief responses for Mira and Ellen. The old unresolved-problem request is no longer eligible.
- [x] Browser UI exposes resident selection, personal knowledge, emotion, stable voice, current goal/status, event history, contextual request action, and event controls.
- [x] Mobile-first UI adds a world-pulse focus card, bento goal/evidence cards, provenance confidence display, horizontally scrollable resident cards, and expandable dialogue traces.
- [x] CSS includes narrow-phone breakpoints, 44px minimum controls, safe-area padding, keyboard focus styles, and reduced-motion support.

### Build and automated verification
- [x] Strict TypeScript type-check.
- [x] Automated world/dialogue regression suite.
- [x] Browser bundle build using esbuild.
- [x] GitHub Actions runs all three checks on repository changes.

Latest verified run:
- Commit: `c27bb0bb087a282b9104dbc66b977ee274abd0c6`
- Type-check: passed.
- Tests: 22 passed, 0 failed.
- Browser build: passed.
- Run: https://github.com/diethoon/ashford-village-simulator/actions/runs/42910920108

## Still not complete

- The earlier standalone prototype's original source, save data, and regression suite have not yet been imported into this canonical repository. The current browser vertical slice is a new, self-contained implementation of the world-dialogue behavior, not proof that the previous prototype has been merged.
- The current simulation contains four authored inn residents and a deliberately narrow set of event/goal rules. This is not yet the approximately 100-person autonomous village.
- The first goal-emergence slice is now rule-driven from each NPC's personal knowledge, rather than requiring explicit activation goal deltas. It is not a full autonomous planner: continuous needs/utility evaluation, capability and schedule constraints, self-resolution attempts, delegation decisions, and multi-agent quest competition remain future systems.
- Save/load persistence for the new core's personal knowledge, goal state, event provenance, memories, emotion causes, and dialogue history is not yet connected.
- The browser shell is a static TypeScript application, not yet the final React/PWA/Capacitor architecture. The new responsive layout has not yet passed real-device/browser E2E review.
- Actual browser interaction/e2e automation has not yet been performed. CI proves type-check, unit/integration tests, and bundle creation, not visual/browser acceptance.
- The static browser demo has not yet been verified as a live Vercel deployment.
- The emotional appraisal model is intentionally small and rule-based. It needs richer per-character appraisal profiles and longer multi-day continuity tests.
- Rumor propagation currently handles explicit individual-to-individual transmission; geographic reach, social-network diffusion, credibility evolution, and misinformation correction remain future work.

## Immediate next engineering sequence

1. Verify the interactive browser slice in a real browser and address visual/runtime issues.
2. Connect the new core to the existing inn/world prototype without importing superseded generic-menu, omniscient-rumor, or fixed-quest-spawn behavior.
3. Persist goals, knowledge, emotions, memories, relationships, and event provenance through versioned save/load.
4. Replace demo-only event buttons with validated contextual actions that consume simulation time and resources.
5. Add NPC autonomous goal evaluation so they can attempt self-resolution, request help only when appropriate, and progress/abandon goals without player input.
6. Expand the inn to a multi-day social/economic simulation before increasing the population.
