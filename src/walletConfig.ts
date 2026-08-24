import type { PbUse, PbWalletId, SupTransactionReason } from './types';

export type PbWalletMeta = {
  id: PbWalletId;
  labelKey: string;
  sourceKey: string;
  useSummaryKey: string;
  consumesSup: boolean;
};

/** 受限资金优先，避免把荣誉值、节点 PB 长期闲置。 */
export const PB_WALLET_PRIORITY: readonly PbWalletId[] = ['honor', 'node', 'site', 'onchain'];

export const PB_WALLETS: Record<PbWalletId, PbWalletMeta> = {
  onchain: {
    id: 'onchain', labelKey: '链上 PB', sourceKey: '链上余额', useSummaryKey: '适用于全部 PB 用途', consumesSup: true,
  },
  site: {
    id: 'site', labelKey: '站内 PB', sourceKey: '空投 50% 到账', useSummaryKey: '适用于全部 PB 用途', consumesSup: true,
  },
  honor: {
    id: 'honor', labelKey: '荣誉值', sourceKey: '每日任务发放', useSummaryKey: '可用于开通频道、BSP 巨星投流', consumesSup: false,
  },
  node: {
    id: 'node', labelKey: '节点 PB', sourceKey: '创世、钻石节点每月发放', useSummaryKey: '可用于开通频道及节点内互动', consumesSup: true,
  },
};

/** 唯一的用途权限矩阵；新增用途会被 TypeScript 强制补齐。 */
export const PB_USE_ALLOWED_WALLETS: Record<PbUse, readonly PbWalletId[]> = {
  channel_open: ['honor', 'node', 'site', 'onchain'],
  bsp_invest: ['honor', 'site', 'onchain'],
  post: ['node', 'site', 'onchain'],
  like: ['node', 'site', 'onchain'],
  dislike: ['node', 'site', 'onchain'],
  share: ['node', 'site', 'onchain'],
  comment: ['node', 'site', 'onchain'],
  save: ['node', 'site', 'onchain'],
  unlock: ['node', 'site', 'onchain'],
  partner: ['site', 'onchain'],
  channel_subscribe: ['site', 'onchain'],
  purchase: ['site', 'onchain'],
  // 会议尚未覆盖以下用途，原型先保守仅开放通用 PB。
  tip: ['site', 'onchain'],
  node_upgrade: ['site', 'onchain'],
  node_transfer: ['site', 'onchain'],
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
    node_upgrade: 'chain_unlock', node_transfer: 'chain_unlock',
  };
  return map[use];
}

export const PB_ONCHAIN_FEE_RATE = 0.0001;
export function pbOnchainFee(amount: number): number {
  return Math.round(amount * PB_ONCHAIN_FEE_RATE * 10000) / 10000;
}

export const CHANNEL_OPEN_PB_COST = 1000;
