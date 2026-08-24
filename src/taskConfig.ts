// ════════════════════════════════════════════════════════════════
// 每日任务（发帖任务 + 互动帖任务）— 配置与结算逻辑（纯前端 Mock，无后端）
// ----------------------------------------------------------------
// 「空投领取比例」只由互动帖任务决定，与发帖任务无关：
// - 互动帖任务：每天对任意帖子做互动（点赞/评论/收藏/踩，任选其一，
//   同一帖子多次操作只算一次）即完成 1 篇，累计达到 TASK_INTERACTION_POOL_SIZE
//   篇即封顶，按阶梯换算成次日领取比例，全部完成对应 100%。
// - 发帖任务：当天是否至少发布过一篇帖子。不影响空投领取比例，
//   而是 BSP 巨星投流每日打赏保底的唯一门槛：昨日发帖，今日才有保底。
// 具体保底比例 / 阶梯步长为产品口径确认值，已做成下方可调常量。
// ════════════════════════════════════════════════════════════════
/** 每日互动帖推荐池大小。 */
export const TASK_INTERACTION_POOL_SIZE = 35;
/** 每日默认领取比例；前 25 次互动每次 +3%，后 10 次每次 +2%。 */
export const TASK_RATIO_BASE = 5;
export const TASK_RATIO_STEP1_COUNT = 25;
export const TASK_RATIO_STEP1 = 3;
export const TASK_RATIO_STEP2_COUNT = 10;
export const TASK_RATIO_STEP2 = 2;
/** 每完成 N 篇触发一次庆祝动效。 */
export const TASK_CELEBRATE_EVERY = 5;
/** 「一发十赞」里程碑：当天发帖 + 互动帖达到该数量，次日凌晨发放奖励。 */
export const TASK_BONUS_THRESHOLD = 10;
/** 「一发十赞」里程碑奖励（荣誉值）。 */
export const TASK_BONUS_PB = 10;

const STORAGE_PREFIX = 'ku-tasks-';
const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyTaskState = {
  date: string;
  /** 当天是否至少发布过一篇帖子。 */
  posted: boolean;
  /** 当天已互动过的帖子 id（去重）。 */
  interactedPostIds: string[];
  /** 达成的一发十赞奖励已在次日凌晨结算的时间。 */
  honorRewardIssuedAt?: string;
};

export type HonorRewardStatus = 'none' | 'pending' | 'issued';

export type TaskDaySnapshot = {
  date: string;
  posted: boolean;
  interactedCount: number;
  /** 互动帖任务对应的领取比例（%，0-100）。 */
  claimRatio: number;
  /** 「一发十赞」里程碑是否达成：当天发帖 + 互动帖数达到 TASK_BONUS_THRESHOLD。 */
  bonusEligible: boolean;
  /** 荣誉值奖励的结算状态。 */
  honorRewardStatus: HonorRewardStatus;
};

/** 每日任务按北京时间结算，避免用户设备所在地影响凌晨发放日。 */
export function taskDayKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function emptyState(date: string): DailyTaskState {
  return { date, posted: false, interactedPostIds: [] };
}

/** 按逐次累进规则将互动帖完成数换算为空投领取比例（%）；与是否发帖无关。 */
export function interactionRatio(count: number): number {
  const n = Math.max(0, Math.min(TASK_INTERACTION_POOL_SIZE, count));
  return TASK_RATIO_BASE
    + Math.min(n, TASK_RATIO_STEP1_COUNT) * TASK_RATIO_STEP1
    + Math.max(0, n - TASK_RATIO_STEP1_COUNT) * TASK_RATIO_STEP2;
}

export function loadTaskState(date: string): DailyTaskState {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + date);
    if (!raw) return emptyState(date);
    const parsed = JSON.parse(raw) as Partial<DailyTaskState>;
    return {
      date,
      posted: !!parsed.posted,
      interactedPostIds: Array.isArray(parsed.interactedPostIds) ? parsed.interactedPostIds : [],
      honorRewardIssuedAt: typeof parsed.honorRewardIssuedAt === 'string' ? parsed.honorRewardIssuedAt : undefined,
    };
  } catch {
    return emptyState(date);
  }
}

function saveTaskState(state: DailyTaskState): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + state.date, JSON.stringify(state));
  } catch {
    /* demo 环境忽略持久化异常 */
  }
}

/** 标记今天已发帖（幂等）。 */
export function markPosted(date: string = taskDayKey()): DailyTaskState {
  const state = loadTaskState(date);
  if (state.posted) return state;
  const next: DailyTaskState = { ...state, posted: true };
  saveTaskState(next);
  return next;
}

/** 标记对某帖子完成一次互动（幂等，重复 postId 不重复计数）。返回新状态与「本次是否新增计数」。 */
export function markInteracted(postId: string, date: string = taskDayKey()): { state: DailyTaskState; added: boolean } {
  const state = loadTaskState(date);
  if (state.interactedPostIds.includes(postId)) return { state, added: false };
  const next: DailyTaskState = {
    ...state,
    interactedPostIds: [...state.interactedPostIds, postId].slice(0, TASK_INTERACTION_POOL_SIZE),
  };
  saveTaskState(next);
  return { state: next, added: true };
}

export function getTaskSnapshot(date: string = taskDayKey()): TaskDaySnapshot {
  const state = loadTaskState(date);
  const interactedCount = state.interactedPostIds.length;
  const bonusEligible = state.posted && interactedCount >= TASK_BONUS_THRESHOLD;
  return {
    date,
    posted: state.posted,
    interactedCount,
    claimRatio: interactionRatio(interactedCount),
    bonusEligible,
    honorRewardStatus: !bonusEligible ? 'none' : state.honorRewardIssuedAt ? 'issued' : 'pending',
  };
}

