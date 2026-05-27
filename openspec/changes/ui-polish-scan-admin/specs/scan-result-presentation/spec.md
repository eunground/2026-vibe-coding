## ADDED Requirements

### Requirement: 스캔 결과 카드는 slide-down 모션으로 등장
시스템은 우산 스캔(조회) 결과 카드를 표시할 때 250ms 이하의 slide-down 애니메이션으로 등장시켜야 한다(SHALL). 애니메이션은 등장 표현일 뿐이며 대여/반납 동작이나 입력 흐름을 변경하지 않는다(MUST NOT).

#### Scenario: 조회 결과 등장
- **WHEN** 학생이 우산 번호를 조회해 결과 카드가 렌더된다
- **THEN** 결과 카드가 250ms 이하의 slide-down(투명도+아래로 이동) 애니메이션으로 나타난다

#### Scenario: 재조회 시 재생
- **WHEN** 같은 화면에서 다른 번호를 다시 조회한다
- **THEN** 이전 결과가 교체되고 새 결과 카드가 다시 slide-down으로 나타난다
