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

### NPC agency and utility-action loop
- [x] Per-NPC action candidates require valid goal state, personal event knowledge/provenance, need thresholds, capabilities, resources, and cooldown.
- [x] Candidate utility is calculated deterministically and ties use stable NPC/rule identifiers.
- [x] The selected action executes as one event through the atomic world-event pipeline.
- [x] Resource costs, need changes, goal transitions, event resolution, and awareness updates commit together or are rejected without partial state changes.
- [x] Mira can find her satchel without a player recovery command when her personal goal, direct knowledge, security need, and search skill allow it.
- [x] Ellen's linked help goal completes only because she witnesses Mira's recovery; uninformed NPCs cannot use the event as action evidence.
- [x] Bram can take a fatigue-reducing rest action without a quest.
- [x] The browser UI previews the best eligible action with decision reasons and an explicit one-step execution control; the explanation stacks above a full-width mobile action button.

### Build and automated verification
- [x] Strict TypeScript type-check.
- [x] Automated world/dialogue regression suite.
- [x] Browser bundle build using esbuild.
- [x] GitHub Actions runs all three checks on pull requests and main branch changes.

Latest verified implementation run:
- Feature branch: `feature/npc-autonomy-v1`
- Verified code commit: `9d642b73b18fecf7a1b3b9bf7f3916eda01397d9`
- Type-check: passed.
- Tests: 29 passed, 0 failed.
- Browser build: passed.
- Run: https://github.com/diethoon/ashford-village-simulator/actions/runs/42952993550
- Review: https://github.com/diethoon/ashford-village-simulator/pull/1
- This agency implementation is on a review branch and has not yet been merged into `main`.

## Still not complete

- The earlier standalone prototype's original source, save data, and regression suite have not yet been imported into this canonical repository. The current browser vertical slice is a new, self-contained implementation of the world-dialogue behavior, not proof that the previous prototype has been merged.
- The current simulation contains four authored inn residents and a deliberately narrow set of event/goal rules. This is not yet the approximately 100-person autonomous village.
- The first utility-action loop is implemented and CI-verified in PR #1. It is a bounded vertical slice, not a full autonomous planner: continuous need generation/decay, time-of-day schedules, geographic reachability, NPC-to-NPC delegation, contested resource reservation, multi-step planning/retries, and multi-agent quest competition remain future systems.
- Save/load persistence for the new core's personal knowledge, goal state, event provenance, memories, emotion causes, and dialogue history is not yet connected.
- The browser shell is a static TypeScript application, not yet the final React/PWA/Capacitor architecture. The new responsive layout has not yet passed real-device/browser E2E review.
- Actual browser interaction/e2e automation has not yet been performed. CI proves type-check, unit/integration tests, and bundle creation, not visual/browser acceptance.
- The static browser demo has not yet been verified as a live Vercel deployment.
- The emotional appraisal model is intentionally small and rule-based. It needs richer per-character appraisal profiles and longer multi-day continuity tests.
- Rumor propagation currently handles explicit individual-to-individual transmission; geographic reach, social-network diffusion, credibility evolution, and misinformation correction remain future work.

## Immediate next engineering sequence

1. Verify the PR browser slice with actual browser automation at 320px, 375px, 430px, tablet, and desktop widths; confirm the autonomous action preview and resulting dialogue/evidence updates.
2. Connect the core to the prior inn/world prototype without reviving superseded generic menus, omniscient rumors, or fixed quest spawning.
3. Add versioned local save/load for canonical world state, goals, needs, capabilities, knowledge, emotions, relationships, and event provenance.
4. Expand utility decisions with schedules, location reachability, reservations, delegation, and safe multi-step action planning.
5. Run a multi-day inn simulation with deterministic replay before scaling population beyond the four-resident slice.
