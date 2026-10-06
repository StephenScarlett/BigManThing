import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { DEFAULT_APPEARANCE, WORLDS, terrainTiles, isWalkable } from '../../shared/dist/index.js';

let db;
const admin = '10000000-0000-4000-8000-000000000001';
const player = '10000000-0000-4000-8000-000000000002';
let people;
let legacyEdition;
let farmRestoreProof;
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
      (select jsonb_agg(to_jsonb(v)) from public.guess_people_vocabulary v where version=2),true returning id as value`, [owner, person(answerName).id]);
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
    let farmBefore;
    const farmFingerprint=()=>scalar(`select jsonb_build_object(
      'profiles',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from public.profiles t),
      'players',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by user_id)::text,'')) from private.home_players t),
      'inventory',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by user_id,item_id)::text,'')) from private.home_inventory t),
      'ledger',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by user_id,event_key)::text,'')) from private.home_ledger t),
      'pity',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by user_id,family)::text,'')) from private.home_pity t),
      'editions',(select md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from private.guess_people_editions t)
    ) as value`);
    if(file.endsWith('_farm_persistence_v1.sql')) {
      await uid(admin);await rpc('bmt_home_context');
      farmBefore=await farmFingerprint();
    }
    if (file.endsWith('_guess_people_v2.sql')) {
      await db.exec(`insert into public.entities(name,mode,guess_nah_enabled,draw_nah_enabled)
        values('Brian Lara','dem',false,true),('Legacy Draw Person','dem',false,true);`);
    }
    let sql = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
    // PGlite uses PostgreSQL's native gen_random_uuid; unused pgcrypto isn't bundled.
    if (file === '0001_init.sql') sql = sql.replace('create extension if not exists "pgcrypto";', '');
    await db.exec(sql);
    if(farmBefore)farmRestoreProof={before:farmBefore,after:await farmFingerprint()};
    if (file.endsWith('_guess_people_draft_roster.sql')) {
      await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)', [admin, 'editor@example.test', player, 'player@example.test']);
      await db.query('update public.profiles set is_admin=true where id=$1', [admin]);
      legacyEdition = await scalar(`insert into private.guess_people_editions(kind,owner_id,answer_id,roster,vocabulary,is_preview)
        select 'practice',$1,id,private.guess_profiles_snapshot(null,true),
        (select jsonb_agg(to_jsonb(v)) from public.guess_people_vocabulary v where version=1),true
        from public.guess_people where slug='certified-sampson' returning id as value`, [admin]);
    }
  }
  await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
  await uid(admin);
  people = await rpc('guess_people_editor_catalog');
});
after(async () => { await db?.close(); });

test('additive farm migration preserves restored identities, old room/wallet/inventory/receipts and frozen editions',()=>{
  assert.ok(farmRestoreProof);assert.deepEqual(farmRestoreProof.after,farmRestoreProof.before);
});

test('fresh reset applies all migrations; nominations remain drafts and legacy identities survive', async () => {
  assert.equal(people.length, 64);
  assert.ok(people.every(p => p.review_status === 'draft'));
  assert.equal(people.filter(p => p.birth_year == null).length, 19);
  assert.equal(people.filter(p => p.specialities.includes('cricket')).length, 5);
  assert.ok(people.every(p => p.vocabulary_version === 2 && p.letters > 0));
  assert.equal(await scalar('select count(*)::int as value from public.entities'), 2);
  assert.equal(await scalar('select count(*)::int as value from public.guess_people where legacy_entity_id is not null'), 1);
  assert.equal((await rpc('guess_people_context')).catalog.length, 0);
});

test('v1 editions retain the old names, vocabulary and four-column comparator after expansion', () => transaction(async () => {
  await uid(admin);
  const before = await rpc('guess_people_context', [legacyEdition]);
  assert.equal(before.edition.rules_version, 'people-v1');
  assert.equal(before.catalog.length, 32);
  assert.ok(before.catalog.some(p => p.name === 'Kees Dieffenthaller'));
  assert.ok(before.vocabulary.some(v => v.value === 'digital_comedy'));
  assert.ok(before.catalog.every(p => p.letters == null));
  const next = await rpc('guess_people_submit', [legacyEdition, person('Ro’dey').id]);
  assert.equal(next.attempts[0].feedback.letters, undefined);
  assert.equal(next.attempts[0].feedback.speciality, 'exact');
}));

test('v2 freezes Unicode letter counts, splits creators, retains neutral years and genuine three-way overlap', () => transaction(async () => {
  await uid(admin);
  const compare = (g,a) => rpc('guess_people_preview_feedback', [person(g).id,person(a).id]);
  assert.deepEqual((await compare('KyleBoss','Certified Sampson')).letters, {state:'wrong',direction:'longer'});
  assert.deepEqual((await compare('Certified Sampson','Ro’dey')).letters, {state:'wrong',direction:'shorter'});
  assert.equal((await compare('KyleBoss','Certified Sampson')).born.state, 'unknown');
  assert.deepEqual((await compare('Rikki Jai','Ravi B')).speciality, 'partial');
  assert.equal(person('Kes').letters, 3);
  assert.equal(person('Levi García').letters, 10);
  for (const [name,n] of [['Ro’dey',5],['Levi García',10],['李雷',2],['A1 🧑🏿',1]]) {
    assert.equal(await scalar('select private.guess_name_letters($1) as value',[name]), n);
  }
  const state = await rpc('guess_people_start_practice', [true], ['boolean']);
  assert.equal(state.edition.rules_version,'people-v2');
  const next = await rpc('guess_people_submit', [state.edition.id,person('KyleBoss').id]);
  assert.ok(next.attempts[0].feedback.letters);
}));

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

const home = () => rpc('bmt_home_context');
const request = n => `40000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function rewardDaily() {
  return scalar(`insert into private.guess_people_editions(kind,puzzle_date,answer_id,roster,vocabulary)
    select 'daily',private.guess_business_date(),$1,private.guess_profiles_snapshot(null,true),
    (select jsonb_agg(to_jsonb(v)) from public.guess_people_vocabulary v where version=2) returning id as value`,[person('Brian Lara').id]);
}

