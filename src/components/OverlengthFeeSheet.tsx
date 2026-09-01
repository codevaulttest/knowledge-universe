import { X } from 'lucide-react';
import { useApp } from '../AppContext';
import type { PbWalletId } from '../types';
import { PB_WALLETS } from '../walletConfig';
import { formatTokenAmount } from '../stakeConfig';

/**
 * 发帖超长费确认弹窗：费用与扣款钱包已由调用方按优先级算好，
 * 弹窗只做最终展示 + 确认，不提供手动选钱包（对齐「优先可提取 PB」的自动扣款语义）。
 */
export function OverlengthFeeSheet({
  fee,
  wallet,
  onConfirm,
  onClose,
}: {
  fee: number;
  wallet: PbWalletId;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t, pbWallets } = useApp();
  const meta = PB_WALLETS[wallet];

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
            <span className="pay-combo-label">{t('PB 消耗')}</span>
            <span className="pay-combo-value">{formatTokenAmount(fee)} PB</span>
          </div>
          <div className="pay-combo-row">
            <span className="pay-combo-label">{t('扣款钱包')}</span>
            <span className="pay-combo-value">
              {t(meta.labelKey)} · {t('余额 {amount} {unit}', { amount: formatTokenAmount(pbWallets[wallet]), unit: t(meta.unitKey) })}
            </span>
          </div>
          <p className="pay-combo-hint">
            {t('优先从 PB 余额扣除，不足时按 可提取 → 站内 → 链上 顺序回落')}
          </p>
        </div>

        <button type="button" className="planet-confirm-btn" onClick={onConfirm}>
          {`${t('确认扣款')} · ${formatTokenAmount(fee)} PB`}
        </button>
      </div>
    </div>
  );
}
