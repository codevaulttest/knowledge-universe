import { useState } from 'react';
import { ChevronRight, Crown, History } from 'lucide-react';
import { useApp } from '../AppContext';
import type { BspInvestment } from '../bspConfig';
import { DailyTaskSheet } from './DailyTaskSheet';

/**
 * 巨星投流统一入口：标题栏右侧投流记录 + 主 CTA；
 * 保底门槛仅在已投流过时展示，详情进 sheet。
 */
export function BspHubCard({
  investments,
  onOpenInvest,
  onOpenRecords,
}: {
  investments: BspInvestment[];
  onOpenInvest: () => void;
  onOpenRecords: () => void;
}) {
  const { t, walletConnected, taskSnapshotToday } = useApp();
  const [bspTaskOpen, setBspTaskOpen] = useState(false);

  const hasRecords = investments.length > 0;
  const posted = taskSnapshotToday.posted;
  const bspReady = posted;

  const thresholdMeta = bspReady
    ? t('明日可享 BSP 打赏保底')
    : t('尚未发帖');

  return (
    <>
      <section className="bsp-hub" aria-label={t('BSP 巨星投流计划')}>
        <div className="bsp-hub-header">
          <span className="bsp-hub-header-icon" aria-hidden>
            <Crown size={18} strokeWidth={2} />
          </span>
          <h2 className="bsp-hub-title">{t('BSP 巨星投流计划')}</h2>
          <button
            type="button"
            className="bsp-hub-records-entry"
            onClick={onOpenRecords}
            aria-label={t('查看全部投流记录')}
          >
            <History size={14} strokeWidth={2} aria-hidden />
            <span>{t('投流记录')}</span>
          </button>
        </div>

        <button
          type="button"
          className="bsp-hub-cta"
          onClick={onOpenInvest}
        >
          <Crown size={18} strokeWidth={2} aria-hidden />
          <span>{t('立即投流')}</span>
        </button>

        {walletConnected && hasRecords && (
          <button
            type="button"
            className="bsp-hub-link-row"
            onClick={() => setBspTaskOpen(true)}
            aria-label={t('查看 BSP 巨星投流任务')}
          >
            <span className="bsp-hub-link-label">{t('今日保底任务')}</span>
            <span className={`bsp-hub-link-meta${bspReady ? ' bsp-hub-link-meta--ready' : ''}`}>
              {thresholdMeta}
            </span>
            <ChevronRight size={15} strokeWidth={2} className="bsp-hub-chevron" aria-hidden />
          </button>
        )}
      </section>

      {bspTaskOpen && <DailyTaskSheet onClose={() => setBspTaskOpen(false)} hasBspRecords={hasRecords} />}
    </>
  );
}
