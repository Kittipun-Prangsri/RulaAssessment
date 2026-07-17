import { useMemo, useState } from 'react';
import RulaPostureVisualizer from './RulaPostureVisualizer';

const STEP_OPTIONS = {
  upperArm: [
    { value: 1, label: 'เหยียด 20° ถึง งอ 20°' },
    { value: 2, label: 'เหยียดมากกว่า 20° หรือ งอ 20–45°' },
    { value: 3, label: 'งอ 45–90°' },
    { value: 4, label: 'งอมากกว่า 90°' },
  ],
  upperArmAdjust: [
    { code: 'shoulder_raised', label: 'ไหล่ยกขึ้น', point: 1 },
    { code: 'arm_abducted', label: 'ต้นแขนกางออกจากลำตัว', point: 1 },
    { code: 'arm_supported', label: 'มีที่พยุงแขนหรือพิงตัว', point: -1 },
  ],
  lowerArm: [
    { value: 1, label: 'งอ 60–100°' },
    { value: 2, label: 'งอน้อยกว่า 60° หรือมากกว่า 100°' },
  ],
  lowerArmAdjust: [
    { code: 'cross_midline', label: 'ทำงานข้ามแนวกลางลำตัวหรือกางออกด้านข้าง', point: 1 },
  ],
  wrist: [
    { value: 1, label: 'ตำแหน่งกลาง (neutral)' },
    { value: 2, label: 'งอ/เหยียด 0–15°' },
    { value: 3, label: 'งอ/เหยียดมากกว่า 15°' },
  ],
  wristAdjust: [
    { code: 'wrist_deviate', label: 'ข้อมืองอออกจากแนวกลาง (เบี่ยงซ้าย/ขวา)', point: 1 },
  ],
  wristTwist: [
    { value: 1, label: 'บิดเป็นหลักในช่วงกลาง (mid-range)' },
    { value: 2, label: 'บิดใกล้ช่วงสุดปลาย (end-range)' },
  ],
  neck: [
    { value: 1, label: 'งอ 0–10°' },
    { value: 2, label: 'งอ 10–20°' },
    { value: 3, label: 'งอมากกว่า 20°' },
    { value: 4, label: 'เงยหน้า (extension)' },
  ],
  neckAdjust: [
    { code: 'neck_twist', label: 'คอบิด', point: 1 },
    { code: 'neck_side_bend', label: 'คอเอียงข้าง', point: 1 },
  ],
  trunk: [
    { value: 1, label: 'ตัวตรง (นั่ง/ยืนโดยมีพยุงหลัง)' },
    { value: 2, label: 'งอ 0–20°' },
    { value: 3, label: 'งอ 20–60°' },
    { value: 4, label: 'งอมากกว่า 60°' },
  ],
  trunkAdjust: [
    { code: 'trunk_twist', label: 'ลำตัวบิด', point: 1 },
    { code: 'trunk_side_bend', label: 'ลำตัวเอียงข้าง', point: 1 },
  ],
  legs: [
    { value: 1, label: 'นั่ง/ยืนมั่นคง ขาและเท้าได้รับการรองรับสมดุล' },
    { value: 2, label: 'ขาและเท้าไม่สมดุลหรือไม่ได้รับการรองรับ' },
  ],
  muscleUse: [
    { value: 0, label: 'ไม่เข้าเงื่อนไขด้านล่าง' },
    { value: 1, label: 'ท่าคงที่นานกว่า 1 นาที หรือทำซ้ำมากกว่า 4 ครั้ง/นาที' },
  ],
  forceLoad: [
    { value: 0, label: 'น้ำหนัก ≤ 2 กก. เป็นครั้งคราว' },
    { value: 1, label: 'น้ำหนัก 2–10 กก. เป็นครั้งคราว' },
    { value: 2, label: 'น้ำหนัก 2–10 กก. ค้างท่า/ทำซ้ำ' },
    { value: 3, label: 'น้ำหนัก ≥ 10 กก. หรือมีแรงกระแทก' },
  ],
};