test('home bootstrap is once per account, keeps starter identity options free and denies balance writes', () => transaction(async () => {
  await uid(player); await db.exec('set local role authenticated');
  const state=await home();
  assert.equal(state.tickets,3);assert.equal(state.coins,90);assert.equal(state.catalog.length,28);
  assert.equal(state.inventory.length,12);assert.equal(state.inventory.find(i=>i.item_id==='chair-basic').quantity,2);
  assert.equal((await home()).tickets,3);assert.equal(state.recent_rolls.length,0);
  await blocked(()=>db.query('update private.home_players set tickets=1000 where user_id=$1',[player]),/permission denied/);
  await blocked(()=>db.query('select private.home_credit($1,$2,5,5)',[player,'fabricated']),/permission denied/);
  await blocked(()=>db.query('select * from private.home_inventory'),/permission denied/);
  await uid(admin);assert.equal((await home()).tickets,3);
  await uid('');await blocked(()=>home(),/sign_in_required/);
  await db.exec('set local role anon');
  assert.equal(await scalar('select count(*)::int as value from public.home_items'),28);
  await blocked(()=>home(),/permission denied/);
  await db.exec('reset role');
  assert.equal(await scalar("select count(*)::int as value from private.home_ledger where user_id=$1 and event_key='welcome'",[player]),1);
}));

test('a retried roll spends exactly once, discloses effective odds and rejects request/family conflicts', () => transaction(async () => {
  await uid(player);await db.exec('set local role authenticated');
  const first=await rpc('bmt_home_roll',['wardrobe',request(1)],['text','uuid']);
  assert.equal(first.state.tickets,2);assert.equal(first.roll.family,'wardrobe');
  assert.ok(Math.abs(first.roll.odds.reduce((n,o)=>n+o.percent,0)-100)<1e-6);
  assert.deepEqual((await rpc('bmt_home_roll',['wardrobe',request(1)],['text','uuid'])).roll,first.roll);
  assert.equal((await home()).tickets,2);
  await blocked(()=>rpc('bmt_home_roll',['room',request(1)],['text','uuid']),/request_conflict/);
  await blocked(()=>rpc('bmt_home_roll',['invalid',request(2)],['text','uuid']),/invalid_roll_request/);
  await rpc('bmt_home_roll',['room',request(2)],['text','uuid']);await rpc('bmt_home_roll',['room',request(3)],['text','uuid']);
  await blocked(()=>rpc('bmt_home_roll',['room',request(4)],['text','uuid']),/not_enough_rolls/);
  assert.equal((await home()).tickets,0);
  await uid(admin);assert.equal((await home()).recent_rolls.length,0);
}));

