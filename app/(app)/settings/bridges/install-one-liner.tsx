/**
 * BPI — InstallOneLiner: OS-tab picker + copy-one-liner block.
 *
 * Client component — drives a SegmentedControl (§2.13) + SecretBlock
 * (§2.20) for the first-run install surface on /settings/bridges.
 * Three tabs: Windows / macOS / Linux. One-liner per tab.
 * Sources: ADR-0005 §2 (install surface spec).
 */
"use client";

import { useState } from "react";
import { SecretBlock, SegmentedControl } from "@/src/components/kit";

type OS = "windows" | "mac" | "linux";

const OS_OPTIONS: { value: string; label: string }[] = [
  { value: "windows", label: "Windows" },
  { value: "mac", label: "macOS" },
  { value: "linux", label: "Linux" },
];

export function InstallOneLiner({ atlasUrl }: { atlasUrl: string }) {
  const [os, setOs] = useState<OS>("windows");
  const [copied, setCopied] = useState(false);

  const oneLiner =
    os === "windows"
      ? `irm ${atlasUrl}/install.ps1 | iex`
      : `curl -fsSL ${atlasUrl}/install.sh | sh`;

  // `irm`/`iex` are PowerShell cmdlets — they fail in Command Prompt (cmd).
  // Spell out the shell so nobody pastes it into the wrong one.
  const shellHint =
    os === "windows"
      ? "Run this in PowerShell — not Command Prompt (cmd)."
      : "Run this in your terminal (bash / zsh).";

  return (
    <div className="mt-5">
      <SegmentedControl
        options={OS_OPTIONS}
        value={os}
        onChange={(v) => {
          setOs(v as OS);
          setCopied(false);
        }}
        size="compact"
      />
      <div className="mt-3">
        <SecretBlock
          secret={oneLiner}
          copyLabel={copied ? "Copied ✓" : "Copy →"}
          onCopy={() => {
            void navigator.clipboard.writeText(oneLiner);
            setCopied(true);
          }}
        />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        {shellHint}
      </p>
    </div>
  );
}
