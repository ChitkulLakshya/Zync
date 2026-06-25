---
name: agentic-liquid-glass-ui-2026
description: Build and refactor premium product UIs using 2026 agentic AI best practices, combining Apple-inspired Liquid Glass aesthetics with constrained generation, design system enforcement, validation gates, exact token contracts, and transparent agent behavior. Trigger for "make it look better", "Apple-style", "premium UI", or "refactor frontend".
version: 2026.2
tags:
  - ui
  - ux
  - agentic-ai
  - liquid-glass
  - design-system
  - frontend
---

# Agentic Liquid Glass UI Skill (2026 Edition)

## 1. Purpose & Core Philosophy

This skill directs an AI agent to design, build, or refactor product interfaces into a premium Apple-inspired Liquid Glass aesthetic while adhering to strict 2026 agentic workflows. The agent must act as an **assembler of native-feeling components**, rather than an open-ended artist. It must strictly adhere to Apple's **Human Interface Guidelines (HIG)** and ensure the UI natively fits the host environment (utilizing A2UI blueprint concepts).

Modern agentic UI work follows five core philosophical principles:

1. **Constrained generation beats open generation.** Operate inside a defined design system. Treat the agent as an assembler: propose missing tokens explicitly; never let the AI invent ad-hoc magic values or hallucinate components.
2. **Transparency beats magic.** Show exactly what was done, what was skipped, and what needs human review.
3. **Validation beats trust.** Every generated UI must pass automated and human checks before shipping.
4. **Recovery beats perfection.** Every interface must support undo, rollback, and graceful failure.
5. **Progressive delegation beats full autonomy.** Start with token-level/component-level changes before attempting screen-level flows.

---

## 2. Operating Principles (Agentic Workflow)

These are the hard rules the agent must follow on every UI task.

### 2.1 Constrained Generation Only

The agent generates UI only from registered design tokens, approved components, documented motion presets, and layout patterns.

### 2.2 State Coverage Is Mandatory

Every component must explicitly handle 9 states:
`default`, `hover`, `focus-visible`, `active/pressed`, `disabled`, `loading`, `empty`, `error`, `success`. Missing states mean the UI is incomplete.

### 2.3 Transparent Reasoning

No silent decisions. Output must declare tokens used, states implemented, assumptions made, and areas flagged for review.

### 2.4 Validation Before Output

The agent must pass an internal quality gate checklist. If it cannot, it must return a partial result labeled `NEEDS_REVIEW`.

---

## 3. Design Language: Liquid Glass

### 3.1 Core Aesthetic

- **The "Calm and Confident" Rule:** Apple design is obvious, not fancy. Prioritize readability, spatial hierarchy, and clear native-feeling components over complex UI gimmicks.
- **Calm, spatial, layered, fluid, content-first.**
- Translucent, frosted surfaces that float above content.
- Soft blur, subtle edge lighting, gentle highlights.
- Restrained palette with one accent.

### 3.2 Visual Pillars

| Pillar   | Rule                                                                 |
| -------- | -------------------------------------------------------------------- |
| Depth    | Achieved with blur, translucency, and elevation — never with borders |
| Contrast | Sufficient for WCAG AA minimum, AAA for body text where feasible     |
| Color    | Neutral base + 1 accent + semantic states only                       |
| Motion   | Spring-driven, purposeful, dismissible                               |
| Density  | Generous spacing; one primary action per view                        |
| Texture  | Almost none — light noise allowed only on large backdrops            |

### 3.3 Implementation Notes

- **Prefer:** Native components over custom builds, system-first typography (SF Pro), `backdrop-filter: blur()`, CSS custom properties, responsive defaults.
- **Avoid:** Generic AI hallucinations, flat boxes with hard edges, heavy drop shadows on everything, neon/saturated colors, `z-index` above 100 without a documented layer system, hardcoded hex values.

---

## 4. Design Tokens (Machine-Readable Contract)

Tokens are the **only** source of styling truth. If a needed value isn't a token, propose a new one in the Agent Report.

### 4.1 Color Tokens

```text
color.surface.base
color.surface.glass.thin
color.surface.glass.regular
color.surface.glass.thick
color.surface.glass.ultraThick
color.text.primary / secondary / tertiary / onAccent
color.accent.default / hover / pressed
color.state.success / warning / danger / info
color.border.subtle / strong
color.focus.ring
```

