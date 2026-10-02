# Guess Nah: larger roster and a fifth comparison

Researched: 2 October 2026. Status: proposal, not an applied rules version or an approved seed.

The owner now wants another comparison column and roughly five recognisable people per speciality, including KyleBoss and Levi García. This revises the earlier small-roster/two-cricketer proposal. The current development application still has **32 draft people, four comparisons and people-v1 rules**; this research does not change Supabase or gameplay.

Recommendation: nominate **64 people**, with at least five in nine strong core specialities; preserve exceptional people in smaller specialities; merge stage/digital comedy into **Comedy**; test **Letters in the displayed name** as a fifth comparison. Keep eight attempts, neutral unknowns, genuine career overlap, free clues and canonical identity wins. Treat the expanded roster as a recognisability shortlist rather than a ranking of T&T popularity.

## Why five can work

Five gives a speciality a real deduction step without reproducing the original cricket-heavy catalogue. With five cricketers, identifying Cricket leaves at most five members of that speciality in this proposed bank. Born-year direction, name-length direction and a sourced achievement clue can narrow the group. Players still need to recognise the remaining names, understand feedback and discover the catalogue.

A literal minimum of five for every current speciality would require at least 100 primary slots across 20 specialities. Some would be weaker nominations added to satisfy a quota. Instead, use a **target of five, maximum seven per primary speciality**, and **five cricket memberships**, with reviewed exceptions for smaller iconic groups. There is no reason to remove Nicki Minaj because we cannot justify four equally familiar T&T rappers, or to dilute the pool with obscure javelin throwers. These are proposals for version two, not current publication rules. Five is an editorial target, not a database constraint forcing dubious entries.

The bank should be stable and browsable. Expand when recognisable, sourced candidates improve it; avoid unannounced obscure additions to ranked dailies.

## Proposed core groups

These are **primary speciality counts**. Secondary memberships overlap and must remain visible. Every retained and new entry needs review; retaining a draft does not approve it.

| Speciality | Count | Proposed people |
| --- | ---: | --- |
| Soca | 7 | Machel Montano; Kees Dieffenthaller (Kes); Fay-Ann Lyons; **Patrice Roberts; Bunji Garlin; Destra Garcia; Nailah Blackman** |
| Calypso | 5 | Calypso Rose; Mighty Sparrow; **David Rudder; Lord Kitchener; Black Stalin** |
| Chutney / chutney soca | 6 | Sundar Popo; **Rikki Jai; Ravi B; Drupatee Ramgoonai; KI Persad; Raymond Ramnarine** |
| Cricket | 5 | Brian Lara; Sunil Narine; **Dwayne Bravo; Kieron Pollard; Nicholas Pooran** |
| Football | 5 | Dwight Yorke; **Levi García; Kenwyne Jones; Stern John; Shaka Hislop** |
| Sprinting | 5 | Ato Boldon; Kelly-Ann Baptiste; **Richard Thompson; Michelle-Lee Ahye; Jereem Richards** |
| Comedy | 6 | Certified Sampson; Ro’dey; Learie Joseph; **KyleBoss; Jr Lee; Simmy de Trini** |
| Political leadership | 5 | Kamla Persad-Bissessar; Keith Rowley; Eric Williams; **Patrick Manning; Basdeo Panday** |
| Writing | 5 | V. S. Naipaul; Michael Anthony; Earl Lovelace; **Sam Selvon; Monique Roffey** |

Bold names are new nominations. These nine groups contain 49 people. The remaining 15 preserve distinct careers:

| Primary speciality | People |
| --- | --- |
| Rap | Nicki Minaj |
| R&B / pop | Billy Ocean |
| Javelin | Keshorn Walcott |
| Cycling | Nicholas Paul |
| Acting | Winston Duke; **Geoffrey Holder** |
| Musical theatre | Heather Headley |
| Pageantry | Wendy Fitzwilliam; Janelle Penny Commissiong |
| Broadcasting / presenting | Errol Fabien; Ian Alleyne; **Adonai Dieu (formerly Daniel Loveless)** |
| Mas design | Peter Minshall |
| Dance | Beryl McBurnie |
| Cooking | **Chef Jason Peru** |

This keeps contemporary creators, women, older cultural figures and several sports in the same game. It still leans toward music and sport: music 20/64, sport 17/64, online/broadcast 8/64, arts/literature 7/64, screen/stage 6/64, public life 5/64 and food/cooking 1/64 by primary lane. Test Tobago, Trinidad and diaspora players, including non-sport audiences. These counts do not establish demographic representativeness or popularity across age groups.

