'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RulaScoringService } = require('../services/rulaScoringService');
const tables = require('../data/rulaTables.json');

const service = new RulaScoringService(tables);

test('Table A: กรณีตัวอย่างมาตรฐานจากคู่มือ RULA (ergo-plus step-by-step guide)', () => {
  // upper arm +3 (45-90°), lower arm +2 (<60°),
  // wrist +3 flexion +1 ulnar deviation = 4, wrist twist +2 (end range)
  // -> คาดว่า Table A score = 5
  const score = service.getTableAScore(3, 2, 4, 2);
  assert.equal(score, 5);
});

test('Table A/B/C: reproduce คะแนนจริงจากไฟล์ rula.co.uk PDF (ฝั่งขวา)', () => {
  const result = service.calculateSide({
    upperArm: 2,      // งอ 20-45°
    lowerArm: 2,      // งอน้อยกว่า 60°
    wrist: 3,         // 15° ลง-ขึ้น (2) + ข้อมืองอออกจากแนวกลาง (+1)
    wristTwist: 1,    // บิดหลักช่วงกลาง
    neck: 3,          // งอ 10-20° (2) + คอบิด (+1)
    trunk: 2,         // งอ 0-20°
    legs: 2,          // ขาไม่สมดุล/ไม่ได้รับการรองรับ
    muscleUse: 1,     // ท่าคงที่ >1 นาที หรือทำซ้ำ >4 ครั้ง/นาที
    forceLoad: 0,
  });

  assert.equal(result.tableAScore, 3, 'ตาราง ก (ขวา) ควรได้ 3');
  assert.equal(result.wristArmScore, 4, 'คะแนนแขนและข้อมือ (ขวา) ควรได้ 4');
  assert.equal(result.tableBScore, 4, 'ตาราง B (ขวา) ควรได้ 4');
  assert.equal(result.neckTrunkLegScore, 5, 'คะแนนคอ/ลำตัว/ขา (ขวา) ควรได้ 5');
  assert.equal(result.finalScore, 5, 'คะแนน RULA รวม (ขวา) ควรได้ 5');
  assert.equal(result.actionLevel, 3);
});

test('Table A/B/C: reproduce คะแนนจริงจากไฟล์ rula.co.uk PDF (ฝั่งซ้าย)', () => {
  const result = service.calculateSide({
    upperArm: 2,      // งอ 20-45°
    lowerArm: 1,      // งอ 60-100°
    wrist: 4,         // ลดลงมากกว่า 15° (3) + ข้อมืองอออกจากแนวกลาง (+1)
    wristTwist: 1,    // บิดหลักช่วงกลาง
    neck: 3,          // งอ 10-20° (2) + คอบิด (+1)
    trunk: 2,         // งอ 0-20°
    legs: 2,          // ขาไม่สมดุล/ไม่ได้รับการรองรับ
    muscleUse: 1,
    forceLoad: 0,
  });

  assert.equal(result.tableAScore, 4, 'ตาราง ก (ซ้าย) ควรได้ 4');
  assert.equal(result.wristArmScore, 5, 'คะแนนแขนและข้อมือ (ซ้าย) ควรได้ 5');
  assert.equal(result.tableBScore, 4, 'ตาราง B (ซ้าย) ควรได้ 4');
  assert.equal(result.neckTrunkLegScore, 5, 'คะแนนคอ/ลำตัว/ขา (ซ้าย) ควรได้ 5');
  assert.equal(result.finalScore, 6, 'คะแนน RULA รวม (ซ้าย) ควรได้ 6');
  assert.equal(result.actionLevel, 3);
});

test('Action level: คะแนน 1-2 => ระดับ 1', () => {
  const lvl = service.getActionLevel(2);
  assert.equal(lvl.level, 1);
});

test('Action level: คะแนน 7 => ระดับ 4 (ต้องเปลี่ยนแปลงทันที)', () => {
  const lvl = service.getActionLevel(7);
  assert.equal(lvl.level, 4);
});

test('Boundary: ค่าที่เกินขอบเขต ควรถูก clamp ไม่ throw error', () => {
  assert.doesNotThrow(() => service.getTableAScore(10, 10, 10, 10));
  assert.doesNotThrow(() => service.getTableBScore(0, -1, 5));
  assert.doesNotThrow(() => service.getTableCScore(99, 0));
});

test('Table C: แถว/คอลัมน์สุดขอบ (8+, 7+) ให้ค่าตามตารางจริง', () => {
  assert.equal(service.getTableCScore(8, 7), 7);
  assert.equal(service.getTableCScore(1, 1), 1);
});
