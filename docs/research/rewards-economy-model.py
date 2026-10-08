"""Development economy analysis, not measured player retention or production odds.

Python standard library only. Run from any directory; writes results beside itself.
The exact first-Legendary calculation tracks the Epic counter and conditions on
not yet receiving a Legendary. Collection estimates use 25,000 seeded trials.
"""
import json
import random
from pathlib import Path
from statistics import mean

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def first_legendary():
    # Probability mass among runs with no Legendary yet, indexed by Epic misses.
    states = {0: 1.0}
    survival = [1.0]
    for pull in range(1, 41):
        nxt = {}
        for epic, mass in states.items():
            if pull == 40:
                continue
            p_epic, p_low = (5/6, 0) if epic == 9 else (.10, .88)
            nxt[0] = nxt.get(0, 0) + mass*p_epic
            if p_low:
                nxt[epic+1] = nxt.get(epic+1, 0) + mass*p_low
        states = nxt
        survival.append(sum(states.values()))
    return {
        'expected_pulls': round(sum(survival[:-1]), 3),
        'median_pulls': next(n for n, s in enumerate(survival) if 1-s >= .5),
        'p90_pulls': next(n for n, s in enumerate(survival) if 1-s >= .9),
        'hard_max_pulls': 40,
        'chance_by_pull': {str(n): round((1-survival[n])*100, 3) for n in (3, 10, 20, 30, 39, 40)},
        'no_guarantees_mean_at_base_2_percent': 50,
    }


def collections(catalog):
    rng = random.Random(20261006)
    pools = [[i['id'] for i in catalog if i['family'] == 'wardrobe' and i['rarity'] == r] for r in range(4)]
    samples = {n: {'unique': [], 'coins': [], 'complete': 0} for n in (3, 10, 20, 40, 80)}
    trials = 25000
    for _ in range(trials):
        owned, epic, legendary, coins = set(), 0, 0, 0
        for n in range(1, 81):
            u = rng.random()
            if legendary == 39:
                tier = 3
            elif epic == 9:
                tier = 2 if u < 5/6 else 3
            else:
                tier = 0 if u < .60 else 1 if u < .88 else 2 if u < .98 else 3
            options = pools[tier]
            if legendary == 39:
                options = [i for i in options if i not in owned] or options
            item = rng.choice(options)
            if item in owned:
                coins += (5, 15, 40, 100)[tier]
            owned.add(item)
            epic = 0 if tier >= 2 else epic+1
            legendary = 0 if tier == 3 else legendary+1
            if n in samples:
                row = samples[n]
                row['unique'].append(len(owned))
                row['coins'].append(coins)
                row['complete'] += len(owned) == sum(map(len, pools))
    return {
        'seed': 20261006, 'trials': trials, 'pool_sizes_by_rarity': list(map(len, pools)),
        'milestones': {str(n): {
            'mean_unique_items': round(mean(s['unique']), 3),
            'mean_duplicate_coins': round(mean(s['coins']), 3),
            'percent_full_eight_item_collection': round(s['complete']/trials*100, 3),
        } for n, s in samples.items()},
    }


def calendar(use_pan):
    rolls, coins, unlocked, pan_days = 3, 90, False, 0
    days = []
    for day in range(1, 29):
        rolls += 1; coins += 30
        rolls += {3: 1, 7: 2, 14: 3, 28: 5}.get(day, 0)
        if use_pan and not unlocked and coins >= 150:
            coins -= 150; unlocked = True
        if unlocked:
            rolls += 1; coins += 10; pan_days += 1
        days.append({'day': day, 'rolls_earned_total': rolls, 'unspent_coins': coins})
    return {
        'day_28_rolls_including_welcome': rolls, 'day_28_coins_after_game_unlock': coins,
        'pan_rounds_completed': pan_days,
        'first_40_rolls_earned_day': next(d['day'] for d in days if d['rolls_earned_total'] >= 40),
        'days': days,
    }


def main():
    catalog = json.loads((ROOT/'packages/db/content/home-items.json').read_text())
    result = {
        'status': 'pilot hypotheses; no observed players or retention',
        'assumptions': [
            'One fixed eight-item family, with 3 Common, 2 Rare, 2 Epic and 1 Legendary.',
            'Every earned roll spent in that family; no purchases, item rotations, trades or paid rolls.',
            'Epic guarantee within 10; Legendary within 40; higher guarantee takes priority.',
            'Calendars assume every published Guess daily and, after unlocking, every Pan daily is completed.',
            'Welcome included once. Calendar excludes duplicate coins, leaderboard bonuses and outages.',
            'Room and wardrobe have separate guarantee counters. Splitting rolls slows each family.',
            'These are supply/collection calculations, not evidence that a loop is fun or improves retention.',
        ],
        'first_legendary_exact': first_legendary(),
        'collection_simulation': collections(catalog),
        'guess_only_calendar': calendar(False),
        'guess_and_pan_calendar': calendar(True),
    }
    (HERE/'rewards-economy-results.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({k: ({a:b for a,b in v.items() if a != 'days'} if isinstance(v,dict) else v)
                      for k,v in result.items() if k != 'assumptions'}, indent=2))


if __name__ == '__main__':
    main()
