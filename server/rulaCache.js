'use strict';

/**
 * rulaCache.js — ตัวกลางเก็บ RULA tables cache และ Supabase admin client
 * แยกออกมาเพื่อป้องกัน circular dependency ระหว่าง app.js ↔ routes/
 */

const { createClient } = require('@supabase/supabase-js');

// ============================================================
// Supabase Admin Client
// ============================================================
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ============================================================
// In-Memory Cache
// ============================================================
let _tables = null;
let _cachedAt = null;

async function loadRulaTables() {
  console.log('📊 Loading RULA lookup tables from Supabase...');
  try {
    const { data, error } = await supabaseAdmin
      .from('rula_lookup_tables')
      .select('table_name, data')
      .eq('is_active', true)
      .eq('version', 'v1');

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No active RULA lookup tables found in database');

    const tables = {};
    for (const row of data) {
      tables[row.table_name] = row.data;
    }

    const required = ['table_a', 'table_b', 'table_c'];
    for (const key of required) {
      if (!tables[key]) throw new Error(`Missing required table: ${key}`);
    }

    // เพิ่ม action_levels จาก local JSON (DB ไม่เก็บ action_levels แยก table)
    try {
      const localJson = require('./data/rulaTables.json');
      tables.action_levels = localJson.action_levels;
    } catch (_) { /* ไม่บังคับ */ }

    _tables = tables;
    _cachedAt = new Date();
    console.log(`✅ RULA tables loaded from Supabase. Cached at: ${_cachedAt.toISOString()}`);
    return _tables;
  } catch (err) {
    console.error('❌ Failed to load RULA tables from Supabase:', err.message);

    // Fallback — โหลดจาก JSON file ในเครื่อง ให้ server ยังทำงานได้
    console.warn('⚠️  Falling back to local rulaTables.json');
    const localTables = require('./data/rulaTables.json');
    _tables = {
      table_a: localTables.table_a,
      table_b: localTables.table_b,
      table_c: localTables.table_c,
      action_levels: localTables.action_levels,
    };
    _cachedAt = new Date();
    console.log('✅ Loaded RULA tables from local fallback JSON.');
    return _tables;
  }
}

function getRulaTables() {
  return _tables;
}

function getCachedAt() {
  return _cachedAt;
}

module.exports = { supabaseAdmin, loadRulaTables, getRulaTables, getCachedAt };
