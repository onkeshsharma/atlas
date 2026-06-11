/**
 * M9 Session B — Brief markdown rendered in the editorial register.
 *
 * Briefs are markdown bodies (briefs.body); three surfaces show them as
 * PROSE (F:212–235's card paragraphs, RR:255–266's preview card, W's
 * Preview tab), so the tiny renderer lives once here — heads become
 * mono section labels, code spans go mono, bullets keep their hyphens'
 * meaning. Deliberately minimal: headings / bullets / paragraphs /
 * `code` / **bold** — Briefs are instructions, not documents. Unknown
 * markdown renders as its literal text (never swallowed).
 */

type Block =
  | { kind: "heading"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "paragraph"; text: string };

function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let bullets: string[] | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushBullets = () => {
    if (bullets) {
      blocks.push({ kind: "bullets", items: bullets });
      bullets = null;
    }
  };

  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushBullets();
      blocks.push({ kind: "heading", text: heading[1] });
    } else if (bullet) {
      flushParagraph();
      bullets = bullets ?? [];
      bullets.push(bullet[1]);
    } else if (line.trim() === "") {
      flushParagraph();
      flushBullets();
    } else {
      flushBullets();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushBullets();
  return blocks;
}

/** inline `code` + **bold** spans — §1.2's mono-for-machine-content rule. */
function inline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <span key={key++} className="font-mono text-sm text-stone-600">
          {token.slice(1, -1)}
        </span>,
      );
    } else {
      nodes.push(
        <span key={key++} className="font-semibold text-stone-900">
          {token.slice(2, -2)}
        </span>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function BriefProse({ markdown }: { markdown: string }) {
  const blocks = toBlocks(markdown);
  return (
    <div className="space-y-4 text-base text-stone-700 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <div
              key={i}
              className="pt-2 font-mono text-[10px] uppercase tracking-widest text-stone-500"
            >
              {block.text}
            </div>
          );
        }
        if (block.kind === "bullets") {
          return (
            <ul key={i} className="space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="grid grid-cols-[16px_1fr] gap-1 items-baseline">
                  <span className="text-stone-400">·</span>
                  <span>{inline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(block.text)}</p>;
      })}
    </div>
  );
}
