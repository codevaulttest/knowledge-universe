// ════════════════════════════════════════════════════════════════
// 每日任务（发帖任务 + 互动帖任务）— 配置与结算逻辑（纯前端 Mock，无后端）
// ----------------------------------------------------------------
// 「空投领取比例」只由互动帖任务决定，与发帖任务无关：
// - 互动帖任务：系统每天推荐固定数量的「互动帖」，对任意一篇做一次互动
//   （点赞/评论/收藏/踩，任选其一，同一帖子多次操作只算一次）即完成 1 篇，
//   按阶梯换算成次日领取比例，全部完成对应 100%。
// - 发帖任务：当天是否至少发布过一篇帖子。不影响空投领取比例，
//   而是 BSP 巨星投流每日打赏保底的门槛之一（另一门槛见 bspConfig.ts 的
//   BSP_GUARANTEE_MIN_INTERACTIONS：昨日发帖 且 昨日互动帖 ≥ 该数量，
//   今日才有保底）。
// 具体保底比例 / 阶梯步长为产品口径确认值，已做成下方可调常量。
// ════════════════════════════════════════════════════════════════
import { dayKey } from './checkInConfig';

/** 每日互动帖推荐池大小。 */
export const TASK_INTERACTION_POOL_SIZE = 35;
/** 前 N 篇每篇加成比例（%）。 */
export const TASK_INTERACTION_TIER1_COUNT = 25;
export const TASK_INTERACTION_TIER1_STEP = 3;
/** 第 TIER1_COUNT+1 ~ POOL_SIZE 篇每篇加成比例（%）。 */
export const TASK_INTERACTION_TIER2_STEP = 2;
/** 零互动时的保底领取比例（%）。 */
export const TASK_INTERACTION_BASE_RATIO = 5;
/** 每完成 N 篇触发一次庆祝动效。 */
export const TASK_CELEBRATE_EVERY = 5;

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
};

function emptyState(date: string): DailyTaskState {
  return { date, posted: false, interactedPostIds: [] };
}

/** 按阶梯规则将互动帖完成数换算为空投领取比例（%），封顶 100；与是否发帖无关。 */
export function interactionRatio(count: number): number {
  const n = Math.max(0, Math.min(TASK_INTERACTION_POOL_SIZE, count));
  if (n <= 0) return TASK_INTERACTION_BASE_RATIO;
  const tier1 = Math.min(n, TASK_INTERACTION_TIER1_COUNT);
  const tier2 = Math.max(0, n - TASK_INTERACTION_TIER1_COUNT);
  const ratio = TASK_INTERACTION_BASE_RATIO + tier1 * TASK_INTERACTION_TIER1_STEP + tier2 * TASK_INTERACTION_TIER2_STEP;
  return Math.min(100, ratio);
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
  };
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
