"""Reproducible proposal model; no database writes or gameplay configuration changes.

Run from any directory. Uses standard-library Python and writes the sibling result JSON.
Models a 24-hour return cadence, not frame-level fishing skill or human retention.
"""
from __future__ import annotations

import json
import random
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
C = json.loads((HERE / "farm-economy-inputs.json").read_text())
TIERS = ["Common", "Rare", "Epic", "Legendary"]


def pick(rng, pool, floor="Common"):
    choices = [x for x in pool if TIERS.index(x["rarity"]) >= TIERS.index(floor)]
    return rng.choices(choices, weights=[x["weight"] for x in choices], k=1)[0]


def streak_bonus(day):
    return max((int(bps) for threshold, bps in C["streak_coin_bonus_bps"].items()
                if day >= int(threshold)), default=0)


def order_goods(goods):
    n, needed = C["weekly_orders"]["quantity_each"], C["weekly_orders"]["minimum_species_each"]
    if len(goods) < n or len({x["id"] for x in goods}) < needed:
        return [], goods
    ordered = sorted(goods, key=lambda x: (x["sale"], x["id"]))
    selected, rest = ordered[:n], ordered[n:]
    if len({x["id"] for x in selected}) < needed:
        different = next(i for i, x in enumerate(rest) if x["id"] != selected[0]["id"])
        selected[-1], rest[different] = rest[different], selected[-1]
    assert len(selected) == n and len({x["id"] for x in selected}) >= needed
    return selected, rest


