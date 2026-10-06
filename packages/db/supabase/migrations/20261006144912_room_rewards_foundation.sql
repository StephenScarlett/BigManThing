-- Earned-only development collection economy. Client cannot choose a reward or balance.
create table public.home_items (
  id text primary key check(id ~ '^[a-z0-9-]{1,60}$'), label text not null,
  kind text not null check(kind in ('wearable','furniture')),
  slot text check(slot in ('hair','hat','top','bottom','shoes')),
  rarity smallint not null check(rarity between 0 and 3), starter boolean not null default false,
  family text check(family in ('wardrobe','room')), color text not null check(color ~ '^#[0-9a-fA-F]{6}$'),
  variant text not null, width smallint not null default 1 check(width between 1 and 3),
  height smallint not null default 1 check(height between 1 and 3), layer smallint not null default 1 check(layer in (0,1)),
  check((kind='wearable' and slot is not null) or (kind='furniture' and slot is null)),
  check((starter and family is null) or (not starter and family is not null))
);
alter table public.home_items enable row level security;
revoke all on public.home_items from public,anon,authenticated;
grant select on public.home_items to anon,authenticated;
create policy home_items_read on public.home_items for select to anon,authenticated using(true);
create table private.home_players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tickets integer not null default 3 check(tickets between 0 and 1000000),
  coins integer not null default 90 check(coins between 0 and 1000000),
  design jsonb not null default '{"skin":3,"floor":0,"wall":0,"outfit":{"hair":"hair-short","top":"tee-red","bottom":"pants-dark","shoes":"shoes-basic"},"layout":[{"instance_id":"chair-1","item_id":"chair-basic","x":2,"y":3,"rotation":0},{"instance_id":"chair-2","item_id":"chair-basic","x":4,"y":3,"rotation":0},{"instance_id":"table-1","item_id":"table-basic","x":2,"y":2,"rotation":0},{"instance_id":"plant-1","item_id":"plant-basic","x":6,"y":0,"rotation":0},{"instance_id":"rug-1","item_id":"rug-basic","x":0,"y":0,"rotation":0}]}'::jsonb,
  design_revision integer not null default 1,
  pan_unlocked boolean not null default false,
  created_at timestamptz not null default now()
);
create table private.home_inventory (
  user_id uuid not null references private.home_players(user_id) on delete cascade,
  item_id text not null references public.home_items(id), quantity smallint not null check(quantity between 1 and 8),
  primary key(user_id,item_id)
);
create index home_inventory_item_idx on private.home_inventory(item_id);
create table private.home_ledger (
  user_id uuid not null references private.home_players(user_id) on delete cascade,
  event_key text not null, tickets_delta integer not null, coins_delta integer not null,
  tickets_balance integer not null, coins_balance integer not null, created_at timestamptz not null default now(),
  primary key(user_id,event_key)
);
create index home_ledger_recent_idx on private.home_ledger(user_id,created_at desc);
create table private.home_pity (
  user_id uuid not null references private.home_players(user_id) on delete cascade,
  family text not null check(family in ('wardrobe','room')),
  epic_misses integer not null default 0 check(epic_misses between 0 and 9),
  legendary_misses integer not null default 0 check(legendary_misses between 0 and 39),
  primary key(user_id,family)
);
create table private.home_rolls (
  user_id uuid not null references private.home_players(user_id) on delete cascade, request_id uuid not null,
  family text not null, rules_version integer not null default 1,
  item_id text not null references public.home_items(id), duplicate boolean not null,
  coins_returned integer not null, pity_before jsonb not null, odds jsonb not null,
  created_at timestamptz not null default now(), primary key(user_id,request_id)
);
create index home_rolls_recent_idx on private.home_rolls(user_id,created_at desc);
create index home_rolls_item_idx on private.home_rolls(item_id);
create table private.home_activity_days (
  user_id uuid not null references private.home_players(user_id) on delete cascade,
  activity_date date not null, primary key(user_id,activity_date)
);
create table private.home_pan_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references private.home_players(user_id) on delete cascade,
  activity_date date not null, pattern integer[] not null check(cardinality(pattern)=6),
  status text not null default 'playing' check(status in ('playing','won','lost')),
  started_at timestamptz not null default now(), ready_at timestamptz not null default now()+interval '8 seconds',
  completed_at timestamptz, answer integer[], unique(user_id,activity_date)
);
do $$ declare t text; begin
  foreach t in array array['home_players','home_inventory','home_ledger','home_pity','home_rolls','home_activity_days','home_pan_sessions'] loop
    execute format('alter table private.%I enable row level security',t);
    execute format('revoke all on private.%I from public,anon,authenticated',t);
  end loop;
