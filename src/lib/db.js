import Dexie from 'dexie';
import { getCurrentUser, logAudit } from './auth';

export const db = new Dexie('SmartFarmDB');

// Version 1: Initial schema
db.version(1).stores({
  sessions: '++id, kandang, umur_mg, created_at, synced',
  timbang: '++id, session_id, id_ayam, berat, created_at'
});

// Version 2: Add kandangs table
db.version(2).stores({
  kandangs: '++id, kode, nama, penanggung_jawab, kontak, kapasitas, created_at',
  sessions: '++id, kandang, umur_mg, created_at, synced',
  timbang: '++id, session_id, id_ayam, berat, created_at'
});

// Version 3: Add users and audit_logs
db.version(3).stores({
  users: '++id, username, nama, role, created_at',
  kandangs: '++id, kode, nama, penanggung_jawab, kontak, kapasitas, created_at, created_by, updated_by',
  sessions: '++id, kandang, umur_mg, created_at, synced, created_by',
  timbang: '++id, session_id, id_ayam, berat, created_at',
  audit_logs: '++id, user_id, username, action, entity_type, entity_id, timestamp'
}).upgrade(tx => {
  return tx.table('users').bulkAdd([
    {
      username: 'admin',
      password: 'admin123',
      nama: 'Administrator',
      role: 'admin',
      created_at: new Date().toISOString(),
      synced: false
    },
    {
      username: 'operator',
      password: 'operator123',
      nama: 'Operator',
      role: 'operator',
      created_at: new Date().toISOString(),
      synced: false
    }
  ]);
});

// Version 4: Add synced flag and remote_id for cloud sync
db.version(4).stores({
  users: '++id, username, nama, role, created_at, synced',
  kandangs: '++id, kode, nama, penanggung_jawab, kontak, kapasitas, created_at, created_by, updated_by, synced',
  sessions: '++id, kandang, umur_mg, created_at, synced, created_by, remote_id',
  timbang: '++id, session_id, id_ayam, berat, created_at',
  audit_logs: '++id, user_id, username, action, entity_type, entity_id, timestamp, synced'
});

// ============================================
// SESSION
// ============================================
export async function createSession(kandang, umur_mg) {
  const user = getCurrentUser();
  const id = await db.sessions.add({
    kandang,
    umur_mg,
    created_at: new Date().toISOString(),
    synced: false,
    created_by: user ? user.username : 'unknown'
  });

  if (user) {
    await logAudit('create', 'session', id, null, { kandang, umur_mg });
  }

  return id;
}

export async function addTimbang(session_id, berat) {
  const count = await db.timbang.where('session_id').equals(session_id).count();
  await db.timbang.add({
    session_id,
    id_ayam: count + 1,
    berat,
    created_at: new Date().toISOString()
  });
}

export async function getSessionData(session_id) {
  return await db.timbang.where('session_id').equals(session_id).reverse().toArray();
}

export async function calculateAnalysis(session_id) {
  const data = await db.timbang.where('session_id').equals(session_id).toArray();
  if (data.length === 0) return null;

  const weights = data.map(d => d.berat);
  const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
  const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;

  const lowerBound = mean * 0.9;
  const upperBound = mean * 1.1;
  const uniformCount = weights.filter(w => w >= lowerBound && w <= upperBound).length;
  const uniformity = (uniformCount / weights.length) * 100;

  return {
    totalEkor: weights.length,
    mean: Math.round(mean),
    cv: cv.toFixed(2),
    uniformity: uniformity.toFixed(2),
    stdDev: stdDev.toFixed(2)
  };
}

// ============================================
// KANDANG
// ============================================
export async function registerKandang(data) {
  const exists = await db.kandangs.where('kode').equals(data.kode).first();
  if (exists) throw new Error('Kode kandang sudah terdaftar');

  const user = getCurrentUser();
  const id = await db.kandangs.add({
    ...data,
    created_at: new Date().toISOString(),
    created_by: user ? user.username : 'unknown',
    updated_by: null,
    synced: false
  });

  if (user) await logAudit('create', 'kandang', id, null, data);
  return id;
}

export async function getAllKandangs() {
  return await db.kandangs.toArray();
}

export async function getKandangByKode(kode) {
  return await db.kandangs.where('kode').equals(kode).first();
}

export async function updateKandang(id, data) {
  const user = getCurrentUser();
  const oldData = await db.kandangs.get(id);

  await db.kandangs.update(id, {
    ...data,
    updated_by: user ? user.username : 'unknown',
    updated_at: new Date().toISOString(),
    synced: false
  });

  if (user) await logAudit('update', 'kandang', id, oldData, data);
}

export async function deleteKandang(id) {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Hanya admin yang dapat menghapus data');
  }

  const oldData = await db.kandangs.get(id);
  await db.kandangs.delete(id);
  await logAudit('delete', 'kandang', id, oldData, null);
}

// ============================================
// AUDIT LOGS
// ============================================
export async function getAuditLogs(filters = {}) {
  let query = db.audit_logs.orderBy('timestamp').reverse();

  if (filters.entity_type) {
    query = query.filter(log => log.entity_type === filters.entity_type);
  }
  if (filters.action) {
    query = query.filter(log => log.action === filters.action);
  }

  return await query.toArray();
}

// ============================================
// USERS
// ============================================
export async function getAllUsers() {
  return await db.users.toArray();
}

export async function createUser(data) {
  const exists = await db.users.where('username').equals(data.username).first();
  if (exists) throw new Error('Username sudah terdaftar');

  const id = await db.users.add({
    ...data,
    created_at: new Date().toISOString(),
    synced: false
  });

  // Langsung push ke Supabase jika online
  if (navigator.onLine) {
    const { syncToSupabase } = await import('./sync');
    syncToSupabase();
  }

  return id;
}

export async function updateUser(id, data) {
  const updateData = { ...data };
  delete updateData.username;
  if (!updateData.password) delete updateData.password;
  await db.users.update(id, { ...updateData, synced: false });

  // Langsung push ke Supabase jika online
  if (navigator.onLine) {
    const { syncToSupabase } = await import('./sync');
    syncToSupabase();
  }
}

export async function deleteUser(id) {
  await db.users.delete(id);
}
