import type { ReactNode } from 'react';
import { Medal } from 'lucide-react';

const TIER_MEDAL_VARIANTS = ['bronze', 'silver', 'gold'] as const;
export type ChannelTierMedalVariant = (typeof TIER_MEDAL_VARIANTS)[number];

export function channelTierMedalVariant(tierIndex: number): ChannelTierMedalVariant {
  return TIER_MEDAL_VARIANTS[Math.min(2, Math.max(0, tierIndex))] ?? 'bronze';
}

export function channelTierMedalVariantFromName(name: string): ChannelTierMedalVariant {
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
  return (
    <span className={`channel-tier-name channel-tier-name--${variant}${className ? ` ${className}` : ''}`}>
      <ChannelTierMedal tierIndex={tierIndex} name={name} />
      <span className="channel-tier-name-text">
        {name}
        {suffix}
      </span>
    </span>
  );
}
