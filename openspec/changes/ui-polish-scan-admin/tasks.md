# Tasks

## 1. P-02 · 스캔 결과 slide-down 애니메이션

- [ ] 1.1 `Stylesheet.html`에 `@keyframes slideDown`(opacity 0→1, translateY -8px→0)과 `.slide-down { animation: slideDown 220ms ease }` 추가
- [ ] 1.2 `JavaScript.html` `renderScanResult`의 결과 카드 컨테이너 className에 `slide-down` 부여 (미등록/가용/대여중·연체 분기 모두)

## 2. P-03 · 연체 통계 숫자 강조

- [ ] 2.1 `Stylesheet.html` `.stat-overdue .stat-num`에 `font-size: 32px; font-weight: 800` 추가 (색상은 기존 유지)

## 3. P-04 · empty state 컴포넌트

- [ ] 3.1 `JavaScript.html`에 `emptyState(icon, msg)` 헬퍼 추가 (`<div class="empty"><span>{icon}</span><br>{msg}</div>` 반환)
- [ ] 3.2 `renderActiveList` 빈 분기 → `emptyState('✅', '현재 대여 중인 우산이 없어요')`
- [ ] 3.3 `renderUmbList` 빈 분기 → `emptyState('☂️', '등록된 우산이 없어요')`
- [ ] 3.4 `renderHistory` 빈 분기 → `<tr><td colspan="6">` + `emptyState('🕓', '대여 기록이 없어요')` + `</td></tr>`
- [ ] 3.5 `Stylesheet.html` `.empty span { display:block; margin-bottom:8px }` 추가

## 4. 검증 (배포 후)

- [ ] 4.1 스캔 탭: 번호 조회 시 결과 카드가 220ms slide-down으로 등장, 재조회 시 재생 확인
- [ ] 4.2 현황 탭: 연체 숫자가 나머지 3개보다 크게 보이고 색은 빨강 유지, 480px 폭에서 레이아웃 정상 확인
- [ ] 4.3 세 목록 모두 비었을 때 아이콘+메시지 empty state 표시 확인
- [ ] 4.4 애니메이션 250ms 이내, 상태 컬러 추가 없음(DESIGN §8) 확인
