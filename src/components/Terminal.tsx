import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mail, Linkedin, Github, Terminal as TerminalIcon } from "lucide-react";
import {
  ABOUT,
  EDUCATION,
  SKILLS,
  WORK_EXPERIENCE,
  PROJECTS,
  CONTACT_LINKS,
  HELP_HINT,
  AVAILABLE_COMMANDS,
} from "@/data/resumeData";
import TypewriterText from "./TypewriterText";
import AgentAtWork from "./AgentAtWork";
import ParticleBackground from "./ParticleBackground";
import AnimatedBanner from "./AnimatedBanner";
import PixelWalkers from "./PixelWalkers";

// ── Colour markup parser ───────────────────────────────────────
function parseColour(
  text: string,
  onCommand?: (cmd: string) => void,
): React.ReactNode[] {
  const combined =
    // eslint-disable-next-line no-control-regex -- ESC is the terminal's intentional colour/command markup delimiter.
    /\x1b\[cmd:(\w+)\]([\s\S]*?)\x1b\[\/cmd\]|\x1b\[(cyan|green|amber|bold)\]([\s\S]*?)\x1b\[\/\3\]|\x1b\[url:([^\]]+)\]([\s\S]*?)\x1b\[\/url\]/g;

  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));

    if (match[1]) {
      const cmdName = match[1];
      const label = match[2];
      parts.push(
        <span
          key={key++}
          className="terminal-clickable-cmd"
          onClick={(e) => {
            e.stopPropagation();
            onCommand?.(cmdName);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommand?.(cmdName);
          }}
        >
          {label}
        </span>,
      );
    } else if (match[5]) {
      const href = match[5];
      const label = match[6];
      parts.push(
        <a
          key={key++}
          href={href}
          className="terminal-clickable-cmd"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>,
      );
    } else {
      const colour = match[3];
      const inner = match[4];
      const style: React.CSSProperties =
        colour === "cyan"
          ? { color: "#00fff5" }
          : colour === "green"
            ? { color: "#39ff14" }
            : colour === "amber"
              ? { color: "#ffbf00" }
              : { fontWeight: 700 };
      parts.push(
        <span key={key++} style={style}>
          {inner}
        </span>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ── Command handlers ───────────────────────────────────────────
function runCommand(cmd: string): string {
  const c = cmd.trim().toLowerCase();

  if (c === "help") {
    return `
\x1b[green]Available commands:\x1b[/green]

  \x1b[cmd:help]help\x1b[/cmd]        Show this help message
  \x1b[cmd:about]about\x1b[/cmd]       Who I am
  \x1b[cmd:education]education\x1b[/cmd]   My academic background
  \x1b[cmd:skills]skills\x1b[/cmd]      Technical skills by category
  \x1b[cmd:experience]experience\x1b[/cmd]  Work history
  \x1b[cmd:projects]projects\x1b[/cmd]    Selected work
  \x1b[cmd:resume]resume\x1b[/cmd]     Download resume (PDF)
  \x1b[cmd:clear]clear\x1b[/cmd]       Clear command history

\x1b[green]Reach me:\x1b[/green] use the Email, LinkedIn, or GitHub icons in the header.`;
  }

  if (c === "resume") {
    return `
\x1b[green]▸ Resume\x1b[/green]

  \x1b[cmd:resume]Download resume (PDF)\x1b[/cmd]

  Opening resume...`;
  }

  if (c === "about") {
    return `\n\x1b[green]▸ About Me\x1b[/green]\n\n${ABOUT}`;
  }

  if (c === "education") {
    let out = `\n\x1b[green]▸ Education\x1b[/green]\n`;
    EDUCATION.forEach((e) => {
      out += `\n  \x1b[amber]${e.school}\x1b[/amber]\n`;
      out += `  ${e.degree}\n`;
      out += `  \x1b[cyan]${e.year}\x1b[/cyan] · ${e.location}\n`;
    });
    return out;
  }

  if (c === "skills") {
    let out = `\n\x1b[green]▸ Skills\x1b[/green]\n`;
    Object.entries(SKILLS).forEach(([cat, items]) => {
      out += `\n  \x1b[amber]${cat}\x1b[/amber]\n`;
      out += `  ${items.join(" · ")}\n`;
    });
    return out;
  }

  if (c === "experience") {
    let out = `\n\x1b[green]▸ Work Experience\x1b[/green]\n`;
    WORK_EXPERIENCE.forEach((w) => {
      out += `\n  \x1b[amber]${w.company}\x1b[/amber] — ${w.role}\n`;
      out += `  \x1b[cyan]${w.duration}\x1b[/cyan] · ${w.location}\n`;
      out += `  ${w.description}\n`;
    });
    return out;
  }

  if (c === "projects") {
    let out = `\n\x1b[green]▸ Projects\x1b[/green]\n`;
    PROJECTS.forEach((p) => {
      out += `\n  \x1b[amber]${p.name}\x1b[/amber]\n`;
      out += `  ${p.description}\n`;
      out += `  \x1b[url:${p.link}]${p.label}\x1b[/url]\n`;
    });
    return out;
  }

  if (c === "") return "";

  return `zsh: command not found: ${cmd}`;
}

// Exposed for the command/parser test contract without changing the
// default Terminal export.
// eslint-disable-next-line react-refresh/only-export-components -- pure helpers exported for unit tests, not components.
export { parseColour, runCommand };

// ── Line type ──────────────────────────────────────────────────
// Command input + output only. The ASCII banner, contact icon row,
// and "Type help..." hint are persistent header chrome and are not
// part of the lines buffer — `clear` only wipes this array.
interface Line {
  id: number;
  type: "input" | "output";
  content: string;
  typing?: boolean;
}

// The window is hidden with CSS (`hidden`), never unmounted, so the session
// buffer, history, typed input and sprite animation survive close/minimize.
type WindowMode = "open" | "closed" | "minimized";

// ── Placeholder suggestions ────────────────────────────────────
const SUGGESTIONS = ["about", "education", "skills", "experience", "resume", "help"];

function useCyclingSuggestion(active: boolean) {
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!active) return;
    const word = SUGGESTIONS[index];

    if (!deleting) {
      if (charIndex < word.length) {
        const t = setTimeout(() => setCharIndex((c) => c + 1), 80);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setDeleting(true), 1500);
        return () => clearTimeout(t);
      }
    } else {
      if (charIndex > 0) {
        const t = setTimeout(() => setCharIndex((c) => c - 1), 40);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setIndex((i) => (i + 1) % SUGGESTIONS.length);
      }
    }
  }, [active, index, charIndex, deleting]);

  if (!active) return "";
  return SUGGESTIONS[index].slice(0, charIndex);
}

