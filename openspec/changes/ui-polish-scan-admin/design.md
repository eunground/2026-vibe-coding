## Context

탭 분리(`admin-view-access`) 완료 후, DESIGN.md §7이 정리한 남은 다듬기 3건을 한 변경으로 처리한다. 모두 순수 프런트엔드(CSS/JS)이며 서버·데이터 흐름과 무관하다. GAS Web App이라 변경 후 새 배포 버전이 필요하다. 현재 상태: slide-down 키프레임 없음(전환이 끊김), 통계 숫자 4칸 동일 크기(26px), 빈 리스트는 텍스트 한 줄.

## Goals / Non-Goals

**Goals:**
- 스캔 결과 카드 등장에 절제된 모션(≤250ms)을 더해 전환 끊김 제거.
- 통계 그리드에서 연체 숫자를 크기로 강조해 정보 우선순위 부여.
- 세 곳의 빈 목록을 아이콘+메시지 단일 패턴으로 통일.

**Non-Goals:**
- 동작/데이터 로직 변경(대여·반납·삭제 흐름은 그대로).
- 상태 컬러 팔레트 확장, 헤더 히어로화, 하단 탭바(별도 변경).

## Decisions

**1) slide-down은 CSS 키프레임 + 클래스, JS는 클래스 부여만.**
`@keyframes slideDown`(opacity+translateY)과 `.slide-down { animation: slideDown 220ms ease }`를 추가하고, `renderScanResult`가 만드는 결과 카드 컨테이너에 `slide-down` 클래스를 더한다. 매 조회마다 `innerHTML`이 새로 그려지므로 클래스가 재부착되어 애니메이션이 다시 재생된다.
- *대안*: JS `requestAnimationFrame`/Web Animations API → 과한 복잡도. 기존 `@keyframes fade` 패턴과 일관된 CSS 방식 채택.
- duration 220ms로 §2/§8 상한(250ms) 이내.

**2) 연체 강조는 크기만, 색은 유지.**
`.stat-overdue .stat-num { font-size: 32px; font-weight: 800 }`만 추가. 색상은 이미 `var(--overdue)`로 구분돼 있어 손대지 않는다(§8 팔레트 동결, §7 "색은 이미 done").
- 480px 이하 2열 그리드에서도 32px가 레이아웃을 깨지 않는지 확인 대상.

**3) empty state는 공유 헬퍼 `emptyState(icon, msg)`로 단일화.**
`<div class="empty"><span>{icon}</span><br>{msg}</div>` 마크업을 반환하는 헬퍼를 만들고 세 렌더러에 적용한다. 기록 표는 `<tr><td colspan="6">…</td></tr>`로 감싼다. `.empty span { display:block; margin-bottom:8px }`로 아이콘 간격만 보강(기존 `.empty` 재사용).
- 아이콘: 대여 중 목록 `✅`(현재 빈=정상), 우산 목록 `☂️`, 대여 기록 `🕓`. 이모지를 아이콘 대용으로만 쓰는 §2 규칙 준수.

## Risks / Trade-offs

- **[애니메이션이 거슬리거나 느림]** → 220ms 단일 ease, 등장에만 적용. 재조회 시 깜빡임이 과하면 duration 하향 조정으로 완화.
- **[연체 32px가 모바일 2열에서 줄바꿈/오버플로]** → 배포 검증(P-03)에서 480px 폭 확인, 필요 시 `line-height`/패딩 미세 조정.
- **[empty 아이콘이 로딩 중 상태로 오인]** → 로딩은 overlay 스피너가 담당하고 empty는 데이터 0건일 때만 렌더되므로 의미가 분리됨(§7 주석과 동일).
- **[배포 누락]** → CSS/JS만 바뀌어도 GAS는 새 배포 버전이 있어야 `/exec`에 반영. 배포 후 검증 필요.

## Migration Plan

세 항목은 독립적이라 한 번에 적용 후 단일 배포로 검증한다(P-02 스캔 탭, P-03 현황 탭, P-04 세 목록). 롤백은 직전 배포 버전으로 복귀. 데이터 마이그레이션 없음.
