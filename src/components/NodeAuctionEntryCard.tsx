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
  const openingLot = auctionLots.find(lot => auctionStatus(lot, now) === 'upcoming');
  const summary = useMemo(() => auctionFrozenSummary(auctionLots, MOCK_WALLET_ADDRESS, now), [auctionLots, now]);
  const currentRoundCount = auctionLots.filter(lot => lot.period === 'current').length;
  const soonest = openingLot ?? live[0];
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
          {openingLot
            ? t('本期 {count} 席统一开拍', { count: currentRoundCount })
            : live.length === 0
            ? t('本期竞拍已结束，可查看成交结果')
            : idleCount > 0
              ? t('{count} 个创世节点正在竞拍，{idle} 个还没人出价。', { count: currentRoundCount, idle: idleCount })
              : t('{count} 个创世节点正在竞拍。', { count: currentRoundCount })}
        </span>
        {(summary.leadingCount > 0 || summary.outbidCount > 0) && (
          <span className={`auction-entry-mine${summary.outbidCount > 0 ? ' auction-entry-mine--alert' : ''}`}>
            {summary.leadingCount > 0 && summary.outbidCount > 0
              ? t('出价领先 {leading} 场 · 出价被超越 {outbid} 场', { leading: summary.leadingCount, outbid: summary.outbidCount })
              : summary.leadingCount > 0
                ? t('出价领先 {count} 场', { count: summary.leadingCount })
                : t('出价被超越 {count} 场', { count: summary.outbidCount })}
          </span>
        )}
      </span>
      <ChevronRight size={16} strokeWidth={2} className="auction-entry-chevron" aria-hidden />
    </button>
  );
}
