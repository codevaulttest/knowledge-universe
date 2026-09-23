import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Info, Snowflake, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader } from '../components/shared';
import { DevPanel } from '../components/DevPanel';
import { AuctionCountdown, AuctionStateBadge, useAuctionNow } from '../components/NodeAuctionBits';
import { NodeAuctionBidSheet } from '../components/NodeAuctionBidSheet';
import {
  AUCTION_MIN_INCREMENT_PB,
  AUCTION_OWNER_REFUND_PB,
  AUCTION_PAGE_SIZE,
  AUCTION_START_PB,
  auctionFrozenSummary,
  auctionMyBidState,
  auctionStatus,
  type AuctionLot,
} from '../auctionConfig';
import { MOCK_WALLET_ADDRESS } from '../mockData';
import { formatTokenAmount } from '../stakeConfig';

type AuctionTab = 'live' | 'ended';

/** 创世节点竞拍列表页。倒计时只在本页挂一个定时器，逐行向下传。 */
export function NodeAuctionPage() {
  const { t, goBack, canGoBack, navigate, auctionLots, settleAuctionLot, simulateAuctionOutbid, resetAuctionDemo, setDemoPbWallets } = useApp();
  const now = useAuctionNow();
  const [tab, setTab] = useState<AuctionTab>('live');
  const [visible, setVisible] = useState(AUCTION_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [bidLotId, setBidLotId] = useState<string | null>(null);

  // 倒计时走完后补算结算结果，避免界面僵在「剩 0 秒」
  useEffect(() => {
    auctionLots
      .filter(lot => !lot.settled && auctionStatus(lot, now) === 'ended')
      .forEach(lot => settleAuctionLot(lot.id));
  }, [auctionLots, now, settleAuctionLot]);

  const { live, ended } = useMemo(() => {
    const live: AuctionLot[] = [];
    const ended: AuctionLot[] = [];
    auctionLots.forEach(lot => (auctionStatus(lot, now) === 'ended' ? ended : live).push(lot));
    // 自己参与（领先或被超过）的场次置顶，方便回来加价；组内仍按结束时间由早到晚
    const mine = (lot: AuctionLot) => (auctionMyBidState(lot, MOCK_WALLET_ADDRESS, now) === 'none' ? 1 : 0);
    live.sort((a, b) => mine(a) - mine(b) || a.endAt - b.endAt);
    ended.sort((a, b) => b.endAt - a.endAt);
    return { live, ended };
  }, [auctionLots, now]);

  const summary = useMemo(() => auctionFrozenSummary(auctionLots, MOCK_WALLET_ADDRESS, now), [auctionLots, now]);
  const list = tab === 'live' ? live : ended;
  const shown = list.slice(0, visible);

  // 接近列表底部时自动追加一页，避免用户需要寻找并点击“加载更多”。
  useEffect(() => {
    const target = loadMoreRef.current;
    const root = target?.closest('.auction-scroll');
    if (!target || !root || visible >= list.length) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(current => Math.min(current + AUCTION_PAGE_SIZE, list.length));
    }, { root, rootMargin: '0px 0px 160px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [list.length, visible]);
  // 竞拍中分段里，自己参与的场次已排在最前；用分组标题把它们和其他场次隔开
  const myCount = tab === 'live'
    ? live.filter(lot => auctionMyBidState(lot, MOCK_WALLET_ADDRESS, now) !== 'none').length
    : 0;
  const bidLot = auctionLots.find(lot => lot.id === bidLotId) ?? null;

  const switchTab = (next: AuctionTab) => { setTab(next); setVisible(AUCTION_PAGE_SIZE); };

  return (
    <div className="page auction-page">
      <PageHeader title={t('创世节点竞拍')} onBack={canGoBack ? goBack : undefined} />
      <main className="scroll-area auction-scroll">
        <button type="button" className="bsp-rules-entry task-panel-rules-entry--neutral" onClick={() => setRulesOpen(true)}>
          <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
          <span className="bsp-rules-entry-text">{t('查看竞拍规则说明')}</span>
          <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
        </button>

        {summary.frozenPb > 0 && (
          <div className="auction-frozen-bar">
            <Snowflake size={14} strokeWidth={2} aria-hidden />
            <span className="auction-frozen-amount">{t('冻结中 {amount} PB', { amount: formatTokenAmount(summary.frozenPb) })}</span>
            <span className="auction-frozen-meta">
              {t('领先 {leading} 场 · 被超过 {outbid} 场', { leading: summary.leadingCount, outbid: summary.outbidCount })}
            </span>
          </div>
        )}

        <div className="create-scale-toggle auction-tabs">
          <button
            type="button"
            className={`create-scale-tab${tab === 'live' ? ' create-scale-tab--active' : ''}`}
            onClick={() => switchTab('live')}
          >
            {t('竞拍中（{count}）', { count: live.length })}
          </button>
          <button
            type="button"
            className={`create-scale-tab${tab === 'ended' ? ' create-scale-tab--active' : ''}`}
            onClick={() => switchTab('ended')}
          >
            {t('已结束（{count}）', { count: ended.length })}
          </button>
        </div>

        {shown.length === 0 ? (
          <div className="planet-nodes-empty">{tab === 'live' ? t('目前没有正在竞拍的节点') : t('还没有已结束的竞拍')}</div>
        ) : (
          <div className="auction-lot-list">
            {shown.map((lot, index) => (
              <Fragment key={lot.id}>
                {myCount > 0 && index === 0 && (
                  <div className="auction-group-title">{t('我参与的（{count}）', { count: myCount })}</div>
                )}
                {myCount > 0 && index === myCount && (
                  <div className="auction-group-title auction-group-title--rest">{t('其他场次')}</div>
                )}
                <AuctionLotRow
                  lot={lot}
                  now={now}
                  onOpen={() => navigate({ page: 'P_NODE_AUCTION_LOT', lotId: lot.id })}
                  onBid={() => setBidLotId(lot.id)}
                />
              </Fragment>
            ))}
          </div>
        )}

        {list.length > shown.length && <div ref={loadMoreRef} className="auction-load-more-sentinel" aria-hidden="true" />}
      </main>

      <DevPanel>
        <button
          type="button"
          className="planet-dev-menu-item"
          onClick={() => {
            const target = live.find(lot => auctionMyBidState(lot, MOCK_WALLET_ADDRESS, now) === 'leading');
            if (target) simulateAuctionOutbid(target.id);
          }}
        >
          <span>{t('模拟被人加价')}</span>
        </button>
        <button type="button" className="planet-dev-menu-item" onClick={() => setDemoPbWallets('auction')}>
          <span>{t('补足竞拍余额')}</span>
        </button>
        <button type="button" className="planet-dev-menu-item" onClick={resetAuctionDemo}>
          <span>{t('重置竞拍数据')}</span>
        </button>
      </DevPanel>

      {bidLot && <NodeAuctionBidSheet lot={bidLot} myAddress={MOCK_WALLET_ADDRESS} onClose={() => setBidLotId(null)} />}
      {rulesOpen && <AuctionRulesSheet onClose={() => setRulesOpen(false)} />}
    </div>
  );
}

function AuctionLotRow({ lot, now, onOpen, onBid }: { lot: AuctionLot; now: number; onOpen: () => void; onBid: () => void }) {
  const { t } = useApp();
  const status = auctionStatus(lot, now);
  const state = auctionMyBidState(lot, MOCK_WALLET_ADDRESS, now);
  const actionLabel = status === 'ended'
    ? t('查看结果')
    : state === 'leading'
      ? t('已领先')
      : lot.bids.length > 0 ? t('加价') : t('出价');

  return (
    <div className="auction-lot-card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}>
      <div className="auction-lot-head">
        <span className="auction-lot-seat">{t('创世 #{seat}', { seat: lot.seatNo })}</span>
        <span className="auction-lot-code">{lot.nodeCode}</span>
        <AuctionStateBadge lot={lot} myAddress={MOCK_WALLET_ADDRESS} now={now} />
      </div>
      <div className="auction-lot-meta">
        {t('上月第 {rank} 名 · 上月空投 {airdrop} PB', { rank: lot.rankLastMonth, airdrop: formatTokenAmount(lot.lastMonthAirdropPb) })}
      </div>
      <div className="auction-lot-price-row">
        <div className="auction-lot-price">
          <span className="auction-lot-price-label">{lot.bids.length > 0 ? t('当前价') : t('起拍价')}</span>
          <span className="auction-lot-price-value">{formatTokenAmount(lot.currentPricePb)} PB</span>
        </div>
        <span className="auction-lot-price-meta">
          {lot.bids.length > 0
            ? t('起拍 {start} · 已出价 {count} 次', { start: formatTokenAmount(lot.startPricePb), count: lot.bids.length })
            : t('还没有人出价')}
        </span>
      </div>
      <div className="auction-lot-foot">
        <AuctionCountdown lot={lot} now={now} />
        <button
          type="button"
          className={`auction-lot-action${state === 'leading' || status === 'ended' ? ' auction-lot-action--quiet' : ''}`}
          onClick={e => { e.stopPropagation(); if (status === 'ended') onOpen(); else onBid(); }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export function AuctionRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('创世节点竞拍规则')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="pb-info-sheet-body">
          <p className="pb-info-sheet-para">{t('每月考核排名末 50 名的创世节点将在次月公开竞拍，出价最高者获得节点。')}</p>
          <p className="pb-info-sheet-para">{t('每个节点的起拍价为 {start} PB 加上该节点上月空投额度，每次加价至少 {step} PB。', {
            start: formatTokenAmount(AUCTION_START_PB), step: formatTokenAmount(AUCTION_MIN_INCREMENT_PB),
          })}</p>
          <p className="pb-info-sheet-para">{t('出价后 PB 暂时冻结；出价被超过或竞拍结束后未拍得时，自动退回原钱包。')}</p>
          <p className="pb-info-sheet-para">{t('竞拍成交后，原持有人固定获得 {refund} PB。', {
            refund: formatTokenAmount(AUCTION_OWNER_REFUND_PB),
          })}</p>
        </div>
      </div>
    </div>
  );
}
