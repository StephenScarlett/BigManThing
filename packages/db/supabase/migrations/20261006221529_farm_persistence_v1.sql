-- Additive owned farm foundation. Frozen worlds and server-owned starter grants.
-- Walking positions are cosmetic checkpoints and cannot award currency/items.
create table private.farm_world_versions (
  version integer primary key, worlds jsonb not null,
  appearance_choices jsonb not null, default_appearance jsonb not null
);
create table private.farm_items (
  id text primary key, label text not null, kind text not null check(kind in ('tool','seed'))
);
insert into private.farm_items values
('watering-can-basic','Watering can','tool'),
('fishing-rod-basic','Fishing rod','tool'),
('mystery-seed-basic','Mystery seed','seed');
create table private.farm_players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  world_version integer not null references private.farm_world_versions(version),
  appearance jsonb not null, nickname text not null,
  character_revision integer not null default 1 check(character_revision>0),
  position jsonb not null, position_revision integer not null default 1 check(position_revision>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index farm_players_world_idx on private.farm_players(world_version);
create table private.farm_inventory (
  user_id uuid not null references private.farm_players(user_id) on delete cascade,
  item_id text not null references private.farm_items(id),
  quantity integer not null check(quantity between 0 and 1000000), primary key(user_id,item_id)
);
create index farm_inventory_item_idx on private.farm_inventory(item_id);
create table private.farm_grants (
  user_id uuid not null references private.farm_players(user_id) on delete cascade,
  event_key text not null, created_at timestamptz not null default now(), primary key(user_id,event_key)
);
create table private.farm_save_receipts (
  user_id uuid not null references private.farm_players(user_id) on delete cascade,
  request_id uuid not null, payload jsonb not null, result jsonb not null,
  created_at timestamptz not null default now(), primary key(user_id,request_id)
);
create index farm_save_receipts_recent_idx on private.farm_save_receipts(user_id,created_at desc,request_id);
do $$ declare t text; begin
  foreach t in array array['farm_world_versions','farm_items','farm_players','farm_inventory','farm_grants','farm_save_receipts'] loop
    execute format('alter table private.%I enable row level security',t);
    execute format('revoke all on private.%I from public,anon,authenticated',t);
  end loop;
end $$;

create function private.farm_appearance_valid(a jsonb,v integer) returns boolean
language plpgsql stable set search_path='' as $$
declare choices jsonb; pair record;
begin
  if a is null or jsonb_typeof(a)<>'object' then return false; end if;
  select appearance_choices into choices from private.farm_world_versions where version=v;
  if choices is null or (select count(*) from jsonb_object_keys(a))<>(select count(*) from jsonb_object_keys(choices)) then return false; end if;
  for pair in select * from jsonb_each(choices) loop
    if jsonb_typeof(a->pair.key) is distinct from 'string' or not (pair.value ? (a->>pair.key)) then return false; end if;
  end loop;
  return true;
end $$;
create function private.farm_position_valid(p jsonb,v integer) returns boolean
language plpgsql stable set search_path='' as $$
declare w jsonb; a jsonb; x numeric; y numeric; b jsonb;
begin
  if p is null or jsonb_typeof(p)<>'object' or coalesce(p->>'scene','') not in ('farm','house') or length(p::text)>1000 then return false; end if;
  if (select count(*) from jsonb_object_keys(p))<>2 then return false; end if;
  a:=p->'actor';
  if jsonb_typeof(a) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(a))<>3 or coalesce(a->>'facing','') not in ('down','left','right','up')
    or jsonb_typeof(a->'x') is distinct from 'number' or jsonb_typeof(a->'y') is distinct from 'number' then return false; end if;
  select worlds->(p->>'scene') into w from private.farm_world_versions where version=v;
  if w is null then return false; end if;
  x:=(a->>'x')::numeric; y:=(a->>'y')::numeric;
  if x-6<0 or y-6<0 or x+6>(w->>'columns')::integer*32 or y+2>(w->>'rows')::integer*32 then return false; end if;
  for b in select value from jsonb_array_elements(w->'blockers') loop
    if x-6<(b->>'x')::numeric+(b->>'width')::numeric and x+6>(b->>'x')::numeric
      and y-6<(b->>'y')::numeric+(b->>'height')::numeric and y+2>(b->>'y')::numeric then return false; end if;
  end loop;
  return true;
