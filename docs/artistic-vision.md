# Amoura — artistic vision

## Thesis

Amoura should feel like opening a private archive at dusk: tactile paper, warm metal, and a quiet celestial room built around the memories inside it. The experience is not a generic romantic dashboard; it is a small digital keepsake with the restraint of a gallery invitation and the intimacy of a handwritten note.

## Visual language

- **Palette:** ink blue-black, parchment, oxidized rose, and antique brass. Color is concentrated at moments of meaning rather than spread across every surface.
- **Typography:** Cormorant Garamond carries the emotional voice; Plus Jakarta Sans handles controls and metadata with modern clarity; a small uppercase sans label system gives the interface an editorial, archival quality.
- **Surfaces:** translucent ink glass for tools, warm paper for the letter, and fine grain/noise instead of loud gradients. Shadows are long and soft, like objects lit by a single room lamp.
- **Composition:** asymmetric editorial spacing, generous negative space, and a thin vertical index line. The builder reads as a keepsake workstation, not a form card.
- **Motion:** deliberate and tactile. The seal yields with a tiny burst, the letter rises before the scene changes, particles breathe rather than vibrate, and transitions use long ease curves.

## Interaction decisions

1. Keep the emotional order intact: envelope and seal, letter, heart, photo inspection, music, and sharing.
2. Make the first screen feel authored: an indexed title, a short invitation, and a live paper preview.
3. Keep actions quiet but unmistakable. Primary actions use brass/rose ink contrast rather than a loud gradient button.
4. Preserve natural photo dimensions in every gallery card. The image is letterboxed inside a proportionally sized keepsake frame; no crop or stretch is acceptable.
5. Treat URL payloads as sacred infrastructure. `src/share/shareData.js` remains unchanged.

## Performance principles

- Keep the existing dependency footprint.
- Prefer one-time generated BufferGeometry and shader uniforms over per-frame allocations.
- Use adaptive pixel ratio and restrained particle counts so the experience remains comfortable on mobile.
- Dispose Three.js resources whenever a preview is replaced.
- Respect reduced-motion preferences in the CSS layer.
