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
  // 无人出价的场次单独点出来：起拍价就能拿下，是最容易促成第一笔出价的信息
  const idleCount = live.filter(lot => lot.bids.length === 0).length;

  return (
    <button
      type="button"
      className="auction-entry-card"
      onClick={() => requireWallet(() => navigate({ page: 'P_NODE_AUCTION' }))}
    >
      <span className="auction-entry-icon"><Gavel size={20} strokeWidth={2} aria-hidden /></span>
      <span className="auction-entry-body">
        <span className="auction-entry-head">
          <span className="auction-entry-title">{t('创世节点竞拍')}</span>
          {soonest && <AuctionCountdown lot={soonest} now={now} className="auction-entry-countdown" />}
        </span>
        <span className="auction-entry-sub">
          {live.length === 0
            ? t('本期竞拍已结束，可查看成交结果')
            : idleCount > 0
              ? t('本期 {count} 席公开竞拍 · {idle} 席无人出价', { count: live.length, idle: idleCount })
              : t('本期 {count} 个席位公开竞拍', { count: live.length })}
        </span>
        {(summary.leadingCount > 0 || summary.outbidCount > 0) && (
          <span className={`auction-entry-mine${summary.outbidCount > 0 ? ' auction-entry-mine--alert' : ''}`}>
            {t('我领先 {leading} 场 · 被超过 {outbid} 场', { leading: summary.leadingCount, outbid: summary.outbidCount })}
          </span>
        )}
      </span>
      <ChevronRight size={16} strokeWidth={2} className="auction-entry-chevron" aria-hidden />
    </button>
  );
}
