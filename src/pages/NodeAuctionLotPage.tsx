import { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { PageHeader } from '../components/shared';
import { AuctionCountdown, AuctionStateBadge, useAuctionNow } from '../components/NodeAuctionBits';
import { NodeAuctionBidSheet } from '../components/NodeAuctionBidSheet';
import {
  auctionMyBidState,
  auctionSettlement,
  auctionStatus,
} from '../auctionConfig';
import { MOCK_WALLET_ADDRESS } from '../mockData';
import { formatTokenAmount } from '../stakeConfig';

/** 竞拍详情：节点信息、起拍价构成、完整出价历史、结算结果。 */
export function NodeAuctionLotPage({ lotId }: { lotId: string }) {
  const { t, goBack, canGoBack, auctionLots, settleAuctionLot } = useApp();
  const now = useAuctionNow();
  const [bidOpen, setBidOpen] = useState(false);
  const lot = auctionLots.find(l => l.id === lotId) ?? null;

  useEffect(() => {
    if (lot && !lot.settled && auctionStatus(lot, now) === 'ended') settleAuctionLot(lot.id);
  }, [lot, now, settleAuctionLot]);

  if (!lot) {
    return (
      <div className="page auction-page">
        <PageHeader title={t('竞拍详情')} onBack={canGoBack ? goBack : undefined} />
        <main className="scroll-area auction-scroll">
          <div className="planet-nodes-empty">{t('这场竞拍已经不在列表里了')}</div>
        </main>
      </div>
    );
  }

  const status = auctionStatus(lot, now);
  const state = auctionMyBidState(lot, MOCK_WALLET_ADDRESS, now);
  const settlement = status === 'ended' ? auctionSettlement(lot) : null;
  return (
    <div className="page auction-page">
      <PageHeader title={t('创世 #{seat}', { seat: lot.seatNo })} onBack={canGoBack ? goBack : undefined} />
      <main className="scroll-area auction-scroll">
        <div className="auction-detail-head">
          <div className="auction-lot-head">
            <span className="auction-lot-seat">{t('创世 #{seat}', { seat: lot.seatNo })}</span>
            <span className="auction-lot-code">{lot.nodeCode}</span>
            <AuctionStateBadge lot={lot} myAddress={MOCK_WALLET_ADDRESS} now={now} />
          </div>
          <div className="auction-price-block">
            <span className="auction-price-label">{lot.bids.length > 0 ? t('当前价') : t('起拍价')}</span>
            <span className="auction-price-value">{formatTokenAmount(lot.currentPricePb)} PB</span>
            <AuctionCountdown lot={lot} now={now} />
          </div>
        </div>

        <div className="auction-info-card">
          <InfoRow label={t(lot.period === 'previous' ? '竞拍前考核名次' : '上月考核名次')} value={t('第 {rank} 名', { rank: lot.rankLastMonth })} />
          <InfoRow label={t(lot.period === 'previous' ? '计入起拍价的空投' : '上月空投额度')} value={`${formatTokenAmount(lot.lastMonthAirdropPb)} PB`} />
          <InfoRow label={t('原持有人')} value={lot.previousOwnerLabel} />
        </div>

        {lot.bids.length > 0 && (
          <div className="auction-info-card">
            <InfoRow label={t('起拍价')} value={`${formatTokenAmount(lot.startPricePb)} PB`} />
          </div>
        )}

        {settlement && (
          <div className="auction-info-card auction-settle-card">
            {settlement.winnerLabel ? (
              <>
                <InfoRow label={t('成交价')} value={`${formatTokenAmount(settlement.finalPricePb)} PB`} strong />
                <InfoRow label={t('拍得人')} value={settlement.winnerLabel === MOCK_WALLET_ADDRESS ? t('我') : settlement.winnerLabel} />
                <div className="auction-info-sep" />
                <InfoRow label={t('原持有人获得')} value={`${formatTokenAmount(settlement.ownerRefundPb)} PB`} />
              </>
            ) : (
              <span className="auction-settle-empty">{t('本场无人出价')}</span>
            )}
          </div>
        )}

        <div className="auction-history">
          <span className="auction-history-title">{t('出价记录')}</span>
          {lot.bids.length === 0 ? (
            <span className="auction-history-empty">{t('还没有人出价，第一个出价就能领先')}</span>
          ) : (
            lot.bids.map(bid => {
              const mine = bid.bidderAddress === MOCK_WALLET_ADDRESS;
              return (
                <div key={bid.id} className={`auction-history-row${mine ? ' auction-history-row--mine' : ''}`}>
                  <span className="auction-history-time">{new Date(bid.createdAt).toLocaleString()}</span>
                  <span className="auction-history-bidder">{mine ? t('我') : bid.bidderLabel}</span>
                  <span className="auction-history-amount">{formatTokenAmount(bid.amount)} PB</span>
                  {mine && bid.refunded && <span className="auction-history-tag">{t('已退回')}</span>}
                </div>
              );
            })
          )}
        </div>
      </main>

      {status !== 'ended' && (
        <div className="auction-detail-footer">
          <button type="button" className="planet-confirm-btn" onClick={() => setBidOpen(true)} disabled={status === 'upcoming'}>
            {status === 'upcoming'
              ? t('尚未开拍')
              : state === 'leading' ? t('继续加价') : lot.bids.length > 0 ? t('加价') : t('出价')}
          </button>
        </div>
      )}

      {bidOpen && <NodeAuctionBidSheet lot={lot} myAddress={MOCK_WALLET_ADDRESS} onClose={() => setBidOpen(false)} />}
    </div>
  );
}

function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="auction-info-row">
      <span className="auction-info-label">{label}</span>
      <span className={`auction-info-value${strong ? ' auction-info-value--strong' : ''}`}>{value}</span>
    </div>
  );
}
