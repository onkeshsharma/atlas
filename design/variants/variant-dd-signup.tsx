// THROWAWAY — Editorial Sign-up prototype.
// The pair to L (sign-in). Pre-auth shell. First moment for someone who
// isn't an invite-flow Collaborator — i.e. a brand-new Owner.

export function VariantDDSignup() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        {/* Top-left mini wordmark */}
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Atlas
        </div>

        {/* Top-right cross-link */}
        <div className="absolute top-8 right-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Already on Atlas?{" "}
          <a className="text-stone-900 hover:text-amber-600 cursor-pointer underline-offset-4 hover:underline">
            Sign in →
          </a>
        </div>

        {/* Centered editorial sign-up */}
        <main className="min-h-screen flex items-center justify-center px-8 py-24">
          <div className="w-full max-w-md">
            {/* Day-stamp */}
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
              Tuesday · May 13
            </div>

            {/* Hero — slightly different framing than sign-in */}
            <h1 className="mt-3 text-7xl font-bold tracking-tighter leading-none">
              Begin.
            </h1>

            {/* Tagline */}
            <p className="mt-5 text-xl text-stone-700 leading-relaxed">
              Atlas is invite-only for now — but if you have an Owner code, set
              yourself up in under a minute.
            </p>

            {/* Sign-up form */}
            <section className="mt-16">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Create your account
              </div>

              <div className="mt-7 space-y-7">
                {/* Display name */}
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Your name
                  </label>
                  <input
                    type="text"
                    placeholder="What Collaborators will see"
                    className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Set a password
                  </label>
                  <input
                    type="password"
                    placeholder="At least 12 characters"
                    className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                  />
                </div>

                {/* Owner code */}
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Owner code
                  </label>
                  <input
                    type="text"
                    placeholder="ATLAS-OWNER-..."
                    className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                  />
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    Get one from{" "}
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      a friend already on Atlas
                    </a>
                    , or{" "}
                    <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                      ask for an invite
                    </a>
                    .
                  </div>
                </div>
              </div>

              {/* Primary CTA */}
              <button className="mt-10 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3.5 rounded-full shadow-sm">
                Create account →
              </button>

              {/* Or sign up with — quiet alt */}
              <div className="mt-8 flex items-center gap-4">
                <span className="flex-1 h-px bg-stone-200" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  or
                </span>
                <span className="flex-1 h-px bg-stone-200" />
              </div>

              <button className="mt-6 w-full font-mono text-xs uppercase tracking-widest text-stone-700 border border-stone-200 hover:border-stone-300 bg-white px-4 py-3.5 rounded-full transition">
                Continue with Google
              </button>
            </section>

            {/* Trust line */}
            <p className="mt-12 text-sm text-stone-500 italic leading-relaxed">
              By signing up you agree to our{" "}
              <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                terms
              </a>
              {" "}and{" "}
              <a className="text-stone-700 hover:text-amber-600 cursor-pointer">
                privacy policy
              </a>
              . Atlas only ever holds account metadata, Brief text, Result summaries
              and heartbeats — never your code.
            </p>
          </div>
        </main>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant DD · editorial sign-up
        </div>
        <div className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          <a className="hover:text-stone-700 cursor-pointer">what is atlas?</a>
          <span className="mx-2 text-stone-300">·</span>
          <a className="hover:text-stone-700 cursor-pointer">docs</a>
        </div>
      </div>
    </>
  );
}
