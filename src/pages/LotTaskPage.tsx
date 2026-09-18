import { useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Circle, Info, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader } from '../components/shared';
import {
  lotCredibilityEarned,
  lotRequiredPostCount,
  TASK_LOT_CREDIBILITY_PER_UNIT,
  TASK_LOT_INTERACTIONS_PER_UNIT,
  TASK_LOT_UNITS_PER_NODE,
  type LotQuota,
  type TaskCalendarMonth,
  type TaskDaySnapshot,
} from '../taskConfig';
import { TaskCalendarView } from '../components/TaskCalendarView';

const LOT_TASK_RULE_CONTEXT = {
  nodeCode: 'A28643', faceValue: '1000', postsPerChannel: '1', interactionsPerChannel: '10', consecutiveDays: '10',
};

/** 公信力任务独立页：保留原任务数据与规则入口，返回时回到来源页面。 */
export function LotTaskPage() {
  const { t, getDailyTaskCalendar, lotQuota, goBack, canGoBack } = useApp();
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <div className="page lot-task-page">
      <PageHeader title={t('本月公信力收益历史')} onBack={canGoBack ? goBack : undefined} />
      <main className="lot-task-page-scroll">
        <button type="button" className="bsp-rules-entry task-panel-rules-entry task-panel-rules-entry--neutral" onClick={() => setRulesOpen(true)}>
          <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
          <span className="bsp-rules-entry-text">{t('查看完整公信力任务规则')}</span>
          <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
        </button>
        <LotTaskCalendarSection month={getDailyTaskCalendar()} lotQuota={lotQuota} />
      </main>
      {rulesOpen && <LotTaskRulesSheet onClose={() => setRulesOpen(false)} />}
    </div>
  );
}

function LotTaskRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();
  return <div className="sheet-backdrop" onClick={onClose}>
    <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
      <div className="sheet-header"><span className="sheet-title">{t('公信力任务规则')}</span><button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}><X size={18} strokeWidth={2} /></button></div>
      <div className="pb-info-sheet-body">
        <p className="pb-info-sheet-para">{t('未直连五星节点时，当日上限为 {credibility} 公信力：发 1 篇帖子并完成 {baseline} 次互动即可领满。', { credibility: TASK_LOT_CREDIBILITY_PER_UNIT, baseline: TASK_LOT_INTERACTIONS_PER_UNIT })}</p>
        <p className="pb-info-sheet-para">{t('直连五星节点时，当日上限按直连节点数计算：每个节点对应 {perNode} 公信力额度，发 1 篇帖子并完成 {perNode} 次互动即可领满。例如，有 {nodes} 个直连五星节点，每天最多可获得 {total} 公信力额度，发 {nodes} 篇帖子并完成 {total} 次互动即可领满。', { perNode: TASK_LOT_UNITS_PER_NODE * TASK_LOT_CREDIBILITY_PER_UNIT, nodes: 3, total: 3 * TASK_LOT_UNITS_PER_NODE * TASK_LOT_CREDIBILITY_PER_UNIT })}</p>
        <p className="pb-info-sheet-para">{t('奖励次日凌晨结算。')}</p>
        <div className="sup-deposit-warning"><AlertTriangle size={16} strokeWidth={2} aria-hidden="true" /><span>{t('具体数值后续可能调整，请以任务面板内实际展示为准。')}</span></div>
      </div>
    </div>
  </div>;
}

function LotTaskCalendarSection({ month, lotQuota }: { month: TaskCalendarMonth; lotQuota: LotQuota }) {
  const { t, taskSnapshotToday, taskSnapshotYesterday } = useApp();
  return <>
    <TaskCalendarView month={month} caption={t('格内标记的是当天公信力任务的达成状态')} dayClassName={day => day.snapshot?.bonusEligible ? 'is-full' : (day.snapshot?.posted ? 'is-posted' : '')} dayExtra={day => {
      const snapshot = day.snapshot;
      if (!snapshot) return null;
      const earned = lotCredibilityEarned(snapshot.postedCount, snapshot.interactedCount, lotQuota.interactions);
      return <span className={`task-calendar-day-earn${earned > 0 ? ' is-earned' : ''}`}>{earned > 0 ? `+${earned}` : '0'}</span>;
    }} />
    <div className="task-calendar-history-details">
      <LotTaskCompletionDetail label={t('今天')} snapshot={taskSnapshotToday} lotQuota={lotQuota} historySnapshot={taskSnapshotYesterday} showTodaySummary />
      <LotTaskRuleSummary lotQuota={lotQuota} />
    </div>
  </>;
}

