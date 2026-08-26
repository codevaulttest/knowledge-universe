import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../AppContext';
import { getAirdropBreakdown, MOCK_AIRDROP_REWARD_CAP, MOCK_PB_AIRDROP_AMOUNT, type AirdropBreakdownKey } from '../mockData';
import { PB_ONCHAIN_FEE_RATE, splitAirdropClaim } from '../walletConfig';
import { formatSupAmount, formatTokenAmount } from '../stakeConfig';
import { TASK_INTERACTION_POOL_SIZE, TASK_RATIO_LADDER_START } from '../taskConfig';

const BREAKDOWN_LABEL_KEY: Record<AirdropBreakdownKey, string> = {
  llsy: '流量收益',
  dssy: '赞助收益',
  dysy: '订阅收益',
  jqbt: '加权补贴',
  oldnum: '历史未领取',
};

/** 领取空投前的确认弹窗：展示今日可领总额的构成明细 + 手续费，确认后才真正发起领取。 */
export function AirdropClaimSheet({ amount, onClose }: { amount: number; onClose: () => void }) {
  const { t, claimAirdrop, taskSnapshotYesterday, airdropClaimRatio, airdropRatioLadderActive } = useApp();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const breakdown = getAirdropBreakdown(amount);
  const { fee } = splitAirdropClaim(amount);
  // 只有阶梯已生效且有昨日记录时才展示算式；其余两种情况恒为 100%，算式退化成一行结果 + 一句注脚
  const ladderApplies = airdropRatioLadderActive && taskSnapshotYesterday !== null;

  const handleConfirm = () => {
    if (status !== 'idle') return;
    setStatus('loading');
    setTimeout(() => {
      claimAirdrop();
      setStatus('done');
      setTimeout(onClose, 700);
    }, 900);
  };

  return (
    <div className="sheet-backdrop" onClick={status === 'loading' ? undefined : onClose}>
      <div className="payment-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('空投收益')}</span>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={status === 'loading'}
            aria-label={t('关闭')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="airdrop-claim-body">
          {/* 算式卡：满额 × 昨日互动比例 = 今日可领，逐行竖排让因果一眼可读，不靠整句文案解释 */}
          <div className="pay-combo-breakdown airdrop-calc">
            {ladderApplies && (
              <>
                <div className="pay-combo-row">
                  <span className="pay-combo-label">{t('满额空投')}</span>
                  <span className="pay-combo-value">{formatTokenAmount(MOCK_PB_AIRDROP_AMOUNT)} PB</span>
                </div>
                <div className="pay-combo-row">
                  <span className="pay-combo-label">
                    {t('昨日互动 {count}/{total} 次', {
                      count: taskSnapshotYesterday.interactedCount,
                      total: TASK_INTERACTION_POOL_SIZE,
                    })}
                  </span>
                  <span className="pay-combo-value airdrop-calc-ratio">× {airdropClaimRatio}%</span>
                </div>
              </>
            )}
            <div className="pay-combo-row pay-combo-row--total airdrop-calc-result">
              <span className="pay-combo-label">{t('今日可领')}</span>
              <span className="pay-combo-value">{formatTokenAmount(amount)} PB</span>
            </div>
            {!ladderApplies && (
              <p className="pay-combo-hint">
                {airdropRatioLadderActive
                  ? t('新用户首日按 100% 发放')
                  : t('{date} 起按昨日互动次数计算，此前所有用户按 100% 发放。', { date: TASK_RATIO_LADDER_START })}
              </p>
            )}
          </div>

          <div className="pay-combo-breakdown">
            <div className="airdrop-source-title">{t('收益构成')}</div>
            {breakdown.map(row => (
              <div className="pay-combo-row" key={row.key}>
                <span className="pay-combo-label">{t(BREAKDOWN_LABEL_KEY[row.key])}</span>
                <span className="pay-combo-value">{formatTokenAmount(row.value)} PB</span>
              </div>
            ))}
            <div className="pay-combo-row airdrop-fee-row">
              <span className="pay-combo-label">{t('Gas 费')}</span>
              <span className="pay-combo-value">{formatSupAmount(fee)} SUP</span>
            </div>
          </div>

          <div className="airdrop-claim-tips">
            <div className="airdrop-claim-tips-title">{t('温馨提示')}</div>
            <p className="airdrop-claim-tips-item">
              {t('1. 您当前收益上限：{cap} PB，可通过提升节点星级提升收益上限。', { cap: formatTokenAmount(MOCK_AIRDROP_REWARD_CAP) })}
            </p>
            <p className="airdrop-claim-tips-item">
              {t('2. PB 是平台公信力指数，平台不予兑换现金，仅可用于平台内部解锁功能使用。')}
            </p>
            <p className="airdrop-claim-tips-item">
              {t('3. 空投即刻领取，Gas 费用比例 {rate}%。', { rate: PB_ONCHAIN_FEE_RATE * 100 })}
            </p>
            <p className="airdrop-claim-tips-item">
              {t('4. 赞助收益、订阅收益统一在下周五一次性累计领取')}
            </p>
          </div>
        </div>

        {status === 'idle' && (
          <button type="button" className="planet-confirm-btn" onClick={handleConfirm}>
            {t('确认领取')}
          </button>
        )}
        {status === 'loading' && (
          <div className="pay-status">
            <span className="spinner" />
            <span>{t('领取中…')}</span>
          </div>
        )}
        {status === 'done' && (
          <div className="pay-status pay-status--done">
            <span className="pay-check">✓</span>
            <span>{t('领取成功，+{amount} PB', { amount: formatTokenAmount(amount) })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
