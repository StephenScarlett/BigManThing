import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';

let db;
const admin = '10000000-0000-4000-8000-000000000001';
const player = '10000000-0000-4000-8000-000000000002';
let people;
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.value;
const uid = async id => db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
const rpc = async (name, args = [], casts = args.map(() => 'uuid')) => scalar(`select public.${name}(${args.map((_, i) => `$${i + 1}::${casts[i]}`).join(',')}) as value`, args);
async function transaction(fn) { await db.exec('begin'); try { await fn(); } finally { await db.exec('rollback'); } }
async function blocked(fn, message) {
  await db.exec('savepoint expected_failure');
  try { await assert.rejects(fn, message); } finally { await db.exec('rollback to expected_failure; release expected_failure'); }
}
const person = name => people.find(p => p.name === name);
async function edition(answerName = 'Brian Lara', owner = admin) {
  return scalar(`insert into private.guess_people_editions(kind,owner_id,answer_id,roster,vocabulary,is_preview)
    select 'practice',$1,$2,private.guess_profiles_snapshot(null,true),
      (select jsonb_agg(to_jsonb(v)) from public.guess_people_vocabulary v),true returning id as value`, [owner, person(answerName).id]);
}

before(async () => {
  db = await PGlite.create({ extensions: { citext } });
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text,is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
  const files = (await readdir(new URL('../supabase/migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (file.endsWith('_guess_people_v2.sql')) {
      await db.exec(`insert into public.entities(name,mode,guess_nah_enabled,draw_nah_enabled)
        values('Brian Lara','dem',false,true),('Legacy Draw Person','dem',false,true);`);
    }
    let sql = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
    // PGlite uses PostgreSQL's native gen_random_uuid; unused pgcrypto isn't bundled.
    if (file === '0001_init.sql') sql = sql.replace('create extension if not exists "pgcrypto";', '');
    await db.exec(sql);
  }
  await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)', [admin, 'editor@example.test', player, 'player@example.test']);
  await db.query('update public.profiles set is_admin=true where id=$1', [admin]);
  await uid(admin);
  people = await rpc('guess_people_editor_catalog');
});
after(async () => { await db?.close(); });

test('fresh reset applies all migrations; nominations remain drafts and legacy identities survive', async () => {
  assert.equal(people.length, 32);
  assert.ok(people.every(p => p.review_status === 'draft'));
  assert.equal(people.filter(p => p.birth_year == null).length, 6);
  assert.equal(people.filter(p => p.specialities.includes('cricket')).length, 2);
  assert.equal(await scalar('select count(*)::int as value from public.entities'), 2);
  assert.equal(await scalar('select count(*)::int as value from public.guess_people where legacy_entity_id is not null'), 1);
  assert.equal((await rpc('guess_people_context')).catalog.length, 0);
});

test('same comparator: real set overlap, neutral unknowns, birth direction and five-year boundary', async () => {
  const compare = (g, a) => scalar('select private.guess_people_feedback_v1($1::jsonb,$2::jsonb) as value', [g, a]);
  const g = { known_for: ['sport'], specialities: ['sprinting'], birth_year: 1973, gender: 'man' };
  assert.deepEqual(await compare(g, { ...g, known_for: ['online_broadcast', 'sport'], birth_year: 1978 }), {
    known_for: 'partial', speciality: 'exact', born: { state: 'partial', direction: 'later' }, gender: 'exact',
  });
  assert.deepEqual((await compare(g, { ...g, birth_year: 1979 })).born, { state: 'wrong', direction: 'later' });
  assert.deepEqual((await compare(g, { ...g, birth_year: 1967 })).born, { state: 'wrong', direction: 'earlier' });
  const unknown = await compare({ known_for: [], specialities: null, birth_year: null, gender: null }, { known_for: [], specialities: [], birth_year: null, gender: null });
  assert.deepEqual(unknown, { known_for: 'unknown', speciality: 'unknown', born: { state: 'unknown', direction: null }, gender: 'unknown' });
  assert.equal((await compare({ ...g, known_for: ['music'] }, { ...g, known_for: ['screen_stage'] })).known_for, 'wrong');
  assert.equal((await compare({ ...g, known_for: ['sport','online_broadcast','sport'] }, { ...g, known_for: ['online_broadcast','sport'] })).known_for, 'exact');
});