end $$;

create function private.home_random_unit() returns numeric language sql volatile set search_path='' as $$
  select ('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint / 4294967296.0;
$$;
create function private.home_bootstrap() returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); inserted uuid;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  insert into private.home_players(user_id) values(uid) on conflict do nothing returning user_id into inserted;
  if inserted is not null then
    insert into private.home_inventory select uid,id,case when id='chair-basic' then 2 else 1 end from public.home_items where starter;
    insert into private.home_pity(user_id,family) values(uid,'wardrobe'),(uid,'room');
    insert into private.home_ledger values(uid,'welcome',3,90,3,90,now());
  end if;
  return uid;
end $$;
create function private.home_streak(uid uuid,p_day date) returns integer language plpgsql stable set search_path='' as $$
declare d date; expected date:=p_day; n integer:=0;
begin
  for d in select activity_date from private.home_activity_days where user_id=uid and activity_date<=p_day order by activity_date desc loop
    exit when d<>expected; n:=n+1; expected:=expected-1;
  end loop;
  return n;
end $$;
create function private.home_credit(uid uuid,p_key text,p_tickets integer,p_coins integer) returns boolean language plpgsql set search_path='' as $$
declare p private.home_players%rowtype;
begin
  select * into p from private.home_players where user_id=uid for update;
  if exists(select 1 from private.home_ledger where user_id=uid and event_key=p_key) then return false; end if;
  update private.home_players set tickets=tickets+p_tickets,coins=coins+p_coins where user_id=uid returning * into p;
  insert into private.home_ledger values(uid,p_key,p_tickets,p_coins,p.tickets,p.coins,now());
  return true;
end $$;
create function private.home_activity(uid uuid) returns void language plpgsql set search_path='' as $$
declare d date:=private.guess_business_date(); inserted date; n integer; bonus integer;
begin
  insert into private.home_activity_days values(uid,d) on conflict do nothing returning activity_date into inserted;
  if inserted is not null then
    n:=private.home_streak(uid,d);
    bonus:=case n%28 when 3 then 1 when 7 then 2 when 14 then 3 when 0 then 5 else 0 end;
    if bonus>0 then perform private.home_credit(uid,'streak:'||d::text,bonus,0); end if;
  end if;
end $$;
create function private.home_odds(uid uuid,p_family text) returns jsonb language plpgsql stable set search_path='' as $$
declare p private.home_pity%rowtype; result jsonb;
begin
  select * into p from private.home_pity where user_id=uid and family=p_family;
  with eligible as (
    select i.*,case when p.legendary_misses>=39 then case when rarity=3 then 100.0 else 0 end
      when p.epic_misses>=9 then case rarity when 2 then 100.0*10/12 when 3 then 100.0*2/12 else 0 end
      else case rarity when 0 then 60.0 when 1 then 28.0 when 2 then 10.0 else 2.0 end end as tier_odds
    from public.home_items i where family=p_family and not starter
    and not(p.legendary_misses>=39 and i.rarity=3 and
      exists(select 1 from public.home_items a where a.family=p_family and a.rarity=3 and not a.starter
        and not exists(select 1 from private.home_inventory v where v.user_id=uid and v.item_id=a.id))
      and exists(select 1 from private.home_inventory v where v.user_id=uid and v.item_id=i.id))
  ) select jsonb_agg(jsonb_build_object('item_id',id,'rarity',rarity,'percent',tier_odds/over_count) order by rarity,id) into result
    from (select *,count(*) over(partition by rarity) as over_count from eligible) x;
  return coalesce(result,'[]');
end $$;