test('pity forces Epic+ at ten and Legendary at forty; duplicates convert without hidden ownership changes', () => transaction(async () => {
  await uid(player);await home();
  await db.query("update private.home_pity set epic_misses=9,legendary_misses=12 where user_id=$1 and family='wardrobe'",[player]);
  await db.exec('set local role authenticated');
  let state=await home();assert.equal(state.odds.wardrobe.filter(o=>o.rarity<2).reduce((n,o)=>n+o.percent,0),0);
  const epic=await rpc('bmt_home_roll',['wardrobe',request(5)],['text','uuid']);
  assert.ok(epic.state.catalog.find(i=>i.id===epic.roll.item_id).rarity>=2);
  assert.equal(epic.state.pity.find(p=>p.family==='wardrobe').epic_misses,0);
  assert.equal(epic.state.pity.find(p=>p.family==='room').epic_misses,0);
  await db.exec('reset role');
  await db.query("update private.home_pity set legendary_misses=39 where user_id=$1 and family='room'",[player]);
  await db.exec('set local role authenticated');
  const legendary=await rpc('bmt_home_roll',['room',request(6)],['text','uuid']);
  assert.equal(legendary.roll.item_id,'sofa-carnival');assert.equal(legendary.roll.duplicate,false);
  assert.equal(legendary.state.pity.find(p=>p.family==='room').legendary_misses,0);
  await db.exec('reset role');
  await db.query("update private.home_pity set legendary_misses=39 where user_id=$1 and family='room'",[player]);
  await db.exec('set local role authenticated');
  const dupe=await rpc('bmt_home_roll',['room',request(7)],['text','uuid']);
  assert.equal(dupe.roll.duplicate,true);assert.equal(dupe.roll.coins_returned,100);
  assert.equal(dupe.state.coins,legendary.state.coins+100);
  assert.equal(dupe.state.inventory.find(i=>i.item_id==='sofa-carnival').quantity,1);
}));

test('guaranteed Legendary prefers an unowned item and a malformed pool cannot spend tickets', () => transaction(async () => {
  await uid(player);await home();
  await db.exec("insert into public.home_items select 'legend-test','Test-only legend',kind,slot,rarity,starter,family,color,variant,width,height,layer from public.home_items where id='suit-sunset'");
  await db.query("insert into private.home_inventory values($1,'suit-sunset',1)",[player]);
  await db.query("update private.home_pity set legendary_misses=39 where user_id=$1 and family='wardrobe'",[player]);
  await db.exec('set local role authenticated');
  const next=await rpc('bmt_home_roll',['wardrobe',request(8)],['text','uuid']);
  assert.equal(next.roll.item_id,'legend-test');assert.equal(next.roll.duplicate,false);
  await db.exec('reset role');await db.exec("delete from public.home_items where family='room' and rarity=3");
  await db.exec('set local role authenticated');
  await blocked(()=>rpc('bmt_home_roll',['room',request(9)],['text','uuid']),/collection_configuration_invalid/);
  assert.equal((await home()).tickets,2);
}));

