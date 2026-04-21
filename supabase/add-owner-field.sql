-- Migration: tambah field owner ke tabel users
-- Jalankan ini di Supabase SQL Editor jika tabel users sudah ada

ALTER TABLE users ADD COLUMN IF NOT EXISTS owner VARCHAR(50) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_owner ON users(owner);

-- Update: user yang dibuat oleh superadmin tidak punya owner (NULL)
-- User yang dibuat oleh admin lain perlu di-set manual atau via aplikasi
