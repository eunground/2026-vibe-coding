/*************************************************************
 * 학교 우산 대여 웹앱 - 백엔드 (Google Apps Script)
 *
 * - DB: Google Sheets (대여현황 / 우산목록 시트)
 * - 프론트엔드와는 google.script.run 으로 통신
 * - 시트가 없으면 자동으로 생성하고 헤더를 채움
 *************************************************************/

/*** ====== 설정 (필요 시 이 부분만 수정) ====== ***/
const ADMIN_PASSWORD = 'admin1234';   // ★ 관리자 비밀번호 (반드시 변경하세요)
const OVERDUE_HOURS  = 24;            // 연체 기준 시간 (시간 단위)
const TIMEZONE       = 'Asia/Seoul';  // 시간 표시 기준

/*** ====== 시트/상태 상수 ====== ***/
const SHEET_RENTALS    = '대여현황';
const SHEET_UMBRELLAS  = '우산목록';

const RENTAL_HEADERS   = ['우산번호', '학생이름', '학번', '전화번호', '대여시간', '반납시간', '상태'];
const UMBRELLA_HEADERS = ['우산번호', '우산명', '등록일'];

const STATUS_RENTED   = '대여중';
const STATUS_RETURNED = '반납완료';

// 대여현황 시트 컬럼 인덱스 (0-base)
const C = { NUMBER: 0, NAME: 1, SID: 2, PHONE: 3, RENT: 4, RETURN: 5, STATUS: 6 };

/*************************************************************
 * 웹앱 진입점
 *************************************************************/
function doGet(e) {
  setupSheets_(); // 시트가 없으면 자동 생성

  const template = HtmlService.createTemplateFromFile('Index');
  template.umbrellaParam =
    (e && e.parameter && e.parameter.umbrella) ? String(e.parameter.umbrella) : '';

  return template
    .evaluate()
    .setTitle('학교 우산 대여')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** HTML include 헬퍼 (CSS/JS 분리용) */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/*************************************************************
 * 스프레드시트 / 시트 준비
 *************************************************************/
function getSpreadsheet_() {
  // 1) 컨테이너 바운드 스크립트인 경우
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  // 2) 독립형 스크립트인 경우: 저장된 ID 사용 또는 새로 생성
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (err) { /* 삭제됐을 수 있음 */ }
  }
  const created = SpreadsheetApp.create('우산대여_DB');
  props.setProperty('SPREADSHEET_ID', created.getId());
  return created;
}

/** 두 시트와 헤더를 보장 */
function setupSheets_() {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, SHEET_RENTALS, RENTAL_HEADERS);
  ensureSheet_(ss, SHEET_UMBRELLAS, UMBRELLA_HEADERS);

  // 자동 생성 시 따라오는 기본 빈 시트 제거
  const defaults = ['시트1', 'Sheet1'];
  defaults.forEach(function (n) {
    const sh = ss.getSheetByName(n);
    if (sh && ss.getSheets().length > 1 && sh.getLastRow() === 0) {
      try { ss.deleteSheet(sh); } catch (e) {}
    }
  });
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needHeaders = headers.some(function (h, i) { return firstRow[i] !== h; });
  if (needHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight('bold')
         .setBackground('#1a73e8')
         .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

/*************************************************************
 * 공통 헬퍼
 *************************************************************/
function findUmbrella_(umbSheet, umbrellaNumber) {
  const values = umbSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === umbrellaNumber) {
      return { row: i + 1, number: String(values[i][0]).trim(), name: values[i][1], regDate: values[i][2] };
    }
  }
  return null;
}

/** 특정 우산의 '대여중' 행을 반환 */
function findActiveRental_(umbrellaNumber) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_RENTALS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][C.NUMBER]).trim() === umbrellaNumber &&
        String(values[i][C.STATUS]).trim() === STATUS_RENTED) {
      return { row: i + 1, data: values[i] };
    }
  }
  return null;
}

