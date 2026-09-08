PRAGMA foreign_keys = ON;
CREATE TABLE accounts (id TEXT PRIMARY KEY, workos_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('player','admin')), created_at TEXT NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, csrf_token TEXT NOT NULL, refresh_cipher TEXT NOT NULL, provider_session_id TEXT NOT NULL, refresh_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, refresh_lock INTEGER NOT NULL DEFAULT 0);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE oauth_states (state_hash TEXT PRIMARY KEY, verifier_cipher TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE campaigns (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, revision INTEGER NOT NULL CHECK(revision>0), record_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX campaigns_owner ON campaigns(account_id,updated_at);
CREATE TABLE campaign_operations (account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, operation_key TEXT NOT NULL, request_hash TEXT NOT NULL, response_json TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(account_id,operation_key));
