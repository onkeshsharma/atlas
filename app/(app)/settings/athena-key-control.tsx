/**
 * Athena cloud-tier API key (ADR-0007 §3). Write-only: the plaintext is never
 * sent to the client — only whether a key is set. Stored encrypted at rest.
 * Server component (plain server-action forms; no client state needed).
 */
import { PillButton } from "@/src/components/kit";

import { clearAthenaKeyAction, setAthenaKeyAction } from "./actions";

export function AthenaKeyControl({ isSet, available }: { isSet: boolean; available: boolean }) {
  if (!available) {
    return (
      <p className="text-sm italic text-stone-500 leading-relaxed max-w-xl">
        Set <span className="font-mono not-italic text-stone-700">ATLAS_SECRET_KEY</span> in the
        deployment environment to store an Anthropic key here. Until then, Athena&apos;s cloud tier
        uses the deployment&apos;s <span className="font-mono not-italic text-stone-700">ANTHROPIC_API_KEY</span> env var.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {isSet && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">key set</span>
          <span className="font-mono text-sm text-stone-400">••••••••••••</span>
          <form action={clearAthenaKeyAction}>
            <PillButton kind="ghost" ghostDanger type="submit">
              clear →
            </PillButton>
          </form>
        </div>
      )}
      <form action={setAthenaKeyAction} className="flex items-center gap-3">
        <input
          type="password"
          name="key"
          autoComplete="off"
          placeholder={isSet ? "Replace the key…" : "sk-ant-…"}
          className="w-72 border-b border-stone-300 bg-transparent py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
        />
        <PillButton type="submit">{isSet ? "replace →" : "save →"}</PillButton>
      </form>
    </div>
  );
}
