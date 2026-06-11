// M5 — the membership-less session edge (e.g. a Google sign-in by someone
// who was never invited). Honest §2.17 page-shape empty state; the only
// affordance is signing out. Kit-composed; pre-auth frame per §4-M5.
import { EmptyState } from "@/src/components/kit";
import { signOutAction } from "@/src/domain/auth/actions";
import { getCurrentUser } from "@/src/domain/auth/current-user";
import { dayStamp } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const user = await getCurrentUser();

  return (
    <div className="relative flex-1 text-stone-900 font-sans">
      <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
        Atlas
      </div>
      <main className="min-h-screen flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          <EmptyState
            shape="page"
            dayStamp={dayStamp()}
            title="Not a member."
            sentence={
              user ? (
                <>
                  You&rsquo;re signed in as{" "}
                  <span className="font-mono text-base text-stone-900">{user.email}</span>,
                  but this Atlas hasn&rsquo;t invited you.
                </>
              ) : (
                <>You&rsquo;re not signed in.</>
              )
            }
            secondary="Atlas is invite-only. Ask the Owner to send you a magic link."
            action={
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="font-mono text-xs uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer"
                >
                  sign out →
                </button>
              </form>
            }
          />
        </div>
      </main>
    </div>
  );
}