test('retry is idempotent, canonical duplicate spends one attempt, state survives reload', () => transaction(async () => {
  await uid(admin);
  const id = await edition();
  await db.exec('set local role authenticated');
  let state = await rpc('guess_people_submit', [id, person('Nicki Minaj').id]);
  assert.equal(state.attempts.length, 1);
  assert.equal(state.answer, null);
  assert.ok(state.catalog.every(p => !('clue' in p) && !('claims' in p)));
  const repeated = await rpc('guess_people_submit', [id, person('Nicki Minaj').id]);
  assert.deepEqual(repeated, state);
  assert.deepEqual(await rpc('guess_people_context', [id]), state);
  await blocked(() => rpc('guess_people_submit', [id, '20000000-0000-4000-8000-000000000001']), /guess_not_in_roster/);
  assert.equal((await rpc('guess_people_context', [id])).attempts.length, 1);
}));

test('eight wrong guesses end the round, clues unlock on misses, answer is revealed only at the end', () => transaction(async () => {
  await uid(admin);
  const id = await edition();
  await db.exec('set local role authenticated');
  const guesses = people.filter(p => p.name !== 'Brian Lara').slice(0, 8);
  let state;
  for (let i = 0; i < guesses.length; i++) {
    state = await rpc('guess_people_submit', [id, guesses[i].id]);
    assert.equal(state.attempts.length, i + 1);
    assert.deepEqual(state.hints.map(h => h.unlock_after), [3,5,7].filter(n => n <= i + 1));
    assert.equal(state.answer?.name ?? null, i === 7 ? 'Brian Lara' : null);
  }
  assert.equal(state.status, 'lost');
  assert.deepEqual(await rpc('guess_people_submit', [id, person('Brian Lara').id]), state);
}));

test('correct canonical identity wins even with unknown year; feedback is not artificially green', () => transaction(async () => {
  await uid(admin);
  const id = await edition('Certified Sampson');
  const state = await rpc('guess_people_submit', [id, person('Certified Sampson').id]);
  assert.equal(state.status, 'won');
  assert.deepEqual(state.attempts[0].feedback.born, { state: 'unknown', direction: null });
  assert.ok(state.catalog.find(p => p.name === 'Certified Sampson').aliases.includes('Certified Samson'));
}));

test('player boundaries: no draft admission, editor calls, other player practice, or direct history/role writes', () => transaction(async () => {
  await uid(admin);
  const id = await edition();
  await uid(player); await db.exec('set local role authenticated');
  await blocked(() => rpc('guess_people_context', [id]), /edition_not_found/);
  await blocked(() => rpc('guess_people_submit', [id, person('Brian Lara').id]), /edition_not_found/);
  await blocked(() => rpc('guess_people_editor_catalog'), /editor_required/);
  await blocked(() => rpc('guess_people_start_practice', [true], ['boolean']), /editor_required/);
  assert.equal((await rpc('guess_people_context')).catalog.length, 0);
  assert.equal(await scalar('select count(*)::int as value from public.guess_people'), 0);
  await blocked(() => db.query('select * from private.guess_people_editions'), /permission denied/);
  await blocked(() => db.query('update public.profiles set is_admin=true where id=$1', [player]), /permission denied/);
  await db.query("update public.profiles set username='ChangedPlayer' where id=$1", [player]);
  assert.equal(await scalar('select username::text as value from public.profiles where id=$1', [player]), 'ChangedPlayer');
  assert.equal(await scalar('select is_admin as value from public.profiles where id=$1', [player]), false);
}));

