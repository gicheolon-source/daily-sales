# HANDOFF — Dr.Reju-All 매출·광고 현황 대시보드 (Claude Code 이어서 작업용)

## 배경
- 네오심플릭스 Dr.Reju-All 브랜드의 일일 매출/광고 현황 보고 도구.
- 채널: 아마존(미국·캐나다·영국·호주·중동UAE), 틱톡샵(미국·영국), 퍼포먼스 마케팅(Meta·Google·TikTok Ads × 미국·영국).
- 원본 양식은 엑셀(5개 시트: 매출보고/설정/월별계획/일일입력/퍼포먼스입력)이고, 같은 로직을 HTML 한 파일로 옮긴 것이 이 프로젝트.
- 구글 시트 버전도 별도로 있음(탭 하나에 블록 배치, MAP/LAMBDA 수식).

## 저장소 / 배포
- GitHub: https://github.com/gicheolon-source/daily-sales (public — private으로 바꾸는 것 권장)
- Vercel: 이 저장소를 Import해서 배포 완료 (Framework: Other, 빌드 없음). commit → 자동 재배포.
- **현재 저장소에 있는 index.html은 구버전. 이 폴더의 index.html이 최신이며 아직 push 안 됨.** 첫 작업은 이 폴더 내용을 그대로 commit/push하는 것.

## 파일
- `index.html` — 대시보드 전체 (HTML+CSS+JS 단일 파일, 외부 의존성은 Google Fonts뿐)
- `vercel.json` — cleanUrls + no-store 캐시 헤더
- `README.md` — 배포/공유 안내

## 데이터 모델 (index.html 내부, localStorage key `drrejuall-report-v1`)
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
- 데이터가 **브라우저별 localStorage**에만 저장됨 → 팀원 간 공유 불가. 다음 단계로 구글 시트(또는 Supabase)를 데이터 원천으로 연결하는 작업이 예정되어 있었음.
  - 구글 시트: https://docs.google.com/spreadsheets/d/1UlnmHPpPEie7cSid8WuicAxAwNi4nIG0IL5ETf7SwG8/edit
  - 시트 레이아웃: 설정 A1~ / 매출보고 14행~ / PM 28행~ / 계획 43행~ / 월별실적 62행~ / 담당자 92행~ / 일일입력 AH열~ / PM입력 AX열~
- Vercel Deployment Protection 켜기 (매출 데이터 공개 방지)
- 예시 데이터(9/27–28) 제거 후 실제 운영 시작

## Claude Code에 붙여넣을 첫 프롬프트 (예시)
```
이 폴더는 Dr.Reju-All 매출·광고 대시보드야. HANDOFF.md 먼저 읽어.
1) 현재 폴더 내용을 https://github.com/gicheolon-source/daily-sales main에 commit/push 해줘 (index.html이 최신).
2) 그다음 구글 시트를 데이터 원천으로 쓰는 방향(팀원 입력이 한 화면에 모이게) 설계안을 제안해줘.
```
