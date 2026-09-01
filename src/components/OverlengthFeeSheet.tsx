import { X } from 'lucide-react';
import { useApp } from '../AppContext';
import type { PbWalletId } from '../types';
import { PbWalletPicker } from './PbWalletPicker';
import { formatSupAmount, formatTokenAmount } from '../stakeConfig';
import { pbOnchainFee } from '../walletConfig';

/**
 * 发帖超长费确认弹窗：用户明确选择扣款钱包，再由 App.payPb 集中校验并扣款。
 */
export function OverlengthFeeSheet({
  fee,
  wallet,
  onWalletChange,
  onConfirm,
  onClose,
}: {
  fee: number;
  wallet: PbWalletId | null;
  onWalletChange: (wallet: PbWalletId | null) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  // 当前超长费允许的三种 PB 钱包均会产生 SUP Gas。
  const gasFee = pbOnchainFee(fee);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('超长费确认')}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="pay-combo-breakdown">
          <div className="pay-combo-row">
            <span className="pay-combo-label">{t('费用')}</span>
            <span className="pay-combo-value">{formatTokenAmount(fee)} PB</span>
          </div>
          <div className="pay-combo-row">
            <span className="pay-combo-label">{t('Gas 费')}</span>
            <span className="pay-combo-value">{formatSupAmount(gasFee)} SUP</span>
          </div>
        </div>

        <PbWalletPicker
          use="post_overlength"
          amount={fee}
          value={wallet}
          onChange={onWalletChange}
          autoSelect={false}
        />

        <button type="button" className="planet-confirm-btn" onClick={onConfirm} disabled={!wallet}>
          {`${t('确认扣款')} · ${formatTokenAmount(fee)} PB`}
        </button>
      </div>
    </div>
  );
}
