-- ============================================================
-- face_auth: 얼굴 등록 테이블
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

create table if not exists face_data (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  descriptor  float8[]    not null,       -- 128차원 얼굴 특징 벡터
  created_at  timestamptz default now()
);

-- 인덱스 (이름으로 조회 빠르게)
create index if not exists face_data_name_idx on face_data(name);

-- RLS 활성화 (데모용: 전체 허용 정책)
alter table face_data enable row level security;

drop policy if exists "allow_all" on face_data;
create policy "allow_all" on face_data for all using (true) with check (true);
