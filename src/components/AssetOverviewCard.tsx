import { useEffect, useState } from 'react';
import { CalendarCheck, Check, ChevronRight, Circle, Gift, Info, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { getAirdropDeadline, MOCK_PB_AIRDROP_AMOUNT } from '../mockData';
import { formatTokenAmount } from '../stakeConfig';
import { DailyTaskSheet } from './DailyTaskSheet';
import { TASK_INTERACTION_POOL_SIZE } from '../taskConfig';

export function AssetOverviewCard({ hasBspRecords = false }: { hasBspRecords?: boolean }) {
  const { t, walletConnected, airdropClaimed, claimAirdrop, taskSnapshotToday, taskSnapshotYesterday } = useApp();
  const [airdropRuleOpen, setAirdropRuleOpen] = useState(false);
  const [dailyTaskOpen, setDailyTaskOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const airdropMissed = !airdropClaimed && getAirdropDeadline(now) - now <= 0;

  // 今天可领：昨日比例 × 今日空投池（已知）。明天可领：只知比例，池量未知，不换算 PB。
  const todayPb = Math.round(MOCK_PB_AIRDROP_AMOUNT * taskSnapshotYesterday.claimRatio / 100);
  const interacted = taskSnapshotToday.interactedCount;
  const isFull = interacted >= TASK_INTERACTION_POOL_SIZE;
  const posted = taskSnapshotToday.posted;

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
              <div className="asset-overview-airdrop-amount-row">
                {airdropClaimed ? (
                  <span className="asset-overview-airdrop-badge">{t('今日已领取')}</span>
                ) : airdropMissed ? (
                  <span className="asset-overview-airdrop-badge asset-overview-airdrop-badge--missed">
                    {t('今日已错过')}
                  </span>
                ) : (
                  <div className="asset-overview-airdrop-amount">
                    {formatTokenAmount(todayPb)}
                    <span className="asset-overview-airdrop-unit"> PB</span>
                  </div>
                )}
                <button
                  type="button"
                  className={`asset-overview-claim-btn${airdropClaimed || airdropMissed ? ' asset-overview-claim-btn--done' : ''}`}
                  onClick={claimAirdrop}
                  disabled={airdropClaimed || airdropMissed}
                >
                  {airdropClaimed ? t('已领取') : airdropMissed ? t('已错过') : t('领取空投')}
                </button>
              </div>
              {!airdropClaimed && !airdropMissed && (
                <span className="asset-overview-airdrop-deadline">
                  {t('请在今晚 10 点前领取')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 每日任务：互动进度条决定荣誉值里程碑与次日空投比例 */}
        <div className="asset-overview-tomorrow">
          <button
            type="button"
            className="asset-overview-tomorrow-head"
            onClick={() => setDailyTaskOpen(true)}
            aria-label={t('查看每日任务')}
          >
            <CalendarCheck size={15} strokeWidth={1.9} className="asset-overview-tomorrow-head-icon" aria-hidden="true" />
            <span className="asset-overview-tomorrow-title">{t('今日任务')}</span>

            <span className="asset-overview-tomorrow-head-status">
              <span className={`asset-overview-post-status${posted ? ' asset-overview-post-status--done' : ''}`}>
                {posted ? <Check size={14} strokeWidth={2.6} /> : <Circle size={14} strokeWidth={1.9} />}
                {posted ? t('今天已发帖') : t('尚未发帖')}
              </span>

              <span className="asset-overview-post-status-sep" aria-hidden="true">·</span>

              <span className={`asset-overview-post-status${isFull ? ' asset-overview-post-status--done' : ''}`}>
                {isFull ? <Check size={14} strokeWidth={2.6} /> : <Circle size={14} strokeWidth={1.9} />}
                {t('互动')}{' '}
                <span className="asset-overview-tomorrow-caption-count">
                  {interacted} / {TASK_INTERACTION_POOL_SIZE}
                </span>{' '}
                {t('次')}
              </span>
            </span>

            <ChevronRight size={15} strokeWidth={2} className="asset-overview-toggle-chevron" />
          </button>
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
                {t('可领取额度取决于昨日互动帖任务完成度，完成度越高可领取额度越高。')}
              </p>
              <button
                type="button"
                className="bsp-rules-entry"
                onClick={() => { setAirdropRuleOpen(false); setDailyTaskOpen(true); }}
              >
                <CalendarCheck size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
                <span className="bsp-rules-entry-text">{t('查看每日任务')}</span>
                <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}

      {dailyTaskOpen && <DailyTaskSheet onClose={() => setDailyTaskOpen(false)} hasBspRecords={hasBspRecords} />}
    </>
  );
}
