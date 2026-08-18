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
import { dayKey } from './dateUtils';

/** 每日互动帖推荐池大小。 */
export const TASK_INTERACTION_POOL_SIZE = 35;
/** 点赞量 → 次日空投领取比例（%）阶梯表，与运营规则一一对应：10 赞 35%、20 赞 65%、35 赞 100%。 */
export const TASK_INTERACTION_TIERS: { count: number; ratio: number }[] = [
  { count: 10, ratio: 35 },
  { count: 20, ratio: 65 },
  { count: TASK_INTERACTION_POOL_SIZE, ratio: 100 },
];
/** 未达最低阶梯（10 赞）时的领取比例（%）。 */
export const TASK_INTERACTION_BASE_RATIO = 0;
/** 每完成 N 篇触发一次庆祝动效。 */
export const TASK_CELEBRATE_EVERY = 5;
/** 「一发十赞」里程碑：当天发帖 + 互动帖达到该数量即当日到账奖励。 */
export const TASK_BONUS_THRESHOLD = 10;
/** 「一发十赞」里程碑奖励（PB）。 */
export const TASK_BONUS_PB = 10;

const STORAGE_PREFIX = 'ku-tasks-';
const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyTaskState = {
  date: string;
  /** 当天是否至少发布过一篇帖子。 */
  posted: boolean;
  /** 当天已互动过的帖子 id（去重）。 */
  interactedPostIds: string[];
};

export type TaskDaySnapshot = {
  date: string;
  posted: boolean;
  interactedCount: number;
  /** 互动帖任务对应的领取比例（%，0-100）。 */
  claimRatio: number;
  /** 「一发十赞」里程碑是否达成：当天发帖 + 互动帖数达到 TASK_BONUS_THRESHOLD。 */
  bonusEligible: boolean;
};

function emptyState(date: string): DailyTaskState {
  return { date, posted: false, interactedPostIds: [] };
}

/** 按阶梯规则将互动帖完成数换算为空投领取比例（%）；与是否发帖无关。 */
export function interactionRatio(count: number): number {
  const n = Math.max(0, Math.min(TASK_INTERACTION_POOL_SIZE, count));
  let ratio = TASK_INTERACTION_BASE_RATIO;
  for (const tier of TASK_INTERACTION_TIERS) {
    if (n >= tier.count) ratio = tier.ratio;
  }
  return ratio;
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
export function markPosted(date: string = dayKey()): DailyTaskState {
  const state = loadTaskState(date);
  if (state.posted) return state;
  const next: DailyTaskState = { ...state, posted: true };
  saveTaskState(next);
  return next;
}

/** 标记对某帖子完成一次互动（幂等，重复 postId 不重复计数）。返回新状态与「本次是否新增计数」。 */
export function markInteracted(postId: string, date: string = dayKey()): { state: DailyTaskState; added: boolean } {
  const state = loadTaskState(date);
  if (state.interactedPostIds.includes(postId)) return { state, added: false };
  const next: DailyTaskState = {
    ...state,
    interactedPostIds: [...state.interactedPostIds, postId].slice(0, TASK_INTERACTION_POOL_SIZE),
  };
  saveTaskState(next);
  return { state: next, added: true };
}

export function getTaskSnapshot(date: string = dayKey()): TaskDaySnapshot {
  const state = loadTaskState(date);
  const interactedCount = state.interactedPostIds.length;
  return {
    date,
    posted: state.posted,
    interactedCount,
    claimRatio: interactionRatio(interactedCount),
    bonusEligible: state.posted && interactedCount >= TASK_BONUS_THRESHOLD,
  };
}

/** 「昨天」快照：demo 环境无真实历史数据，若本地无记录则给出一份 seed 快照，保证面板可展示。 */
export function getYesterdaySnapshot(now: Date = new Date()): TaskDaySnapshot {
  const yesterday = dayKey(new Date(now.getTime() - DAY_MS));
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

function seedOrRealSnapshot(date: string, todayKey: string): TaskDaySnapshot {
  const state = loadTaskState(date);
  if (date === todayKey || state.posted || state.interactedPostIds.length > 0) {
    return getTaskSnapshot(date);
  }
  // seed：demo 环境无历史数据时，用一份「隔天有记录」的示例节奏兜底
  const daysAgo = Math.round((new Date(todayKey).getTime() - new Date(date).getTime()) / DAY_MS);
  if (daysAgo % 2 === 1) {
    const seedCount = 15 + ((daysAgo * 3) % 20);
    return {
      date,
      posted: true,
      interactedCount: seedCount,
      claimRatio: interactionRatio(seedCount),
      bonusEligible: seedCount >= TASK_BONUS_THRESHOLD,
    };
  }
  return { date, posted: false, interactedCount: 0, claimRatio: TASK_INTERACTION_BASE_RATIO, bonusEligible: false };
}

/** 按自然月生成日历格子（含首尾灰显的相邻月填充天），用于历史日历以常见日历样式展示。 */
export function getTaskCalendarMonth(now: Date = new Date()): TaskCalendarDay[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = dayKey(now);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  const result: TaskCalendarDay[] = [];

  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(year, month, 1 - (startWeekday - i));
    result.push({ date: dayKey(d), day: d.getDate(), inCurrentMonth: false, isToday: false, isFuture: false, snapshot: null });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const date = dayKey(d);
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
      result.push({ date: dayKey(d), day: d.getDate(), inCurrentMonth: false, isToday: false, isFuture: false, snapshot: null });
    }
  }

  return result;
}

/** 仅供演示：清除今天的任务记录以便重新体验任务面板。 */
export function resetTasks(date: string = dayKey()): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + date);
  } catch {
    /* ignore */
  }
}

/** 仅供演示：将今天的互动帖完成数直接设为指定值（用于快速演示阶梯比例/庆祝动效，无需真的操作 35 篇帖子）。 */
export function simulateInteractedCount(count: number, date: string = dayKey()): DailyTaskState {
  const state = loadTaskState(date);
  const n = Math.max(0, Math.min(TASK_INTERACTION_POOL_SIZE, count));
  const interactedPostIds = Array.from({ length: n }, (_, i) => `sim-${i + 1}`);
  const next: DailyTaskState = { ...state, interactedPostIds };
  saveTaskState(next);
  return next;
}
