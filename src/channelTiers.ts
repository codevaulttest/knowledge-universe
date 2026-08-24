import type { ChannelTier } from './types';

export const FREE_TIER_ID = 'tier-free';

// 每个频道固定存在、不可下架/删除的免费档位；订阅它不产生任何付费，是频道免费内容的加入入口
export function freeChannelTier(): ChannelTier {
  return { id: FREE_TIER_ID, name: '免费', price: 0, free: true };
}

// 保证 tiers[0] 恒为免费档；已包含则原样返回，避免重复插入
export function withFreeTier(tiers: ChannelTier[]): ChannelTier[] {
  return tiers.some(tr => tr.free) ? tiers : [freeChannelTier(), ...tiers];
}
