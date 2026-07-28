import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mail, Linkedin, Github } from "lucide-react";
import {
  ABOUT,
  EDUCATION,
  SKILLS,
  WORK_EXPERIENCE,
  CONTACT_LINKS,
  ASCII_BANNER,
  HELP_HINT,
  AVAILABLE_COMMANDS,
} from "@/data/resumeData";
import TypewriterText from "./TypewriterText";
import AgentAtWork from "./AgentAtWork";

// ── Colour markup parser ───────────────────────────────────────
function parseColour(
  text: string,
  onCommand?: (cmd: string) => void,
): React.ReactNode[] {
  const combined =
    /\x1b\[cmd:(\w+)\]([\s\S]*?)\x1b\[\/cmd\]|\x1b\[(cyan|green|amber|bold)\]([\s\S]*?)\x1b\[\/\3\]/g;

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

  if (c === "") return "";

  return `zsh: command not found: ${cmd}`;
}

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
const COMMAND_CHIPS = ["about", "education", "skills", "experience", "resume"];

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [lines, scrollToBottom]);

  const focusInput = () => inputRef.current?.focus();

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
      e.preventDefault();
      const partial = input.toLowerCase();
      if (!partial) return;
      const match = AVAILABLE_COMMANDS.find((c) => c.startsWith(partial));
      if (match) setInput(match);
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
    <div className="terminal-window" onClick={focusInput}>
      {/* Title bar */}
      <div className="terminal-titlebar">
        <div className="flex gap-2">
          <span className="terminal-dot" style={{ background: "#ff5f57" }} />
          <span className="terminal-dot" style={{ background: "#febc2e" }} />
          <span className="terminal-dot" style={{ background: "#28c840" }} />
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
          <pre className="terminal-output">
            <TypewriterText
              content={parseColour(ASCII_BANNER, executeCommand)}
              speed={4}
              onComplete={() => setBannerTyped(true)}
            />
          </pre>
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
            <input
              ref={inputRef}
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

      {/* Command chips */}
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

      {/* Scanline overlay */}
      <div className="scanline-overlay" />
    </div>
  );
};

export default Terminal;
