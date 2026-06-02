import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";

export default function UserMenu() {
  const { user, profile, loading, isGuest, signOut, signInWithGoogle, signInWithEmail, updateUsername, refreshProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-surface-3 animate-pulse" />;
  }

  if (!user) return null; // NameGate handles the no-user state

  const displayName = profile?.username ?? "…";
  const avatarUrl = profile?.avatar_url ?? user.user_metadata?.avatar_url;
  const initial = displayName[0]?.toUpperCase() ?? "?";

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameSaving(true);
    setNameError(null);
    const { error } = await updateUsername(newName);
    setNameSaving(false);
    if (error) { setNameError(error); return; }
    setEditingName(false);
    await refreshProfile();
  }

  async function handleLinkGoogle() {
    setMenuOpen(false);
    await signInWithGoogle();
  }

  async function handleLinkEmail(e: React.FormEvent) {
    e.preventDefault();
    setLinkBusy(true);
    const { error } = await signInWithEmail(linkEmail.trim());
    setLinkBusy(false);
    if (!error) setLinkSent(true);
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => { setMenuOpen((o) => !o); setEditingName(false); setNameError(null); }}
        className="flex items-center gap-2 rounded-lg border border-line bg-surface-2
                   px-2 py-1 hover:border-brand-red transition-colors"
        aria-label="User menu"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-brand-red text-brand-white flex items-center justify-center text-xs font-bold">
            {initial}
          </span>
        )}
        <span className="text-sm hidden sm:inline max-w-[100px] truncate">{displayName}</span>
        {isGuest && (
          <span className="text-[10px] bg-surface-3 border border-line rounded px-1 hidden sm:inline">
            guest
          </span>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 card py-2 space-y-1 shadow-lg z-50">

          {/* Identity header */}
          <div className="px-3 py-1">
            <div className="font-semibold text-sm truncate">{displayName}</div>
            {isGuest ? (
              <div className="text-xs text-ink-muted">Playing as guest</div>
            ) : (
              <div className="text-xs text-ink-muted truncate">{user.email}</div>
            )}
          </div>

          <div className="border-t border-line" />

          {/* Change username */}
          {editingName ? (
            <form onSubmit={saveName} className="px-3 py-2 space-y-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value.slice(0, 20))}
                placeholder="New username"
                className="w-full rounded border border-line bg-surface px-2 py-1 text-sm
                           focus:outline-none focus:border-brand-red"
              />
              {nameError && <p className="text-xs text-brand-red">{nameError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={nameSaving} className="btn-primary text-xs !py-1 flex-1">
                  {nameSaving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setEditingName(false)} className="btn-secondary text-xs !py-1 flex-1">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { setNewName(displayName); setEditingName(true); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-surface-3 rounded-lg transition-colors"
            >
              Change username
            </button>
          )}

          {/* Guest: link account */}
          {isGuest && (
            <>
              <div className="border-t border-line" />
              <div className="px-3 py-1 text-xs text-ink-muted">Save progress — link an account:</div>
              <button
                onClick={handleLinkGoogle}
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>🔗</span> Link Google account
              </button>
              {linkSent ? (
                <div className="px-3 py-2 text-xs text-feedback-exact">Magic link sent! Check your email.</div>
              ) : (
                <form onSubmit={handleLinkEmail} className="px-3 pb-2 space-y-1">
                  <input
                    type="email"
                    placeholder="or link email…"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    className="w-full rounded border border-line bg-surface px-2 py-1 text-xs
                               focus:outline-none focus:border-brand-red"
                  />
                  <button type="submit" disabled={linkBusy} className="btn-secondary text-xs !py-1 w-full">
                    {linkBusy ? "Sending…" : "Send magic link"}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Admin link */}
          {profile?.is_admin && (
            <>
              <div className="border-t border-line" />
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm hover:bg-surface-3 rounded-lg transition-colors"
              >
                Admin Panel
              </Link>
            </>
          )}

          <div className="border-t border-line" />
          <button
            onClick={async () => { setMenuOpen(false); await signOut(); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-surface-3 rounded-lg transition-colors text-brand-red"
          >
            {isGuest ? "Leave (sign out)" : "Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
}
