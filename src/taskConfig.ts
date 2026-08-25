import { MOCK_PB_AIRDROP_AMOUNT } from './mockData';

// ════════════════════════════════════════════════════════════════
// 每日任务 — 两个互不相关的业务（纯前端 Mock，无后端）
// ----------------------------------------------------------------
// 业务 A：互动帖任务 → 次日空投领取比例。
//   每天对任意帖子做互动（点赞/评论/收藏/踩，任选其一，同一帖子多次
//   操作只算一次）即完成 1 篇，累计达到 TASK_INTERACTION_POOL_SIZE 篇即
//   封顶，按阶梯换算成次日领取比例，全部完成对应 100%。
// 业务 B：一发十赞 → 当日荣誉值签到奖。
//   当天发帖 + 每 TASK_LOT_LIKES_PER_UNIT 个赞为 1 组，每组发放
//   TASK_LOT_HONOR_PER_UNIT 荣誉值；每日可完成组数由已链接节点数决定
//   （每节点 TASK_LOT_UNITS_PER_NODE 组）。与空投领取比例无关。
// 具体比例 / 阶梯步长为产品口径确认值，已做成下方可调常量。
// ════════════════════════════════════════════════════════════════

// ── 业务 A：互动帖任务 → 次日空投领取比例 ──
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
/** 阶梯规则生效日（北京时间日键）；此日之前所有用户按 100% 发放。 */
export const TASK_RATIO_LADDER_START = '2026-09-01';
/** 无昨日记录（今日/昨日注册的新用户）的默认领取比例。 */
export const TASK_NEW_USER_CLAIM_RATIO = 100;

// ── 业务 B：一发十赞 → 荣誉值签到奖 ──
/** 1 组「一发十赞」= 当天发帖 + 该数量个赞。 */
export const TASK_LOT_LIKES_PER_UNIT = 10;
/** 每完成 1 组发放的荣誉值。 */
export const TASK_LOT_HONOR_PER_UNIT = 10;
/** 每个已链接节点每日可完成的组数。 */
export const TASK_LOT_UNITS_PER_NODE = 9;
/** @deprecated 改用 TASK_LOT_LIKES_PER_UNIT */
export const TASK_BONUS_THRESHOLD = TASK_LOT_LIKES_PER_UNIT;
/** @deprecated 改用 TASK_LOT_HONOR_PER_UNIT */
export const TASK_BONUS_PB = TASK_LOT_HONOR_PER_UNIT;

// ── 日历 / 收益 ──
/** 收益哨兵：-1 未结算（不渲染）；0 当天无红包；>0 实际到账 PB。 */
export const TASK_EARNINGS_UNSETTLED = -1;

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
  /** 当天实际领取的空投 PB；未领取/未结算时缺省。 */
  airdropClaimedPb?: number;
};

export type HonorRewardStatus = 'none' | 'pending' | 'issued';

export type TaskDaySnapshot = {
  date: string;
  posted: boolean;
  interactedCount: number;
  /** 互动帖任务对应的领取比例（%，0-100），按当天互动数换算的「赚到的」值。 */
  claimRatio: number;
  /** 当天实际到账的空投收益（PB）。TASK_EARNINGS_UNSETTLED 未结算 / 0 无红包 / >0 金额。 */
  earningsPb: number;
  /** 「一发十赞」里程碑是否达成：当天发帖 + 互动帖数达到 TASK_LOT_LIKES_PER_UNIT。 */
  bonusEligible: boolean;
  /** 荣誉值奖励的结算状态。 */
  honorRewardStatus: HonorRewardStatus;
};

export type LotQuota = {
  /** 已链接的节点数。 */
  nodeCount: number;
  /** 每日可完成的「一发十赞」组数 = nodeCount × TASK_LOT_UNITS_PER_NODE。 */
  units: number;
  /** 组数 × TASK_LOT_LIKES_PER_UNIT。 */
  likes: number;
  /** 组数 × TASK_LOT_HONOR_PER_UNIT。 */
  honor: number;
};

/** 纯函数：已链接节点数 → 当日「一发十赞」配额。 */
export function getLotQuota(nodeCount: number): LotQuota {
  const n = Math.max(0, Math.floor(nodeCount));
  const units = n * TASK_LOT_UNITS_PER_NODE;
  return { nodeCount: n, units, likes: units * TASK_LOT_LIKES_PER_UNIT, honor: units * TASK_LOT_HONOR_PER_UNIT };
}

/** 阶梯规则是否已生效（北京时间 >= TASK_RATIO_LADDER_START）。 */
export function isRatioLadderActive(now: Date = new Date()): boolean {
  return taskDayKey(now) >= TASK_RATIO_LADDER_START;
}

/**
 * 实际可领取比例。
 * 规则优先级：阶梯未生效 → 100%；无昨日记录（新用户）→ 100%；否则用昨日阶梯值。
 */
