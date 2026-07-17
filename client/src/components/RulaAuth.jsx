import React, { useState } from 'react';

/**
 * RulaAuth
 * --------
 * หน้าเข้าสู่ระบบ / ลงทะเบียนผู้ประเมิน RULA
 */
export default function RulaAuth({ supabase, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      if (isRegister) {
        // ลงทะเบียนผู้ใช้ใหม่
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split('@')[0],
            },
          },
        });

        if (error) throw error;
        
        setMessage('ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลยืนยันการใช้งาน (หากเปิดระบบไว้) หรือเข้าสู่ระบบได้ทันที');
        setIsRegister(false);
      } else {
        // เข้าสู่ระบบ
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          onAuthSuccess(data.session);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setIsError(true);
      setMessage(err.message || 'เกิดข้อผิดพลาดในการรับรองตัวตน');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <header className="auth-header">
          <h2>ระบบประเมิน RULA</h2>
          <p className="auth-subtitle">
            {isRegister ? 'สร้างบัญชีผู้ประเมินใหม่' : 'เข้าสู่ระบบผู้ประเมิน'}
          </p>
        </header>

        <form onSubmit={handleAuth} className="auth-form">
          {isRegister && (
            <div className="auth-field">
              <label htmlFor="fullName">ชื่อ-นามสกุลจริง</label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="เช่น นพ.สมชาย ใจดี"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">อีเมล</label>
            <input
              id="email"
              type="email"
              required
              placeholder="name@hospital.go.th"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              required
              placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {message && (
            <div className={`auth-message ${isError ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'กำลังดำเนินการ...' : isRegister ? 'ลงทะเบียน' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="auth-footer">
          <button 
            type="button" 
            className="btn-link" 
            onClick={() => {
              setIsRegister(!isRegister);
              setMessage('');
            }}
          >
            {isRegister ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ต้องการบัญชีใหม่? ลงทะเบียนผู้ประเมิน'}
          </button>
        </div>
      </div>
    </div>
  );
}
