import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ABOUT,
  EDUCATION,
  SKILLS,
  WORK_EXPERIENCE,
  CONTACT,
  ASCII_BANNER,
  AVAILABLE_COMMANDS,
} from "@/data/resumeData";
import TypewriterText from "./TypewriterText";

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
  \x1b[cmd:contact]contact\x1b[/cmd]     How to reach me
  \x1b[cmd:resume]resume\x1b[/cmd]     Download resume (PDF)
  \x1b[cmd:clear]clear\x1b[/cmd]       Clear the terminal`;
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

  if (c === "contact") {
    let out = `\n\x1b[green]▸ Contact\x1b[/green]\n`;
    CONTACT.forEach((ct) => {
      out += `\n  \x1b[cyan]${ct.label}\x1b[/cyan]  ${ct.value}`;
    });
    return out + "\n";
  }

  if (c === "") return "";

  return `zsh: command not found: ${cmd}`;
}

// ── Line type ──────────────────────────────────────────────────
interface Line {
  id: number;
  type: "input" | "output" | "banner";
  content: string;
  typing?: boolean;
}

// ── Placeholder suggestions ────────────────────────────────────
const SUGGESTIONS = ["about", "education", "skills", "experience", "contact", "resume", "help"];

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
const COMMAND_CHIPS = ["about", "education", "skills", "experience", "contact", "resume"];

const Terminal: React.FC = () => {
  const [lines, setLines] = useState<Line[]>([
    { id: 0, type: "banner", content: ASCII_BANNER, typing: true },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [typingLineId, setTypingLineId] = useState<number | null>(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(1);

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
    setTypingLineId(null);
  }, []);

  const executeCommand = useCallback((cmd: string) => {
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
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typingLineId !== null) return; // wait for current animation
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
        <span className="terminal-title">neel@portfolio ~ % zsh</span>
        <div className="w-14" />
      </div>

      {/* Terminal body */}
      <div className="terminal-body">
        {lines.map((line) => (
          <div key={line.id} className="terminal-line">
            {line.type === "input" && (
              <div>
                <span className="terminal-prompt">neel@portfolio</span>
                <span style={{ color: "#00fff5" }}>:</span>
                <span style={{ color: "#39ff14" }}>~</span>
                <span style={{ color: "#00fff5" }}>$ </span>
                <span>{line.content}</span>
              </div>
            )}
            {(line.type === "output" || line.type === "banner") && (
              <pre className="terminal-output">
                {line.typing ? (
                  <TypewriterText
                    content={parseColour(line.content, executeCommand)}
                    speed={line.type === "banner" ? 4 : 8}
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
          <span style={{ color: "#00fff5" }}>$ </span>
          <div className="terminal-input-wrapper">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="terminal-input"
              autoFocus
              spellCheck={false}
              autoComplete="off"
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
              if (typingLineId !== null) return;
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
