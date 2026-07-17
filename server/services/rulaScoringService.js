'use strict';

/**
 * RulaScoringService
 * -------------------
 * คำนวณคะแนน RULA (Rapid Upper Limb Assessment) แบบ config-driven
 * โดยอ้างอิงตาราง A/B/C จาก rulaTables.json (ปรับได้โดยไม่ต้องแก้โค้ด)
 *
 * อ้างอิง: McAtamney, L., & Corlett, N. (1993). RULA: a survey method
 * for the investigation of work-related upper limb disorders.
 * Applied Ergonomics, 24(2), 91-99.
 */

class RulaScoringService {
  /**
   * @param {object} tables - object รูปแบบเดียวกับ rulaTables.json
   *   { table_a: {matrix}, table_b: {matrix}, table_c: {matrix}, action_levels: [] }
   */
  constructor(tables) {
    if (!tables || !tables.table_a || !tables.table_b || !tables.table_c) {
      throw new Error('RulaScoringService: ต้องระบุ table_a, table_b, table_c');
    }
    this.tableA = tables.table_a.matrix;
    this.tableB = tables.table_b.matrix;
    this.tableC = tables.table_c.matrix;
    this.actionLevels = tables.action_levels || [];
  }

  /** จำกัดค่าไม่ให้หลุดขอบเขต [min, max] */
  static _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Table A: คะแนนท่าทางแขน/ข้อมือ (Posture Score A)
   * @param {number} upperArm  1-6
   * @param {number} lowerArm  1-3
   * @param {number} wrist     1-4
   * @param {number} wristTwist 1-2
   */
  getTableAScore(upperArm, lowerArm, wrist, wristTwist) {
    const ua = RulaScoringService._clamp(upperArm, 1, 6);
    const la = RulaScoringService._clamp(lowerArm, 1, 3);
    const w = RulaScoringService._clamp(wrist, 1, 4);
    const wt = RulaScoringService._clamp(wristTwist, 1, 2);

    const row = (ua - 1) * 3 + (la - 1);
    const col = (w - 1) * 2 + (wt - 1);
    return this.tableA[row][col];
  }

  /**
   * Table B: คะแนนท่าทางคอ/ลำตัว/ขา (Posture Score B)
   * @param {number} neck  1-6
   * @param {number} trunk 1-6
   * @param {number} legs  1-2
   */
  getTableBScore(neck, trunk, legs) {
    const n = RulaScoringService._clamp(neck, 1, 6);
    const t = RulaScoringService._clamp(trunk, 1, 6);
    const l = RulaScoringService._clamp(legs, 1, 2);

    const row = n - 1;
    const col = (t - 1) * 2 + (l - 1);
    return this.tableB[row][col];
  }

  /**
   * Table C: คะแนนสรุป (Grand Score) จาก Score C (wrist/arm) และ Score D (neck/trunk/legs)
   * @param {number} scoreC 1-7 (8+ จะถูก clamp เป็นแถวสุดท้าย)
   * @param {number} scoreD 1-7+ (จะถูก clamp เป็นคอลัมน์สุดท้าย)
   */
  getTableCScore(scoreC, scoreD) {
    const maxRow = this.tableC.length;       // 8 แถว (1..7, 8+)
    const maxCol = this.tableC[0].length;    // 7 คอลัมน์ (1..7+)
    const row = RulaScoringService._clamp(scoreC, 1, maxRow) - 1;
    const col = RulaScoringService._clamp(scoreD, 1, maxCol) - 1;
    return this.tableC[row][col];
  }

  /** แปลงคะแนนสรุปเป็น Action Level พร้อมคำอธิบายภาษาไทย */
  getActionLevel(finalScore) {
    const found = this.actionLevels.find(
      (lvl) => finalScore >= lvl.min && finalScore <= lvl.max
    );
    if (found) return found;
    // fallback กรณีไม่มี config action_levels
    if (finalScore <= 2) return { level: 1, label_th: 'ยอมรับได้' };
    if (finalScore <= 4) return { level: 2, label_th: 'ควรตรวจสอบเพิ่มเติม' };
    if (finalScore <= 6) return { level: 3, label_th: 'ควรตรวจสอบและเปลี่ยนแปลงเร็ว ๆ นี้' };
    return { level: 4, label_th: 'ต้องเปลี่ยนแปลงทันที' };
  }

  /**
   * คำนวณคะแนนเต็มรูปแบบของฝั่งใดฝั่งหนึ่ง (ซ้ายหรือขวา)
   *
   * @param {object} input
   * @param {number} input.upperArm      1-6  (รวม adjustment แล้ว เช่น +1 ไหล่ยก, +1 กางออก, -1 พยุง)
   * @param {number} input.lowerArm      1-3  (รวม adjustment แล้ว เช่น +1 ทำงานข้ามแนวกลาง)
   * @param {number} input.wrist         1-4  (รวม adjustment แล้ว เช่น +1 ข้อมืองอออกจากแนวกลาง)
   * @param {number} input.wristTwist    1-2
   * @param {number} input.neck          1-6  (รวม adjustment แล้ว เช่น +1 คอบิด, +1 คอเอียง)
   * @param {number} input.trunk         1-6  (รวม adjustment แล้ว เช่น +1 ลำตัวบิด, +1 ลำตัวเอียง)
   * @param {number} input.legs          1-2
   * @param {number} input.muscleUse     0-1  (0 = ปกติ, 1 = ท่าคงที่ >1 นาที หรือทำซ้ำ >4 ครั้ง/นาที)
   * @param {number} input.forceLoad     0-3  (ตาม Force Scores Table)
   *
   * @returns {object} รายละเอียดคะแนนครบทุกขั้น
   */
  calculateSide(input) {
    const {
      upperArm, lowerArm, wrist, wristTwist,
      neck, trunk, legs,
      muscleUse = 0, forceLoad = 0,
    } = input;

    const tableAScore = this.getTableAScore(upperArm, lowerArm, wrist, wristTwist);
    const tableBScore = this.getTableBScore(neck, trunk, legs);

    // Score C = Table A + กล้ามเนื้อ + แรง/น้ำหนัก (ฝั่งแขน/ข้อมือ)
    const wristArmScore = tableAScore + muscleUse + forceLoad;
    // Score D = Table B + กล้ามเนื้อ + แรง/น้ำหนัก (ฝั่งคอ/ลำตัว/ขา)
    const neckTrunkLegScore = tableBScore + muscleUse + forceLoad;

    const finalScore = this.getTableCScore(wristArmScore, neckTrunkLegScore);
    const actionLevel = this.getActionLevel(finalScore);

    return {
      tableAScore,
      tableBScore,
      wristArmScore,
      neckTrunkLegScore,
      finalScore,
      actionLevel: actionLevel.level,
      actionLevelLabel: actionLevel.label_th,
    };
  }
}

module.exports = { RulaScoringService };
