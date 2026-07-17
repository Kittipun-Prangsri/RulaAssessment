'use strict';

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// ============================================================
// นำเข้า shared singleton (Supabase client + RULA cache)
// ============================================================
const { loadRulaTables, getRulaTables, getCachedAt } = require('./rulaCache');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================================
// Routes
// ============================================================
const assessmentsRouter = require('./routes/assessments');
app.use('/api/assessments', assessmentsRouter);

// Health check — แสดงสถานะ cache ด้วย
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rulaTablesLoaded: !!getRulaTables(),
    rulaTablesCachedAt: getCachedAt()?.toISOString() || null,
  });
});

// Reload RULA tables จาก Supabase โดยไม่ต้อง restart server
// TODO: เพิ่ม middleware ตรวจ admin auth ก่อน deploy production
app.post('/api/admin/reload-rula-tables', async (req, res) => {
  try {
    await loadRulaTables();
    res.json({
      success: true,
      message: 'RULA tables reloaded from Supabase',
      cachedAt: getCachedAt()?.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// Startup: โหลดตาราง RULA ก่อน แล้วจึงเปิด server
// ============================================================
(async () => {
  try {
    await loadRulaTables();
  } catch (err) {
    console.error('💥 Fatal: Cannot start server without RULA tables:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 RULA Server running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Reload tables: POST http://localhost:${PORT}/api/admin/reload-rula-tables`);
  });
})();

module.exports = app;
