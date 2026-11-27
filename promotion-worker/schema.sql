CREATE TABLE IF NOT EXISTS codes (
  code_hash TEXT PRIMARY KEY,
  redeemed_at INTEGER,
  claim_hash TEXT
);
