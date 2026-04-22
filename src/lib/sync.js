import { db } from './db';
import { supabase } from './supabase';
import { isDemoAccount } from './auth';

let isSyncing = false;

// ============================================
// PUSH: Local → Supabase
// ============================================
export async function syncToSupabase() {
  // Jangan sync jika user adalah akun demo
  if (isDemoAccount()) {
    console.log('[Sync] Akun demo — sync dilewati');
    return;
  }

  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  try {
    await pushUsers();
    await pushKandangs();
    await pushSessions();
    await pushAuditLogs();
    console.log('[Sync] Push selesai');
  } catch (err) {
    console.error('[Sync] Push error:', err);
  } finally {
    isSyncing = false;
  }
}

async function pushUsers() {
  const all = await db.users.toArray();
  const unsynced = all.filter(u => !u.synced);

  for (const user of unsynced) {
    const { error } = await supabase.from('users').upsert({
      username: user.username,
      password: user.password,
      nama: user.nama,
      role: user.role,
      owner: user.owner || null,
      created_at: user.created_at
    }, { onConflict: 'username' });

    if (!error) await db.users.update(user.id, { synced: true });
    else console.warn('[Sync] pushUsers error:', error.message);
  }
}

async function pushKandangs() {
  const all = await db.kandangs.toArray();
  const unsynced = all.filter(k => !k.synced);

  for (const kandang of unsynced) {
    const { error } = await supabase.from('kandangs').upsert({
      kode: kandang.kode,
      nama: kandang.nama,
      penanggung_jawab: kandang.penanggung_jawab,
      kontak: kandang.kontak,
      kapasitas: kandang.kapasitas || null,
      created_at: kandang.created_at,
      created_by: kandang.created_by || null,
      updated_at: kandang.updated_at || null,
      updated_by: kandang.updated_by || null
    }, { onConflict: 'kode' });

    if (!error) await db.kandangs.update(kandang.id, { synced: true });
    else console.warn('[Sync] pushKandangs error:', error.message);
  }
}

async function pushSessions() {
  const all = await db.sessions.toArray();
  const unsynced = all.filter(s => !s.synced);

  for (const session of unsynced) {
    // Pastikan kandang sudah ada di Supabase dulu
    const { data: kandangExists } = await supabase
      .from('kandangs')
      .select('kode')
      .eq('kode', session.kandang)
      .maybeSingle();

    if (!kandangExists) {
      // Push kandang dulu sebelum session
      const localKandang = await db.kandangs.where('kode').equals(session.kandang).first();
      if (localKandang) {
        await supabase.from('kandangs').upsert({
          kode: localKandang.kode,
          nama: localKandang.nama,
          penanggung_jawab: localKandang.penanggung_jawab,
          kontak: localKandang.kontak,
          kapasitas: localKandang.kapasitas || null,
          created_at: localKandang.created_at,
          created_by: localKandang.created_by || null,
          updated_at: localKandang.updated_at || null,
          updated_by: localKandang.updated_by || null
        }, { onConflict: 'kode' });
        await db.kandangs.update(localKandang.id, { synced: true });
      } else {
        console.warn('[Sync] Kandang tidak ditemukan lokal:', session.kandang);
        continue;
      }
    }

    // Cek apakah sudah ada di remote — gunakan local_id + created_by agar unik antar device
    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('local_id', session.id)
      .eq('created_by', session.created_by || '')
      .maybeSingle();

    let remoteId = existing?.id;

    if (!remoteId) {
      const { data, error } = await supabase.from('sessions').insert({
        local_id: session.id,
        kandang: session.kandang,
        umur_mg: session.umur_mg,
        created_at: session.created_at,
        created_by: session.created_by || null
      }).select().single();

      if (error) {
        console.warn('[Sync] pushSessions error:', error.message);
        continue;
      }
      remoteId = data.id;
    }

    // Push timbang data
    const timbangData = await db.timbang.where('session_id').equals(session.id).toArray();
    if (timbangData.length > 0) {
      const { data: existingTimbang } = await supabase
        .from('timbang')
        .select('local_id')
        .eq('session_id', remoteId);

      const existingLocalIds = new Set((existingTimbang || []).map(t => t.local_id));
      const newTimbang = timbangData.filter(t => !existingLocalIds.has(t.id));

      if (newTimbang.length > 0) {
        const { error: timbangError } = await supabase.from('timbang').insert(
          newTimbang.map(t => ({
            local_id: t.id,
            session_id: remoteId,
            id_ayam: t.id_ayam,
            berat: t.berat,
            created_at: t.created_at
          }))
        );
        if (timbangError) {
          console.warn('[Sync] pushTimbang error:', timbangError.message);
          continue; // jangan mark session sebagai synced jika timbang gagal
        }
      }
    }

    await db.sessions.update(session.id, { synced: true, remote_id: remoteId });
  }
}