/** 补结算所有已跨过北京时间零点、但尚未发放的一发十赞奖励。 */
export function settleDueHonorRewards(now: Date = new Date()): string[] {
  const today = taskDayKey(now);
  const settled: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      const date = key.slice(STORAGE_PREFIX.length);
      if (date >= today) continue;
      const state = loadTaskState(date);
      const eligible = state.posted && state.interactedPostIds.length >= TASK_BONUS_THRESHOLD;
      if (!eligible || state.honorRewardIssuedAt) continue;
      saveTaskState({ ...state, honorRewardIssuedAt: now.toISOString() });
      settled.push(date);
    }
  } catch {
    /* demo 环境忽略本地存储异常 */
  }
  return settled;
}

/** 已结算奖励在刷新页面后叠加回演示初始荣誉值余额。 */
export function getIssuedHonorRewardTotal(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      if (loadTaskState(key.slice(STORAGE_PREFIX.length)).honorRewardIssuedAt) total += TASK_BONUS_PB;
    }
  } catch {
    /* demo 环境忽略本地存储异常 */
  }
  return total;
}

/** 「昨天」快照：demo 环境无真实历史数据，若本地无记录则给出一份 seed 快照，保证面板可展示。 */
export function getYesterdaySnapshot(now: Date = new Date()): TaskDaySnapshot {
  const yesterday = taskDayKey(new Date(now.getTime() - DAY_MS));
  const state = loadTaskState(yesterday);
  if (state.posted || state.interactedPostIds.length > 0) {
    return getTaskSnapshot(yesterday);
  }
  // seed：demo 首次打开时展示一份「昨天已发帖 + 完成了大半互动帖」的示例快照，而非全零
  const seedCount = 20;
  return {
    date: yesterday,
    posted: true,
    interactedCount: seedCount,
    claimRatio: interactionRatio(seedCount),
    bonusEligible: true,
    honorRewardStatus: 'issued',
  };
}

export type TaskCalendarDay = {
  date: string;
  day: number;
  /** 是否属于当前展示的自然月（用于灰显上/下月的填充格）。 */
  inCurrentMonth: boolean;
  isToday: boolean;
  /** 未来日期：任务尚未发生，不展示任何数据。 */
  isFuture: boolean;
  snapshot: TaskDaySnapshot | null;
};

/** 日历格使用其格子对应的自然日期，避免新加坡与北京时间的时区换日影响月视图。 */
function calendarDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function seedOrRealSnapshot(date: string, todayKey: string): TaskDaySnapshot {
  const state = loadTaskState(date);
  if (date === todayKey || state.posted || state.interactedPostIds.length > 0) {
    return getTaskSnapshot(date);
  }
  // seed：demo 环境无历史数据时，用一份「隔天有记录」的示例节奏兜底，
  // 其中每 7 个有记录的天里包含 1 天互动满 TASK_INTERACTION_POOL_SIZE，便于日历深色档有样本可看
  const daysAgo = Math.round((new Date(todayKey).getTime() - new Date(date).getTime()) / DAY_MS);
  if (daysAgo % 2 === 1) {
    const seedPattern = [18, 25, 33, TASK_INTERACTION_POOL_SIZE, 20, 28, 15];
    const seedCount = seedPattern[((daysAgo - 1) / 2) % seedPattern.length];
    return {
      date,
      posted: true,
      interactedCount: seedCount,
      claimRatio: interactionRatio(seedCount),
      bonusEligible: seedCount >= TASK_BONUS_THRESHOLD,
      honorRewardStatus: seedCount >= TASK_BONUS_THRESHOLD ? 'issued' : 'none',
    };
  }
  return { date, posted: false, interactedCount: 0, claimRatio: TASK_RATIO_BASE, bonusEligible: false, honorRewardStatus: 'none' };
}

/** 按自然月生成日历格子（含首尾灰显的相邻月填充天），用于历史日历以常见日历样式展示。 */
export function getTaskCalendarMonth(now: Date = new Date()): TaskCalendarDay[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = taskDayKey(now);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  const result: TaskCalendarDay[] = [];

  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(year, month, 1 - (startWeekday - i));
    result.push({ date: calendarDayKey(d), day: d.getDate(), inCurrentMonth: false, isToday: false, isFuture: false, snapshot: null });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const date = calendarDayKey(d);
    const isFuture = date > todayKey;
    result.push({
      date,
      day,
      inCurrentMonth: true,
      isToday: date === todayKey,
      isFuture,
      snapshot: isFuture ? null : seedOrRealSnapshot(date, todayKey),
    });
  }

  const remainder = result.length % 7;
  if (remainder !== 0) {
    for (let i = 1; i <= 7 - remainder; i++) {
      const d = new Date(year, month + 1, i);
      result.push({ date: calendarDayKey(d), day: d.getDate(), inCurrentMonth: false, isToday: false, isFuture: false, snapshot: null });
    }
  }

  return result;
}

/** 仅供演示：清除今天的任务记录以便重新体验任务面板。 */
export function resetTasks(date: string = taskDayKey()): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + date);
  } catch {
    /* ignore */
  }
}

/** 仅供演示：将今天的互动帖完成数直接设为指定值（用于快速演示阶梯比例/庆祝动效，无需真的操作 35 篇帖子）。 */
export function simulateInteractedCount(count: number, date: string = taskDayKey()): DailyTaskState {
  const state = loadTaskState(date);
  const n = Math.max(0, Math.min(TASK_INTERACTION_POOL_SIZE, count));
  const interactedPostIds = Array.from({ length: n }, (_, i) => `sim-${i + 1}`);
  const next: DailyTaskState = { ...state, interactedPostIds };
  saveTaskState(next);
  return next;
}
