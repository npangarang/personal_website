# Neel | Terminal Portfolio

Interactive terminal-style portfolio — Data Scientist, ML Engineer, and Builder.

## Stack

- Vite
- TypeScript
- React
- shadcn/ui
- Tailwind CSS

## Local development

```sh
npm i
npm run dev
```

Dev server runs at http://localhost:8080

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

## Art sources

- Trainer overworld sprite sheets (`public/sprites/brendan.png`, `may.png`,
  `hiker.png`, `lass.png`, `picnicker.png`, `sailor.png`) are reconstructed from
  the [pret/pokeemerald](https://github.com/pret/pokeemerald) decompilation
  project, pinned at commit
  [`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`](https://github.com/pret/pokeemerald/commit/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881).
  Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc. They are used here as
  non-commercial fan art on a personal site.
- Mario and Goomba (`public/sprites/mario.png`, `public/sprites/goomba.png`) are
  hand-drawn, SMB1-inspired 16×16 pixel art generated locally by
  `scripts/generate_mario_sprites.py`. Mario © Nintendo; used as non-commercial
  fan art on this personal site. The upside-down Goomba is the normal sprite
  flipped by the renderer, not a separate asset.
