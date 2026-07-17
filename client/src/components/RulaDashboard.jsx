import { useEffect, useMemo, useState } from 'react';

const RISK = {
  1: { label: 'ปกติ', detail: 'ยังอยู่ในเกณฑ์ยอมรับได้', color: 'mint' },
  2: { label: 'เฝ้าระวัง', detail: 'ควรติดตามและทบทวนท่าทาง', color: 'yellow' },
  3: { label: 'ควรปรับปรุง', detail: 'วางแผนแก้ไขในระยะใกล้', color: 'orange' },
  4: { label: 'ต้องดำเนินการ', detail: 'ควรแก้ไขโดยเร็วที่สุด', color: 'red' },
};

function Icon({ name, size = 20 }) {
  const paths = {
    plus: <><path d="M12 5v14M5 12h14" /></>,
    refresh: <><path d="M20 11a8 8 0 1 0 2 5" /><path d="M20 4v7h-7" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    arrow: <path d="m9 18 6-6-6-6" />,
    eye: <><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.7" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    alert: <><path d="M10.3 4.6 3.2 17a2 2 0 0 0 1.7 3h14.2a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const getHighestLevel = (assessment) => Math.max(1, ...(assessment.assessment_sides || []).map((side) => side.action_level || 1));
const getHighestScore = (assessment) => Math.max(0, ...(assessment.assessment_sides || []).map((side) => side.final_score || 0));

export default function RulaDashboard({ supabase, onNavigateToForm }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('all');
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('assessments')
        .select(`id, task_description, assessed_at, status, assessees (full_name, position), assessment_sides (side, final_score, action_level, table_a_score, wrist_arm_score, table_b_score, neck_trunk_leg_score)`)
        .eq('status', 'completed')
        .order('assessed_at', { ascending: false });
      if (fetchError) throw fetchError;
      setAssessments(data || []);
    } catch (err) {
      console.error('Dashboard data error:', err);
      setError('ไม่สามารถโหลดข้อมูลสรุปได้ โปรดลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // ดึงข้อมูลใหม่เมื่อผู้ใช้กลับมาที่แท็บ เพื่อให้รายการที่เพิ่มจาก Supabase
    // หรือจากผู้ประเมินคนอื่นปรากฏโดยไม่ต้องออกจากระบบ
    const refreshOnFocus = () => fetchDashboardData();
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, []);

  const summary = useMemo(() => {
    const risks = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let totalScore = 0;
    assessments.forEach((item) => {
      risks[getHighestLevel(item)] += 1;
      totalScore += getHighestScore(item);
    });
    const urgent = assessments.filter((item) => getHighestLevel(item) >= 3);
    return {
      risks,
      urgent,
      averageScore: assessments.length ? (totalScore / assessments.length).toFixed(1) : '–',
      urgentRate: assessments.length ? Math.round((urgent.length / assessments.length) * 100) : 0,
    };
  }, [assessments]);

  const filteredAssessments = useMemo(() => assessments.filter((item) => {
    const query = searchTerm.trim().toLowerCase();
    const name = item.assessees?.full_name?.toLowerCase() || '';
    const task = item.task_description?.toLowerCase() || '';
    const matchesSearch = !query || name.includes(query) || task.includes(query);
    const level = getHighestLevel(item);
    const matchesRisk = selectedRisk === 'all'
      || (selectedRisk === 'attention' ? level >= 3 : level === Number(selectedRisk));
    return matchesSearch && matchesRisk;
  }), [assessments, searchTerm, selectedRisk]);

  return (
    <div className="rula-dashboard dashboard-v2">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" />ภาพรวมความปลอดภัยในการทำงาน</div>
          <h1>ศูนย์ติดตามความเสี่ยง<br /><span>RULA Assessment</span></h1>
          <p>ติดตามผลการประเมินท่าทาง เพื่อเห็นจุดที่ควรปรับปรุงก่อนกลายเป็นความเสี่ยงสะสม</p>
        </div>
        <div className="hero-actions">
          <button className="hero-refresh" onClick={fetchDashboardData} disabled={loading}><Icon name="refresh" size={17} />อัปเดตข้อมูล</button>
          <button className="hero-create" onClick={onNavigateToForm}><Icon name="plus" size={18} />เริ่มประเมิน</button>
        </div>
        <div className="hero-orbit hero-orbit--one" /><div className="hero-orbit hero-orbit--two" />
      </section>

      <section className="dashboard-summary" aria-label="สรุปการประเมิน">
        <div className="summary-intro"><span>สรุปผลทั้งหมด</span><strong>{assessments.length}</strong><small>รายการที่ประเมินแล้ว</small></div>
        {[1, 2, 3, 4].map((level) => (
          <button key={level} className={`risk-tile risk-tile--${RISK[level].color} ${selectedRisk === String(level) ? 'is-active' : ''}`} onClick={() => setSelectedRisk(selectedRisk === String(level) ? 'all' : String(level))}>
            <span className="risk-tile-count">{summary.risks[level]}</span>
            <span><b>ระดับ {level} · {RISK[level].label}</b><small>{RISK[level].detail}</small></span>
          </button>
        ))}
      </section>

      <section className="dashboard-insights">
        <article className="risk-overview panel">
          <div className="panel-heading"><div><span className="panel-kicker">Risk distribution</span><h2>สัดส่วนระดับความเสี่ยง</h2></div><span className="score-average">คะแนนเฉลี่ย <b>{summary.averageScore}</b></span></div>
          <div className="risk-bars">
            {[1, 2, 3, 4].map((level) => {
              const percentage = assessments.length ? (summary.risks[level] / assessments.length) * 100 : 0;
              return <div className="risk-bar-row" key={level}><span className={`risk-dot risk-dot--${RISK[level].color}`} /><span className="risk-bar-label">ระดับ {level}</span><div className="risk-track"><i className={`risk-fill risk-fill--${RISK[level].color}`} style={{ width: `${percentage}%` }} /></div><strong>{summary.risks[level]}</strong><small>{Math.round(percentage)}%</small></div>;
            })}
          </div>
          <p className="panel-note">กดที่การ์ดระดับความเสี่ยงด้านบนเพื่อกรองรายการที่ต้องการดู</p>
        </article>

        <article className={`attention-card ${summary.urgent.length ? 'has-urgent' : ''}`}>
          <div className="attention-icon"><Icon name="alert" size={22} /></div>
          <div><span>รายการที่ต้องติดตาม</span><h2>{summary.urgent.length} <small>รายการ</small></h2><p>{summary.urgent.length ? `คิดเป็น ${summary.urgentRate}% ของการประเมินทั้งหมด ควรจัดลำดับการปรับปรุง` : 'ยังไม่มีรายการในระดับที่ต้องเร่งดำเนินการ'}</p></div>
          {summary.urgent.length > 0 && <button onClick={() => setSelectedRisk('attention')}>ดูรายการ <Icon name="arrow" size={15} /></button>}
        </article>
      </section>

      <section className="assessment-panel panel">
        <div className="assessment-panel-head"><div><span className="panel-kicker">Assessment log</span><h2>ประวัติการประเมิน</h2><p>แสดง {filteredAssessments.length} จาก {assessments.length} รายการ</p></div><div className="table-controls"><label className="search-box"><Icon name="search" size={17} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ค้นหาชื่อหรือชื่องาน" /></label><select value={selectedRisk} onChange={(event) => setSelectedRisk(event.target.value)}><option value="all">ทุกระดับความเสี่ยง</option><option value="attention">ระดับ 3–4 · ต้องติดตาม</option>{[1, 2, 3, 4].map((level) => <option value={level} key={level}>ระดับ {level} · {RISK[level].label}</option>)}</select></div></div>
        {loading ? <div className="dashboard-state"><span className="loading-ring" />กำลังเรียกดูข้อมูลการประเมิน...</div> : error ? <div className="dashboard-state dashboard-state--error">{error}<button onClick={fetchDashboardData}>ลองอีกครั้ง</button></div> : filteredAssessments.length === 0 ? <div className="dashboard-state"><Icon name="clipboard" size={28} /><b>ยังไม่มีรายการที่ตรงกับเงื่อนไข</b><span>ลองปรับคำค้นหาหรือตัวกรองความเสี่ยง</span></div> : <div className="table-responsive"><table className="assessment-table"><thead><tr><th>ผู้ถูกประเมิน / งาน</th><th>วันที่ประเมิน</th><th>คะแนนขวา</th><th>คะแนนซ้าย</th><th>สถานะความเสี่ยง</th><th aria-label="ดูรายละเอียด" /></tr></thead><tbody>{filteredAssessments.map((item) => { const right = item.assessment_sides?.find((side) => side.side === 'right'); const left = item.assessment_sides?.find((side) => side.side === 'left'); const level = getHighestLevel(item); return <tr key={item.id}><td><div className="person-cell"><span className="person-avatar">{(item.assessees?.full_name || '?').slice(0, 1)}</span><div><b>{item.assessees?.full_name || 'ไม่ระบุชื่อ'}</b><small>{item.task_description || item.assessees?.position || 'ไม่ได้ระบุลักษณะงาน'}</small></div></div></td><td className="date-cell">{item.assessed_at ? new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.assessed_at)) : '–'}</td><td><span className={`side-score score--${right?.action_level || 1}`}>{right?.final_score ?? '–'}</span></td><td><span className={`side-score score--${left?.action_level || 1}`}>{left?.final_score ?? '–'}</span></td><td><span className={`risk-badge risk-badge--${RISK[level].color}`}><i />ระดับ {level} · {RISK[level].label}</span></td><td><button className="preview-button" onClick={() => setSelectedAssessment(item)}><Icon name="eye" size={16} />ดูผล</button></td></tr>; })}</tbody></table></div>}
      </section>
      {selectedAssessment && <AssessmentPreview assessment={selectedAssessment} onClose={() => setSelectedAssessment(null)} />}
    </div>
  );
}

