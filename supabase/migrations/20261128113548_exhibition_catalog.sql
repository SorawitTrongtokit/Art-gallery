create table public.catalog_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.catalog_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('artwork', 'category', 'home')),
  key text not null,
  draft_id uuid,
  published_id uuid,
  archived_at timestamptz,
  unique (kind, key),
  check ((kind = 'artwork' and key ~ '^[A-Z0-9][A-Z0-9-]{0,39}$')
      or (kind = 'category' and key ~ '^0[1-7]$')
      or (kind = 'home' and key = 'home')),
  check (archived_at is null or (kind = 'artwork' and published_id is null))
);

create table public.catalog_revisions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.catalog_entries(id),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  category_code text generated always as (content->>'categoryCode') stored,
  created_at timestamptz not null default now(),
  unique (entry_id, id),
  check (category_code is null or category_code ~ '^0[1-7]$')
);

alter table public.catalog_entries
  add foreign key (id, draft_id) references public.catalog_revisions(entry_id, id),
  add foreign key (id, published_id) references public.catalog_revisions(entry_id, id);
create index catalog_revisions_category on public.catalog_revisions(category_code);

create table public.catalog_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  ready_at timestamptz
);
create table public.catalog_revision_media (
  revision_id uuid not null references public.catalog_revisions(id),
  media_id uuid not null references public.catalog_media(id),
  primary key (revision_id, media_id)
);
create index catalog_revision_media_asset on public.catalog_revision_media(media_id);

create table public.catalog_history (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.catalog_entries(id),
  revision_id uuid,
  actor_id uuid not null,
  action text not null check (action in ('save', 'publish', 'archive', 'restore')),
  created_at timestamptz not null default now(),
  foreign key (entry_id, revision_id) references public.catalog_revisions(entry_id, id)
);
create index catalog_history_entry on public.catalog_history(entry_id, created_at desc);
create index catalog_history_recent on public.catalog_history(created_at desc);

create table public.catalog_imports (
  owner_id uuid not null,
  id uuid not null,
  result integer,
  primary key (owner_id, id)
);

insert into public.catalog_entries (kind, key) values
  ('category', '01'), ('category', '02'), ('category', '03'), ('category', '04'),
  ('category', '05'), ('category', '06'), ('category', '07'), ('home', 'home');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exhibition', 'exhibition', false, 4194304, array['image/webp']);

alter table public.catalog_admins enable row level security;
alter table public.catalog_entries enable row level security;
alter table public.catalog_revisions enable row level security;
alter table public.catalog_media enable row level security;
alter table public.catalog_revision_media enable row level security;
alter table public.catalog_history enable row level security;
alter table public.catalog_imports enable row level security;

revoke all on public.catalog_admins, public.catalog_entries, public.catalog_revisions,
  public.catalog_media, public.catalog_revision_media, public.catalog_history, public.catalog_imports
  from public, anon, authenticated;
grant select on public.catalog_admins to authenticated;
grant select, insert on public.catalog_admins to service_role;
grant select, insert, update on public.catalog_entries, public.catalog_media, public.catalog_imports to authenticated;
grant select, insert on public.catalog_revisions, public.catalog_revision_media, public.catalog_history to authenticated;
grant select (id, kind, key, published_id) on public.catalog_entries to anon;
grant select (id, entry_id, content, category_code) on public.catalog_revisions to anon;
grant select (id) on public.catalog_media to anon;
grant select (revision_id, media_id) on public.catalog_revision_media to anon;

create policy own_admin_membership on public.catalog_admins
for select to authenticated using (user_id = (select auth.uid()));

