CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(30) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  auth_version INTEGER NOT NULL DEFAULT 0 CHECK (auth_version >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  identifier VARCHAR(254) NOT NULL,
  url VARCHAR(2048) NOT NULL DEFAULT '',
  category VARCHAR(20) NOT NULL CHECK (category IN ('Travail', 'Perso', 'Banque')),
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  secret_iv TEXT NOT NULL CHECK (LENGTH(secret_iv) = 24),
  secret_tag TEXT NOT NULL CHECK (LENGTH(secret_tag) = 32),
  secret_data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS entries_user_id_index ON entries(user_id);
CREATE INDEX IF NOT EXISTS entries_deleted_at_index ON entries(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS app_migrations (
  name TEXT PRIMARY KEY,
  source_sha256 TEXT NOT NULL,
  users_count INTEGER NOT NULL,
  entries_count INTEGER NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