### 4.2 Radius, Blur & Elevation

```text
radius.xs = 6 | radius.sm = 10 | radius.md = 14 | radius.lg = 20 | radius.xl = 28 | radius.pill = 9999
blur.thin = 8 | blur.regular = 16 | blur.thick = 28 | blur.ultraThick = 44
elevation.0 (flat) | elevation.1 (resting card) | elevation.2 (hovered card) | elevation.3 (floating panel) | elevation.4 (modal) | elevation.5 (toast)
```

### 4.3 Motion Tokens

```text
motion.duration.instant = 80ms | fast = 160ms | standard = 240ms | expressive = 360ms | entrance = 480ms
motion.spring.snappy = { stiffness: 420, damping: 32 }
motion.spring.smooth = { stiffness: 260, damping: 28 }
motion.spring.gentle = { stiffness: 180, damping: 24 }
motion.easing.standard = cubic-bezier(0.2, 0.0, 0.0, 1.0)
```

---

## 5. Component Contract

Every component the agent produces must explicitly or implicitly declare its contract:

```yaml
component: GlassCard
purpose: Floating translucent container for grouped content
tokens_used: [color.surface.glass.regular, blur.regular, radius.lg, elevation.2]
states: [default, hover, pressed, focus-visible, disabled, loading, error]
motion:
  enter: motion.spring.smooth + fade + scale(0.98 → 1)
  exit: motion.duration.fast fade
a11y:
  role: group
  focusable: false
  contrast_checked: true
  reduced_motion_fallback: fade only
responsive:
  breakpoints: [sm, md, lg, xl]
  behavior: stack vertically below md
```

---

## 6. Component Standards

- **Navigation:** Translucent, blurred surface. Adaptive to scroll. Active state clearly visible.
- **Cards:** Glass surface, rounded corners, soft shadow, backdrop blur.
- **Buttons:** Tactile press feedback (`scale: 0.98`), loading spinner integrated. All states styled.
- **Inputs:** Soft background, clear focus ring, inline validation.
- **Modals & Sheets:** Soft scale + fade + blur entrance. Trap focus while open.
- **Tabs:** Smooth indicator transition, keyboard navigation.
- **Lists & Tables:** Generous spacing, hover/selection states, virtualized when large.
- **Toasts:** Soft entrance from edge, auto-dismiss, pause-on-hover, undo action.

---

## 7. Motion System & Presets

Use motion only when it answers: _Where did this come from? What changed? Where should I look next? Did my action register?_

| Pattern            | Use Case               | Spec                                                  |
| ------------------ | ---------------------- | ----------------------------------------------------- |
| `lift`             | Hover interactive card | translateY(-2) + elevation.1→2, smooth spring         |
| `press`            | Active state           | scale(0.98), 80ms, snappy spring                      |
| `reveal`           | New content entering   | fade + translateY(8→0), 240ms standard easing         |
| `morph`            | State transformation   | shared layout transition, smooth spring               |
| `modal-emerge`     | Dialogs, sheets        | scale(0.96→1) + fade + backdrop blur ramp, expressive |
| `toast-glide`      | Notifications          | translateY + fade, gentle spring, auto-dismiss        |
| `skeleton-shimmer` | Loading                | low-amplitude opacity wave, 1.4s loop                 |

**Reduced Motion (`prefers-reduced-motion`):** Disable scale, translate, blur ramps. Keep opacity transitions ≤ 160ms. Replace springs with linear easing. Never disable focus/feedback animations entirely.

---

## 8. Layout, Hierarchy & Mobile-First

- **Spacing:** Generous spacing — prefer `space.6` and above between sections. Let white/dark space carry hierarchy.
- **Focus:** One primary action per view, maximum 3 levels of visual hierarchy.
- **Mobile-First:** Touch targets `≥ 44×44px`. Bottom sheets preferred over centered modals on mobile.
- **Layering Limit:** Never stack more than 3 translucent layers — readability collapses past that.

---

## 9. Accessibility & Performance Budget

### Accessibility

- **Contrast:** WCAG AA minimum; AAA for body text where reasonable. Contrast is checked against the _effective_ background behind glass, not the glass tint alone.
- **Keyboard & Touch:** Keyboard parity, semantic HTML, visible focus rings on every interactive element.
- If transparency reduces contrast below threshold, the agent must **increase surface opacity automatically**.

