-- Additive people game. Legacy entities, daily history, Ting and Draw are retained.
-- One authoritative comparator serves editor preview, practice and daily play.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Account presentation is client-editable; role assignment remains server-owned.
revoke update on public.profiles from anon, authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

create table public.guess_people_vocabulary (
  version integer not null,
  attribute text not null check (attribute in ('known_for','speciality','gender')),
  value text not null,
  label text not null,
  primary key (version, attribute, value)
);
insert into public.guess_people_vocabulary (version, attribute, value, label) values
  (1,'known_for','music','Music'), (1,'known_for','sport','Sport'),
  (1,'known_for','public_life','Public life'), (1,'known_for','screen_stage','Screen and stage'),
  (1,'known_for','online_broadcast','Online and broadcast'), (1,'known_for','arts_literature','Arts and literature'),
  (1,'speciality','soca','Soca'), (1,'speciality','calypso','Calypso'),
  (1,'speciality','chutney','Chutney'), (1,'speciality','rap','Rap'), (1,'speciality','rb_pop','R&B / pop'),
  (1,'speciality','cricket','Cricket'), (1,'speciality','football','Football'),
  (1,'speciality','sprinting','Sprinting'), (1,'speciality','javelin','Javelin'), (1,'speciality','cycling','Cycling'),
  (1,'speciality','political_leadership','Political leadership'), (1,'speciality','acting','Acting'),
  (1,'speciality','musical_theatre','Musical theatre'), (1,'speciality','pageantry','Pageantry'),
  (1,'speciality','stage_comedy','Stage comedy'), (1,'speciality','digital_comedy','Digital comedy'),
  (1,'speciality','broadcasting','Broadcasting'), (1,'speciality','writing','Writing'),
  (1,'speciality','mas_design','Mas design'), (1,'speciality','dance','Dance'),
  (1,'gender','man','Man'), (1,'gender','woman','Woman'), (1,'gender','non_binary','Non-binary');

