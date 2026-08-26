import { useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Circle, Gift, History, Info, ThumbsUp, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { calendarIntlLocale } from '../dateUtils';
import {
  TASK_LOT_HONOR_PER_UNIT,
  TASK_LOT_LIKES_PER_UNIT,
  TASK_LOT_UNITS_PER_NODE,
  type LotQuota,
  type TaskCalendarMonth,
} from '../taskConfig';
import { TaskCalendarView } from './TaskCalendarView';

/** 一发十赞面板：一发十赞 + 发帖任务 + BSP 巨星投流保底 + 规则 + 历史（决定今天的荣誉值奖励）。 */
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
  const interacted = taskSnapshotToday.interactedCount;
  const bonusEligible = taskSnapshotToday.bonusEligible;
  const honorRewardStatus = taskSnapshotToday.honorRewardStatus;

  const bspReady = posted;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="payment-sheet task-panel-sheet lot-task-panel-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">{t('一发十赞')}</span>
            <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="lot-task-hero" aria-hidden="true">
            <img src="/img/lot-bonus-reward-icon.webp" alt="" />
          </div>

          <p className="task-panel-note">
            {t('当天发帖并完成一发十赞，决定今天的荣誉值奖励')}
          </p>

          <button type="button" className="bsp-rules-entry task-panel-rules-entry task-panel-rules-entry--neutral" onClick={() => setRulesOpen(true)}>
            <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
            <span className="bsp-rules-entry-text">{t('查看完整任务规则')}</span>
            <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
          </button>

          <LotTaskCard lotQuota={lotQuota} bonusEligible={bonusEligible} honorRewardStatus={honorRewardStatus} posted={posted} interacted={interacted} />

          {/* 发帖任务：荣誉值里程碑与 BSP 保底的共同前置条件 */}
          <div className={`task-card${posted ? ' task-card--done' : ''}`}>
            <span className="task-card-icon" aria-hidden="true">
              {posted ? <Check size={16} strokeWidth={2.6} /> : <Circle size={16} strokeWidth={1.9} />}
            </span>
            <span className="task-card-body">
              <span className="task-card-title">{t('发帖任务')}</span>
              <span className="task-card-desc">
                {posted ? t('已发布内容') : t('还没有发布内容')}
              </span>
            </span>
            <span className={`task-card-status${posted ? ' task-card-status--done' : ''}`}>
              {posted ? t('已完成') : t('待完成')}
            </span>
          </div>

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
            <span className="bsp-rules-entry-text">{t('本月任务收益历史')}</span>
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
  bonusEligible,
  honorRewardStatus,
  posted,
  interacted,
}: {
  lotQuota: LotQuota;
  bonusEligible: boolean;
  honorRewardStatus: 'none' | 'pending' | 'issued';
  posted: boolean;
  interacted: number;
}) {
  const { t } = useApp();
  return (
    <div className={`task-card task-card--lot${bonusEligible ? ' task-card--done' : ''}`}>
      <div className="task-card-head">
        <span className="task-card-icon" aria-hidden="true">
          {bonusEligible ? <Check size={16} strokeWidth={2.6} /> : <ThumbsUp size={16} strokeWidth={1.9} />}
        </span>
        <span className="task-card-body">
          <span className="task-card-title">{t('一发十赞')}</span>
          <span className="task-card-desc">
            {t('当天发帖，并给其他帖子点赞满 {likes} 次为 1 组，每组 +{honor} 荣誉值', { likes: TASK_LOT_LIKES_PER_UNIT, honor: TASK_LOT_HONOR_PER_UNIT })}
          </span>
        </span>
        <span className="task-card-ratio-col">
          <span className="task-card-ratio">{lotQuota.honor}</span>
          <span className="task-card-ratio-label">{t('荣誉值上限')}</span>
        </span>
      </div>

      <p className="task-group-note">
        {lotQuota.fiveStarNodeCount > 0
          ? t('已直连 {nodes} 个五星节点，今日可完成 {units} 组「一发十赞」，共需给他人点赞 {likes} 次', {
              nodes: lotQuota.fiveStarNodeCount, units: lotQuota.units, likes: lotQuota.likes,
            })
          : t('还没有直连五星节点，今天保底 1 组「一发十赞」；每直连 1 个五星节点，组数 ×9 递增')}
      </p>

      <div className="task-milestone-row">
        <span className={`task-milestone-chip${bonusEligible ? ' task-milestone-chip--done' : ''}`}>
          {bonusEligible ? <Check size={12} strokeWidth={2.6} /> : <Gift size={12} strokeWidth={1.9} />}
          {t('发帖 + 给他人点赞满 {likes} 次 · +{honor} 荣誉值', { likes: TASK_LOT_LIKES_PER_UNIT, honor: TASK_LOT_HONOR_PER_UNIT })}
          <span className="task-milestone-chip-state">
            {bonusEligible
              ? honorRewardStatus === 'issued' ? t('已发放') : t('待次日凌晨发放')
              : interacted >= TASK_LOT_LIKES_PER_UNIT
                ? posted ? t('待完成') : t('还需发帖')
                : t('待完成')}
          </span>
        </span>
      </div>
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
            <strong className="pb-info-sheet-label">{t('一发十赞：')}</strong>
            {t('每直连 1 个五星节点，每天可多完成 {perNode} 组「一发十赞」（未直连五星节点时保底 1 组）；每组为当天发帖 + 给其他帖子点赞满 {likes} 次，发放 +{honor} 荣誉值，次日凌晨结算。', {
              perNode: TASK_LOT_UNITS_PER_NODE, likes: TASK_LOT_LIKES_PER_UNIT, honor: TASK_LOT_HONOR_PER_UNIT,
            })}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('BSP 巨星投流保底：')}</strong>
            {t('当天至少发布 1 篇内容即视为完成。当天发帖，次日即享有打赏保底。')}
          </p>
          <div className="sup-deposit-warning">
            <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t('具体保底比例与阶梯步长可能随运营策略调整，请以任务面板内实际展示为准。')}</span>
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
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('本月任务收益历史')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <TaskCalendarView
          month={month}
          caption={t('格内标记的是当天一发十赞的达成状态，点开日期查看当天详情')}
          selectedDate={selectedDate}
          onSelectDay={setSelectedDate}
          dayClassName={day => (day.snapshot?.bonusEligible ? 'is-full' : (day.snapshot?.posted ? 'is-posted' : ''))}
          dayExtra={day => {
            const snapshot = day.snapshot;
            if (!snapshot?.bonusEligible) return null;
            return (
              <span className="task-calendar-day-earn is-earned">
                +{TASK_LOT_HONOR_PER_UNIT}
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
                {t('当日荣誉值奖励')}<strong>
                  +{TASK_LOT_HONOR_PER_UNIT} {t('荣誉值')} · {selectedDay.snapshot.honorRewardStatus === 'issued' ? t('已发放') : t('待次日凌晨发放')}
                </strong>
              </span>
            )}
          </div>
        )}

        <p className="task-calendar-lot-note">
          {lotQuota.fiveStarNodeCount > 0
            ? t('你已直连 {nodes} 个五星节点，每天可完成 {units} 组「一发十赞」，共需给他人点赞 {likes} 次，最多 +{honor} 荣誉值', {
                nodes: lotQuota.fiveStarNodeCount, units: lotQuota.units, likes: lotQuota.likes, honor: lotQuota.honor,
              })
            : t('你名下暂无直连的五星节点，今天保底 1 组「一发十赞」，最多 +10 荣誉值；每直连 1 个五星节点，组数按 ×9 递增')}
        </p>
      </div>
    </div>
  );
}
