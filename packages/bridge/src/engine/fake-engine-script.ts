/**
 * The FAKE Engine — a scripted binary (charter §4: "scripted binary
 * driving every state path"). A real child process, so the supervisor's
 * spawn/stream/kill plumbing is exercised for real; only the brain is
 * scripted.
 *
 * Task arrives via env ATLAS_FAKE_TASK (json); stdin stays open for
 * answers (one JSON line per answer). Speaks sentinels on stdout:
 *
 *   @@ATLAS:ASK {"kind":"question","prompt":"…","options":[…]}
 *   @@ATLAS:RESULT {…helper deliverable…}
 *   @@ATLAS:DONE {"outcome":"review-ready"} | {"outcome":"failed","failureKind":"…","detail":"…"}
 *
 * Owner runs follow @fake: directives scanned from the Brief body
 * (drafted Briefs quote the Ticket story verbatim, so e2e tickets can
 * script their own runs):
 *
 *   @fake:line <text>     emit a stdout line
 *   @fake:sleep <ms>      pause
 *   @fake:write <path> <content…>   write a file in the worktree (real diff)
 *   @fake:ask {"kind":"question","prompt":"…"}   block until answered
 *   @fake:fail <kind> [detail…]     fail with a typed kind
 *   @fake:hang            run forever (the cancel path's victim)
 *
 * No directives → the default story: a few lines, one written file,
 * review-ready. Helper runs ignore directives and emit their canonical
 * deliverables fast (enrichment / Brief / Ingest Summary).
 */
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

type FakeTask = {
  lane: "owner" | "helper";
  helperKind: "enrich-ticket" | "draft-brief" | "ingest-project" | null;
  runRef: string;
  projectName: string;
  ticket: {
    ref: string;
    title: string;
    body: string;
    kind: string | null;
    priority: string;
  } | null;
  briefBody: string | null;
};

const task: FakeTask = JSON.parse(process.env.ATLAS_FAKE_TASK ?? "{}") as FakeTask;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const say = (line: string) => process.stdout.write(`${line}\n`);
const sentinel = (tag: string, payload: unknown) =>
  process.stdout.write(`@@ATLAS:${tag} ${JSON.stringify(payload)}\n`);

// answers arrive as JSON lines on stdin.
const answers: Array<(value: { text?: string; choice?: string }) => void> = [];
const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const next = answers.shift();
  if (!next) return;
  try {
    next(JSON.parse(line) as { text?: string; choice?: string });
  } catch {
    next({});
  }
});

function awaitAnswer(): Promise<{ text?: string; choice?: string }> {
  return new Promise((resolve) => answers.push(resolve));
}

function done(outcome: Record<string, unknown>): never {
  sentinel("DONE", outcome);
  process.exit(0);
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "change"
  );
}

async function ownerRun(): Promise<never> {
  const script = task.briefBody ?? task.ticket?.body ?? "";
  const directives = script
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("@fake:"));

  say(`engine session start — ${task.runRef} (${task.projectName})`);
  await sleep(60);

  if (directives.length === 0) {
    const slug = slugify(task.ticket?.title ?? task.runRef);
    say("reading the Brief…");
    await sleep(60);
    say(`planning the change for ${task.ticket?.ref ?? "the project"}`);
    await sleep(60);
    writeFileSync(`${slug}.md`, `# ${task.ticket?.title ?? task.runRef}\n\nDone by the fake Engine.\n`);
    say(`wrote ${slug}.md`);
    done({ outcome: "review-ready" });
  }

  for (const directive of directives) {
    const body = directive.slice("@fake:".length);
    const [verb, ...rest] = body.split(" ");
    const arg = rest.join(" ");
    switch (verb) {
      case "line":
        say(arg);
        await sleep(40);
        break;
      case "sleep":
        await sleep(Number(arg) || 100);
        break;
      case "write": {
        const [path, ...content] = rest;
        writeFileSync(path, `${content.join(" ")}\n`);
        say(`wrote ${path}`);
        break;
      }
      case "ask": {
        let question: Record<string, unknown>;
        try {
          question = JSON.parse(arg) as Record<string, unknown>;
        } catch {
          question = { kind: "question", prompt: arg };
        }
        sentinel("ASK", question);
        const answer = await awaitAnswer();
        say(`answered: ${answer.choice ?? answer.text ?? "(empty)"}`);
        break;
      }
      case "fail": {
        const [kind, ...detail] = rest;
        done({
          outcome: "failed",
          failureKind: kind || "engine-crash",
          detail: detail.join(" ") || "scripted failure",
        });
        break;
      }
      case "hang":
        say("hanging (waiting to be cancelled)…");
        await new Promise(() => {});
        break;
      default:
        say(`(unknown directive: ${verb})`);
    }
  }
  done({ outcome: "review-ready" });
}

