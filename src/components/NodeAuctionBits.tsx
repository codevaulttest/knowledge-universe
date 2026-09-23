import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { useApp } from '../AppContext';
import {
  auctionMyBidState,
  auctionStatus,
  formatAuctionRemaining,
  type AuctionLot,
} from '../auctionConfig';

/** 页面级单个秒级 tick：倒计时统一由父级驱动，避免每行各挂一个定时器。 */
export function useAuctionNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function AuctionCountdown({ lot, now, className }: { lot: AuctionLot; now: number; className?: string }) {
  const { t } = useApp();
  const status = auctionStatus(lot, now);
  if (status === 'ended') {
    return <span className={`auction-countdown auction-countdown--ended${className ? ` ${className}` : ''}`}>{t('已结束')}</span>;
  }
  const target = status === 'upcoming' ? lot.startAt : lot.endAt;
  const { days, hours, minutes, seconds, urgent } = formatAuctionRemaining(target - now);
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const text = days > 0
    ? t('{days} 天 {clock}', { days, clock })
    : clock;
  return (
    <span className={`auction-countdown${urgent ? ' auction-countdown--urgent' : ''}${className ? ` ${className}` : ''}`}>
      <Timer size={13} strokeWidth={2} aria-hidden="true" />
      {status === 'upcoming' ? t('{time} 后开拍', { time: text }) : t('剩 {time}', { time: text })}
    </span>
  );
}

/** 徽章文案与配色由 auctionMyBidState 单点决定，页面不各写一套。 */
export function AuctionStateBadge({ lot, myAddress, now }: { lot: AuctionLot; myAddress: string; now: number }) {
  const { t } = useApp();
  const status = auctionStatus(lot, now);
  const state = auctionMyBidState(lot, myAddress, now);
  if (state === 'leading') return <span className="auction-badge auction-badge--leading">{t('我领先')}</span>;
  if (state === 'outbid') return <span className="auction-badge auction-badge--outbid">{t('已被超过')}</span>;
  if (state === 'won') return <span className="auction-badge auction-badge--won">{t('我已拍得')}</span>;
  if (state === 'lost') return <span className="auction-badge auction-badge--ended">{t('未拍得')}</span>;
  if (status === 'ended') {
    return lot.bids.length === 0
      ? <span className="auction-badge auction-badge--ended">{t('无人出价')}</span>
      : <span className="auction-badge auction-badge--ended">{t('已成交')}</span>;
  }
  if (status === 'upcoming') return <span className="auction-badge auction-badge--ended">{t('即将开拍')}</span>;
  return <span className="auction-badge auction-badge--live">{t('竞拍中')}</span>;
}

/** 出价人展示：我的出价统一显示为「我」。 */
export function auctionBidderText(label: string, myAddress: string, me: string): string {
  return label === myAddress ? me : label;
}
