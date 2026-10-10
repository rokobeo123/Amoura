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

---

# Archive Matte — Visual Tokens & Constraints Addendum
This addendum hardens the visual direction into enforceable tokens and numeric guardrails. These constraints are mandatory and are intended to prevent regression into premium romance, SaaS landing page, or WebGL tech-demo aesthetics.

## 1. Design tokens (required)

### Color tokens (hex)
- background.room: #0E0F10
- background.surface: #141311
- paper.base: #F3EEE6
- paper.warm: #E9DEC9
- paper.shadow: #CDBCA6
- text.primary: #2A231C
- text.secondary: #4C4237
- text.meta: #6C5F52
- border.hairline: #DED4C6
- accent.primary: #8C6E55
- accent.muted: #745746
- image.letterbox: #1C1815

### Minimum contrast expectations
- text.primary on paper.base: 7:1 or higher.
- text.secondary on paper.base: 4.5:1 or higher.
- text.meta on paper.base: 3:1 or higher.
- text.primary on background.room: 4.5:1 or higher.

### Forbidden hue tendencies
- No hues in 290–330 degrees (purple/magenta bias).
- No hues in 330–350 degrees (hot pink bias).
- No high-chroma reds or fuchsias (saturation > 40 in HSL terms).

### Glow restrictions
- No text shadow.
- No UI glow or outer glows.
- Bloom allowed only in 3D with constraints in Section 6.

### Never use (absolute)
- Bright pink.
- Magenta romance accents.
- Purple gradients.
- Glossy gold.
- Neon highlights.

## 2. Typography system (required)
All type is left-aligned unless noted. Serif is only for display and letter content. UI labels and buttons are sans only.

### Display
- Family: Source Serif 4 or Cormorant Garamond
- Size: 28–36px desktop, 22–28px mobile
- Line height: 1.2–1.3
- Weight: 500
- Letter spacing: 0 to -0.01em (never positive)
- Max line width: 22ch
- Alignment: left only

### Section
- Family: Inter or IBM Plex Sans
- Size: 18–22px
- Line height: 1.35–1.45
- Weight: 500
- Letter spacing: 0 to 0.01em
- Max line width: 32ch
- Alignment: left only

### Body
- Family: Inter or IBM Plex Sans
- Size: 15–17px
- Line height: 1.6–1.75
- Weight: 400
- Letter spacing: 0
- Max line width: 52–60ch
- Alignment: left only

### Meta
- Family: Inter or IBM Plex Sans
- Size: 12–13px
- Line height: 1.4–1.5
- Weight: 500
- Letter spacing: 0.02em (maximum)
- Max line width: 44ch
- Alignment: left only

### Letter-content
- Family: Source Serif 4 or Cormorant Garamond
- Size: 16–18px
- Line height: 1.7–1.9
- Weight: 400
- Letter spacing: 0
- Max line width: 56–60ch
- Alignment: left only

### Typography constraints (absolute)
- No uppercase luxury headings.
- No centered hero typography.
- No excessive serif ornamentation.
- Serif never used for buttons or labels.
- Avoid wide tracking; do not exceed 0.02em anywhere.

### Explicit guardrails
- Wedding invitation energy: disallow decorative caps, flourishes, or oversized serif displays.
- Perfume ad energy: disallow oversized high-contrast serif hero layouts or all-caps luxury spacing.
- Startup landing page energy: disallow hero headline + subhead + CTA stack.

## 3. Composition grammar (required)

### Required
- Object-first composition: one primary artifact per view.
- Editorial asymmetry: the hero artifact is offset 4–6% from center.
- Negative space priority: minimum 40% of viewport area must remain unfilled.
- Quiet information clusters: max 3 items per cluster, 16–24px internal gap.
- Staggered rhythm: alternate vertical gaps of 24px and 36px for stacked items.

### Forbidden
- Centered marketing hero blocks.
- Headline + subtitle + CTA stack.
- Dashboard grids.
- Equal visual weight distribution.
- SaaS split panels.
- Generic card layouts with repeated uniform tiles.

### Spacing rhythm
- Base unit: 6px.
- Primary gaps: 18 / 24 / 36 / 48 / 72.
- Outer margins: 8vw desktop, 6vw tablet, 5vw mobile.
- Content column width: 560–640px maximum.

### Alignment principles
- Left-aligned type blocks only.
- UI elements align to the same left axis as the primary artifact.

### Focal hierarchy
- One hero artifact (level 1).
- One supporting cluster (level 2).
- Everything else fades to level 3 with reduced contrast.

