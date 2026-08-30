import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    if (m[2] && m[3]) {
      nodes.push(
        <a
          key={`${keyPrefix}-a-${i++}`}
          href={m[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-klir-accent/70 text-klir-primary font-medium hover:decoration-klir-accent"
        >
          {m[2]}
        </a>
      );
    } else if (m[4]) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i++}`} className="font-semibold">
          {m[4]}
        </strong>
      );
    } else if (m[5]) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${i++}`}
          className="px-1 py-0.5 rounded bg-klir-primary/8 text-[0.9em]"
        >
          {m[5]}
        </code>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Rendu markdown léger : titres, listes, liens cliquables, gras. */
export function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let listBuf: string[] = [];

  function flushList(key: number) {
    if (!listBuf.length) return;
    out.push(
      <ul key={`ul-${key}`} className="ml-4 list-disc space-y-1 my-1.5">
        {listBuf.map((item, j) => (
          <li key={j}>{renderInline(item, `li-${key}-${j}`)}</li>
        ))}
      </ul>
    );
    listBuf = [];
  }

  lines.forEach((line, i) => {
    if (line.startsWith("- ") || line.startsWith("* ")) {
      listBuf.push(line.slice(2));
      return;
    }
    flushList(i);
    if (line.startsWith("## ")) {
      out.push(
        <h3 key={i} className="font-display text-klir-primary font-semibold mt-3 mb-1">
          {renderInline(line.slice(3), `h3-${i}`)}
        </h3>
      );
      return;
    }
    if (line.startsWith("# ")) {
      out.push(
        <h2 key={i} className="font-display text-klir-primary font-bold mt-3 mb-1">
          {renderInline(line.slice(2), `h2-${i}`)}
        </h2>
      );
      return;
    }
    if (line.trim() === "") {
      out.push(<br key={i} />);
      return;
    }
    out.push(
      <p key={i} className="mb-1.5 leading-relaxed">
        {renderInline(line, `p-${i}`)}
      </p>
    );
  });
  flushList(lines.length);
  return <>{out}</>;
}
