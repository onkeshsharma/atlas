// THROWAWAY — Editorial Sign-In prototype.
// Pre-auth shell (no sidebar, no nav). The editorial language stands on its
// own here: huge Atlas wordmark, generous whitespace, restrained form chrome.

export function VariantLSignIn() {
  return (
    <>
      <style>{`[data-testid="authed-header"]{display:none !important}`}</style>
      <div className="absolute inset-0 z-[80] overflow-auto bg-amber-50/30 text-stone-900 font-sans">
        {/* Top-left mini wordmark — the only chrome on the page */}
        <div className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          Atlas
        </div>

        {/* Top-right quiet sign-up link */}
        <div className="absolute top-8 right-8 font-mono text-xs uppercase tracking-widest text-stone-500">
          New here?{" "}
          <a className="text-stone-900 hover:text-amber-600 cursor-pointer underline-offset-4 hover:underline">
            Sign up →
          </a>
        </div>

        {/* Centered editorial sign-in */}
        <main className="min-h-screen flex items-center justify-center px-8">
          <div className="w-full max-w-md">
            {/* Editorial day-stamp / opening line */}
            <div className="text-xs font-mono uppercase tracking-widest text-stone-500">
              Tuesday · May 13
            </div>

            {/* Hero wordmark + period */}
            <h1 className="mt-3 text-7xl font-bold tracking-tighter leading-none">
              Atlas.
            </h1>

            {/* Tagline */}
            <p className="mt-5 text-xl text-stone-700 leading-relaxed">
              A quiet place to drive your project. Tell the Engine what to do; review
              what it ships.
            </p>

            {/* Sign-in form */}
            <section className="mt-16">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-stone-500">
                Sign in
              </div>

              <div className="mt-7 space-y-7">
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
                  <div className="flex items-baseline justify-between">
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      Password
                    </label>
                    <a className="font-mono text-[10px] uppercase tracking-widest text-stone-700 hover:text-amber-600 cursor-pointer">
                      forgot? →
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="mt-2 w-full bg-transparent border-b border-stone-300 py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition"
                  />
                </div>
              </div>

              {/* Primary CTA */}
              <button className="mt-10 w-full font-mono text-xs uppercase tracking-widest text-stone-50 bg-stone-900 hover:bg-stone-700 px-4 py-3.5 rounded-full shadow-sm transition">
                Sign in →
              </button>

              {/* Or sign in with — quiet alt */}
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

            {/* Quiet editorial note */}
            <p className="mt-12 text-sm text-stone-500 italic leading-relaxed">
              Atlas is invite-only. If you don&rsquo;t have an invite, ask the
              Owner of the Project you were working on to send you one.
            </p>
          </div>
        </main>

        {/* Editorial colophon */}
        <div className="absolute bottom-8 left-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          atlas · v1.3 design lab · variant L · editorial sign-in
        </div>

        {/* Right-bottom quiet meta */}
        <div className="absolute bottom-8 right-8 font-mono text-[10px] uppercase tracking-widest text-stone-400">
          <a className="hover:text-stone-700 cursor-pointer">privacy</a>
          <span className="mx-2 text-stone-300">·</span>
          <a className="hover:text-stone-700 cursor-pointer">terms</a>
          <span className="mx-2 text-stone-300">·</span>
          <a className="hover:text-stone-700 cursor-pointer">docs</a>
        </div>
      </div>
    </>
  );
}