export function effectiveClaimRatio(yesterday: TaskDaySnapshot | null, now: Date = new Date()): number {
  if (!isRatioLadderActive(now)) return 100;
  if (!yesterday) return TASK_NEW_USER_CLAIM_RATIO;
  return yesterday.claimRatio;
}

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
      airdropClaimedPb: typeof parsed.airdropClaimedPb === 'number' ? parsed.airdropClaimedPb : undefined,
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
  const bonusEligible = state.posted && interactedCount >= TASK_LOT_LIKES_PER_UNIT;
  return {
    date,
    posted: state.posted,
    interactedCount,
    claimRatio: interactionRatio(interactedCount),
    earningsPb: typeof state.airdropClaimedPb === 'number' ? state.airdropClaimedPb : TASK_EARNINGS_UNSETTLED,
    bonusEligible,
    honorRewardStatus: !bonusEligible ? 'none' : state.honorRewardIssuedAt ? 'issued' : 'pending',
  };
}

/** 领取空投时写入当天记录，供日历渲染「当日收益」。 */
export function recordAirdropClaim(amountPb: number, date: string = taskDayKey()): DailyTaskState {
  const state = loadTaskState(date);
  const next: DailyTaskState = { ...state, airdropClaimedPb: amountPb };
  saveTaskState(next);
  return next;
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

/**
 * 「昨天」快照：demo 环境无真实历史数据，若本地无记录则给出一份 seed 快照，保证面板可展示。
 * 返回 null 表示昨日确实无任何记录（新注册用户），供 effectiveClaimRatio 走 D4 新用户分支。
 * opts.forceNewUser 供 DevPanel 演示该分支，跳过 seed。
 */
export function getYesterdaySnapshot(now: Date = new Date(), opts?: { forceNewUser?: boolean }): TaskDaySnapshot | null {
  if (opts?.forceNewUser) return null;
  const yesterday = taskDayKey(new Date(now.getTime() - DAY_MS));
  const state = loadTaskState(yesterday);
  if (state.posted || state.interactedPostIds.length > 0) {
    return getTaskSnapshot(yesterday);
  }
  // seed：demo 首次打开时展示一份「昨天已发帖 + 完成了大半互动帖 + 已领取空投」的示例快照，而非全零
  const seedCount = 20;
  const seedRatio = interactionRatio(seedCount);
  return {
    date: yesterday,
    posted: true,
    interactedCount: seedCount,
    claimRatio: seedRatio,
    earningsPb: Math.round(MOCK_PB_AIRDROP_AMOUNT * seedRatio / 100),
    bonusEligible: true,
    honorRewardStatus: 'issued',
  };
}

export type TaskCalendarDay = {
  date: string;
  /** 1..31，恒属当前展示的自然月。 */
  day: number;
  isToday: boolean;
  /** 未来日期：任务尚未发生，不展示任何数据。 */
  isFuture: boolean;
  snapshot: TaskDaySnapshot | null;
};

export type TaskCalendarMonth = {
  /** 当月 1 号所在的星期列（0=周日），供视图补前置空位保持周几对齐。 */
  leadingBlanks: number;
  /** 月份标题格式化锚点（当月 1 号）。 */
  anchorDate: string;
  /** 长度恒等于当月天数，不含相邻月填充。 */
  days: TaskCalendarDay[];
};

/** 日历格使用其格子对应的自然日期，避免新加坡与北京时间的时区换日影响月视图。 */
function calendarDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** seed 天的当日收益：按每 6 天 1 次「已错过」的节奏兜底，保证 0 状态有样本可看。 */
function seedEarnings(seedIndex: number, ratio: number): number {
  if (seedIndex % 6 === 5) return 0;
  return Math.round(MOCK_PB_AIRDROP_AMOUNT * ratio / 100);
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
    const seedIndex = (daysAgo - 1) / 2;
    const seedCount = seedPattern[seedIndex % seedPattern.length];
    const ratio = interactionRatio(seedCount);
    return {
      date,
      posted: true,
      interactedCount: seedCount,
      claimRatio: ratio,
      earningsPb: seedEarnings(seedIndex, ratio),
      bonusEligible: seedCount >= TASK_LOT_LIKES_PER_UNIT,
      honorRewardStatus: seedCount >= TASK_LOT_LIKES_PER_UNIT ? 'issued' : 'none',
    };
  }
  return {
    date, posted: false, interactedCount: 0, claimRatio: TASK_RATIO_BASE,
    earningsPb: TASK_EARNINGS_UNSETTLED, bonusEligible: false, honorRewardStatus: 'none',
  };
}

/** 按自然月生成日历格子，只含当月 1–31 号；leadingBlanks 供视图补前置空位保持周几对齐。 */
export function getTaskCalendarMonth(now: Date = new Date()): TaskCalendarMonth {
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = taskDayKey(now);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();

  const days: TaskCalendarDay[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const date = calendarDayKey(d);
    const isFuture = date > todayKey;
    days.push({
      date,
      day,
      isToday: date === todayKey,
      isFuture,
      snapshot: isFuture ? null : seedOrRealSnapshot(date, todayKey),
    });
  }

  return { leadingBlanks, anchorDate: calendarDayKey(new Date(year, month, 1)), days };
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
