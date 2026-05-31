# Archive Matte Visual Redesign Spec
Date: 2026-05-31
Status: Draft (approved for spec writing)

## Summary
This document defines a full visual redesign for Amoura while preserving the emotional idea, story flow, interaction concept, experience structure, state flow, architecture boundaries, and the no-crop/no-stretch image philosophy. The new direction is called **Archive Matte**: a quiet, museum-print keepsake placed inside a dark archive room.

This spec is visual-only. No architecture changes or new systems are introduced.

## Constraints (must hold)
- No new frameworks or abstractions.
- RendererCore, SceneManager, and MotionSystem remain thin and non-executing.
- MotionSystem presets only (no ad-hoc timings).
- No-crop/no-stretch image policy remains.
- Restraint-first visual philosophy.

## Audit of Current Visual Weaknesses (evidence)
Observed in `src/styles.css`, `src/ui/BuilderUI.js`, `src/story/StoryView.js`, `src/scene/HeartGalleryPrototype.js`, `src/config/index.js`.

1. Palette and lighting read as template romance: deep purple/pink gradients, bright pink accents, glow-heavy text shadows, and bloom.
2. Typography feels ornamental and mismatched: Cinzel + Playfair + Google Sans with uppercase tracking and glow cues.
3. UI treatments feel SaaS-like: pill buttons, glossy shadows, blur/backdrop pills, and hover glows.
4. Envelope treatment is decorative: gold gradients, seal motif, sparkly symbols.
5. 3D scene hints at tech-demo polish: pink particles + colored directional lighting + bloom.
6. Builder hierarchy is conventional: two-column grid + headline/subtitle + paired CTA layout.

Why it feels generic: the combination of dark-romance gradients, pink glow, ornamental serif pairing, and pill CTAs signals "premium romance UI" rather than "museum-print keepsake."

## New Direction: Archive Matte
**Intent:** Recast the experience as a memory object. The space feels like a quiet archive room; artifacts are warm paper objects placed gently into a deep charcoal field.

**Key cues:**
- Deep charcoal room, warm paper artifacts.
- Editorial typography with generous breathing space.
- Minimal UI chrome; interactions feel like handling objects.
- Motion is nearly still, focused on opacity and subtle shifts.

**Avoid:** glossy romance gradients, glow-heavy accents, decorative seals, premium-SaaS CTAs, theatrical lighting, sparkly bloom.

## System Primitives

### Typography
- Primary serif (display + letter): Source Serif 4 or Cormorant Garamond, weight 400-600.
- UI sans (labels/buttons/meta): Inter or IBM Plex Sans, weight 400-600.
- Body line-height: 1.6 to 1.8.
- No fake luxury tracking; avoid excessive letter-spacing.

### Color Philosophy
- Room: deep charcoal / inked black (very low chroma).
- Artifacts: warm paper / muted bone; text ink is warm brown-black, not pure white.
- Accent: oxidized copper or dried rose, used sparingly.

### Spacing Rhythm
- Larger breathing gaps: 6 / 12 / 18 / 24 / 36 / 48 / 72.
- Content blocks feel placed, not stacked.

### Material Language
- Faint paper grain and soft edge shadowing.
- Hairline borders; no glossy bevels or bright highlights.

### Motion Language
- Nearly still. Use opacity and 2-6px translations only.
- MotionSystem presets only; no ad-hoc timings.
- Easing uses existing romantic/soft curves, but keep motion minimal.

### Lighting Language (3D)
- Soft, low-contrast key with gentle ambient.
- Minimal bloom, neutral warm tones.

### Interaction Language
- Hover: tiny opacity lift or 1px elevation, no glow.
- Focus: hairline outline + subtle paper-tone background shift.
- Feedback via text changes rather than animations.

### Image Presentation Language
- Museum-matte framing with generous margins.
- Letterbox inside frame when needed; never crop or stretch.
- Frame background is warm paper, not pure white.

## Screen and Experience Redesign

### Builder
**Layout:** single-column, centered narrow panel. The form itself is the artifact.

**Hierarchy:**
- Small label for product name.
- Single-line title.
- Subdued one-line guidance.

**Inputs:**
- Paper-toned panels with hairline borders.
- Labels are small and quiet; no heavy uppercase treatment.

**CTA hierarchy:**
- Primary: "Create keepsake" (text-forward button).
- Secondary: "Preview" (link-style, below the primary).

**Preview reveal:**
- Appears after inputs as a calm section.
- No persistent split view.

**Empty state:**
- Minimal copy: "Begin a memory" + 1-line guidance.

**Loading:**
- Single status line with subtle opacity pulse.
- No spinner or glow.

**Share state:**
- Link presented as labeled field on paper with a single copy action.
- "Open" is a quiet text link.

### Story / Envelope
- Envelope is a single warm-paper object with subtle fold lines.
- Replace wax seal with a tiny embossed dot or stitched mark.
- Background is a deep charcoal vignette with minimal center text.
- Letter is a large paper card with generous leading and editorial typography.

### Heart State (3D)
- Heart reads as a calm constellation, muted and low-contrast.
- No saturated pinks; particles are soft warm-neutral.
- Lighting is gentle and neutral; bloom barely perceptible.

### Heart to Gallery Transition
- The heart loosens into an archival spread.
- Transition is opacity-first; spatial movement is minimal.

### Focused Photo State
- Quiet emphasis: slight scale/opacity lift and gentle camera ease-in.
- Non-focused items dim softly, not dramatically.
- Frames remain museum-matte with warm paper border.

### Mobile Presentation
- Keep a single focal object on screen.
- Reduce scatter density and card count.
- Controls collapse into minimal text links with generous padding.

### Reduced Motion
- Static layouts with gentle crossfades only.
- No drift, no camera movement.

## Composition Rules
- One hero artifact per view. Secondary elements live at the edges.
- Strong outer margins; consistent matte framing ratio.
- Left-aligned text blocks; center alignment only for singular prompts.

## Tradeoffs
- Lower immediate "wow" than glossy romance UI; gains intimacy and credibility.
- Heavy whitespace can feel sparse on small screens; mitigate with larger base type and tighter gaps on mobile.
- Reduced motion feels subdued; acceptable for keepsake intent.

## Success Criteria
1. The experience reads as a quiet memory object, not a premium romance app.
2. Visual language is consistent across Builder, Story, and Gallery states.
3. No glossy, sparkly, or theatrical cues remain.
4. Typography is editorial and readable, without ornate tracking.
5. Motion is calm and minimal; no ad-hoc timings.
6. Images feel museum-matted, with no crop/no stretch preserved.
