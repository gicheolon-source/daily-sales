/**
 * Dr.Reju-All 매출·광고 현황 — Apps Script 백엔드
 * - doGet: 대시보드(index.html) 서빙 (웹앱 접근 = 도메인 사용자, 실행 = 배포자)
 * - getAll / apply: 구글 시트 db_* 탭을 데이터 원천으로 읽고 쓴다 (google.script.run)
 */
const SHEET_ID = '1UlnmHPpPEie7cSid8WuicAxAwNi4nIG0IL5ETf7SwG8';
const TZ = 'Asia/Seoul';
const MONTH_COLS = Array.from({ length: 12 }, (_, i) => 'm' + (i + 1));
const META = ['updatedBy', 'updatedAt'];
const TABS = {
  config: { name: 'db_config', key: ['key'], cols: ['key', 'value'], text: ['key'] },
  owners: { name: 'db_owners', key: ['key'], cols: ['key', 'owner'], text: ['key', 'owner'] },
  plan:   { name: 'db_plan',   key: ['kind', 'key'], cols: ['kind', 'key'].concat(MONTH_COLS), text: ['kind', 'key'] },
  daily:  { name: 'db_daily',  key: ['id'], cols: ['id', 'date', 'ch', 'ct', 'sales', 'ad', 'orders', 'adrev', 'aff', 'memo'], text: ['id', 'date', 'ch', 'ct', 'memo'] },
  pm:     { name: 'db_pm',     key: ['id'], cols: ['id', 'date', 'pl', 'ct', 'spend', 'imp', 'clk', 'cv', 'rev', 'memo'], text: ['id', 'date', 'pl', 'ct', 'memo'] },
};
const NUM = { daily: ['sales', 'ad', 'orders', 'adrev', 'aff'], pm: ['spend', 'imp', 'clk', 'cv', 'rev'] };

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Dr.Reju-All 매출·광고 현황')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** 편집기에서 한 번 실행: 권한 승인 + db_* 탭 생성 */
function setup() {
  const ss = book_();
  Object.keys(TABS).forEach(t => ensureTab_(ss, t));
}

/** 전체 데이터를 대시보드 형태(S)로 반환 */
function getAll() {
  const ss = book_();
  fixIds_(ss);
  const R = t => load_(ensureTab_(ss, t)).rows;
  const config = {};
  R('config').forEach(r => { if (r.key !== '') config[String(r.key)] = out_(r.value); });
  const owners = {};
  R('owners').forEach(r => { if (r.key !== '') owners[String(r.key)] = String(out_(r.owner)); });
  const plan = {}, budget = {};
  R('plan').forEach(r => {
    if (r.key === '') return;
    (r.kind === 'budget' ? budget : plan)[String(r.key)] = MONTH_COLS.map(c => num_(r[c]) || 0);
  });
  const rows = t => R(t).filter(r => r.id !== '').map(r => {
    const o = {};
    TABS[t].cols.concat(META).forEach(c => { o[c] = NUM[t].indexOf(c) >= 0 ? num_(r[c]) : String(out_(r[c], c)); });
    return o;
  });
  return { config, owners, plan, budget, daily: rows('daily'), pm: rows('pm'), me: me_() };
}

/**
 * 변경분 적용. ops:
 *  {t:'config'|'owners', key, value}
 *  {t:'plan', kind:'plan'|'budget', key, m(0-11), value}
 *  {t:'daily'|'pm', op:'put', row} / {t:'daily'|'pm', op:'del', id}
 */
