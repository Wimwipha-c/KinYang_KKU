-- กินหยัง KKU: ตารางรีวิว
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run (รันครั้งเดียว)

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  menu        text not null check (char_length(menu) between 1 and 60),
  shop        text not null check (char_length(shop) between 1 and 60),
  loc         text not null check (loc in ('in', 'out')),
  area        text not null check (char_length(area) between 1 and 80),
  price       integer check (price is null or price between 0 and 9999),
  rating      smallint not null check (rating between 1 and 5),
  text        text not null check (char_length(text) between 5 and 500),
  name        text not null default 'เพื่อน มข.' check (char_length(name) between 1 and 30),
  cat         text not null default 'other'
              check (cat in ('noodle', 'rice', 'isan', 'grill', 'sweet', 'fusion', 'other')),
  created_at  timestamptz not null default now()
);

create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

-- สิทธิ์: ทุกคนอ่านและโพสต์ได้ แต่แก้ไขหรือลบไม่ได้ (ไม่มี policy สำหรับ update/delete)
-- ผู้ดูแลลบรีวิวได้ที่ Table Editor ในหน้า Supabase
alter table public.reviews enable row level security;

drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews"
  on public.reviews for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can post reviews" on public.reviews;
create policy "Anyone can post reviews"
  on public.reviews for insert
  to anon, authenticated
  with check (true);

-- เปิด real-time ให้รีวิวใหม่เด้งขึ้นในเครื่องคนอื่นทันที
do $$
begin
  alter publication supabase_realtime add table public.reviews;
exception when duplicate_object then null;
end $$;


-- ===================================================================
-- เมนูยอดฮิตประจำสัปดาห์
-- ถ้าเคยรันส่วนบนไปแล้ว รันเฉพาะส่วนนี้เพิ่มได้เลย (รันซ้ำได้ ไม่ทำให้ข้อมูลเดิมหาย)
-- ===================================================================

-- ผลเซียมซี: บันทึกเฉพาะชื่อเมนูกับเวลา ไม่มีข้อมูลระบุตัวผู้ใช้
-- หน้าเว็บนับให้เครื่องละครั้งต่อวัน (ครั้งแรกของวัน)
create table if not exists public.fortune_draws (
  id          bigint generated always as identity primary key,
  menu        text not null check (char_length(menu) between 1 and 60),
  created_at  timestamptz not null default now()
);

create index if not exists fortune_draws_created_at_idx on public.fortune_draws (created_at desc);

-- สิทธิ์: ทุกคนบันทึกได้ แต่อ่านทีละแถวไม่ได้ ต้องดูผ่าน weekly_trending() เท่านั้น
alter table public.fortune_draws enable row level security;

drop policy if exists "Anyone can record draws" on public.fortune_draws;
create policy "Anyone can record draws"
  on public.fortune_draws for insert
  to anon, authenticated
  with check (true);

-- คะแนน = รีวิว × 3 + ครั้งที่ออกเซียมซี × 1 นับเฉพาะ 7 วันล่าสุด
-- (ถ้าแก้น้ำหนัก ให้แก้ REVIEW_WEIGHT ใน js/trending.js ให้ตรงกันด้วย)
create or replace function public.weekly_trending(max_rows integer default 5)
returns table (menu text, reviews bigint, draws bigint, score bigint)
language sql
stable
security definer
set search_path = public
as $$
  with r as (
    select btrim(rv.menu) as m, count(*) as n
    from public.reviews rv
    where rv.created_at > now() - interval '7 days'
    group by 1
  ),
  d as (
    select btrim(fd.menu) as m, count(*) as n
    from public.fortune_draws fd
    where fd.created_at > now() - interval '7 days'
    group by 1
  )
  select coalesce(r.m, d.m),
         coalesce(r.n, 0),
         coalesce(d.n, 0),
         coalesce(r.n, 0) * 3 + coalesce(d.n, 0)
  from r full join d on r.m = d.m
  order by 4 desc, 2 desc, 1
  limit least(greatest(coalesce(max_rows, 5), 1), 20);
$$;

revoke all on function public.weekly_trending(integer) from public;
grant execute on function public.weekly_trending(integer) to anon, authenticated;