create function public.is_catalog_admin() returns boolean
language sql stable security invoker set search_path = ''
as $$
  select exists (select 1 from public.catalog_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_catalog_admin() from public, anon;
grant execute on function public.is_catalog_admin() to authenticated;

create policy admin_entries on public.catalog_entries to authenticated
using ((select public.is_catalog_admin())) with check ((select public.is_catalog_admin()));
create policy admin_revisions on public.catalog_revisions to authenticated
using ((select public.is_catalog_admin())) with check ((select public.is_catalog_admin()));
create policy admin_media on public.catalog_media to authenticated
using ((select public.is_catalog_admin())) with check ((select public.is_catalog_admin()));
create policy admin_revision_media on public.catalog_revision_media to authenticated
using ((select public.is_catalog_admin())) with check ((select public.is_catalog_admin()));
create policy admin_history on public.catalog_history to authenticated
using ((select public.is_catalog_admin()))
with check ((select public.is_catalog_admin()) and actor_id = (select auth.uid()));
create policy admin_imports on public.catalog_imports to authenticated
using ((select public.is_catalog_admin()) and owner_id = (select auth.uid()))
with check ((select public.is_catalog_admin()) and owner_id = (select auth.uid()));

create policy published_entries on public.catalog_entries
for select to anon using (archived_at is null and published_id is not null);
create policy published_revisions on public.catalog_revisions
for select to anon using (exists (
  select 1 from public.catalog_entries entry
  where entry.id = entry_id and entry.published_id = catalog_revisions.id
));
create policy published_revision_media on public.catalog_revision_media
for select to anon using (exists (
  select 1 from public.catalog_revisions revision where revision.id = revision_id
));
create policy published_media on public.catalog_media
for select to anon using (exists (
  select 1 from public.catalog_revision_media link where link.media_id = catalog_media.id
));

create policy exhibition_admin_read on storage.objects
for select to authenticated using (bucket_id = 'exhibition' and (select public.is_catalog_admin()));
create policy exhibition_admin_upload on storage.objects
for insert to authenticated with check (
  bucket_id = 'exhibition' and (select public.is_catalog_admin()) and exists (
    select 1 from public.catalog_media media
    where media.owner_id = (select auth.uid()) and media.ready_at is null
      and split_part(name, '/', 1) = media.id::text
      and name in (media.id || '/thumb.webp', media.id || '/display.webp')
  )
);
create policy exhibition_public_read on storage.objects
for select to anon using (
  bucket_id = 'exhibition' and exists (
    select 1 from public.catalog_media media
    where split_part(name, '/', 1) = media.id::text
      and name in (media.id || '/thumb.webp', media.id || '/display.webp')
  )
);

-- A revision is added only when the draft and all of its media are ready.
-- Stable keys and expected revisions make bulk saves atomic and concurrency-safe.
create function public.catalog_save(p_drafts jsonb, p_import_id uuid default null) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  item jsonb;
  entry public.catalog_entries;
  asset public.catalog_media;
  new_revision uuid;
  media_ids uuid[];
  media_id uuid;
  actor uuid := auth.uid();
  saved integer := 0;
  previous_result integer;
begin
  if not public.is_catalog_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_drafts) is distinct from 'array'
      or jsonb_array_length(p_drafts) not between 1 and 500 then
    raise exception 'Invalid draft selection';
  end if;
  if p_import_id is not null then
    insert into public.catalog_imports(owner_id, id) values (actor, p_import_id) on conflict do nothing;
    select result into previous_result from public.catalog_imports
      where owner_id = actor and id = p_import_id for update;
    if previous_result is not null then return previous_result; end if;
  end if;

  for item in select value from jsonb_array_elements(p_drafts) order by value->>'kind', value->>'key' loop
    if item->>'kind' = 'artwork' then
      insert into public.catalog_entries(kind, key)
      values ('artwork', item->>'key') on conflict (kind, key) do nothing;
    end if;
    select * into entry from public.catalog_entries
      where kind = item->>'kind' and key = item->>'key' for update;
    if not found or entry.archived_at is not null then raise exception 'Restore or select an existing entry'; end if;
    if coalesce(entry.draft_id, entry.published_id) is distinct from (item->>'expected')::uuid then
      raise exception 'Revision conflict' using errcode = '40001';
    end if;
    if entry.kind = 'artwork' and coalesce(item->'data'->>'categoryCode', '') !~ '^0[1-7]$' then
      raise exception 'Select a valid category';
    end if;

    if entry.kind = 'home' then
      select coalesce(array_agg(distinct (slide->>'imageId')::uuid), '{}') into media_ids
      from jsonb_array_elements(item->'data'->'slides') slide where slide->>'imageId' is not null;
    elsif entry.kind = 'artwork' and item->'data'->>'imageId' is not null then
      media_ids := array[(item->'data'->>'imageId')::uuid];
    else
      media_ids := '{}';
    end if;
    foreach media_id in array media_ids loop
      select * into asset from public.catalog_media where id = media_id for update;
      if not found then raise exception 'Upload the image before saving'; end if;
      if asset.ready_at is null then
        if asset.owner_id <> actor or (select count(*) from storage.objects
            where bucket_id = 'exhibition'
              and name in (media_id || '/thumb.webp', media_id || '/display.webp')
              and (metadata->>'size')::numeric > 0) <> 2 then
          raise exception 'Upload both image sizes before saving';
        end if;
        update public.catalog_media set ready_at = now() where id = media_id;
      end if;
    end loop;

    insert into public.catalog_revisions(entry_id, content)
    values (entry.id, item->'data') returning id into new_revision;
    insert into public.catalog_revision_media(revision_id, media_id)
    select new_revision, requested_id from unnest(media_ids) requested_id;
    update public.catalog_entries set draft_id = new_revision where id = entry.id;
    insert into public.catalog_history(entry_id, revision_id, actor_id, action)
    values (entry.id, new_revision, actor, 'save');
    saved := saved + 1;
  end loop;

  if p_import_id is not null then
    update public.catalog_imports set result = saved where owner_id = actor and id = p_import_id;
  end if;
  return saved;