create table public.guess_people (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  aliases text[] not null default '{}',
  legacy_entity_id uuid unique references public.entities(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.guess_person_facts (
  person_id uuid primary key references public.guess_people(id) on delete restrict,
  birth_year smallint check (birth_year between 1800 and 2100),
  gender text,
  tt_connection text,
  claims jsonb not null default '{}' check (jsonb_typeof(claims) = 'object')
);
create table public.guess_person_profiles (
  person_id uuid primary key references public.guess_people(id) on delete restrict,
  vocabulary_version integer not null default 1 check (vocabulary_version = 1),
  review_status text not null default 'draft' check (review_status in ('draft','reviewed')),
  primary_lane text not null,
  primary_speciality text not null,
  known_for text[] not null,
  specialities text[] not null,
  biography text not null default '',
  clue jsonb not null default '{"text":"","urls":[],"reviewed":false,"compatible_ids":[]}' check (jsonb_typeof(clue) = 'object'),
  fairness_note text not null default '',
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  check (cardinality(known_for) between 1 and 2),
  check (cardinality(specialities) between 1 and 2),
  check (primary_lane = any(known_for)),
  check (primary_speciality = any(specialities))
);
-- Asset permissions are deliberately separate from biographical source evidence.
-- No researched portrait is imported without its reuse permission.
create table public.guess_person_assets (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.guess_people(id) on delete restrict,
  source_url text not null check (source_url ~ '^https://'),
  asset_url text not null check (asset_url ~ '^https://'),
  credit text not null,
  license_url text check (license_url ~ '^https://'),
  permission_note text not null default '',
  review_status text not null default 'draft' check (review_status in ('draft','reviewed')),
  check (review_status <> 'reviewed' or (btrim(credit) <> '' and (license_url is not null or btrim(permission_note) <> '')))
);
create index guess_person_assets_person_idx on public.guess_person_assets(person_id);
create index guess_person_profiles_reviewer_idx on public.guess_person_profiles(reviewed_by);

create table private.guess_people_editions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('daily','practice')),
  puzzle_date date,
  owner_id uuid references auth.users(id) on delete cascade,
  answer_id uuid not null references public.guess_people(id) on delete restrict,
  rules_version text not null default 'people-v1' check (rules_version = 'people-v1'),
  roster jsonb not null check (jsonb_typeof(roster) = 'array' and jsonb_array_length(roster) > 0),
  vocabulary jsonb not null,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  check ((kind = 'daily' and puzzle_date is not null and owner_id is null and not is_preview)
    or (kind = 'practice' and puzzle_date is null and owner_id is not null)),
  unique (puzzle_date)
);
create index guess_people_practice_owner_idx on private.guess_people_editions(owner_id, created_at desc) where kind = 'practice';
create index guess_people_edition_answer_idx on private.guess_people_editions(answer_id);
create table private.guess_people_sessions (
  edition_id uuid not null references private.guess_people_editions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'playing' check (status in ('playing','won','lost')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (edition_id,user_id),
  check ((status = 'playing' and completed_at is null) or (status <> 'playing' and completed_at is not null))
);
create index guess_people_sessions_user_idx on private.guess_people_sessions(user_id, completed_at desc);
create table private.guess_people_attempts (
  edition_id uuid not null,
  user_id uuid not null,
  attempt_number smallint not null check (attempt_number between 1 and 8),
  guess_id uuid not null references public.guess_people(id) on delete restrict,
  feedback jsonb not null,
  created_at timestamptz not null default now(),
  primary key (edition_id,user_id,attempt_number),
  unique (edition_id,user_id,guess_id),
  foreign key (edition_id,user_id) references private.guess_people_sessions(edition_id,user_id) on delete cascade
);
create index guess_people_attempt_guess_idx on private.guess_people_attempts(guess_id);

create function private.guess_is_editor() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;
revoke all on function private.guess_is_editor() from public, anon;
grant execute on function private.guess_is_editor() to authenticated;

alter table public.guess_people_vocabulary enable row level security;
create policy vocabulary_read on public.guess_people_vocabulary for select to anon, authenticated using (true);
grant select on public.guess_people_vocabulary to anon, authenticated;
do $$ declare t text; begin
  foreach t in array array['guess_people','guess_person_facts','guess_person_profiles','guess_person_assets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy editor_read on public.%I for select to authenticated using ((select private.guess_is_editor()))', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
grant all on public.guess_people_vocabulary to service_role;
alter table private.guess_people_editions enable row level security;
alter table private.guess_people_sessions enable row level security;
alter table private.guess_people_attempts enable row level security;
revoke all on private.guess_people_editions,private.guess_people_sessions,private.guess_people_attempts from public, anon, authenticated;

create function private.guess_business_date(p_now timestamptz default now()) returns date
language sql stable set search_path = '' as $$ select (p_now at time zone 'America/Port_of_Spain')::date; $$;
create function private.guess_set_match(g jsonb, a jsonb) returns text
language sql immutable set search_path = '' as $$
  select case
    when g is null or a is null or g = 'null' or a = 'null' or g = '[]' or a = '[]' then 'unknown'
    when g @> a and a @> g then 'exact'
    when exists (select 1 from jsonb_array_elements_text(g) x join jsonb_array_elements_text(a) y on x.value = y.value) then 'partial'
    else 'wrong' end;
$$;
create function private.guess_people_feedback_v1(g jsonb, a jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare gy int := (g->>'birth_year')::int; ay int := (a->>'birth_year')::int; born jsonb; gender text;
begin
  born := jsonb_build_object('state', case when gy is null or ay is null then 'unknown' when gy = ay then 'exact'
    when abs(gy-ay) <= 5 then 'partial' else 'wrong' end,
    'direction', case when gy is null or ay is null or gy = ay then null when ay < gy then 'earlier' else 'later' end);
  gender := case when nullif(g->>'gender','') is null or nullif(a->>'gender','') is null then 'unknown'
    when g->>'gender' = a->>'gender' then 'exact' else 'wrong' end;
  return jsonb_build_object('known_for',private.guess_set_match(g->'known_for',a->'known_for'),
    'speciality',private.guess_set_match(g->'specialities',a->'specialities'), 'born',born, 'gender',gender);
end $$;

create function private.guess_profiles_snapshot(p_ids uuid[] default null, p_drafts boolean default false) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'slug',p.slug,'name',p.name,'aliases',p.aliases,
    'known_for',gp.known_for,'specialities',gp.specialities,'primary_lane',gp.primary_lane,'primary_speciality',gp.primary_speciality,
    'birth_year',f.birth_year,'gender',f.gender,'tt_connection',f.tt_connection,'claims',f.claims,
    'biography',gp.biography,'clue',gp.clue,'fairness_note',gp.fairness_note,'revision',gp.revision,'review_status',gp.review_status) order by p.name), '[]')
  from public.guess_people p join public.guess_person_facts f on f.person_id=p.id
  join public.guess_person_profiles gp on gp.person_id=p.id
  where (p_ids is null or p.id=any(p_ids)) and (p_drafts or gp.review_status='reviewed');
