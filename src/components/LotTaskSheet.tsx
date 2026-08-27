import { useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Circle, History, Info, ThumbsUp, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { calendarIntlLocale } from '../dateUtils';
import {
  TASK_LOT_CREDIBILITY_PER_UNIT,
  TASK_LOT_INTERACTIONS_PER_UNIT,
  TASK_LOT_UNITS_PER_NODE,
  type LotQuota,
  type TaskCalendarMonth,
} from '../taskConfig';
import { TaskCalendarView } from './TaskCalendarView';

/** 公信力任务面板：公信力任务 + 发帖任务 + BSP 巨星投流保底 + 规则 + 历史（决定今天的公信力奖励）。 */
export function LotTaskSheet({
  onClose,
  hasBspRecords = false,
}: {
  onClose: () => void;
  /** 仅当用户存在 BSP 投流记录时才展示保底状态行 */
  hasBspRecords?: boolean;
}) {
  const { t, taskSnapshotToday, getDailyTaskCalendar, lotQuota } = useApp();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const posted = taskSnapshotToday.posted;
  const interactedCount = taskSnapshotToday.interactedCount;
  const bonusEligible = taskSnapshotToday.bonusEligible;
  const credibilityRewardStatus = taskSnapshotToday.credibilityRewardStatus;

  const bspReady = posted;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="payment-sheet task-panel-sheet lot-task-panel-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">{t('公信力任务')}</span>
            <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="lot-task-hero" aria-hidden="true">
            <img src="/img/lot-bonus-reward-icon.webp" alt="" />
          </div>

          <p className="task-panel-note">
            {t('当天发帖并完成互动满额度，决定今天的公信力奖励')}
          </p>

          <button type="button" className="bsp-rules-entry task-panel-rules-entry task-panel-rules-entry--neutral" onClick={() => setRulesOpen(true)}>
            <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
            <span className="bsp-rules-entry-text">{t('查看完整任务规则')}</span>
            <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
          </button>

          <LotTaskCard
            lotQuota={lotQuota}
            posted={posted}
            interactedCount={interactedCount}
            bonusEligible={bonusEligible}
            credibilityRewardStatus={credibilityRewardStatus}
          />

          {hasBspRecords && (
            <div className={`task-card${bspReady ? ' task-card--done' : ''}`}>
              <span className="task-card-icon" aria-hidden="true">
                {bspReady ? <Check size={16} strokeWidth={2.6} /> : <Circle size={16} strokeWidth={1.9} />}
              </span>
              <span className="task-card-body">
                <span className="task-card-title">{t('BSP 巨星投流保底')}</span>
                <span className="task-card-desc">
                  {bspReady ? t('明日可享 BSP 打赏保底') : t('还没有发布内容')}
                </span>
              </span>
              <span className={`task-card-status${bspReady ? ' task-card-status--done' : ''}`}>
                {bspReady ? t('已完成') : t('待完成')}
              </span>
            </div>
          )}

          <button type="button" className="bsp-rules-entry task-panel-rules-entry" onClick={() => setHistoryOpen(true)}>
            <History size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
            <span className="bsp-rules-entry-text">{t('本月空投收益历史')}</span>
            <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
          </button>
        </div>
      </div>

      {rulesOpen && <LotTaskRulesSheet onClose={() => setRulesOpen(false)} />}
      {historyOpen && <LotTaskHistorySheet onClose={() => setHistoryOpen(false)} month={getDailyTaskCalendar()} lotQuota={lotQuota} />}
    </>
  );
}

