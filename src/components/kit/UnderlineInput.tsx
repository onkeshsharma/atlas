/**
 * Kit — UnderlineInput / UnderlineTextarea / UnderlineSelect + validation.
 *
 * Ported from design/variants/variant-l-signin.tsx:49–76 (labelled input),
 * variant-m-members.tsx:219–229 (textarea), variant-jj-delete.tsx:117–120
 * (rose focus for type-to-confirm), variant-ww-trust.tsx select recipe.
 * Governing canon: §2.13 — the underline + one quiet mono line is the
 * whole vocabulary. Validation states are CANON-INVENTED (the gallery
 * defines none; anchors JJ:120, VV:70, XX:401) — this kit is their first
 * real render. Never: red backgrounds, alert boxes, icons-in-fields.
 */
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export type ValidationState = "error" | "success" | "disabled";

type FieldDecor = {
  /** mono-meta label above the field (L:51). */
  label?: React.ReactNode;
  /** quiet suffix on the label — e.g. "· optional" (M:222). */
  labelMeta?: React.ReactNode;
  /** right-aligned ghost affordance on the label row — "forgot? →" (L:63–69). (M5 kit axis.) */
  labelAction?: React.ReactNode;
  /** §2.13 validation states; omit for the default ink underline. */
  validation?: ValidationState;
  /** one quiet message per field, mono-micro, sentence case, no `!`. */
  message?: React.ReactNode;
  /** neutral helper — same shape in stone-400; italic sans permitted. */
  hint?: React.ReactNode;
  /** mono value text for machine-ish content (DD:93, R:101). */
  mono?: boolean;
  /** rose focus for type-to-confirm fields inside the JJ modal (JJ:120). */
  focusTone?: "ink" | "rose";
};

const BASE =
  "mt-2 w-full bg-transparent border-b py-2 text-base placeholder:text-stone-400 focus:outline-none transition";

function borderClasses(validation: ValidationState | undefined, focusTone: "ink" | "rose") {
  switch (validation) {
    case "error":
      // §2.13 — persists until valid.
      return "border-rose-500 text-stone-900 focus:border-rose-500";
    case "success":
      return "border-emerald-500 text-stone-900 focus:border-emerald-500";
    case "disabled":
      return "border-stone-200 text-stone-400 cursor-not-allowed";
    default:
      return focusTone === "rose"
        ? "border-stone-300 text-stone-900 focus:border-rose-500"
        : "border-stone-300 text-stone-900 focus:border-stone-900";
  }
}

function FieldLabel({
  label,
  labelMeta,
  labelAction,
}: Pick<FieldDecor, "label" | "labelMeta" | "labelAction">) {
  if (!label) return null;
  const labelNode = (
    <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
      {label}
      {labelMeta && <span className="text-stone-400"> {labelMeta}</span>}
    </label>
  );
  if (!labelAction) return labelNode;
  // L:63–69 — label row with right-aligned ghost link.
  return (
    <div className="flex items-baseline justify-between">
      {labelNode}
      {labelAction}
    </div>
  );
}

function FieldMessage({
  validation,
  message,
  hint,
}: Pick<FieldDecor, "validation" | "message" | "hint">) {
  if (validation === "error" && message) {
    return (
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-rose-700">
        {message}
      </p>
    );
  }
  if (validation === "success" && message) {
    return (
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-emerald-700">
        ✓ {message}
      </p>
    );
  }
  if (hint) {
    return (
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
        {hint}
      </p>
    );
  }
  return null;
}

type InputProps = FieldDecor & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export function UnderlineInput({
  label,
  labelMeta,
  labelAction,
  validation,
  message,
  hint,
  mono = false,
  focusTone = "ink",
  ...rest
}: InputProps) {
  return (
    <div>
      <FieldLabel label={label} labelMeta={labelMeta} labelAction={labelAction} />
      <input
        {...rest}
        disabled={validation === "disabled" || rest.disabled}
        className={`${BASE} ${mono ? "font-mono " : ""}${borderClasses(validation, focusTone)}`}
      />
      <FieldMessage validation={validation} message={message} hint={hint} />
    </div>
  );
}

type TextareaProps = FieldDecor & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export function UnderlineTextarea({
  label,
  labelMeta,
  labelAction,
  validation,
  message,
  hint,
  mono = false,
  focusTone = "ink",
  ...rest
}: TextareaProps) {
  return (
    <div>
      <FieldLabel label={label} labelMeta={labelMeta} labelAction={labelAction} />
      <textarea
        {...rest}
        disabled={validation === "disabled" || rest.disabled}
        className={`${BASE} resize-none ${mono ? "font-mono " : ""}${borderClasses(
          validation,
          focusTone,
        )}`}
      />
      <FieldMessage validation={validation} message={message} hint={hint} />
    </div>
  );
}

type SelectProps = FieldDecor & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">;

/** §2.13 — selects share the underline recipe (WW:291–294). */
export function UnderlineSelect({
  label,
  labelMeta,
  labelAction,
  validation,
  message,
  hint,
  mono = false,
  focusTone = "ink",
  children,
  ...rest
}: SelectProps) {
  return (
    <div>
      <FieldLabel label={label} labelMeta={labelMeta} labelAction={labelAction} />
      <select
        {...rest}
        disabled={validation === "disabled" || rest.disabled}
        className={`${BASE} ${mono ? "font-mono " : ""}${borderClasses(validation, focusTone)}`}
      >
        {children}
      </select>
      <FieldMessage validation={validation} message={message} hint={hint} />
    </div>
  );
}