$$;
create function private.guess_public_candidate(p jsonb) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',p->'id','name',p->'name','aliases',p->'aliases','known_for',p->'known_for',
    'specialities',p->'specialities','birth_year',p->'birth_year','gender',p->'gender');
$$;

create function private.guess_context(p_edition uuid default null, p_preview boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e private.guess_people_editions%rowtype; s text := 'playing';
  r jsonb; cat jsonb; vocab jsonb; attempts jsonb; answer jsonb; hints jsonb := '[]'; misses int := 0; expired boolean := false;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  if p_preview and not private.guess_is_editor() then raise exception 'editor_required'; end if;
  if p_edition is null then
    select * into e from private.guess_people_editions where kind='daily' and puzzle_date=private.guess_business_date();
  else select * into e from private.guess_people_editions where id=p_edition; end if;
  if e.id is null and p_edition is not null then raise exception 'edition_not_found'; end if;
  if e.id is not null then
    if e.kind='practice' and e.owner_id<>uid then raise exception 'edition_not_found'; end if;
    if e.kind='daily' and e.puzzle_date>private.guess_business_date() then raise exception 'edition_not_available'; end if;
    r:=e.roster; vocab:=e.vocabulary;
    expired:=e.kind='daily' and e.puzzle_date<>private.guess_business_date();
    select status into s from private.guess_people_sessions where edition_id=e.id and user_id=uid;
    s:=coalesce(s,'playing');
    select coalesce(jsonb_agg(jsonb_build_object('number',attempt_number,'guess_id',guess_id,'feedback',feedback) order by attempt_number),'[]'),
      count(*) filter(where guess_id<>e.answer_id) into attempts, misses
      from private.guess_people_attempts where edition_id=e.id and user_id=uid;
    select value into answer from jsonb_array_elements(r) where value->>'id'=e.answer_id::text;
    if misses>=3 then
      hints:=hints || jsonb_build_array(jsonb_build_object('unlock_after',3,'text','Their main lane is ' ||
        (select value->>'label' from jsonb_array_elements(vocab) where value->>'attribute'='known_for' and value->>'value'=answer->>'primary_lane') || '.'));
    end if;
    if misses>=5 and nullif(btrim(answer->'clue'->>'text'),'') is not null then
      hints:=hints || jsonb_build_array(jsonb_build_object('unlock_after',5,'text',answer->'clue'->>'text'));
    end if;
    if misses>=7 then
      hints:=hints || jsonb_build_array(jsonb_build_object('unlock_after',7,'text','Their public-name initials are ' ||
        (select string_agg(upper(left(part,1)), ' ') from regexp_split_to_table(answer->>'name','[[:space:]]+') part) || '.'));
    end if;
    if s not in ('won','lost') then answer:=null;
    else
      answer:=jsonb_build_object('id',answer->'id','name',answer->'name','biography',answer->'biography','tt_connection',answer->'tt_connection',
        'sources',(select coalesce(jsonb_agg(distinct u.value),'[]') from jsonb_each(answer->'claims') c
          cross join lateral jsonb_array_elements(c.value->'urls') u));
    end if;
  else
    r:=private.guess_profiles_snapshot(null,p_preview); attempts:='[]'; s:='unavailable';
    select coalesce(jsonb_agg(to_jsonb(v)),'[]') into vocab from public.guess_people_vocabulary v where version=1;
  end if;
  select coalesce(jsonb_agg(private.guess_public_candidate(value)),'[]') into cat from jsonb_array_elements(r);
  return jsonb_build_object('business_date',private.guess_business_date(), 'edition',case when e.id is null then null else
    jsonb_build_object('id',e.id,'kind',e.kind,'date',e.puzzle_date,'rules_version',e.rules_version,'is_preview',e.is_preview,
      'expires_at',case when e.kind='daily' then (e.puzzle_date+1)::timestamp at time zone 'America/Port_of_Spain' else null end) end,
    'catalog',cat,'vocabulary',vocab,'attempts',attempts,'status',s,'expired',expired,'hints',hints,'answer',answer);
end $$;

create function private.guess_start_practice(p_preview boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); roster jsonb; vocab jsonb; answer uuid; eid uuid;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  if p_preview and not private.guess_is_editor() then raise exception 'editor_required'; end if;
  if (select count(*) from private.guess_people_editions where owner_id=uid and created_at>now()-interval '1 hour')>=100 then
    raise exception 'practice_limit_reached'; end if;
  roster:=private.guess_profiles_snapshot(null,p_preview);
  if jsonb_array_length(roster)<2 then raise exception 'practice_roster_not_ready'; end if;
  select (value->>'id')::uuid into answer from jsonb_array_elements(roster) order by random() limit 1;
  select jsonb_agg(to_jsonb(v)) into vocab from public.guess_people_vocabulary v where version=1;
  insert into private.guess_people_editions(kind,owner_id,answer_id,roster,vocabulary,is_preview)
    values('practice',uid,answer,roster,vocab,p_preview) returning id into eid;
  insert into private.guess_people_sessions(edition_id,user_id) values(eid,uid);
  return private.guess_context(eid,false);
end $$;

create function private.guess_submit(p_edition uuid, p_guess uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e private.guess_people_editions%rowtype; s private.guess_people_sessions%rowtype;
  g jsonb; a jsonb; n int; feedback jsonb;
begin
  if uid is null then raise exception 'sign_in_required'; end if;
  select * into e from private.guess_people_editions where id=p_edition;
  if e.id is null or (e.kind='practice' and e.owner_id<>uid) then raise exception 'edition_not_found'; end if;
  if e.kind='daily' and e.puzzle_date<>private.guess_business_date() then raise exception 'edition_not_available'; end if;
  insert into private.guess_people_sessions(edition_id,user_id) values(e.id,uid) on conflict do nothing;
  -- Serialize this player's round. Every following check and write is one transaction.
  select * into s from private.guess_people_sessions where edition_id=e.id and user_id=uid for update;
  if s.status<>'playing' then return private.guess_context(e.id,false); end if;
  if exists(select 1 from private.guess_people_attempts where edition_id=e.id and user_id=uid and guess_id=p_guess) then
    return private.guess_context(e.id,false); end if;
  select value into g from jsonb_array_elements(e.roster) where value->>'id'=p_guess::text;
  select value into a from jsonb_array_elements(e.roster) where value->>'id'=e.answer_id::text;
  if g is null then raise exception 'guess_not_in_roster'; end if;
  select count(*)+1 into n from private.guess_people_attempts where edition_id=e.id and user_id=uid;
  if n>8 then raise exception 'round_finished'; end if;
  feedback:=private.guess_people_feedback_v1(g,a);
  insert into private.guess_people_attempts(edition_id,user_id,attempt_number,guess_id,feedback) values(e.id,uid,n,p_guess,feedback);
  if p_guess=e.answer_id or n=8 then
    update private.guess_people_sessions set status=case when p_guess=e.answer_id then 'won' else 'lost' end,completed_at=now()
      where edition_id=e.id and user_id=uid;
  end if;
  return private.guess_context(e.id,false);
end $$;

-- Keep edition content immutable, including before the first attempt.
create function private.guess_edition_immutable() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'published_editions_are_immutable'; end $$;
create trigger guess_edition_immutable before update on private.guess_people_editions for each row execute function private.guess_edition_immutable();

create function private.guess_validate_profile(p jsonb) returns void language plpgsql set search_path = '' as $$
declare key text; vals jsonb; claim jsonb; required boolean;
begin
  if p->>'review_status' not in ('draft','reviewed') then raise exception 'invalid_review_status'; end if;
  foreach key in array array['known_for','specialities'] loop
    vals:=p->key;
    if jsonb_typeof(vals) is distinct from 'array' or jsonb_array_length(vals) not between 1 and 2 then raise exception 'choose_one_or_two_%',key; end if;
    if (select count(distinct value) from jsonb_array_elements_text(vals))<>jsonb_array_length(vals) then raise exception 'duplicate_tags'; end if;
    if exists(select 1 from jsonb_array_elements_text(vals) v where not exists(select 1 from public.guess_people_vocabulary w
      where w.version=1 and w.attribute=case when key='specialities' then 'speciality' else key end and w.value=v.value)) then raise exception 'unknown_vocabulary_value'; end if;
  end loop;
  if not (p->'known_for' ? (p->>'primary_lane')) then raise exception 'primary_lane_must_be_known_for'; end if;
  if not (p->'specialities' ? (p->>'primary_speciality')) then raise exception 'primary_speciality_must_be_selected'; end if;
  if p->>'gender' is not null and not exists(select 1 from public.guess_people_vocabulary where version=1 and attribute='gender' and value=p->>'gender') then raise exception 'unknown_gender_value'; end if;
  if char_length(p->>'name') not between 2 and 100 or char_length(coalesce(p->>'biography',''))>3000 then raise exception 'invalid_text_length'; end if;
  if jsonb_typeof(p->'claims') is distinct from 'object' then raise exception 'claims_required'; end if;
  foreach key in array array['name','known_for','specialities','birth_year','gender','tt_connection'] loop
    claim:=p->'claims'->key;
    if claim->>'status' is null or claim->>'status' not in ('draft','reviewed','unconfirmed','conflicting')
      or jsonb_typeof(claim->'urls') is distinct from 'array' then raise exception 'invalid_claim_%',key; end if;
    if jsonb_array_length(claim->'urls')>8 or exists(select 1 from jsonb_array_elements_text(claim->'urls') u where u.value !~ '^https://[^[:space:]]+$') then raise exception 'invalid_source_url'; end if;
    required:=p->>'review_status'='reviewed' and (key in ('name','known_for','specialities','tt_connection') or p->>key is not null);
    if required and (claim->>'status'<>'reviewed' or jsonb_array_length(claim->'urls')=0) then raise exception 'review_and_source_%',key; end if;
    if p->>'review_status'='reviewed' and p->>key is null and key in ('birth_year','gender') and
      (claim->>'status' not in ('unconfirmed','conflicting') or btrim(coalesce(claim->>'note',''))='') then raise exception 'document_unknown_%',key; end if;
  end loop;
  if p->>'review_status'='reviewed' then
    if (p->>'birth_year')::int > extract(year from now()) then raise exception 'birth_year_is_in_the_future'; end if;
    if btrim(coalesce(p->>'tt_connection',''))='' or btrim(coalesce(p->>'biography',''))='' then raise exception 'biography_and_connection_required'; end if;
    if p->>'birth_year' is null and btrim(coalesce(p->>'fairness_note',''))='' then raise exception 'unknown_year_needs_fair_clue_review'; end if;
    if (p->'clue'->>'reviewed')::boolean is distinct from true or btrim(coalesce(p->'clue'->>'text',''))=''
      or jsonb_typeof(p->'clue'->'urls') is distinct from 'array' or jsonb_array_length(p->'clue'->'urls')=0 then raise exception 'reviewed_sourced_clue_required'; end if;
    if exists(select 1 from jsonb_array_elements_text(p->'clue'->'urls') u where u.value !~ '^https://[^[:space:]]+$') then raise exception 'invalid_clue_source'; end if;
    if jsonb_typeof(p->'clue'->'compatible_ids') is distinct from 'array' or jsonb_array_length(p->'clue'->'compatible_ids') not between 1 and 3
      or not(p->'clue'->'compatible_ids' ? (p->>'id')) then raise exception 'clue_must_identify_at_most_three_people'; end if;
  end if;
end $$;

create function private.guess_save_profile(p_profile jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb:=p_profile; pid uuid; previous_revision int; aliases text[];
begin
  if auth.uid() is null or not private.guess_is_editor() then raise exception 'editor_required'; end if;
  pid:=coalesce((p->>'id')::uuid,gen_random_uuid());
  p:=p || jsonb_build_object('id',pid);
  perform private.guess_validate_profile(p);
  select revision into previous_revision from public.guess_person_profiles where person_id=pid for update;
  if previous_revision is not null and (p->>'revision')::int is distinct from previous_revision then raise exception 'profile_changed_reload_before_saving'; end if;
  if jsonb_typeof(p->'aliases') is distinct from 'array' or jsonb_array_length(p->'aliases')>20 then raise exception 'invalid_aliases'; end if;
  select coalesce(array_agg(distinct btrim(value)) filter(where btrim(value)<>''),'{}') into aliases from jsonb_array_elements_text(p->'aliases');
  if exists(select 1 from unnest(aliases) x where char_length(x)>100) then raise exception 'invalid_aliases'; end if;
  insert into public.guess_people(id,slug,name,aliases) values(pid,p->>'slug',btrim(p->>'name'),aliases)
    on conflict(id) do update set slug=excluded.slug,name=excluded.name,aliases=excluded.aliases;
  insert into public.guess_person_facts(person_id,birth_year,gender,tt_connection,claims)
    values(pid,(p->>'birth_year')::smallint,p->>'gender',p->>'tt_connection',p->'claims')
    on conflict(person_id) do update set birth_year=excluded.birth_year,gender=excluded.gender,tt_connection=excluded.tt_connection,claims=excluded.claims;
  insert into public.guess_person_profiles(person_id,review_status,primary_lane,primary_speciality,known_for,specialities,biography,clue,fairness_note,revision,reviewed_by)
    values(pid,p->>'review_status',p->>'primary_lane',p->>'primary_speciality',array(select jsonb_array_elements_text(p->'known_for')),
      array(select jsonb_array_elements_text(p->'specialities')),coalesce(p->>'biography',''),p->'clue',coalesce(p->>'fairness_note',''),coalesce(previous_revision,0)+1,
      case when p->>'review_status'='reviewed' then auth.uid() else null end)
    on conflict(person_id) do update set review_status=excluded.review_status,primary_lane=excluded.primary_lane,primary_speciality=excluded.primary_speciality,
      known_for=excluded.known_for,specialities=excluded.specialities,biography=excluded.biography,clue=excluded.clue,
      fairness_note=excluded.fairness_note,revision=excluded.revision,reviewed_by=excluded.reviewed_by,updated_at=now();
  return (select value from jsonb_array_elements(private.guess_profiles_snapshot(array[pid],true)));
end $$;

create function private.guess_publish_daily(p_date date, p_answer uuid, p_roster uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare roster jsonb; profile jsonb; vocab jsonb; eid uuid;
begin
  if auth.uid() is null or not private.guess_is_editor() then raise exception 'editor_required'; end if;
  if p_date is null or p_date<private.guess_business_date() or p_date>private.guess_business_date()+365 then raise exception 'invalid_publication_date'; end if;
  if cardinality(p_roster) not between 8 and 64 or (select count(distinct x) from unnest(p_roster) x)<>cardinality(p_roster) then raise exception 'choose_eight_to_sixtyfour_unique_people'; end if;
  if p_answer is null or not(p_answer=any(p_roster)) then raise exception 'answer_must_be_in_roster'; end if;
  -- Prevent publication from racing an editorial save during snapshot creation.
  perform 1 from public.guess_person_profiles where person_id=any(p_roster) order by person_id for share;
  roster:=private.guess_profiles_snapshot(p_roster,false);
  if jsonb_array_length(roster)<>cardinality(p_roster) then raise exception 'only_reviewed_profiles_can_be_published'; end if;
  for profile in select value from jsonb_array_elements(roster) loop
    perform private.guess_validate_profile(profile);
    if exists(select 1 from jsonb_array_elements_text(profile->'clue'->'compatible_ids') c where not((c.value)::uuid=any(p_roster))) then raise exception 'review_clue_compatibility_for_this_roster'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(roster) p group by p->>'primary_speciality' having count(*)>3)
    or (select count(*) from jsonb_array_elements(roster) p where p->'specialities' ? 'cricket')>2 then raise exception 'speciality_caps_exceeded'; end if;
  if (select count(distinct p->>'primary_lane') from jsonb_array_elements(roster) p)<4
    or exists(select 1 from jsonb_array_elements(roster) p group by p->>'primary_lane' having count(*)>jsonb_array_length(roster)/2) then raise exception 'roster_needs_more_variety'; end if;
  -- Identical categorical/year profiles need distinct, explicitly reviewed recognition clues.
  if exists(select 1 from jsonb_array_elements(roster) a cross join jsonb_array_elements(roster) b
    where a->>'id'<b->>'id' and (a->'known_for') @> (b->'known_for') and (b->'known_for') @> (a->'known_for')
      and (a->'specialities') @> (b->'specialities') and (b->'specialities') @> (a->'specialities')
      and a->'birth_year'=b->'birth_year' and a->'gender'=b->'gender'
      and (a->'clue'->>'text'=b->'clue'->>'text' or btrim(a->>'fairness_note')='' or btrim(b->>'fairness_note')='')) then raise exception 'review_indistinguishable_people'; end if;
  select jsonb_agg(to_jsonb(v)) into vocab from public.guess_people_vocabulary v where version=1;
  insert into private.guess_people_editions(kind,puzzle_date,answer_id,roster,vocabulary)
    values('daily',p_date,p_answer,roster,vocab) returning id into eid;
  return eid;
end $$;

create function private.guess_editor_catalog() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.guess_is_editor() then raise exception 'editor_required'; end if;
  return private.guess_profiles_snapshot(null,true);
end $$;
create function private.guess_preview_feedback(p_guess uuid, p_answer uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; g jsonb; a jsonb;
begin
  if auth.uid() is null or not private.guess_is_editor() then raise exception 'editor_required'; end if;
  r:=private.guess_profiles_snapshot(array[p_guess,p_answer],true);
  select value into g from jsonb_array_elements(r) where value->>'id'=p_guess::text;
  select value into a from jsonb_array_elements(r) where value->>'id'=p_answer::text;
  if g is null or a is null then raise exception 'person_not_found'; end if;
  return private.guess_people_feedback_v1(g,a);
end $$;

-- Public API wrappers are invokers. Private entrypoints validate the current JWT
-- identity/role; internal helpers and answer/history tables have no client grants.
create function public.guess_people_context(p_edition uuid default null,p_preview boolean default false) returns jsonb
  language sql security invoker set search_path = '' as $$ select private.guess_context(p_edition,p_preview); $$;
create function public.guess_people_start_practice(p_preview boolean default false) returns jsonb
  language sql security invoker set search_path = '' as $$ select private.guess_start_practice(p_preview); $$;
create function public.guess_people_submit(p_edition uuid,p_guess uuid) returns jsonb
  language sql security invoker set search_path = '' as $$ select private.guess_submit(p_edition,p_guess); $$;
create function public.guess_people_save_profile(p_profile jsonb) returns jsonb
  language sql security invoker set search_path = '' as $$ select private.guess_save_profile(p_profile); $$;
create function public.guess_people_publish_daily(p_date date,p_answer uuid,p_roster uuid[]) returns uuid
  language sql security invoker set search_path = '' as $$ select private.guess_publish_daily(p_date,p_answer,p_roster); $$;
create function public.guess_people_editor_catalog() returns jsonb
  language sql security invoker set search_path = '' as $$ select private.guess_editor_catalog(); $$;
create function public.guess_people_preview_feedback(p_guess uuid,p_answer uuid) returns jsonb
  language sql security invoker set search_path = '' as $$ select private.guess_preview_feedback(p_guess,p_answer); $$;

do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.proname like 'guess_%' loop
    execute format('revoke all on function %s from public, anon, authenticated',f);
  end loop;
end $$;
grant execute on function private.guess_is_editor(),private.guess_context(uuid,boolean),private.guess_start_practice(boolean),
  private.guess_submit(uuid,uuid),private.guess_save_profile(jsonb),private.guess_publish_daily(date,uuid,uuid[]),
  private.guess_editor_catalog(),private.guess_preview_feedback(uuid,uuid) to authenticated;
do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'guess_people_%' loop
    execute format('revoke all on function %s from public, anon',f);
    execute format('grant execute on function %s to authenticated',f);
  end loop;
end $$;
