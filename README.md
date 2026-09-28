# Dr.Reju-All 매출·광고 현황 (HTML)

정적 파일 하나(index.html)로 동작하는 대시보드입니다. 서버·DB 없이 브라우저(localStorage)에 저장됩니다.

## Vercel 배포
1. https://vercel.com/new 에서 "Deploy without Git" 또는 이 폴더를 드래그 업로드
   - 또는 터미널: `npx vercel --prod` (이 폴더에서)
2. Framework Preset: Other · Build Command 없음 · Output: 루트
3. 배포 후 URL 접속 → 설정 탭에서 환율·기준·담당자 확인 → 일일입력 탭에서 '예시 데이터 삭제'

## 팀 공유
브라우저별 저장이라, 팀원 간 데이터는 매출보고 탭의 '백업 내보내기/불러오기'(JSON) 또는 CSV로 교환하세요.
공용 DB가 필요하면 다음 단계로 Vercel KV / Supabase 연동 버전을 만들 수 있습니다.
