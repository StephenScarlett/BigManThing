import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { claimGuessReward, homeContext } from "./home-api";

export function DailyReward({ edition }: { edition: string }) {
  const { user } = useAuth(),
    client = useQueryClient(),
    key = ["home", user?.id];
  const query = useQuery({
    queryKey: key,
    queryFn: homeContext,
    enabled: !!user,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    pending = useRef(false),
    activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  async function claim() {
    if (!user || pending.current) return;
    const id = user.id;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const state = await claimGuessReward(edition);
      if (activeUser.current === id) client.setQueryData(key, state);
    } catch (e) {
      if (activeUser.current === id)
        setError(
          e instanceof Error ? e.message : "Could not collect. Please retry.",
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="border border-line p-4 text-sm space-y-2">
      <p>
        Daily complete · 1 roll + 30 Lime Coins for your character and room.
      </p>
      <div className="flex flex-wrap gap-4 items-center">
        <button
          className="btn-secondary text-sm"
          disabled={busy || !query.data?.claimable_guess.includes(edition)}
          onClick={() => void claim()}
        >
          {busy
            ? "Collecting…"
            : query.isLoading
              ? "Loading reward…"
              : !query.data
                ? "Reward unavailable"
                : query.data.claimable_guess.includes(edition)
                  ? "Collect reward"
                  : "Reward collected"}
        </button>
        <Link to="/room" className="underline">
          Visit My lime
        </Link>
      </div>
      {(error || query.error) && (
        <p role="alert">
          {error ??
            (query.error instanceof Error
              ? query.error.message
              : "Could not load rewards.")}{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
