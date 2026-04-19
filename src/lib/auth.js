import { db } from './db';

// Superadmin — akses tertinggi, tidak bisa dihapus/diedit siapapun
const SUPERADMIN = { username: 'shakadigital', password: 'abrisam2554' };

// Akun demo bawaan — bisa login tapi hanya lihat data demo
const DEMO_ACCOUNTS = [
  { username: 'admin',    password: 'admin123' },
  { username: 'operator', password: 'operator123' }
];

// Username yang dilindungi — tidak bisa dihapus atau diedit oleh siapapun
export const PROTECTED_USERNAMES = ['shakadigital', 'admin', 'operator'];

let currentUser = null;

export function getCurrentUser() {
  if (!currentUser) {
    const stored = localStorage.getItem('currentUser');
    if (stored) currentUser = JSON.parse(stored);
  }
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
  if (user) localStorage.setItem('currentUser', JSON.stringify(user));
  else localStorage.removeItem('currentUser');
}

export function isAdmin() {
  const user = getCurrentUser();
  return user?.role === 'admin';
}

export function isSuperAdmin() {
  const user = getCurrentUser();
  return user?.username === SUPERADMIN.username;
}

export function isDemoAccount() {
  const user = getCurrentUser();
  if (!user) return false;
  return DEMO_ACCOUNTS.some(d => d.username === user.username);
}

// Hanya superadmin dan admin resmi (non-demo) yang bisa kelola user
export function canManageUsers() {
  if (isSuperAdmin()) return true;
  return isAdmin() && !isDemoAccount();
}

// Hanya admin resmi dan superadmin yang bisa hapus
export function canDelete() {
  return isAdmin() && !isDemoAccount();
}

export async function login(username, password) {
  // Cek superadmin dulu (tidak perlu ada di DB lokal)
  if (username === SUPERADMIN.username) {
    if (password !== SUPERADMIN.password) throw new Error('Password salah');

    // Pastikan ada di IndexedDB
    let user = await db.users.where('username').equals(username).first();
    if (!user) {
      const id = await db.users.add({
        username: SUPERADMIN.username,
        password: SUPERADMIN.password,
        nama: 'Shaka Digital',
        role: 'admin',
        created_at: new Date().toISOString(),
        synced: false
      });
      user = { id, username: SUPERADMIN.username, nama: 'Shaka Digital', role: 'admin' };
    }

    const userData = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      isDemo: false,
      isSuperAdmin: true
    };
    setCurrentUser(userData);
    return userData;
  }

  // Login biasa
  const user = await db.users.where('username').equals(username).first();
  if (!user) throw new Error('Username tidak ditemukan');
  if (user.password !== password) throw new Error('Password salah');

  const isDemo = DEMO_ACCOUNTS.some(
    d => d.username === username && d.password === password
  );

  const userData = {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    isDemo,
    isSuperAdmin: false
  };

  setCurrentUser(userData);
  return userData;
}

export function logout() {
  setCurrentUser(null);
}

export async function logAudit(action, entityType, entityId, oldData, newData) {
  const user = getCurrentUser();
  if (!user) return;

  await db.audit_logs.add({
    user_id: user.id,
    username: user.username,
    nama: user.nama,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData ? JSON.stringify(oldData) : null,
    new_data: newData ? JSON.stringify(newData) : null,
    timestamp: new Date().toISOString(),
    synced: false
  });
}
