# Decision Log

Only user-confirmed decisions belong in the CONFIRMED section. New suggestions remain PROPOSED until explicitly accepted.

## CONFIRMED

### ADR-001 — Independent project boundary
- Date: 2026-11-11
- Decision: Ashford Village Simulator is a completely separate project from VEIL. It requires its own GitHub repository, specifications, code, issues, deployment project, and infrastructure.
- Consequence: Never write Ashford artifacts into the VEIL repository or reuse VEIL deployment resources.

### ADR-002 — Master specification and legacy supersession
- Date: 2026-11-11
- Decision: The repository-level directive and Ashford master/subsystem specifications govern all development. Conflicting older documents/designs are marked LEGACY / SUPERSEDED and must not be implemented or revived.
- Consequence: Changes require explicit decision records and user approval.

### ADR-003 — Runtime without LLM
- Date: 2026-11-11
- Decision: LLM calls are not part of gameplay runtime. Use authored content, templates, and deterministic simulation.
- Consequence: No runtime model API dependency for actions, NPC agency, dialogue, or quests.

### ADR-004 — World simulation before quest catalogue
- Date: 2026-11-11
- Decision: Quests emerge from real world events, NPC goals, needs, relationships, and constrained ability to self-resolve.
- Consequence: Quest instances must reference real world entities and objective conditions.

### ADR-005 — Pause world when app is closed
- Date: 2026-11-11
- Decision: The world does not advance while the application is closed. Reopen from the last successfully saved state.
- Consequence: No wall-clock offline simulation by default.

### ADR-006 — First vertical slice is the inn
- Date: 2026-11-11
- Decision: Deeply implement the inn first, including actual travelers, real object interactions, contextual action choices, time progression, and a world-derived request.
- Consequence: Do not broaden shallow menus before the inn slice behaves coherently.

### ADR-007 — Approximate initial village scale
- Date: 2026-11-11
- Decision: Target an initial village baseline of approximately 100 residents, 24–25 households, and a 365-day annual cycle. The job distribution and facility counts remain balancing assumptions subject to simulation evidence.

### ADR-008 — World changes must causally shape NPC dialogue, emotion, and voice delivery
- Date: 2026-11-11
- Decision: Dialogue content, knowledge, emotional state, and delivery must agree with the real world and with what the individual NPC has experienced or learned. Relevant world changes must affect dialogue through explicit event perception, information acquisition, personal appraisal, memory/goal/relationship updates, and dialogue selection.
- Consequence:
  - A world event does not make every NPC omniscient.
  - Direct experience, observation, testimony, rumor, and public information remain distinct.
  - The same event can produce different reactions because residents have different roles, needs, goals, values, relationships, and knowledge.
  - Stable personality and voice remain distinguishable from transient mood and event-linked emotion.
  - A character cannot offer resources they no longer possess or request help for a problem that has already been resolved.
  - Each utterance must be traceable to its knowledge/event causes and valid current-state predicates.
- Affected specifications: docs/MASTER_SPEC.md, docs/DIALOGUE_SYSTEM.md, docs/WORLD_DIALOGUE_CAUSALITY.md.
- Verification required: event-to-dialogue integration tests, knowledge provenance tests, emotional continuity tests, and current-resource dialogue tests.

## PROPOSED

None recorded.

## Change template
- ADR ID / date:
- Status: PROPOSED | CONFIRMED | REJECTED | SUPERSEDED
- Existing rule:
- Proposed change:
- User approval reference:
- Affected specifications/code/tests/saves:
- Migration and rollback:
- Rationale:
