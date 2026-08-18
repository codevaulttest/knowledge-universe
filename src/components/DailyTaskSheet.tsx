import { useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Circle, Gift, History, Info, MousePointerClick, Sparkles, X } from 'lucide-react';
import { useApp } from '../AppContext';
import {
  TASK_BONUS_PB,
  TASK_BONUS_THRESHOLD,
  TASK_INTERACTION_POOL_SIZE,
  TASK_INTERACTION_TIERS,
  type TaskCalendarDay,
} from '../taskConfig';

/** 每日任务统一面板：发帖任务 + 互动帖里程碑（+10 PB / 空投比例）+ BSP 保底 + 历史日历。 */
export function DailyTaskSheet({
  onClose,
  hasBspRecords = false,
}: {
  onClose: () => void;
  /** 仅当用户存在 BSP 投流记录时才展示保底状态行 */
  hasBspRecords?: boolean;
}) {
  const { t, taskSnapshotToday, getDailyTaskCalendar } = useApp();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const posted = taskSnapshotToday.posted;
  const interacted = taskSnapshotToday.interactedCount;
  const bonusEligible = taskSnapshotToday.bonusEligible;
  const bonusMarkerPercent = (TASK_BONUS_THRESHOLD / TASK_INTERACTION_POOL_SIZE) * 100;
  const progressPercent = Math.min(100, (interacted / TASK_INTERACTION_POOL_SIZE) * 100);

  const bspReady = posted;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="payment-sheet task-panel-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">{t('每日任务')}</span>
            <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <p className="task-panel-note">
            {t('发帖且互动满 {threshold} 次，当日到账 +{bonus} PB；互动满 {total} 次，次日空投领满额', { threshold: TASK_BONUS_THRESHOLD, bonus: TASK_BONUS_PB, total: TASK_INTERACTION_POOL_SIZE })}
          </p>

          <button type="button" className="bsp-rules-entry task-panel-rules-entry" onClick={() => setRulesOpen(true)}>
            <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
            <span className="bsp-rules-entry-text">{t('查看完整任务规则')}</span>
            <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
          </button>

          {/* 合并进度条：10 赞里程碑（+10 PB）+ 35 赞阶梯（空投比例） */}
          <div className="task-card task-card--interaction">
            <div className="task-card-head">
              <span className="task-card-icon" aria-hidden="true">
                {interacted >= TASK_INTERACTION_POOL_SIZE
                  ? <Check size={16} strokeWidth={2.6} />
                  : <MousePointerClick size={16} strokeWidth={1.9} />}
              </span>
              <span className="task-card-body">
                <span className="task-card-title">{t('互动帖任务')}</span>
                <span className="task-card-desc">
                  {t('今天已互动 {count} / {total} 次', { count: interacted, total: TASK_INTERACTION_POOL_SIZE })}
                </span>
              </span>
              <span className="task-card-ratio-col">
                <span className="task-card-ratio">{taskSnapshotToday.claimRatio}%</span>
                <span className="task-card-ratio-label">{t('空投额度')}</span>
              </span>
            </div>

            <div className="task-progress-track">
              <div className="task-progress-fill" style={{ width: `${progressPercent}%` }} />
              <span className="task-progress-marker" style={{ left: `${bonusMarkerPercent}%` }} aria-hidden="true" />
            </div>

            <div className="task-milestone-row">
              <span className={`task-milestone-chip${bonusEligible ? ' task-milestone-chip--done' : ''}`}>
                {bonusEligible ? <Check size={12} strokeWidth={2.6} /> : <Gift size={12} strokeWidth={1.9} />}
                {t('发帖+满 {threshold} 次互动 · +{bonus} PB', { threshold: TASK_BONUS_THRESHOLD, bonus: TASK_BONUS_PB })}
                <span className="task-milestone-chip-state">
                  {bonusEligible
                    ? t('已达成')
                    : interacted >= TASK_BONUS_THRESHOLD
                      ? t('还需发帖')
                      : t('待完成')}
                </span>
              </span>
              <span className="task-milestone-chip">
                <Sparkles size={12} strokeWidth={1.9} />
                {t('满 {total} 次互动 · 100% 空投', { total: TASK_INTERACTION_POOL_SIZE })}
              </span>
            </div>
          </div>

          {/* 发帖任务：10 PB 里程碑与 BSP 保底的共同前置条件 */}
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

      {rulesOpen && <DailyTaskRulesSheet onClose={() => setRulesOpen(false)} />}
      {historyOpen && <DailyTaskHistorySheet onClose={() => setHistoryOpen(false)} days={getDailyTaskCalendar()} />}
    </>
  );
}

function DailyTaskRulesSheet({ onClose }: { onClose: () => void }) {
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
            <strong className="pb-info-sheet-label">{t('互动帖任务：')}</strong>
            {t('每天对任意 {total} 篇帖子完成点赞/评论/收藏/踩任一操作即视为完成 1 篇（同一帖子多次操作只算一次）。', { total: TASK_INTERACTION_POOL_SIZE })}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('次日空投额度：')}</strong>
            {t('按互动帖数量分档换算，次日生效：{t1} 篇 {r1}%；{t2} 篇 {r2}%；{total} 篇 100%。', {
              t1: TASK_INTERACTION_TIERS[0].count,
              r1: TASK_INTERACTION_TIERS[0].ratio,
              t2: TASK_INTERACTION_TIERS[1].count,
              r2: TASK_INTERACTION_TIERS[1].ratio,
              total: TASK_INTERACTION_POOL_SIZE,
            })}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('当日 PB 里程碑：')}</strong>
            {t('当天至少发布 1 篇内容，且互动帖满 {threshold} 篇，当日即到账 +{bonus} PB。', { threshold: TASK_BONUS_THRESHOLD, bonus: TASK_BONUS_PB })}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('BSP 巨星投流保底：')}</strong>
            {t('当天至少发布 1 篇内容即视为完成。它是 BSP 巨星投流每日打赏保底的唯一门槛：当天发帖，次日即享有打赏保底。')}
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

const CALENDAR_INTL_LOCALE: Record<string, string> = {
  'zh-CN': 'zh-CN', en: 'en-US', 'zh-TW': 'zh-TW', ko: 'ko-KR', ja: 'ja-JP',
  ru: 'ru-RU', es: 'es-ES', fr: 'fr-FR', pt: 'pt-PT', th: 'th-TH', vi: 'vi-VN',
};

function DailyTaskHistorySheet({
  onClose,
  days,
}: {
  onClose: () => void;
  days: TaskCalendarDay[];
}) {
  const { t, language } = useApp();
  const intlLocale = CALENDAR_INTL_LOCALE[language] ?? 'en-US';
  const anchor = days.find(d => d.inCurrentMonth)?.date ?? days[0].date;
  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: 'long' }).format(new Date(`${anchor}T00:00:00`));
  // 2023-01-01 是周日，用它取各语言"周几"的极简单字符标签，对齐 getDay() 的 0=周日 顺序
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intlLocale, { weekday: 'narrow' }).format(new Date(2023, 0, 1 + i))
  );

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('本月任务收益历史')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="task-calendar-month">{monthLabel}</div>

        <div className="task-calendar-legend">
          <span className="task-calendar-legend-item">
            <Check size={11} strokeWidth={2.6} aria-hidden="true" />
            {t('当日已发帖')}
          </span>
          <span className="task-calendar-legend-item">
            <span className="task-calendar-legend-swatch" aria-hidden="true">%</span>
            {t('次日空投额度')}
          </span>
          <span className="task-calendar-legend-item">
            <span className="task-calendar-legend-swatch">+</span>
            {t('当日里程碑奖励')}
          </span>
        </div>

        <div className="task-calendar-weekdays">
          {weekdayLabels.map((label, i) => (
            <span key={i} className="task-calendar-weekday">{label}</span>
          ))}
        </div>

        <div className="task-calendar-grid">
          {days.map(day => {
            const snapshot = day.snapshot;
            return (
              <div
                key={day.date}
                className={[
                  'task-calendar-day',
                  !day.inCurrentMonth && 'is-outside',
                  day.isToday && 'is-today',
                  snapshot?.posted && 'is-posted',
                ].filter(Boolean).join(' ')}
              >
                <span className="task-calendar-day-num">{day.day}</span>
                {snapshot && (
                  <>
                    <span className="task-calendar-day-token" aria-hidden="true">
                      {snapshot.posted ? <Check size={12} strokeWidth={2.6} /> : <Circle size={11} strokeWidth={1.9} />}
                    </span>
                    <span className="task-calendar-day-ratio">{snapshot.claimRatio}%</span>
                    {snapshot.bonusEligible && (
                      <span className="task-calendar-day-bonus">
                        <span>+{TASK_BONUS_PB}</span>
                        <span className="task-calendar-day-bonus-unit">PB</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
