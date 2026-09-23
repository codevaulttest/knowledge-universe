import type { PbWalletId } from './types';

/**
 * 创世节点竞拍数据层：常量 + 类型 + 纯函数 + mock 构造器。
 * 只做本地演示，不接任何后端。
 *
 * 规则出处：
 * - 起拍价为 20 万 PB + 该节点上月空投额度、最低加价 1 万 PB —— 需求原文
 * - 原持有人固定拿回 20 万 PB（不论成交价高低）—— 2026-09-23 确认
 * 尚未确认的规则集中在下方「待确认」区，UI 一律读常量/纯函数，规则定了只改这里。
 */

// ── 已确认 ──────────────────────────────────────────────
export const AUCTION_START_PB = 200_000;
export const AUCTION_MIN_INCREMENT_PB = 10_000;
export const AUCTION_OWNER_REFUND_PB = 200_000;
export const AUCTION_QUICK_INCREMENTS: readonly number[] = [10_000, 50_000, 100_000];
export const AUCTION_PAGE_SIZE = 20;

/** 起拍价叠加该节点上月空投额度。 */
export const AUCTION_START_INCLUDES_AIRDROP = true;

// ── 待确认（占位，规则落定后改这里即可）──────────────────
/** 成交价高出起拍价的部分去向。 */
export const AUCTION_PREMIUM_DESTINATION: 'burn' | 'platform' | 'undecided' = 'undecided';
/** 结束前若有人出价则延时的分钟数；0 表示不启用，相关文案整体不渲染。 */
export const AUCTION_ANTI_SNIPE_MINUTES = 0;
/** 出价冻结是否收取 Gas 费。 */
export const AUCTION_BID_CHARGES_GAS = false;

// ── 类型 ────────────────────────────────────────────────
export type AuctionLotStatus = 'upcoming' | 'live' | 'ended';
export type AuctionBidState = 'none' | 'leading' | 'outbid' | 'won' | 'lost';

export type AuctionBid = {
  id: string;
  bidderAddress: string;
  bidderLabel: string;
  amount: number;
  createdAt: number;
  /** 出价时扣款的钱包；解冻必须原路退回，不能默认空投钱包。 */
  payWallet: PbWalletId;
  /** 已被超过并解冻退回。 */
  refunded?: boolean;
};

export type AuctionSettlement = {
  finalPricePb: number;
  ownerRefundPb: number;
  premiumPb: number;
  winnerLabel: string | null;
};

export type AuctionLot = {
  id: string;
  /** 演示数据所属期次；每期固定拍卖 50 席。 */
  period: 'current' | 'previous';
  nodeCode: string;
  /** 创世席位号 1–100。 */
  seatNo: number;
  /** 上月考核名次（被淘汰的后 50 名）。 */
  rankLastMonth: number;
  lastMonthAirdropPb: number;
  startPricePb: number;
  currentPricePb: number;
  /** 新 → 旧。 */
  bids: AuctionBid[];
  startAt: number;
  endAt: number;
  previousOwnerLabel: string;
  settled?: AuctionSettlement;
};

// ── 纯函数 ──────────────────────────────────────────────

/** 起拍价构成的唯一出口，UI 禁止硬写 200000。 */
export function auctionStartPrice(lot: Pick<AuctionLot, 'lastMonthAirdropPb'>): number {
  return AUCTION_START_INCLUDES_AIRDROP ? AUCTION_START_PB + lot.lastMonthAirdropPb : AUCTION_START_PB;
}

export function auctionStatus(lot: AuctionLot, now: number): AuctionLotStatus {
  if (now < lot.startAt) return 'upcoming';
  return now >= lot.endAt ? 'ended' : 'live';
}

export function auctionLeadingBid(lot: AuctionLot): AuctionBid | null {
  return lot.bids.find(bid => !bid.refunded) ?? lot.bids[0] ?? null;
}

export function auctionMinNextBid(lot: AuctionLot): number {
  return lot.bids.length === 0 ? lot.startPricePb : lot.currentPricePb + AUCTION_MIN_INCREMENT_PB;
}

