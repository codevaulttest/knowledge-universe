import { useState } from 'react';
import { ArrowLeft, Loader2, Minus, Plus, Snowflake } from 'lucide-react';
import { useApp } from '../AppContext';
import {
  AUCTION_BID_CHARGES_GAS,
  AUCTION_MIN_INCREMENT_PB,
  AUCTION_QUICK_INCREMENTS,
  auctionLeadingBid,
  auctionMinNextBid,
  type AuctionLot,
} from '../auctionConfig';
import { formatTokenAmount } from '../stakeConfig';
import { PbWalletPicker } from './PbWalletPicker';
import type { PbWalletId } from '../types';

/**
 * 出价弹窗。lot 由父级从全局状态按 id 取最新，弹窗不留本地副本——
 * 这样别人加价时，已经打开的弹窗也会同步到新的当前价。
 */
export function NodeAuctionBidSheet({
  lot,
  myAddress,
  onClose,
}: {
  lot: AuctionLot;
  myAddress: string;
  onClose: () => void;
}) {
  const { t, placeAuctionBid, showToast, walletConnected, requireWallet } = useApp();
  const minBid = auctionMinNextBid(lot);
  const [amountInput, setAmountInput] = useState(String(minBid));
  const [payWallet, setPayWallet] = useState<PbWalletId | null>(null);
  const [paying, setPaying] = useState(false);

  const amount = parseInt(amountInput, 10) || 0;
  const belowMin = amount < minBid;
  const iLead = auctionLeadingBid(lot)?.bidderAddress === myAddress;

  const handleChange = (value: string) => setAmountInput(value.replace(/\D/g, '').slice(0, 9));
  const handleBlur = () => setAmountInput(String(Math.max(minBid, parseInt(amountInput, 10) || minBid)));
  const bump = (delta: number) => setAmountInput(String(Math.max(minBid, amount + delta)));

  const canPay = !belowMin && !!payWallet && !paying;

  const handlePay = () => {
    if (!walletConnected) {
      requireWallet(() => undefined);
      return;
    }
    if (!canPay || !payWallet) return;
    setPaying(true);
    setTimeout(() => {
      const result = placeAuctionBid({ lotId: lot.id, amount, wallet: payWallet });
      setPaying(false);
      if (!result.ok) {
        showToast(result.reason === 'ended' ? t('本场竞拍已结束') : t('出价未成功，请确认金额与余额'));
        return;
      }
      showToast(result.refundedPb > 0
        ? t('出价成功，{amount} PB 已冻结；上一次冻结的 {refunded} PB 已退回', {
            amount: formatTokenAmount(amount), refunded: formatTokenAmount(result.refundedPb),
          })
        : t('出价成功，{amount} PB 已冻结', { amount: formatTokenAmount(amount) }));
      onClose();
    }, 1200);
  };

  return (
    <div className="sheet-backdrop full-page-flow" onClick={() => !paying && onClose()}>
      <div className="payment-sheet auction-bid-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header sheet-header--centered">
          <button type="button" className="sheet-header-back" onClick={onClose} aria-label={t('返回')} disabled={paying}>
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <span className="sheet-title sheet-title--centered">{t('为创世 #{seat} 出价', { seat: lot.seatNo })}</span>
          <div className="sheet-header-spacer" aria-hidden />
        </div>

        <div className="auction-price-block">
          <span className="auction-price-label">{lot.bids.length > 0 ? t('当前价') : t('起拍价')}</span>
          <span className="auction-price-value">{formatTokenAmount(lot.currentPricePb)} PB</span>
          <span className="auction-price-meta">
            {lot.bids.length > 0
              ? t('已出价 {count} 次 · 下次出价至少 {min} PB', { count: lot.bids.length, min: formatTokenAmount(minBid) })
              : t('第一个出价就能领先')}
          </span>
        </div>

        {iLead && (
          <div className="sup-deposit-warning">
            <span>{t('你目前出价最高。继续加价时，先冻结本次出价金额；成功后，上一笔冻结的 PB 原路退回。')}</span>
          </div>
        )}

        <div className="stake-code-block">
          <div className="stake-code-label-row">
            <span className="stake-code-label">{t('我的出价')}</span>
          </div>
          <div className="create-qty-block">
            <button
              type="button"
              className="create-qty-btn"
              disabled={paying || amount - AUCTION_MIN_INCREMENT_PB < minBid}
              onClick={() => bump(-AUCTION_MIN_INCREMENT_PB)}
              aria-label={t('减少')}
            >
              <Minus size={18} strokeWidth={2} />
            </button>
            <input
              className="create-qty-value auction-bid-input"
              type="text"
              inputMode="numeric"
              value={amountInput}
              onChange={e => handleChange(e.target.value)}
              onBlur={handleBlur}
              disabled={paying}
            />
            <button
              type="button"
              className="create-qty-btn"
              disabled={paying}
              onClick={() => bump(AUCTION_MIN_INCREMENT_PB)}
              aria-label={t('增加')}
            >
              <Plus size={18} strokeWidth={2} />
            </button>
            <span className="bsp-qty-unit">PB</span>
          </div>
          <div className="auction-quick-chips">
            {AUCTION_QUICK_INCREMENTS.map(step => (
              <button key={step} type="button" className="auction-quick-chip" disabled={paying} onClick={() => bump(step)}>
                {t('+{amount}', { amount: formatTokenAmount(step) })}
              </button>
            ))}
          </div>
          {belowMin && (
            <span className="auction-inline-error">{t('至少要出 {min} PB（当前价加 {step}）', {
              min: formatTokenAmount(minBid), step: formatTokenAmount(AUCTION_MIN_INCREMENT_PB),
            })}</span>
          )}
        </div>

        <PbWalletPicker use="node_auction" amount={amount} value={payWallet} onChange={setPayWallet} />

        <div className="planet-upgrade-sep" />

        <div className="planet-upgrade-row">
          <span className="planet-upgrade-row-label">{t('本次冻结')}</span>
          <div className="planet-upgrade-cost">
            <span className="planet-upgrade-cost-num">{formatTokenAmount(amount)}</span>
            <span className="planet-upgrade-cost-unit"> PB</span>
          </div>
        </div>
        {AUCTION_BID_CHARGES_GAS && (
          <div className="planet-upgrade-row">
            <span className="planet-upgrade-row-label">{t('Gas 费')}</span>
            <div className="planet-upgrade-cost">
              <span className="planet-upgrade-cost-num">{formatTokenAmount(amount * 0.0001)}</span>
              <span className="planet-upgrade-cost-unit"> SUP</span>
            </div>
          </div>
        )}

        <div className="create-delay-note">
          <Snowflake size={14} strokeWidth={2} aria-hidden />
          <span>{t('出价后这笔 PB 将被冻结，被他人超过时自动退回。')}</span>
        </div>

        {!payWallet && (
          <div className="sup-deposit-warning"><span>{t('请选择余额充足的钱包')}</span></div>
        )}

        <button type="button" className="planet-confirm-btn" onClick={handlePay} disabled={walletConnected && !canPay}>
          {paying ? <Loader2 size={16} strokeWidth={2} className="planet-spin" /> : walletConnected ? t('确认出价') : t('连接钱包后出价')}
        </button>
      </div>
    </div>
  );
}
