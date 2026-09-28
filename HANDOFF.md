# HANDOFF — Dr.Reju-All 매출·광고 현황 대시보드 (Claude Code 이어서 작업용)

## 배경
- 네오심플릭스 Dr.Reju-All 브랜드의 일일 매출/광고 현황 보고 도구.
- 채널: 아마존(미국·캐나다·영국·호주·중동UAE), 틱톡샵(미국·영국), 퍼포먼스 마케팅(Meta·Google·TikTok Ads × 미국·영국).
- 원본 양식은 엑셀(5개 시트: 매출보고/설정/월별계획/일일입력/퍼포먼스입력)이고, 같은 로직을 HTML 한 파일로 옮긴 것이 이 프로젝트.
- 구글 시트 버전도 별도로 있음(탭 하나에 블록 배치, MAP/LAMBDA 수식).

## 저장소 / 배포
- GitHub: https://github.com/gicheolon-source/daily-sales (public — private으로 바꾸는 것 권장)
- **운영: Apps Script 웹앱** (구글 시트에 바인딩, 실행=배포자, 접근=neosimplix.com 도메인). 배포 절차는 README 참조.
- Vercel: 저장소 Import로 배포됨. localStorage 모드(데모)로만 동작 — 운영 전환 후 삭제하거나 Protection 켜기 권장.

## 파일
- `index.html` — 대시보드 전체. `google.script.run`이 있으면 **시트 모드**, 없으면 **로컬 모드**(localStorage)
- `Code.js` — Apps Script 백엔드: `doGet`(index 서빙), `getAll()`, `apply(ops)`, `setup()`
- `appsscript.json` / `.claspignore` — 웹앱 설정, clasp 업로드 대상 지정
- `vercel.json`, `.vercelignore` — Vercel용 (백엔드 파일은 배포 제외)
- `README.md` — 배포/운영 안내

## 시트 모드 동기화 (index.html)
- 구글 시트 탭: `db_config` / `db_owners` / `db_plan`(kind=plan|budget, m1–m12) / `db_daily` / `db_pm` (+ updatedBy, updatedAt 자동)
- `BASE` = 서버에 있다고 아는 마지막 상태. `save()` → 400ms 디바운스 → `diffOps(BASE, S)`로 **바뀐 셀/행만** `apply` 전송 → 응답(getAll 결과)으로 S·BASE 갱신
- 일일/PM 행은 `id`로 식별 (없으면 클라이언트 `uid()`, 시트 직접 입력 행은 서버 `fixIds_`가 부여)
- 응답 대기 중 추가 수정 → 응답 버리고 차이만 재전송. 실패 → 10초 후 재시도. 60초 자동 pull, 입력 중엔 렌더 보류(`softRender`)
- 시트가 비어 있으면(`fx.미국` 없음) 첫 접속자가 기본 설정·담당자·계획을 시트에 채움 (예시 실적 행은 제외)
- `asof`(기준일)는 개인별 — 시트 모드에서는 접속 시 오늘로 시작
- 캐시: localStorage `drrejuall-report-gas-v1` = {S, BASE} (미전송 변경 보존)
- 매출보고 상단 **미입력 칩**: 기준일 행이 없는 채널·국가를 담당자별로 표시

## 데이터 모델 (index.html 내부 S, 로컬 모드 localStorage key `drrejuall-report-v1`)
```
S = {
  unit:'만원', asof:'YYYY-MM-DD',
  fx:{미국:1380, 캐나다:1000, 영국:1800, 호주:900, '중동(UAE)':375},   // 1현지통화=KRW
  thr:{전체:0.20, 아마존:0.15, 틱톡샵:0.25},  roasMin:2.0,                // 합/불 기준
  owners:{'채널|국가':'이름', '아마존|Subtotal':..., '전체|':..., 'PM 전체|':...},
  plan:{'아마존|미국':[12개월 만원], ...}, budget:{'Meta|미국':[12개월 만원], ...},
  daily:[{date,ch,ct,sales,ad,orders,adrev,aff,memo}],   // 현지통화 입력
  pm:[{date,pl,ct,spend,imp,clk,cv,rev,memo}]
}
```
- 금액 환산: `krw(v,ct) = v * fx[ct] / 10000` → **만원** 단위. 표시는 `fmtW`(576만원 / 2.68억), 표 안은 `fmtT`(숫자만).
- 예전(천원) 저장분은 로드 시 plan/budget ÷10 마이그레이션 (`S.unit!=='만원'` 체크).

## 화면 구성 (탭)
1. 매출보고 — KPI 6개 → 경고 칩(불합격 항목) → 아마존/틱톡샵 국가 카드 → PM 카드 → 접힌 상세 표 3개(채널·PM·월별)
   - 카드의 "입력·설정" 버튼: 담당자, 이번달 목표(예산), 오늘 실적을 카드 안에서 바로 입력 → 기준일 행 upsert
2. 일일입력 / 3. 퍼포먼스입력 — 표 편집, CSV 가져오기/내보내기, 예시 데이터 삭제
4. 월별계획 — 채널·국가별 12개월 목표, PM 월 예산
5. 설정 — 환율, 합/불 기준, 담당자 표, JSON 백업/복원, 초기화

## 합/불 규칙
- 광고비율(광고비÷매출) > 채널 상한 → 불합격 / MTD 진척율(MTD ÷ (일GOAL×경과일)) < 100% → 불합격 / PM ROAS < 하한 → 불합격
- 예산 소진율 > (경과일÷월간일수)×1.1 → 빨강

## 알려진 한계 / 다음 단계 후보
- 구글 시트: https://docs.google.com/spreadsheets/d/1UlnmHPpPEie7cSid8WuicAxAwNi4nIG0IL5ETf7SwG8/edit (`Code.js`의 `SHEET_ID`)
  - 기존 블록형 탭(설정 A1~ / 매출보고 14행~ / PM 28행~ / 계획 43행~ / 월별실적 62행~ / 담당자 92행~ / 일일입력 AH열~ / PM입력 AX열~)은 아직 `db_*` 탭을 참조하지 않음 → **다음 단계: 블록 수식이 db_* 탭을 읽도록 전환**
- 실제 Apps Script 환경 검증 필요: HtmlService iframe 안에서 CSV/JSON **다운로드**, **인쇄** 동작 확인
- 저장소 private 전환 권장 (시트 ID·담당자 이름 포함)
- 예시 데이터(9/27–28) 제거 후 실제 운영 시작 (시트 모드는 예시 실적 없이 시작)