/** 驱动所有徽章与按钮文案的唯一判定。 */
export function auctionMyBidState(lot: AuctionLot, myAddress: string, now: number): AuctionBidState {
  const mine = lot.bids.filter(bid => bid.bidderAddress === myAddress);
  if (mine.length === 0) return 'none';
  const leading = auctionLeadingBid(lot);
  const iLead = leading?.bidderAddress === myAddress;
  if (auctionStatus(lot, now) === 'ended') return iLead ? 'won' : 'lost';
  return iLead ? 'leading' : 'outbid';
}

/** 我在该场还被冻结着的 PB。 */
export function auctionMyFrozenPb(lot: AuctionLot, myAddress: string): number {
  return lot.bids
    .filter(bid => bid.bidderAddress === myAddress && !bid.refunded)
    .reduce((sum, bid) => sum + bid.amount, 0);
}

export function auctionFrozenSummary(lots: AuctionLot[], myAddress: string, now: number) {
  let frozenPb = 0;
  let refundedPb = 0;
  let leadingCount = 0;
  let outbidCount = 0;
  let wonCount = 0;
  for (const lot of lots) {
    // 已结束的场次不再占用资金：中拍的已成交，落拍的已退回
    if (auctionStatus(lot, now) !== 'ended') {
      frozenPb += auctionMyFrozenPb(lot, myAddress);
      // 汇总本期仍在竞拍的场次中，已原路退回的历史出价。
      if (lot.period === 'current') {
        refundedPb += lot.bids
          .filter(bid => bid.bidderAddress === myAddress && bid.refunded)
          .reduce((sum, bid) => sum + bid.amount, 0);
      }
    }
    const state = auctionMyBidState(lot, myAddress, now);
    if (state === 'leading') leadingCount += 1;
    if (state === 'outbid') outbidCount += 1;
    if (state === 'won') wonCount += 1;
  }
  return { frozenPb, refundedPb, leadingCount, outbidCount, wonCount };
}

export function auctionSettlement(lot: AuctionLot): AuctionSettlement | null {
  if (lot.settled) return lot.settled;
  const leading = auctionLeadingBid(lot);
  if (!leading) return null;
  return {
    finalPricePb: leading.amount,
    ownerRefundPb: AUCTION_OWNER_REFUND_PB,
    premiumPb: Math.max(0, leading.amount - AUCTION_OWNER_REFUND_PB),
    winnerLabel: leading.bidderLabel,
  };
}

export type AuctionBidRejection = 'ended' | 'not_started' | 'below_min' | 'already_leading';

/** 弹窗与 App 共用同一份校验，避免两边规则漂移。 */
export function validateAuctionBid(input: { lot: AuctionLot; amount: number; now: number; myAddress: string }):
  { ok: true } | { ok: false; reason: AuctionBidRejection } {
  const { lot, amount, now, myAddress } = input;
  const status = auctionStatus(lot, now);
  if (status === 'ended') return { ok: false, reason: 'ended' };
  if (status === 'upcoming') return { ok: false, reason: 'not_started' };
  if (amount < auctionMinNextBid(lot)) {
    return { ok: false, reason: auctionLeadingBid(lot)?.bidderAddress === myAddress ? 'already_leading' : 'below_min' };
  }
  return { ok: true };
}

export function formatAuctionRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    urgent: ms > 0 && ms < 3600_000,
  };
}

// ── mock 构造器 ─────────────────────────────────────────

