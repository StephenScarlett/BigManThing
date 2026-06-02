import { useState } from "react";
import { useAuth } from "@/lib/auth";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: Props) {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleGoogle() {
    setBusy(true);
    await signInWithGoogle();
    // redirect happens — no need to setBusy(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error: err } = await signInWithEmail(email.trim());
    setBusy(false);
    if (err) {
      setError(err);
    } else {
      setLinkSent(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm mx-4 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h2 className="text-2xl font-display tracking-wider">Sign In</h2>
          <p className="text-ink-muted text-sm mt-1">
            Play as guest anytime — sign in to save streaks &amp; stats.
          </p>
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          disabled={busy}
          className="btn w-full border border-line bg-surface-2 text-ink hover:border-brand-red
                     flex items-center justify-center gap-2"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-ink-muted text-xs">
          <span className="flex-1 border-t border-line" />
          or use any email
          <span className="flex-1 border-t border-line" />
        </div>

        {/* Magic link */}
        {linkSent ? (
          <div className="text-center space-y-2">
            <p className="text-feedback-exact font-semibold">Check yuh email! ✉️</p>
            <p className="text-ink-muted text-sm">
              We sent a magic link to <strong>{email}</strong>. Click it to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
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
            {error && <p className="text-sm text-brand-red text-center">{error}</p>}
          </form>
        )}

        {/* Guest */}
        <button onClick={onClose} className="btn-secondary w-full">
          Continue as Guest
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