## 4. UI object language (required)

### Buttons
- Radius: 4–6px only.
- Border: 1px hairline (border.hairline).
- Fill: paper.warm or transparent; no solid dark fill.
- Shadow: single soft shadow only, max 0 8px 20px rgba(0,0,0,0.18).
- No pill shapes, no glossy bevels, no gradients.

### Inputs
- Radius: 4–6px.
- Border: 1px hairline.
- Background: paper.base.
- Focus: border uses accent.primary and a 1px outline (no glow).
- No inner shadows.

### Panels
- Matte, opaque, paper-toned only.
- No translucency, no blur, no glassmorphism.
- Border: hairline only.

### Dividers
- 1px hairline at 20–30% opacity of border.hairline.

### Hover states
- Opacity shift only: +0.04 to +0.06.
- Optional 1–2px lift only.
- No color shifts toward pink or purple.

### Focus states
- Hairline outline + subtle background lift (2–4% lightness increase).
- No glow, no animated rings.

## 5. Motion guardrails (required)
MotionSystem architecture remains unchanged. These are limits only.

- Max transition duration: 800ms (view-level), 240ms (micro-interactions).
- Max camera travel: 0.35 scene units per transition.
- Max scale amplification: 1.03.
- Max opacity jump per frame: 0.35.
- Max UI movement amplitude: 6px.
- Damping: critically damped feel; no overshoot or elastic curves.
- Easing language: calm, settle, gentle, soft (avoid "romantic" labels).

Principle: atmosphere over motion, stillness over spectacle.

## 6. 3D scene numeric constraints (required)

- Max particle count: 420 desktop, 260 mobile.
- Particle opacity range: 0.35–0.7.
- Bloom max strength: 0.35.
- Bloom radius: 0.25 max.
- Bloom threshold floor: 0.85.
- Camera FOV: 32–40 degrees.
- Max focus zoom: 1.05.
- Drift amplitude: 0.018 scene units.
- Drift speed: 0.08–0.16 Hz.
- Lighting intensity range: ambient 0.35–0.55, key 0.6–0.85.
- Color temperature guidance: warm neutral 3400–4200K equivalent.

Explicit prohibitions:
- No sparkle fields.
- No glowing romance particles.
- No neon bloom.
- No cinematic spotlighting.

## 7. Museum matte image framing (required)

- Frame margin (sides): 10–12% of frame width.
- Frame margin (top): 8–10% of frame height.
- Frame margin (bottom): 14–16% of frame height.
- Matte thickness minimum: 9% of shortest edge.
- Matte thickness maximum: 16% of shortest edge.
- Inner image never exceeds 72% of frame width or 68% of frame height.
- Letterbox: use image.letterbox when aspect exceeds clamp; keep centered.
- Vignette max opacity: 0.06 (optional, edges only).
- Matte color must be within 6% lightness of paper.warm.

Absolute rules:
- Never crop.
- Never stretch.
- Avoid boxed slideshow feeling by preserving bottom-weighted matte.
- The image must feel preserved, not decorated.

## 8. Texture / material rules (required)

- Paper grain opacity cap: 0.06.
- Noise scale: 240–360px.
- Material roughness feel: matte, 0.8–0.95 roughness equivalent.
- Shadow softness: blur radius 16–28px, opacity <= 0.12.
- Allowed texture locations: envelope, letter, photo frames only.

Disallow:
- Instagram filter looks.
- Noisy overlays.
- Faux vintage gimmicks (scratches, dust, heavy vignettes).

## 9. Explicit ban list (absolute)
- Purple romance gradients.
- Saturated pink.
- Glossy UI.
- Glassmorphism.
- Glow text.
- Wax seals.
- Gold romance motifs.
- Sparkles.
- Cinematic bloom.
- Centered luxury hero.
- Startup CTA hierarchy.
- Perfume-ad typography.
- Wedding invitation styling.
- Dribbble bait polish.

## 10. Implementation confidence review

### Remaining ambiguity
- Exact mapping of tokens to CSS variables and Three.js material values is still required.
- Scene unit scale must be confirmed to ensure camera travel and drift caps are meaningful.

### Regression risks
- Serif usage creeping into UI controls.
- Accents shifting into pink or purple due to asset substitutions.
- Motion timing changes without respecting max durations.

### Confidence score
- 92/100 with this addendum enforced.

### Enforceability statement
With explicit tokens, numeric constraints, and hard bans, the redesign is now enforceable and materially protected from regression into romance-template, SaaS, or tech-demo aesthetics.
