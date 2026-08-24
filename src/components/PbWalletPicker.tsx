import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../AppContext';
import type { PbUse, PbWalletId } from '../types';
import { PB_WALLETS } from '../walletConfig';
import { formatTokenAmount } from '../stakeConfig';

/**
 * PB 钱包单选器。它只负责呈现用途矩阵与选择，扣款始终由 App.payPb 集中执行。
 */
export function PbWalletPicker({
  use,
  amount,
  value,
  onChange,
}: {
  use: PbUse;
  amount: number;
  value: PbWalletId | null;
  onChange: (wallet: PbWalletId | null) => void;
}) {
  const { t, pbWallets, getPbWalletOptions, pickDefaultPbWallet } = useApp();
  const options = getPbWalletOptions(use, amount);

  useEffect(() => {
    const current = options.find(option => option.wallet === value);
    if (!current?.allowed || !current.sufficient) onChange(pickDefaultPbWallet(use, amount));
  }, [amount, onChange, options, pickDefaultPbWallet, use, value]);

  return (
    <div className="stake-tier-list" style={{ marginBottom: 16 }} aria-label={t('选择支付钱包')}>
      {options.map(({ wallet, allowed, sufficient }) => {
        const meta = PB_WALLETS[wallet];
        const selectable = allowed && sufficient;
        const isSelected = value === wallet && selectable;
        const description = !allowed
          ? t(meta.useSummaryKey)
          : !sufficient
            ? t('余额不足，还差 {amount} PB', { amount: formatTokenAmount(amount - pbWallets[wallet]) })
            : t(meta.sourceKey);
        return (
          <button
            key={wallet}
            type="button"
            className={`stake-tier-option${isSelected ? ' stake-tier-option--active' : ''}`}
            aria-pressed={isSelected}
            aria-disabled={!selectable}
            onClick={() => { if (selectable) onChange(wallet); }}
          >
            <span className="stake-tier-option__amount">
              {isSelected && <Check size={14} strokeWidth={2.6} aria-hidden="true" />}
              {t(meta.labelKey)} · {formatTokenAmount(pbWallets[wallet])} PB
              {!meta.consumesSup && <span className="stake-tier-option__fee">{t('免 Gas')}</span>}
            </span>
            <span className="stake-tier-option__desc">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
