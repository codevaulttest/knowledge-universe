import { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight, Crown, Gift, Info, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { BSP_GUARANTEE_MIN_INTERACTIONS } from '../bspConfig';
import { getAirdropDeadline, MOCK_PB_AIRDROP_AMOUNT } from '../mockData';
import { formatTokenAmount } from '../stakeConfig';
import { InteractionTaskSheet, BspTaskSheet } from './TaskPanelSheet';
import { TASK_INTERACTION_POOL_SIZE } from '../taskConfig';

export function AssetOverviewCard() {
  const { t, navigateRoot, walletConnected, airdropClaimed, claimAirdrop, taskSnapshotToday, taskSnapshotYesterday } = useApp();
  const [airdropRuleOpen, setAirdropRuleOpen] = useState(false);
  const [interactionTaskOpen, setInteractionTaskOpen] = useState(false);
  const [bspTaskOpen, setBspTaskOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const airdropMissed = !airdropClaimed && getAirdropDeadline(now) - now <= 0;

  // 今天可领：昨日比例 × 今日空投池（已知）。明天可领：只知比例，池量未知，不换算 PB。
  const todayPb = Math.round(MOCK_PB_AIRDROP_AMOUNT * taskSnapshotYesterday.claimRatio / 100);
  const tomorrowRatio = taskSnapshotToday.claimRatio;
  const interacted = taskSnapshotToday.interactedCount;
  const remaining = Math.max(0, TASK_INTERACTION_POOL_SIZE - interacted);
  const isFull = remaining === 0;
  const progressPct = Math.min(100, (interacted / TASK_INTERACTION_POOL_SIZE) * 100);
  const posted = taskSnapshotToday.posted;
  const guaranteeCount = Math.min(interacted, BSP_GUARANTEE_MIN_INTERACTIONS);
  const guaranteePct = (guaranteeCount / BSP_GUARANTEE_MIN_INTERACTIONS) * 100;
  const bspReady = posted && guaranteeCount >= BSP_GUARANTEE_MIN_INTERACTIONS;

  if (!walletConnected) return null;

  return (
    <>
      <div className="asset-overview-card">
        {/* 今天可以领 */}
        <div className="asset-overview-airdrop-top">
          <div className="asset-overview-airdrop-left">
            <span className="asset-overview-icon-col">
              <span className="asset-overview-airdrop-icon">
                <Gift size={20} strokeWidth={1.8} />
              </span>
            </span>
            <div className="asset-overview-airdrop-info">
              <div className="asset-overview-airdrop-label-row">
                <span className="asset-overview-airdrop-label">
                  {t('今天可以领')}
                </span>
                <button
                  type="button"
                  className="asset-overview-info-btn"
                  onClick={() => setAirdropRuleOpen(true)}
                  aria-label={t('查看空投规则')}
                >
                  <Info size={13} strokeWidth={2} />
                </button>
              </div>
              {airdropClaimed ? (
                <span className="asset-overview-airdrop-badge">{t('今日已领取')}</span>
              ) : airdropMissed ? (
                <span className="asset-overview-airdrop-badge asset-overview-airdrop-badge--missed">
                  {t('今日已错过')}
                </span>
              ) : (
                <>
                  <div className="asset-overview-airdrop-amount">
                    {formatTokenAmount(todayPb)}
                    <span className="asset-overview-airdrop-unit"> PB</span>
                  </div>
                  <span className="asset-overview-airdrop-deadline">
                    {t('请在今晚 10 点前领取')}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="asset-overview-airdrop-claim-col">
            <button
              type="button"
              className={`asset-overview-claim-btn${airdropClaimed || airdropMissed ? ' asset-overview-claim-btn--done' : ''}`}
              onClick={claimAirdrop}
              disabled={airdropClaimed || airdropMissed}
            >
              {airdropClaimed ? t('已领取') : airdropMissed ? t('已错过') : t('领取空投')}
            </button>
          </div>
        </div>

        {/* 今日互动任务 · 决定明天领取比例 */}
        <div className="asset-overview-tomorrow">
          <button
            type="button"
            className="asset-overview-tomorrow-head"
            onClick={() => setInteractionTaskOpen(true)}
            aria-label={t('查看互动帖任务')}
          >
            <span className="asset-overview-icon-col">
              <span className="asset-overview-tomorrow-icon">
                <CalendarClock size={20} strokeWidth={1.8} />
              </span>
            </span>
            <span className="asset-overview-tomorrow-title">{t('今日互动任务 · 决定明天领取比例')}</span>
            <ChevronRight size={15} strokeWidth={2} className="asset-overview-toggle-chevron" />
          </button>

          <div className="asset-overview-tomorrow-body">
            <div className="asset-overview-tomorrow-amount">
              <span className="asset-overview-tomorrow-amount-value">
                {tomorrowRatio}
                <span className="asset-overview-airdrop-unit">%</span>
              </span>
              <span className="asset-overview-tomorrow-max">{t('额度')}</span>
            </div>

            <div className="asset-overview-tomorrow-progress">
              <span className="asset-overview-tomorrow-track">
                <span className="asset-overview-tomorrow-fill" style={{ width: `${progressPct}%` }} />
              </span>
              <span className="asset-overview-tomorrow-caption">
                {t('今天已互动 {count} / {total} 次', { count: interacted, total: TASK_INTERACTION_POOL_SIZE })}
              </span>
            </div>

            <div className="asset-overview-tomorrow-action">
              <span className="asset-overview-tomorrow-hint">
                {isFull
                  ? t('明天可领满额')
                  : t('再完成 {remaining} 次，明天就能领满', { remaining })}
              </span>
              {!isFull && (
                <button
                  type="button"
                  className="asset-overview-go-btn"
                  onClick={() => navigateRoot({ page: 'P0', tab: 0 })}
                >
                  {t('去互动')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BSP 巨星投流任务：发帖 + 保底互动门槛摘要 */}
        <div className="asset-overview-bsp">
          <button
            type="button"
            className="asset-overview-tomorrow-head"
            onClick={() => setBspTaskOpen(true)}
            aria-label={t('查看 BSP 巨星投流任务')}
          >
            <span className="asset-overview-icon-col">
              <span className="asset-overview-bsp-icon">
                <Crown size={20} strokeWidth={1.8} />
              </span>
            </span>
            <span className="asset-overview-tomorrow-title">{t('BSP 巨星投流任务')}</span>
            <ChevronRight size={15} strokeWidth={2} className="asset-overview-toggle-chevron" />
          </button>

          <div className="asset-overview-tomorrow-body">
            <div className="asset-overview-bsp-rows">
              <div className="asset-overview-bsp-row">
                <span className="asset-overview-bsp-row-label">{t('发帖任务')}</span>
                <span className={`asset-overview-bsp-row-value${posted ? ' asset-overview-bsp-row-value--done' : ''}`}>
                  {posted ? t('已发布内容') : t('还没有发布内容')}
                </span>
              </div>
              <div className="asset-overview-bsp-row">
                <span className="asset-overview-bsp-row-label">{t('保底互动门槛')}</span>
                <span className={`asset-overview-bsp-row-value${guaranteeCount >= BSP_GUARANTEE_MIN_INTERACTIONS ? ' asset-overview-bsp-row-value--done' : ''}`}>
                  {t('已互动 {count} / {total} 次', { count: guaranteeCount, total: BSP_GUARANTEE_MIN_INTERACTIONS })}
                </span>
              </div>
            </div>

            <div className="asset-overview-tomorrow-progress">
              <span className="asset-overview-tomorrow-track">
                <span className="asset-overview-tomorrow-fill" style={{ width: `${guaranteePct}%` }} />
              </span>
            </div>

            <p className="asset-overview-bsp-hint">
              {bspReady
                ? t('明日可享 BSP 打赏保底')
                : t('当天发帖且互动满 {min} 次，次日享有打赏保底', { min: BSP_GUARANTEE_MIN_INTERACTIONS })}
            </p>
          </div>
        </div>
      </div>

      {airdropRuleOpen && (
        <div className="sheet-backdrop" onClick={() => setAirdropRuleOpen(false)}>
          <div
            className="payment-sheet pb-info-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('空投规则')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setAirdropRuleOpen(false)}
                aria-label={t('关闭')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="pb-info-sheet-body">
              <p className="pb-info-sheet-para">
                {t('需在北京时间当天 22:00 前点击"领取空投"，逾期未领取则本轮空投作废。')}
              </p>
              <p className="pb-info-sheet-para">
                {t('可领取比例取决于昨日互动帖任务完成度，完成度越高可领取比例越高。')}
              </p>
              <button
                type="button"
                className="bsp-rules-entry"
                onClick={() => { setAirdropRuleOpen(false); setInteractionTaskOpen(true); }}
              >
                <CalendarClock size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
                <span className="bsp-rules-entry-text">{t('查看互动帖任务')}</span>
                <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}

      {interactionTaskOpen && <InteractionTaskSheet onClose={() => setInteractionTaskOpen(false)} />}
      {bspTaskOpen && <BspTaskSheet onClose={() => setBspTaskOpen(false)} />}
    </>
  );
}
