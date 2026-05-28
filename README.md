# 학교 우산 대여

Vercel + Vercel Postgres로 동작하는 학교 우산 대여 웹앱입니다. `git push`만 하면 자동 배포됩니다.

## 구조

```
api/
├── status.js              GET /api/status?umbrella=N
├── rent.js                POST /api/rent
├── return.js              POST /api/return
└── admin/                 모두 x-admin-password 헤더 필요
    ├── login.js
    ├── stats.js
    ├── active.js
    ├── register.js
    ├── force-return.js
    ├── delete.js
    ├── list.js
    └── history.js
lib/
├── db.js                  @vercel/postgres 래퍼
├── auth.js                관리자 헤더 검증
└── utils.js               시간 포맷/마스킹/연체 판정
db/
└── schema.sql             테이블 + 인덱스 정의
public/
└── index.html             프론트 단일 파일 (HTML + CSS + JS)
```

## 최초 1회 설정

### 1. GitHub에 push

```bash
gh repo create umbrella-rental --private --source=. --remote=origin --push
```

(또는 GitHub.com에서 빈 repo 생성 후 `git remote add origin ...` → `git push -u origin main`)

### 2. Vercel 프로젝트 생성

1. [vercel.com/new](https://vercel.com/new) 접속
2. 방금 push한 GitHub repo 선택 → **Import**
3. 기본 설정 그대로 **Deploy**
4. 1~2분 후 배포 완료. 임시 URL이 발급되지만 아직 DB가 없어 동작 안 함 — 다음 단계 진행

### 3. Vercel Postgres 연결

1. Vercel 대시보드의 프로젝트 → **Storage** 탭
2. **Create Database → Postgres** → 이름 짓고 생성
3. **Connect Project** 클릭 → 자동으로 환경변수(`POSTGRES_URL` 등) 주입됨

### 4. 스키마 생성

Postgres 콘솔의 **Query** 탭에서 [`db/schema.sql`](db/schema.sql)의 내용을 그대로 실행.

### 5. 끝

발급된 `https://<프로젝트>.vercel.app` URL이 곧 학생용 진입점입니다.

- **학생**: `/` 또는 `/?umbrella=12` (QR 스캔)
- **관리자**: 푸터의 "관리자 로그인" 클릭 → 비밀번호 `admin1234` (또는 `lib/auth.js`의 `ADMIN_PASSWORD` 값)

> ⚠️ 관리자 비밀번호는 `lib/auth.js`에 하드코딩되어 있습니다. **repo가 private 임을 전제로 한 설계**이므로 절대 public 으로 전환하지 마세요. 노출됐다면 즉시 비밀번호 변경 + push.

## 이후 작업

코드 수정 → `git push` → 자동 배포. 끝.

```bash
# 예: 관리자 비밀번호 노출 정책 변경
git add api/admin/login.js
git commit -m "Tighten admin auth"
git push
```

Vercel이 push를 감지해 새 빌드를 만들고 무중단 배포합니다.

## 로컬 개발 (선택)

```bash
npm install
npm install -g vercel
vercel link              # Vercel 프로젝트와 연결
vercel env pull .env     # 원격 환경변수를 로컬로
vercel dev               # http://localhost:3000
```

`vercel dev`는 실제 Vercel 환경처럼 `api/*.js`를 라우팅하고 Postgres 연결도 유지합니다.

## 설정 변경

| 값 | 위치 | 변경 방법 |
| --- | --- | --- |
| 관리자 비밀번호 | `lib/auth.js`의 `ADMIN_PASSWORD` 상수 | 코드 수정 후 `git push` |
| 연체 기준 시간 | `lib/utils.js`의 `OVERDUE_HOURS` | 코드 수정 후 `git push` |
| 시간대 | `lib/utils.js`의 `TIMEZONE` | 코드 수정 후 `git push` |

## 데이터 모델

`umbrellas` 테이블:
| 컬럼 | 타입 | 비고 |
| --- | --- | --- |
| `number` | TEXT PK | 우산 번호 (사용자 노출용) |
| `name` | TEXT | 우산명 (예: "장우산") |
| `registered_at` | TIMESTAMPTZ | 자동 |

`rentals` 테이블 (append-only-ish):
| 컬럼 | 타입 | 비고 |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `umbrella_number` | TEXT FK | |
| `student_name` | TEXT | |
| `student_id` | TEXT | |
| `phone` | TEXT | |
| `rented_at` | TIMESTAMPTZ | 대여 시각 |
| `returned_at` | TIMESTAMPTZ NULL | 반납 시각 |
| `status` | TEXT | `'rented'` / `'returned'` |

**핵심 불변 조건**:
- `idx_one_active_per_umbrella` 부분 unique 인덱스가 "우산 1개에 활성 대여 1개"를 DB 차원에서 강제
- `idx_one_active_per_student` 가 "학생 1명에 활성 대여 1개"를 강제

→ Lock 없이도 race-free.

## 우산 상태 (derived)

`umbrellas`에 status 컬럼이 없습니다. 항상 `rentals` 조회로 도출:

- `available` — 해당 우산에 `status='rented'`인 행이 없음
- `rented` — 있음, 24시간 미만 경과
- `overdue` — 있음, 24시간 이상 경과

## 학생/관리자 데이터 노출 차이

| 필드 | 학생 화면 | 관리자 화면 |
| --- | --- | --- |
| 이름 | 마스킹 (홍**동) | 평문 |
| 학번 | 미노출 | 노출 |
| 전화번호 | 미노출 | 노출 |

`api/status.js`는 항상 마스킹된 이름만 반환하고 학번/전화는 응답에 포함되지 않습니다.