end $$;
create function private.farm_nickname_valid(n text) returns boolean language sql immutable set search_path='' as $$
  select n is not null and length(btrim(n)) between 1 and 20 and n !~ '[[:cntrl:]]';
$$;

create function private.farm_context(p_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); p private.farm_players%rowtype; w jsonb; recovered boolean:=false; scene text;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  if uid is distinct from p_owner then raise exception 'owner_changed'; end if;
  select * into p from private.farm_players where user_id=uid for update;
  if not found then return null; end if;
  select worlds into w from private.farm_world_versions where version=p.world_version;
  if not private.farm_position_valid(p.position,p.world_version) then
    scene:=case when p.position->>'scene'='house' then 'house' else 'farm' end;
    update private.farm_players set position=jsonb_build_object('scene',scene,'actor',w->scene->'spawn'),
      position_revision=position_revision+1,updated_at=now() where user_id=uid returning * into p;
    recovered:=true;
  end if;
  return jsonb_build_object('owner_id',uid,'world_version',p.world_version,'worlds',w,
    'appearance',p.appearance,'nickname',p.nickname,'character_revision',p.character_revision,
    'position',p.position,'position_revision',p.position_revision,'position_recovered',recovered,
    'starter_grant',(select jsonb_build_object('key',event_key,'created_at',created_at) from private.farm_grants where user_id=uid and event_key='farm-starter-v1'),
    'inventory',coalesce((select jsonb_agg(jsonb_build_object('item_id',i.item_id,'quantity',i.quantity,'label',c.label,'kind',c.kind) order by c.kind,c.id)
      from private.farm_inventory i join private.farm_items c on c.id=i.item_id where i.user_id=uid),'[]'::jsonb));
end $$;
create function private.farm_create(p_owner uuid,p_appearance jsonb,p_nickname text,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); inserted uuid; w private.farm_world_versions%rowtype;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  if uid is distinct from p_owner then raise exception 'owner_changed'; end if;
  if p_request is null then raise exception 'request_required'; end if;
  -- Lock order stays wallet -> farm; existing welcome credit is never repeated.
  perform private.home_bootstrap();
  perform 1 from private.home_players where user_id=uid for update;
  if exists(select 1 from private.farm_players where user_id=uid) then return private.farm_context(uid); end if;
  select * into w from private.farm_world_versions where version=1;
  if not private.farm_appearance_valid(p_appearance,w.version) then raise exception 'invalid_character'; end if;
  if not private.farm_nickname_valid(p_nickname) then raise exception 'invalid_nickname'; end if;
  insert into private.farm_players(user_id,world_version,appearance,nickname,position)
    values(uid,w.version,p_appearance,btrim(p_nickname),jsonb_build_object('scene','farm','actor',w.worlds->'farm'->'spawn'))
    on conflict do nothing returning user_id into inserted;
  if inserted is not null then
    insert into private.farm_grants(user_id,event_key) values(uid,'farm-starter-v1');
    insert into private.farm_inventory values(uid,'watering-can-basic',1),(uid,'fishing-rod-basic',1),(uid,'mystery-seed-basic',6);
  end if;
  return private.farm_context(uid);
end $$;
create function private.farm_prune_receipts(uid uuid) returns void language sql set search_path='' as $$
  delete from private.farm_save_receipts where user_id=uid and request_id not in
    (select request_id from private.farm_save_receipts where user_id=uid order by created_at desc,request_id desc limit 64);
