"use client";
/**
 * M7 — the R intake form, ported from
 * design/variants/variant-r-newproject.tsx:93–114 (single labelled
 * underline field · page-scale primary CTA + italic side note).
 * Kit-only composition; §2.13 error state wired to the real
 * createProject validation (slug.ts messages).
 */
import { useActionState } from "react";

import { PillButton, UnderlineInput } from "@/src/components/kit";

import { createProjectAction, type NewProjectState } from "./actions";

export function IngestForm() {
  const [state, formAction] = useActionState<NewProjectState, FormData>(
    createProjectAction,
    {},
  );

  return (
    <form action={formAction}>
      <div className="mt-8 space-y-7">
        {/* R:95–102 — mono value text (machine-ish content, §2.13). The
            domain also accepts a path on the Owner's machine (the
            Bridge's territory at M9/M10) — labelMeta says so honestly. */}
        <UnderlineInput
          name="source"
          type="text"
          mono
          label="Repository URL"
          labelMeta="· or a path on your machine"
          placeholder="https://github.com/your-org/your-repo"
          validation={state.fieldError ? "error" : undefined}
          message={state.fieldError}
        />
      </div>
      <div className="mt-8 flex items-center gap-4">
        {/* R:106–109 — page-scale primary with trailing → */}
        <PillButton kind="primary" size="page" arrow type="submit">
          Connect repository
        </PillButton>
        {/* R:110–113 adapted — R promised OAuth scopes; nothing is cloned
            or connected pre-Engine, so the side note says what actually
            happens (honesty law, M5/M6 precedent). */}
        <span className="italic font-sans text-sm text-stone-500">
          a URL is cloned to your Bridge on the first run · a local path is read in place
        </span>
      </div>
    </form>
  );
}
