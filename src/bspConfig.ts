// ════════════════════════════════════════════════════════════════
// BSP 巨星投流（Big Star Plan）— 配置与结算逻辑（纯前端 Mock，无后端）
// ----------------------------------------------------------------
// 本模块面向多运营商复用：单价 / 保底比例 / 周期天数由各运营商在此配置，
// 业务规则（次日生效、发帖触发、不足补足）为通用规则，无需各运营商修改。
// ════════════════════════════════════════════════════════════════
import { dayKey } from './dateUtils';

/** 一个投放单位对应的 PB。与 stakeConfig 的 SUP_COST_BY_TIER[1000] 同为万分之一比例，
 * 但业务口径不同（那是产生节点的 Gas），BSP 独立定义，不复用。 */
export const BSP_UNIT_PB = 1000;
/** 一个投放单位对应的 SUP（Gas）。 */
export const BSP_UNIT_SUP = 0.1;
/** 每投放 1000 PB，每日至少保底的打赏 PB。 */
export const BSP_DAILY_GUARANTEE_PER_UNIT = 3;
/** 推广周期（天）。 */
export const BSP_PERIOD_DAYS = 365;
/** 单次投放数量输入上限（5 位数字）。 */
export const BSP_QTY_MAX = 99999;
export const BSP_QTY_MAX_DIGITS = 5;
/** 非签到来源打赏的实际到账比例。 */
export const BSP_TIP_YIELD_RATE = 0.8;
/** 签到获得的前 N PB 打赏到账为 0。 */
export const BSP_CHECKIN_ZERO_YIELD_PB = 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export type BspBeneficiaryKind = 'self' | 'address';

/** 昨日结算快照（demo：由 seed 数据给定，不做真实时间推演）。 */
export type BspSettlement = {
  date: string;
  /** 当日是否至少发布 1 篇内容——唯一的保底门槛。 */
  posted: boolean;
  /** 打赏方实际支付总额。 */
  tipsGross: number;
  /** 按来源规则折算后受益人实得。 */
  tipsNet: number;
  /** 系统补足差额；未达保底门槛或实得已达保底为 0。 */
  topUp: number;
};

export type BspInvestment = {
  id: string;
  investorAddress: string;
  beneficiaryAddress: string;
  beneficiaryKind: BspBeneficiaryKind;
  units: number;
  /** 支付时的金额快照，避免日后调价导致历史记录漂移。 */
  paidPb: number;
  paidSup: number;
  createdAt: string;
  /** 生效日（次日凌晨），YYYY-MM-DD。 */
  startDate: string;
  /** 到期日，YYYY-MM-DD。 */
  endDate: string;
  status: 'paid' | 'pending';
  lastSettlement?: BspSettlement;
};

/** BSP 巨星投流种子数据：展示多笔投流的交易历史。共用于「知识宇宙」页与全局常驻入口，
 * 保证两处打开的「每日任务」面板对「是否有巨星投流保底」的判断一致。 */
export function buildInitialBspInvestments(myAddress: string): BspInvestment[] {
  const now = new Date();
  const period1 = bspEffectivePeriod(new Date(now.getTime() - 30 * DAY_MS));
  const period2 = bspEffectivePeriod(new Date(now.getTime() - 5 * DAY_MS));
  const period3 = bspEffectivePeriod(new Date(now.getTime() - 350 * DAY_MS));
  return [
    {
      id: 'bsp1',
      investorAddress: myAddress,
      beneficiaryAddress: '0x9c1a2b3d4e5f60718293a4b5c6d7e8f9a0b1c2d',
      beneficiaryKind: 'address',
      units: 10000,
      paidPb: bspPbCost(10000),
      paidSup: bspSupCost(10000),
      createdAt: '2026-07-04 09:00',
      startDate: period1.startDate,
      endDate: period1.endDate,
      status: 'paid',
    },
    {
      id: 'bsp2',
      investorAddress: myAddress,
      beneficiaryAddress: myAddress,
      beneficiaryKind: 'self',
      units: 10000,
      paidPb: bspPbCost(10000),
      paidSup: bspSupCost(10000),
      createdAt: '2026-07-29 09:00',
      startDate: period2.startDate,
      endDate: period2.endDate,
      status: 'paid',
    },
    {
      id: 'bsp3',
      investorAddress: myAddress,
      beneficiaryAddress: myAddress,
      beneficiaryKind: 'self',
      units: 100,
      paidPb: bspPbCost(100),
      paidSup: bspSupCost(100),
      createdAt: '2025-08-19 09:00',
      startDate: period3.startDate,
      endDate: period3.endDate,
      status: 'paid',
    },
  ];
}

export function bspPbCost(units: number): number {
  return units * BSP_UNIT_PB;
}

export function bspSupCost(units: number): number {
  return Number((units * BSP_UNIT_SUP).toFixed(4));
}

export function bspDailyGuarantee(units: number): number {
  return units * BSP_DAILY_GUARANTEE_PER_UNIT;
}

/** 生效期：次日凌晨起 365 天。 */
export function bspEffectivePeriod(from: Date = new Date()): { startDate: string; endDate: string } {
  const start = new Date(from.getTime() + DAY_MS);
  const end = new Date(start.getTime() + (BSP_PERIOD_DAYS - 1) * DAY_MS);
  return { startDate: dayKey(start), endDate: dayKey(end) };
}

/** 剩余天数（含当天），过期为 0。 */
export function bspRemainingDays(endDate: string, now: Date = new Date()): number {
  const end = new Date(`${endDate}T23:59:59`);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

/** 打赏折算：签到前 1000 PB 到账为 0，其余来源到账 80%。 */
export function bspTipNet(checkInFirst1000: number, otherSources: number): number {
  return otherSources * BSP_TIP_YIELD_RATE;
}

/** 核心结算规则：昨日需发帖才有保底；
 * 实得不足保底则补足差额；超过保底不补贴。 */
export function bspSettle(units: number, s: { posted: boolean; tipsNet: number }): { guarantee: number; topUp: number; total: number } {
  const qualifies = s.posted;
  const guarantee = qualifies ? bspDailyGuarantee(units) : 0;
  const topUp = Math.max(0, guarantee - s.tipsNet);
  const total = s.tipsNet + topUp;
  return { guarantee, topUp, total };
}
