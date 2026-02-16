import React, { useState, useEffect } from "react";

interface TypewriterTextProps {
  content: React.ReactNode[];
  speed?: number;
  onComplete?: () => void;
}

/**
 * Renders pre-parsed React nodes with a typewriter effect.
 * Flattens all text content, reveals char-by-char, preserving markup.
 */
const TypewriterText: React.FC<TypewriterTextProps> = ({
  content,
  speed = 8,
  onComplete,
}) => {
  const [visibleChars, setVisibleChars] = useState(0);
  const totalChars = React.useMemo(() => countChars(content), [content]);

  useEffect(() => {
    if (visibleChars >= totalChars) {
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => {
      // Reveal multiple chars per tick for speed
      setVisibleChars((v) => Math.min(v + 3, totalChars));
    }, speed);
    return () => clearTimeout(timer);
  }, [visibleChars, totalChars, speed, onComplete]);

  return <>{renderWithLimit(content, visibleChars)}</>;
};

function countChars(nodes: React.ReactNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (typeof node === "string") {
      count += node.length;
    } else if (React.isValidElement(node)) {
      const children = node.props.children;
      if (typeof children === "string") {
        count += children.length;
      } else if (Array.isArray(children)) {
        count += countChars(children);
      }
    }
  }
  return count;
}

function renderWithLimit(
  nodes: React.ReactNode[],
  limit: number,
): React.ReactNode[] {
  let remaining = limit;
  const result: React.ReactNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    if (remaining <= 0) break;
    const node = nodes[i];

    if (typeof node === "string") {
      const slice = node.slice(0, remaining);
      result.push(slice);
      remaining -= slice.length;
    } else if (React.isValidElement(node)) {
      const children = node.props.children;
      if (typeof children === "string") {
        const slice = children.slice(0, remaining);
        result.push(React.cloneElement(node, { ...node.props, key: node.key ?? i }, slice));
        remaining -= slice.length;
      } else if (Array.isArray(children)) {
        const inner = renderWithLimit(children, remaining);
        const innerCount = countRendered(inner);
        result.push(React.cloneElement(node, { ...node.props, key: node.key ?? i }, ...inner));
        remaining -= innerCount;
      } else {
        result.push(node);
      }
    }
  }
  return result;
}

function countRendered(nodes: React.ReactNode[]): number {
  let c = 0;
  for (const n of nodes) {
    if (typeof n === "string") c += n.length;
    else if (React.isValidElement(n)) {
      const ch = n.props.children;
      if (typeof ch === "string") c += ch.length;
      else if (Array.isArray(ch)) c += countRendered(ch);
    }
  }
  return c;
}

export default TypewriterText;
