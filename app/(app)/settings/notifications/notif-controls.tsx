"use client";
/**
 * M10 — Notification controls (CC): ChannelRow CC:372–427, EventRow
 * CC:429–462 (OnOff per §2.13 — Atlas has no toggle switches),
 * frequency + email-format segments CC:164–177/256–263, quiet hours
 * CC:214–246 (mono §2.13 time inputs + the browser-detected zone line,
 * detected for REAL via Intl and saved with the form).
 */
import { useState, useSyncExternalStore } from "react";
import { useActionState, useTransition } from "react";

import { OnOff, PillButton, SegmentedControl, UnderlineInput } from "@/src/components/kit";
import type { EmailFormat, Frequency } from "@/src/domain/notifications/preferences";

import {
  saveQuietHoursAction,
  setEmailChannelAction,
  setEmailFormatAction,
  setEventAction,
  setFrequencyAction,
  type QuietHoursState,
} from "./actions";

/** CC:386–426 — channel row with the standard On/Off segment. */
export function ChannelRow({
  label,
  sub,
  on,
  locked,
}: {
  label: string;
  sub: string;
  on?: boolean;
  /** locked channels render the quiet note, never a control (CC:391–399). */
  locked?: "always on" | "soon";
}) {
  const [value, setValue] = useState<"on" | "off">(on ? "on" : "off");
  const [, startTransition] = useTransition();
  return (
    <li className="py-4 flex items-baseline justify-between gap-6">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-base text-stone-900 font-medium">{label}</span>
          {locked && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-stone-400">
              {locked}
            </span>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-stone-500">{sub}</div>
      </div>
      {!locked && (
        <OnOff
          value={value}
          onChange={(v) => {
            setValue(v);
            startTransition(() => setEmailChannelAction(v === "on"));
          }}
        />
      )}
    </li>
  );
}

/** CC:429–462 — per-event row, micro On/Off. */
export function EventRow({
  eventKey,
  label,
  sub,
  on,
}: {
  eventKey: string;
  label: string;
  sub: string;
  on: boolean;
}) {
  const [value, setValue] = useState<"on" | "off">(on ? "on" : "off");
  const [, startTransition] = useTransition();
  return (
    <li className="py-3 flex items-baseline justify-between gap-6">
      <div>
        <div className="text-sm text-stone-900 font-medium">{label}</div>
        <div className="mt-0.5 text-xs text-stone-500 italic">{sub}</div>
      </div>
      <OnOff
        size="micro"
        value={value}
        onChange={(v) => {
          setValue(v);
          startTransition(() => setEventAction(eventKey, v === "on"));
        }}
      />
    </li>
  );
}

export function FrequencyControl({ frequency }: { frequency: Frequency }) {
  const [value, setValue] = useState<string>(frequency);
  const [, startTransition] = useTransition();
  return (
    <SegmentedControl
      options={[
        { value: "instant", label: "Instant" },
        { value: "daily", label: "Daily digest" },
        { value: "weekly", label: "Weekly digest" },
        { value: "off", label: "Off" },
      ]}
      value={value}
      onChange={(v) => {
        setValue(v);
        startTransition(() => setFrequencyAction(v as Frequency));
      }}
    />
  );
}

export function EmailFormatControl({ format }: { format: EmailFormat }) {
  const [value, setValue] = useState<string>(format);
  const [, startTransition] = useTransition();
  return (
    <SegmentedControl
      options={[
        { value: "editorial", label: "Editorial" },
        { value: "plain", label: "Plain text" },
      ]}
      value={value}
      onChange={(v) => {
        setValue(v);
        startTransition(() => setEmailFormatAction(v as EmailFormat));
      }}
    />
  );
}

/** CC:214–246 — quiet hours; the zone line is detected for real. */
export function QuietHoursForm({
  quietFrom,
  quietUntil,
  timezone,
}: {
  quietFrom: string | null;
  quietUntil: string | null;
  timezone: string | null;
}) {
  const [state, formAction] = useActionState<QuietHoursState, FormData>(
    saveQuietHoursAction,
    {},
  );
  // CC:243 "detected from browser" — for REAL: the client snapshot is the
  // browser's zone; the server snapshot falls back to the stored one.
  const detected = useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? timezone,
    () => timezone,
  );

  return (
    <form action={formAction}>
      <div className="mt-7 grid grid-cols-2 gap-6 max-w-md">
        <UnderlineInput
          name="quietFrom"
          type="text"
          label="Quiet from"
          mono
          placeholder="22:00"
          defaultValue={quietFrom ?? undefined}
          validation={state.fieldError ? "error" : undefined}
          message={state.fieldError}
        />
        <UnderlineInput
          name="quietUntil"
          type="text"
          label="Until"
          mono
          placeholder="08:00"
          defaultValue={quietUntil ?? undefined}
          validation={state.fieldError ? "error" : undefined}
        />
      </div>
      <input type="hidden" name="timezone" value={detected ?? ""} />
      <div className="mt-5 flex items-center gap-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
          Time zone · {detected ?? "—"} · detected from browser
        </div>
        <PillButton kind="primary" size="xs" type="submit">
          Save window
        </PillButton>
        {state.saved && !state.fieldError && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">
            ✓ saved
          </span>
        )}
      </div>
    </form>
  );
}
