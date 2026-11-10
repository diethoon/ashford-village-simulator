# Legacy and Conflict Register

**Authority:** This register is subordinate only to AGENTS.md and docs/MASTER_SPEC.md. It controls how historical Ashford material is treated.

## LEG-001 — Earlier Ashford static prototype (pre-specification build)
- Status: LEGACY / SUPERSEDED AS PRODUCT AUTHORITY.
- Description: Earlier quick prototype with a generic action menu, scripted/fixed quest triggers, and traveler rumors not guaranteed to map to real instantiated NPCs.
- Conflicts: Entity truth, contextual affordances, quest emergence, and causal rumor requirements.
- Replacement: docs/MASTER_SPEC.md and the relevant subsystem specifications.
- Instruction: Preserve only as historical prototype evidence. **DO NOT IMPLEMENT OR EXTEND THE GENERIC-ACTION / FAKE-RUMOR / FIXED-QUEST-SPAWN DIRECTION.**

## LEG-002 — Any VEIL-derived document or implementation
- Status: PROHIBITED CROSS-PROJECT DEPENDENCY.
- Description: Any VEIL/TRPG architecture, code, prompt, test, report, or deployment artifact proposed for reuse without a new Ashford-specific decision.
- Conflict: Project identity and isolation requirement.
- Replacement: Ashford specifications in this repository.
- Instruction: **DO NOT IMPORT, COPY, MERGE, LINK, OR IMPLEMENT VEIL MATERIAL IN THIS PROJECT.** Generic ideas may be reconsidered only through a new proposal and explicit approval.

## LEG-003 — Static generic choice menus as the definition of freedom
- Status: LEGACY / REJECTED.
- Conflict: Action variety disconnected from targets does not produce systemic freedom.
- Replacement: Context-derived affordances and composable action rules.
- Instruction: **DO NOT RETURN TO ONE UNIVERSAL ACTION MENU FOR ALL NPCS/OBJECTS.**

## LEG-004 — Fixed timetable quest spawning presented as emergent quests
- Status: LEGACY / REJECTED.
- Conflict: A quest appearing on a date or random timer is not evidence of emergent world causality.
- Replacement: docs/MASTER_SPEC.md, Section 11.
- Instruction: **DO NOT PRESENT FIXED QUEST TIMERS OR DISCONNECTED RANDOM ERRANDS AS AUTONOMOUS QUEST EMERGENCE.**

## LEG-005 — Runtime LLM as NPC/action/quest authority
- Status: LEGACY / PROHIBITED.
- Conflict: Runtime LLM calls are excluded from the approved product direction.
- Replacement: Deterministic rules, Utility AI, authored dialogue/quest templates.
- Instruction: **DO NOT ADD RUNTIME LLM/API CALLS.**

## LEG-006 — Omniscient world-state dialogue
- Status: LEGACY / PROHIBITED.
- Description: Dialogue generation that reads global world facts directly and lets any NPC discuss events they never experienced or learned about.
- Conflict: Violates personal knowledge, rumor provenance, and world-to-dialogue causality.
- Replacement: docs/WORLD_DIALOGUE_CAUSALITY.md and docs/DIALOGUE_SYSTEM.md.
- Instruction: **DO NOT LET DIALOGUE BYPASS NPC KNOWLEDGE AND PERCEPTION RULES.**

## Legacy policy
Historical artifacts may be retained for traceability, but they are not current requirements. A new specification explicitly supersedes conflicting portions. Never silently edit historical reports to make them appear current. If a former assumption is revived, it must be proposed, justified, and approved as a new decision—not copied from legacy status.
