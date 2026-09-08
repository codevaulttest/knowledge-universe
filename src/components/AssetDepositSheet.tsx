import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useApp } from '../AppContext';
import { formatSupAmount, formatTokenAmount } from '../stakeConfig';
import { pbOnchainFee } from '../walletConfig';

type AssetKind = 'airdrop' | 'sup';
type AssetAction = 'deposit' | 'withdraw';

/** 可提取 PB / 站内 SUP 的单一充值或提取浮层。站内 PB 明确不可上链，不接入此组件。 */
export function AssetDepositSheet({ action, kind, onClose }: { action: AssetAction; kind: AssetKind; onClose: () => void }) {
  const { t, pbWallets, supWallets, depositAirdropPb, withdrawAirdropPb, depositSiteSup, withdrawSiteSup, showToast } = useApp();
  const [amountInput, setAmountInput] = useState('');
  const [depositing, setDepositing] = useState(false);

  const assetLabel = kind === 'airdrop' ? t('PB') : t('站内 SUP');
  const unit = kind === 'airdrop' ? 'PB' : 'SUP';
  const balance = kind === 'airdrop' ? pbWallets.airdrop : supWallets.site;
  const onchainBalance = kind === 'airdrop' ? pbWallets.onchain : supWallets.onchain;
  const format = kind === 'airdrop' ? formatTokenAmount : formatSupAmount;

  const handleAmountChange = (value: string) => {
    const cleaned = kind === 'airdrop'
      ? value.replace(/[^\d]/g, '')
      : value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    setAmountInput(cleaned);
  };

  const amount = parseFloat(amountInput) || 0;
  const fee = amount > 0 ? pbOnchainFee(amount) : 0;
  const canWithdraw = amount > 0 && amount <= balance;
  const canDeposit = amount > 0 && amount <= onchainBalance;
  const isDeposit = action === 'deposit';

  const handleConfirmDeposit = () => {
    if (depositing || !canDeposit) return;
    setDepositing(true);
    setTimeout(() => {
      if (kind === 'airdrop') depositAirdropPb(amount);
      else depositSiteSup(amount);
      setDepositing(false);
      showToast(t('{asset} 充值成功', { asset: assetLabel }));
      onClose();
    }, 900);
  };

  const handleConfirmWithdraw = () => {
    if (!canWithdraw) return;
    const ok = kind === 'airdrop' ? withdrawAirdropPb(amount) : withdrawSiteSup(amount);
    if (!ok) {
      showToast(t('所选钱包余额不足或不适用于此操作'));
      return;
    }
    showToast(t('{asset} 提取成功，已扣除 {fee} SUP Gas 费', { asset: assetLabel, fee: formatSupAmount(fee) }));
    onClose();
  };

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet sup-deposit-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{assetLabel} {t(isDeposit ? '充值' : '提取')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="sup-deposit-body">
          {!isDeposit && (
            <div className="sup-deposit-row sup-deposit-row--fee">
              <span className="sup-deposit-label">{t('当前余额')}</span>
              <span className="sup-deposit-value">{format(balance)} {unit}</span>
            </div>
          )}

          {isDeposit ? (
            <>
              <p className="sup-deposit-hint">
                {t('从链上账户转入 {asset}，到账后自动计入站内余额', { asset: assetLabel })}
              </p>
              <div className="sup-deposit-row sup-deposit-row--fee">
                <span className="sup-deposit-label">{t('链上余额')}</span>
                <span className="sup-deposit-value">{format(onchainBalance)} {unit}</span>
              </div>
              <div className="stake-code-row">
                <div className="stake-code-input-wrap">
                  <input
                    className="stake-code-input stake-code-input--with-action"
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={e => handleAmountChange(e.target.value)}
                    placeholder={t('请输入到账数量')}
                    disabled={depositing}
                  />
                  <button
                    type="button"
                    className="pb-info-balance-action-btn asset-max-btn"
                    onClick={() => setAmountInput(format(onchainBalance))}
                    aria-label={t('到账最大额度')}
                    disabled={depositing}
                  >
                    {t('最大')}
                  </button>
                </div>
                <span className="bsp-qty-unit">{unit}</span>
              </div>
              <button type="button" className="planet-confirm-btn" disabled={depositing || !canDeposit} onClick={handleConfirmDeposit}>
                {depositing ? <span className="spinner" /> : t('确认充值')}
              </button>
            </>
          ) : (
            <>
              <div className="stake-code-row">
                <div className="stake-code-input-wrap">
                  <input
                    className="stake-code-input stake-code-input--with-action"
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={e => handleAmountChange(e.target.value)}
                    placeholder={t('请输入提取数量')}
                  />
                  <button
                    type="button"
                    className="pb-info-balance-action-btn asset-max-btn"
                    onClick={() => setAmountInput(format(balance))}
                    aria-label={t('提取最大额度')}
                  >
                    {t('最大')}
                  </button>
                </div>
                <span className="bsp-qty-unit">{unit}</span>
              </div>
              <div className="sup-deposit-row sup-deposit-row--fee">
                <span className="sup-deposit-label">{t('Gas 费')}</span>
                <span className="sup-deposit-value">{formatSupAmount(fee)} SUP</span>
              </div>
              <button type="button" className="planet-confirm-btn" disabled={!canWithdraw} onClick={handleConfirmWithdraw}>
                {t('确认提取')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