/** 특정 학번 학생의 '대여중' 행을 반환 (중복 대여 방지) */
function findActiveRentalByStudent_(studentId) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_RENTALS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][C.SID]).trim() === studentId &&
        String(values[i][C.STATUS]).trim() === STATUS_RENTED) {
      return { row: i + 1, data: values[i] };
    }
  }
  return null;
}

function isOverdue_(rentTime) {
  if (!rentTime) return false;
  const t = new Date(rentTime).getTime();
  if (isNaN(t)) return false;
  return (Date.now() - t) > OVERDUE_HOURS * 3600 * 1000;
}

function hoursSince_(rentTime) {
  const t = new Date(rentTime).getTime();
  if (isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 3600000);
}

function formatDate_(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return Utilities.formatDate(dt, TIMEZONE, 'yyyy-MM-dd HH:mm');
}

/** 개인정보 보호용 이름 마스킹: 홍길동 -> 홍*동 */
function maskName_(name) {
  name = String(name || '');
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

function checkAdmin_(password) {
  return String(password) === ADMIN_PASSWORD;
}

function getWebAppUrl_() {
  try { return ScriptApp.getService().getUrl() || ''; }
  catch (e) { return ''; }
}

/*************************************************************
 * 학생 모드 API
 *************************************************************/

/** 우산 상태 조회 (학생/QR 진입 공통) */
function getUmbrellaStatus(umbrellaNumber) {
  umbrellaNumber = String(umbrellaNumber || '').trim();
  if (!umbrellaNumber) return { ok: false, message: '우산 번호를 입력해주세요.' };

  const ss = getSpreadsheet_();
  const umb = findUmbrella_(ss.getSheetByName(SHEET_UMBRELLAS), umbrellaNumber);
  if (!umb) {
    return { ok: true, registered: false, umbrellaNumber: umbrellaNumber };
  }

  const active = findActiveRental_(umbrellaNumber);
  if (active) {
    const overdue = isOverdue_(active.data[C.RENT]);
    return {
      ok: true,
      registered: true,
      umbrellaNumber: umbrellaNumber,
      umbrellaName: umb.name,
      status: overdue ? 'overdue' : 'rented',
      hours: hoursSince_(active.data[C.RENT]),
      renter: {
        name: maskName_(active.data[C.NAME]), // 학생 화면에는 마스킹된 이름만 노출
        rentTime: formatDate_(active.data[C.RENT])
      }
    };
  }

  return {
    ok: true,
    registered: true,
    umbrellaNumber: umbrellaNumber,
    umbrellaName: umb.name,
    status: 'available'
  };
}

/** 대여 처리 */
function rentUmbrella(payload) {
  const umbrellaNumber = String(payload.umbrellaNumber || '').trim();
  const name      = String(payload.name || '').trim();
  const studentId = String(payload.studentId || '').trim();
  const phone     = String(payload.phone || '').trim();

  if (!umbrellaNumber || !name || !studentId || !phone) {
    return { ok: false, message: '모든 항목을 입력해주세요.' };
  }
  if (!/^[0-9\-]{9,13}$/.test(phone)) {
    return { ok: false, message: '전화번호 형식을 확인해주세요. (예: 010-1234-5678)' };
  }

  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (e) { return { ok: false, message: '요청이 많습니다. 잠시 후 다시 시도해주세요.' }; }

  try {
    const ss = getSpreadsheet_();
    const umb = findUmbrella_(ss.getSheetByName(SHEET_UMBRELLAS), umbrellaNumber);
    if (!umb) return { ok: false, message: '등록되지 않은 우산입니다.' };

    if (findActiveRental_(umbrellaNumber)) {
      return { ok: false, message: '이미 대여 중인 우산입니다.' };
    }

    const dup = findActiveRentalByStudent_(studentId);
    if (dup) {
      return { ok: false, message: '이미 대여 중인 우산(' + dup.data[C.NUMBER] + '번)이 있습니다. 반납 후 이용해주세요.' };
    }

    ss.getSheetByName(SHEET_RENTALS)
      .appendRow([umbrellaNumber, name, studentId, phone, new Date(), '', STATUS_RENTED]);

    return { ok: true, message: umbrellaNumber + '번 우산 대여가 완료되었습니다. 비 조심히 가세요! ☔' };
  } finally {
    lock.releaseLock();
  }
}

/** 반납 처리 (본인 확인: 이름 + 학번 일치) */
function returnUmbrella(payload) {
  const umbrellaNumber = String(payload.umbrellaNumber || '').trim();
  const name      = String(payload.name || '').trim();
  const studentId = String(payload.studentId || '').trim();

  if (!umbrellaNumber || !name || !studentId) {
    return { ok: false, message: '이름과 학번을 입력해주세요.' };
  }

  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch (e) { return { ok: false, message: '요청이 많습니다. 잠시 후 다시 시도해주세요.' }; }

  try {
    const active = findActiveRental_(umbrellaNumber);
    if (!active) return { ok: false, message: '현재 대여 중인 우산이 아닙니다.' };

    if (String(active.data[C.NAME]).trim() !== name ||
        String(active.data[C.SID]).trim() !== studentId) {
      return { ok: false, message: '대여자 정보가 일치하지 않습니다. 이름과 학번을 확인해주세요.' };
    }

    const sheet = getSpreadsheet_().getSheetByName(SHEET_RENTALS);
    sheet.getRange(active.row, C.RETURN + 1).setValue(new Date());
    sheet.getRange(active.row, C.STATUS + 1).setValue(STATUS_RETURNED);

    return { ok: true, message: umbrellaNumber + '번 우산이 반납되었습니다. 감사합니다! 🙏' };
  } finally {
    lock.releaseLock();
  }
}

/*************************************************************
 * 관리자 모드 API (모든 호출에 password 전달)
 *************************************************************/
function adminLogin(password) {
  return { ok: checkAdmin_(password) };
}

function getAdminStats(password) {
  if (!checkAdmin_(password)) return { ok: false, message: '인증에 실패했습니다.' };

  const ss = getSpreadsheet_();
  const total = Math.max(0, ss.getSheetByName(SHEET_UMBRELLAS).getLastRow() - 1);

  const values = ss.getSheetByName(SHEET_RENTALS).getDataRange().getValues();
  let rented = 0, overdue = 0;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][C.STATUS]).trim() === STATUS_RENTED) {
      rented++;
      if (isOverdue_(values[i][C.RENT])) overdue++;
    }
  }
  return { ok: true, total: total, available: total - rented, rented: rented, overdue: overdue };
}

