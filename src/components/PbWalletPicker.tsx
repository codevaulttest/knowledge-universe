import { useEffect, useState } from 'react';
import { Check, ChevronDown, Wallet } from 'lucide-react';
import { useApp } from '../AppContext';
import type { PbUse, PbWalletId } from '../types';
import { PB_WALLETS } from '../walletConfig';
import { formatTokenAmount } from '../stakeConfig';

/**
 * PB 钱包单选器。默认折叠为一行摘要，点击展开下拉菜单；选中后自动收起。
 * 只负责呈现用途矩阵与选择，扣款始终由 App.payPb 集中执行。
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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const current = options.find(option => option.wallet === value);
    if (!current?.allowed || !current.sufficient) onChange(pickDefaultPbWallet(use, amount));
  }, [amount, onChange, options, pickDefaultPbWallet, use, value]);

  const selectedMeta = value ? PB_WALLETS[value] : null;

  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <button
        type="button"
        className="pb-wallet-trigger"
        aria-expanded={expanded}
        aria-label={t('选择支付钱包')}
        onClick={() => setExpanded(e => !e)}
      >
        <Wallet size={14} strokeWidth={2} className="pb-wallet-trigger-icon" aria-hidden="true" />
        <span className="pb-wallet-trigger-text">
          {selectedMeta
            ? t('用 {wallet} 支付 · 余额 {amount} {unit}', {
                wallet: t(selectedMeta.labelKey),
                amount: formatTokenAmount(pbWallets[value as PbWalletId]),
                unit: t(selectedMeta.unitKey),
              })
            : t('请选择支付钱包')}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`pb-wallet-trigger-chevron planet-node-dropdown-chevron${expanded ? ' planet-node-dropdown-chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <>
          <button
            type="button"
            className="planet-node-dropdown-backdrop"
            aria-hidden
            tabIndex={-1}
            onClick={() => setExpanded(false)}
          />
          <div
            className="planet-node-dropdown-menu"
            style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 10 }}
            role="listbox"
            aria-label={t('选择支付钱包')}
          >
            {options.map(({ wallet, allowed, sufficient }) => {
              const meta = PB_WALLETS[wallet];
              const selectable = allowed && sufficient;
              const isSelected = value === wallet && selectable;
              const description = !allowed
                ? t(meta.useSummaryKey)
                : !sufficient
                  ? t('余额不足，还差 {amount} {unit}', { amount: formatTokenAmount(amount - pbWallets[wallet]), unit: t(meta.unitKey) })
                  : t(meta.sourceKey);
              return (
                <button
                  key={wallet}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`planet-node-dropdown-item planet-node-dropdown-item--wallet${isSelected ? ' planet-node-dropdown-item--active' : ''}`}
                  disabled={!selectable}
                  onClick={() => { if (selectable) { onChange(wallet); setExpanded(false); } }}
                >
                  <span className="planet-node-dropdown-item-leading">
                    {isSelected && <Check size={14} strokeWidth={2.6} aria-hidden="true" />}
                    <span>{t(meta.labelKey)} · {t('余额 {amount} {unit}', { amount: formatTokenAmount(pbWallets[wallet]), unit: t(meta.unitKey) })}</span>
                    {!meta.consumesSup && <span className="stake-tier-option__fee">{t('免 Gas')}</span>}
                  </span>
                  {description && <span className="stake-tier-option__desc">{description}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