test('direct purchases price on the server, retry once and bound furniture copies', () => transaction(async () => {
  await uid(player);await home();await db.query('update private.home_players set coins=400 where user_id=$1',[player]);
  await db.exec('set local role authenticated');
  let next=await rpc('bmt_home_buy',['hat-mint',request(10)],['text','uuid']);
  assert.equal(next.coins,320);assert.equal(next.inventory.find(i=>i.item_id==='hat-mint').quantity,1);
  assert.equal((await rpc('bmt_home_buy',['hat-mint',request(10)],['text','uuid'])).coins,320);
  await blocked(()=>rpc('bmt_home_buy',['hat-mint',request(11)],['text','uuid']),/item_limit_reached/);
  await blocked(()=>rpc('bmt_home_buy',['sofa-carnival',request(12)],['text','uuid']),/not_enough_coins/);
  for(let n=0;n<6;n++)next=await rpc('bmt_home_buy',['chair-basic',request(20+n)],['text','uuid']);
  assert.equal(next.coins,80);assert.equal(next.inventory.find(i=>i.item_id==='chair-basic').quantity,8);
  await blocked(()=>rpc('bmt_home_buy',['chair-basic',request(30)],['text','uuid']),/item_limit_reached/);
}));

test('room saves check ownership, quantities, footprints, layers and revision without overwriting newer designs', () => transaction(async () => {
  await uid(player);await db.exec('set local role authenticated');
  const start=await home(),design=structuredClone(start.design);
  design.layout[0].extra='Discard this arbitrary payload';
  const saved=await rpc('bmt_home_save',[design,start.design_revision],['jsonb','integer']);
  assert.equal(saved.design_revision,2);assert.equal(saved.design.layout[0].extra,undefined);
  await blocked(()=>rpc('bmt_home_save',[design,1],['jsonb','integer']),/design_changed_reload/);
  const attempt=async d=>blocked(()=>rpc('bmt_home_save',[d,2],['jsonb','integer']));
  await attempt({...design,outfit:{...design.outfit,hat:'hat-mint'}});
  await attempt({...design,skin:8});
  await attempt({...design,layout:[...design.layout,{instance_id:'extra',item_id:'chair-basic',x:0,y:7,rotation:0}]});
  await attempt({...design,layout:[{instance_id:'a',item_id:'table-basic',x:7,y:7,rotation:0}]});
  await attempt({...design,layout:[{instance_id:'a',item_id:'chair-basic',x:0,y:0,rotation:0},{instance_id:'b',item_id:'table-basic',x:0,y:0,rotation:0}]});
  await attempt({...design,layout:[{instance_id:'same',item_id:'chair-basic',x:0,y:0,rotation:0},{instance_id:'same',item_id:'chair-basic',x:1,y:0,rotation:0}]});
  assert.equal((await home()).design_revision,2);
  const rugAndChair={...design,layout:[{instance_id:'rug',item_id:'rug-basic',x:0,y:0,rotation:0},{instance_id:'seat',item_id:'chair-basic',x:0,y:0,rotation:0}]};
  assert.equal((await rpc('bmt_home_save',[rugAndChair,2],['jsonb','integer'])).design_revision,3);
  await uid(admin);assert.equal((await home()).design_revision,1);
}));

test('only completed current published Guess dailies earn, once, for either win or loss', () => transaction(async () => {
  await uid(admin);const practice=await edition(),daily=await rewardDaily();
  await rpc('guess_people_submit',[practice,person('Brian Lara').id]);
  await blocked(()=>rpc('bmt_home_claim_guess',[practice]),/completed_daily_required/);
  await uid(player);await db.exec('set local role authenticated');
  await blocked(()=>rpc('bmt_home_claim_guess',[daily]),/completed_daily_required/);
  await rpc('guess_people_submit',[daily,person('Brian Lara').id]);
  assert.equal((await home()).tickets,4); // Earned in the same completion transaction.
  assert.deepEqual((await home()).claimable_guess,[]);
  const first=await rpc('bmt_home_claim_guess',[daily]);assert.equal(first.tickets,4);assert.equal(first.coins,120);
  assert.equal(first.streak,1);assert.equal(first.claimable_guess.length,0);
  assert.equal((await rpc('bmt_home_claim_guess',[daily])).tickets,4);
  await uid(admin);
  for(const p of people.filter(p=>p.name!=='Brian Lara').slice(0,8))await rpc('guess_people_submit',[daily,p.id]);
  assert.equal((await rpc('bmt_home_claim_guess',[daily])).tickets,4);
}));

