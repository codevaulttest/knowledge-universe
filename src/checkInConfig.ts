// ════════════════════════════════════════════════════════════════
// 每日签到 / 空投领取 — 配置与逻辑（纯前端 Mock，无后端）
// ----------------------------------------------------------------
// 本模块面向多运营商复用：具体「领取的是什么」由各运营商在此配置，
// 业务规则（递增、封顶、断签）为通用规则，无需各运营商修改。
// ════════════════════════════════════════════════════════════════

/**
 * 运营商可自定义：签到领取的奖励名称与代币种类。
 * - name：活动奖励的展示名称（仅占位）。
 * - symbol：代币种类占位，展示在每个「+数量」之后。不同主 App 奖励不同代币，
 *   接入时改成自己的代币符号/名称即可（如 USDT、积分、星钻等），无需改动其余逻辑。
 */
export const CHECK_IN_REWARD = {
  name: { zh: '空投奖励', en: 'Airdrop Reward' },
  symbol: { zh: 'XXX', en: 'XXX' },
};

/** 连续签到每日奖励封顶（第 10 天起每天最多领 10 个）。 */
export const CHECK_IN_MAX_DAILY = 10;
/** 断签惩罚：中断后扣除的数量。 */
export const CHECK_IN_BREAK_PENALTY = 10;

const STORAGE_KEY = 'ku-checkin';
const DAY_MS = 24 * 60 * 60 * 1000;

export type CheckInState = {
  /** 当前已连续签到的天数（即上次领取时所处的第几天）。 */
  streak: number;
  /** 上次领取日期 YYYY-MM-DD（本地时区）。 */
  lastClaimDate: string;
  /** 累计已领取数量。 */
  balance: number;
};

export type ClaimPreview = {
  /** 今天是否需要弹出签到（当天未领取时为 true）。 */
  shouldShow: boolean;
  /** 今天领取对应连续签到的第几天（断签/首签为 1）。 */
  claimDay: number;
  /** 今天可领取的数量（min(claimDay, 封顶)）。 */
  reward: number;
  /** 是否发生断签。 */
  isBroken: boolean;
  /** 断签扣除的数量（未断签为 0）。 */
  penalty: number;
  /** 领取前的累计余额。 */
  balance: number;
};

/** 本地时区日期键 YYYY-MM-DD。 */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadCheckIn(): CheckInState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckInState>;
    if (typeof parsed.streak !== 'number' || typeof parsed.lastClaimDate !== 'string') return null;
    return {
      streak: parsed.streak,
      lastClaimDate: parsed.lastClaimDate,
      balance: typeof parsed.balance === 'number' ? parsed.balance : 0,
    };
  } catch {
    return null;
  }
}

function saveCheckIn(state: CheckInState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* demo 环境忽略持久化异常 */
  }
}

/** 计算「今天进入时」的签到状态：是否弹窗、可领多少、是否断签。 */
export function getClaimPreview(now: Date = new Date()): ClaimPreview {
  const state = loadCheckIn();
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - DAY_MS));
  const balance = state?.balance ?? 0;

  // 当天已领取 → 不再弹出
  if (state && state.lastClaimDate === today) {
    return {
      shouldShow: false,
      claimDay: state.streak,
      reward: Math.min(state.streak, CHECK_IN_MAX_DAILY),
      isBroken: false,
      penalty: 0,
      balance,
    };
  }

  // 首次签到
  if (!state) {
    return { shouldShow: true, claimDay: 1, reward: 1, isBroken: false, penalty: 0, balance };
  }

  // 连续签到（昨天领过）
  if (state.lastClaimDate === yesterday) {
    const claimDay = state.streak + 1;
    return {
      shouldShow: true,
      claimDay,
      reward: Math.min(claimDay, CHECK_IN_MAX_DAILY),
      isBroken: false,
      penalty: 0,
      balance,
    };
  }

  // 断签 → 从第 1 天重新开始，并扣除惩罚
  return {
    shouldShow: true,
    claimDay: 1,
    reward: 1,
    isBroken: true,
    penalty: CHECK_IN_BREAK_PENALTY,
    balance,
  };
}

/** 执行领取并持久化，返回领取后的新状态。 */
export function commitClaim(preview: ClaimPreview, now: Date = new Date()): CheckInState {
  const next: CheckInState = {
    streak: preview.claimDay,
    lastClaimDate: dayKey(now),
    balance: Math.max(0, preview.balance + preview.reward - preview.penalty),
  };
  saveCheckIn(next);
  return next;
}

/** 仅供演示：清除签到记录以便重新体验弹窗。 */
export function resetCheckIn(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