async function pushAuditLogs() {
  const all = await db.audit_logs.toArray();
  const unsynced = all.filter(l => !l.synced);

  for (const log of unsynced) {
    const { error } = await supabase.from('audit_logs').insert({
      local_id: log.id,
      user_id: log.user_id?.toString() || null,
      username: log.username,
      nama: log.nama,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id?.toString() || null,
      old_data: log.old_data ? JSON.parse(log.old_data) : null,
      new_data: log.new_data ? JSON.parse(log.new_data) : null,
      timestamp: log.timestamp
    });

    if (!error) await db.audit_logs.update(log.id, { synced: true });
    else console.warn('[Sync] pushAuditLogs error:', error.message);
  }
}

// ============================================
// PULL: Supabase → Local
// ============================================
export async function pullFromSupabase() {
  if (!navigator.onLine) return;

  try {
    await pullUsers();
    await pullKandangs();
    console.log('[Sync] Pull selesai');
  } catch (err) {
    console.error('[Sync] Pull error:', err);
  }
}

async function pullUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error || !data) return;

  for (const remote of data) {
    const existing = await db.users.where('username').equals(remote.username).first();
    if (!existing) {
      await db.users.add({
        username: remote.username,
        password: remote.password,
        nama: remote.nama,
        role: remote.role,
        owner: remote.owner || null,
        created_at: remote.created_at,
        synced: true
      });
    } else {
      await db.users.update(existing.id, {
        password: remote.password,
        nama: remote.nama,
        role: remote.role,
        owner: remote.owner || null,
        synced: true
      });
    }
  }
}

async function pullKandangs() {
  const { data, error } = await supabase.from('kandangs').select('*');
  if (error || !data) return;

  for (const remote of data) {
    const existing = await db.kandangs.where('kode').equals(remote.kode).first();
    if (!existing) {
      await db.kandangs.add({
        kode: remote.kode,
        nama: remote.nama,
        penanggung_jawab: remote.penanggung_jawab,
        kontak: remote.kontak,
        kapasitas: remote.kapasitas,
        created_at: remote.created_at,
        created_by: remote.created_by,
        updated_at: remote.updated_at,
        updated_by: remote.updated_by,
        synced: true
      });
    } else {
      // Update data lokal dari remote
      await db.kandangs.update(existing.id, {
        nama: remote.nama,
        penanggung_jawab: remote.penanggung_jawab,
        kontak: remote.kontak,
        kapasitas: remote.kapasitas,
        updated_at: remote.updated_at,
        updated_by: remote.updated_by,
        synced: true
      });
    }
  }
}

// ============================================
// AUTO SYNC
// ============================================
export function initAutoSync() {
  // Sync saat koneksi kembali
  window.addEventListener('online', async () => {
    console.log('[Sync] Koneksi kembali, memulai sync...');
    await syncToSupabase();
    await pullFromSupabase();
  });

  // Sync saat startup jika online
  if (navigator.onLine) {
    // Delay sedikit agar DB sudah siap
    setTimeout(async () => {
      await pullFromSupabase();
      await syncToSupabase();
    }, 1000);
  }
}
