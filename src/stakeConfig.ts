import type { Post, StakeTier } from './types';

export const STAKE_TIERS: StakeTier[] = [0, 10, 100, 1000];

export const SUPER_BY_TIER: Record<Exclude<StakeTier, 0>, number> = {
  10: 1,
  100: 10,
  1000: 100,
};

export function postHasStake(post: Pick<Post, 'isNode' | 'stakeTier'>): boolean {
  return post.isNode && (post.stakeTier ?? 0) > 0;
}

export function formatSuperAmount(amount: number): string {
  return String(amount);
}

export function stakeTierDescription(tier: StakeTier, zh: boolean): string {
  if (tier === 0) {
    return zh ? '不创建知识星球节点，内容全公开' : 'No node; content fully public';
  }
  if (tier === 10) {
    return zh
      ? '红包上限 10 PB（1 倍）· 不支持升级'
      : 'Red packet cap 10 PB (1×) · No upgrade';
  }
  if (tier === 100) {
    return zh
      ? '红包上限 500 PB（5 倍）· 不支持升级'
      : 'Red packet cap 500 PB (5×) · No upgrade';
  }
  return zh
    ? '红包无上限 · 支持升至 5 星'
    : 'Unlimited red packet · Upgradable to 5 stars';
}

export function stakeTierLabel(tier: StakeTier, zh: boolean): string {
  if (tier === 0) return zh ? '不加入' : 'Skip';
  return `${tier} PB`;
}
