// THROWAWAY — Editorial Onboarding prototype.
// First-time Collaborator flow: accept invite, learn what Atlas is, file
// first Ticket. Four steps, all on one page, scrolled vertically.
// Pre-app shell — no sidebar.

const STEPS = [
  { n: "01", label: "You're invited" },
  { n: "02", label: "What Atlas does" },
  { n: "03", label: "Pick a name" },
  { n: "04", label: "File your first Ticket" },
];

const PROJECTS_FROM_INVITE = [
  { name: "atlas-internal", role: "Collaborator" },
  { name: "marketing-site", role: "Collaborator" },
];

export function VariantSSOnboarding() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        {/* Top chrome */}
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Atlas · Welcome
        </div>
        <div className="absolute top-8 right-8 flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-stone-500">
          <a className="hover:text-stone-900 cursor-pointer">What is Atlas?</a>
          <a className="hover:text-stone-900 cursor-pointer">Sign in →</a>
        </div>

        <main className="min-h-screen pt-28 pb-24 px-8">
          <div className="max-w-4xl mx-auto">
            {/* HERO */}
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
              Step 01 of 04 · 90 seconds, tops
            </div>
            <h1 className="mt-4 text-6xl font-bold tracking-tighter leading-[0.95]">
              <span className="relative">
                Welcome
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-amber-500" />
              </span>
              ,&nbsp;Priya.
            </h1>
            <p className="mt-7 text-2xl tracking-tight text-stone-700 leading-tight max-w-2xl">
              Onkesh has invited you to collaborate on two Projects through
              Atlas — a tool that lets you ask for code changes in plain
              English.
            </p>

            {/* Step bar */}
            <ol className="mt-12 grid grid-cols-4 gap-3">
              {STEPS.map((s, i) => (
                <li
                  key={s.n}
                  className="border-t-2 pt-3 transition"
                  style={{
                    borderColor: i === 0 ? "#f59e0b" : "#e7e5e4",
                  }}
                >
                  <div
                    className={`font-mono text-[10px] uppercase tracking-widest ${
                      i === 0 ? "text-amber-700" : "text-stone-400"
                    }`}
                  >
                    {s.n}
                  </div>
                  <div
                    className={`mt-1 text-sm font-medium ${
                      i === 0 ? "text-stone-900" : "text-stone-500"
                    }`}
                  >
                    {s.label}
                  </div>
                </li>
              ))}
            </ol>

            {/* STEP 01 — Accept */}
            <section className="mt-20">
              <div className="grid grid-cols-[120px_1fr] gap-10 items-baseline">
                <div className="font-mono text-sm text-stone-400">01</div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tighter">
                    You&rsquo;re invited.
                  </h2>
                  <p className="mt-4 text-base text-stone-700 leading-relaxed max-w-2xl">
                    Two Projects are waiting for you. As a Collaborator, you can
                    file Tickets — change requests written in plain English —
                    and Atlas&rsquo;s Engine will draft a Brief, ship a PR, and
                    email you when it&rsquo;s shipped. You won&rsquo;t see code.
                  </p>

                  <ul className="mt-7 divide-y divide-stone-200 max-w-xl">
                    {PROJECTS_FROM_INVITE.map((p) => (
                      <li
                        key={p.name}
                        className="py-4 grid grid-cols-[1fr_auto] items-baseline gap-6"
                      >
                        <div>
                          <div className="text-base font-medium text-stone-900">
                            {p.name}
                          </div>
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                            invited by Onkesh · 12 minutes ago
                          </div>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
                          {p.role}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex items-center gap-3">
                    <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-6 py-3 rounded-full shadow-sm">
                      Accept both →
                    </button>
                    <a className="font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer">
                      decline
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* STEP 02 — What Atlas is */}
            <section className="mt-24">
              <div className="grid grid-cols-[120px_1fr] gap-10 items-baseline">
                <div className="font-mono text-sm text-stone-400">02</div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tighter">
                    What you&rsquo;re here to do.
                  </h2>
                  <p className="mt-4 text-base text-stone-700 leading-relaxed max-w-2xl">
                    Three things, in plain language.
                  </p>

                  <div className="mt-8 grid grid-cols-3 gap-6 max-w-2xl">
                    <Card
                      n="01"
                      title="File a Ticket"
                      body="Describe what you want changed. Write it like a Slack message."
                    />
                    <Card
                      n="02"
                      title="Atlas writes the change"
                      body="Owner reviews, ships a PR. The Engine works on Onkesh's machine."
                    />
                    <Card
                      n="03"
                      title="You hear back"
                      body="One email per Ticket — what shipped, why, and a link if you care."
                    />
                  </div>

                  <p className="mt-7 text-sm italic text-stone-500 leading-relaxed max-w-xl">
                    You never write code. You never review diffs. You file
                    Tickets, Atlas does the rest.
                  </p>
                </div>
              </div>
            </section>

            {/* STEP 03 — Pick name */}
            <section className="mt-24">
              <div className="grid grid-cols-[120px_1fr] gap-10 items-baseline">
                <div className="font-mono text-sm text-stone-400">03</div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tighter">
                    How should we address you?
                  </h2>
                  <p className="mt-4 text-base text-stone-700 leading-relaxed max-w-2xl">
                    Your name appears on every Ticket comment and in your
                    weekly digest email. You can change it later in settings.
                  </p>

                  <div className="mt-8 max-w-md space-y-5">
                    <Input
                      label="Display name"
                      placeholder="Priya Sharma"
                      defaultValue="Priya Sharma"
                      hint="What Onkesh and the other Collaborators will see."
                    />
                    <Input
                      label="Handle"
                      placeholder="@priya"
                      defaultValue="@priya"
                      hint="For @-mentions and your profile URL. Letters, numbers, and hyphens only."
                      mono
                    />
                    <Input
                      label="Initial"
                      placeholder="P"
                      defaultValue="P"
                      hint="The single letter shown in the bottom-left sidebar dot. Auto-derived; override if you&rsquo;d like."
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* STEP 04 — File first Ticket */}
            <section className="mt-24">
              <div className="grid grid-cols-[120px_1fr] gap-10 items-baseline">
                <div className="font-mono text-sm text-stone-400">04</div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tighter">
                    Try it — file your first Ticket.
                  </h2>
                  <p className="mt-4 text-base text-stone-700 leading-relaxed max-w-2xl">
                    Optional, but it&rsquo;s how you&rsquo;ll feel out how
                    Atlas thinks. Onkesh sees this in their Triage inbox and
                    can either ship it or send it back for clarification.
                  </p>

                  <div className="mt-8 max-w-xl rounded-2xl bg-white/70 border border-stone-200 p-6">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      Filing to · atlas-internal
                    </div>
                    <input
                      type="text"
                      placeholder="One line — what's broken or what you want…"
                      className="mt-3 w-full bg-transparent text-xl tracking-tight text-stone-900 placeholder:text-stone-300 focus:outline-none"
                    />
                    <div className="mt-4 border-t border-stone-200/80 pt-4">
                      <textarea
                        rows={4}
                        placeholder="More detail (optional). Markdown is fine."
                        className="w-full bg-transparent text-base text-stone-700 placeholder:text-stone-400 focus:outline-none resize-none"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-stone-200/80 pt-3">
                      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                        <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                          attach image ↗
                        </a>
                        <span className="text-stone-300">·</span>
                        <span>kind: enhancement</span>
                      </div>
                      <button className="font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-2 rounded-full">
                        File Ticket →
                      </button>
                    </div>
                  </div>

                  <a className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 cursor-pointer">
                    skip for now → take me to the dashboard
                  </a>
                </div>
              </div>
            </section>

            {/* COLOPHON */}
            <div className="mt-24 pt-10 border-t border-stone-200/80 grid grid-cols-2 gap-10 items-baseline max-w-3xl">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Trust circle
                </div>
                <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                  Atlas is invite-only by design. You&rsquo;re in this Project
                  because Onkesh trusts you. We don&rsquo;t allow public
                  sign-up.
                </p>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  What we do with your data
                </div>
                <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                  Atlas stores your name, email, and the Tickets you file.
                  Nothing else. We don&rsquo;t see code — that lives on
                  Onkesh&rsquo;s machine.
                </p>
              </div>
            </div>

            <p className="mt-12 text-sm italic text-stone-500 leading-relaxed max-w-xl">
              Stuck on any step? Onkesh gets pinged in their Triage inbox if
              you don&rsquo;t finish — they can nudge you in person.
            </p>
          </div>
        </main>

        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant SS · editorial onboarding
        </div>
      </div>
    </>
  );
}

function Card({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white/70 border border-stone-200 p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-amber-700">
        {n}
      </div>
      <div className="mt-3 text-base font-semibold text-stone-900 leading-tight">
        {title}
      </div>
      <p className="mt-2 text-sm text-stone-600 leading-relaxed">{body}</p>
    </div>
  );
}

function Input({
  label,
  placeholder,
  defaultValue,
  hint,
  mono,
}: {
  label: string;
  placeholder: string;
  defaultValue?: string;
  hint: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-stone-500 block">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={`mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-lg text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-stone-900 transition ${
          mono ? "font-mono text-base" : ""
        }`}
      />
      <p className="mt-2 text-xs italic text-stone-500 leading-relaxed">
        {hint}
      </p>
    </div>
  );
}