test('Trinidad midnight and publication window are authoritative', () => transaction(async () => {
  assert.equal(await scalar("select private.guess_business_date('2026-10-03 03:59:59+00')::text as value"), '2026-10-02');
  assert.equal(await scalar("select private.guess_business_date('2026-10-03 04:00:00+00')::text as value"), '2026-10-03');
  await uid(admin);
  const create = offset => scalar(`insert into private.guess_people_editions(kind,puzzle_date,answer_id,roster,vocabulary)
    select 'daily',private.guess_business_date()+$1::int,$2,private.guess_profiles_snapshot(null,true),'[]' returning id as value`, [offset, person('Brian Lara').id]);
  const future = await create(1);
  const past = await create(-1);
  await blocked(() => rpc('guess_people_context', [future]), /edition_not_available/);
  await blocked(() => rpc('guess_people_submit', [past, person('Brian Lara').id]), /edition_not_available/);
  assert.equal((await rpc('guess_people_context', [past])).expired, true);
}));

test('source review and vocabulary validation reject incomplete approvals; revisions protect edits', () => transaction(async () => {
  await uid(admin);
  const brian = person('Brian Lara');
  await blocked(() => rpc('guess_people_save_profile', [{ ...brian, review_status: 'reviewed' }], ['jsonb']), /review_and_source/);
  await blocked(() => rpc('guess_people_save_profile', [{ ...brian, known_for: ['made_up_unique_tag'] }], ['jsonb']), /unknown_vocabulary_value/);
  const before = await edition();
  const next = await rpc('guess_people_save_profile', [{ ...brian, birth_year: 1970 }], ['jsonb']);
  assert.equal(next.revision, brian.revision + 1);
  assert.equal((await rpc('guess_people_context', [before])).catalog.find(p => p.id === brian.id).birth_year, 1969);
  await blocked(() => rpc('guess_people_save_profile', [brian], ['jsonb']), /profile_changed_reload/);
  await blocked(() => db.query('update private.guess_people_editions set answer_id=$1 where id=$2', [person('Nicki Minaj').id, before]), /published_editions_are_immutable/);
}));

test('balanced reviewed daily publishes once, hides the answer, and allows ordinary players to finish', () => transaction(async () => {
  await uid(admin);
  const names = ['Brian Lara','Sunil Narine','Nicki Minaj','Machel Montano','Kamla Persad-Bissessar','Keith Rowley','Certified Sampson','V. S. Naipaul'];
  for (const name of names) {
    const p = structuredClone(person(name));
    p.review_status = 'reviewed'; p.tt_connection = 'Test fixture only'; p.biography = 'Test fixture biography only'; p.fairness_note = 'Tested recognition path';
    p.clue = { text: `Test fixture clue ${name}`, urls: ['https://example.org/test-clue'], reviewed: true, compatible_ids: [p.id] };
    for (const [key, claim] of Object.entries(p.claims)) {
      claim.status = p[key] == null && ['gender','birth_year'].includes(key) ? 'unconfirmed' : 'reviewed';
      claim.urls = ['https://example.org/test-claim']; claim.note = 'Test fixture evidence';
    }
    await rpc('guess_people_save_profile', [p], ['jsonb']);
  }
  const date = await scalar('select private.guess_business_date()::text as value');
  const roster = names.map(name => person(name).id);
  const id = await rpc('guess_people_publish_daily', [date, person('Brian Lara').id, roster], ['date','uuid','uuid[]']);
  await blocked(() => rpc('guess_people_publish_daily', [date, person('Brian Lara').id, roster], ['date','uuid','uuid[]']), /unique constraint/);
  await uid(player); await db.exec('set local role authenticated');
  const state = await rpc('guess_people_context');
  assert.equal(state.edition.id, id); assert.equal(state.answer, null); assert.equal(state.catalog.length, 8);
  assert.equal((await rpc('guess_people_submit', [id, person('Brian Lara').id])).status, 'won');
}));
