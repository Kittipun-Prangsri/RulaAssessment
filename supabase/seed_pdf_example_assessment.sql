-- ============================================================
-- RULA example assessment from “RULA assessment — both sides” PDF
-- Expected result: right = 5, left = 6 (Action Level 3)
-- ============================================================
--
-- 1. เปลี่ยนชื่อผู้ถูกประเมินและ email ผู้ประเมินด้านล่างให้ตรงกับข้อมูลจริง
-- 2. รันไฟล์นี้ใน Supabase SQL Editor
-- 3. หากหาไม่พบ ระบบจะหยุดพร้อมแจ้งสาเหตุ และจะไม่สร้างข้อมูลบางส่วน

do $$
declare
  target_assessee_name constant text := 'เปลี่ยนเป็นชื่อผู้ถูกประเมิน';
  target_evaluator_email constant text := 'เปลี่ยนเป็นอีเมลผู้ประเมิน';
  target_task_description constant text := 'ตัวอย่างการประเมินตามเอกสาร RULA assessment — both sides';

  v_assessee_id uuid;
  v_evaluator_id uuid;
  v_department_id uuid;
  v_assessment_id uuid;
begin
  select id, department_id
    into v_assessee_id, v_department_id
  from public.assessees
  where full_name = target_assessee_name;

  if v_assessee_id is null then
    raise exception 'ไม่พบผู้ถูกประเมินชื่อ "%" — กรุณาตรวจชื่อในตาราง assessees', target_assessee_name;
  end if;

  select p.id, coalesce(p.department_id, v_department_id)
    into v_evaluator_id, v_department_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(target_evaluator_email);

  if v_evaluator_id is null then
    raise exception 'ไม่พบผู้ประเมิน email "%" — กรุณาตรวจ Auth > Users และ profiles', target_evaluator_email;
  end if;

  insert into public.assessments (
    assessee_id,
    evaluator_id,
    department_id,
    task_description,
    status
  )
  values (
    v_assessee_id,
    v_evaluator_id,
    v_department_id,
    target_task_description,
    'completed'
  )
  returning id into v_assessment_id;

  insert into public.assessment_sides (
    assessment_id, side,
    upper_arm_score, lower_arm_score, wrist_score, wrist_twist_score,
    neck_score, trunk_score, legs_score, muscle_use_score, force_load_score,
    table_a_score, wrist_arm_score, table_b_score, neck_trunk_leg_score,
    final_score, action_level
  )
  values
    -- Right: Table A 3 + muscle 1 = C4, Table B 4 + muscle 1 = D5, RULA = 5
    (v_assessment_id, 'right', 2, 2, 3, 1, 3, 2, 2, 1, 0, 3, 4, 4, 5, 5, 3),
    -- Left: Table A 4 + muscle 1 = C5, Table B 4 + muscle 1 = D5, RULA = 6
    (v_assessment_id, 'left', 2, 1, 4, 1, 3, 2, 2, 1, 0, 4, 5, 4, 5, 6, 3);

  raise notice 'สร้างผลประเมินสำเร็จ: assessment_id=% | ขวา=5 | ซ้าย=6', v_assessment_id;
end $$;