async function helperRun(): Promise<never> {
  const ticket = task.ticket;
  say(`helper session start — ${task.helperKind} for ${ticket?.ref ?? task.projectName}`);
  await sleep(40);

  switch (task.helperKind) {
    case "enrich-ticket": {
      const slug = slugify(ticket?.title ?? "ticket");
      const kind =
        ticket?.kind === "bug" || ticket?.kind === "enhancement" || ticket?.kind === "other"
          ? ticket.kind
          : "enhancement";
      say("reading the ticket story…");
      sentinel("RESULT", {
        kind: "enrich-ticket",
        enrichment: {
          kind,
          severity: ticket?.priority === "broken-now" ? "high" : "medium",
          confidence: "medium",
          likelyFiles: [`src/${slug}.ts`, `tests/${slug}.test.ts`],
          question: `Anything unusual about "${ticket?.title ?? "this"}" worth knowing before a run?`,
          enrichedAt: new Date().toISOString(),
        },
      });
      done({ outcome: "review-ready" });
      break;
    }
    case "draft-brief": {
      say("drafting the Brief from the ticket + project context…");
      const body = [
        `# Brief — ${ticket?.ref ?? ""} ${ticket?.title ?? ""}`.trim(),
        "",
        `Project: ${task.projectName}. Work in this run's own worktree; ship nothing yourself.`,
        "",
        "## The story, verbatim",
        "",
        ticket?.body || "(no story attached — work from the title.)",
        "",
        "## Definition of done",
        "",
        "- the change matches the story above",
        "- existing tests stay green",
      ].join("\n");
      sentinel("RESULT", { kind: "draft-brief", body });
      done({ outcome: "review-ready" });
      break;
    }
    case "ingest-project": {
      say(`reading ${task.projectName}…`);
      const now = new Date().toISOString();
      sentinel("RESULT", {
        kind: "ingest-project",
        summary: {
          schemaVersion: 1,
          tagline: `${task.projectName} — read end-to-end by the fake Engine.`,
          engineRead: [
            `${task.projectName} is a small, well-kept codebase; the fake Engine walked every file.`,
          ],
          stack: ["TypeScript", "Node"],
          stackProse: "TypeScript on Node — one package, no surprises.",
          architectureProse: "A single tier; entry points fan into a lib folder.",
          architecture: [
            { name: "src", sub: "TypeScript · library tier", detail: "Everything lives here." },
          ],
          smells: [
            {
              severity: "low",
              title: "Thin test coverage at the edges",
              file: "src/index.ts",
              detail: "The entry point has no direct tests.",
            },
          ],
          health: [{ label: "Builds", value: "clean", ok: true }],
          churnWeeks: [1, 2, 1, 3],
          coverage: [{ area: "Overall", pct: 62, hero: true }],
          stats: { coveragePct: 62, prevCoveragePct: null, linesOfCode: "~1,200", files: 14 },
          commits: [{ sha: "0000000", subject: "initial commit", at: now }],
          commitsTotal: 1,
          repo: { branch: "main", commitsSinceIngest: 0 },
        },
        suggestedTerms: [
          { term: "worktree", uses: 7 },
          { term: "fake engine", uses: 3 },
        ],
      });
      done({ outcome: "review-ready" });
      break;
    }
    default:
      done({ outcome: "failed", failureKind: "engine-crash", detail: "unknown helper kind" });
  }
}

if (task.lane === "helper") {
  void helperRun();
} else {
  void ownerRun();
}
