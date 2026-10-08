import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {citext} from '@electric-sql/pglite/contrib/citext';
import {DEFAULT_APPEARANCE,CROP_PILOT_CATALOG} from '../../shared/dist/index.js';
const A='30000000-0000-4000-8000-000000000001',B='30000000-0000-4000-8000-000000000002';
let db,restore;
const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0]?.value;
const uid=id=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
const context=()=>scalar('select public.bmt_farm_crops_context($1) as value',[A]);
const create=()=>scalar('select public.bmt_farm_create($1,$2::jsonb,$3,$4) as value',[A,DEFAULT_APPEARANCE,'Farmer',randomUUID()]);
const action=async(body,revision,request=randomUUID())=>scalar('select public.bmt_farm_crop_action($1,$2::jsonb,$3,$4) as value',[A,body,revision??(await context()).revision,request]);
async function transaction(fn){await db.exec('begin');try{await uid(A);await create();await fn();}finally{await db.exec('rollback');}}
async function blocked(fn,re){await db.exec('savepoint blocked');try{await assert.rejects(fn,re);}finally{await db.exec('rollback to blocked;release blocked');}}
const planted=async(plot='plot-1')=>(await action({kind:'plant',plot_id:plot})).state.plots.find(p=>p.plot_id===plot).crop;
const mature=async(c)=>{await action({kind:'water',crop_id:c.id});await db.query("update private.farm_crops set watered_at=now()-interval '25 hours',ready_at=now()-interval '1 hour' where id=$1",[c.id]);};
const hash=()=>scalar(`select jsonb_build_object(
 'farm',(select md5(jsonb_agg(to_jsonb(t) order by user_id)::text) from private.farm_players t),
 'kit',(select md5(jsonb_agg(to_jsonb(t) order by user_id,item_id)::text) from private.farm_inventory t),
 'receipts',(select md5(jsonb_agg(to_jsonb(t) order by user_id,request_id)::text) from private.farm_save_receipts t),
 'wallet',(select md5(jsonb_agg(to_jsonb(t) order by user_id)::text) from private.home_players t),
 'items',(select md5(jsonb_agg(to_jsonb(t) order by user_id,item_id)::text) from private.home_inventory t),
 'ledger',(select md5(jsonb_agg(to_jsonb(t) order by user_id,event_key)::text) from private.home_ledger t)) as value`);
before(async()=>{
 db=await PGlite.create({extensions:{citext}});
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
 for(const f of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()){
  if(f.endsWith('_farm_crops_v1.sql')){
   await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[A,'farmer@example.test',B,'other@example.test']);
   await uid(A);await create();
   await scalar('select public.bmt_farm_save_character($1,$2::jsonb,$3,1,$4) as value',[A,DEFAULT_APPEARANCE,'Saved farmer',randomUUID()]);
   restore={before:await hash()};
  }
  let sql=await readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8');
  if(f==='0001_init.sql')sql=sql.replace('create extension if not exists "pgcrypto";','');
  await db.exec(sql);
  if(f.endsWith('_farm_crops_v1.sql'))restore.after=await hash();
 }
});
after(()=>db.close());

