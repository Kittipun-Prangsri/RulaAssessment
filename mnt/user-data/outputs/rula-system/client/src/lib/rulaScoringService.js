/**
 * RulaScoringService (ESM, client-side)
 * --------------------------------------
 * ตรรกะเดียวกันทุกประการกับ server/services/rulaScoringService.js (CommonJS)
 * แยกไว้เป็น ESM สำหรับใช้คำนวณ preview ทันทีในฟอร์ม โดยไม่ต้องรอ round-trip ไป API
 * — สำคัญสำหรับการใช้งานหน้างานที่สัญญาณอินเทอร์เน็ตไม่เสถียร (offline-first)
 *
 * หมายเหตุ: คะแนนสุดท้ายที่ "บันทึกจริง" ควรให้ backend คำนวณซ้ำอีกครั้งก่อน insert
 * ลง Supabase เสมอ เพื่อป้องกันการปลอมแปลงคะแนนจากฝั่ง client
 */

export class RulaScoringService {
  constructor(tables) {
    if (!tables?.table_a || !tables?.table_b || !tables?.table_c) {
      throw new Error('RulaScoringService: ต้องระบุ table_a, table_b, table_c');
    }
    this.tableA = tables.table_a.matrix;
    this.tableB = tables.table_b.matrix;
    this.tableC = tables.table_c.matrix;
    this.actionLevels = tables.action_levels || [];
  }

  static _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  getTableAScore(upperArm, lowerArm, wrist, wristTwist) {
    const ua = RulaScoringService._clamp(upperArm, 1, 6);
    const la = RulaScoringService._clamp(lowerArm, 1, 3);
    const w = RulaScoringService._clamp(wrist, 1, 4);
    const wt = RulaScoringService._clamp(wristTwist, 1, 2);
    const row = (ua - 1) * 3 + (la - 1);
    const col = (w - 1) * 2 + (wt - 1);
    return this.tableA[row][col];
  }

  getTableBScore(neck, trunk, legs) {
    const n = RulaScoringService._clamp(neck, 1, 6);
    const t = RulaScoringService._clamp(trunk, 1, 6);
    const l = RulaScoringService._clamp(legs, 1, 2);
    const row = n - 1;
    const col = (t - 1) * 2 + (l - 1);
    return this.tableB[row][col];
  }

  getTableCScore(scoreC, scoreD) {
    const maxRow = this.tableC.length;
    const maxCol = this.tableC[0].length;
    const row = RulaScoringService._clamp(scoreC, 1, maxRow) - 1;
    const col = RulaScoringService._clamp(scoreD, 1, maxCol) - 1;
    return this.tableC[row][col];
  }

  getActionLevel(finalScore) {
    const found = this.actionLevels.find((lvl) => finalScore >= lvl.min && finalScore <= lvl.max);
    if (found) return found;
    if (finalScore <= 2) return { level: 1, label_th: 'ยอมรับได้' };
    if (finalScore <= 4) return { level: 2, label_th: 'ควรตรวจสอบเพิ่มเติม' };
    if (finalScore <= 6) return { level: 3, label_th: 'ควรตรวจสอบและเปลี่ยนแปลงเร็ว ๆ นี้' };
    return { level: 4, label_th: 'ต้องเปลี่ยนแปลงทันที' };
  }

  calculateSide(input) {
    const {
      upperArm, lowerArm, wrist, wristTwist,
      neck, trunk, legs,
      muscleUse = 0, forceLoad = 0,
    } = input;

    const tableAScore = this.getTableAScore(upperArm, lowerArm, wrist, wristTwist);
    const tableBScore = this.getTableBScore(neck, trunk, legs);
    const wristArmScore = tableAScore + muscleUse + forceLoad;
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