// ── Terminal component ─────────────────────────────────────────
const COMMAND_CHIPS = ["about", "education", "skills", "experience", "projects", "resume"];

// Derive the contact label union from the data file so the icon map
// is type-checked against the single source of truth. A misspelled
// or missing key becomes a compile-time error instead of an `as`
// cast that silently returns `undefined` at runtime. The value type
// is taken from `typeof Mail` because `lucide-react` does not export
// the `LucideIcon` type alias — but every icon in the package has
// the same component shape, so a single concrete icon stands in.
type ContactLabel = (typeof CONTACT_LINKS)[number]["label"];
type LucideIcon = typeof Mail;

const ICON_MAP = {
  Email: Mail,
  LinkedIn: Linkedin,
  GitHub: Github,
} satisfies Record<ContactLabel, LucideIcon>;

const Terminal: React.FC = () => {
  // Header chrome (banner, contact icons, Type-help hint) is rendered
  // once at the top of the terminal body and is NOT part of `lines`.
  // `clear` therefore only wipes this buffer; the chrome never
  // remounts and never re-animates.
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [typingLineId, setTypingLineId] = useState<number | null>(null);
  const [bannerTyped, setBannerTyped] = useState(false);
  // The hint is the last element of the persistent header to finish
  // typing (banner types → icons fade in → hint types). Gating all
  // command entry points on `hintTyped` reproduces the prior
  // `typingLineId = 0` lock for the full header animation. The icon
  // row uses a 0.5s CSS fade — much shorter than the hint — so waiting
  // on the hint covers it as well.
  const [hintTyped, setHintTyped] = useState(false);
  const [windowMode, setWindowMode] = useState<WindowMode>("open");
  const [isMaximized, setIsMaximized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasHiddenRef = useRef(false);
  const idCounter = useRef(0);

  const isOpen = windowMode === "open";

  const scrollToBottom = useCallback(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView?.({
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, []);

  useEffect(scrollToBottom, [lines, scrollToBottom]);

  // The persistent header grows after mount (banner → contacts → hint). On
  // short phones/landscape that growth can push the live prompt below the
  // terminal body's fold. Once the header has settled, keep the command line
  // in view; on tall screens this is a no-op because the body does not scroll.
  useEffect(() => {
    if (hintTyped) scrollToBottom();
  }, [hintTyped, scrollToBottom]);

  // Move focus with the window: to the launcher when the terminal is put
  // away, and back to the command line when it is reopened. The terminal
  // itself stays mounted so the prompt value and output history are intact.
  useEffect(() => {
    if (!isOpen) {
      wasHiddenRef.current = true;
      launcherRef.current?.focus();
      return;
    }
    if (wasHiddenRef.current) {
      wasHiddenRef.current = false;
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const focusInput = () => inputRef.current?.focus();

  // Clicking the terminal chrome focuses the prompt, but never steals focus
  // from a real control (window buttons, chips, links, command chips).
  const handleWindowClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        'button, a, input, textarea, select, summary, label, [role="button"], [role="link"], [contenteditable="true"]',
      )
    ) {
      return;
    }
    focusInput();
  };

  const suggestion = useCyclingSuggestion(!hasInteracted);

  const handleTypewriterComplete = useCallback((lineId: number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, typing: false } : l))
    );
    // Only release the typing lock if it still references *this* line.
    // A stale completion (e.g. an output line whose typewriter finally
    // resolves after a newer output has already been started) must
    // not wipe the lock the user is now waiting on.
    setTypingLineId((current) => (current === lineId ? null : current));
  }, []);

  const executeCommand = useCallback((cmd: string) => {
    // Lock every command entry point — the input form, the bottom
    // chips, AND any clickable command chip in the header (e.g. the
    // `help` link inside the partially-typed hint) — until the full
    // persistent header has finished its initial animation.
    if (!hintTyped) return;

    const trimmed = cmd.trim();
    setHasInteracted(true);

    if (trimmed.toLowerCase() === "resume") {
      const a = document.createElement("a");
      a.href = "/resume.pdf";
      a.download = "Neel_Panging_Resume.pdf";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    if (trimmed === "clear") {
      // Header chrome is persistent outside `lines`, so a clear is
      // just an empty buffer. No remount, no re-animation.
      setLines([]);
      setHistory((h) => [...h, trimmed]);
      setHistIdx(-1);
      setTypingLineId(null);
      return;
    }

    const inputLine: Line = { id: idCounter.current++, type: "input", content: trimmed };
    const newLines: Line[] = [inputLine];

    const output = runCommand(trimmed);
    let outputLineId: number | null = null;
    if (output) {
      outputLineId = idCounter.current++;
      newLines.push({ id: outputLineId, type: "output", content: output, typing: true });
    }

    setLines((prev) => [...prev, ...newLines]);
    if (outputLineId !== null) setTypingLineId(outputLineId);
    if (trimmed) setHistory((h) => [...h, trimmed]);
    setHistIdx(-1);
  }, [hintTyped]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Block until the persistent header has finished its initial
    // animation AND any in-flight output typewriter has resolved.
    // Without the header guard, a user could submit (or chip-click)
    // a command before the help hint has finished typing.
    if (typingLineId !== null || !hintTyped) return;
    executeCommand(input);
    setInput("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!hasInteracted) setHasInteracted(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      // Shift+Tab always navigates backwards. Forward Tab completes only
      // when it adds information (an empty or already-complete prompt falls
      // through), so repeated Tab can leave the input instead of trapping
      // keyboard focus here forever.
      if (e.shiftKey) return;

      const partial = input.trim().toLowerCase();
      const match = partial
        ? AVAILABLE_COMMANDS.find((c) => c.startsWith(partial))
        : undefined;
      if (!match || match.toLowerCase() === partial) return;

      e.preventDefault();
      setInput(match);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next]);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx === -1) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(next);
        setInput(history[next]);
      }
    }
  };

  return (
    <>
      <div
        className={`terminal-window${isMaximized ? " terminal-window--maximized" : ""}`}
        hidden={!isOpen}
        onClick={handleWindowClick}
      >
        {/* Particle backdrop — clipped to the terminal frame by the
            window's overflow: hidden, layered behind all content. */}
        <ParticleBackground />

        {/* Title bar */}
        <div className="terminal-titlebar">
          <div
            className="terminal-window-controls"
            role="group"
            aria-label="Terminal window controls"
          >
            <button
              type="button"
              className="terminal-window-control terminal-window-control--close"
              aria-label="Close terminal"
              title="Close terminal"
              onClick={() => setWindowMode("closed")}
            >
              <span className="terminal-dot" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="terminal-window-control terminal-window-control--minimize"
              aria-label="Minimize terminal"
              title="Minimize terminal"
              onClick={() => setWindowMode("minimized")}
            >
              <span className="terminal-dot" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="terminal-window-control terminal-window-control--maximize"
              aria-label={isMaximized ? "Restore terminal" : "Maximize terminal"}
              aria-pressed={isMaximized}
              title={isMaximized ? "Restore terminal" : "Maximize terminal"}
              onClick={() => setIsMaximized((maximized) => !maximized)}
            >
              <span className="terminal-dot" aria-hidden="true" />
            </button>
          </div>
          <div className="terminal-title-group">
            <span className="terminal-title">neel@portfolio ~ % zsh</span>
            <div className="terminal-agent-slot">
              <AgentAtWork />
            </div>
          </div>
          <div className="terminal-titlebar-spacer" aria-hidden="true" />
        </div>

        {/* Terminal body */}
        <div className="terminal-body">
          {/* Persistent header chrome — mounts once, never re-mounted by
              `clear`. Order is: ASCII identity banner → contact icon row
              → "Type help..." hint. The contact nav and its links stop
              click propagation so they don't steal focus from the
              command input (the terminal-window below focuses on any
              bubbled click). */}
          <div className="terminal-line">
            <AnimatedBanner onComplete={() => setBannerTyped(true)} />
          </div>
          {bannerTyped && (
            <nav
              className="terminal-header-links"
              aria-label="Contact"
              onClick={(e) => e.stopPropagation()}
            >
              {CONTACT_LINKS.map((link) => {
                const Icon = ICON_MAP[link.label];
                const isExternal = link.link.startsWith("http");
                return (
                  <a
                    key={link.label}
                    href={link.link}
                    className="terminal-header-link"
                    aria-label={`${link.label}: ${link.value}`}
                    title={link.value}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                  </a>
                );
              })}
            </nav>
          )}
          {bannerTyped && (
            <div className="terminal-line">
              <pre className="terminal-output">
                <TypewriterText
                  content={parseColour(HELP_HINT, executeCommand)}
                  speed={8}
                  onComplete={() => setHintTyped(true)}
                />
              </pre>
            </div>
          )}

          {/* Command + output buffer — wiped by `clear`. */}
          {lines.map((line) => (
            <div key={line.id} className="terminal-line">
              {line.type === "input" ? (
                <div>
                  <span className="terminal-prompt">neel@portfolio</span>
                  <span style={{ color: "#00fff5" }}>:</span>
                  <span style={{ color: "#39ff14" }}>~</span>
                  <span style={{ color: "#00fff5" }}>$ </span>
                  <span>{line.content}</span>
                </div>
              ) : (
                <pre className="terminal-output">
                  {line.typing ? (
                    <TypewriterText
                      content={parseColour(line.content, executeCommand)}
                      speed={8}
                      onComplete={() => handleTypewriterComplete(line.id)}
                    />
                  ) : (
                    parseColour(line.content, executeCommand)
                  )}
                </pre>
              )}
            </div>
          ))}

          {/* Active prompt */}
          <form onSubmit={handleSubmit} className="terminal-input-line">
            <span className="terminal-prompt">neel@portfolio</span>
            <span style={{ color: "#00fff5" }}>:</span>
            <span style={{ color: "#39ff14" }}>~</span>
            <span style={{ color: "#00fff5" }}>$&nbsp;</span>
            <div className="terminal-input-wrapper">
              <label htmlFor="terminal-command-input" className="sr-only">
                Terminal command
              </label>
              <input
                ref={inputRef}
                id="terminal-command-input"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="terminal-input"
                autoFocus
                spellCheck={false}
                autoComplete="on"
              />
              {!hasInteracted && !input && suggestion && (
                <span className="terminal-suggestion">{suggestion}</span>
              )}
            </div>
          </form>
          <div ref={bottomRef} />
        </div>

        {/* Bottom dock: the walker lane floats above the chip bar, so wrapping
            chips (phones) never collide with sprites. PixelWalkers reserves
            matching clearance inside the scrollable body. */}
        <div className="terminal-bottom-dock">
          <PixelWalkers />
          <div className="terminal-chips">
            {COMMAND_CHIPS.map((cmd) => (
              <button
                key={cmd}
                className="terminal-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typingLineId !== null || !hintTyped) return;
                  executeCommand(cmd);
                }}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Scanline overlay */}
        <div className="scanline-overlay" />
      </div>

      {/* Launcher shown after Close or Minimize. The terminal above stays
          mounted (and hidden) so its buffer, history, input and sprites are
          all preserved exactly as the user left them. */}
      {!isOpen && (
        <button
          ref={launcherRef}
          type="button"
          className="terminal-launcher"
          aria-label="Open terminal"
          title="Open terminal"
          onClick={() => setWindowMode("open")}
        >
          <TerminalIcon size={16} strokeWidth={2} aria-hidden="true" />
          <span className="terminal-launcher-label">Terminal</span>
        </button>
      )}
    </>
  );
};

export default Terminal;