end;
$$;

create function public.catalog_change_state(p_action text, p_items jsonb) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  item jsonb;
  entry public.catalog_entries;
  draft jsonb;
  action_revision uuid;
  changed integer := 0;
begin
  if not public.is_catalog_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('publish', 'archive', 'restore')
    or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 500 then
    raise exception 'Invalid selection';
  end if;
  for item in select value from jsonb_array_elements(p_items) order by value->>'id' loop
    select * into entry from public.catalog_entries where id = (item->>'id')::uuid for update;
    if not found then raise exception 'Entry not found'; end if;
    action_revision := coalesce(entry.draft_id, entry.published_id);
    if action_revision is distinct from (item->>'expected')::uuid then
      raise exception 'Revision conflict' using errcode = '40001';
    end if;

    case p_action
      when 'publish' then
        if entry.archived_at is not null or entry.draft_id is null then raise exception 'Select a saved draft'; end if;
        select content into draft from public.catalog_revisions where id = entry.draft_id;
        if entry.kind = 'artwork' and (
          nullif(btrim(draft->>'title'), '') is null or nullif(btrim(draft->>'artist'), '') is null
          or draft->>'imageId' is null or not exists (
            select 1 from public.catalog_revision_media media
            where media.revision_id = entry.draft_id and media.media_id = (draft->>'imageId')::uuid
          )
        ) then raise exception 'Complete the title, creator and photo for %', entry.key;
        end if;
        if entry.kind = 'category' and (
          nullif(btrim(draft->>'enTitle'), '') is null or nullif(btrim(draft->>'thTitle'), '') is null
        ) then raise exception 'Both category titles are required';
        end if;
        if entry.kind = 'home' and exists (
          select 1 from jsonb_array_elements(draft->'slides') slide
          where nullif(btrim(slide->>'title'), '') is null or slide->>'imageId' is null
        ) then raise exception 'Each slide needs a title and image';
        end if;
        update public.catalog_entries set published_id = draft_id, draft_id = null where id = entry.id;
      when 'archive' then
        if entry.kind <> 'artwork' or entry.archived_at is not null then raise exception 'Select active artwork'; end if;
        update public.catalog_entries set archived_at = now(), draft_id = action_revision, published_id = null
        where id = entry.id;
      when 'restore' then
        if entry.kind <> 'artwork' or entry.archived_at is null then raise exception 'Select archived artwork'; end if;
        update public.catalog_entries set archived_at = null where id = entry.id;
    end case;

    insert into public.catalog_history(entry_id, revision_id, actor_id, action)
    values (entry.id, action_revision, auth.uid(), p_action);
    changed := changed + 1;
  end loop;
  return changed;
end;
$$;

revoke all on function public.catalog_save(jsonb, uuid), public.catalog_change_state(text, jsonb) from public, anon;
grant execute on function public.catalog_save(jsonb, uuid), public.catalog_change_state(text, jsonb) to authenticated;