function LotTaskRuleSummary({ lotQuota }: { lotQuota: LotQuota }) {
  const { t } = useApp();
  const ruleCopy = lotQuota.fiveStarNodeCount === 0
    ? t('每日发布至少 {posts} 篇帖子，并完成 {interactionsPerChannel} 次互动；连续完成任务满 {consecutiveDays} 天后，最高可获得 {credibility} 公信力。拥有直连五星节点可解锁更高公信力奖励上限。', {
      posts: lotQuota.units,
      interactionsPerChannel: LOT_TASK_RULE_CONTEXT.interactionsPerChannel,
      consecutiveDays: LOT_TASK_RULE_CONTEXT.consecutiveDays,
      credibility: lotQuota.credibility,
    })
    : t('您的节点 {nodeCode} 直连了 {nodes} 个{faceValue}面额的五星节点。每日在 {channels} 个频道各发布至少 {postsPerChannel} 篇帖子，并完成 {interactionsPerChannel} 次互动，共计 {totalInteractions} 次；连续完成任务满 {consecutiveDays} 天后，最高可获得 {credibility} 公信力。', {
      nodeCode: LOT_TASK_RULE_CONTEXT.nodeCode,
      nodes: lotQuota.fiveStarNodeCount,
      faceValue: LOT_TASK_RULE_CONTEXT.faceValue,
      channels: lotQuota.units,
      postsPerChannel: LOT_TASK_RULE_CONTEXT.postsPerChannel,
      interactionsPerChannel: LOT_TASK_RULE_CONTEXT.interactionsPerChannel,
      totalInteractions: lotQuota.interactions,
      consecutiveDays: LOT_TASK_RULE_CONTEXT.consecutiveDays,
      credibility: lotQuota.credibility,
    });
  return <div className="bsp-rules-entry task-panel-rules-entry--neutral task-calendar-rule-summary">
    <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
    <span className="task-calendar-detail-summary-copy">{ruleCopy}</span>
  </div>;
}

function LotTaskCompletionDetail({ label, snapshot, lotQuota, historySnapshot, showTodaySummary = false }: { label: string; snapshot: TaskDaySnapshot | null; lotQuota: LotQuota; historySnapshot?: TaskDaySnapshot | null; showTodaySummary?: boolean }) {
  const { t } = useApp();
  const requiredPostCount = showTodaySummary ? lotQuota.units : lotRequiredPostCount(lotQuota.fiveStarNodeCount);
  const requiredInteractionCount = lotQuota.interactions;
  if (!snapshot) return <div className={`task-calendar-detail${showTodaySummary ? '' : ' task-calendar-detail--history'}`}><div className="task-calendar-detail-meta"><span className="task-calendar-detail-date">{label}</span></div><span className="task-calendar-detail-empty">{t('暂无任务完成记录')}</span></div>;
  const postCountDone = snapshot.postedCount >= requiredPostCount;
  const interactionDone = snapshot.interactedCount >= requiredInteractionCount;
  return <div className={`task-calendar-detail${showTodaySummary ? '' : ' task-calendar-detail--history'}`}>
    <div className="task-calendar-detail-meta"><span className="task-calendar-detail-date">{label}</span>{!showTodaySummary && <div className="task-calendar-history-summary"><span>{t('发帖')} <strong>{snapshot.postedCount}</strong> {t('篇')}</span><span aria-hidden="true">·</span><span>{t('互动')} <strong>{snapshot.interactedCount}</strong> {t('次')}</span></div>}</div>
    {showTodaySummary && <div className="task-calendar-detail-conditions"><span className={`task-calendar-detail-status${postCountDone ? ' is-posted' : ''}`}>{postCountDone ? <Check size={13} strokeWidth={3.2} /> : <Circle size={13} strokeWidth={1.9} />}{t('发帖')}<strong>{t('已发')} <span className="task-calendar-detail-number">{snapshot.postedCount}</span> / <span className="task-calendar-detail-number">{requiredPostCount}</span> {t('篇')}</strong></span><span className={`task-calendar-detail-status${interactionDone ? ' is-posted' : ''}`}>{interactionDone ? <Check size={13} strokeWidth={3.2} /> : <Circle size={13} strokeWidth={1.9} />}{t('跟别人的帖子互动')}<strong>{t('已互动')} <span className="task-calendar-detail-number">{snapshot.interactedCount}</span> / <span className="task-calendar-detail-number">{requiredInteractionCount}</span> {t('次')}</strong></span></div>}
    {showTodaySummary && historySnapshot && <TaskCalendarHistorySummary label={t('昨天')} snapshot={historySnapshot} />}
  </div>;
}

function TaskCalendarHistorySummary({ label, snapshot }: { label: string; snapshot: TaskDaySnapshot }) {
  const { t } = useApp();
  return <div className="task-calendar-history-inline">
    <span className="task-calendar-detail-date">{label}</span>
    <div className="task-calendar-history-summary"><span>{t('发帖')} <strong>{snapshot.postedCount}</strong> {t('篇')}</span><span aria-hidden="true">·</span><span>{t('互动')} <strong>{snapshot.interactedCount}</strong> {t('次')}</span></div>
  </div>;
}
