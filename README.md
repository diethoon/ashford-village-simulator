# Ashford: A Living World

*A World That Lives Beyond the Player.*

Ashford is an offline-first, LLM-free village simulation RPG. Its residents have their own needs, ambitions, relationships, memories, knowledge, livelihoods, and plans. The world continues to evolve whether or not the player intervenes.

> **Design principle:** We do not build a game that manufactures quests. We build a world in which quests naturally emerge.

## Core principles

- **Zero runtime LLM/API calls.** All game-time behavior and dialogue run locally from deterministic simulation rules and authored content.
- **Autonomous residents.** NPCs pursue goals, make decisions, form relationships, trade, cooperate, conflict, and respond to changing circumstances.
- **Emergent quests.** Problems and requests arise from world events and NPC limitations. NPCs can solve, abandon, or worsen them without waiting for the player.
- **Distinct voices.** Each character has authored dialogue, a voice profile, personal knowledge, beliefs, memories, and context-sensitive reactions.
- **World-state integrity.** Dialogue and UI describe the world; only validated simulation commands change it.
- **Reproducible simulation.** Seeded randomness and explicit state make behavior testable and save-compatible.
- **Offline-first.** Core gameplay does not depend on network access.

## Project status

The repository is at its initial specification stage. The authoritative requirements are in docs/ASHFORD_SSOT.md. No gameplay implementation should be considered complete until it exists in the repository and passes its tests.

## Dialogue without a runtime LLM

Ashford does not promise infinite on-the-fly prose generation. Instead, it combines:
- individually authored lines for important characters and story moments;
- character-specific dialogue sets and voice profiles;
- context, relationship, mood, memory, and knowledge filters;
- validated sentence templates and semantic slots;
- repetition control and honest fallback responses.

This provides substantial combinatorial variety while preserving character identity and factual consistency. NPCs can only report what they know, suspect, or have been told.

## Development rules

1. Read docs/ASHFORD_SSOT.md before changing architecture or gameplay behavior.
2. Treat the SSOT as authoritative. Do not silently replace user-approved requirements.
3. Record proposed changes and their impact before changing established requirements.
4. Keep the simulation core independent from the UI.
5. Never add a runtime LLM dependency or hidden network call.
6. Test state transitions, deterministic behavior, persistence, and long-running simulation.

## Repository structure

The structure will be introduced incrementally as each subsystem is implemented and tested. Proposed architecture and unapproved technical choices must remain clearly labeled as proposals.

## License

No license has been selected yet. All rights reserved by default until the project owner chooses and adds a license.