test('Pan unlock, viewing time, ownership and retries are enforced; shared streak bonuses occur once', () => transaction(async () => {
  await uid(admin);const daily=await rewardDaily();
  await uid(player);await home();
  await db.query('update private.home_players set coins=150 where user_id=$1',[player]);
  await db.query('insert into private.home_activity_days values($1,private.guess_business_date()-1),($1,private.guess_business_date()-2)',[player]);
  await db.exec('set local role authenticated');
  await blocked(()=>rpc('bmt_home_start_pan'),/pan_game_locked/);
  await rpc('guess_people_submit',[daily,person('Brian Lara').id]);
  const claimed=await rpc('bmt_home_claim_guess',[daily]);assert.equal(claimed.streak,3);assert.equal(claimed.tickets,5);
  const unlocked=await rpc('bmt_home_unlock_pan',[request(40)]);assert.equal(unlocked.coins,30);assert.equal(unlocked.pan_unlocked,true);
  assert.equal((await rpc('bmt_home_unlock_pan',[request(41)])).coins,30);
  const started=await rpc('bmt_home_start_pan');assert.equal(started.pan.pattern.length,6);
  assert.equal((await rpc('bmt_home_start_pan')).pan.id,started.pan.id);
  await blocked(()=>rpc('bmt_home_finish_pan',[started.pan.id,started.pan.pattern],['uuid','integer[]']),/watch_pattern_first/);
  await uid(admin);await blocked(()=>rpc('bmt_home_finish_pan',[started.pan.id,started.pan.pattern],['uuid','integer[]']),/pan_round_unavailable/);
  await db.exec('reset role');await db.query("update private.home_pan_sessions set ready_at=now()-interval '1 second' where id=$1",[started.pan.id]);
  await uid(player);await db.exec('set local role authenticated');
  await blocked(()=>rpc('bmt_home_finish_pan',[started.pan.id,[1,2]],['uuid','integer[]']),/six_notes_required/);
  const finished=await rpc('bmt_home_finish_pan',[started.pan.id,started.pan.pattern],['uuid','integer[]']);
  assert.equal(finished.pan.status,'won');assert.equal(finished.tickets,6);assert.equal(finished.coins,40);assert.equal(finished.streak,3);
  assert.equal((await rpc('bmt_home_finish_pan',[started.pan.id,[1,1,1,1,1,1]],['uuid','integer[]'])).tickets,6);
  await db.exec('reset role');
  assert.equal(await scalar("select count(*)::int as value from private.home_ledger where user_id=$1 and event_key like 'streak:%'",[player]),1);
}));

const farmRead=(owner=admin)=>rpc('bmt_farm_context',[owner]);
const farmCreate=(owner=admin,appearance=DEFAULT_APPEARANCE,name='My lime',request=crypto.randomUUID())=>rpc('bmt_farm_create',[owner,appearance,name,request],['uuid','jsonb','text','uuid']);
const characterSave=(appearance,name,revision,request=crypto.randomUUID(),owner=admin)=>rpc('bmt_farm_save_character',[owner,appearance,name,revision,request],['uuid','jsonb','text','integer','uuid']);
const positionSave=(position,revision,world=1,request=crypto.randomUUID(),owner=admin)=>rpc('bmt_farm_save_position',[owner,position,revision,world,request],['uuid','jsonb','integer','integer','uuid']);

