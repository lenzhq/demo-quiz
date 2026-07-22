import type { ReactNode } from "react";

const EMPHASIS_RE = /(\*\*(.+?)\*\*|(?<!\*)\*(?!\*)(.+?)\*(?!\*))/g;

/**
 * Convert **bold** and *italic* markers in LLM text to React elements.
 */
export function renderEmphasis(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const m of text.matchAll(EMPHASIS_RE)) {
    const idx = m.index!;
    if (idx > last) parts.push(text.slice(last, idx));
    if (m[2]) {
      parts.push(<strong key={key++}>{m[2]}</strong>);
    } else if (m[3]) {
      parts.push(<em key={key++}>{m[3]}</em>);
    }
    last = idx + m[0].length;
  }

  if (last === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