def simulate(player, main, house_bps, upgrade):
    rng = random.Random(C["seed"] + player)
    wallet, rolls = C["welcome"]["coins"], C["welcome"]["rolls"]
    planted = [pick(rng, C["crops"]) for _ in range(C["welcome"]["planted_seeds"])]
    plots = C["welcome"]["planted_seeds"]
    upgrades, earned, seed_spend, investment = [], 0, 0, 0
    bonus_remainder, matured, legendary_crops, orders, failed_orders = 0, 0, 0, 0, 0
    deferred_floors, free_stock = [], 0
    for day in range(1, C["days"] + 1):
        crops = planted
        previous = matured
        matured += len(crops)
        legendary_crops += sum(x["rarity"] == "Legendary" for x in crops)
        track = C["seed_discovery_track"]
        for step in range(previous // track["step"] + 1, matured // track["step"] + 1):
            position = (step * track["step"]) % track["cycle"]
            deferred_floors.append("Legendary" if position == 0 else
                                   "Epic" if position == track["epic_at"] else "Rare")
        catches = C["daily_free_catches"] + (C["main_daily"]["catches"] if main else 0)
        fish = [pick(rng, C["fish"]) for _ in range(catches)]
        fixed_coins = C["main_daily"]["coins"] if main else 0
        if main:
            rolls += C["main_daily"]["rolls"] + C["streak_milestone_rolls"].get(str(day), 0)
        ordered_base, quest_coins = 0, 0
        if day % 7 == 0:
            for kind in ("crops", "fish"):
                selected, surplus = order_goods(crops if kind == "crops" else fish)
                if selected:
                    ordered_base += sum(x["sale"] for x in selected)
                    quest_coins += C["weekly_orders"]["coins_each"]
                    rolls += C["weekly_orders"]["rolls_each"]
                    orders += 1
                    if kind == "crops":
                        crops = surplus
                    else:
                        fish = surplus
                else:
                    failed_orders += 1
        raw_sales = sum(x["sale"] for x in crops + fish)
        bps = min(C["max_combined_bonus_bps"], house_bps + (streak_bonus(day) if main else 0))
        # Preserve fractional bonus value in a 1/10000-coin carry; never round up per sale.
        eligible = fixed_coins + min(raw_sales, C["daily_bonus_sales_base_limit"])
        bonus_numerator = eligible * bps + bonus_remainder
        bonus, bonus_remainder = divmod(bonus_numerator, 10000)
        income = raw_sales + ordered_base + fixed_coins + quest_coins + bonus
        wallet += income
        earned += income
        free_seeds = C["daily_free_seeds"] + (C["main_daily"]["seeds"] if main else 0)
        free_stock += free_seeds
        if upgrade and len(upgrades) < len(C["plot_upgrades"]):
            target = C["plot_upgrades"][len(upgrades)]
            reserve = max(0, target["plots"] - free_stock - len(deferred_floors)) * C["seed_price"]
            if wallet >= target["price"] + reserve:
                wallet -= target["price"]
                investment += target["price"]
                plots = target["plots"]
                upgrades.append(day)
        floors = deferred_floors[:plots]
        deferred_floors = deferred_floors[plots:]
        free_count = min(free_stock, plots - len(floors))
        free_stock -= free_count
        paid_count = min(plots - len(floors) - free_count, wallet // C["seed_price"])
        cost = paid_count * C["seed_price"]
        wallet -= cost
        seed_spend += cost
        planted = [pick(rng, C["crops"], floor) for floor in floors]
        planted += [pick(rng, C["crops"]) for _ in range(free_count + paid_count)]
        assert wallet >= 0 and len(planted) <= plots
    return {"wallet": wallet, "net_earned": earned - seed_spend,
            "seed_spend": seed_spend, "land_investment": investment,
            "rolls": rolls, "plots": plots, "upgrade_days": upgrades,
            "matured": matured, "legendary_crops": legendary_crops,
            "orders": orders, "failed_orders": failed_orders,
            "bonus_remainder_bp": bonus_remainder, "unplanted_free_seeds": free_stock + len(deferred_floors)}


def describe(rows):
    keys = ["wallet", "net_earned", "seed_spend", "land_investment", "rolls", "plots",
            "matured", "legendary_crops", "orders", "failed_orders", "unplanted_free_seeds"]
    result = {k + "_mean": round(statistics.mean(x[k] for x in rows), 3) for k in keys}
    for i, target in enumerate(C["plot_upgrades"]):
        days = [x["upgrade_days"][i] for x in rows if len(x["upgrade_days"]) > i]
        result[str(target["plots"]) + "_plots"] = {
            "fraction_reached": round(len(days) / len(rows), 5),
            "median_day": statistics.median(days) if days else None,
            "p90_day": sorted(days)[max(0, int(.9 * len(days)) - 1)] if days else None}
    return result


def main():
    for pool in (C["crops"], C["fish"]):
        assert sum(x["weight"] for x in pool) == 100
        assert len({x["id"] for x in pool}) == len(pool)
    assert streak_bonus(2) == 0 and streak_bonus(3) == 500 and streak_bonus(14) == 1500
    assert all(x["sale"] > C["seed_price"] for x in C["crops"])
    # Even if every paid catch received the maximum bonus, its expected resale
    # remains below bait cost; this is an expectation, not a guarantee per fish.
    fish_ev = sum(x["weight"] * x["sale"] for x in C["fish"]) / 100
    assert fish_ev * (1 + C["max_combined_bonus_bps"] / 10000) < C["proposed_paid_bait_price"]
    # Identical species do not magically satisfy variety orders.
    assert not order_goods([C["crops"][0]] * 6)[0]
    assert len(order_goods([C["crops"][0]] * 5 + [C["crops"][1]])[0]) == 5
    rng = random.Random(C["seed"])
    assert all(TIERS.index(pick(rng, C["crops"], "Rare")["rarity"]) >= 1 for _ in range(100))
    assert pick(rng, C["crops"], "Legendary")["rarity"] == "Legendary"
    names = [("farm_only_6_plots", False, 0, False), ("main_and_farm_6_plots", True, 0, False),
             ("farm_only_land_progression", False, 0, True), ("main_and_farm_land_progression", True, 0, True),
             ("farm_only_max_house_land_progression", False, 1000, True),
             ("main_and_farm_max_house_land_progression", True, 1000, True)]
    scenarios = {}
    for name, core, house, upgrade in names:
        rows = [simulate(i, core, house, upgrade) for i in range(C["players_per_scenario"])]
        assert all(x["wallet"] == C["welcome"]["coins"] + x["net_earned"] - x["land_investment"] for x in rows)
        assert all(0 <= x["bonus_remainder_bp"] < 10000 for x in rows)
        assert all(x["rolls"] <= (50 if core else 11) for x in rows)
        scenarios[name] = describe(rows)
    expected_seed = sum(x["weight"] * x["sale"] for x in C["crops"]) / 100
    expected_fish = sum(x["weight"] * x["sale"] for x in C["fish"]) / 100
    output = {"config_version": C["version"], "seed": C["seed"], "players_per_scenario": C["players_per_scenario"],
              "days": C["days"], "assumptions": C["assumptions"],
              "regular_seed_expected_sale": expected_seed, "regular_seed_expected_net": round(expected_seed - C["seed_price"], 3),
              "regular_fish_expected_sale": expected_fish,
              "paid_bait_expected_net_no_bonus": round(expected_fish - C["proposed_paid_bait_price"], 3),
              "paid_bait_expected_net_if_fully_max_boosted": round(expected_fish * 1.25 - C["proposed_paid_bait_price"], 3),
              "regular_seed_no_legendary_probability": {str(n): round(.99 ** n, 6) for n in (30, 60, 120)},
              "separate_vs_additive_max_multiplier": {"separate": 1.1 * 1.15, "recommended_additive": 1.25},
              "scenarios": scenarios}
    (HERE / "farm-economy-results.json").write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
