import { Routes, Route, Link, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HomePage from "@/pages/HomePage";
import GuessNahPage from "@/pages/GuessNahPage";
import DrawNahPage from "@/pages/DrawNahPage";
import { ThemeToggle } from "@/lib/theme";
import UserMenu from "@/features/auth/UserMenu";
import NameGate from "@/features/auth/NameGate";
import { useAuth } from "@/lib/auth";

const AdminPage = lazy(() => import("@/pages/AdminPage"));

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show full-screen gate until we have a session (real or anonymous)
  if (!loading && !user) return <NameGate />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 md:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/guess" element={<GuessNahPage />} />
              <Route path="/draw" element={<DrawNahPage />} />
              <Route path="/draw/:roomCode" element={<DrawNahPage />} />
              <Route path="/admin" element={<Suspense fallback={<div className="text-center py-20 text-ink-muted">Loading…</div>}><AdminPage /></Suspense>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-surface/80 border-b border-line">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl tracking-wider flex items-baseline gap-1">
          <span className="text-brand-red">BIG</span>
          <span className="text-ink">MAN</span>
          <span className="text-brand-red">THING</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 text-sm">
            <NavLink to="/guess" active={pathname.startsWith("/guess")}>
              Guess Nah
            </NavLink>
            <NavLink to="/draw" active={pathname.startsWith("/draw")}>
              Draw Nah
            </NavLink>
          </nav>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`rounded-lg px-3 py-1.5 transition-colors ${
        active
          ? "bg-brand-red text-brand-white"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line py-6 text-center text-xs text-ink-muted">
      BigManThing &middot; Made for Trinis with love &middot; {new Date().getFullYear()}
    </footer>
  );
}

function NotFound() {
  return (
    <div className="card text-center">
      <h1 className="text-3xl mb-2">404</h1>
      <p className="text-ink-muted">Doh have nothing here, dread.</p>
      <Link to="/" className="btn-primary mt-4 inline-flex">
        Go home
      </Link>
    </div>
  );
}