### Performance Budget (GPU Constraints)

- Max 2 backdrop blur layers per viewport.
- Blur radius `≤ 40px`.
- Animations: Prefer `transform` and `opacity` only. Avoid animating `filter` on large surfaces.

---

## 10. Refactor Workflow

When refactoring an existing UI, execute in this exact order:

1. **Audit:** Identify visual clutter, hardcoded values, missing states, and poor motion.
2. **Token Reconciliation:** Map all styles to tokens. Extract hardcoded colors/spacing to tokens.
3. **Build Primitives:** Standardize canonical components (Buttons, Inputs, Cards).
4. **Surface & Compose:** Apply Liquid Glass (translucency, blur, elevation). Rebuild screens using primitives.
5. **Standardize Motion:** Apply spring presets. Remove any motion failing the intent test.
6. **Validate:** Run the 7 validation gates.
7. **Report:** Output the Change Report.

---

## 11. Validation Gates (Pre-Output Quality Check)

Before any UI is considered "done", it must pass these gates:

1. **Design System Gate:** All colors, spacing, radii, blurs from tokens. No inline magic numbers.
2. **State Gate:** All 9 core states are present and styled.
3. **Accessibility Gate:** WCAG AA contrast, focus states visible, touch targets `≥ 44×44px`, reduced-motion fallback works.
4. **Responsiveness Gate:** Works across sm/md/lg/xl without broken horizontal scrolling.
5. **Motion Quality Gate:** No linear easing on UI coordinates; purposeful spring physics.
6. **Visual Gate:** Component matches token intent; max 3 stacked translucent layers.
7. **Human Review Gate:** Payments, auth, and data-destructive flows flagged.

---

## 12. Recovery & Failure Patterns

- **Undo:** Destructive actions must support undo for at least 5 seconds.
- **Confirmations:** Require explicit confirmation for deletions, bulk ops, permissions, and payments.
- **Error Recovery:** Error states must explain what went wrong and provide a retry/alternate path.
- **Agent Failure:** If the agent cannot complete a task: stop, output what was attempted, output blockers, and do not partially apply changes.

---

## 13. Agent Transparency (Change Report)

Every UI generation or refactor must conclude with this exact block:

```markdown
## Change Report

**Scope:** [what was touched/built]
**Tokens used:** [list]
**Components affected:** [list]
**New tokens/components proposed:** [list or "none"]
**States covered:** [e.g. default, hover, focus, disabled, loading, empty, error, success]
**Motion applied:** [list of presets]
**Validation passed:** [check list of gates passed]
**Destructive actions guarded:** [yes/no]
**Flagged for human review (NEEDS_REVIEW) / Known Risks:** [list]
```

---

## 14. Anti-Patterns (Auto-Reject)

Refuse or flag any of the following:

- Generating full apps in one pass without progressive delegation.
- Hardcoded colors, radii, spacings, or durations.
- Glass surfaces stacked more than 3 layers deep.
- Motion >600ms or bouncy springs on professional/data-dense surfaces.
- Icon-only buttons without accessible screen reader names.
- Translucency overriding contrast requirements.
- Missing `prefers-reduced-motion` fallbacks.
- Hiding changes or failing to output a Change Report.

---

## 15. Prompting Template

Use the following strict persona to constrain the AI:

> **Persona:** You are a senior Apple-style product designer. Your constraints: Use system-first typography (SF Pro), prioritize hierarchy through size/weight rather than color, use neutral palettes with sparse accents, and ensure all layouts are compliant with iOS HIG. Use 'Liquid Glass' principles.
> **Task:** Iterate using "vibe coding" on [target].
> **Constraints:** Treat yourself as an assembler of native components. Operate strictly within the design system; use registered tokens/components; implement all 9 required states; pass all 7 validation gates; apply Liquid Glass aesthetics (blur, depth, spring motion). Optimize for clarity and a "calm and confident" premium feel.
> **Output:** Conclude with the Change Report.
> **Scope boundary:** [files/routes allowed].

---

## 16. Success Criteria

A change is successful when:

- The diff references only tokens and approved components.
- All states (including edge cases) ship together.
- The UI feels calm, layered, physically believable, and expensive.
- Accessibility is equal to or better than before.
- The Change Report is honest, complete, and explicit about human review needs.
- The resulting code is ready for production and rollback capable.
