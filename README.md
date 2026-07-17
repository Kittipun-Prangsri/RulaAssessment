# ระบบประเมิน RULA — React + Node.js + Supabase

## โครงสร้างไฟล์

```
supabase/
  schema.sql                      # รัน SQL นี้ใน Supabase SQL Editor (ตาราง + RLS + seed ตาราง RULA จริง)

server/
  data/rulaTables.json            # ตาราง A/B/C ของ RULA (McAtamney & Corlett 1993)
  services/rulaScoringService.js  # scoring engine (CommonJS, ใช้ฝั่ง Node)
  tests/rulaScoringService.test.js # เทสต์เทียบกับคะแนนจริงจากคู่มือ + จากไฟล์ PDF ที่อัปโหลด
  routes/assessments.example.js   # ตัวอย่าง Express route: รับ input ดิบ -> คำนวณซ้ำ -> บันทึก Supabase

client/
  src/components/RulaAssessmentForm.jsx  # ฟอร์มประเมิน step-by-step (ขวา/ซ้าย/คอ-ลำตัว-ขา)
  src/components/RulaAssessmentForm.css  # ธีม teal/amber + ฟอนต์ Kanit/Sarabun
  src/lib/rulaScoringService.js          # scoring engine เวอร์ชัน ESM (คำนวณ preview ฝั่ง client แบบ offline)
  src/data/rulaTables.json               # สำเนาตาราง RULA สำหรับ client
  src/App.example.jsx                    # ตัวอย่างการเชื่อม Supabase Auth + เรียก backend API
```

## ขั้นตอนติดตั้ง

### 1. Supabase
1. สร้างโปรเจกต์ใหม่ใน Supabase
2. รัน `supabase/schema.sql` ผ่าน SQL Editor — จะได้ตารางทั้งหมด, RLS policies, และ seed ตาราง RULA จริง
3. เพิ่มข้อมูล `departments` อย่างน้อย 1 แถวสำหรับหน่วยงานของคุณ
4. คัดลอก `Project URL` และ `anon key` ไปใส่ใน `.env` ฝั่ง client, และ `service_role key` ไปใส่ `.env` ฝั่ง server (**ห้ามให้ service_role key หลุดไป client**)

### 2. Server (Node/Express)
```bash
cd server
npm init -y
npm install express @supabase/supabase-js dotenv cors
node --test tests/          # รันเทสต์ scoring engine
```
ต่อ `routes/assessments.example.js` เข้ากับ `app.js` หลัก แล้วตั้งค่า `.env`:
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Client (React + Vite)
```bash
cd client
npm create vite@latest . -- --template react
npm install @supabase/supabase-js
```
ตั้งค่า `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:3000
```
ใช้ `App.example.jsx` เป็นจุดเริ่มต้น (เปลี่ยนชื่อเป็น `App.jsx`)

## หลักการออกแบบสำคัญ

- **แหล่งความจริงของคะแนนอยู่ที่ server เท่านั้น** — client คำนวณ preview ได้ทันที (offline-friendly) แต่ก่อนบันทึกจริง backend จะคำนวณซ้ำเสมอ ป้องกันการปลอมแปลงคะแนน
- **ตาราง RULA เป็น config (JSON)** ไม่ hardcode ใน logic — ปรับปรุงได้ในอนาคตผ่านตาราง `rula_lookup_tables` โดยไม่ต้อง deploy โค้ดใหม่
- **RLS ผูกกับแผนก (department_id)** — evaluator เห็นเฉพาะข้อมูลแผนกตัวเอง, super_admin เห็นทั้งหมด
- **audit trail ระดับขั้นตอน** ผ่านตาราง `assessment_steps` เผื่อย้อนดูว่าใครเลือกอะไรตอนไหน

## ทดสอบแล้ว ✅
Scoring engine ผ่านเทสต์ 7 รายการ รวมถึงการ reproduce คะแนนจริงจากไฟล์ PDF ที่คุณอัปโหลด (ฝั่งขวา = 5, ฝั่งซ้าย = 6) ตรงทุกจุด