function getActiveRentals(password) {
  if (!checkAdmin_(password)) return { ok: false, message: '인증에 실패했습니다.' };

  const values = getSpreadsheet_().getSheetByName(SHEET_RENTALS).getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][C.STATUS]).trim() !== STATUS_RENTED) continue;
    list.push({
      umbrellaNumber: values[i][C.NUMBER],
      name: values[i][C.NAME],
      studentId: values[i][C.SID],
      phone: values[i][C.PHONE],
      rentTime: formatDate_(values[i][C.RENT]),
      hours: hoursSince_(values[i][C.RENT]),
      overdue: isOverdue_(values[i][C.RENT])
    });
  }
  // 연체 우선, 그 다음 오래된 순
  list.sort(function (a, b) { return (b.overdue - a.overdue) || (b.hours - a.hours); });
  return { ok: true, list: list };
}

function forceReturn(password, umbrellaNumber) {
  if (!checkAdmin_(password)) return { ok: false, message: '인증에 실패했습니다.' };

  umbrellaNumber = String(umbrellaNumber || '').trim();
  const active = findActiveRental_(umbrellaNumber);
  if (!active) return { ok: false, message: '대여 중인 우산이 아닙니다.' };

  const sheet = getSpreadsheet_().getSheetByName(SHEET_RENTALS);
  sheet.getRange(active.row, C.RETURN + 1).setValue(new Date());
  sheet.getRange(active.row, C.STATUS + 1).setValue(STATUS_RETURNED);
  return { ok: true, message: umbrellaNumber + '번 우산을 강제 반납 처리했습니다.' };
}