Voice is a strong soca reserve. Adding him immediately takes Soca to eight; choose between him and a current nominee based on recognition. Hasely Crawford is a sprinting reserve, not a weaker nominee; the proposed five already span generations. If a nominee fails review, use a reviewed reserve or temporarily keep four rather than lower admission standards.

## Taxonomy: people can have more than one career

**Known for** describes the public arena: Music, Sport, Public life, Screen/stage, Online/broadcast, Arts/literature, with Food/cooking proposed as a seventh value. **Speciality** describes the activity: Soca, Football, Comedy, Writing, etc. Both are sets. A partial match means an actual membership overlaps, not that unrelated activities are vaguely similar.

Merge `digital_comedy` and `stage_comedy` into `comedy` in a new vocabulary version. Known for retains online, stage and broadcast career distinctions. Learie should not be relabelled an online creator to fill a quota. Jr Lee's biography describes stand-up and acting in *The Office Movers*: Comedy/Acting and Online/broadcast + Screen/stage are credible proposals. Simmy's TV interview and stand-up coverage support Comedy/Broadcasting and online/broadcast + stage. Errol retains real comedy overlap without becoming a seventh primary comedian. Sources: [Jr Lee](https://www.jrleecomedy.com/about), [Simmy interview](https://www.ttt.live/in-depth-with-dike-rostant-simmy-more-than-entertainment/), [Simmy stand-up](https://newsday.co.tt/2024/05/26/simmy-de-trini-celebrates-7-years-of-stand-up-comedy/).

Rikki Jai illustrates why a strict two-speciality limit can omit real careers. UTT's 2026 account records a Calypso Monarch placing alongside his chutney/soca career. The model includes all three, requiring a version-two schema/editor change. Review a maximum of three substantial memberships as a starting proposal; retain the full sourced biography separately. Apply the same major-career threshold to David Rudder's soca, Dwayne Bravo's music and Shaka Hislop's broadcasting. Their tentative single-speciality model profiles do not reject the other careers. Sources: [UTT](https://utt.edu.tt/?article_key=10194&articles=1&wk=1), [Bocas Rikki Jai](https://www.bocaslitfest.com/participant/rikki-jai/).

Newer sources identify Daniel Loveless publicly as **Adonai Dieu**. The proposed display uses that name with Daniel Loveless and Daniel Roberts as aliases. *What Yuh Know* street quizzes/presenting should not be forced into sketch-comedy membership. Sources: [2025 reporting](https://newsday.co.tt/2025/09/18/from-fame-to-faith-becoming-adonai-dieu-3/), [his interview](https://coriesheppardpodcast.buzzsprout.com/1725191/episodes/18197875-adonai-dieu-why-he-left-the-past-behind-the-real-story-the-corie-sheppard-podcast). Recheck the public name before edition review.

## Fifth-column comparison

| Candidate | Deduction value | Problem | Recommendation |
| --- | --- | --- | --- |
| **Letters in displayed name** | Exact / longer / shorter; universal; independent of birthdays; differentiates creators and sporting peers | Partly a word puzzle; stage-name length/honorifics must be explicit; can make some answers quick | **Prototype first** |
| Career-start / debut decade | Meaningful earlier/later generations | First post, professional match, release, exhibition and elected office are different milestones; many creators lack a reliable date; often duplicates Born | Best biographical alternative after definitions/evidence |
| Birth region | Tobago / Trinidad regions / outside T&T | Birth hospital, childhood hometown and current home differ; missing creator evidence; many names share a region | Sourced fact or clue; avoid fabricated geography |
| Specific role | Goalkeeper vs forward; wicketkeeper vs all-rounder | Useful in sports, redundant/inconsistent elsewhere | Clue or separate sports pack |
| Awards / reach / status / current affiliation | Strong individual clue possibilities | Arbitrary cross-profession tiers, changing figures/office, unequal historical opportunities | Avoid as a universal graded column |

Prototype **Known for · Speciality · Born · Gender · Letters**. Keep a no-Gender variant for human testing; adding Letters does not permanently commit the game to Gender. The original fields were implemented before playtests and remain revisable.

Career era is the more thematic alternative if it can be sourced consistently. It is not ready as an accurate universal field: Jr Lee gives a 2013 comedy start; political sources describe different election/entry milestones. A creator's earliest discoverable post does not prove their career debut. If era wins testing, collect `milestone_type`, evidence and approved year per person, then derive the decade. Unknown stays neutral; never infer a debut from age.

### Exact Letters contract

- Count letters in the **frozen name shown to players**. Ignore spaces, punctuation, digits and combining accent marks. `Levi García` = 10, also `Levi Garcia`; `Ro’dey` = 5. Count Unicode letters, not bytes/code units.
- Green for exact count; `↑ longer` when the answer has more letters, `↓ shorter` for fewer. No arbitrary near band in the initial prototype.
- Show the count in autocomplete and the roster browser, avoiding mental counting of long names.
- Aliases resolve to canonical identity and never alter the count. `Samson`, `Jamel Sampson`, `Kyle Boss`, or `KI` use the frozen game's canonical display label. Do not rename people to manufacture counts.
- Choose labels before testing: `KI Persad` vs `KI`, `Kees Dieffenthaller` vs `Kes`, and established public honorifics. The model retains existing labels and uses `KI Persad`, `Chef Jason Peru` and `Lord Kitchener`. Changing them requires rerunning it and only affects future editions.
- Freeze the derived count and counting-rule version in each edition. PostgreSQL and JavaScript must agree on accents/punctuation. Reject a no-letter display name. Derived length needs no biography claim, but the public name does.
- Five matching cells still do not win for the wrong canonical ID. Neutral unknowns remain neutral; shared profiles still require free specific clues.

| Person | Draft Born | Letters | Differentiation |
| --- | ---: | ---: | --- |
| Ro’dey | Unknown | 5 | Distinct from KyleBoss/Sampson despite withheld years |
| KyleBoss | Unknown | 8 | Between Ro’dey and Sampson without an invented birthday |
| Certified Sampson | Unknown | 16 | Longer than both creator examples |
| Jr Lee | 1996 | 5 | Same length as Ro’dey; different career sets and sourced year |
| Levi García | 1997 | 10 | Different count and generation from other football nominees |
| Dwight Yorke | 1971 | 11 | Length and birth direction provide different information |
| Kenwyne Jones | 1984 | 12 | Distinct length from Levi/Dwight/Stern |
| Stern John | 1976 | 9 | Shorter than Levi |
| Shaka Hislop | 1969 | 11 | Same length as Dwight; Born and a goalkeeper clue matter |

The task becomes cultural recognition plus understandable deduction. Length cannot fix unfamiliar names, weak clues or a confusing screen. Useful aliases, roster discovery and legible directions are part of this design.

## KyleBoss and Levi: admission assessment

**KyleBoss: viable conditional nominee.** The owner nomination, a local comedians roundup and embedded branded comedy support a recognition trial. Proposed Online/broadcast, Comedy, Born unknown, display KyleBoss. Follower aggregators are visibility signals, not population surveys. No reliable legal name, birth year or hometown was verified. Do not import the roundup's uncorroborated “Kyle Mark” claim. Verify an authentic public account/work and select a recognisable source-backed skit/series clue. Sources: [local roundup](https://lifeintrinidadandtobago.com/articles/entertainment/the-laughter-leaders-trending-comedians-in-trinidad-tobago/), [embedded branded work](https://www.uncommoncaribbean.com/st-eustatius/big-stone-statia/).

**Levi García: strong football nominee.** UEFA gives T&T and a 1997 birth year. He broadens football beyond the older World Cup generation. Proposed Sport, Football, Born 1997, Letters 10. AEK's February 2025 transfer announcement can support a dated historical clue after review, not a graded current-club field. Sources: [UEFA](https://ar.uefa.com/uefaconferenceleague/clubs/players/250099503--levi-garcia/), [AEK](https://www.aekfc.gr/newsdetails/parachorisi-livai-gkarsia-sti-spartak-moschas-132363.htm?lang=en&path=-1608657345).

## Research register: all 32 additions

“Year lead” is a draft modelling input, not approved content. A dash means withheld. URLs, source limitations, aliases and review notes are in [the nomination JSON](research/guess-expansion-nominations.json). Readable evidence and field review are required before approved imports. Indexed-only, timed-out or blocked sources are identified there.

| New nominee | Year lead | Principal source / direction |
| --- | ---: | --- |
| Patrice Roberts | — | [MusicTT](https://globaltrinidadandtobago.com/our-music-directory/patrice-roberts/); official artist work links |
| Bunji Garlin | 1978 | [VP Records](https://vprecords.com/artist/bunji-garlin/) |
| Destra Garcia | — | [Official artist-channel work](https://www.youtube.com/watch?v=It03pJwZiZw); named Newsday coverage |
| Nailah Blackman | — | [Bocas](https://www.bocaslitfest.com/participant/nailah-blackman/); publisher bio |
| David Rudder | 1953 | [Pan Trinbago](https://ipv4.pantrinbago.co.tt/Media/NewsArticles/TabId/182/ArtMID/723/ArticleID/406/Rudder-and-Skiffle-in-Concert.aspx); press corroboration |
| Lord Kitchener | 1922 | [NALIS](https://www.nalis.gov.tt/resources/tt-content-guide/calypso/calypso-greats/); archival year lead |
| Black Stalin | 1941 | [NALIS bio](https://www.nalis.gov.tt/blog/black-stalin-the-caribbean-man/), indexed; obtain readable evidence |
| Rikki Jai | — | [UTT 2026](https://utt.edu.tt/?article_key=10194&articles=1&wk=1); Bocas |
| Ravi B | — | [Karma](https://karmatt.com/biography/), partly historical |
| Drupatee Ramgoonai | — | [Named interview](https://archives.newsday.co.tt/2009/01/19/drupatee-the-original-chutney-diva/); directory years conflict |
| KI Persad | — | [Guardian](https://www.guardian.co.tt/article-6.2.377508.9ed57651ce) |
| Raymond Ramnarine | — | [Guardian](https://www.guardian.co.tt/article-6.2.350425.5e8f6b385b); band partner |
| Dwayne Bravo | 1983 | [IPL](https://www.iplt20.com/index.php/teams/lucknow-super-giants/squad-details/25); Windies T&T roster; stale team path excluded |
| Kieron Pollard | 1987 | [IPL](https://www.iplt20.com/teams/mumbai-indians/squad-details/210); Windies roster |
| Nicholas Pooran | 1995 | [ICC 2021 guide](https://images.icc-cricket.com/image/upload/prd/muhftkbnhgzaqtkj64ol.pdf), indexed; full retrieval too large; Windies roster |
| Levi García | 1997 | [UEFA](https://ar.uefa.com/uefaconferenceleague/clubs/players/250099503--levi-garcia/) |
| Kenwyne Jones | 1984 | [Premier League](https://www.premierleague.com/en/players/18215/kenwyne-jones/overview); historical match register for year |
| Stern John | 1976 | [TTFA](https://thettfa.com/news/jones-addresses-the-media/); [match register](https://www.englandstats.com/matches.php?mid=839) for year |
| Shaka Hislop | 1969 | [Premier League](https://www.premierleague.com/en/players/2027/shaka-hislop/career); match register for year |
| Richard Thompson | 1985 | [World Athletics 2016](https://worldathletics.org/competitions/olympic-games/the-xxxi-olympic-games-7093747/country/trinidad-and-tobago) |
| Michelle-Lee Ahye | 1992 | [World Athletics profile](https://worldathletics.org/athletes/_/14302966) |
| Jereem Richards | 1994 | [World Athletics 2024](https://worldathletics.org/competitions/olympic-games/the-xxxiii-olympic-games-7153115/country/trinidad-and-tobago) |
| KyleBoss | — | Owner nomination, local secondary coverage and embedded public work; identity details unconfirmed |
| Jr Lee | 1996 | [Own biography](https://www.jrleecomedy.com/about); stand-up/screen work |
| Simmy de Trini | — | [TTT](https://www.ttt.live/in-depth-with-dike-rostant-simmy-more-than-entertainment/); stand-up coverage |
| Patrick Manning | 1946 | [Parliament](https://www.ttparliament.org/members/member/patrick-manning/) |
| Basdeo Panday | 1933 | [Parliament](https://www.ttparliament.org/members/member/basdeo-panday/) |
| Sam Selvon | 1923 | [Penguin](https://www.penguin.co.uk/books/455844/calypso-in-london-by-selvon-sam/9780241630877) |
| Monique Roffey | — | [Bocas](https://www.bocaslitfest.com/participant/monique-roffey/); novel/award lead |
| Adonai Dieu / Daniel Loveless | — | 2025 reporting and own interview; *What Yuh Know* lead |
| Geoffrey Holder | 1930 | [Broadway League / IBDB](https://www.ibdb.com/broadway-cast-staff/geoffrey-holder-15131) |
| Chef Jason Peru | — | [Own biography](https://www.chefjasonperu.com/biography); culinary author and TV chef |

There are **19 withheld years** in the model: six existing, thirteen new. This conservative snapshot does not mean those birthdays cannot be found. Resolve strong evidence where available; retain neutral unknowns if evidence remains missing/conflicting. No portraits were collected or licensed here.

## Deduction model and limits

Reproduce with `python3 docs/research/guess-expansion-model.py`. Standard-library Python only; no database operations. Inputs: actual current draft JSON, nomination JSON and explicit Comedy merge. Output: [guess-expansion-results.json](research/guess-expansion-results.json).

| Model | Fully informed optimal mean | Worst along that strategy | Random consistent mean | Average candidates after a wrong opening |
| --- | ---: | ---: | ---: | ---: |
| Current 32, four fields | 2.469 | 3 | 3.002 | 7.129 |
| Proposed 64, four fields | 2.844 | 4 | 3.468 | 14.962 |
| Proposed 64, five fields with Letters | 2.531 | 4 | 2.988 | 9.886 |
| Proposed 64, Born unavailable, without Letters | 4.000 | 7 | 4.706 | 25.258 |
| Proposed 64, Born unavailable, with Letters | 3.031 | 5 | 3.505 | 15.607 |

Both strategies know every candidate's facts. The optimal solver only guesses still-plausible names and minimizes expected guesses; the worst reported follows that strategy, not a separate minimax search. Random chooses uniformly among feedback-consistent candidates. Answers are equally likely. Neither simulates recognition, incomplete knowledge, search time, clues, interface or enjoyment. These are **not human solve targets**.

For the same 64-person pool, Letters reduces average candidates after a wrong opening by about **34%**. This supports testing it, not claiming fun. The largest wrong-opening feedback bucket is still 37 with Letters versus 42 without, so an uninformative opener can leave many names. Free clues and roster discovery remain necessary.

Letters removes identical stored profiles of Ro’dey/KyleBoss/Certified Sampson, but two groups remain: **Ian Alleyne/Adonai Dieu** and **Patrice Roberts/Nailah Blackman**, with categorical facts, unknown years and name lengths alike. Specific show/song clues must separate them. Unknown-neutral feedback introduces ambiguity beyond identical stored profiles. Do not claim every collision is solved or award a win for a different identity.

## Clues and discovery

Keep eight attempts and free hints after misses 3/5/7. The fifth-miss clue should name a recognisable credited work, show, achievement or role; review everyone in the edition actually compatible with it. Maintain the maximum-three compatible-person gate and test whether players can use it. A mathematical list of compatible IDs does not mean people know the programme/song. Reveal source/work context after completion, with licensed images handled separately.

Individual roles or dated achievements differentiate athletes better than an extra universal sports field. For music, a credited signature song beats “famous singer.” For comedy, a real recurring character/show/skit brand beats “makes people laugh.” Nomination-file leads are not approved clue text: review creator, credits, recognition and compatible people.

Make the roster accessible from the game: names, aliases, current public display name, compared facts and name count. Test a feedback-filtered list in unranked practice; it may make a daily too easy. Avoid unpredictable hidden-name banks and paid hints. Completion/rewards should follow a fair game, not compensate for obscure answers.

## Next implementation batch

1. **Expanded unranked comparison prototype:** stable roster/name list and four versus five/Letters toggle. Human-review labels, aliases and recognition. Compare career-era concept before sourcing a universal era dataset.
2. **Claim review of retained 32 and new 32:** identities, substantial careers, public gender, T&T connection, years or uncertainty, and specific clues. Resolve omitted-overlap leads; keep draft status until evidence and recognition pass. JSON research is not an approved import.
3. **Additive people-v2 migration:** new Comedy/food vocabulary; version-specific profiles and rules; proposed cap seven primary members/five cricket memberships; up to three substantial specialities; chosen fifth-field derivation plus editor/RPC/client support. Existing table checks, validators and publication caps must evolve together. Never edit applied migrations or change v1 comparator semantics in place.
4. **Edition-version dispatch:** retain v1 history/sessions, canonical retries and other content/accounts. Freeze v2 names, derived counts, vocabulary, facts and clues. Retain person IDs/legacy links. Validate server/editor parity, accents/punctuation/aliases, unknowns, genuine overlap, caps, clue collisions, retries, history and Trinidad rollover.
5. **Mobile playtest then reviewed development daily:** creators/sports/non-sports audiences; record unprompted recognition, attempts, clue usefulness and unfamiliar answers after reveal. A pilot goal such as most games ending in 3–6 attempts is a hypothesis, not an achieved result. Refine before ranked progression/rewards.

The v1 publisher currently rejects this expanded pool: primary cap three, cricket cap two, different vocabulary and a two-speciality check. Adding rows alone is incomplete. This proposal guides a prototype and versioned implementation; it does not claim a larger approved bank is running.
