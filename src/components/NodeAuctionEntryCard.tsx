import { useMemo } from 'react';
import { ChevronRight, Gavel } from 'lucide-react';
import { useApp } from '../AppContext';
import { AuctionCountdown, useAuctionNow } from './NodeAuctionBits';
import { auctionFrozenSummary, auctionStatus } from '../auctionConfig';
import { MOCK_WALLET_ADDRESS } from '../mockData';

/** 知识宇宙页的竞拍活动入口。游客也能看见活动，点击后再引导连接钱包。 */
export function NodeAuctionEntryCard() {
  const { t, navigate, auctionLots, requireWallet } = useApp();
  const now = useAuctionNow();

  const live = useMemo(
    () => auctionLots.filter(lot => auctionStatus(lot, now) === 'live').sort((a, b) => a.endAt - b.endAt),
    [auctionLots, now],
  );
  const summary = useMemo(() => auctionFrozenSummary(auctionLots, MOCK_WALLET_ADDRESS, now), [auctionLots, now]);
  const soonest = live[0];

  return (
    <button
      type="button"
      className="auction-entry-card"
      onClick={() => requireWallet(() => navigate({ page: 'P_NODE_AUCTION' }))}
    >
      <span className="auction-entry-icon"><Gavel size={20} strokeWidth={2} aria-hidden /></span>
      <span className="auction-entry-body">
        <span className="auction-entry-title">{t('创世节点竞拍')}</span>
        <span className="auction-entry-sub">
          {live.length > 0
            ? t('本期 {count} 个席位公开竞拍', { count: live.length })
            : t('本期竞拍已结束，可查看成交结果')}
        </span>
        {(summary.leadingCount > 0 || summary.outbidCount > 0) && (
          <span className={`auction-entry-mine${summary.outbidCount > 0 ? ' auction-entry-mine--alert' : ''}`}>
            {t('我领先 {leading} 场 · 被超过 {outbid} 场', { leading: summary.leadingCount, outbid: summary.outbidCount })}
          </span>
        )}
      </span>
      {soonest && <AuctionCountdown lot={soonest} now={now} className="auction-entry-countdown" />}
      <ChevronRight size={16} strokeWidth={2} className="auction-entry-chevron" aria-hidden />
    </button>
  );
}