function registerUmbrella(password, payload) {
  if (!checkAdmin_(password)) return { ok: false, message: '인증에 실패했습니다.' };

  const umbrellaNumber = String(payload.umbrellaNumber || '').trim();
  const umbrellaName   = String(payload.umbrellaName || '').trim();
  if (!umbrellaNumber) return { ok: false, message: '우산 번호를 입력해주세요.' };

  const ss = getSpreadsheet_();
  const umbSheet = ss.getSheetByName(SHEET_UMBRELLAS);
  if (findUmbrella_(umbSheet, umbrellaNumber)) {
    return { ok: false, message: '이미 등록된 우산 번호입니다.' };
  }
  umbSheet.appendRow([umbrellaNumber, umbrellaName || ('우산 ' + umbrellaNumber), new Date()]);
  return { ok: true, message: umbrellaNumber + '번 우산이 등록되었습니다.' };
}

function deleteUmbrella(password, umbrellaNumber) {
  if (!checkAdmin_(password)) return { ok: false, message: '인증에 실패했습니다.' };

  umbrellaNumber = String(umbrellaNumber || '').trim();
  if (findActiveRental_(umbrellaNumber)) {
    return { ok: false, message: '대여 중인 우산은 삭제할 수 없습니다. 먼저 반납 처리해주세요.' };
  }
  const ss = getSpreadsheet_();
  const umbSheet = ss.getSheetByName(SHEET_UMBRELLAS);
  const umb = findUmbrella_(umbSheet, umbrellaNumber);
  if (!umb) return { ok: false, message: '등록되지 않은 우산입니다.' };

  umbSheet.deleteRow(umb.row);
  return { ok: true, message: umbrellaNumber + '번 우산이 삭제되었습니다.' };
}

/** 전체 우산 목록 (상태 + QR 포함) */
function getAllUmbrellas(password) {
  if (!checkAdmin_(password)) return { ok: false, message: '인증에 실패했습니다.' };

  const ss = getSpreadsheet_();
  const values = ss.getSheetByName(SHEET_UMBRELLAS).getDataRange().getValues();
  const baseUrl = getWebAppUrl_();
  const list = [];

  for (let i = 1; i < values.length; i++) {
    const number = String(values[i][0]).trim();
    if (!number) continue;

    const active = findActiveRental_(number);
    const status = active ? (isOverdue_(active.data[C.RENT]) ? 'overdue' : 'rented') : 'available';
    const link = baseUrl
      ? baseUrl + (baseUrl.indexOf('?') >= 0 ? '&' : '?') + 'umbrella=' + encodeURIComponent(number)
      : '';
    const qrUrl = link
      ? 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=' + encodeURIComponent(link)
      : '';

    list.push({
      umbrellaNumber: number,
      umbrellaName: values[i][1],
      regDate: formatDate_(values[i][2]),
      status: status,
      link: link,
      qrUrl: qrUrl
    });
  }
  return { ok: true, list: list, baseUrl: baseUrl };
}

/** 전체 대여 기록 (최신순) */
function getRentalHistory(password) {
  if (!checkAdmin_(password)) return { ok: false, message: '인증에 실패했습니다.' };

  const values = getSpreadsheet_().getSheetByName(SHEET_RENTALS).getDataRange().getValues();
  const list = [];
  for (let i = 1; i < values.length; i++) {
    if (!String(values[i][C.NUMBER]).trim()) continue;
    list.push({
      umbrellaNumber: values[i][C.NUMBER],
      name: values[i][C.NAME],
      studentId: values[i][C.SID],
      phone: values[i][C.PHONE],
      rentTime: formatDate_(values[i][C.RENT]),
      returnTime: formatDate_(values[i][C.RETURN]),
      status: String(values[i][C.STATUS]).trim()
    });
  }
  list.reverse();
  return { ok: true, list: list };
}
