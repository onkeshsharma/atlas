/** M13 — /dev-emails index (dev-gated like /dev-variants). */
import Link from "next/link";
import { notFound } from "next/navigation";

import { devVariantsEnabled } from "../dev-variants/_registry";

export const dynamic = "force-dynamic";

const KINDS = [
  { kind: "ship", label: "Ship Notification (AA)", variant: "/dev-variants/aa" },
  { kind: "digest", label: "Weekly Digest (YY)", variant: "/dev-variants/yy" },
];

export default function DevEmailsIndex() {
  if (!devVariantsEnabled()) notFound();
  return (
    <div className="min-h-screen bg-stone-100 p-12">
      <div className="mx-auto max-w-2xl">
        <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
          dev-emails · the Notifier&rsquo;s composed output
        </div>
        <ul className="mt-8 divide-y divide-stone-200">
          {KINDS.map((k) => (
            <li key={k.kind} className="py-5 flex items-baseline justify-between gap-6">
              <Link href={`/dev-emails/${k.kind}`} className="text-lg tracking-tight font-medium hover:text-amber-600">
                {k.label}
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                <Link href={`/dev-emails/${k.kind}?format=plain`} className="hover:text-stone-900">
                  plain →
                </Link>
                <span className="mx-2">·</span>
                <Link href={k.variant} className="hover:text-stone-900">
                  variant →
                </Link>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
