# PRD v4.1: 약학대학 병원실습 대비 Pure EMR 시뮬레이터

문서 목적: 기존 `OSCE-main' 프로젝트와 v4.0 PRD를 기반으로, 학생 화면에서는 **교수자 guide·답안·힌트 없이 순수 EMR처럼 보이게 하되**, 실제 EMR의 품질을 높이기 위해 **Lab 참고치/이상치 강조, 약물식별, Medication Reconciliation, 처방오더, MAR 메뉴**를 다시 포함하는 최종 보강 요구사항을 정의한다.

작성 방향: 원래 케이스의 문장, 수치, 진단명, 약물명, 용량, 날짜는 훼손하지 않는다. 다만 실제 EMR에서 자연스럽게 제공되는 “표시 보조 정보”는 별도 레이어로 추가한다.

---

## 0. v4.1 핵심 결정

### 0.1 최종 제품 방향

제품은 여전히 **Pure EMR**이다. 학생에게 보이는 화면에는 OSCE, 정답, 루브릭, 교수자 guide, 평가 포인트, 힌트가 나오지 않는다.

다만 v4.0의 “임의 보완 금지” 원칙을 너무 엄격하게 적용하면 실제 EMR의 밀도와 임상적 탐색감이 부족해진다. 따라서 v4.1에서는 원자료를 수정하지 않는 범위에서 다음을 허용한다.

- Lab 참고치와 H/L flag를 일반 성인 기준 또는 기관별 reference master로 표시한다.
- 기존약과 퇴원약을 비교해 Medication Reconciliation 표를 만든다.
- 퇴원약 목록을 처방오더 화면 형태로 재구성한다.
- 약물식별 메뉴를 유지하되, 외형 정보가 없으면 빈칸으로 둔다.
- MAR 메뉴를 유지하되, 실제 투약시각 원자료가 없으면 빈 상태로 보여준다.
- 환자 타임라인은 원자료의 날짜와 기록을 기반으로 만든다.

### 0.2 학생 화면에서 유지할 금지 항목

학생 화면에는 다음 표현이 노출되지 않는다.

```text
OSCE 정답
학생 답안
제출하기
채점
루브릭
교수자 가이드
학습목표
평가 포인트
힌트
```

제품 내부의 데이터 설계 문서나 개발용 파일에는 관리 목적으로 사용할 수 있으나, UI에서는 사용하지 않는다.

### 0.3 v4.0에서 v4.1로 바뀐 점

| 영역 | v4.0 | v4.1 |
|---|---|---|
| 교수 guide | 없음 | 없음 유지 |
| 학생 답안 제출 | 없음 | 없음 유지 |
| Lab flag | 원자료 또는 병원 기준 있을 때만 | 일반 성인 reference master 허용 |
| 기준치 | 비워둠 가능 | 기본 reference master 제공 |
| 약물식별 | 원자료 없으면 빈칸 | 메뉴 유지, 약명 기반 row 생성 가능 |
| 처방오더 | 원자료 없으면 빈칸 | 퇴원약/입원약을 오더 형태로 변환 가능 |
| MAR | 원자료 없으면 빈칸 | 메뉴 유지, 실제 투약시각 없으면 빈 상태 |
| 보강 방식 | 매우 보수적 | 원자료 보존 + 표시 보강 레이어 |

---

# 1. 제품 정의

## 1.1 제품 한 문장 정의

> 약학대학 학생이 병원실습 전 실제 병원 EMR을 보는 것처럼 환자 기본정보, 진료기록, 진단 타임라인, 검사결과, 영상검사, 기존약, 약물식별, 처방오더, 투약기록을 탐색하는 Pure EMR 시뮬레이터.

## 1.2 제품이 주는 경험

학생은 “문제풀이 사이트”가 아니라 “환자 차트”를 본다고 느껴야 한다. 정보는 한 화면에 친절하게 요약되어 있지 않고, 실제 EMR처럼 여러 메뉴에 흩어져 있어야 한다.

학생은 직접 다음 흐름을 따라가게 된다.

1. 환자 기본정보와 입원경위를 확인한다.
2. CC/HPI와 응급실 기록을 본다.
3. Vital과 Lab trend를 비교한다.
4. 영상/진단검사와 Problem List를 연결한다.
5. 기존약과 퇴원약을 비교한다.
6. 처방오더와 MAR 메뉴를 탐색한다.
7. 약물 관련 판단은 시연 중 말로 설명한다.

---

# 2. 데이터 원칙

## 2.1 원자료 보존 원칙

원자료는 절대 수정하지 않는다.

```text
원자료의 진단명 → 그대로 저장
원자료의 약물명 → 그대로 저장
원자료의 용량/용법 → 그대로 저장
원자료의 날짜/시간 → 그대로 저장
원자료의 환자 발언 → 그대로 저장
원자료에 없는 발언 → 생성하지 않음
원자료에 없는 투약시각 → 생성하지 않음
```

## 2.2 표시 보강 레이어 허용 원칙

v4.1에서는 원자료와 별개로 **display augmentation layer**를 둔다.

이 레이어는 원자료의 내용을 바꾸지 않고, 실제 EMR처럼 보이도록 화면 표시를 돕는다.

허용되는 보강은 다음과 같다.

```text
- Lab 참고범위와 H/L flag 계산
- Vital sign 비정상 표시
- 검사값 trend arrow 표시
- 기존약/퇴원약 간 continued/new/stopped 관계 표시
- 퇴원약 목록을 처방오더 테이블로 변환
- 원자료 약물명을 약물식별 메뉴 row로 표시
- 기록 날짜를 이용한 전체 타임라인 구성
- 원자료 미기재 메뉴를 빈 상태로 표시
```

허용되지 않는 보강은 다음과 같다.

```text
- 원자료에 없는 진단명 추가
- 원자료에 없는 검사값 추가
- 원자료에 없는 약물 추가
- 원자료 약물 용량/빈도 수정
- 원자료에 없는 투약시각 생성
- 원자료에 없는 환자 발언 생성
- 교수자 해설 또는 정답을 학생 화면에 표시
```

## 2.3 sourceLevel 필드

모든 데이터에는 가능한 한 `sourceLevel`을 붙인다.

```json
{
  "sourceLevel": "original"
}
```

권장 값은 다음과 같다.

| sourceLevel | 의미 |
|---|---|
| `original` | 원자료에 직접 기재됨 |
| `derived_from_original` | 원자료 간 관계를 재구성함 |
| `education_general_reference` | 교육용 일반 기준치로 표시함 |
| `empty_not_provided` | 메뉴는 있으나 원자료 미기재 |
| `builder_added_confirmed` | 제작자가 추후 명시적으로 보완함 |

학생 UI에는 `sourceLevel`을 그대로 노출하지 않아도 된다. 개발자와 케이스 제작자가 데이터 출처를 관리하기 위한 필드다.

---

# 3. Lab Results 요구사항

## 3.1 Lab 화면 목표

Lab 화면은 실제 EMR처럼 **검사항목 x 검사일자 pivot table** 형태여야 한다.

권장 화면 구조:

```text
검사명 | 단위 | 참고치 | 2026-05-16 입원 당시 | 2026-05-18 퇴원 당일 | Trend
Na     | mEq/L | 135-145 | 134 L | 136 | ↑
BUN    | mg/dL | 6-20    | 22 H  | 26 H | ↑
Uric acid | mg/dL | M 3.7-8.0 | 9.7 H | 9.4 H | ↓
```

## 3.2 Lab flag 규칙

Lab flag는 다음 순서로 결정한다.

1. 원자료에 H/L flag가 있으면 그대로 사용한다.
2. 병원별 reference master가 있으면 그 기준으로 계산한다.
3. 병원별 기준이 없으면 교육용 일반 성인 reference master를 사용한다.
4. 어떤 기준도 없으면 flag를 표시하지 않는다.

## 3.3 Lab flag 표시 방식

화면에는 다음처럼 표시한다.

```text
L  : 기준보다 낮음
H  : 기준보다 높음
LL : 매우 낮음 또는 critical low
HH : 매우 높음 또는 critical high
N  : 정상범위, 화면에서는 생략 가능
```

색상은 실제 EMR 느낌을 위해 과하지 않게 사용한다.

```text
H/L: 옅은 노란색 또는 주황색 배경
HH/LL: 옅은 붉은색 배경
정상: 흰색 또는 기본 행 배경
```

## 3.4 참고범위 master 구조

```json
{
  "version": "general-adult-reference-v1",
  "items": {
    "Na": {
      "unit": "mEq/L",
      "refLow": 135,
      "refHigh": 145,
      "referenceText": "135-145 mEq/L"
    },
    "BUN": {
      "unit": "mg/dL",
      "refLow": 6,
      "refHigh": 20,
      "referenceText": "6-20 mg/dL"
    }
  }
}
```

## 3.5 환자B Lab 표시 예시

환자B 원자료에는 입원 당시와 퇴원 당일 Lab이 제공되어 있다. 원자료 수치 자체는 그대로 보존한다.

v4.1에서는 일반 reference master를 이용해 다음처럼 표시할 수 있다.

| 항목 | 입원 당시 | 퇴원 당일 |
|---|---:|---:|
| Na | 134 L | 136 |
| BUN | 22 H | 26 H |
| Uric acid | 9.7 H | 9.4 H |
| NT-proBNP | 4,860 H | 2,910 H |
| LDL-C | 138 H |  |

이 표시는 원자료를 바꾸는 것이 아니라, EMR 화면에서 참고치를 기준으로 표시하는 것이다.

---

# 4. Vital Signs 요구사항

## 4.1 Vital 화면 목표

Vital Signs는 시간순 trend로 보여야 한다.

표시 항목:

```text
BP
HR
RR
BT
SpO₂
O₂ device
Body weight
```

환자B 예시:

```text
2026-05-16 입원 당시
BP 172/104, HR 110, RR 28, BT 37.0, SpO₂ 89% RA, BW 86.4 kg