const emptySideState = () => ({
  upperArm: null,
  upperArmAdjust: [],
  lowerArm: null,
  lowerArmAdjust: [],
  wrist: null,
  wristAdjust: [],
  wristTwist: null,
});

const sumAdjust = (base, selectedCodes, options) => {
  const bonus = options
    .filter((o) => selectedCodes.includes(o.code))
    .reduce((acc, o) => acc + o.point, 0);
  return base + bonus;
};

function OptionGroup({ label, options, value, onChange, name, type }) {
  return (
    <div className="rula-field-row">
      <div className="rula-field">
        <p className="rula-field-label">{label}</p>
        <div className="rula-options">
          {options.map((opt) => (
            <label key={opt.value} className={`rula-option ${value === opt.value ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name={name}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
      {type && (
        <div className="rula-visualizer-box">
          <RulaPostureVisualizer type={type} value={value} />
        </div>
      )}
    </div>
  );
}

function AdjustGroup({ label, options, selected, onToggle }) {
  if (!options.length) return null;
  return (
    <div className="rula-field">
      <p className="rula-field-label rula-field-label--sub">{label}</p>
      <div className="rula-options rula-options--checkbox">
        {options.map((opt) => (
          <label
            key={opt.code}
            className={`rula-option rula-option--adjust ${selected.includes(opt.code) ? 'is-selected' : ''}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.code)}
              onChange={() =>
                onToggle(
                  selected.includes(opt.code)
                    ? selected.filter((c) => c !== opt.code)
                    : [...selected, opt.code]
                )
              }
            />
            <span>
              {opt.label} ({opt.point > 0 ? '+' : ''}{opt.point})
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SideForm({ side, sideLabel, state, setState }) {
  const completed = [state.upperArm, state.lowerArm, state.wrist, state.wristTwist].filter(Boolean).length;
  return (
    <div className="rula-side-card">
      <div className="assessment-section-head">
        <div><span className="assessment-section-index">ส่วนที่ {side === 'right' ? '2' : '3'}</span><h3 className="rula-side-title">ท่าทางแขนและข้อมือ · ฝั่ง{sideLabel}</h3></div>
        <span className={`section-progress ${completed === 4 ? 'is-complete' : ''}`}>{completed}/4</span>
      </div>

      <OptionGroup
        name={`${side}-upperArm`}
        label="ตำแหน่งต้นแขน"
        options={STEP_OPTIONS.upperArm}
        value={state.upperArm}
        onChange={(v) => setState((s) => ({ ...s, upperArm: v }))}
        type="upperArm"
      />
      <AdjustGroup
        label="ปรับเพิ่ม/ลด — ต้นแขน"
        options={STEP_OPTIONS.upperArmAdjust}
        selected={state.upperArmAdjust}
        onToggle={(v) => setState((s) => ({ ...s, upperArmAdjust: v }))}
      />

      <OptionGroup
        name={`${side}-lowerArm`}
        label="ตำแหน่งแขนท่อนล่าง"
        options={STEP_OPTIONS.lowerArm}
        value={state.lowerArm}
        onChange={(v) => setState((s) => ({ ...s, lowerArm: v }))}
        type="lowerArm"
      />
      <AdjustGroup
        label="ปรับเพิ่ม — แขนท่อนล่าง"
        options={STEP_OPTIONS.lowerArmAdjust}
        selected={state.lowerArmAdjust}
        onToggle={(v) => setState((s) => ({ ...s, lowerArmAdjust: v }))}
      />

      <OptionGroup
        name={`${side}-wrist`}
        label="ตำแหน่งข้อมือ"
        options={STEP_OPTIONS.wrist}
        value={state.wrist}
        onChange={(v) => setState((s) => ({ ...s, wrist: v }))}
        type="wrist"
      />
      <AdjustGroup
        label="ปรับเพิ่ม — ข้อมือ"
        options={STEP_OPTIONS.wristAdjust}
        selected={state.wristAdjust}
        onToggle={(v) => setState((s) => ({ ...s, wristAdjust: v }))}
      />

      <OptionGroup
        name={`${side}-wristTwist`}
        label="การบิดข้อมือ"
        options={STEP_OPTIONS.wristTwist}
        value={state.wristTwist}
        onChange={(v) => setState((s) => ({ ...s, wristTwist: v }))}
        type="wristTwist"
      />
    </div>
  );
}

export default function RulaAssessmentForm({ onSubmit, onCreateAssessee, assessees = [], scoreCalculator }) {
  const [assesseeId, setAssesseeId] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [showAssesseeModal, setShowAssesseeModal] = useState(false);
  const [newAssessee, setNewAssessee] = useState({ fullName: '', employeeCode: '', position: '' });
  const [creatingAssessee, setCreatingAssessee] = useState(false);
  const [assesseeError, setAssesseeError] = useState('');

  const [right, setRight] = useState(emptySideState());
  const [left, setLeft] = useState(emptySideState());

  const [neck, setNeck] = useState(null);
  const [neckAdjust, setNeckAdjust] = useState([]);
  const [trunk, setTrunk] = useState(null);
  const [trunkAdjust, setTrunkAdjust] = useState([]);
  const [legs, setLegs] = useState(null);
  const [muscleUse, setMuscleUse] = useState(0);
  const [forceLoad, setForceLoad] = useState(0);

  const [submitError, setSubmitError] = useState('');

  const buildSideInput = (s) => ({
    upperArm: sumAdjust(s.upperArm, s.upperArmAdjust, STEP_OPTIONS.upperArmAdjust),
    lowerArm: sumAdjust(s.lowerArm, s.lowerArmAdjust, STEP_OPTIONS.lowerArmAdjust),
    wrist: sumAdjust(s.wrist, s.wristAdjust, STEP_OPTIONS.wristAdjust),
    wristTwist: s.wristTwist,
    neck: sumAdjust(neck, neckAdjust, STEP_OPTIONS.neckAdjust),
    trunk: sumAdjust(trunk, trunkAdjust, STEP_OPTIONS.trunkAdjust),
    legs,
    muscleUse,
    forceLoad,
  });

  const isSideComplete = (s) =>
    s.upperArm && s.lowerArm && s.wrist && s.wristTwist;

  const commonComplete = neck && trunk && legs !== null;

  const preview = useMemo(() => {
    if (!scoreCalculator) return null;
    const result = {};
    if (isSideComplete(right) && commonComplete) {
      result.right = scoreCalculator.calculateSide(buildSideInput(right));
    }
    if (isSideComplete(left) && commonComplete) {
      result.left = scoreCalculator.calculateSide(buildSideInput(left));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [right, left, neck, neckAdjust, trunk, trunkAdjust, legs, muscleUse, forceLoad]);

  const canSubmit =
    assesseeId && isSideComplete(right) && isSideComplete(left) && commonComplete;

  const completedSections = [
    Boolean(assesseeId),
    isSideComplete(right),
    isSideComplete(left),
    Boolean(commonComplete),
  ].filter(Boolean).length;

  const handleSubmit = () => {
    if (!canSubmit) {
      setSubmitError('กรุณากรอกข้อมูลให้ครบทุกขั้นตอนก่อนบันทึก');
      return;
    }
    setSubmitError('');
    onSubmit({
      assesseeId,
      taskDescription,
      sides: {
        right: buildSideInput(right),
        left: buildSideInput(left),
      },
      preview,
    });
  };

  const handleCreateAssessee = async (event) => {
    event.preventDefault();
    if (!newAssessee.fullName.trim()) {
      setAssesseeError('กรุณาระบุชื่อ-นามสกุล');
      return;
    }
    setCreatingAssessee(true);
    setAssesseeError('');
    try {
      const created = await onCreateAssessee(newAssessee);
      setAssesseeId(created.id);
      setNewAssessee({ fullName: '', employeeCode: '', position: '' });
      setShowAssesseeModal(false);
    } catch (error) {
      setAssesseeError(error.message || 'ไม่สามารถเพิ่มผู้ถูกประเมินได้');
    } finally {
      setCreatingAssessee(false);
    }
  };

  return (
    <div className="rula-form">
      <header className="assessment-hero">
        <div>
          <div className="assessment-eyebrow"><span />New assessment</div>
          <h2>เริ่มทำแบบประเมิน RULA</h2>
          <p>บันทึกท่าทางการทำงานที่สังเกตได้จริง เพื่อประเมินความเสี่ยงของร่างกายทั้งสองข้าง</p>
        </div>
        <div className="assessment-completion">
          <span>ความคืบหน้าการประเมิน</span>
          <strong>{completedSections}<small>/4 ส่วน</small></strong>
          <div><i style={{ width: `${completedSections * 25}%` }} /></div>
        </div>
      </header>

      <section className="assessment-block rula-meta">
        <div className="assessment-meta-header">
          <div className="assessment-block-title"><span>ส่วนที่ 1</span><div><h3>ข้อมูลการประเมิน</h3><p>ระบุบุคคลและลักษณะงานที่กำลังสังเกต</p></div></div>
          <button type="button" className="add-assessee-button" onClick={() => { setAssesseeError(''); setShowAssesseeModal(true); }}><b>＋</b> เพิ่มผู้ถูกประเมิน</button>
        </div>
        <div className="assessment-meta-fields">
          <div className="rula-field">
            <label className="rula-field-label" htmlFor="assessee">ผู้ถูกประเมิน</label>
            <select
              id="assessee"
              value={assesseeId}
              onChange={(e) => setAssesseeId(e.target.value)}
            >
              <option value="">-- เลือกผู้ถูกประเมิน --</option>
              {assessees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name} {a.position ? `(${a.position})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="rula-field">
            <label className="rula-field-label" htmlFor="task">ลักษณะงานที่ประเมิน</label>
            <input
              type="text"
              id="task"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="เช่น การยกกล่องเวชภัณฑ์ขึ้นชั้นวาง"
            />
          </div>
        </div>
      </section>

      <section className="rula-sides">
        <SideForm side="right" sideLabel="ขวา" state={right} setState={setRight} />
        <SideForm side="left" sideLabel="ซ้าย" state={left} setState={setLeft} />
      </section>

      <section className="rula-common-card">
        <div className="assessment-section-head">
          <div><span className="assessment-section-index">ส่วนที่ 4</span><h3 className="rula-side-title">คอ ลำตัว และขา</h3><p>ข้อมูลชุดเดียวกันที่ใช้ร่วมกันทั้งฝั่งซ้ายและขวา</p></div>
          <span className={`section-progress ${commonComplete ? 'is-complete' : ''}`}>{[neck, trunk, legs !== null].filter(Boolean).length}/3</span>
        </div>

        <OptionGroup
          name="neck"
          label="ตำแหน่งคอ"
          options={STEP_OPTIONS.neck}
          value={neck}
          onChange={setNeck}
          type="neck"
        />
        <AdjustGroup
          label="ปรับเพิ่ม — คอ"
          options={STEP_OPTIONS.neckAdjust}
          selected={neckAdjust}
          onToggle={setNeckAdjust}
        />

        <OptionGroup
          name="trunk"
          label="ตำแหน่งลำตัว"
          options={STEP_OPTIONS.trunk}
          value={trunk}
          onChange={setTrunk}
          type="trunk"
        />
        <AdjustGroup
          label="ปรับเพิ่ม — ลำตัว"
          options={STEP_OPTIONS.trunkAdjust}
          selected={trunkAdjust}
          onToggle={setTrunkAdjust}
        />

        <OptionGroup
          name="legs"
          label="ขา"
          options={STEP_OPTIONS.legs}
          value={legs}
          onChange={setLegs}
          type="legs"
        />

        <OptionGroup
          name="muscleUse"
          label="การใช้กล้ามเนื้อ (ท่าคงที่/ทำซ้ำ)"
          options={STEP_OPTIONS.muscleUse}
          value={muscleUse}
          onChange={setMuscleUse}
        />

        <OptionGroup
          name="forceLoad"
          label="แรงหรือน้ำหนักที่เกี่ยวข้อง"
          options={STEP_OPTIONS.forceLoad}
          value={forceLoad}
          onChange={setForceLoad}
        />
      </section>

      {preview && (preview.right || preview.left) && (
        <section className="rula-preview">
          <div className="preview-heading"><div><span>Live preview</span><h3 className="rula-side-title">ผลคะแนนเบื้องต้น</h3></div><p>คะแนนนี้เป็นเพียงการแสดงผลระหว่างกรอกข้อมูล ระบบจะตรวจคำนวณอีกครั้งก่อนบันทึก</p></div>
          <div className="rula-preview-grid">
            {preview.right && (
              <ScoreCard label="ฝั่งขวา" result={preview.right} />
            )}
            {preview.left && (
              <ScoreCard label="ฝั่งซ้าย" result={preview.left} />
            )}
          </div>
        </section>
      )}

      {submitError && <p className="rula-error">{submitError}</p>}

      <section className="assessment-submit-area">
        <div><strong>{canSubmit ? 'พร้อมบันทึกผลการประเมิน' : 'กรอกข้อมูลให้ครบทั้ง 4 ส่วนเพื่อบันทึก'}</strong><span>ระบบจะคำนวณคะแนนจากข้อมูลที่เลือก และเก็บผลไว้ในประวัติการประเมิน</span></div>
        <button className="rula-submit-btn" onClick={handleSubmit} disabled={!canSubmit}>
          บันทึกผลการประเมิน <span>→</span>
        </button>
      </section>

      {showAssesseeModal && (
        <div className="assessee-modal-backdrop" onMouseDown={() => !creatingAssessee && setShowAssesseeModal(false)}>
          <form className="assessee-modal" onSubmit={handleCreateAssessee} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="assessee-modal-close" onClick={() => setShowAssesseeModal(false)} disabled={creatingAssessee} aria-label="ปิด">×</button>
            <span className="modal-kicker">New assessee</span>
            <h3>เพิ่มผู้ถูกประเมิน</h3>
            <p>ข้อมูลจะถูกบันทึกในแผนกเดียวกับบัญชีผู้ใช้ปัจจุบัน</p>
            <label>ชื่อ-นามสกุล <b>*</b><input autoFocus value={newAssessee.fullName} onChange={(event) => setNewAssessee((current) => ({ ...current, fullName: event.target.value }))} placeholder="เช่น นาย" list="assessee-list" /></label>
            <label>รหัสพนักงาน<input value={newAssessee.employeeCode} onChange={(event) => setNewAssessee((current) => ({ ...current, employeeCode: event.target.value }))} placeholder="ไม่บังคับ" /></label>
            <label>ตำแหน่งงาน<input value={newAssessee.position} onChange={(event) => setNewAssessee((current) => ({ ...current, position: event.target.value }))} placeholder="เช่น พนักงานแผนกบริการ" /></label>
            {assesseeError && <p className="assessee-modal-error">{assesseeError}</p>}
            <div className="assessee-modal-actions"><button type="button" onClick={() => setShowAssesseeModal(false)} disabled={creatingAssessee}>ยกเลิก</button><button type="submit" disabled={creatingAssessee}>{creatingAssessee ? 'กำลังบันทึก...' : 'บันทึกผู้ถูกประเมิน'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, result }) {
  const levelClass = `level-${result.actionLevel}`;
  return (
    <div className={`rula-score-card ${levelClass}`}>
      <p className="rula-score-side">{label}</p>
      <p className="rula-score-final">{result.finalScore}</p>
      <p className="rula-score-level">ระดับการดำเนินการที่ {result.actionLevel}</p>
      <p className="rula-score-desc">{result.actionLevelLabel}</p>
      <dl className="rula-score-detail">
        <dt>ตาราง ก</dt><dd>{result.tableAScore}</dd>
        <dt>แขน/ข้อมือ</dt><dd>{result.wristArmScore}</dd>
        <dt>ตาราง B</dt><dd>{result.tableBScore}</dd>
        <dt>คอ/ลำตัว/ขา</dt><dd>{result.neckTrunkLegScore}</dd>
      </dl>
    </div>
  );
}
