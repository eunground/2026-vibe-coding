## Why

학생/관리자 탭 분리(완료) 이후 남은 UI 다듬기 항목이다. DESIGN.md §7(Streamtime 영감 적용)과 §2(모션 150–250ms)를 기준으로, 화면 전환·정보 강조·빈 상태 안내의 완성도를 높인다. 세 항목 모두 CSS/JS 소폭 수정으로 동작 변경 없이 "느낌"만 개선하며, PROPOSAL.md가 명시한 대로 한 번에 묶어 배포 가능하다.

## What Changes

- **P-02 · 스캔 결과 slide-down 애니메이션**: `renderScanResult`가 대여/반납 폼을 즉시 삽입해 상태 전환이 끊겨 보인다. 결과 카드 등장에 ≤250ms slide-down 모션을 추가한다(동작은 그대로, 전환만 부드럽게).
- **P-03 · 연체 통계 숫자 강조**: 통계 그리드 4칸 숫자 크기가 동일(26px)하다. 연체 숫자만 더 크게(약 32px) 키워 시각적 우선순위를 준다(색상은 이미 빨강으로 구분됨 — 변경 없음).
- **P-04 · empty state 컴포넌트**: 빈 리스트(대여 중 목록·우산 목록·대여 기록)가 텍스트 한 줄만 표시한다. 아이콘 + 메시지 조합의 일관된 empty state로 교체한다.

## Capabilities

### New Capabilities
- `scan-result-presentation`: 우산 스캔 결과 카드의 등장 표현(slide-down 모션) 규칙. (P-02)
- `admin-stats-display`: 관리자 통계 그리드의 숫자 강조 규칙 — 연체 숫자 시각적 우선. (P-03)
- `list-empty-states`: 비어 있는 목록/표에 대한 일관된 아이콘+메시지 빈 상태 표현. (P-04)

### Modified Capabilities
<!-- 기존 living spec(admin-view-access)의 요구사항 변경 없음. -->

## Impact

- **영향 파일**: `Stylesheet.html`(slideDown 키프레임 + `.slide-down`, `.stat-overdue .stat-num` 크기, `.empty` 아이콘 간격), `JavaScript.html`(`renderScanResult`에 `slide-down` 클래스 부여, `emptyState(icon, msg)` 헬퍼 추가 및 `renderActiveList`/`renderUmbList`/`renderHistory` 적용).
- **서버(`Code.gs`) 영향 없음**, 데이터/인증 계약 무변경.
- **제약 준수**: 애니메이션 250ms 초과 금지(DESIGN §2/§8), 상태 컬러 팔레트 추가 금지(§8), 카드 중첩 금지.
- **범위 밖**: 헤더 히어로화, 하단 탭바 — 별도 변경(PROPOSAL.md 제외 항목과 동일).
