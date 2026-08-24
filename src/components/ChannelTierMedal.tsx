import type { ReactNode } from 'react';
import { Medal } from 'lucide-react';

const TIER_MEDAL_VARIANTS = ['bronze', 'silver', 'gold'] as const;
export type ChannelTierMedalVariant = (typeof TIER_MEDAL_VARIANTS)[number] | 'free';

// tiers[0] 恒为免费档，故 tierIndex 0 固定映射 free，1/2/3 依次映射 铜/银/金
export function channelTierMedalVariant(tierIndex: number): ChannelTierMedalVariant {
  if (tierIndex <= 0) return 'free';
  return TIER_MEDAL_VARIANTS[Math.min(2, tierIndex - 1)] ?? 'bronze';
}

export function channelTierMedalVariantFromName(name: string): ChannelTierMedalVariant {
  if (name.startsWith('免')) return 'free';
  if (name.startsWith('金')) return 'gold';
  if (name.startsWith('银')) return 'silver';
  return 'bronze';
}

export function ChannelTierMedal({
  tierIndex,
  name,
  size = 16,
  className,
}: {
  tierIndex?: number;
  name?: string;
  size?: number;
  className?: string;
}) {
  const variant = tierIndex != null
    ? channelTierMedalVariant(tierIndex)
    : channelTierMedalVariantFromName(name ?? '');
  return (
    <Medal
      size={size}
      strokeWidth={1.75}
      fill="currentColor"
      className={`channel-tier-medal channel-tier-medal--${variant}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    />
  );
}

export function ChannelTierName({
  name,
  tierIndex,
  className,
  suffix,
}: {
  name: string;
  tierIndex?: number;
  className?: string;
  suffix?: ReactNode;
}) {
  const variant = tierIndex != null
    ? channelTierMedalVariant(tierIndex)
    : channelTierMedalVariantFromName(name);
  // 免费档不属于奖牌排名体系，不配图标，纯文字与铜/银/金牌区分
  return (
    <span className={`channel-tier-name channel-tier-name--${variant}${className ? ` ${className}` : ''}`}>
      {variant !== 'free' && <ChannelTierMedal tierIndex={tierIndex} name={name} />}
      <span className="channel-tier-name-text">
        {name}
        {suffix}
      </span>
    </span>
  );
}
