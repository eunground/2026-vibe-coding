# Implementation Proposal — UI 개선 (design.md §7 기반)

> 기준 문서: [design.md](design.md)  
> 대상 파일: `Index.html`, `Stylesheet.html`, `JavaScript.html`  
> 배포 방법: GAS Web App — 변경 후 새 배포 버전 필요

---

## P-01 · 학생/관리자 탭 분리 (우선순위: 상)

### 문제
현재 탭 4개(스캔·현황·관리·기록)가 로그인 전에도 모두 보인다.  
학생이 관리자 탭을 누르면 비밀번호 입력 화면이 뜨지만, 탭 존재 자체가 UX 노이즈다.

### 변경 범위

**Index.html**
- `<nav class="tabs">` 안에서 관리자 탭 3개(`status`, `manage`, `history`)에  
  `data-admin="true"` 속성 추가 (숨김/노출 JS 제어 기준)
- `<footer class="app-footer">` 에 관리자 진입 링크 추가:
  ```html
  <button class="btn-text" id="adminEntryBtn">관리자 로그인</button>
  ```

**JavaScript.html**
- 초기 로드 시 `[data-admin="true"]` 탭을 `display:none` 처리
- `adminEntryBtn` 클릭 → `switchTab('status')` 호출 (기존 로그인 게이트 활용)
- 관리자 로그인 성공 시(`adminPassword` 세팅 후) 탭 다시 노출

**Stylesheet.html**
- `.tab[data-admin]` hidden 상태에서도 `tabs` flex 레이아웃이 깨지지 않도록 확인  
  (`flex: 1 0 auto` 유지, display:none이면 자동으로 빠짐)

### 완료 기준
- 미로그인: 탭 1개(스캔)만 보임, 푸터에 "관리자 로그인" 버튼
- 로그인 후: 탭 4개 전부 보임
- 로그아웃 후: 탭 다시 1개로 복귀

---

## P-02 · 대여 폼 slide-down 애니메이션 (우선순위: 중)

### 문제
`renderScanResult`가 대여 폼을 즉시 DOM에 삽입해 상태 전환이 툭 잘린다.  
design.md §2 "모션 150-250ms" 기준 미달.

### 변경 범위

**Stylesheet.html** — 새 키프레임 추가
```css
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: none; }
}
.slide-down { animation: slideDown 220ms ease; }
```

**JavaScript.html**
- `renderScanResult` 내부에서 폼 컨테이너 div 생성 시  
  `className`에 `slide-down` 추가 (기존 로직 최소 변경)

### 완료 기준
- 우산 번호 조회 후 결과 카드가 220ms slide-down으로 등장
- 재조회 시 이전 결과 제거 후 다시 애니메이션

---

## P-03 · 연체 숫자 크기 강조 (우선순위: 하)

### 문제
통계 그리드 4칸이 모두 동일 크기(`26px`). design.md §7: "연체 숫자만 더 크게".

### 변경 범위

**Stylesheet.html**
```css
.stat-overdue .stat-num {
  font-size: 32px;   /* 기존 26px → 32px */
  font-weight: 800;  /* 이미 800이지만 명시적 유지 */
}
```

### 완료 기준
- 연체 숫자가 나머지 3개 숫자보다 시각적으로 더 크게 보임
- 색상 변경 없음 (이미 빨강으로 구분됨)

---

## P-04 · Empty state 컴포넌트 (우선순위: 하)

### 문제
빈 리스트(`activeList`, `umbList`, `historyBody`)가 아무것도 표시하지 않거나  
텍스트 한 줄만 표시한다. 학생/교사가 "정상 상태인지 로딩 중인지" 구분이 어렵다.

### 변경 범위

**JavaScript.html** — 헬퍼 함수 추가
```js
function emptyState(icon, msg) {
  return `<div class="empty"><span style="font-size:32px">${icon}</span><br>${msg}</div>`;
}
```

적용 위치:
- `activeList` 비었을 때: `emptyState('✅', '현재 대여 중인 우산이 없어요')`
- `umbList` 비었을 때: `emptyState('☂️', '등록된 우산이 없어요')`
- `historyBody` 비었을 때: `<tr><td colspan="6">` + `emptyState('🕓', '대여 기록이 없어요')` + `</td></tr>`

**Stylesheet.html** — 기존 `.empty` 에 아이콘 간격 추가
```css
.empty span { display: block; margin-bottom: 8px; }
```

### 완료 기준
- 세 리스트 모두 비었을 때 아이콘 + 메시지 표시
- 로딩 후 데이터 없음과 "아직 로딩 중" 상태 구분 가능 (overlay spinner가 담당)

---

## 구현 순서 및 체크리스트

```
[ ] P-01: 탭 분리 (Index.html + JavaScript.html)
[ ] P-02: slide-down 애니메이션 (Stylesheet.html + JavaScript.html)
[ ] P-03: 연체 숫자 강조 (Stylesheet.html)
[ ] P-04: empty state (JavaScript.html + Stylesheet.html)
```

P-01이 가장 구조 변경이 크므로 단독으로 먼저 배포 검증 권장.  
P-02~04는 CSS/JS 소폭 수정으로 한 번에 묶어 배포 가능.

---

## 제외 항목 (이번 proposal 범위 밖)

| 항목 | 이유 |
|---|---|
| 헤더 히어로 영역화 | 탭 분리(P-01) 완료 후 화면 구조 재검토 필요 |
| 하단 탭바(bottom nav) | 레이아웃 대규모 변경 — 별도 proposal로 |