function apply(ops) {
  if (!Array.isArray(ops)) throw new Error('잘못된 요청');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = book_(), who = me_(), now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    const byTab = {};
    ops.forEach(o => {
      if (!TABS[o.t]) throw new Error('알 수 없는 탭: ' + o.t);
      (byTab[o.t] = byTab[o.t] || []).push(o);
    });
    Object.keys(byTab).forEach(t => {
      const T = TABS[t], sh = ensureTab_(ss, t), tbl = load_(sh);
      const idx = new Map(tbl.rows.map(r => [keyOf_(T, r), r]));
      const row = (k, init) => { let r = idx.get(k); if (!r) { r = init(); tbl.rows.push(r); idx.set(k, r); } return r; };
      byTab[t].forEach(o => {
        let r;
        if (t === 'daily' || t === 'pm') {
          if (o.op === 'del') { if (idx.has(o.id)) idx.get(o.id).__del = true; return; }
          const src = o.row || {};
          if (!src.id) throw new Error('id 없는 행');
          r = row(String(src.id), () => ({}));
          T.cols.forEach(c => { r[c] = cell_(src[c]); });
        } else if (t === 'plan') {
          const m = Number(o.m);
          if (!(m >= 0 && m < 12)) throw new Error('잘못된 월');
          r = row(o.kind + '|' + o.key, () => { const x = { kind: o.kind, key: o.key }; MONTH_COLS.forEach(c => { x[c] = 0; }); return x; });
          r[MONTH_COLS[m]] = cell_(o.value);
        } else {
          r = row(String(o.key), () => ({ key: o.key }));
          r[t === 'config' ? 'value' : 'owner'] = cell_(o.value);
        }
        r.updatedBy = who; r.updatedAt = now;
      });
      save_(sh, tbl);
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return getAll();
}

// ---------- helpers ----------
function book_() { return SpreadsheetApp.openById(SHEET_ID); }
function me_() { try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; } }
function keyOf_(T, r) { return T.key.map(c => String(r[c])).join('|'); }
function num_(v) { if (v === '' || v == null) return null; const n = Number(v); return isNaN(n) ? null : n; }
function out_(v, col) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, col === 'date' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss');
  return v == null ? '' : v;
}
/** 시트에 쓸 값: null → 빈칸, 수식으로 해석될 문자열은 ' 접두 */
function cell_(v) {
  if (v == null) return '';
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function ensureTab_(ss, t) {
  const T = TABS[t], want = T.cols.concat(META);
  const sh = ss.getSheetByName(T.name) || ss.insertSheet(T.name);
  const lastCol = sh.getLastColumn();
  const cur = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  const missing = want.filter(h => cur.indexOf(h) < 0);
  if (missing.length) {
    sh.getRange(1, cur.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    sh.setFrozenRows(1);
    const all = cur.concat(missing);
    T.text.concat(META).forEach(c => {
      const i = all.indexOf(c);
      if (i >= 0) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@');
    });
  }
  return sh;
}

function load_(sh) {
  const v = sh.getDataRange().getValues();
  const header = v[0].map(String);
  const rows = v.slice(1)
    .filter(r => r.some(x => x !== '' && x != null))
    .map(r => { const o = {}; header.forEach((h, i) => { o[h] = r[i]; }); return o; });
  return { header, rows };
}

function save_(sh, tbl) {
  const rows = tbl.rows.filter(r => !r.__del);
  const values = rows.map(r => tbl.header.map(h => (r[h] == null ? '' : r[h])));
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, tbl.header.length).clearContent();
  if (!values.length) return;
  const need = values.length + 1 - sh.getMaxRows();
  if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need + 100);
  sh.getRange(2, 1, values.length, tbl.header.length).setValues(values);
}

/** 시트에 직접 입력한(id 없는) 일일/PM 행에 id 부여 */
function fixIds_(ss) {
  ['daily', 'pm'].forEach(t => {
    const sh = ensureTab_(ss, t);
    const tbl = load_(sh);
    const missing = tbl.rows.filter(r => r.id === '' && r.date !== '');
    if (!missing.length) return;
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return;
    try {
      const fresh = load_(sh);
      fresh.rows.forEach(r => { if (r.id === '' && r.date !== '') r.id = Utilities.getUuid(); });
      save_(sh, fresh);
    } finally {
      lock.releaseLock();
    }
  });
}
