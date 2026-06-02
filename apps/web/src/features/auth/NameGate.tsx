import { useState } from "react";
import { useAuth } from "@/lib/auth";

/**
 * Full-screen landing gate shown when there is no active session.
 * Replaces the old AuthModal — this is the unified identity entry point.
 * Guest → signInAnonymously → DB trigger assigns Guest_XXXX username.
 * The gate disappears automatically once useAuth().user is non-null.
 */
export default function NameGate() {
  const { signInAsGuest, signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  async function handleGuest() {
    setBusy(true);
    await signInAsGuest();
    // auth state change will set user → gate unmounts
  }

  async function handleGoogle() {
    setBusy(true);
    await signInWithGoogle();
    // redirect happens
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error: err } = await signInWithEmail(email.trim());
    setBusy(false);
    if (err) setError(err);
    else setLinkSent(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center
                    bg-surface px-4 text-center">
      {/* Brand */}
      <h1 className="text-6xl md:text-8xl font-display tracking-wider mb-2">
        <span className="text-brand-red">Big</span>
        <span className="text-ink">Man</span>
        <span className="text-brand-red">Thing</span>
      </h1>
      <p className="text-ink-muted text-lg mb-10">Trini brain games. Daily. Free.</p>

      <div className="w-full max-w-sm space-y-3">
        {/* Guest — primary CTA */}
        <button
          onClick={handleGuest}
          disabled={busy}
          className="btn-primary w-full text-lg py-3 disabled:opacity-60"
        >
          Play as Guest
        </button>

        <div className="flex items-center gap-3 text-ink-muted text-xs py-1">
          <span className="flex-1 border-t border-line" />
          or sign in to save progress
          <span className="flex-1 border-t border-line" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          disabled={busy}
          className="btn w-full border border-line bg-surface-2 text-ink hover:border-brand-red
                     flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Magic link toggle */}
        {!showEmail ? (
          <button
            onClick={() => setShowEmail(true)}
            className="btn-secondary w-full"
          >
            Sign in with Email
          </button>
        ) : linkSent ? (
          <div className="card text-center space-y-2">
            <p className="text-feedback-exact font-semibold">Check yuh email! ✉️</p>
            <p className="text-ink-muted text-sm">
              Magic link sent to <strong>{email}</strong>. Click it to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-2">
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink
                         placeholder:text-ink-muted focus:outline-none focus:border-brand-red"
            />
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Sending…" : "Send Magic Link"}
            </button>
            {error && <p className="text-sm text-brand-red">{error}</p>}
          </form>
        )}
      </div>

      <p className="mt-8 text-xs text-ink-muted max-w-xs">
        Guest accounts save locally — sign in with Google or email to keep
        your streaks across devices.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}
