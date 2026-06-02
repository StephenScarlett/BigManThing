import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import EntityList from "@/features/admin/EntityList";
import AdminTools from "@/features/admin/AdminTools";

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const [tab, setTab] = useState<"entities" | "tools">("entities");

  if (loading) {
    return <div className="text-center py-20 text-ink-muted">Loading…</div>;
  }

  if (!user || !profile?.is_admin) {
    return (
      <div className="card text-center space-y-4 max-w-md mx-auto mt-20">
        <h1 className="text-3xl">🔒</h1>
        <p className="text-ink-muted">
          {!user
            ? "Sign in with an admin account to access this page."
            : "Yuh not an admin, dread."}
        </p>
        <Link to="/" className="btn-primary inline-flex">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-display tracking-wider">Admin Panel</h1>
        <div className="flex gap-1 ml-auto">
          {(["entities", "tools"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                tab === t
                  ? "bg-brand-red text-brand-white"
                  : "bg-surface-2 text-ink-muted border border-line hover:text-ink"
              }`}
            >
              {t === "entities" ? "Entities" : "🛠 DB Tools"}
            </button>
          ))}
        </div>
      </div>
      {tab === "entities" ? <EntityList /> : <AdminTools />}
    </div>
  );
}