create function private.home_context() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.home_bootstrap(); p private.home_players%rowtype; d date:=private.guess_business_date(); streak integer;
begin
  select * into p from private.home_players where user_id=uid for share;
  streak:=private.home_streak(uid,d);
  if streak=0 then streak:=private.home_streak(uid,d-1); end if;
  return jsonb_build_object('business_date',d,'server_now',now(),'tickets',p.tickets,'coins',p.coins,
    'design',p.design,'design_revision',p.design_revision,'pan_unlocked',p.pan_unlocked,'streak',streak,
    'catalog',(select jsonb_agg(to_jsonb(i) order by starter desc,rarity,label) from public.home_items i),
    'inventory',(select jsonb_agg(jsonb_build_object('item_id',item_id,'quantity',quantity) order by item_id) from private.home_inventory where user_id=uid),
    'pity',(select jsonb_agg(to_jsonb(x)-'user_id') from private.home_pity x where user_id=uid),
    'odds',jsonb_build_object('wardrobe',private.home_odds(uid,'wardrobe'),'room',private.home_odds(uid,'room')),
    'recent_rolls',(select coalesce(jsonb_agg(to_jsonb(x)-'user_id'),'[]') from
      (select * from private.home_rolls where user_id=uid order by created_at desc limit 10) x),
    'claimable_guess',(select coalesce(jsonb_agg(s.edition_id),'[]') from private.guess_people_sessions s
      join private.guess_people_editions e on e.id=s.edition_id where s.user_id=uid and s.status in ('won','lost')
      and e.kind='daily' and not e.is_preview and e.puzzle_date=d
      and not exists(select 1 from private.home_ledger l where l.user_id=uid and l.event_key='guess.daily:'||d::text)),
    'pan',(select to_jsonb(s)-'user_id' from private.home_pan_sessions s where s.user_id=uid and s.activity_date=d));