2026-05-18 퇴원 당일
BP 128/78, HR 84, RR 18, BT 36.7, SpO₂ 96% RA, BW 83.8 kg
```

## 4.2 Vital flag

Vital도 Lab처럼 표시 보조 flag를 사용할 수 있다.

```json
{
  "systolicBP": 172,
  "diastolicBP": 104,
  "bpFlag": "H",
  "heartRate": 110,
  "heartRateFlag": "H",
  "spo2": 89,
  "spo2Flag": "L"
}
```

단, Vital 기준은 케이스별로 민감하게 달라질 수 있으므로 PRD 수준에서는 `vitalReferenceProfile`을 별도 설정값으로 둔다.

---

# 5. 약물 관련 EMR 메뉴 요구사항

약학대학 학생에게 실제 EMR 느낌을 주려면 약물 메뉴가 단순한 “약 목록”으로 끝나면 안 된다. 다음 5개 메뉴를 유지한다.

```text
1. 기존 복용약/Home Medications
2. 약물 식별/Medication Identification
3. Medication Reconciliation
4. 처방약물/Medication Orders
5. 투약기록/MAR
6. 퇴원약/Discharge Medications
```

## 5.1 기존 복용약/Home Medications

원자료에 기재된 입원 전 복용약을 그대로 표시한다.

필드:

```text
약물명
용량
투여경로
빈도
복용시간
적응증
복약순응도
마지막 복용일시
비고
```

원자료에 없는 항목은 빈칸으로 둔다.

## 5.2 약물 식별/Medication Identification

약물식별 메뉴는 반드시 존재해야 한다.

원자료에 지참약 외형, 알약 색상, 모양, 식별문자 등이 있으면 표시한다. 원자료에 없으면 약물명 기반 row만 만들고 외형정보는 빈칸으로 둔다.

예시:

```text
보고 약물명 | 식별 결과 | 함량 | 외형 | 처방목록 일치 | 확인상태
Amlodipine | Amlodipine | 5 mg | 미기재 | 예 | 외형 원자료 미기재
```

이 구조는 실제 EMR의 “지참약 식별” 화면과 유사하게 보이지만, 원자료에 없는 외형정보를 창작하지 않는다.

## 5.3 Medication Reconciliation

Medication Reconciliation은 원자료의 기존약과 퇴원약을 비교해 표시한다.

관계는 다음처럼 표현한다.

```text
continued: 기존약과 퇴원약에 모두 있음
new_on_discharge: 퇴원약에 새로 등장
not_on_discharge_list: 기존약에 있으나 퇴원약 목록에는 없음
changed: 같은 약물이지만 용량/빈도 변경
unknown: 판단 불가
```

환자B 예시:

```text
Amlodipine: continued
Hydrochlorothiazide: continued
Ramipril: continued
Atorvastatin: continued
Carvedilol: new_on_discharge
Furosemide: new_on_discharge
Colchicine: new_on_discharge
```

이 정보는 원자료의 약 목록을 비교한 결과이며, 새로운 임상 사실을 추가하는 것이 아니다.

## 5.4 처방약물/Medication Orders

처방약물 화면은 실제 EMR처럼 오더 형태로 보여야 한다.

필드:

```text
오더ID
오더일
오더구분
약물명
용량
투여경로
빈도
기간
상태
처방의
비고
```

퇴원약 목록이 원자료에 있으면 `orderType: discharge`로 변환해 표시한다.

예시:

```json
{
  "orderId": "DC-001",
  "orderDate": "2026-05-18",
  "orderType": "discharge",
  "drugName": "Ramipril",
  "dose": "5 mg",
  "route": "PO",
  "frequency": "qd",
  "status": "active_on_discharge",
  "sourceLevel": "derived_from_discharge_medications"
}
```

## 5.5 투약기록/MAR

MAR 메뉴도 유지한다. 실제 투약시각 자료가 있으면 시간별 투약기록을 표시한다.

필드:

```text
투약일시
약물명
용량
경로
예정/실투약
투약상태
투약자
미투약 사유
비고
```

원자료에 MAR이 없으면 빈 상태로 표시한다.

```text
입원 중 실제 투약시각/MAR 원자료 미기재
```

중요한 점은 MAR을 없애지 않는 것이다. 실제 EMR에서는 탭이 존재하되 기록이 없거나 조회 조건에 따라 비어 있는 화면이 자주 보이기 때문이다.

## 5.6 퇴원약/Discharge Medications

퇴원약은 처방오더와 별도로 환자 퇴원 시점의 약물 목록으로 표시한다.

필드:

```text
약물명
용량
투여경로
빈도
기간
기존약 대비 변화
복약설명 메모
```

---

# 6. 진료기록과 타임라인 요구사항

## 6.1 전체 타임라인

원자료에 날짜/시간이 있는 이벤트는 전체 타임라인에 자동 배치한다.

환자B의 경우 다음 기록이 타임라인에 들어간다.

```text
2026-05-16 21:10 간호기록: 급성 호흡곤란, SpO₂ 89% RA
2026-05-17 08:45 간호기록: 호흡곤란 호전, 하지부종 감소
2026-05-18 07:50 간호기록: 우측 1st MTP 통증, gout flare 의심
2026-05-18 10:40 퇴원계획: HFrEF discharge medication review 필요
```

타임라인은 정보를 친절하게 해석해주는 도구가 아니라, 실제 EMR처럼 기록을 시간순으로 보여주는 도구다.

## 6.2 진단명/Problem List

Problem List는 원자료에 있는 그대로 표시한다.

환자B Problem List:

```text
1. Acute decompensated heart failure on HFrEF
2. Hypertension, previously uncontrolled
3. Dyslipidemia
4. Acute gout flare, right 1st MTP
5. Medication nonadherence suspected
```

추가 진단명을 임의로 넣지 않는다.

## 6.3 진단 타임라인

원자료에 R/O, suspected, confirmed, resolved 등의 시간 흐름이 있으면 진단 타임라인을 만든다. 원자료에 없으면 빈 상태로 둔다.

다만 원자료에 `suspected`라는 표현이 직접 있으면 해당 상태는 사용할 수 있다.

---

# 7. 화면 구조 요구사항

## 7.1 상단 환자 배너

상단 배너는 항상 고정한다.

표시 항목:

```text
환자명
성별/나이
생년월일
병록번호
진료과
병동
입원일
퇴원예정일
알레르기
보험
```

환자B 예시:

```text
김영수 | M/56 | 1970-02-15 | 순환기내과 | 순환기내과 병동 | 입원 2026-05-16 | 퇴원예정 2026-05-18 | NKDA
```

## 7.2 안전/주의 배지

상단에는 실제 EMR처럼 주의 배지를 표시할 수 있다.

허용되는 배지는 원자료 또는 Lab flag에서 파생된 것만 사용한다.

환자B 예시:

```text
NKDA
HFrEF
NT-proBNP 상승
고요산혈증
복약불이행 의심
```

배지는 학생에게 정답을 알려주는 문구가 아니라, EMR에서 흔히 보이는 alert/flag 형태로 표현한다.

## 7.3 좌측 메뉴

권장 메뉴:

```text
환자 요약
기본정보/병원기록
전체 타임라인
CC/HPI/ROS
응급실 기록
입원기록/경과기록
간호일지
퇴원계획
진단명/Problem List
과거력
사회력
가족력
Vital Signs
Lab Results
영상/진단검사
기존 복용약
약물 식별
Medication Reconciliation
처방약물/Orders
투약기록/MAR
퇴원약
약사 검토 요청
```

## 7.4 우측 패널

우측에는 작은 요약 패널을 둘 수 있다.

단, 요약 패널은 정답이나 힌트가 아니라 EMR에서 흔히 제공되는 chart summary여야 한다.

허용:

```text
최근 Vital
최근 Lab 이상치 개수
활성 Problem 수
활성 퇴원약 수
Allergy
입원/퇴원 예정일
```

금지:

```text
이 케이스에서 찾아야 할 문제
학생이 놓치기 쉬운 포인트
정답 후보
교수자 질문
```

---

# 8. 데이터 스키마 v4.1

## 8.1 최상위 구조

```json
{
  "schemaVersion": "4.1",
  "caseMeta": {},
  "dataPolicy": {},
  "patientHeader": {},
  "hospitalRecord": {},
  "clinicalRecords": {},
  "timeline": [],
  "problemList": [],
  "diagnosisTimeline": [],
  "pastMedicalHistory": [],
  "socialHistory": {},
  "familyHistory": [],
  "hpi": {},
  "vitalSigns": [],
  "labResults": [],
  "diagnosticTests": [],
  "homeMedications": [],
  "medicationIdentification": [],
  "medicationReconciliation": [],
  "medicationOrders": [],
  "medicationAdministrationRecords": {},
  "dischargeMedications": [],
  "pharmacyReviewRequests": [],
  "displayPolicy": {}
}
```

## 8.2 displayPolicy

```json
{
  "showEducationTerms": false,
  "showInstructorGuide": false,
  "showAnswerSubmission": false,
  "showLabFlags": true,
  "showReferenceRanges": true,
  "showDerivedMedicationReconciliation": true,
  "showEmptyEmrModules": true,
  "emptyStateText": "원자료 미기재"
}
```

## 8.3 labResults 필드

```json
{
  "date": "2026-05-16",
  "label": "입원 당시",
  "category": "Chemistry",
  "item": "BUN",
  "result": 22,
  "displayResult": "22",
  "unit": "mg/dL",
  "refLow": 6,
  "refHigh": 20,
  "referenceText": "6-20 mg/dL",
  "flag": "H",
  "flagSource": "education_general_reference",
  "referenceProfileVersion": "general-adult-reference-v1",
  "sourceLevel": "original_value_with_reference_flag"
}
```

## 8.4 medicationOrders 필드

```json
{
  "orderId": "DC-001",
  "orderDate": "2026-05-18",
  "orderType": "discharge",
  "drugName": "Ramipril",
  "dose": "5 mg",
  "route": "PO",
  "frequency": "qd",
  "duration": "",
  "status": "active_on_discharge",
  "prescriber": "",
  "sourceLevel": "derived_from_discharge_medications"
}
```

## 8.5 medicationAdministrationRecords 필드

```json
{
  "status": "no_source_data",
  "sourceLevel": "empty_not_provided",
  "displayMessage": "입원 중 실제 투약시각/MAR 원자료 미기재",
  "records": []
}
```

---

# 9. 환자B 적용 방향

환자B 케이스는 원자료 기준으로 다음 정보가 존재한다.

```text
- 기본정보: 김영수, M/56, 생년월일, 입원일, 퇴원예정일, 진료과, 병동, 보험, 알레르기, 결혼상태, 거주지
- CC: 갑작스러운 호흡곤란 및 식은땀
- 입원경위: 119 통해 응급실 내원 후 입원
- Problem List: HFrEF, HTN, Dyslipidemia, acute gout flare, medication nonadherence suspected
- PMH: HTN, Dyslipidemia, HF-related symptoms, gout 과거 진단력 없음
- Social/Family history 일부
- HPI
- Vital Signs
- Lab Findings
- Imaging/Diagnostic Tests
- Home Medications
- Discharge Medications
- Nursing Notes
- Discharge Planning Note
- Pharmacist Review Request
```

v4.1에서 추가로 표시할 수 있는 보강은 다음이다.

```text
- Lab 참고치와 H/L flag
- Vital abnormal marker
- 안전/주의 배지
- 기존약과 퇴원약의 reconciliation 상태
- 퇴원약 기반 discharge order table
- 약물식별 메뉴의 약명 기반 row
- MAR 빈 상태 화면
- 전체 타임라인
```

이 보강은 원자료를 바꾸지 않는다. 학생 화면에서 더 실제 EMR처럼 보이게 하기 위한 표시 레이어다.

---

# 10. 기존 프로젝트 수정 요구사항

## 10.1 파일 구조

권장 구조:

```text
OSCE-main/
├─ index.html
├─ style.css
├─ script.js
├─ data/
│  ├─ patients/
│  │  ├─ P001.json
│  │  ├─ P002.json
│  │  ├─ P003.json
│  │  ├─ P004.json
│  │  └─ patient-b.json
│  ├─ reference/
│  │  ├─ lab_reference_master_general_v1.json
│  │  └─ vital_reference_profile_general_v1.json
│  └─ schema/
│     └─ pure_emr_schema_v4_1.json
└─ docs/
   └─ Pharm_EMR_PureEMR_PRD_v4_1.md
