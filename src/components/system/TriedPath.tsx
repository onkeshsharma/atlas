"use client";
/**
 * M15 — variant X's mono "Tried:" detail (X:114–120) made real: the
 * not-found boundary gets no request props, so the requested path is a
 * client read of the URL that 404'd (it never changed in the browser).
 */
import { usePathname } from "next/navigation";

export function TriedPath() {
  const pathname = usePathname();
  return (
    <div className="mt-12 font-mono text-[10px] uppercase tracking-widest text-stone-400">
      Tried:{" "}
      <span className="normal-case tracking-normal text-stone-500">{pathname}</span>
    </div>
  );
}