test('farm read is passive; creation and retries grant one kit and preserve an existing wallet/inventory',()=>transaction(async()=>{
  await uid(admin);
  assert.equal(await farmRead(),null);
  const wallet=await rpc('bmt_home_context');
  const before=await scalar("select md5(to_jsonb(p)::text) as value from private.home_players p where user_id=$1",[admin]);
  await db.exec('set local role authenticated');
  const state=await farmCreate();
  assert.equal(state.owner_id,admin);assert.equal(state.world_version,1);
  assert.equal(state.starter_grant.key,'farm-starter-v1');
  assert.deepEqual(state.inventory.map(i=>[i.item_id,i.quantity]),[['mystery-seed-basic',6],['fishing-rod-basic',1],['watering-can-basic',1]]);
  assert.equal(state.worlds.farm.props.filter(p=>p.kind==='plot').length,6);
  assert.deepEqual(await farmCreate(admin,{...DEFAULT_APPEARANCE,bodyType:'broad'},'Retry'),state);
  assert.deepEqual(await farmRead(),state);
  const after=await rpc('bmt_home_context');assert.deepEqual(after.inventory,wallet.inventory);assert.deepEqual(after.wallet,wallet.wallet);
  await db.exec('reset role');
  assert.equal(await scalar("select md5(to_jsonb(p)::text) as value from private.home_players p where user_id=$1",[admin]),before);
  assert.equal(await scalar('select count(*)::int as value from private.farm_grants'),1);
  await db.exec("update private.farm_inventory set quantity=2 where item_id='mystery-seed-basic'");
  assert.equal((await farmCreate()).inventory.find(i=>i.kind==='seed').quantity,2);
}));

test('farm character save validates all identity fields, replays lost responses and rejects stale changes',()=>transaction(async()=>{
  await uid(admin);let state=await farmCreate();await db.exec('set local role authenticated');
  const appearance={...DEFAULT_APPEARANCE,bodyType:'broad',hairStyle:'curls',eyeStyle:'sharp',topStyle:'overshirt',bottomStyle:'shorts',hatStyle:'cap',skin:'#603c2d',shirt:'#3a7770'};
  const request=crypto.randomUUID(),saved=await characterSave(appearance,'  Farmer  ',state.character_revision,request);
  assert.equal(saved.nickname,'Farmer');assert.equal(saved.character_revision,2);assert.deepEqual(saved.appearance,appearance);
  assert.deepEqual(await characterSave(appearance,'  Farmer  ',1,request),saved);
  await blocked(()=>characterSave(appearance,'Different',1,request),/request_payload_changed/);
  await blocked(()=>characterSave(DEFAULT_APPEARANCE,'Overwrite',1),/character_changed_reload/);
  for(const bad of [{...appearance,skin:'#ffffff'},{...appearance,hairStyle:'legendary'},{...appearance,extra:'coins'},Object.fromEntries(Object.entries(appearance).filter(([k])=>k!=='eyes')),null])
    await blocked(()=>characterSave(bad,'Farmer',2),/invalid_character/);
  for(const name of ['', ' ', 'A'.repeat(21), 'bad\nname'])await blocked(()=>characterSave(appearance,name,2),/invalid_nickname/);
  state=await farmRead();assert.equal(state.character_revision,2);assert.equal(state.position_revision,1);
  assert.equal(state.inventory.find(i=>i.kind==='seed').quantity,6);
}));

test('farm checkpoints use server geometry and independent revisions without changing identity or grants',()=>transaction(async()=>{
  await uid(admin);const state=await farmCreate();await db.exec('set local role authenticated');
  const pos={scene:'house',actor:{...WORLDS.house.spawn}},request=crypto.randomUUID();
  const ack=await positionSave(pos,1,1,request);assert.equal(ack.position_revision,2);assert.deepEqual(ack.position,pos);
  assert.deepEqual(await positionSave(pos,1,1,request),ack);
  await blocked(()=>positionSave({...pos,actor:{...pos.actor,facing:'down'}},1,1,request),/request_payload_changed/);
  await blocked(()=>positionSave(pos,1),/position_changed_reload/);
  await blocked(()=>positionSave(pos,2,99),/world_changed_reload/);
  for(const bad of [null,{scene:null,actor:pos.actor},{...pos,actor:{x:160,y:202,facing:null}},{...pos,actor:{x:NaN,y:202,facing:'up'}},{scene:'farm',actor:{x:0,y:0,facing:'down'}},{scene:'farm',actor:{x:37*32,y:22*32,facing:'up'}},{scene:'house',actor:{x:64,y:64,facing:'down'}}])
    await blocked(()=>positionSave(bad,2),/invalid_position/);
  await characterSave({...DEFAULT_APPEARANCE,hairStyle:'bob'},'Saved character',1);
  const after=await farmRead();assert.equal(after.position_revision,2);assert.equal(after.character_revision,2);assert.deepEqual(after.inventory,state.inventory);
}));

