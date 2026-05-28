-- 학교 우산 대여 웹앱 — Postgres 스키마
-- Vercel Postgres / Neon 콘솔의 SQL Editor에서 한 번 실행

CREATE TABLE IF NOT EXISTS umbrellas (
  number        TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rentals (
  id              BIGSERIAL   PRIMARY KEY,
  umbrella_number TEXT        NOT NULL REFERENCES umbrellas(number) ON DELETE RESTRICT,
  student_name    TEXT        NOT NULL,
  student_id      TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  rented_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at     TIMESTAMPTZ,
  status          TEXT        NOT NULL DEFAULT 'rented' CHECK (status IN ('rented', 'returned'))
);

-- 우산 1개 ↔ 활성 대여 1개를 DB 차원에서 보장 (race 안전)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_per_umbrella
  ON rentals (umbrella_number) WHERE status = 'rented';

-- 학생 1명 ↔ 활성 대여 1개를 DB 차원에서 보장
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_per_student
  ON rentals (student_id) WHERE status = 'rented';

-- 기록 조회 (최신순)
CREATE INDEX IF NOT EXISTS idx_rentals_rented_at ON rentals (rented_at DESC);
