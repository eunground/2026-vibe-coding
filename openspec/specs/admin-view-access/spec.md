# admin-view-access Specification

## Purpose
TBD - created by archiving change separate-student-admin-views. Update Purpose after archive.
## Requirements
### Requirement: 미로그인 학생에게는 공개 뷰만 노출
시스템은 관리자 로그인 전 상태에서 학생용 공개 뷰(`scan` 탭)만 노출해야 한다(SHALL). 관리자 전용 탭(`status`·`manage`·`history`)은 숨겨져야 한다(MUST).

#### Scenario: 첫 로드 시 탭 가시성
- **WHEN** 사용자가 로그인하지 않은 상태로 페이지를 처음 연다
- **THEN** `scan` 탭만 보이고 `status`·`manage`·`history` 탭은 보이지 않는다

#### Scenario: QR 딥링크 진입
- **WHEN** `?umbrella=<n>` 파라미터로 진입하여 자동 조회가 실행된다
- **THEN** 화면은 `scan` 탭에 머물고 관리자 탭은 여전히 숨겨져 있다

### Requirement: 관리자 진입점은 푸터 단일 링크로 분리
시스템은 관리자 진입점을 푸터의 절제된 "관리자 로그인" 링크 한 곳으로 제공해야 한다(SHALL). 탭바에 관리자 진입 버튼을 노출하지 않는다(MUST NOT).

#### Scenario: 미로그인 상태의 진입점
- **WHEN** 사용자가 로그인하지 않은 상태다
- **THEN** 푸터에 "관리자 로그인" 링크가 보인다

#### Scenario: 진입점 클릭
- **WHEN** 사용자가 푸터의 "관리자 로그인" 링크를 누른다
- **THEN** 시스템은 관리자 로그인 화면을 표시한다

### Requirement: 로그인 성공 시 관리자 뷰 노출
시스템은 관리자 로그인이 성공하면 관리자 전용 탭 3개(`status`·`manage`·`history`)를 노출하고 푸터의 관리자 진입 링크를 숨겨야 한다(SHALL). 로그인 직후 기본 진입 탭은 `status`다.

#### Scenario: 로그인 성공
- **WHEN** 올바른 관리자 비밀번호로 로그인에 성공한다
- **THEN** `scan`을 포함한 4개 탭이 모두 보이고, 화면은 `status` 탭으로 이동하며, 푸터의 "관리자 로그인" 링크는 숨겨진다

#### Scenario: 로그인 실패
- **WHEN** 잘못된 비밀번호로 로그인을 시도한다
- **THEN** 관리자 탭은 노출되지 않고 로그인 화면에 오류 메시지가 표시된다

### Requirement: 로그아웃·인증 실패 시 학생 모드로 복귀
시스템은 로그아웃하거나 관리자 호출이 인증 실패를 반환하면 관리자 상태를 해제하고 학생 모드(관리자 탭 숨김, `scan` 탭 단독)로 되돌려야 한다(SHALL). 보관 중이던 관리자 비밀번호는 메모리에서 제거되어야 한다(MUST).

#### Scenario: 로그아웃
- **WHEN** 관리자가 로그아웃을 누른다
- **THEN** 관리자 탭이 다시 숨겨지고 화면은 `scan` 탭으로 이동하며 푸터의 "관리자 로그인" 링크가 다시 보인다

#### Scenario: 인증 만료/실패
- **WHEN** 관리자 데이터 요청이 인증 실패(`ok:false`)를 반환한다
- **THEN** 시스템은 관리자 상태를 해제하고 학생 모드로 복귀하며 안내 토스트를 표시한다

### Requirement: 가시성은 서버 권한 검증을 대체하지 않음
탭 숨김은 UX 레이어이며 보안 경계가 아니다. 모든 관리자 서버 함수는 매 호출 시 전달된 비밀번호를 `checkAdmin_`로 재검증해야 한다(MUST). 검증 실패 시 데이터를 반환하지 않고 `{ ok:false }`를 반환해야 한다(SHALL).

#### Scenario: 숨긴 탭의 동작을 직접 호출
- **WHEN** 유효한 관리자 비밀번호 없이 관리자 서버 함수가 호출된다
- **THEN** 서버는 데이터를 반환하지 않고 `{ ok:false }`를 반환하며, 클라이언트는 학생 모드로 복귀한다

