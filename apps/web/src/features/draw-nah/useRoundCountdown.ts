import { useEffect, useState } from "react";
import { useDrawStore } from "./store";

export function useRoundCountdown(): number | null {
  const endsAt = useDrawStore((s) => s.room?.round_ends_at ?? null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}
