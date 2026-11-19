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

- Trainer overworld sprite sheets (`public/sprites/red.png`, `blue.png`,
  `prof_oak.png`, `giovanni.png`, `lorelei.png`, `rocket_m.png`) cover the Kanto
  Pokémon FireRed/LeafGreen cast: Red, Blue, Professor Oak, Giovanni, Lorelei,
  and the male Team Rocket grunt. They come from the
  [pret/pokefirered](https://github.com/pret/pokefirered) decompilation project,
  pinned at commit
  [`ce6406d8c2eaf46d543c8a2606de0c3cb1951982`](https://github.com/pret/pokefirered/commit/ce6406d8c2eaf46d543c8a2606de0c3cb1951982).
  They are reformatted here as 144×32 RGBA walk strips of nine 16×32 frames.
  Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc.
- Mario and Goomba (`public/sprites/mario.png`, `public/sprites/goomba.png`) are
  original NES *Super Mario Bros.* frames — actual game rips from the
  [Super Mario Wiki](https://www.mariowiki.com) file pages
  ([Mario walking](https://www.mariowiki.com/File:SMB_NES_Mario_Walking_Sprite.gif),
  [Mario jumping](https://www.mariowiki.com/File:SMB_Super_Mario_Jumping.png),
  [Goomba](https://www.mariowiki.com/File:SMB_Goomba_Sprite.gif),
  [squashed Goomba](https://www.mariowiki.com/File:SMB_Dead_Goomba.png)) — not
  hand-drawn or inspired re-creations. Mario uses 16×32 frames: three walk
  frames plus a jump frame; Goomba uses 16×16 frames: two walk frames plus the
  classic squashed frame. Mario/Goomba © Nintendo.
- All sprites are used as non-commercial fan art on a personal site.
  `public/sprites/sources.json` is the machine-readable manifest of pinned
  sources, original SHA-256 hashes, and each sheet's frame layout.