```

## 10.2 script.js 리팩터링 방향

현재 `script.js`는 환자 조회와 화면 렌더링이 한 파일에 집중되어 있다. v4.1에서는 기능별 함수를 분리한다.

```text
loadPatient(patientId)
renderPatientBanner(patient)
renderSafetyBadges(patient)
renderTimeline(patient.timeline)
renderVitals(patient.vitalSigns)
renderLabPivot(patient.labResults, labReferenceMaster)
renderHomeMedications(patient.homeMedications)
renderMedicationIdentification(patient.medicationIdentification)
renderMedicationReconciliation(patient.medicationReconciliation)
renderMedicationOrders(patient.medicationOrders)
renderMAR(patient.medicationAdministrationRecords)
renderDischargeMedications(patient.dischargeMedications)
```

## 10.3 Lab renderer 요구사항

Lab renderer는 다음을 수행한다.

```text
1. labResults 배열을 검사명 기준으로 그룹화
2. 날짜/라벨 기준으로 column 생성
3. referenceText 표시
4. flag 값에 따라 CSS class 부여
5. 이전 날짜 대비 trend arrow 계산
6. 자세히 보기 drawer에서 원자료/참고범위/flagSource 확인 가능
```

CSS class 예시:

```css
.lab-flag-h { background: #fff4cc; font-weight: 700; }
.lab-flag-l { background: #dceeff; font-weight: 700; }
.lab-flag-critical { background: #ffd6d6; font-weight: 800; }
```

## 10.4 약물 renderer 요구사항

약물 renderer는 Home med, Med ID, Med Rec, Order, MAR, Discharge med를 각각 별도 탭으로 표시한다.

각 탭의 빈 상태는 실제 EMR처럼 차분하게 표시한다.

```text
조회된 기록이 없습니다.
원자료 미기재
해당 기간 투약기록 없음
```

---

# 11. 수용 기준

## 11.1 Pure EMR 화면 기준

```text
Given 학생이 환자 ID로 접속했을 때
When 환자 차트가 로딩되면
Then 화면에는 답안/정답/교수자 가이드/힌트가 보이지 않는다.
```

## 11.2 Lab flag 기준

```text
Given 환자 Lab 값과 reference master가 있을 때
When Lab Results 화면을 열면
Then 기준보다 높거나 낮은 값은 H/L로 표시된다.
```

```text
Given reference master가 없는 검사 항목일 때
When Lab Results 화면을 열면
Then 해당 항목은 원자료 값만 표시하고 H/L을 임의 생성하지 않는다.
```

## 11.3 원자료 보존 기준

```text
Given 원자료에 Ramipril 5 mg PO qd가 있을 때
When 처방오더 화면으로 변환하더라도
Then 약물명, 용량, 경로, 빈도는 수정되지 않는다.
```

## 11.4 Medication Reconciliation 기준

```text
Given Home Medications와 Discharge Medications가 있을 때
When Medication Reconciliation 탭을 열면
Then continued/new_on_discharge/not_on_discharge_list 관계가 표시된다.
```

## 11.5 MAR 기준

```text
Given 원자료에 실제 투약기록이 없을 때
When MAR 탭을 열면
Then 탭은 존재하지만 실제 투약 row는 표시하지 않고 원자료 미기재 상태를 보여준다.
```

---

# 12. 올해 구현 우선순위

## P0

```text
- 교수 guide/답안/힌트 제거 유지
- Lab pivot table
- 일반 reference master 기반 H/L flag
- Vital trend 화면
- 환자 배너와 안전/주의 배지
- Home med / Discharge med 화면
- Medication Reconciliation 화면
- 처방오더 화면
- 원자료 미기재 empty state
```

## P1

```text
- 약물식별 화면
- MAR 화면
- 전체 타임라인
- Lab trend arrow
- 검사 상세 drawer
- safety badge click 시 관련 기록으로 이동
```

## P2

```text
- 병원별 reference profile 선택
- 약물명 검색/필터
- 날짜 범위 필터
- PDF 스타일 차트 인쇄
- 관리자용 케이스 업로드 도구
```

---

# 13. 최종 원칙

v4.1의 핵심은 다음 한 문장이다.

> 원래 케이스의 임상 내용은 훼손하지 않고, 실제 EMR이라면 자연스럽게 보일 참고치, flag, 약물 대조표, 오더 화면, 빈 MAR 화면을 추가한다.

이 방향이면 학생 화면은 계속 Pure EMR로 유지되면서도, 단순 자료집이 아니라 실제 병원 차트를 탐색하는 느낌이 강해진다.
