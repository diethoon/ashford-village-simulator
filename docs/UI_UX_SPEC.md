# Ashford UI/UX Specification

**Parent authority:** `docs/MASTER_SPEC.md` §13.1  
**Status:** CONFIRMED interface direction; component-level styling may evolve  
**Product:** Ashford Village Simulator  
**Runtime:** Local, deterministic, LLM-free

## 1. Experience principle

**Make the journey simple, the world legible, and the emotional response human.**

The interface should help the player understand what matters now, why it matters, and what they can do next. It must not make the player inspect multiple panels to discover a situation that the simulation already knows is important.

## 2. Apply the 2026 reference themes

### Zero-click orientation
- The opening view presents the current world pulse: the highest-priority actionable situation, who it affects, and the most relevant next interaction.
- Context is computed from canonical state and personal knowledge. The UI does not guess or pre-emptively create a quest.
- A direct action is offered only when the same core eligibility rule permits it.
- If nothing requires attention, say so clearly rather than filling the screen with artificial urgency.

### Feel-economy and emotional care
- Microcopy reflects actual NPC circumstances and emotional state.
- Feedback identifies what changed and who was affected. A recovered item can acknowledge relief; a rejected action should explain the missing prerequisite without blaming the player.
- Avoid manipulative streaks, false urgency, generic praise, and celebratory feedback for harmful outcomes.
- Character voice remains authored and distinct; interface microcopy must not flatten it.

### Trust visualization
- Evidence-dependent UI shows the knowledge path (direct experience, direct observation, testimony, rumor, or public information).
- Show source/carrier when known, confidence, and the originating event.
- A low-confidence rumor is visibly different from firsthand knowledge.
- A visual badge or meter is a summary, not a replacement for the underlying event/knowledge record.
- Keep detailed causal traces available on demand to avoid overwhelming the primary reading flow.

### Liquid-glass visual language
- Use translucent surfaces, soft layering, restrained borders, and subtle depth to separate content groups.
- Glass effects are decorative hierarchy only; they must never reduce text contrast or hide state boundaries.
- Every screen remains usable when `backdrop-filter` is unavailable.
- Motion is short and purposeful; all essential information is static and available with reduced motion enabled.

### Bento grid
- Use modular cards for world pulse, NPC goals, resident context, evidence, and event history.
- Size and order reflect decision priority, not visual novelty.
- On desktop, related modules may share a row or use asymmetric spans.
- On phones, modules become a single-column reading sequence with the highest-priority context first.

## 3. Responsive behavior

| Viewport | Layout behavior |
|---|---|
| 1024 CSS px and above | Bento overview, resident rail/sidebar, conversation and evidence panels |
| 721–1023 px | Narrower columns, two-column resident/context cards, reduced panel padding |
| 431–720 px | One-column page; resident selector becomes a horizontal card rail; primary actions wrap |
| 320–430 px | Single-column content, 2×2 context cards, full-width event/action buttons, compact but readable metadata |

Requirements:
- Support 320 CSS px without horizontal page overflow.
- Use a minimum 44×44 CSS px target for primary touch controls.
- Keep body copy at a readable size; metadata may be smaller but must remain legible.
- Allow long Korean text, names, and IDs to wrap without clipping.
- Reserve space for mobile safe-area insets.
- Do not require hover for any operation or explanation.

## 4. Information hierarchy

1. **Now:** world clock and highest-priority actionable situation.
2. **Why:** NPC goal and the personal evidence that activated it.
3. **Who:** resident identity, current emotion, personal knowledge, and stable voice.
4. **Act:** contextual conversation/request options enabled by canonical goal state.
5. **History:** chronological world events and expandable causal traces.

The default view should avoid presenting all low-level fields at once. Detailed traces use progressive disclosure, but factual provenance remains inspectable.

## 5. State and trust presentation

Every goal card should distinguish:
- status: unresolved, active, delegated, completed, failed, or abandoned;
- authored priority, adjusted only by documented simulation rules;
- originating event IDs;
- personal knowledge record(s) that justify the goal;
- acquisition channel, source NPC where applicable, and confidence.

Status colors must be reinforced by readable text. Color alone cannot distinguish active, completed, or failed states.

## 6. Interaction and feedback

- A disabled action explains or visually exposes the missing condition where practical.
- A successful action reports the actual committed event, not an optimistic UI assumption.
- Rejected actions leave the displayed canonical state unchanged and show a calm, actionable reason.
- Buttons and focus affordances call the same engine eligibility helpers used by dialogue selection.
- Selection, disclosure, and navigation must work by keyboard as well as touch.

## 7. Accessibility and performance

- Respect `prefers-reduced-motion`.
- Maintain visible keyboard focus.
- Use semantic headings, buttons, lists, and live regions for changing status.
- Provide text labels for confidence meters and status chips.
- Use translucent layers only with a sufficiently opaque fallback surface.
- Do not make essential state depend on blur, color, animation, or iconography.

## 8. Current slice implementation notes

The current browser vertical slice applies this system through:
- a world-event control panel;
- a world-pulse card with a direct path to the highest-priority actionable NPC request;
- a personal-goal board with evidence channel and confidence;
- a horizontally scrollable resident rail on phone screens;
- a character context panel and expandable dialogue evidence trace;
- a causal event timeline.

This is a static TypeScript browser shell, not the final React/PWA implementation. Real-device and browser E2E validation remain separate acceptance tasks.


## 9. NPC autonomy as a transparent interaction
- Show the best currently eligible NPC action as a concise preview, including the acting resident, intended action, and why it is eligible.
- Surface the decision score only as a comparative utility indicator, never as a promise of success.
- The player may advance one explicit simulation action at a time in this prototype; the button is disabled when no valid candidate exists.
- After execution, show the committed world event and the evidence/goal/capability/need factors used by the planner.
- The action preview must be recomputed from canonical state after every event. It must not remain visible after its goal, resources, evidence, or prerequisites become invalid.
- On narrow phones, stack the explanation above a full-width 44px action button.