test('farm identity is checked for every call; clients cannot inspect private worlds, grants or inventory',()=>transaction(async()=>{
  await uid(admin);await farmCreate();await uid(player);await db.exec('set local role authenticated');
  assert.equal(await farmRead(player),null);
  await blocked(()=>farmRead(admin),/owner_changed/);
  await blocked(()=>farmCreate(admin),/owner_changed/);
  await blocked(()=>characterSave(DEFAULT_APPEARANCE,'Other user',1,crypto.randomUUID(),admin),/owner_changed/);
  await blocked(()=>positionSave({scene:'farm',actor:WORLDS.farm.spawn},1,1,crypto.randomUUID(),admin),/owner_changed/);
  for(const table of ['farm_players','farm_inventory','farm_grants','farm_world_versions','farm_save_receipts'])
    await blocked(()=>db.query(`select * from private.${table}`),/permission denied/);
  await blocked(()=>db.query('select private.farm_prune_receipts($1)',[admin]),/permission denied/);
  const own=await farmCreate(player);assert.equal(own.owner_id,player);assert.equal(own.character_revision,1);
  await uid(null);await blocked(()=>farmRead(player),/sign_in_required/);
  await db.exec('set local role anon');await blocked(()=>farmRead(player),/permission denied/);
}));

test('farm restore repairs blocked checkpoints once, preserving the character, kit and old room',()=>transaction(async()=>{
  await uid(admin);const before=await farmCreate();
  await db.query("update private.farm_players set position=$1 where user_id=$2",[{scene:'house',actor:{x:0,y:0,facing:'up'}},admin]);
  await db.exec('set local role authenticated');
  const after=await farmRead();assert.equal(after.position_recovered,true);assert.equal(after.position_revision,2);
  assert.deepEqual(after.position,{scene:'house',actor:WORLDS.house.spawn});assert.deepEqual(after.appearance,before.appearance);assert.deepEqual(after.inventory,before.inventory);
  const again=await farmRead();assert.equal(again.position_recovered,false);assert.equal(again.position_revision,2);
}));

test('frozen farm definition matches shared renderer tiles, object IDs, safe spawns and collision decisions',()=>transaction(async()=>{
  await uid(admin);const state=await farmCreate();
  for(const id of ['farm','house']) {
    const expected={...WORLDS[id],terrain:terrainTiles(WORLDS[id])};assert.deepEqual(state.worlds[id],expected);
    assert.equal(new Set(expected.props.map(p=>p.id)).size,expected.props.length);
    assert.equal(expected.terrain.length,expected.rows);assert.ok(expected.terrain.every(r=>r.length===expected.columns));
    for(const point of [expected.spawn,...expected.interactions.map(i=>i.approach),{x:0,y:0,facing:'up'},{x:64,y:64,facing:'down'},{x:37*32,y:22*32,facing:'right'},{x:38*32,y:26*32,facing:'right'}]) {
      const valid=await scalar('select private.farm_position_valid($1,1) as value',[{scene:id,actor:point}]);
      assert.equal(valid,isWalkable(expected,point));
    }
  }
}));

test('cosmetic checkpoint receipts are bounded; repeat reads/creation cannot replace stored farm state',()=>transaction(async()=>{
  await uid(admin);await farmCreate();await db.exec('set local role authenticated');
  let revision=1,last,request;
  const position={scene:'farm',actor:WORLDS.farm.spawn};
  for(let n=0;n<66;n++){request=crypto.randomUUID();last=await positionSave(position,revision,1,request);revision=last.position_revision;}
  assert.deepEqual(await positionSave(position,revision-1,1,request),last);
  const restored=await farmCreate();assert.equal(restored.position_revision,67);assert.equal(restored.character_revision,1);
  await db.exec('reset role');assert.equal(await scalar('select count(*)::int as value from private.farm_save_receipts'),64);
  assert.equal(await scalar('select count(*)::int as value from private.farm_grants'),1);
}));