$$;
create function private.farm_save_character(p_owner uuid,p_appearance jsonb,p_nickname text,p_revision integer,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); p private.farm_players%rowtype; receipt private.farm_save_receipts%rowtype; payload jsonb; result jsonb;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  if uid is distinct from p_owner then raise exception 'owner_changed'; end if;
  if p_request is null then raise exception 'request_required'; end if;
  select * into p from private.farm_players where user_id=uid for update;
  if not found then raise exception 'farm_required'; end if;
  payload:=jsonb_build_object('kind','character','appearance',p_appearance,'nickname',p_nickname,'revision',p_revision);
  select * into receipt from private.farm_save_receipts where user_id=uid and request_id=p_request;
  if found then
    if receipt.payload<>payload then raise exception 'request_payload_changed'; end if;
    return receipt.result;
  end if;
  if p_revision is distinct from p.character_revision then raise exception 'character_changed_reload'; end if;
  if not private.farm_appearance_valid(p_appearance,p.world_version) then raise exception 'invalid_character'; end if;
  if not private.farm_nickname_valid(p_nickname) then raise exception 'invalid_nickname'; end if;
  update private.farm_players set appearance=p_appearance,nickname=btrim(p_nickname),character_revision=character_revision+1,updated_at=now()
    where user_id=uid returning * into p;
  result:=jsonb_build_object('appearance',p.appearance,'nickname',p.nickname,'character_revision',p.character_revision);
  insert into private.farm_save_receipts values(uid,p_request,payload,result,clock_timestamp());
  perform private.farm_prune_receipts(uid);
  return result;
end $$;
create function private.farm_save_position(p_owner uuid,p_position jsonb,p_revision integer,p_world_version integer,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); p private.farm_players%rowtype; receipt private.farm_save_receipts%rowtype; payload jsonb; result jsonb;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  if uid is distinct from p_owner then raise exception 'owner_changed'; end if;
  if p_request is null then raise exception 'request_required'; end if;
  select * into p from private.farm_players where user_id=uid for update;
  if not found then raise exception 'farm_required'; end if;
  payload:=jsonb_build_object('kind','position','position',p_position,'revision',p_revision,'world_version',p_world_version);
  select * into receipt from private.farm_save_receipts where user_id=uid and request_id=p_request;
  if found then
    if receipt.payload<>payload then raise exception 'request_payload_changed'; end if;
    return receipt.result;
  end if;
  if p_world_version is distinct from p.world_version then raise exception 'world_changed_reload'; end if;
  if p_revision is distinct from p.position_revision then raise exception 'position_changed_reload'; end if;
  if not private.farm_position_valid(p_position,p.world_version) then raise exception 'invalid_position'; end if;
  update private.farm_players set position=p_position,position_revision=position_revision+1,updated_at=now() where user_id=uid returning * into p;
  result:=jsonb_build_object('position',p.position,'position_revision',p.position_revision,'world_version',p.world_version);
  insert into private.farm_save_receipts values(uid,p_request,payload,result,clock_timestamp());
  perform private.farm_prune_receipts(uid);
  return result;
end $$;

