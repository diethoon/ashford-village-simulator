# Ashford: A Living World

*A World That Lives Beyond the Player.*

Ashford is an offline-first, LLM-free village simulation RPG. Its residents have their own needs, ambitions, relationships, memories, knowledge, livelihoods, and plans. The world continues to evolve whether or not the player intervenes.

> **Design principle:** We do not build a game that manufactures quests. We build a world in which quests naturally emerge.

## Start here

1. [AGENTS.md](AGENTS.md) — mandatory repository engineering directive.
2. [docs/MASTER_SPEC.md](docs/MASTER_SPEC.md) — canonical project specification and single source of truth.
3. [docs/DECISION_LOG.md](docs/DECISION_LOG.md) — user-confirmed decisions and change history.
4. [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) — implemented, verified, deferred, and known-gap status.
5. [docs/WORLD_DIALOGUE_CAUSALITY.md](docs/WORLD_DIALOGUE_CAUSALITY.md) — mandatory causal relationship between world events, personal knowledge, emotion, and dialogue.
6. [docs/DIALOGUE_SYSTEM.md](docs/DIALOGUE_SYSTEM.md) — authored dialogue, personal voices, selection, and content rules.
7. [docs/GOAL_SYSTEM.md](docs/GOAL_SYSTEM.md) — knowledge-driven personal goal emergence and current autonomy boundaries.
8. [docs/UI_UX_SPEC.md](docs/UI_UX_SPEC.md) — mobile-first, context-first interface and evidence presentation.

## Core principles

- **Zero runtime LLM/API calls.** All game-time behavior and dialogue run locally from authored content and deterministic rules.
- **Autonomous residents.** NPCs pursue goals, form relationships, trade, cooperate, conflict, and respond to changing circumstances.
- **Emergent quests.** Problems and requests arise from world events and NPC limitations. NPCs can solve, abandon, or worsen them without waiting for the player.
- **World-grounded dialogue.** A character's words, emotions, tone, requests, and conversational options must agree with the actual world and with what that individual knows or has experienced.
- **Distinct voices.** Each character has authored dialogue, a stable voice identity, personal knowledge, beliefs, memories, and context-sensitive emotional delivery.
- **World-state integrity.** Dialogue and UI describe the world; only validated simulation commands change it.
- **Reproducible simulation.** Seeded randomness and explicit state make behavior testable and save-compatible.
- **Offline-first.** Core gameplay does not depend on network access.

## World and dialogue consistency

Dialogue is part of the simulation's causal loop, not decorative flavor text:

**World change → event → personal observation/information → knowledge and belief → emotional appraisal → memory/goals/relationships → dialogue.**

A world event does not make every resident omniscient. The same event can cause fear in one person, curiosity in another, anger or relief in someone else, depending on their role, circumstances, relationships, goals, and information source. Their stable personality and voice remain recognizable as emotions change.

See [docs/WORLD_DIALOGUE_CAUSALITY.md](docs/WORLD_DIALOGUE_CAUSALITY.md) for required scenarios and acceptance criteria.

## Current browser vertical slice

The repository includes a runnable static browser demo backed by the TypeScript world-dialogue core. Its mobile-first interface surfaces the highest-priority resident situation, goal evidence and confidence, and a direct contextual conversation action; on narrow screens the resident selector becomes a horizontal card rail. Select Ellen, Bram, Mira, or Dain; trigger the satchel-loss event; transmit a rumor; hear goal-backed requests; and recover the satchel to see requests disappear and gratitude dialogue become available.

The core validates event-driven resource, relationship, and goal transitions atomically. Personal knowledge delivery can instantiate or activate NPC-specific goals through deterministic rules; uninformed residents do not receive goals from events they have not learned about. Dialogue selection checks personal knowledge, acquisition channel, emotion, current resources, listener relationship, and goal status. The same eligibility rule controls whether the UI exposes a help-request action.

This is a first goal-emergence slice, not yet a complete autonomous planner: needs/utility evaluation, capability and schedule constraints, self-resolution, delegation, and multi-agent quest competition remain future work. Current implementation and verification limits are tracked in [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

## Development

Install dependencies and run:

```sh
npm install
npm run typecheck
npm test
```

The game runtime must never call an LLM API. The core must remain independently testable from the UI.