function LotTaskCard({
  lotQuota,
  posted,
  interactedCount,
  bonusEligible,
  credibilityRewardStatus,
}: {
  lotQuota: LotQuota;
  posted: boolean;
  interactedCount: number;
  bonusEligible: boolean;
  credibilityRewardStatus: 'none' | 'pending' | 'issued';
}) {
  const { t } = useApp();
  const statusLabel = bonusEligible
    ? credibilityRewardStatus === 'issued' ? t('已发放') : t('待次日凌晨发放')
    : t('待完成');
  const interactionDone = interactedCount >= TASK_LOT_INTERACTIONS_PER_UNIT;
  return (
    <div className={`task-card task-card--lot${bonusEligible ? ' task-card--done' : ''}`}>
      <div className="task-card-head">
        <span className="task-card-icon" aria-hidden="true">
          {bonusEligible ? <Check size={16} strokeWidth={2.6} /> : <ThumbsUp size={16} strokeWidth={1.9} />}
        </span>
        <span className="task-card-body">
          <span className="task-card-desc">
            {t('当天发帖，并对其他帖子完成互动满 {interactions} 次，可得 +{credibility} 公信力', { interactions: TASK_LOT_INTERACTIONS_PER_UNIT, credibility: TASK_LOT_CREDIBILITY_PER_UNIT })}
          </span>
        </span>
        <span className="task-card-ratio-col">
          <span className="task-card-ratio">{lotQuota.credibility}</span>
          <span className="task-card-ratio-label">{t('公信力上限')}</span>
        </span>
      </div>

      {/* 达成 270 上限的两个前置条件：发帖 + 互动满额，跟卡片头部的说明句一一对应，不再单独拆成一张卡 */}
      <div className="task-card-conditions">
        <div className={`task-card-condition-row${posted ? ' is-done' : ''}`}>
          {posted ? <Check size={13} strokeWidth={2.6} /> : <Circle size={13} strokeWidth={1.9} />}
          <span className="task-card-condition-label">{t('发帖')}</span>
          <span className="task-card-condition-value">{posted ? t('已完成') : t('待完成')}</span>
        </div>
        <div className={`task-card-condition-row${interactionDone ? ' is-done' : ''}`}>
          {interactionDone ? <Check size={13} strokeWidth={2.6} /> : <Circle size={13} strokeWidth={1.9} />}
          <span className="task-card-condition-label">{t('互动满 {threshold} 次', { threshold: TASK_LOT_INTERACTIONS_PER_UNIT })}</span>
          <span className="task-card-condition-value">{Math.min(interactedCount, TASK_LOT_INTERACTIONS_PER_UNIT)}/{TASK_LOT_INTERACTIONS_PER_UNIT}</span>
        </div>
      </div>

      {lotQuota.fiveStarNodeCount > 0 ? (
        <>
          {/* 竖排算式：五星节点数 × 每节点互动额度 = 今日互动额度，隐藏内部配额单位。 */}
          <div className="task-calc">
            <div className="task-calc-row">
              <span className="task-calc-label">{t('直连五星节点')}</span>
              <span className="task-calc-value">{lotQuota.fiveStarNodeCount} {t('个')}</span>
            </div>
            <div className="task-calc-row">
              <span className="task-calc-label">{t('每个节点可互动')}</span>
              <span className="task-calc-value task-calc-op">× {TASK_LOT_UNITS_PER_NODE * TASK_LOT_INTERACTIONS_PER_UNIT} {t('次')}</span>
            </div>
            <div className="task-calc-row task-calc-row--result">
              <span className="task-calc-label">{t('今日互动额度')}</span>
              <span className="task-calc-value">{lotQuota.interactions} {t('次')}</span>
            </div>
          </div>
          <div className="task-card-status-row">
            <span className={`task-card-status${bonusEligible ? ' task-card-status--done' : ''}`}>
              {statusLabel}
            </span>
          </div>
        </>
      ) : (
        <div className="task-card-foot">
          <p className="task-group-note">
            {t('还没有直连五星节点，今天可对他人帖子完成互动 {interactions} 次，最多 +{credibility} 公信力；每直连 1 个五星节点，互动额度增加 {perNode} 次', {
              interactions: TASK_LOT_INTERACTIONS_PER_UNIT,
              credibility: TASK_LOT_CREDIBILITY_PER_UNIT,
              perNode: TASK_LOT_UNITS_PER_NODE * TASK_LOT_INTERACTIONS_PER_UNIT,
            })}
          </p>
          <span className={`task-card-status${bonusEligible ? ' task-card-status--done' : ''}`}>
            {statusLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function LotTaskRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('任务规则')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="pb-info-sheet-body">
          <p className="pb-info-sheet-para pb-info-sheet-heading">
            {t('每日任务如何计算奖励')}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('公信力任务：')}</strong>
            {t('当天发帖并对其他帖子完成互动满 {interactions} 次，可得 +{credibility} 公信力；每直连 1 个五星节点，每天增加 {perNode} 次互动额度。未直连五星节点时，今天可互动 {baseline} 次。奖励次日凌晨结算。', {
              interactions: TASK_LOT_INTERACTIONS_PER_UNIT,
              credibility: TASK_LOT_CREDIBILITY_PER_UNIT,
              perNode: TASK_LOT_UNITS_PER_NODE * TASK_LOT_INTERACTIONS_PER_UNIT,
              baseline: TASK_LOT_INTERACTIONS_PER_UNIT,
            })}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('BSP 巨星投流保底：')}</strong>
            {t('当天至少发布 1 篇内容即视为完成。当天发帖，次日即享有打赏保底。')}
          </p>
          <div className="sup-deposit-warning">
            <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t('具体比例后续可能调整，请以任务面板内实际展示为准。')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LotTaskHistorySheet({
  onClose,
  month,
  lotQuota,
}: {
  onClose: () => void;
  month: TaskCalendarMonth;
  lotQuota: LotQuota;
}) {
  const { t, language } = useApp();
  const intlLocale = calendarIntlLocale(language);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    month.days.find(d => d.isToday && d.snapshot)?.date ?? null
  );
  const selectedDay = month.days.find(d => d.date === selectedDate);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet lot-task-history-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('本月空投收益历史')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <TaskCalendarView
          month={month}
          caption={t('格内标记的是当天公信力任务的达成状态，点开日期查看当天详情')}
          selectedDate={selectedDate}
          onSelectDay={setSelectedDate}
          dayClassName={day => (day.snapshot?.bonusEligible ? 'is-full' : (day.snapshot?.posted ? 'is-posted' : ''))}
          dayExtra={day => {
            const snapshot = day.snapshot;
            if (!snapshot?.bonusEligible) return null;
            return (
              <span className="task-calendar-day-earn is-earned">
                +{TASK_LOT_CREDIBILITY_PER_UNIT}
              </span>
            );
          }}
        />

        {selectedDay?.snapshot && (
          <div className="task-calendar-detail">
            <span className="task-calendar-detail-date">
              {new Intl.DateTimeFormat(intlLocale, { month: 'long', day: 'numeric' }).format(new Date(`${selectedDay.date}T00:00:00`))}
            </span>
            <span className={`task-calendar-detail-status${selectedDay.snapshot.posted ? ' is-posted' : ''}`}>
              {selectedDay.snapshot.posted ? <Check size={13} strokeWidth={2.6} /> : <Circle size={13} strokeWidth={1.9} />}
              {selectedDay.snapshot.posted ? t('当日已发帖') : t('当日未发帖')}
            </span>
            {selectedDay.snapshot.bonusEligible && (
              <span className="task-calendar-detail-row">
                {t('当日公信力奖励')}<strong>
                  +{TASK_LOT_CREDIBILITY_PER_UNIT} {t('公信力')} · {selectedDay.snapshot.credibilityRewardStatus === 'issued' ? t('已发放') : t('待次日凌晨发放')}
                </strong>
              </span>
            )}
          </div>
        )}

        <p className="task-calendar-lot-note">
          {lotQuota.fiveStarNodeCount > 0
            ? t('你已直连 {nodes} 个五星节点，今天可对他人帖子完成互动 {interactions} 次，最多 +{credibility} 公信力', {
                nodes: lotQuota.fiveStarNodeCount, interactions: lotQuota.interactions, credibility: lotQuota.credibility,
              })
            : t('你名下暂无直连的五星节点，今天可对他人帖子完成互动 {interactions} 次，最多 +{credibility} 公信力；每直连 1 个五星节点，互动额度增加 {perNode} 次', {
                interactions: TASK_LOT_INTERACTIONS_PER_UNIT,
                credibility: TASK_LOT_CREDIBILITY_PER_UNIT,
                perNode: TASK_LOT_UNITS_PER_NODE * TASK_LOT_INTERACTIONS_PER_UNIT,
              })}
        </p>
      </div>
    </div>
  );
}