end $$;
create function private.home_roll(p_family text,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.home_bootstrap(); p private.home_players%rowtype; pity private.home_pity%rowtype;
  receipt private.home_rolls%rowtype; item public.home_items%rowtype; odds jsonb; u numeric; cumulative numeric:=0;
  candidate jsonb; owned boolean; returned integer; total numeric;
begin
  if p_family not in ('wardrobe','room') or p_family is null or p_request is null then raise exception 'invalid_roll_request'; end if;
  select * into p from private.home_players where user_id=uid for update;
  select * into receipt from private.home_rolls where user_id=uid and request_id=p_request;
  if receipt.request_id is not null then
    if receipt.family<>p_family then raise exception 'request_conflict'; end if;
    return jsonb_build_object('state',private.home_context(),'roll',to_jsonb(receipt)-'user_id');
  end if;
  if p.tickets<1 then raise exception 'not_enough_rolls'; end if;
  select * into pity from private.home_pity where user_id=uid and family=p_family;
  odds:=private.home_odds(uid,p_family);
  select sum((value->>'percent')::numeric) into total from jsonb_array_elements(odds);
  if total is null or abs(total-100)>0.000001 then raise exception 'collection_configuration_invalid'; end if;
  u:=private.home_random_unit()*total;
  for candidate in select value from jsonb_array_elements(odds) loop
    cumulative:=cumulative+(candidate->>'percent')::numeric;
    if u<cumulative then select * into item from public.home_items where id=candidate->>'item_id'; exit; end if;
  end loop;
  if item.id is null then raise exception 'collection_configuration_invalid'; end if;
  owned:=exists(select 1 from private.home_inventory where user_id=uid and item_id=item.id);
  returned:=case when owned then case item.rarity when 0 then 5 when 1 then 15 when 2 then 40 else 100 end else 0 end;
  if not owned then insert into private.home_inventory values(uid,item.id,1); end if;
  update private.home_pity set epic_misses=case when item.rarity>=2 then 0 else epic_misses+1 end,
    legendary_misses=case when item.rarity=3 then 0 else legendary_misses+1 end where user_id=uid and family=p_family;
  perform private.home_credit(uid,'roll:'||p_request::text,-1,returned);
  insert into private.home_rolls(user_id,request_id,family,item_id,duplicate,coins_returned,pity_before,odds)
    values(uid,p_request,p_family,item.id,owned,returned,to_jsonb(pity)-'user_id',odds) returning * into receipt;
  return jsonb_build_object('state',private.home_context(),'roll',to_jsonb(receipt)-'user_id');
end $$;
create function private.home_buy(p_item text,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.home_bootstrap(); p private.home_players%rowtype; i public.home_items%rowtype; qty integer; cost integer; key text;
begin
  if p_request is null or p_item is null then raise exception 'invalid_purchase'; end if;
  select * into p from private.home_players where user_id=uid for update;
  key:='buy:'||p_item||':'||p_request::text;
  if exists(select 1 from private.home_ledger where user_id=uid and event_key=key) then return private.home_context(); end if;
  select * into i from public.home_items where id=p_item;
  if i.id is null then raise exception 'unknown_item'; end if;
  select quantity into qty from private.home_inventory where user_id=uid and item_id=p_item;
  if (i.kind='wearable' and coalesce(qty,0)>=1) or coalesce(qty,0)>=8 then raise exception 'item_limit_reached'; end if;
  cost:=case when i.starter then 40 else case i.rarity when 0 then 80 when 1 then 160 when 2 then 400 else 900 end end;
  if p.coins<cost then raise exception 'not_enough_coins'; end if;
  perform private.home_credit(uid,key,0,-cost);
  insert into private.home_inventory values(uid,p_item,1) on conflict(user_id,item_id) do update set quantity=private.home_inventory.quantity+1;
  return private.home_context();
end $$;

create function private.home_claim_guess(p_edition uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.home_bootstrap(); e private.guess_people_editions%rowtype;
begin
  perform 1 from private.home_players where user_id=uid for update;
  select * into e from private.guess_people_editions where id=p_edition;
  if e.id is null or e.kind<>'daily' or e.is_preview or e.puzzle_date<>private.guess_business_date()
    or not exists(select 1 from private.guess_people_sessions s where s.edition_id=e.id and s.user_id=uid and s.status in ('won','lost')) then
    raise exception 'completed_daily_required'; end if;
  if private.home_credit(uid,'guess.daily:'||e.puzzle_date::text,1,30) then perform private.home_activity(uid); end if;
  return private.home_context();
end $$;
create function private.home_unlock_pan(p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.home_bootstrap(); p private.home_players%rowtype;
begin
  if p_request is null then raise exception 'invalid_purchase'; end if;
  select * into p from private.home_players where user_id=uid for update;
  if p.pan_unlocked then return private.home_context(); end if;
  if p.coins<150 then raise exception 'not_enough_coins'; end if;
  perform private.home_credit(uid,'unlock:pan-memory',0,-150);
  update private.home_players set pan_unlocked=true where user_id=uid;
  return private.home_context();
end $$;
create function private.home_start_pan() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.home_bootstrap(); pattern integer[];
begin
  perform 1 from private.home_players where user_id=uid and pan_unlocked for update;
  if not found then raise exception 'pan_game_locked'; end if;
  select array_agg(1+floor(private.home_random_unit()*4)::integer) into pattern from generate_series(1,6);
  insert into private.home_pan_sessions(user_id,activity_date,pattern) values(uid,private.guess_business_date(),pattern) on conflict(user_id,activity_date) do nothing;
  return private.home_context();
end $$;
create function private.home_finish_pan(p_session uuid,p_answer integer[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.home_bootstrap(); s private.home_pan_sessions%rowtype;
begin
  perform 1 from private.home_players where user_id=uid for update;
  select * into s from private.home_pan_sessions where id=p_session and user_id=uid for update;
  if s.id is null or s.activity_date<>private.guess_business_date() then raise exception 'pan_round_unavailable'; end if;
  if s.status<>'playing' then return private.home_context(); end if;
  if now()<s.ready_at then raise exception 'watch_pattern_first'; end if;
  if p_answer is null or cardinality(p_answer)<>6 or exists(select 1 from unnest(p_answer) a where a is null or a not between 1 and 4) then raise exception 'six_notes_required'; end if;
  update private.home_pan_sessions set status=case when pattern=p_answer then 'won' else 'lost' end,completed_at=now(),answer=p_answer where id=s.id;
  if private.home_credit(uid,'pan.daily:'||s.activity_date::text,1,10) then perform private.home_activity(uid); end if;
  return private.home_context();
end $$;

create function private.home_save(p_design jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.home_bootstrap(); p private.home_players%rowtype; e record; a jsonb; b jsonb;
  item public.home_items%rowtype; other public.home_items%rowtype; w integer; h integer; bw integer; bh integer;
begin
  select * into p from private.home_players where user_id=uid for update;
  if p_revision is distinct from p.design_revision then raise exception 'design_changed_reload'; end if;
  if jsonb_typeof(p_design) is distinct from 'object' or jsonb_typeof(p_design->'outfit') is distinct from 'object'
    or jsonb_typeof(p_design->'layout') is distinct from 'array' then raise exception 'invalid_design'; end if;
  if (p_design->>'skin') is null or (p_design->>'skin') !~ '^[0-7]$'
    or (p_design->>'floor') is null or (p_design->>'floor') !~ '^[0-2]$'
    or (p_design->>'wall') is null or (p_design->>'wall') !~ '^[0-2]$' then raise exception 'invalid_palette'; end if;
  if not(p_design->'outfit' ?& array['hair','top','bottom','shoes']) then raise exception 'basic_outfit_required'; end if;
  for e in select * from jsonb_each_text(p_design->'outfit') loop
    if e.key not in ('hair','hat','top','bottom','shoes') or e.value is null or not exists(
      select 1 from private.home_inventory v join public.home_items i on i.id=v.item_id
      where v.user_id=uid and i.id=e.value and i.kind='wearable' and i.slot=e.key) then raise exception 'outfit_not_owned'; end if;
  end loop;
  if jsonb_array_length(p_design->'layout')>24 then raise exception 'room_item_limit'; end if;
  if (select count(distinct value->>'instance_id') from jsonb_array_elements(p_design->'layout'))<>jsonb_array_length(p_design->'layout') then raise exception 'invalid_room_instances'; end if;
  for a in select value from jsonb_array_elements(p_design->'layout') loop
    if (a->>'instance_id') is null or (a->>'instance_id') !~ '^[a-zA-Z0-9_-]{1,80}$'
      or (a->>'x') is null or (a->>'x') !~ '^[0-7]$' or (a->>'y') is null or (a->>'y') !~ '^[0-7]$'
      or (a->>'rotation') is null or (a->>'rotation') !~ '^[01]$' then raise exception 'invalid_room_position'; end if;
    select * into item from public.home_items where id=a->>'item_id' and kind='furniture';
    if item.id is null or not exists(select 1 from private.home_inventory v where v.user_id=uid and v.item_id=item.id
      and v.quantity >= (select count(*) from jsonb_array_elements(p_design->'layout') x where x->>'item_id'=item.id)) then raise exception 'furniture_not_owned'; end if;
    w:=case when (a->>'rotation')::int=0 then item.width else item.height end;
    h:=case when (a->>'rotation')::int=0 then item.height else item.width end;
    if (a->>'x')::int+w>8 or (a->>'y')::int+h>8 then raise exception 'furniture_outside_room'; end if;
    for b in select value from jsonb_array_elements(p_design->'layout') where value->>'instance_id'>a->>'instance_id' loop
      select * into other from public.home_items where id=b->>'item_id';
      bw:=case when (b->>'rotation')::int=0 then other.width else other.height end;
      bh:=case when (b->>'rotation')::int=0 then other.height else other.width end;
      if item.layer=other.layer and (a->>'x')::int<(b->>'x')::int+bw and (b->>'x')::int<(a->>'x')::int+w
        and (a->>'y')::int<(b->>'y')::int+bh and (b->>'y')::int<(a->>'y')::int+h then raise exception 'furniture_overlap'; end if;
    end loop;
  end loop;
  update private.home_players set design=jsonb_build_object('skin',(p_design->>'skin')::int,'floor',(p_design->>'floor')::int,
    'wall',(p_design->>'wall')::int,'outfit',p_design->'outfit','layout',(select coalesce(jsonb_agg(jsonb_build_object('instance_id',v->>'instance_id','item_id',v->>'item_id','x',(v->>'x')::int,'y',(v->>'y')::int,'rotation',(v->>'rotation')::int)),'[]') from jsonb_array_elements(p_design->'layout') v)),design_revision=design_revision+1 where user_id=uid;
  return private.home_context();
end $$;

create function public.bmt_home_context() returns jsonb language sql security invoker set search_path='' as $$ select private.home_context(); $$;
create function public.bmt_home_roll(p_family text,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.home_roll(p_family,p_request); $$;
create function public.bmt_home_buy(p_item text,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.home_buy(p_item,p_request); $$;
create function public.bmt_home_save(p_design jsonb,p_revision integer) returns jsonb language sql security invoker set search_path='' as $$ select private.home_save(p_design,p_revision); $$;
create function public.bmt_home_claim_guess(p_edition uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.home_claim_guess(p_edition); $$;
create function public.bmt_home_unlock_pan(p_request uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.home_unlock_pan(p_request); $$;
create function public.bmt_home_start_pan() returns jsonb language sql security invoker set search_path='' as $$ select private.home_start_pan(); $$;
create function public.bmt_home_finish_pan(p_session uuid,p_answer integer[]) returns jsonb language sql security invoker set search_path='' as $$ select private.home_finish_pan(p_session,p_answer); $$;

-- Completion and its earned reward commit together. An optional manual claim
-- remains available for a current daily completed before this migration.
create or replace function public.guess_people_submit(p_edition uuid,p_guess uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  result:=private.guess_submit(p_edition,p_guess);
  if result->>'status' in ('won','lost') and result->'edition'->>'kind'='daily'
    and (result->'edition'->>'is_preview')::boolean=false
    and result->'edition'->>'date'=result->>'business_date' and (result->>'expired')::boolean=false then
    perform private.home_claim_guess(p_edition);
  end if;
  return result;
end $$;

do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like 'home_%' loop
    execute format('revoke all on function %s from public,anon,authenticated',f);
  end loop;
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'bmt_home_%' loop
    execute format('revoke all on function %s from public,anon',f);
    execute format('grant execute on function %s to authenticated',f);
  end loop;
end $$;
grant execute on function private.home_context(),private.home_roll(text,uuid),private.home_buy(text,uuid),private.home_save(jsonb,integer),
  private.home_claim_guess(uuid),private.home_unlock_pan(uuid),private.home_start_pan(),private.home_finish_pan(uuid,integer[]) to authenticated;

insert into public.home_items(id,label,kind,slot,rarity,starter,family,color,variant,width,height,layer) values
('hair-short','Short hair','wearable','hair',0,true,null,'#302825','short',1,1,1),
('hair-curls','Curls','wearable','hair',0,true,null,'#302825','curls',1,1,1),
('hair-locs','Locs','wearable','hair',0,true,null,'#302825','locs',1,1,1),
('tee-red','Red tee','wearable','top',0,true,null,'#ce473b','tee',1,1,1),
('tee-blue','Blue tee','wearable','top',0,true,null,'#547aab','tee',1,1,1),
('pants-dark','Dark trousers','wearable','bottom',0,true,null,'#343e50','pants',1,1,1),
('pants-denim','Denim','wearable','bottom',0,true,null,'#5170a0','pants',1,1,1),
('shoes-basic','Everyday shoes','wearable','shoes',0,true,null,'#302b36','shoes',1,1,1),
('chair-basic','Wooden chair','furniture',null,0,true,null,'#ba8355','chair',1,1,1),
('table-basic','Small table','furniture',null,0,true,null,'#c99260','table',2,1,1),
('plant-basic','Little plant','furniture',null,0,true,null,'#67a15c','plant',1,1,1),
('rug-basic','Woven rug','furniture',null,0,true,null,'#b56649','rug',2,2,0),
('hat-mint','Mint cap','wearable','hat',0,false,'wardrobe','#67b7a6','cap',1,1,1),
('tee-mustard','Mustard tee','wearable','top',0,false,'wardrobe','#d4a341','tee',1,1,1),
('pants-indigo','Indigo trousers','wearable','bottom',0,false,'wardrobe','#60579c','pants',1,1,1),
('hair-volume','Full curls','wearable','hair',1,false,'wardrobe','#432831','curls',1,1,1),
('hat-straw','Straw hat','wearable','hat',1,false,'wardrobe','#d6b475','wide-hat',1,1,1),
('jacket-fete','Fete jacket','wearable','top',2,false,'wardrobe','#935db8','jacket',1,1,1),
('hat-pan','Pan captain cap','wearable','hat',2,false,'wardrobe','#5db7c7','cap',1,1,1),
('suit-sunset','Sunset carnival suit','wearable','top',3,false,'wardrobe','#e6ad48','jacket',1,1,1),
('stool-red','Red stool','furniture',null,0,false,'room','#ce6355','chair',1,1,1),
('plant-fern','Fern','furniture',null,0,false,'room','#548556','plant',1,1,1),
('lamp-warm','Warm floor lamp','furniture',null,0,false,'room','#ddbb67','lamp',1,1,1),
('sofa-teal','Teal sofa','furniture',null,1,false,'room','#55968d','sofa',2,1,1),
('fan-standing','Standing fan','furniture',null,1,false,'room','#a9b8bd','fan',1,1,1),
('steelpan','Steelpan stand','furniture',null,2,false,'room','#8babc0','pan',1,1,1),
('arcade-cabinet','Arcade cabinet','furniture',null,2,false,'room','#985bb6','arcade',1,1,1),
('sofa-carnival','Carnival lounge','furniture',null,3,false,'room','#c7964c','sofa',3,1,1);
notify pgrst,'reload schema';
