-- ============================================================
-- RULA Assessment System — Supabase Schema
-- ============================================================
-- รันไฟล์นี้ผ่าน Supabase SQL Editor หรือ `supabase db push`
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. หน่วยงาน / แผนก
-- ------------------------------------------------------------
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hospital_name text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. โปรไฟล์ผู้ใช้งาน (ผูกกับ Supabase Auth)
-- ------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'evaluator'
    check (role in ('super_admin', 'admin', 'evaluator', 'assessee')),
  department_id uuid references departments(id),
  created_at timestamptz default now()
);

-- สร้าง profile อัตโนมัติเมื่อมี user ใหม่สมัคร
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'evaluator');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 3. ผู้ถูกประเมิน (ไม่จำเป็นต้องเป็น user ในระบบ)
-- ------------------------------------------------------------
create table if not exists assessees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  employee_code text,
  position text,
  department_id uuid references departments(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 4. แบบประเมิน (header)
-- ------------------------------------------------------------
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  assessee_id uuid references assessees(id) not null,
  evaluator_id uuid references profiles(id) not null,
  department_id uuid references departments(id),
  task_description text,
  photo_url text,
  assessed_at timestamptz default now(),
  status text not null default 'draft' check (status in ('draft', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 5. คะแนนแยกตามฝั่ง (ซ้าย / ขวา)
-- ------------------------------------------------------------
create table if not exists assessment_sides (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade not null,
  side text not null check (side in ('left', 'right')),

  -- inputs ดิบ (เก็บซ้ำไว้เพื่อ query ง่าย นอกจาก assessment_steps)
  upper_arm_score int,
  lower_arm_score int,
  wrist_score int,
  wrist_twist_score int,
  neck_score int,
  trunk_score int,
  legs_score int,
  muscle_use_score int default 0,
  force_load_score int default 0,

  -- outputs ที่คำนวณได้
  table_a_score int,
  wrist_arm_score int,       -- Score C = table_a + muscle + force
  table_b_score int,
  neck_trunk_leg_score int,  -- Score D = table_b + muscle + force
  final_score int,           -- Table C lookup
  action_level int,          -- 1-4

  created_at timestamptz default now(),
  unique (assessment_id, side)
);

-- ------------------------------------------------------------
-- 6. คำตอบรายขั้นตอน (audit trail แบบละเอียด)
-- ------------------------------------------------------------
create table if not exists assessment_steps (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade not null,
  side text check (side in ('left', 'right', 'n/a')),
  step_key text not null,        -- 'upper_arm' | 'lower_arm' | 'wrist' | 'wrist_twist' | 'neck' | 'trunk' | 'legs' | 'muscle_use' | 'force_load'
  base_score int not null,
  adjustments jsonb not null default '[]', -- [{"code":"wrist_deviate","label":"ข้อมืองอออกจากแนวกลาง","point":1}]
  final_score int not null,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 7. ตาราง lookup ของ RULA (config-driven rules engine)
-- ------------------------------------------------------------
create table if not exists rula_lookup_tables (
  id uuid primary key default gen_random_uuid(),
  table_name text not null check (table_name in ('table_a', 'table_b', 'table_c')),
  version text not null default 'v1',
  data jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 8. Indexes
-- ------------------------------------------------------------
create index if not exists idx_assessments_assessee on assessments(assessee_id);
create index if not exists idx_assessments_evaluator on assessments(evaluator_id);
create index if not exists idx_assessments_department on assessments(department_id);
create index if not exists idx_assessment_sides_assessment on assessment_sides(assessment_id);
create index if not exists idx_assessment_steps_assessment on assessment_steps(assessment_id);
create index if not exists idx_assessees_department on assessees(department_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table departments enable row level security;
alter table profiles enable row level security;
alter table assessees enable row level security;
alter table assessments enable row level security;
alter table assessment_sides enable row level security;
alter table assessment_steps enable row level security;
alter table rula_lookup_tables enable row level security;

-- helper: department ของ user ปัจจุบัน
create or replace function my_department_id()
returns uuid as $$
  select department_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- departments: ทุกคน login แล้วอ่านได้ (ใช้ dropdown เลือกแผนก)
drop policy if exists "authenticated users can read departments" on departments;
create policy "authenticated users can read departments"
  on departments for select using (auth.role() = 'authenticated');

drop policy if exists "super_admin manages departments" on departments;
create policy "super_admin manages departments"
  on departments for all using (my_role() = 'super_admin');

-- profiles
drop policy if exists "users read own profile" on profiles;
create policy "users read own profile" on profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "admin reads department profiles" on profiles;
create policy "admin reads department profiles" on profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "super_admin reads all profiles" on profiles;
create policy "super_admin reads all profiles" on profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "users update own profile" on profiles;
create policy "users update own profile" on profiles
  for update using (id = auth.uid());

-- assessees: จำกัดการอ่านให้ทุกคนที่ login อ่านได้ ป้องกันเรื่องแผนกเป็น NULL
drop policy if exists "read assessees in my department" on assessees;
create policy "read assessees in my department" on assessees
  for select using (auth.role() = 'authenticated');

drop policy if exists "evaluator creates assessees in my department" on assessees;
create policy "evaluator creates assessees in my department" on assessees
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "evaluator updates assessees in my department" on assessees;
create policy "evaluator updates assessees in my department" on assessees
  for update using (auth.role() = 'authenticated');

-- assessments: ให้ทุกคนที่ล็อกอินสามารถอ่านประวัติการประเมินได้
drop policy if exists "read assessments in my department" on assessments;
create policy "read assessments in my department" on assessments
  for select using (auth.role() = 'authenticated');

drop policy if exists "evaluator creates own assessments" on assessments;
create policy "evaluator creates own assessments" on assessments
  for insert with check (evaluator_id = auth.uid());

drop policy if exists "evaluator updates own assessments" on assessments;
create policy "evaluator updates own assessments" on assessments
  for update using (auth.role() = 'authenticated');

drop policy if exists "evaluator deletes own draft assessments" on assessments;
create policy "evaluator deletes own draft assessments" on assessments
  for delete using (evaluator_id = auth.uid() and status = 'draft');

-- assessment_sides / assessment_steps: สืบสิทธิ์จาก assessments
drop policy if exists "read sides via assessment access" on assessment_sides;
create policy "read sides via assessment access" on assessment_sides
  for select using (auth.role() = 'authenticated');

drop policy if exists "write sides via own assessment" on assessment_sides;
create policy "write sides via own assessment" on assessment_sides
  for all using (auth.role() = 'authenticated');

drop policy if exists "read steps via assessment access" on assessment_steps;
create policy "read steps via assessment access" on assessment_steps
  for select using (auth.role() = 'authenticated');

drop policy if exists "write steps via own assessment" on assessment_steps;
create policy "write steps via own assessment" on assessment_steps
  for all using (auth.role() = 'authenticated');

-- rula_lookup_tables: อ่านได้ทุกคน, แก้ไขได้เฉพาะ super_admin
drop policy if exists "everyone reads active lookup tables" on rula_lookup_tables;
create policy "everyone reads active lookup tables" on rula_lookup_tables
  for select using (is_active = true);

drop policy if exists "super_admin manages lookup tables" on rula_lookup_tables;
create policy "super_admin manages lookup tables" on rula_lookup_tables
  for all using (my_role() = 'super_admin');

-- ============================================================
-- Seed: ตาราง RULA มาตรฐาน (McAtamney & Corlett 1993 /
-- NC State Ergonomics Center Quick Reference 2020)
-- ============================================================
insert into rula_lookup_tables (table_name, version, data, is_active) values
('table_a', 'v1', '{
  "description": "แถว = [upper_arm(1-6)][lower_arm(1-3)] / คอลัมน์ = [wrist(1-4)][wrist_twist(1-2)]",
  "matrix": [
    [1,2,2,2,2,3,3,3],
    [2,2,2,2,3,3,3,3],
    [2,3,3,3,3,3,4,4],
    [2,3,3,3,3,4,4,4],
    [3,3,3,3,3,4,4,4],
    [3,4,4,4,4,4,5,5],
    [3,3,4,4,4,4,5,5],
    [3,4,4,4,4,4,5,5],
    [4,4,4,4,4,5,5,5],
    [4,4,4,4,4,5,5,5],
    [4,4,4,4,4,5,5,5],
    [4,4,4,5,5,5,6,6],
    [5,5,5,5,5,6,6,7],
    [5,6,6,6,6,7,7,7],
    [6,6,6,7,7,7,7,8],
    [7,7,7,7,7,8,8,9],
    [8,8,8,8,8,9,9,9],
    [9,9,9,9,9,9,9,9]
  ]
}'::jsonb, true),

('table_b', 'v1', '{
  "description": "แถว = neck(1-6) / คอลัมน์ = [trunk(1-6)][legs(1-2)]",
  "matrix": [
    [1,3,2,3,3,4,5,5,6,6,7,7],
    [2,3,2,3,4,5,5,5,6,7,7,7],
    [3,3,3,4,4,5,5,6,6,7,7,7],
    [5,5,5,6,6,7,7,7,7,7,8,8],
    [7,7,7,7,7,8,8,8,8,8,8,8],
    [8,8,8,8,8,8,8,9,9,9,9,9]
  ]
}'::jsonb, true),

('table_c', 'v1', '{
  "description": "แถว = score_c (wrist/arm, 1-7 และ 8+) / คอลัมน์ = score_d (neck/trunk/legs, 1-7+)",
  "matrix": [
    [1,2,3,3,4,5,5],
    [2,2,3,4,4,5,5],
    [3,3,3,4,4,5,6],
    [3,3,3,4,5,6,6],
    [4,4,4,5,6,7,7],
    [4,4,5,6,6,7,7],
    [5,5,6,6,7,7,7],
    [5,5,6,7,7,7,7]
  ]
}'::jsonb, true)
on conflict do nothing;