function AssessmentPreview({ assessment, onClose }) {
  const right = assessment.assessment_sides?.find((side) => side.side === 'right');
  const left = assessment.assessment_sides?.find((side) => side.side === 'left');
  const level = getHighestLevel(assessment);

  return <div className="score-preview-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="score-preview-modal" role="dialog" aria-modal="true" aria-labelledby="score-preview-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="preview-close" onClick={onClose} aria-label="ปิด"><Icon name="close" size={19} /></button>
      <span className="preview-kicker">Assessment preview</span>
      <h2 id="score-preview-title">{assessment.assessees?.full_name || 'ไม่ระบุชื่อ'}</h2>
      <p className="preview-task">{assessment.task_description || assessment.assessees?.position || 'ไม่ได้ระบุลักษณะงาน'}</p>
      <div className={`preview-risk-banner preview-risk--${RISK[level].color}`}><span>ระดับความเสี่ยงสูงสุด</span><b>ระดับ {level} · {RISK[level].label}</b><small>{RISK[level].detail}</small></div>
      <div className="preview-score-grid"><PreviewSide label="ฝั่งขวา" side={right} /><PreviewSide label="ฝั่งซ้าย" side={left} /></div>
      <p className="preview-footnote">ประเมินเมื่อ {assessment.assessed_at ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date(assessment.assessed_at)) : 'ไม่ระบุวันที่'}</p>
    </section>
  </div>;
}

function PreviewSide({ label, side }) {
  if (!side) return <div className="preview-side-card"><span>{label}</span><b>ไม่มีข้อมูลคะแนน</b></div>;
  return <div className={`preview-side-card preview-side--${side.action_level}`}>
    <div><span>{label}</span><strong>{side.final_score}</strong><small>RULA score</small></div>
    <dl><dt>ตาราง A</dt><dd>{side.table_a_score ?? '–'}</dd><dt>แขน/ข้อมือ</dt><dd>{side.wrist_arm_score ?? '–'}</dd><dt>ตาราง B</dt><dd>{side.table_b_score ?? '–'}</dd><dt>คอ/ลำตัว/ขา</dt><dd>{side.neck_trunk_leg_score ?? '–'}</dd></dl>
  </div>;
}
