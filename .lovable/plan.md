

# Neel's Terminal Portfolio 🖥️

A single-page personal website styled as an interactive zsh terminal where visitors can explore your resume by typing commands.

## Terminal Interface
- Full-screen terminal window with a dark cyberpunk/hacker aesthetic (dark background, neon green/cyan/amber text)
- Realistic terminal chrome: title bar with fake window controls (red/yellow/green dots), terminal name ("neel@portfolio ~ % zsh")
- Blinking cursor, typing animation effects, and subtle scanline/CRT glow effects for that cyber feel
- Monospace font throughout (e.g., JetBrains Mono or Fira Code)

## Interactive Commands
Users type commands to explore your info, just like a real terminal:
- `help` — Lists all available commands
- `about` — Displays your bio/intro
- `education` — Shows your degrees (Georgia Tech MS, UT Austin BS)
- `skills` — Displays your technical skills organized by category
- `experience` — Lists your work history with roles, durations, and descriptions
- `contact` — Shows links (LinkedIn, GitHub, email, etc.)
- `clear` — Clears the terminal screen

## Styling & Effects
- Color-coded output: command names in cyan, headers in bright green, highlights in amber/orange
- ASCII art banner on initial load (your name in large ASCII text)
- Smooth scroll as output grows
- Tab autocomplete for commands
- Command history with up/down arrow keys
- Error messages for unknown commands ("zsh: command not found: ...")

## Data
All your resume data (about, education, skills, work experience) will be hardcoded from the content you provided — no backend needed.

