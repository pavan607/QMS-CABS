/** Normalise item_pertains_to JSON/array values for display (PDF, detail screens). */

import { parseInspectorIds } from '@/lib/inspector-ids';

const ITEM_PERTAINS_LABELS: Record<string, string> = {
  airborne: 'Airborne Unit',
  ground: 'Ground Unit',
  prototype: 'Prototype',
};

function parseStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter((x) => x != null && String(x).trim() !== '').map(String);
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p)) return p.filter((x: unknown) => x != null && String(x).trim() !== '').map(String);
    } catch {
      /* plain string */
    }
    return val.trim() ? [val] : [];
  }
  return [];
}

/** Single token: known keys → label; else Title Case per word (snake_case → spaces). */
export function formatItemPertainsToToken(v: string): string {
  const raw = String(v).trim();
  if (!raw) return '';
  const key = raw.toLowerCase();
  if (ITEM_PERTAINS_LABELS[key]) return ITEM_PERTAINS_LABELS[key];
  return raw
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Comma-separated display for tables/PDF; empty → em dash. */
export function formatItemPertainsToDisplay(val: unknown, empty = '—'): string {
  const list = parseStringArray(val).map(formatItemPertainsToToken).filter(Boolean);
  return list.length ? list.join(', ') : empty;
}

const TEST_TYPE_LABELS: Record<string, string> = {
  lab_testing: 'LAB/LRU TESTING',
  qt: 'FULL QT',
  lqt_iqt: 'LQT/IQT',
  other: 'OTHER',
};

/** Test type tokens: snake_case → spaces, full string uppercased (e.g. system_level_test → SYSTEM LEVEL TEST). */
export function formatTestTypeToken(v: string): string {
  const raw = String(v).trim();
  if (!raw) return '';
  const key = raw.toLowerCase();
  if (TEST_TYPE_LABELS[key]) return TEST_TYPE_LABELS[key];
  return raw
    .split(/[_\s]+/)
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
}

/** Comma-separated test types for PDF/tables. */
export function formatTestTypeDisplay(val: unknown, empty = '—'): string {
  const list = parseStringArray(val).map(formatTestTypeToken).filter(Boolean);
  return list.length ? list.join(', ') : empty;
}

/** DB label for inspection stage / previous stage "Others" option (sections 12 & 14). */
export const OTHERS_INSPECTION_STAGE_EXTENDED_LABEL =
  'Others (Please specify If the test is not available in the list, please contact the Admin 9507/9437)';

export function isOthersInspectionStageItem(name: string): boolean {
  return /^others\s*\(\s*please\s*specify/i.test(String(name).trim());
}

/** UI label for inspection type items; keeps stored value unchanged when saving. */
export function formatInspectionStageItemLabel(name: string): string {
  return isOthersInspectionStageItem(name) ? OTHERS_INSPECTION_STAGE_EXTENDED_LABEL : name;
}

/** Comma-separated inspection / previous stage values for display. */
export function formatInspectionStageListDisplay(val: unknown, empty = '—'): string {
  const raw = val == null ? '' : String(val).trim();
  if (!raw) return empty;
  return raw
    .split(',')
    .map((s) => formatInspectionStageItemLabel(s.trim()))
    .filter(Boolean)
    .join(', ');
}

export type AssignedInspectorRow = {
  id?: number;
  name: string;
  employee_id?: string | null;
  designation?: string | null;
};

/** Rows for Part II / Part IV UI — uses API list, then `inspector_names`, then legacy single inspector. */
export function resolveAssignedInspectorsForDisplay(
  inspection: {
    assigned_inspectors?: Array<{
      id?: number;
      name?: string | null;
      employee_id?: string | null;
      designation?: string | null;
    }> | null;
    inspector_ids?: unknown;
    inspector_id?: number | null;
    inspector_name?: string | null;
    inspector_names?: string | null;
    inspector_employee_id?: string | null;
    inspector_designation?: string | null;
  }
): AssignedInspectorRow[] {
  const fromApi = (inspection.assigned_inspectors || [])
    .map((i) => ({
      id: i.id,
      name: i.name?.trim() || '',
      employee_id: i.employee_id,
      designation: i.designation,
    }))
    .filter((i) => i.name);
  if (fromApi.length > 0) return fromApi;

  const ids = parseInspectorIds(inspection.inspector_ids);
  const namesFromAgg =
    inspection.inspector_names
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (namesFromAgg.length > 0) {
    return namesFromAgg.map((name, idx) => ({
      id: ids[idx],
      name,
    }));
  }

  const single = inspection.inspector_name?.trim();
  if (single) {
    return [
      {
        id: inspection.inspector_id ?? undefined,
        name: single,
        employee_id: inspection.inspector_employee_id,
        designation: inspection.inspector_designation,
      },
    ];
  }
  return [];
}

/** Comma-separated names for all Part II assigned inspectors (summary cards, lists). */
export function formatAssignedInspectorsDisplay(
  inspection: {
    assigned_inspectors?: Array<{ name?: string | null }> | null;
    inspector_name?: string | null;
    inspector_names?: string | null;
  },
  empty = 'Unassigned'
): string {
  const rows = resolveAssignedInspectorsForDisplay(inspection);
  if (rows.length > 0) return rows.map((r) => r.name).join(', ');
  return empty;
}

export function formatTestTypeDisplayWithOther(
  val: unknown,
  other: unknown,
  empty = '—'
): string {
  const main = formatTestTypeDisplay(val, '');
  const t = other != null && String(other).trim() ? String(other).trim() : '';
  if (t) {
    if (main) return `${main} — OTHER: ${t}`;
    return `OTHER: ${t}`;
  }
  return main || empty;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Today's calendar day in the runtime's local timezone — use instead of `toISOString().slice(0,10)` (which is UTC). */
export function getLocalYmdToday(): string {
  const n = new Date();
  return `${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`;
}

/**
 * Normalise a DB/API value to `YYYY-MM-DD` for `<input type="date" />` and form state.
 * Do not use `String(dateObj).slice(0, 10)` — it is not ISO. Prefer this over blind ISO `slice(0, 10)` for midnight-UTC values.
 */
export function toDateOnlyYmd(val: unknown): string {
  if (val == null || val === '') return '';
  if (val instanceof Date) {
    const h = val.getUTCHours();
    const m = val.getUTCMinutes();
    const s = val.getUTCSeconds();
    const ms = val.getUTCMilliseconds();
    if (h + m + s + ms === 0) {
      return `${val.getUTCFullYear()}-${pad2(val.getUTCMonth() + 1)}-${pad2(val.getUTCDate())}`;
    }
    return `${val.getFullYear()}-${pad2(val.getMonth() + 1)}-${pad2(val.getDate())}`;
  }
  const str = String(val).trim();
  if (!str) return '';
  const head = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!head) {
    const d = new Date(str);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  const y = head[1];
  const mo = head[2];
  const dday = head[3];
  const rest = str.slice(10);
  if (rest === '' || /^T00:00:00(?:\.0+)?Z$/i.test(rest)) {
    return `${y}-${mo}-${dday}`;
  }
  if (/^T\d{2}:\d{2}:\d{2}/.test(rest) || rest.startsWith('T')) {
    const d = new Date(str);
    if (isNaN(d.getTime())) return `${y}-${mo}-${dday}`;
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return `${y}-${mo}-${dday}`;
}

/**
 * Display a DB calendar date (DATE column, `YYYY-MM-DD`, or `YYYY-MM-DDT00:00:00.000Z`) as dd-mm-yyyy
 * using the stored calendar day — avoids showing one day early in timezones behind UTC when the API sends midnight UTC.
 */
export function formatCalendarDateDisplay(val: unknown, empty = '—'): string {
  if (val == null || val === '') return empty;

  if (val instanceof Date) {
    const utcH = val.getUTCHours();
    const utcM = val.getUTCMinutes();
    const utcS = val.getUTCSeconds();
    const utcMs = val.getUTCMilliseconds();
    if (utcH === 0 && utcM === 0 && utcS === 0 && utcMs === 0) {
      return `${pad2(val.getUTCDate())}-${pad2(val.getUTCMonth() + 1)}-${val.getUTCFullYear()}`;
    }
    return `${pad2(val.getDate())}-${pad2(val.getMonth() + 1)}-${val.getFullYear()}`;
  }

  const s = String(val).trim();
  if (!s) return empty;

  const head = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!head) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return empty;
    return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
  }
  const [, y, mo, d] = head;
  const rest = s.slice(10);
  if (rest === '' || /^T00:00:00(?:\.0+)?Z$/i.test(rest)) {
    return `${d}-${mo}-${y}`;
  }
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return `${d}-${mo}-${y}`;
  return `${pad2(dt.getDate())}-${pad2(dt.getMonth() + 1)}-${dt.getFullYear()}`;
}

/** Parse leading `YYYY-MM-DD` as local calendar date (for date math without UTC shift). */
export function parseYmdLocal(val: unknown): Date | null {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  return new Date(y, mo - 1, day);
}

/**
 * Part III received value: `YYYY-MM-DD` / `datetime-local` → `dd-mm-yyyy` or `dd-mm-yyyy HH:mm`.
 * Uses stored calendar components (no timezone shift). Other parseable ISO strings fall back to `Date` in local time.
 */
export function formatReceivedDateTimeDisplay(val: unknown, empty = '—'): string {
  if (val == null || val === '') return empty;
  const s = String(val).trim();
  if (!s) return empty;

  const localLike = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (localLike) {
    const [, y, mo, d, h, mi] = localLike;
    const datePart = `${d}-${mo}-${y}`;
    if (h != null && mi != null) return `${datePart} ${h}:${mi}`;
    return datePart;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  }

  return s.replace('T', ' ');
}

/**
 * Part III reports: "(In case of delegation to R&QA) ORDAQA Rep".
 * Prefer explicit `dgaqa_rep` from Sections 24–25; when delegation is `delegated`, fall back to the Section 23 assignee name.
 */
export function ordaqaRepReportDisplay(
  part3: Record<string, any> | null | undefined,
  inspectionOrdaqaInspectorName?: string | null
): string {
  const p = part3 || {};
  const explicit = String(p.dgaqa_rep ?? '').trim();
  if (explicit) return explicit;
  if (p.delegation_type === 'delegated') {
    return String(p.assigned_delegated_to || inspectionOrdaqaInspectorName || '').trim();
  }
  return '';
}

function parseJsonRecord(val: unknown): Record<string, unknown> {
  if (!val) return {};
  if (typeof val === 'object' && !Array.isArray(val)) return val as Record<string, unknown>;
  if (typeof val === 'string') {
    try {
      const o = JSON.parse(val);
      return typeof o === 'object' && o !== null && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Part I 19(f) confirmations object. */
export function parseConfirmations(val: unknown): Record<string, string> {
  const raw = parseJsonRecord(val);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && String(v).trim() !== '') out[k] = String(v).trim().toLowerCase();
  }
  return out;
}

/** Part I 19(f) — joint inspection with ORDAQA requested (Yes). */
export function jointInspectionRequestedInPart1(ir: { confirmations?: unknown }): boolean {
  return parseConfirmations(ir.confirmations).joint_inspection_request === 'yes';
}

/**
 * Part I 19(f) No or N/A — Parts II and III are not used; R&QA Inspector fills Part IV only.
 */
export function inspectionSkipsPart2Part3(ir: { confirmations?: unknown }): boolean {
  const v = parseConfirmations(ir.confirmations).joint_inspection_request;
  return v === 'no' || v === 'na' || v === 'n/a';
}

/** Part IV editable on skip-path IRs only before inspection is started. */
const SKIPPED_PART2_PART4_STATUSES = ['request_approved', 'assigned'] as const;

/** R&QA Inspector (not ORDAQA) may act on skip-path IRs; locks to assignee after Part IV save assigns them. */
export function isRqaInspectorEligibleForSkippedParts(
  ir: {
    inspector_id?: number | null;
    inspector_ids?: unknown;
    confirmations?: unknown;
  },
  userId: number,
  userRole?: string
): boolean {
  if (!inspectionSkipsPart2Part3(ir)) return false;
  if (userRole === 'administrator') return true;
  if (userRole !== 'inspector' || !userId) return false;
  const hasAssignee =
    (ir.inspector_id != null && Number(ir.inspector_id) > 0) ||
    parseInspectorIds(ir.inspector_ids).length > 0;
  if (!hasAssignee) return true;
  return isUserAssignedPart2Inspector(ir, userId);
}

/** IR was marked for ORDAQA joint inspection in Part II (boolean may arrive as string from DB/JSON). */
export function isForwardedToOrdqa(ir: { forwarded_to_ordaqa?: unknown }): boolean {
  const v = ir.forwarded_to_ordaqa;
  return v === true || v === 'true' || v === 1 || v === '1';
}

/**
 * True when ORDAQA path applies (Part III + Part V) — Part I 19(f) Yes and/or Part II forward to ORDAQA.
 * False when Part I 19(f) is No/N/A (skip Parts II–III).
 */
export function inspectionRequiresOrdqaPart5(ir: {
  confirmations?: unknown;
  forwarded_to_ordaqa?: unknown;
}): boolean {
  if (inspectionSkipsPart2Part3(ir)) return false;
  return jointInspectionRequestedInPart1(ir) || isForwardedToOrdqa(ir);
}

/** Team Head – QA final sign-off (Approve & Close) recorded — show name in Part IV 30. */
export function teamHeadFinalSignoffApproved(ir: {
  final_qa_approver_id?: number | null;
}): boolean {
  return ir.final_qa_approver_id != null && String(ir.final_qa_approver_id).trim() !== '';
}

/** Statuses where R&QA Team Head (qa_approver) retains access on Part I No/N/A skip-path IRs. */
export const QA_APPROVER_SKIP_PATH_STATUSES = [
  'request_approved',
  'assigned',
  'in_progress',
  'inspection_completed',
  'completed',
] as const;

/** Team Head – QA (qa_approver) may Approve & Close after inspection_completed. */
export function canUserQaApproverApproveAndClose(
  ir: {
    status?: string;
    confirmations?: unknown;
    nominated_team_head_id?: number | null;
  },
  userId: number,
  userRole?: string
): boolean {
  if (ir.status !== 'inspection_completed') return false;
  if (userRole === 'administrator') return true;
  if (userRole !== 'qa_approver' || !userId) return false;
  if (inspectionSkipsPart2Part3(ir)) return true;
  return (
    ir.nominated_team_head_id != null && Number(ir.nominated_team_head_id) === userId
  );
}

/** Team Head – QA (qa_approver) may reject IR after inspector completes (inspection_completed). */
export function canUserQaApproverReject(
  ir: Parameters<typeof canUserQaApproverApproveAndClose>[0],
  userId: number,
  userRole?: string
): boolean {
  return canUserQaApproverApproveAndClose(ir, userId, userRole);
}

/** Team Head – QA send-back on skip-path IRs (any R&QA TH) or nominated path (before assign). */
export function canUserQaApproverSendBack(
  ir: {
    status?: string;
    confirmations?: unknown;
    nominated_team_head_id?: number | null;
    inspector_id?: number | null;
    inspector_ids?: unknown;
  },
  userId: number,
  userRole?: string,
  hasInspectorsAssigned?: boolean
): boolean {
  if (!(QA_APPROVER_SKIP_PATH_STATUSES as readonly string[]).includes(ir.status || '')) {
    return false;
  }
  if (userRole === 'administrator') return true;
  if (userRole !== 'qa_approver' || !userId) return false;
  if (inspectionSkipsPart2Part3(ir)) {
    return (
      ir.status === 'inspection_completed' ||
      !hasInspectorsAssigned
    );
  }
  return (
    ir.nominated_team_head_id != null &&
    Number(ir.nominated_team_head_id) === userId &&
    !hasInspectorsAssigned
  );
}

const PART3_SECTION23_EDIT_STATUSES = ['request_approved', 'assigned', 'in_progress'] as const;

export function part3Section23EditableStatus(status?: string): boolean {
  return (PART3_SECTION23_EDIT_STATUSES as readonly string[]).includes(status || '');
}

/** Section 23 saved or assignee set — show read-only Part III regardless of workflow status. */
export function part3Section23HasSavedData(ir: {
  part3_data?: unknown;
  ordaqa_inspector_id?: number | null;
}): boolean {
  if (ir.ordaqa_inspector_id != null && String(ir.ordaqa_inspector_id).trim() !== '') {
    return true;
  }
  const p3 = parseJsonRecord(ir.part3_data);
  return !!(
    p3.section23_complete ||
    String(p3.memo_returned ?? '').toLowerCase() === 'yes' ||
    String(p3.received_date_time ?? '').trim() ||
    String(p3.ordaqa_comments ?? '').trim() ||
    p3.delegation_type
  );
}

/** ORDAQA Head may complete Section 23 after forward, before assignee is locked in. */
export function canEditPart3Section23(ir: {
  forwarded_to_ordaqa?: boolean | null;
  status?: string;
  ordaqa_inspector_id?: number | null;
}): boolean {
  if (!isForwardedToOrdqa(ir)) return false;
  if (ir.ordaqa_inspector_id != null && String(ir.ordaqa_inspector_id).trim() !== '') {
    return false;
  }
  return part3Section23EditableStatus(ir.status);
}

/** Sections 24–25 fields (Part V UI saves into part3_data alongside Section 23). */
export function effectiveOrdqaPart5Data(ir: { part3_data?: unknown }): Record<string, unknown> {
  const p3 = parseJsonRecord(ir.part3_data);
  return {
    inspection_remarks: p3.inspection_remarks,
    clearance_status: p3.clearance_status,
    dgaqa_inspector_name: p3.dgaqa_inspector_name,
    dgaqa_rep: p3.dgaqa_rep,
    ordaqa_sections_24_25_signature_path: p3.ordaqa_sections_24_25_signature_path,
    delegation_type: p3.delegation_type,
    assigned_delegated_to: p3.assigned_delegated_to,
  };
}

/** User is among Part II assigned R&QA inspector(s). */
export function isUserAssignedPart2Inspector(
  ir: { inspector_id?: number | null; inspector_ids?: unknown },
  userId: number
): boolean {
  if (!userId) return false;
  if (ir.inspector_id != null && Number(ir.inspector_id) === userId) return true;
  return parseInspectorIds(ir.inspector_ids).includes(userId);
}

/** Primary R&QA inspector from Part II assignment (`inspector_id`, else first in `inspector_ids`). */
export function getPrimaryInspectorId(ir: {
  inspector_id?: number | null;
  inspector_ids?: unknown;
}): number | null {
  const ids = parseInspectorIds(ir.inspector_ids);
  if (ids.length > 0) return ids[0];
  const primary = ir.inspector_id;
  if (primary != null) {
    const n = Number(primary);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** ORDAQA path: Part IV only after Part III Section 23 (assignee set). */
export function part3RequiredBeforePart4(ir: {
  forwarded_to_ordaqa?: unknown;
  confirmations?: unknown;
}): boolean {
  if (inspectionSkipsPart2Part3(ir)) return false;
  return jointInspectionRequestedInPart1(ir) || isForwardedToOrdqa(ir);
}

export function part3CompleteForOrdqaWorkflow(ir: {
  part3_data?: unknown;
  ordaqa_inspector_id?: number | null;
}): boolean {
  return part3Section23HasSavedData(ir);
}

/** Part IV blocked until ORDAQA Part III is done (non-ORDAQA IRs are never blocked). */
export function part4BlockedByPart3(ir: {
  forwarded_to_ordaqa?: unknown;
  confirmations?: unknown;
  part3_data?: unknown;
  ordaqa_inspector_id?: number | null;
}): boolean {
  return part3RequiredBeforePart4(ir) && !part3CompleteForOrdqaWorkflow(ir);
}

/** Part IV (R&QA report) — editable only while assigned (before Start Inspection); locked after Part V when ORDAQA path applies. */
export function canUserUpdatePart4(
  ir: {
    inspector_id?: number | null;
    inspector_ids?: unknown;
    status?: string;
    confirmations?: unknown;
    forwarded_to_ordaqa?: boolean | null;
    part3_data?: unknown;
    ordaqa_inspector_id?: number | null;
  },
  userId: number,
  userRole?: string
): boolean {
  if (ordqaPart5Completed(ir)) return false;
  const status = ir.status || '';
  if (inspectionSkipsPart2Part3(ir)) {
    if (!(SKIPPED_PART2_PART4_STATUSES as readonly string[]).includes(status)) return false;
  } else if (status !== 'assigned') {
    return false;
  }
  if (userRole === 'administrator') return true;
  if (inspectionSkipsPart2Part3(ir)) {
    if (!isRqaInspectorEligibleForSkippedParts(ir, userId, userRole)) return false;
    return true;
  }
  if (!userId) return false;
  if (!isUserAssignedPart2Inspector(ir, userId)) return false;
  if (part4BlockedByPart3(ir)) return false;
  return true;
}

/** Reports saved — prerequisites before Start Inspection. */
export function inspectionReadyToStart(ir: {
  part4_data?: unknown;
  part3_data?: unknown;
  forwarded_to_ordaqa?: unknown;
  ordaqa_approver_id?: number | null;
}): boolean {
  if (!inspectionPart4Saved(ir)) return false;
  if (inspectionRequiresOrdqaPart5(ir)) return ordqaPart5Completed(ir);
  return true;
}

/** Start inspection (assigned → in_progress): assigned Part II inspector(s) only. */
export function canUserStartInspection(
  ir: {
    inspector_id?: number | null;
    inspector_ids?: unknown;
    confirmations?: unknown;
    status?: string;
    part4_data?: unknown;
    part3_data?: unknown;
    forwarded_to_ordaqa?: unknown;
    ordaqa_approver_id?: number | null;
  },
  userId: number,
  userRole?: string
): boolean {
  if (ir.status !== 'assigned') return false;
  if (!userId) return false;
  if (inspectionSkipsPart2Part3(ir)) {
    if (!isRqaInspectorEligibleForSkippedParts(ir, userId, userRole)) return false;
  } else if (!isUserAssignedPart2Inspector(ir, userId)) {
    return false;
  }
  return inspectionReadyToStart(ir);
}

/** Complete inspection (in_progress → inspection_completed): assigned Part II inspector(s) only. */
export function canUserCompleteInspection(
  ir: {
    inspector_id?: number | null;
    inspector_ids?: unknown;
    confirmations?: unknown;
    status?: string;
    part4_data?: unknown;
    part3_data?: unknown;
    forwarded_to_ordaqa?: unknown;
    ordaqa_approver_id?: number | null;
  },
  userId: number,
  userRole?: string
): boolean {
  if (ir.status !== 'in_progress') return false;
  if (!userId) return false;
  if (inspectionSkipsPart2Part3(ir)) {
    if (!isRqaInspectorEligibleForSkippedParts(ir, userId, userRole)) return false;
  } else if (!isUserAssignedPart2Inspector(ir, userId)) {
    return false;
  }
  return inspectionReportsReadyForTeamHead(ir);
}

export function inspectionPart4Saved(ir: { part4_data?: unknown }): boolean {
  const p = ir.part4_data;
  if (p == null) return false;
  if (typeof p === 'string') return p.trim() !== '' && p !== '{}';
  if (typeof p === 'object') return Object.keys(p as object).length > 0;
  return false;
}

/** Assignee saved Part V (clearance in part3_data) — pending ORDAQA Head approval. */
export function ordqaPart5Submitted(ir: {
  forwarded_to_ordaqa?: unknown;
  part3_data?: unknown;
}): boolean {
  if (!inspectionRequiresOrdqaPart5(ir)) return false;
  const e = effectiveOrdqaPart5Data(ir);
  return e.clearance_status != null && String(e.clearance_status).trim() !== '';
}

/** ORDAQA Head approved Part V (`approve_part5` workflow). */
export function ordqaPart5Approved(ir: { ordaqa_approver_id?: number | null }): boolean {
  return ir.ordaqa_approver_id != null && String(ir.ordaqa_approver_id).trim() !== '';
}

/** Part V fully complete — submitted by assignee and approved by ORDAQA Head. */
export function ordqaPart5Completed(ir: {
  forwarded_to_ordaqa?: unknown;
  part3_data?: unknown;
  ordaqa_approver_id?: number | null;
}): boolean {
  return ordqaPart5Submitted(ir) && ordqaPart5Approved(ir);
}

/** ORDAQA Head (or admin) may approve Part V after assignee submission. */
export function canUserApproveOrdqaPart5(
  ir: {
    forwarded_to_ordaqa?: unknown;
    part3_data?: unknown;
    ordaqa_approver_id?: number | null;
  },
  userRole?: string
): boolean {
  if (!inspectionRequiresOrdqaPart5(ir)) return false;
  if (ordqaPart5Approved(ir)) return false;
  if (!ordqaPart5Submitted(ir)) return false;
  return userRole === 'ordaqa_head' || userRole === 'administrator';
}

/** ORDAQA Head sent Part V back to the assignee for revision (comment stored in part3_data). */
export function ordqaPart5ReturnedToInspector(ir: { part3_data?: unknown }): boolean {
  const p3 = parseJsonRecord(ir.part3_data);
  const c = p3.part5_head_send_back_comment;
  return c != null && String(c).trim() !== '';
}

export function getPart5HeadSendBackComment(ir: { part3_data?: unknown }): string | null {
  const p3 = parseJsonRecord(ir.part3_data);
  const c = p3.part5_head_send_back_comment;
  if (c == null || !String(c).trim()) return null;
  return String(c).trim();
}

/** ORDAQA Head (or admin) may send Part V back to the assignee after submission, before approval. */
export function canUserOrdqaHeadPart5SendBack(
  ir: Parameters<typeof canUserApproveOrdqaPart5>[0],
  userRole?: string
): boolean {
  return canUserApproveOrdqaPart5(ir, userRole);
}

/** Part IV saved; when ORDAQA, Part V submitted and Head-approved — required before Complete Inspection. */
export function inspectionReportsReadyForTeamHead(ir: {
  part4_data?: unknown;
  part3_data?: unknown;
  forwarded_to_ordaqa?: unknown;
  ordaqa_approver_id?: number | null;
}): boolean {
  if (!inspectionPart4Saved(ir)) return false;
  if (!inspectionRequiresOrdqaPart5(ir)) return true;
  return ordqaPart5Completed(ir);
}
