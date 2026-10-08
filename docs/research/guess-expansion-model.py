"""Exploratory roster model, not production rules or human playtesting.

Run from any working directory with Python 3 (standard library only).
Writes a reproducible result next to this script. No external/database writes.
"""
import json
import unicodedata
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def letter_count(name):
    # Proposed display-name contract: Unicode letters after accent decomposition.
    # Punctuation, spaces, digits, and combining marks do not contribute.
    return sum(c.isalpha() for c in unicodedata.normalize('NFD', name))


def set_feedback(guess, answer):
    if not guess or not answer:
        return 'unknown'
    g, a = set(guess), set(answer)
    return 'exact' if g == a else 'partial' if g & a else 'wrong'


def compare(guess, answer, letters=False, birth=True):
    if guess['slug'] == answer['slug']:
        return ('SOLVED',)
    out = [set_feedback(guess['known_for'], answer['known_for']),
           set_feedback(guess['specialities'], answer['specialities'])]
    g, a = guess.get('gender'), answer.get('gender')
    out.append('unknown' if g is None or a is None else 'exact' if g == a else 'wrong')
    if birth:
        g, a = guess.get('birth_year'), answer.get('birth_year')
        out.append('unknown' if g is None or a is None else 'exact' if g == a else
                   ('later_' if a > g else 'earlier_') + ('near' if abs(a-g) <= 5 else 'far'))
    if letters:
        g, a = letter_count(guess['name']), letter_count(answer['name'])
        out.append('exact' if g == a else 'longer' if a > g else 'shorter')
    return tuple(out)


def audit(pool, letters=False, birth=True):
    n = len(pool)
    matrix = [[compare(g, a, letters, birth) for a in pool] for g in pool]

    def partitions(candidates, gi):
        buckets = defaultdict(list)
        for ai in candidates:
            if ai != gi:
                buckets[matrix[gi][ai]].append(ai)
        return buckets.values()

    @lru_cache(None)
    def optimal(candidates):
        if len(candidates) == 1:
            return 1., 1
        best = None
        for gi in candidates:
            total, worst = 1., 1
            for b in partitions(candidates, gi):
                mean, mx = optimal(tuple(b))
                total += len(b) / len(candidates) * mean
                worst = max(worst, 1 + mx)
            score = (total, worst, gi)
            if best is None or score < best:
                best = score
        return best[:2]

    @lru_cache(None)
    def random_consistent(candidates):
        if len(candidates) == 1:
            return 1.
        return sum(1 + sum(len(b) / len(candidates) * random_consistent(tuple(b))
                           for b in partitions(candidates, gi))
                   for gi in candidates) / len(candidates)

    sizes, largest = [], 0
    for gi in range(n):
        buckets = Counter(matrix[gi][ai] for ai in range(n) if ai != gi)
        largest = max(largest, max(buckets.values(), default=0))
        sizes.extend(buckets[matrix[gi][ai]] for ai in range(n) if ai != gi)
    mean, worst = optimal(tuple(range(n)))
    identical = defaultdict(list)
    for p in pool:
        key = (tuple(sorted(p['known_for'])), tuple(sorted(p['specialities'])), p['gender'])
        if birth:
            key += (p['birth_year'],)
        if letters:
            key += (letter_count(p['name']),)
        identical[key].append(p['name'])
    return {
        'size': n,
        'optimal_expected_guesses': round(mean, 3),
        'worst_along_optimal_expected_strategy': worst,
        'random_consistent_expected_guesses': round(random_consistent(tuple(range(n))), 3),
        'mean_candidates_after_uniform_wrong_first_guess': round(sum(sizes)/len(sizes), 3),
        'largest_wrong_first_guess_bucket': largest,
        'identical_stored_profile_groups': [v for v in identical.values() if len(v) > 1],
        'unknown_birth_years': sum(p['birth_year'] is None for p in pool),
    }


def main():
    base = json.loads((ROOT/'packages/db/content/people-draft.json').read_text())['profiles']
    proposal = json.loads((HERE/'guess-expansion-nominations.json').read_text())
    expanded_base = [dict(p, specialities=sorted(set(
        proposal['taxonomy_proposal']['speciality_merge'].get(s, s) for s in p['specialities'])),
        primary_speciality=proposal['taxonomy_proposal']['speciality_merge'].get(
            p['primary_speciality'], p['primary_speciality'])) for p in base]
    pool = expanded_base + proposal['additions']
    assert len(base) == 32 and len(proposal['additions']) == 32 and len(pool) == 64
    assert len({p['slug'] for p in pool}) == 64
    assert len({p['name'].casefold() for p in pool}) == 64
    assert all(p['primary_lane'] in p['known_for'] and
               p['primary_speciality'] in p['specialities'] for p in pool)
    assert all(p['sources'] and all(u.startswith('https://') for u in p['sources'])
               for p in proposal['additions'])
    assert all(p['birth_year'] is None or p.get('birth_year_source') for p in proposal['additions'])
    assert all(letter_count(p['name']) > 0 for p in pool)
    kyle = next(p for p in pool if p['slug'] == 'kyleboss')
    levi = next(p for p in pool if p['slug'] == 'levi-garcia')
    assert letter_count('KyleBoss') == 8 and letter_count('Ro’dey') == 5
    assert letter_count('Certified Sampson') == 16
    assert letter_count('Levi García') == letter_count('Levi Garcia') == 10
    assert compare(kyle, levi)[3] == 'unknown'
    assert compare(kyle, levi, letters=True)[4] == 'longer'
    assert compare(levi, kyle, letters=True)[4] == 'shorter'
    assert compare(kyle, dict(kyle, name='Kyle Boss'), letters=True) == ('SOLVED',)
    implemented = json.loads((ROOT/'packages/db/content/people-expanded-draft.json').read_text())['profiles']
    results = {
        'status': 'exploratory model of draft facts; not measured player performance',
        'limitations': [
            'All candidates equally likely; both strategies know the entire roster and its facts.',
            'Optimal strategy minimizes expected guesses using only still-plausible names; reported worst follows that strategy, not a separate minimax search.',
            'Random strategy chooses uniformly among still-plausible names, not human guesses.',
            'No clues, recognition errors, search time, images, accessibility or subjective fun simulated.',
            'Birth years and memberships are draft proposals. Thirteen new years and six existing years are withheld; review can change results.',
            'Identical stored profiles and neutral-feedback ambiguity are different; no stored collision does not imply every feedback row distinguishes identity.',
            'Four/five comparisons use the same expanded comedy taxonomy to isolate the extra column.',
        ],
        'current_32_four_columns': audit(base),
        'expanded_64_four_columns': audit(pool),
        'expanded_64_five_columns': audit(pool, letters=True),
        'expanded_64_without_birth_four_design': audit(pool, birth=False),
        'expanded_64_without_birth_five_design': audit(pool, letters=True, birth=False),
        'implemented_v2_current_display_names': audit(implemented, letters=True),
        'primary_speciality_counts': dict(sorted(Counter(p['primary_speciality'] for p in pool).items())),
        'primary_lane_counts': dict(sorted(Counter(p['primary_lane'] for p in pool).items())),
        'letters': {p['name']: letter_count(p['name']) for p in pool},
    }
    output = HERE/'guess-expansion-results.json'
    output.write_text(json.dumps(results, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({k:v for k,v in results.items() if k not in ('letters','limitations')}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
