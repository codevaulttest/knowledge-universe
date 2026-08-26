import type { PbUse, PbWalletId, SupTransactionReason, SupWalletId } from './types';

export type PbWalletMeta = {
  id: PbWalletId;
  labelKey: string;
  sourceKey: string;
  useSummaryKey: string;
  /** 该钱包支付时 Gas 费从哪个池子出；none = 荣誉值，完全不产生手续费。 */
  supSource: 'none' | 'onchain' | 'site_first';
  /** 余额展示单位；荣誉值不是 PB，不能沿用「PB」文案。 */
  unitKey: string;
};

/** 受限资金优先，避免把荣誉值、站内 PB 长期闲置。 */
export const PB_WALLET_PRIORITY: readonly PbWalletId[] = ['honor', 'onchain', 'station', 'airdrop'];

/** 支付选择器的展示顺序（依会议口述：荣誉值、链上PB、站内PB、空投PB）。 */
export const PB_WALLET_DISPLAY_ORDER: readonly PbWalletId[] = ['honor', 'onchain', 'station', 'airdrop'];

export const PB_WALLETS: Record<PbWalletId, PbWalletMeta> = {
  onchain: {
    id: 'onchain', labelKey: '链上 PB', sourceKey: '链上钱包持有', useSummaryKey: '适用于全部 PB 用途', supSource: 'onchain', unitKey: 'PB',
  },
  station: {
    id: 'station', labelKey: '站内 PB', sourceKey: '创世、钻石节点每月发放', useSummaryKey: '可用于开通频道及节点内互动', supSource: 'site_first', unitKey: 'PB',
  },
  honor: {
    id: 'honor', labelKey: '荣誉值', sourceKey: '每日任务发放', useSummaryKey: '可用于开通频道、BSP 巨星投流、节点升级、转让节点', supSource: 'none', unitKey: '荣誉值',
  },
  airdrop: {
    id: 'airdrop', labelKey: '空投 PB', sourceKey: '空投 50% 到账', useSummaryKey: '适用于全部 PB 用途', supSource: 'site_first', unitKey: 'PB',
  },
};

export function walletConsumesSup(wallet: PbWalletId): boolean {
  return PB_WALLETS[wallet].supSource !== 'none';
}

/** 唯一的用途权限矩阵；新增用途会被 TypeScript 强制补齐。 */
export const PB_USE_ALLOWED_WALLETS: Record<PbUse, readonly PbWalletId[]> = {
  channel_open: ['honor', 'station', 'airdrop', 'onchain'],
  bsp_invest: ['honor', 'airdrop', 'onchain'],
  post: ['station', 'airdrop', 'onchain'],
  like: ['station', 'airdrop', 'onchain'],
  dislike: ['station', 'airdrop', 'onchain'],
  share: ['station', 'airdrop', 'onchain'],
  comment: ['station', 'airdrop', 'onchain'],
  save: ['station', 'airdrop', 'onchain'],
  unlock: ['station', 'airdrop', 'onchain'],
  partner: ['airdrop', 'onchain'],
  channel_subscribe: ['airdrop', 'onchain'],
  purchase: ['airdrop', 'onchain'],
  node_upgrade: ['honor', 'airdrop', 'onchain'],
  node_transfer: ['honor', 'airdrop', 'onchain'],
  // 会议尚未覆盖以下用途，原型先保守仅开放通用 PB。
  tip: ['airdrop', 'onchain'],
};

export function allowedWalletsForUse(use: PbUse): readonly PbWalletId[] {
  return PB_USE_ALLOWED_WALLETS[use];
}

export function isWalletAllowedForUse(wallet: PbWalletId, use: PbUse): boolean {
  return PB_USE_ALLOWED_WALLETS[use].includes(wallet);
}

export function supReasonForPbUse(use: PbUse): SupTransactionReason {
  const map: Record<PbUse, SupTransactionReason> = {
    channel_open: 'channel_open', bsp_invest: 'bsp_invest', post: 'post',
    like: 'like', dislike: 'dislike', share: 'share', comment: 'comment',
    save: 'save', unlock: 'unlock', partner: 'partner',
    channel_subscribe: 'chain_unlock', purchase: 'purchase', tip: 'chain_unlock',
    node_upgrade: 'node_upgrade', node_transfer: 'node_transfer',
  };
  return map[use];
}

export const PB_ONCHAIN_FEE_RATE = 0.0001;
export function pbOnchainFee(amount: number): number {
  return Math.round(amount * PB_ONCHAIN_FEE_RATE * 10000) / 10000;
}

/** 空投领取的链上/站内分账 + 手续费，供领取确认弹窗预览和实际领取共用同一份算法。 */
export function splitAirdropClaim(claimedAmount: number): { onchainAmount: number; airdropAmount: number; fee: number } {
  const onchainAmount = Math.ceil(claimedAmount / 2);
  const airdropAmount = claimedAmount - onchainAmount;
  return { onchainAmount, airdropAmount, fee: pbOnchainFee(onchainAmount) };
}

export const CHANNEL_OPEN_PB_COST = 1000;

/**
 * 一笔 Gas 费只从一个池子出，不跨池拼单。
 * site_first：站内够就扣站内，不够回落链上；onchain：只走链上；none：不产生手续费。
 */
export function resolveSupPool(
  supWallets: Record<SupWalletId, number>,
  source: PbWalletMeta['supSource'],
  amount: number,
): SupWalletId | null {
  if (source === 'none' || amount <= 0) return null;
  if (source === 'onchain') return supWallets.onchain >= amount ? 'onchain' : null;
  if (supWallets.site >= amount) return 'site';
  return supWallets.onchain >= amount ? 'onchain' : null;
}