-- API wrappers run as invokers; elevated implementations remain non-exposed.
create function public.bmt_farm_context(p_owner uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.farm_context(p_owner); $$;
create function public.bmt_farm_create(p_owner uuid,p_appearance jsonb,p_nickname text,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.farm_create(p_owner,p_appearance,p_nickname,p_request); $$;
create function public.bmt_farm_save_character(p_owner uuid,p_appearance jsonb,p_nickname text,p_revision integer,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.farm_save_character(p_owner,p_appearance,p_nickname,p_revision,p_request); $$;
create function public.bmt_farm_save_position(p_owner uuid,p_position jsonb,p_revision integer,p_world_version integer,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.farm_save_position(p_owner,p_position,p_revision,p_world_version,p_request); $$;
do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like 'farm_%' loop
    execute format('revoke all on function %s from public,anon,authenticated',f);
  end loop;
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'bmt_farm_%' loop
    execute format('revoke all on function %s from public,anon',f);
    execute format('grant execute on function %s to authenticated',f);
  end loop;
end $$;
grant execute on function private.farm_context(uuid),private.farm_create(uuid,jsonb,text,uuid),
  private.farm_save_character(uuid,jsonb,text,integer,uuid),private.farm_save_position(uuid,jsonb,integer,integer,uuid) to authenticated;

-- Frozen v1 data. Future layouts/identity banks receive a new version.
insert into private.farm_world_versions values(1,'{"farm":{"id":"farm","columns":64,"rows":48,"spawn":{"x":704,"y":640,"facing":"down"},"props":[{"id":"starter-house","kind":"house","x":19,"y":15,"w":6,"h":4,"solid":true},{"id":"seed-stall","kind":"stall","x":17,"y":23,"w":2,"h":1,"solid":true},{"id":"sell-counter","kind":"counter","x":20,"y":25,"w":2,"h":1,"solid":true},{"id":"noticeboard","kind":"board","x":25,"y":19,"w":1,"h":1,"solid":true},{"id":"pond-dock","kind":"dock","x":32,"y":25,"w":7,"h":2,"solid":false},{"id":"plot-1","kind":"plot","x":26,"y":22,"w":1,"h":1,"solid":false},{"id":"plot-2","kind":"plot","x":27,"y":22,"w":1,"h":1,"solid":false},{"id":"plot-3","kind":"plot","x":28,"y":22,"w":1,"h":1,"solid":false},{"id":"plot-4","kind":"plot","x":26,"y":24,"w":1,"h":1,"solid":false},{"id":"plot-5","kind":"plot","x":27,"y":24,"w":1,"h":1,"solid":false},{"id":"plot-6","kind":"plot","x":28,"y":24,"w":1,"h":1,"solid":false},{"id":"tree-0","kind":"tree","x":15,"y":15,"w":1,"h":1,"solid":true},{"id":"tree-1","kind":"tree","x":28,"y":16,"w":1,"h":1,"solid":true},{"id":"tree-2","kind":"tree","x":30,"y":19,"w":1,"h":1,"solid":true},{"id":"tree-3","kind":"tree","x":14,"y":22,"w":1,"h":1,"solid":true},{"id":"tree-4","kind":"tree","x":16,"y":28,"w":1,"h":1,"solid":true},{"id":"tree-5","kind":"tree","x":29,"y":29,"w":1,"h":1,"solid":true},{"id":"tree-6","kind":"tree","x":33,"y":32,"w":1,"h":1,"solid":true},{"id":"tree-7","kind":"tree","x":49,"y":24,"w":1,"h":1,"solid":true},{"id":"tree-8","kind":"tree","x":45,"y":16,"w":1,"h":1,"solid":true},{"id":"tree-9","kind":"tree","x":10,"y":10,"w":1,"h":1,"solid":true},{"id":"tree-10","kind":"tree","x":38,"y":12,"w":1,"h":1,"solid":true},{"id":"tree-11","kind":"tree","x":51,"y":34,"w":1,"h":1,"solid":true},{"id":"tree-12","kind":"tree","x":12,"y":35,"w":1,"h":1,"solid":true},{"id":"tree-13","kind":"tree","x":24,"y":37,"w":1,"h":1,"solid":true},{"id":"tree-14","kind":"tree","x":52,"y":10,"w":1,"h":1,"solid":true},{"id":"tree-15","kind":"tree","x":8,"y":25,"w":1,"h":1,"solid":true},{"id":"tree-16","kind":"tree","x":40,"y":38,"w":1,"h":1,"solid":true},{"id":"rock-1","kind":"rock","x":31,"y":22,"w":1,"h":1,"solid":true},{"id":"rock-2","kind":"rock","x":15,"y":31,"w":1,"h":1,"solid":true}],"blockers":[{"x":0,"y":0,"width":2048,"height":32},{"x":0,"y":1504,"width":2048,"height":32},{"x":0,"y":32,"width":32,"height":1472},{"x":2016,"y":32,"width":32,"height":1472},{"x":608,"y":480,"width":192,"height":128},{"x":544,"y":736,"width":64,"height":32},{"x":640,"y":800,"width":64,"height":32},{"x":800,"y":608,"width":32,"height":32},{"x":480,"y":480,"width":32,"height":32},{"x":896,"y":512,"width":32,"height":32},{"x":960,"y":608,"width":32,"height":32},{"x":448,"y":704,"width":32,"height":32},{"x":512,"y":896,"width":32,"height":32},{"x":928,"y":928,"width":32,"height":32},{"x":1056,"y":1024,"width":32,"height":32},{"x":1568,"y":768,"width":32,"height":32},{"x":1440,"y":512,"width":32,"height":32},{"x":320,"y":320,"width":32,"height":32},{"x":1216,"y":384,"width":32,"height":32},{"x":1632,"y":1088,"width":32,"height":32},{"x":384,"y":1120,"width":32,"height":32},{"x":768,"y":1184,"width":32,"height":32},{"x":1664,"y":320,"width":32,"height":32},{"x":256,"y":800,"width":32,"height":32},{"x":1280,"y":1216,"width":32,"height":32},{"x":992,"y":704,"width":32,"height":32},{"x":480,"y":992,"width":32,"height":32},{"x":1152,"y":640,"width":384,"height":160},{"x":1152,"y":864,"width":384,"height":96},{"x":1248,"y":800,"width":288,"height":64}],"interactions":[{"id":"home-door","label":"Enter house","position":{"x":704,"y":624},"approach":{"x":704,"y":640,"facing":"up"},"transition":"house","description":"Your home."},{"id":"seed-stall","label":"Seed stall","position":{"x":576,"y":777.6},"approach":{"x":576,"y":790.4,"facing":"up"},"description":"Mystery seeds will be purchased here. Planting and the server-timed reveal arrive in F2; this preview cannot buy or award seeds."},{"id":"market","label":"Selling counter","position":{"x":672,"y":841.6},"approach":{"x":672,"y":854.4,"facing":"up"},"description":"Sell crops and fish, or keep them for an order, journal or display. Inventory and coin transactions arrive with the persistent farm."},{"id":"orders","label":"Noticeboard","position":{"x":816,"y":649.6},"approach":{"x":816,"y":662.4,"facing":"up"},"description":"Optional weekly crop and fish deliveries are planned here. Common discoveries will count; rare-only tasks will not block basic progression."},{"id":"plots","label":"Six starter plots","position":{"x":880,"y":752},"approach":{"x":880,"y":752,"facing":"up"},"description":"Six plots to begin with. Crops will grow offline after one watering, with their species concealed until maturity. These soil tiles do not contain saved crops yet."},{"id":"pond","label":"Fishing dock","position":{"x":1222.4,"y":832},"approach":{"x":1222.4,"y":832,"facing":"right"},"description":"Cast here in the fishing milestone. The pond is currently a movement/collision test: no fish, bait or rewards are consumed."}],"terrain":[[7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,3,3,3,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,3,3,3,2,0,1,2,0,1,2,0,1,2,0,1,5,4,5,4,5,4,5,4,5,4,5,4,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,3,3,3,0,3,3,3,3,3,0,1,2,0,1,2,4,5,4,5,4,5,4,5,4,5,4,5,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,3,3,3,1,3,3,3,3,3,1,2,0,1,2,0,5,4,5,4,5,4,5,4,5,4,5,4,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,3,3,3,2,3,3,3,3,3,2,0,1,2,0,1,4,5,4,5,4,5,4,5,4,5,4,5,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,3,3,3,0,3,3,3,3,3,0,1,2,0,1,2,5,4,5,4,5,4,5,4,5,4,5,4,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4,5,4,5,4,5,4,5,4,5,4,5,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,5,4,5,4,5,4,5,4,5,4,5,4,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4,5,4,5,4,5,4,5,4,5,4,5,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,3,3,3,1,2,0,1,2,0,1,2,0,1,2,0,5,4,5,4,5,4,5,4,5,4,5,4,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,3,3,3,2,0,1,2,0,1,2,0,1,2,0,1,4,5,4,5,4,5,4,5,4,5,4,5,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,3,3,3,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,3,3,3,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,3,3,3,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,7],[7,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,7],[7,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,7],[7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7]]},"house":{"id":"house","columns":10,"rows":8,"spawn":{"x":160,"y":201.6,"facing":"up"},"props":[{"id":"starter-bed","kind":"bed","x":1,"y":1,"w":2,"h":3,"solid":true},{"id":"starter-table","kind":"table","x":5,"y":2,"w":2,"h":1,"solid":true},{"id":"starter-chair","kind":"chair","x":6,"y":4,"w":1,"h":1,"solid":true},{"id":"starter-chest","kind":"chest","x":7,"y":1,"w":2,"h":1,"solid":true},{"id":"starter-plant","kind":"plant","x":8,"y":5,"w":1,"h":1,"solid":true},{"id":"starter-lamp","kind":"lamp","x":4,"y":1,"w":1,"h":1,"solid":true},{"id":"starter-rug","kind":"rug","x":3,"y":4,"w":3,"h":2,"solid":false}],"blockers":[{"x":0,"y":0,"width":320,"height":32},{"x":0,"y":224,"width":320,"height":32},{"x":0,"y":32,"width":32,"height":192},{"x":288,"y":32,"width":32,"height":192},{"x":32,"y":32,"width":64,"height":96},{"x":160,"y":64,"width":64,"height":32},{"x":192,"y":128,"width":32,"height":32},{"x":224,"y":32,"width":64,"height":32},{"x":256,"y":160,"width":32,"height":32},{"x":128,"y":32,"width":32,"height":32}],"interactions":[{"id":"exit-door","label":"Return to farm","position":{"x":160,"y":224},"approach":{"x":160,"y":201.6,"facing":"down"},"transition":"farm","description":"Back to the yard."},{"id":"storage","label":"Storage chest","position":{"x":256,"y":80},"approach":{"x":256,"y":89.6,"facing":"up"},"description":"Future persistent storage keeps crops, fish and favourites. Opening this preview does not read or alter your account inventory."},{"id":"furniture","label":"Your furnishings","position":{"x":134.4,"y":105.6},"approach":{"x":134.4,"y":105.6,"facing":"up"},"description":"The house uses ground-level furniture collisions and depth sorting. Placement, saved outfits and the transparent comfort rating come in later milestones."}],"terrain":[[10,10,10,10,10,10,10,10,10,10],[10,6,6,6,6,6,6,6,6,10],[10,6,6,6,6,6,6,6,6,10],[10,6,6,6,6,6,6,6,6,10],[10,6,6,6,6,6,6,6,6,10],[10,6,6,6,6,6,6,6,6,10],[10,6,6,6,6,6,6,6,6,10],[10,10,10,10,10,10,10,10,10,10]]}}'::jsonb,'{"skin":["#f0c5a0","#d99c69","#b8774e","#8b553a","#603c2d","#3d2925"],"hair":["#302724","#704532","#be8346","#d7cec0"],"shirt":["#b74437","#3a7770","#e0b655","#686992","#eee0c0","#d5a33d"],"eyes":["#437c68","#5176aa","#794b31","#392925","#a07b3b"],"pants":["#4773a2","#405444","#5a455d","#836442","#34363b"],"shoes":["#73463e","#483c34","#94764a","#ded3b7"],"hat":["#546e79","#ae543d","#ccad67","#49455c"],"bodyType":["slim","regular","broad"],"hairStyle":["bald","crop","curls","bob","ponytail"],"eyeStyle":["round","soft","sharp"],"topStyle":["tee","work-shirt","overshirt"],"bottomStyle":["jeans","shorts"],"hatStyle":["none","cap"]}'::jsonb,'{"skin":"#b8774e","hair":"#704532","shirt":"#d5a33d","eyes":"#437c68","pants":"#4773a2","shoes":"#73463e","hat":"#546e79","bodyType":"regular","hairStyle":"ponytail","eyeStyle":"soft","topStyle":"tee","bottomStyle":"jeans","hatStyle":"none"}'::jsonb);
