# Dr.Reju-All 매출·광고 현황

`index.html` 하나로 동작하는 대시보드입니다. 열리는 곳에 따라 저장소가 달라집니다.

| 열린 곳 | 데이터 저장 | 용도 |
|---|---|---|
| **Apps Script 웹앱** (운영) | 구글 시트 `db_*` 탭 — 팀 공용 | 팀원 입력이 한 화면에 모임, 회사 계정만 접근 |
| 로컬 파일 / Vercel | 브라우저 localStorage | 오프라인 미리보기·데모 |

## 파일
- `index.html` — 대시보드 (HTML+CSS+JS)
- `Code.js` — Apps Script 백엔드: 웹앱 서빙(`doGet`), `getAll`, `apply`
- `appsscript.json` — 웹앱 설정 (실행: 배포자 / 접근: 도메인 사용자)
- `.claspignore` — clasp로 올릴 파일 3개만 지정

## Apps Script 배포 (최초 1회)

### 방법 A — 편집기에 붙여넣기 (가장 간단)
1. 구글 시트 열기 → **확장 프로그램 → Apps Script**
2. `Code.gs` 내용을 이 저장소의 `Code.js`로 교체
3. **+ → HTML** 로 파일 추가, 이름을 `index` 로 → `index.html` 내용 붙여넣기
4. 프로젝트 설정(톱니) → "편집기에 appsscript.json 표시" 체크 → `appsscript.json` 내용 교체
5. 함수 선택 `setup` → **실행** → 권한 승인 (시트에 `db_*` 탭 5개 생성)
6. **배포 → 새 배포 → 유형: 웹 앱**
   - 실행 사용자: **나**
   - 액세스 권한: **neosimplix.com 내 모든 사용자**
7. 나온 `/exec` URL을 팀에 공유

### 방법 B — clasp (저장소에서 바로 올리기)
```bash
npm i -g @google/clasp
clasp login
clasp clone <스크립트ID>     # 시트에 바인딩된 스크립트 ID (프로젝트 설정에서 확인), 또는 clasp create --type sheets
clasp push
clasp deploy                  # 이후 수정 시: clasp push && clasp deploy -i <배포ID>
```

### 코드 수정 후
웹앱 URL은 **배포 버전**을 보여줍니다. 수정 후에는 배포 → 배포 관리 → 편집 → 버전 "새 버전"으로 갱신해야 팀원에게 반영됩니다.
(`/dev` URL은 편집자만 최신 코드로 볼 수 있는 테스트용)

## 데이터 구조 (시트 탭)
| 탭 | 컬럼 | 키 |
|---|---|---|
| `db_config` | key, value (`unit`, `roasMin`, `fx.미국`, `thr.아마존` …) | key |
| `db_owners` | key(예: 아마존\|영국), owner | key |
| `db_plan` | kind(`plan`/`budget`), key, m1…m12 (만원) | kind+key |
| `db_daily` | id, date, ch, ct, sales, ad, orders, adrev, aff, memo | id |
| `db_pm` | id, date, pl, ct, spend, imp, clk, cv, rev, memo | id |

모든 탭에 `updatedBy`, `updatedAt`이 자동 기록됩니다.
- 대시보드는 **바뀐 셀/행만** 전송하고, 서버는 LockService로 쓰기를 직렬화합니다 → 여러 명이 동시에 입력해도 서로 덮어쓰지 않음.
- 시트에 직접 행을 추가해도 됩니다 (id 칸은 비워두면 자동 부여). 컬럼 순서는 바꿔도 되지만 **헤더 이름은 바꾸지 마세요.**
- 60초마다·탭 복귀 시 자동 새로고침. 입력 중에는 화면을 다시 그리지 않습니다.

## 기존 브라우저(Vercel) 데이터 옮기기
기존 페이지 → 매출보고 → **백업 내보내기(JSON)** → 웹앱에서 **백업 불러오기** → 시트 전체가 백업 내용으로 교체됩니다.