/** 与 KnowledgePlanetPage 同源的种子随机；此处另存一份，避免数据层反向 import 页面成环。 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const OTHER_BIDDERS = [
  { address: '0x7a41c9d2e6b8f0134c5a9e7d2b6f8a01c3d5e7f9', label: '0x7a41…e7f9' },
  { address: '0x2c68b0d4a1f39e57c8b2d6a04f1e9c73b5a8d2e6', label: '0x2c68…d2e6' },
  { address: '0x9e05f7a3c2d18b46e9a0c4f7d2b5e8a1c6f3b9d0', label: '0x9e05…b9d0' },
  { address: '0x4b93d5e8a7c206f1b4d9e2a5c8f0b3d6e9a2c5f8', label: '0x4b93…c5f8' },
  { address: '0x6f27a9c1d4b83e05f2a7c9d1b4e6a8c0d2f5b7e9', label: '0x6f27…b7e9' },
  { address: '0x1d84e6b2c9a507f3d1b8e4a6c2f9d0b5e7a3c1f6', label: '0x1d84…c1f6' },
];

type LotScript = {
  /** 生成不同出价历史的时间剧本（毫秒）；最终结束时刻由期次统一覆盖。 */
  endOffset: number;
  /** 出价轮数。 */
  rounds: number;
  /** 我在出价历史中的位置：0 = 最高价是我；正数 = 我在第 n 位（已被超过）；undefined = 我没出过价。 */
  myIndex?: number;
  /** 指定当前价（用于演示 6 位数排版）。 */
  currentPrice?: number;
};

/** 12 条手写剧本覆盖全部状态，其余按种子生成。 */
const SCRIPTS: LotScript[] = [
  { endOffset: 3 * DAY, rounds: 0 },
  { endOffset: 47 * MINUTE, rounds: 0 },
  { endOffset: 2 * DAY, rounds: 1 },
  { endOffset: 5 * DAY, rounds: 7 },
  { endOffset: 26 * HOUR, rounds: 4, myIndex: 0 },
  { endOffset: 5 * HOUR, rounds: 6, myIndex: 2 },
  { endOffset: DAY, rounds: 9, currentPrice: 460_000 },
  { endOffset: -2 * HOUR, rounds: 5, myIndex: 0 },
  { endOffset: -DAY, rounds: 6, myIndex: 2 },
  { endOffset: -3 * DAY, rounds: 8 },
  { endOffset: -4 * DAY, rounds: 0 },
  { endOffset: 6 * DAY, rounds: 0 },
];

