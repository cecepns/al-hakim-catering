-- Tambah kolom untuk menyimpan bukti transfer penarikan komisi
ALTER TABLE commission_withdrawals
ADD COLUMN IF NOT EXISTS proof_image_url VARCHAR(255) NULL AFTER admin_notes;

-- Tambah relasi opsional ke penarikan komisi pada tabel arus kas
ALTER TABLE cash_flow_transactions
ADD COLUMN IF NOT EXISTS commission_withdrawal_id INT NULL AFTER order_id;

-- (Opsional) Index untuk mempercepat pencarian berdasarkan penarikan komisi
CREATE INDEX IF NOT EXISTS idx_cash_flow_commission_withdrawal_id
  ON cash_flow_transactions (commission_withdrawal_id);


