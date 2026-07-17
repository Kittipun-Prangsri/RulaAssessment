'use strict';

/**
 * POST /api/assessments
 * - รับ input ดิบจาก client (ไม่ใช่คะแนน)
 * - คำนวณคะแนนซ้ำด้วย RulaScoringService ฝั่ง server (แหล่งความจริงเดียว)
 * - โหลดตาราง RULA จาก in-memory cache (ดึงมาจาก Supabase ตอน startup)
 * - บันทึกลง Supabase ด้วย service_role key
 */

const express = require('express');
const { RulaScoringService } = require('../services/rulaScoringService');
const { supabaseAdmin, getRulaTables } = require('../rulaCache');

const router = express.Router();

// ตรวจสอบ JWT จาก header แล้วคืน user + profile
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'unauthorized' });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  req.user = user;
  req.profile = profile;
  next();
}

router.post('/', requireAuth, async (req, res) => {
  const { assesseeId, taskDescription, sides } = req.body;

  if (!assesseeId || !sides?.right || !sides?.left) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }

  // ดึง RULA tables จาก cache (โหลดจาก Supabase ตอน startup)
  const tables = getRulaTables();
  if (!tables) {
    return res.status(503).json({ error: 'RULA lookup tables not available. Please try again shortly.' });
  }

  const fullTables = tables.action_levels
    ? tables
    : { ...tables, action_levels: require('../data/rulaTables.json').action_levels };

  const scoreCalculator = new RulaScoringService(fullTables);

  try {
    // 1) คำนวณคะแนนจริงฝั่ง server (ไม่เชื่อคะแนนที่ client ส่งมา)
    const rightResult = scoreCalculator.calculateSide(sides.right);
    const leftResult = scoreCalculator.calculateSide(sides.left);

    // 2) สร้าง assessment header
    const { data: assessment, error: assessmentErr } = await supabaseAdmin
      .from('assessments')
      .insert({
        assessee_id: assesseeId,
        evaluator_id: req.user.id,
        department_id: req.profile.department_id,
        task_description: taskDescription,
        status: 'completed',
      })
      .select()
      .single();

    if (assessmentErr) throw assessmentErr;

    // 3) บันทึกคะแนนแต่ละฝั่ง
    const sideRows = [
      { side: 'right', input: sides.right, result: rightResult },
      { side: 'left', input: sides.left, result: leftResult },
    ].map(({ side, input, result }) => ({
      assessment_id: assessment.id,
      side,
      upper_arm_score: input.upperArm,
      lower_arm_score: input.lowerArm,
      wrist_score: input.wrist,
      wrist_twist_score: input.wristTwist,
      neck_score: input.neck,
      trunk_score: input.trunk,
      legs_score: input.legs,
      muscle_use_score: input.muscleUse ?? 0,
      force_load_score: input.forceLoad ?? 0,
      table_a_score: result.tableAScore,
      wrist_arm_score: result.wristArmScore,
      table_b_score: result.tableBScore,
      neck_trunk_leg_score: result.neckTrunkLegScore,
      final_score: result.finalScore,
      action_level: result.actionLevel,
    }));

    const { error: sidesErr } = await supabaseAdmin
      .from('assessment_sides')
      .insert(sideRows);

    if (sidesErr) throw sidesErr;

    // 4) แจ้งเตือนถ้า action level สูง
    const highestLevel = Math.max(rightResult.actionLevel, leftResult.actionLevel);
    if (highestLevel >= 3) {
      // TODO: ส่ง LINE Notify / email ไปหา จป. หรือหัวหน้าแผนก
      console.warn(`⚠️  High action level (${highestLevel}) for assessment ${assessment.id}`);
    }

    res.status(201).json({
      assessmentId: assessment.id,
      right: rightResult,
      left: leftResult,
    });
  } catch (err) {
    console.error('Assessment error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
