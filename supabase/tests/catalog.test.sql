begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-000000000401', 'catalog-admin-test@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000402', 'catalog-viewer-test@example.com', 'authenticated', 'authenticated');
insert into catalog_admins values ('00000000-0000-4000-8000-000000000401');
insert into catalog_media (id, owner_id, ready_at) values
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000401', now()),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000401', now());
insert into storage.objects (bucket_id, name, metadata) values
  ('exhibition', '00000000-0000-4000-8000-000000000403/thumb.webp', '{"size":100}'),
  ('exhibition', '00000000-0000-4000-8000-000000000404/thumb.webp', '{"size":100}');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000402';
select is(is_catalog_admin(), false, 'ordinary user has no admin membership');
select throws_ok($$select catalog_save('[]')$$, '42501', 'Admin access required', 'ordinary user cannot call save');
select is((select count(id) from catalog_revisions), 0::bigint, 'ordinary user cannot select revisions');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000401';
select is(is_catalog_admin(), true, 'admin membership is verified');
select is(catalog_save('[
  {"kind":"artwork","key":"TEST-SQL-A","expected":null,"data":{"categoryCode":"01","title":"Published snapshot","artist":"Test creator","imageId":"00000000-0000-4000-8000-000000000403"}},
  {"kind":"artwork","key":"TEST-SQL-Z","expected":null,"data":{"categoryCode":"02","title":"","artist":"","imageId":null}}
]'), 2, 'save complete and incomplete drafts together');

select throws_ok($$
  select catalog_change_state('publish', (select jsonb_agg(jsonb_build_object('id', id, 'expected', draft_id))
    from catalog_entries where key in ('TEST-SQL-A', 'TEST-SQL-Z')))
$$, 'P0001', 'Complete the title, creator and photo for TEST-SQL-Z', 'incomplete sibling prevents publication');
select is((select count(id) from catalog_entries where key like 'TEST-SQL-%' and published_id is not null),
  0::bigint, 'batch failure leaves all public pointers unchanged');

select is(catalog_change_state('publish', (select jsonb_agg(jsonb_build_object('id', id, 'expected', draft_id))
  from catalog_entries where key = 'TEST-SQL-A')), 1, 'complete draft publishes');
select is(catalog_save((select jsonb_build_array(jsonb_build_object(
  'kind', 'artwork', 'key', key, 'expected', published_id,
  'data', '{"categoryCode":"02","title":"Private draft","artist":"Test creator","imageId":"00000000-0000-4000-8000-000000000404"}'::jsonb))
  from catalog_entries where key = 'TEST-SQL-A')), 1, 'live entry accepts a new draft');

set local role anon;
set local request.jwt.claim.sub = '';
select results_eq(
  $$select content->>'title' from catalog_revisions where content->>'title' in ('Published snapshot', 'Private draft')$$,
  array['Published snapshot'], 'only live revision is public');
select results_eq(
  $$select name from storage.objects where name in ('00000000-0000-4000-8000-000000000403/thumb.webp', '00000000-0000-4000-8000-000000000404/thumb.webp')$$,
  array['00000000-0000-4000-8000-000000000403/thumb.webp'], 'only published media is readable');
select throws_ok($$select draft_id from catalog_entries limit 1$$, '42501', null, 'public grants omit draft pointers');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000401';
select is(catalog_change_state('archive', (select jsonb_agg(jsonb_build_object('id', id, 'expected', draft_id))
  from catalog_entries where key = 'TEST-SQL-A')), 1, 'archive removes the live pointer and retains a draft');

select * from finish();
rollback;
