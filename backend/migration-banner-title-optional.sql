-- Migration: Membuat kolom title di tabel banners menjadi optional (nullable)
-- Tanggal: 2025-10-11

USE al_hakim_catering;

-- Ubah kolom title dari NOT NULL menjadi NULL
ALTER TABLE banners MODIFY COLUMN title VARCHAR(255) NULL;

