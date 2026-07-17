import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import RulaAssessmentForm from './components/RulaAssessmentForm';
import RulaDashboard from './components/RulaDashboard';
import RulaAuth from './components/RulaAuth';
import { RulaScoringService } from './lib/rulaScoringService';
import rulaTables from './data/rulaTables.json';
import './components/RulaAssessmentForm.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ใช้คำนวณ preview ทันทีบนเครื่อง (offline-friendly)
const scoreCalculator = new RulaScoringService(rulaTables);

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assessees, setAssessees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ตรวจจับสถานะการล็อกอิน
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // โหลดรายชื่อผู้ถูกประเมินเมื่อผู้ใช้ล็อกอินสำเร็จ
  useEffect(() => {
    if (!session) return;
    supabase
      .from('assessees')
      .select('id, full_name, position')
      .order('full_name')
      .then(({ data, error }) => {
        if (!error) setAssessees(data || []);
      });
  }, [session]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setSaveMessage('');
    try {
      // 1) ดึง Token ปัจจุบันของผู้ใช้
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession) throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล');

      // 2) ส่งข้อมูลประเมินดิบไปยัง Node/Express API พร้อม Authorization Header
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          assesseeId: payload.assesseeId,
          taskDescription: payload.taskDescription,
          sides: payload.sides, // { right: {...}, left: {...} }
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      const result = await res.json();
      setSaveMessage(
        `🎉 บันทึกสำเร็จ — คะแนนขวา: ${result.right.finalScore} / คะแนนซ้าย: ${result.left.finalScore}`
      );
      
      // สั่งให้แดชบอร์ดดึงข้อมูลใหม่
      setRefreshTrigger(prev => prev + 1);
      
      // ย้ายกลับไปหน้าแดชบอร์ดหลังจากผ่านไป 2 วินาที
      setTimeout(() => {
        setActiveTab('dashboard');
        setSaveMessage('');
      }, 2000);

    } catch (err) {
      setSaveMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // หากผู้ใช้ยังไม่ได้ล็อกอิน ให้แสดงหน้าล็อกอิน/ลงทะเบียน
  if (!session) {
    return <RulaAuth supabase={supabase} onAuthSuccess={(sess) => setSession(sess)} />;
  }

  return (
    <div className="app-container">
      {/* แท็บเมนูหลัก */}
      <nav className="app-nav">
        <div 
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 แดชบอร์ด
        </div>
        <div 
          className={`nav-tab ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          📝 ทำแบบประเมิน
        </div>
        <div 
          className="nav-tab logout-btn"
          onClick={handleLogout}
        >
          🚪 ออกจากระบบ
        </div>
      </nav>

      {/* ควบคุมการแสดงผลตามแท็บ */}
      <main className="app-main">
        {activeTab === 'dashboard' ? (
          <RulaDashboard 
            supabase={supabase} 
            key={refreshTrigger}
            onNavigateToForm={() => setActiveTab('form')}
          />
        ) : (
          <div className="form-view-container">
            <RulaAssessmentForm
              assessees={assessees}
              scoreCalculator={scoreCalculator}
              onSubmit={handleSubmit}
            />
            {saving && <p className="status-text saving">กำลังบันทึกข้อมูล...</p>}
            {saveMessage && <p className={`status-text ${saveMessage.includes('สำเร็จ') ? 'success' : 'error'}`}>{saveMessage}</p>}
          </div>
        )}
      </main>

      <footer className="app-footer-bar">
        <p>สร้างโดย Kittipun Prangsri. 2026</p>
      </footer>
    </div>
  );
}