export function buildInitialAuctionLots(myAddress: string, now: number = Date.now()): AuctionLot[] {
  const rand = mulberry32(20260923);
  const seats = Array.from({ length: 50 }, (_, i) => 51 + i);
  // 洗牌，让席位号与名次不按顺序排布
  for (let i = seats.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [seats[i], seats[j]] = [seats[j], seats[i]];
  }
  // 同一期的所有席位在月初统一开拍；保留上月完整 50 场结果用于演示。
  const today = new Date(now);
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime();
  const previousShift = periodStart - previousStart;
  // 演示假设：同一期 50 席在指定时刻统一结束。
  const commonEnd = now + 4 * DAY + 8 * HOUR;

  const scriptedLots = seats.map((rank, index) => {
    const script: LotScript | undefined = SCRIPTS[index];
    const nodeCode = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('');
    // 名次越靠后空投越少，数据自洽
    const lastMonthAirdropPb = Math.round((90_000 - (rank - 51) * 1_500 - rand() * 8_000) / 100) * 100;
    const startPricePb = auctionStartPrice({ lastMonthAirdropPb });

    const endOffset = script
      ? script.endOffset
      : index % 3 === 0
        ? -(1 + Math.floor(rand() * 9)) * DAY - Math.floor(rand() * 12) * HOUR
        : index % 5 === 0
          ? commonEnd - now
          : 10 * MINUTE + Math.floor(rand() * 7 * DAY);
    const endAt = now + endOffset;
    const startAt = periodStart;
    const rounds = script ? script.rounds : (endOffset < 0 || rand() > 0.35 ? Math.floor(rand() * 7) : 0);

    const bids: AuctionBid[] = [];
    let price = startPricePb;
    const firstBidAt = startAt + Math.floor(rand() * 4 * HOUR);
    const window = Math.max(HOUR, Math.min(now, endAt) - firstBidAt);
    for (let round = 0; round < rounds; round += 1) {
      if (round > 0) price += AUCTION_MIN_INCREMENT_PB * (1 + Math.floor(rand() * 8));
      const fromEnd = rounds - 1 - round;
      const isMine = script?.myIndex !== undefined && fromEnd === script.myIndex;
      const other = OTHER_BIDDERS[(index + round) % OTHER_BIDDERS.length];
      bids.unshift({
        id: `ab${index}-${round}`,
        bidderAddress: isMine ? myAddress : other.address,
        bidderLabel: isMine ? myAddress : other.label,
        amount: price,
        createdAt: firstBidAt + Math.floor((window * (round + 1)) / (rounds + 1)),
        payWallet: isMine ? 'airdrop' : 'onchain',
        refunded: isMine && script?.myIndex !== undefined && script.myIndex > 0 ? true : undefined,
      });
    }
    if (script?.currentPrice && bids.length > 0) {
      bids[0] = { ...bids[0], amount: script.currentPrice };
    }

    const lot: AuctionLot = {
      id: `lot${index + 1}`,
      period: 'current',
      nodeCode,
      seatNo: rank,
      rankLastMonth: rank,
      lastMonthAirdropPb,
      startPricePb,
      currentPricePb: bids.length > 0 ? bids[0].amount : startPricePb,
      bids,
      startAt,
      endAt,
      previousOwnerLabel: OTHER_BIDDERS[(index + 3) % OTHER_BIDDERS.length].label,
    };
    if (endAt <= now) {
      const leading = auctionLeadingBid(lot);
      // 落拍的出价在竞拍结束时就已解冻退回
      lot.bids = lot.bids.map(bid => bid.id === leading?.id ? bid : { ...bid, refunded: true });
      lot.settled = leading
        ? {
            finalPricePb: leading.amount,
            ownerRefundPb: AUCTION_OWNER_REFUND_PB,
            premiumPb: Math.max(0, leading.amount - AUCTION_OWNER_REFUND_PB),
            winnerLabel: leading.bidderLabel,
          }
        : { finalPricePb: 0, ownerRefundPb: 0, premiumPb: 0, winnerLabel: null };
    }
    return lot;
  });

  const previousLots = scriptedLots.map((lot, index) => {
    const other = OTHER_BIDDERS[index % OTHER_BIDDERS.length];
    const nodeCode = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('');
    const bids = lot.bids.map((bid, bidIndex) => {
      // 当前期的参与记录不复制到上期；上期剧本单独保留中拍与未拍得各一场。
      const replaceMine = lot.endAt > now && bid.bidderAddress === myAddress;
      return {
        ...bid,
        bidderAddress: replaceMine ? other.address : bid.bidderAddress,
        bidderLabel: replaceMine ? other.label : bid.bidderLabel,
        payWallet: replaceMine ? 'onchain' as const : bid.payWallet,
        createdAt: bid.createdAt - previousShift,
        refunded: bidIndex > 0,
      };
    });
    const winner = bids[0] ?? null;
    return {
      ...lot,
      id: `previous-${lot.id}`,
      period: 'previous' as const,
      nodeCode,
      seatNo: index + 1,
      startAt: previousStart,
      endAt: commonEnd - previousShift,
      bids,
      settled: winner
        ? {
            finalPricePb: winner.amount,
            ownerRefundPb: AUCTION_OWNER_REFUND_PB,
            premiumPb: Math.max(0, winner.amount - AUCTION_OWNER_REFUND_PB),
            winnerLabel: winner.bidderLabel,
          }
        : { finalPricePb: 0, ownerRefundPb: 0, premiumPb: 0, winnerLabel: null },
    };
  });
  const currentLots = scriptedLots.map((lot, index) => {
    if (lot.endAt > now) return { ...lot, endAt: commonEnd };
    const other = OTHER_BIDDERS[index % OTHER_BIDDERS.length];
    return {
      ...lot,
      endAt: commonEnd,
      // 往期「我拍得／未拍得」剧本留在往期；当前期不重复算作我参与。
      bids: lot.bids.map(bid => bid.bidderAddress === myAddress
        ? { ...bid, bidderAddress: other.address, bidderLabel: other.label, payWallet: 'onchain' as const }
        : bid),
      settled: undefined,
    };
  });
  return [...currentLots, ...previousLots];
}
