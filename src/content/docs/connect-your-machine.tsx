/**
 * BPI — "Connect your machine." — the end-user install guide.
 * Written for a non-technical Collaborator or a fresh Owner.
 * Every TOC anchor must resolve in the body (M14 law).
 * SmartScreen step is honest about unsigned binaries.
 * Sources: ADR-0004, ADR-0005, notes/BP3-packaging-runbook.md.
 */
import { DocSection, Term } from "./article-kit";
import type { DocArticle } from "./types";

export const connectYourMachine: DocArticle = {
  slug: "connect-your-machine",
  title: "Connect your machine.",
  indexTitle: "Connect your machine",
  section: "Getting started",
  sub: "Install the Bridge daemon and pair with your Atlas instance",
  lede: "Atlas runs your AI sessions locally. This guide walks connecting a machine — from one pasted command to the green pulse in the Bridges page.",
  readMin: 3,
  audience: "Owners · Collaborators",
  updated: "June 13, 2026",
  toc: [
    { id: "what-is-the-bridge", label: "What the Bridge is" },
    { id: "the-one-liner", label: "The one-liner" },
    { id: "smartscreen", label: "The SmartScreen step" },
    { id: "approve-in-the-browser", label: "Approve in the browser" },
    { id: "how-to-tell-it-worked", label: "How to tell it worked" },
    { id: "stop-and-uninstall", label: "Stopping & uninstalling" },
  ],
  related: ["the-bridge-and-the-engine", "architecture"],
  provenance: "ADR-0004 + ADR-0005 — the distribution and install-experience decisions",
  body: (
    <>
      <DocSection id="what-is-the-bridge" label="What the Bridge is">
        <p>
          The <Term>Bridge</Term> is a small daemon (a background process) that runs on
          your machine and connects to your Atlas instance. It is the only thing that ever
          runs Engine sessions or touches your code repos. You install it once; after that
          it starts automatically when you log in.
        </p>
      </DocSection>

      <DocSection id="the-one-liner" label="The one-liner">
        <p>
          On the machine you want to connect, open a terminal and paste the appropriate
          one-liner for your OS:
        </p>
        <ul className="mt-4 space-y-3">
          <li>
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
              Windows (PowerShell)
            </span>
            <div className="mt-1.5 rounded-xl bg-stone-900 text-stone-50 px-5 py-3 font-mono text-sm break-all">
              irm https://&lt;your-atlas&gt;/install.ps1 | iex
            </div>
          </li>
          <li>
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
              macOS / Linux
            </span>
            <div className="mt-1.5 rounded-xl bg-stone-900 text-stone-50 px-5 py-3 font-mono text-sm break-all">
              curl -fsSL https://&lt;your-atlas&gt;/install.sh | sh
            </div>
          </li>
        </ul>
        <p>
          Replace{" "}
          <span className="font-mono text-sm">{"<your-atlas>"}</span> with your Atlas URL
          (shown in your Bridges page). The script downloads the Bridge binary, places it
          in the right folder, registers it as a login item, and opens the pairing flow in
          your browser automatically.
        </p>
        <p>
          <span className="font-semibold text-stone-900">Honest note:</span> The one-liner
          depends on a published GitHub Release existing. Until the first{" "}
          <span className="font-mono text-sm">bridge-v*</span> tag is cut by your instance
          owner, use the manual install path — download the binary from the Releases page
          directly, or run from source.
        </p>
      </DocSection>

      <DocSection id="smartscreen" label="The SmartScreen step">
        <p>
          Windows will show a SmartScreen warning saying it &ldquo;doesn&rsquo;t recognise
          this app.&rdquo; This is expected — the binary is not yet code-signed, which is a
          certificate you buy from a certificate authority. Click{" "}
          <span className="font-semibold text-stone-900">More info</span> →{" "}
          <span className="font-semibold text-stone-900">Run anyway</span>. The binary is
          safe; it is built from the Atlas source you can read on GitHub.
        </p>
        <p>
          macOS users: Gatekeeper will block the unsigned binary. Open{" "}
          <span className="font-semibold text-stone-900">
            System Settings → Privacy &amp; Security
          </span>{" "}
          → scroll to the &ldquo;Security&rdquo; section → click{" "}
          <span className="font-semibold text-stone-900">Open Anyway</span>.
        </p>
        <p>
          A signed release is coming — when it lands, these warnings disappear and the
          steps above are deleted from this page.
        </p>
      </DocSection>

      <DocSection id="approve-in-the-browser" label="Approve in the browser">
        <p>
          After the one-liner runs, your browser will open to your Atlas instance&rsquo;s
          Bridges page showing an approval screen. It will show the machine name and what
          pairing grants (the ability to run Engine sessions and stream results back to
          Atlas). Click{" "}
          <span className="font-semibold text-stone-900">Approve pairing</span> — the token
          is delivered directly to the daemon over a local callback and never shown to you.
          The tab can be closed; the daemon takes it from there.
        </p>
      </DocSection>

      <DocSection id="how-to-tell-it-worked" label="How to tell it worked">
        <p>
          Once paired, your Bridges page shows the machine row with a green pulsing dot.
          The menubar (macOS) or system tray (Windows) shows the Bridge icon in a connected
          state. On Atlas, any dispatched Run will route to your machine.
        </p>
      </DocSection>

      <DocSection id="stop-and-uninstall" label="Stopping & uninstalling">
        <p>
          <span className="font-semibold text-stone-900">To stop:</span>{" "}
          <span className="font-mono text-sm">atlas-bridge stop</span> in a terminal, or
          quit from the menubar/tray. The daemon restarts at next login.
        </p>
        <p>
          <span className="font-semibold text-stone-900">To prevent auto-start:</span>{" "}
          remove the login item — on Windows:{" "}
          <span className="font-mono text-sm break-all">
            reg delete &ldquo;HKCU\Software\Microsoft\Windows\CurrentVersion\Run&rdquo; /v
            &ldquo;io.atlas.bridge&rdquo; /f
          </span>
          ; on macOS:{" "}
          <span className="font-mono text-sm break-all">
            launchctl unload ~/Library/LaunchAgents/io.atlas.bridge.plist
          </span>
          .
        </p>
        <p>
          <span className="font-semibold text-stone-900">To unpair:</span> go to Settings
          → Bridges, hover the machine row, click &ldquo;Revoke →&rdquo;.
        </p>
        <p>
          <span className="font-semibold text-stone-900">To fully uninstall:</span> revoke,
          then delete the binary and the{" "}
          <span className="font-mono text-sm">~/.atlas-bridge/</span> folder.
        </p>
      </DocSection>
    </>
  ),
};
