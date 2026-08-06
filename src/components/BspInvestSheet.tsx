import { useState } from 'react';
import { ChevronRight, Info, Loader2, Minus, Plus, ShieldCheck, ShieldX, X } from 'lucide-react';
import { useApp } from '../AppContext';
import {
  BSP_QTY_MAX,
  BSP_QTY_MAX_DIGITS,
  bspDailyGuarantee,
  bspEffectivePeriod,
  bspPbCost,
  bspSupCost,
  type BspInvestment,
} from '../bspConfig';
import { shortenAddress } from '../formatAddress';
import { REGISTERED_TRANSFER_ADDRESSES } from '../pages/KnowledgePlanetPage';
import { formatSupAmount, formatTokenAmount } from '../stakeConfig';

type AddressCheckStatus = '1' | '2' | '3' | '4';
type BeneficiaryMode = 'self' | 'other';

export function BspInvestSheet({
  myAddress,
  forceInsufficient,
  onOpenRules,
  onClose,
  onConfirmed,
}: {
  myAddress: string;
  /** DEV 演示开关：强制走余额不足分支，便于台上一键展示拦截态 */
  forceInsufficient?: boolean;
  onOpenRules: () => void;
  onClose: () => void;
  onConfirmed: (record: BspInvestment) => void;
}) {
  const { t, pbBalance: realPbBalance, supBalance: realSupBalance, deductPb, deductSup, showToast } = useApp();
  const pbBalance = forceInsufficient ? 0 : realPbBalance;
  const supBalance = forceInsufficient ? 0 : realSupBalance;
  const [mode, setMode] = useState<BeneficiaryMode>('self');
  const [addressInput, setAddressInput] = useState('');
  const [addressStatus, setAddressStatus] = useState<AddressCheckStatus>('1');
  const [verifying, setVerifying] = useState(false);
  const [unitsInput, setUnitsInput] = useState('1');
  const [paying, setPaying] = useState(false);

  const units = Math.max(1, Math.min(BSP_QTY_MAX, parseInt(unitsInput, 10) || 0));
  const pbCost = bspPbCost(units);
  const supCost = bspSupCost(units);
  const dailyGuarantee = bspDailyGuarantee(units);
  const { startDate, endDate } = bspEffectivePeriod();

  const pbInsufficient = pbBalance < pbCost;
  const supInsufficient = supBalance < supCost;

  const handleUnitsChange = (value: string) => {
    setUnitsInput(value.replace(/\D/g, '').slice(0, BSP_QTY_MAX_DIGITS));
  };

  const handleUnitsBlur = () => {
    const n = Math.max(1, Math.min(BSP_QTY_MAX, parseInt(unitsInput, 10) || 1));
    setUnitsInput(String(n));
  };

  const handleAddressChange = (value: string) => {
    setAddressInput(value);
    setAddressStatus(value.trim() ? '2' : '1');
  };

  const handlePasteAddress = async () => {
    if (paying) return;
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) handleAddressChange(text);
    } catch {
      // 剪贴板读取失败（权限被拒等）：静默忽略，用户仍可手动输入
    }
  };

  const handleVerifyAddress = () => {
    const address = addressInput.trim().toLowerCase();
    if (!address || verifying) return;
    setVerifying(true);
    setTimeout(() => {
      setAddressStatus(
        address === myAddress.toLowerCase() || REGISTERED_TRANSFER_ADDRESSES.has(address) ? '3' : '4'
      );
      setVerifying(false);
    }, 500);
  };

  const handleSelectMode = (next: BeneficiaryMode) => {
    setMode(next);
    if (next === 'self') {
      setAddressInput('');
      setAddressStatus('1');
    }
  };

  const canPay =
    units >= 1 &&
    units <= BSP_QTY_MAX &&
    (mode === 'self' || addressStatus === '3') &&
    !pbInsufficient &&
    !supInsufficient &&
    !paying;

  const handlePay = () => {
    if (!canPay) return;
    setPaying(true);
    setTimeout(() => {
      deductPb(pbCost, 'bsp_invest');
      deductSup(supCost, 'bsp_invest');
      const beneficiaryAddress = mode === 'self' ? myAddress : addressInput.trim();
      const record: BspInvestment = {
        id: `bsp${Date.now()}`,
        investorAddress: myAddress,
        beneficiaryAddress,
        beneficiaryKind: mode === 'self' || beneficiaryAddress.toLowerCase() === myAddress.toLowerCase() ? 'self' : 'address',
        units,
        paidPb: pbCost,
        paidSup: supCost,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        startDate,
        endDate,
        status: 'paid',
      };
      onConfirmed(record);
      const toastParams = {
        pbCost: formatTokenAmount(pbCost),
        dailyGuarantee: formatTokenAmount(dailyGuarantee),
      };
      if (record.beneficiaryKind === 'self') {
        showToast(t('投流成功，已投放 {pbCost} PB，明日 00:00 起为你保底每日 {dailyGuarantee} PB', toastParams));
      } else {
        showToast(
          t('投流成功，已投放 {pbCost} PB 给 {beneficiary}，明日 00:00 起为该用户保底每日 {dailyGuarantee} PB', {
            ...toastParams,
            beneficiary: shortenAddress(beneficiaryAddress),
          }),
        );
      }
      setPaying(false);
      onClose();
    }, 1400);
  };

  return (
    <div className="sheet-backdrop" onClick={() => !paying && onClose()}>
      <div className="payment-sheet bsp-invest-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('BSP 巨星投流')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')} disabled={paying}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <button
          type="button"
          className="bsp-rules-entry"
          onClick={onOpenRules}
          disabled={paying}
          aria-label={t('了解 BSP 巨星投流规则')}
        >
          <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
          <span className="bsp-rules-entry-text">{t('了解 BSP 巨星投流规则')}</span>
          <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
        </button>

        <div className="stake-code-block">
          <div className="stake-code-label-row">
            <span className="stake-code-label">{t('投放对象')}</span>
          </div>
          <div className="create-scale-toggle">
            <button
              type="button"
              className={`create-scale-tab${mode === 'self' ? ' create-scale-tab--active' : ''}`}
              disabled={paying}
              onClick={() => handleSelectMode('self')}
            >
              {t('投给自己')}
            </button>
            <button
              type="button"
              className={`create-scale-tab${mode === 'other' ? ' create-scale-tab--active' : ''}`}
              disabled={paying}
              onClick={() => handleSelectMode('other')}
            >
              {t('投给他人')}
            </button>
          </div>
        </div>

        {mode === 'self' ? (
          <div className="planet-upgrade-row planet-upgrade-row--address">
            <span className="planet-upgrade-row-label">{t('我的钱包地址')}</span>
            <span className="planet-upgrade-row-value bsp-self-address">{myAddress}</span>
          </div>
        ) : (
          <div className="stake-code-block">
            <div className="stake-code-row">
              <div className="stake-code-input-wrap">
                <input
                  className="stake-code-input"
                  type="text"
                  value={addressInput}
                  onChange={e => handleAddressChange(e.target.value)}
                  placeholder={t('请输入对方钱包地址')}
                  disabled={paying}
                />
                <button type="button" className="stake-code-paste-btn" onClick={handlePasteAddress} disabled={paying}>
                  {t('粘贴')}
                </button>
              </div>
              <button
                type="button"
                className="stake-code-verify-btn"
                onClick={handleVerifyAddress}
                disabled={!addressInput.trim() || verifying || paying}
              >
                {verifying ? <Loader2 size={14} strokeWidth={2} className="planet-spin" /> : t('校验')}
              </button>
            </div>
            {addressStatus === '3' && (
              <span className="stake-code-status stake-code-status--ok">
                <ShieldCheck size={13} strokeWidth={2} />
                {t('地址校验通过')}
              </span>
            )}
            {addressStatus === '4' && (
              <span className="stake-code-status stake-code-status--fail">
                <ShieldX size={13} strokeWidth={2} />
                {t('该地址未在知识宇宙注册，请确认地址是否正确')}
              </span>
            )}
          </div>
        )}

        <div className="stake-code-block">
          <div className="stake-code-label-row">
            <span className="stake-code-label">{t('投放数量')}</span>
          </div>
          <div className="create-qty-block">
            <button
              type="button"
              className="create-qty-btn"
              disabled={paying || units <= 1}
              onClick={() => setUnitsInput(String(Math.max(1, units - 1)))}
              aria-label={t('减少')}
            >
              <Minus size={18} strokeWidth={2} />
            </button>
            <input
              className="create-qty-value bsp-qty-input"
              type="text"
              inputMode="numeric"
              value={unitsInput}
              onChange={e => handleUnitsChange(e.target.value)}
              onBlur={handleUnitsBlur}
              disabled={paying}
            />
            <button
              type="button"
              className="create-qty-btn"
              disabled={paying || units >= BSP_QTY_MAX}
              onClick={() => setUnitsInput(String(Math.min(BSP_QTY_MAX, units + 1)))}
              aria-label={t('增加')}
            >
              <Plus size={18} strokeWidth={2} />
            </button>
            <span className="bsp-qty-unit">{t('× 1000 PB')}</span>
          </div>
        </div>

        <div className="planet-upgrade-sep" />

        <div className="planet-upgrade-row">
          <span className="planet-upgrade-row-label">{t('投放消耗')}</span>
          <div className="planet-upgrade-cost">
            <span className="planet-upgrade-cost-num">{formatTokenAmount(pbCost)}</span>
            <span className="planet-upgrade-cost-unit"> PB</span>
          </div>
        </div>
        <div className="planet-upgrade-row">
          <span className="planet-upgrade-row-label">{t('Gas 费')}</span>
          <div className="planet-upgrade-cost">
            <span className="planet-upgrade-cost-num">{formatSupAmount(supCost)}</span>
            <span className="planet-upgrade-cost-unit"> SUP</span>
          </div>
        </div>

        {pbInsufficient && (
          <div className="sup-deposit-warning">
            <span>
              {t('PB 余额不足，当前 {pbBalance} PB，本次需 {pbCost} PB', { pbBalance: formatTokenAmount(pbBalance), pbCost: formatTokenAmount(pbCost) })}
            </span>
          </div>
        )}
        {!pbInsufficient && supInsufficient && (
          <div className="sup-deposit-warning">
            <span>
              {t('SUP 余额不足，当前 {supBalance} SUP，本次需 {supCost} SUP', { supBalance: formatSupAmount(supBalance), supCost: formatSupAmount(supCost) })}
            </span>
          </div>
        )}

        <div className="create-confirm-card">
          <span className="create-confirm-label">{t('每日打赏保底')}</span>
          <span className="create-confirm-value">{t('{dailyGuarantee} PB / 天', { dailyGuarantee: formatTokenAmount(dailyGuarantee) })}</span>
          <span className="create-confirm-channel">
            {t('支付成功后，次日生效，为期 1 年')}
          </span>
        </div>

        <div className="create-delay-note">
          <Info size={14} strokeWidth={2} aria-hidden />
          <span>
            {t('受益人当天需至少发布 1 篇内容，才触发当日保底。')}
          </span>
        </div>

        <button type="button" className="planet-confirm-btn" onClick={handlePay} disabled={!canPay}>
          {paying ? <Loader2 size={16} strokeWidth={2} className="planet-spin" /> : t('确认支付2')}
        </button>
      </div>
    </div>
  );
}
