import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="text-center pt-6">
        <h1 className="text-5xl md:text-7xl">
          <span className="text-brand-red">Big</span>
          <span className="text-ink">Man</span>
          <span className="text-brand-red">Thing</span>
        </h1>
        <p className="mt-3 text-ink-muted text-lg">
          Trini brain games. Daily. Free.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <ModeTile
          to="/guess"
          title="Guess Nah"
          tagline="Daily mystery. As many guesses as yuh need."
        />
        <ModeTile
          to="/draw"
          title="Draw Nah"
          tagline="Lime with friends. Draw. Guess. Laugh."
        />
      </section>

      <section className="card">
        <h2 className="text-2xl mb-3">How it work?</h2>
        <ol className="list-decimal list-inside text-ink-muted space-y-1">
          <li>Pick a mode.</li>
          <li>Play the daily, or start a private room with friends.</li>
          <li>Share your result on the WhatsApp group chat.</li>
        </ol>
      </section>
    </div>
  );
}

function ModeTile({
  to,
  title,
  tagline,
}: {
  to: string;
  title: string;
  tagline: string;
}) {
  return (
    <Link
      to={to}
      className="card relative overflow-hidden block hover:border-brand-red transition-colors"
    >
      <div className="text-3xl font-display tracking-wider">{title}</div>
      <div className="text-ink-muted mt-2">{tagline}</div>
    </Link>
  );
}