test('F2 preserves an existing farm, kit, save receipt, wallet and older room inventory',()=>assert.deepEqual(restore.after,restore.before));
test('crop reads are passive, catalogue/odds match the shared version and six frozen plots are used',()=>transaction(async()=>{
 const s=await context();assert.deepEqual(s.catalog,CROP_PILOT_CATALOG);assert.equal(s.growth_seconds,86400);assert.equal(s.seed_price,10);
 assert.equal(s.plots.length,6);assert.equal(s.seed_quantity,6);assert.equal(s.coins,90);assert.equal(s.revision,1);
 assert.equal(await scalar('select count(*)::int as value from private.farm_crop_players'),0);
 await uid(B);assert.equal(await scalar('select public.bmt_farm_crops_context($1) as value',[B]),null);
}));
test('plant consumes one seed once, keeps outcomes out of context/receipts, and rejects replanting',()=>transaction(async()=>{
 const body={kind:'plant',plot_id:'plot-1'},req=randomUUID();
 const first=await action(body,1,req);const crop=first.state.plots[0].crop;
 assert.equal(first.state.seed_quantity,5);assert.equal(crop.stage,'planted');assert.equal(crop.reveal,null);
 assert.equal(Object.keys(crop).includes('outcome'),false);assert.equal(first.receipt.item_id,undefined);
 const privateOutcome=await scalar('select outcome as value from private.farm_crops where id=$1',[crop.id]);assert.ok(privateOutcome.item_id);
 const replay=await action(body,1,req);assert.deepEqual(replay.receipt,first.receipt);assert.equal(replay.state.seed_quantity,5);
 await blocked(()=>action({...body,plot_id:'plot-2'},1,req),/request_payload_changed/);
 await blocked(()=>action(body),/plot_occupied/);
 await blocked(()=>action({kind:'plant',plot_id:'plot-7'}),/invalid_plot/);
 assert.equal(await scalar('select count(*)::int as value from private.farm_crops'),1);
}));
test('water starts a single frozen 24-hour server timer; local timestamps and repeated water cannot mature it',()=>transaction(async()=>{
 const c=await planted(),body={kind:'water',crop_id:c.id},req=randomUUID();
 const first=await action(body,2,req),crop=first.state.plots[0].crop;
 assert.equal(Date.parse(crop.ready_at)-Date.parse(crop.watered_at),86400000);assert.equal(crop.reveal,null);assert.equal(crop.stage,'growing');
 assert.equal((await action(body,2,req)).state.plots[0].crop.ready_at,crop.ready_at);
 await blocked(()=>action(body),/already_watered/);
 await blocked(()=>action({kind:'harvest',crop_id:c.id}),/crop_not_ready/);
 await blocked(()=>action({...body,ready_at:'2000-01-01'}),/invalid_crop_action/);
}));
test('offline maturity reveals the frozen outcome, harvest empties once and replay returns current inventory',()=>transaction(async()=>{
 const c=await planted();await mature(c);
 const s=await context();assert.equal(s.plots[0].crop.stage,'ready');assert.ok(s.plots[0].crop.reveal.item_id);
 const body={kind:'harvest',crop_id:c.id},req=randomUUID(),rev=s.revision;
 const a=await action(body,rev,req);assert.equal(a.state.plots[0].crop,null);assert.equal(a.state.goods[0].quantity,1);
 await action({kind:'plant',plot_id:'plot-1'});
 const replay=await action(body,rev,req);assert.equal(replay.state.goods[0].quantity,1);assert.ok(replay.state.plots[0].crop);
 await blocked(()=>action(body),/crop_gone/);
 assert.equal(await scalar('select count(*)::int as value from private.farm_crops where harvested_at is not null'),1);
}));
test('buy/restock freeze server prices, conserve wallet and grant at most two free seeds each Trinidad day',()=>transaction(async()=>{
 const req=randomUUID(),body={kind:'buy',quantity:3};const first=await action(body,1,req);
 assert.equal(first.state.coins,60);assert.equal(first.state.seed_quantity,9);
 assert.equal((await action(body,1,req)).state.coins,60);
 const s=await action({kind:'restock'});assert.equal(s.state.seed_quantity,11);assert.equal(s.state.restock_claimed,true);
 await blocked(()=>action({kind:'restock'}),/restock_already_claimed/);
 await blocked(()=>action({kind:'buy',quantity:7}),/not_enough_coins/);
 for(const n of [0,-1,1.5,51])await blocked(()=>action({kind:'buy',quantity:n}),/invalid_quantity/);
 assert.equal(await scalar("select count(*)::int as value from private.home_ledger where event_key like 'farm-crop-v1:%'"),1);
}));
test('chest moves conserve goods, stored produce cannot be sold, and sales consume/pay only once',()=>transaction(async()=>{
 const c=await planted();await mature(c);await action({kind:'harvest',crop_id:c.id});const good=(await context()).goods[0];
 await action({kind:'store',item_id:good.item_id,quantity:1});let s=await context();assert.equal(s.goods[0].location,'chest');
 await blocked(()=>action({kind:'sell',item_id:good.item_id,quantity:1}),/not_enough_produce/);
 await action({kind:'withdraw',item_id:good.item_id,quantity:1});s=await context();assert.equal(s.goods[0].location,'bag');
 const body={kind:'sell',item_id:good.item_id,quantity:1},req=randomUUID(),rev=s.revision;
 const a=await action(body,rev,req);assert.equal(a.state.coins,90+good.sale_value);assert.equal(a.state.goods.length,0);
 assert.equal((await action(body,rev,req)).state.coins,a.state.coins);
 await blocked(()=>action(body),/not_enough_produce/);
 assert.equal(await scalar("select count(*)::int as value from private.home_ledger where event_key like 'farm-crop-v1:%'"),1);
 assert.equal(await scalar('select sum(quantity)::int as value from private.farm_goods'),0);
}));
test('economic revisions reject competing requests while cosmetic character/position lanes stay independent',()=>transaction(async()=>{
 await action({kind:'buy',quantity:1},1);
 await blocked(()=>action({kind:'buy',quantity:1},1),/crops_changed_reload/);
 const f=await scalar('select public.bmt_farm_context($1) as value',[A]);
 await scalar('select public.bmt_farm_save_character($1,$2::jsonb,$3,$4,$5) as value',[A,DEFAULT_APPEARANCE,'Changed look',f.character_revision,randomUUID()]);
 assert.equal((await context()).revision,2);await action({kind:'restock'},2);
}));
test('account ownership, anonymous callers, private rows and internal helper access stay restricted',()=>transaction(async()=>{
 const c=await planted();await uid(B);
 await blocked(()=>context(),/owner_changed/);
 await blocked(()=>action({kind:'harvest',crop_id:c.id},1),/owner_changed/);
 await uid(A);await db.exec('set local role authenticated');
 assert.ok(await context());
 for(const name of ['farm_crop_rules','farm_crop_players','farm_crops','farm_goods','farm_action_receipts'])await blocked(()=>db.query(`select * from private.${name}`),/permission denied/);
 await blocked(()=>db.query('select private.home_credit($1,$2,0,100)',[A,'fake-credit']),/permission denied/);
 await db.exec('reset role;set local role anon');await blocked(()=>context(),/permission denied/);await db.exec('reset role');
 await uid(null);await blocked(()=>context(),/sign_in_required/);
}));
test('negative/oversized/foreign produce actions and wallet/stack overflow fail without losing goods',()=>transaction(async()=>{
 const c=await planted();await mature(c);await action({kind:'harvest',crop_id:c.id});const g=(await context()).goods[0];
 await blocked(()=>action({kind:'sell',item_id:'not-a-crop',quantity:1}),/not_enough_produce/);
 await blocked(()=>action({kind:'sell',item_id:g.item_id,quantity:-1}),/invalid_quantity/);
 await db.query('update private.home_players set coins=1000000 where user_id=$1',[A]);
 await blocked(()=>action({kind:'sell',item_id:g.item_id,quantity:1}),/wallet_full/);
 assert.equal((await context()).goods[0].quantity,1);
}));
