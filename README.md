# Cloud Tao · 云上道观

An original bilingual, interactive pixel-and-ink Taoist sanctuary built with React, TypeScript, Vite, Phaser 3, and i18next.

## Run locally

```bash
npm install
npm run dev
```

Open the address shown by Vite. Use WASD or arrow keys, click/tap a destination, or use the mobile joystick. Approach a building and press `E` to enter.

## Quality checks

```bash
npm test
npm run build
```

Phase 1 uses original procedural placeholder art. It is intentionally modular so production sprites, tilemaps, ambient audio, and feature scenes can replace the placeholders without changing navigation logic.

## Implemented experience

- Explorable Phaser world with keyboard, click-to-move, mobile joystick, collisions, eight destinations, and three secrets
- Chinese/English UI with saved language preference
- Complete 64-hexagram King Wen index, local oracle drawing, reflection results, XP, and downloadable PNG cards
- 5/10/15-minute meditation timer with breathing guide and local practice history
- Six-form Tai Chi sequence controller with pause, navigation, speed controls, XP, and an explicit placeholder-motion notice
- Local-only wish lanterns and privacy note
- Wisdom library and book showcase; the Amazon button intentionally remains disabled until a real URL is configured
- Procedural ambience, reduced-motion mode, local progress, responsive UI, and Cloudflare Pages headers/routes

No account, analytics, personal-data collection, paid API, or database is used in this version.
