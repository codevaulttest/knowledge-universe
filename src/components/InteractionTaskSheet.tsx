import { useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Circle, Info, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { calendarIntlLocale } from '../dateUtils';
import { formatTokenAmount } from '../stakeConfig';
import {
  TASK_EARNINGS_UNSETTLED,
  TASK_INTERACTION_POOL_SIZE,
  TASK_RATIO_BASE,
  TASK_RATIO_STEP1,
  TASK_RATIO_STEP1_COUNT,
  TASK_RATIO_STEP2,
  TASK_RATIO_STEP2_COUNT,
  type TaskCalendarMonth,
} from '../taskConfig';
import { TaskCalendarView } from './TaskCalendarView';

/** 互动帖任务面板：规则 + 本月历史日历 + BSP 保底状态，一个入口直达，不再分成两层弹窗。 */
export function InteractionTaskSheet({ onClose }: { onClose: () => void }) {
  const { t, getDailyTaskCalendar } = useApp();
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="payment-sheet task-panel-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">{t('互动帖任务')}</span>
            <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <p className="task-panel-note">{t('今天的互动次数决定明天的空投领取上限')}</p>

          <button type="button" className="bsp-rules-entry task-panel-rules-entry task-panel-rules-entry--neutral" onClick={() => setRulesOpen(true)}>
            <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
            <span className="bsp-rules-entry-text">{t('查看完整任务规则')}</span>
            <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
          </button>

          <div className="task-panel-section-label">{t('本月空投收益历史')}</div>

          <InteractionTaskCalendarSection month={getDailyTaskCalendar()} />
        </div>
      </div>

      {rulesOpen && <InteractionTaskRulesSheet onClose={() => setRulesOpen(false)} />}
    </>
  );
}

function InteractionTaskRulesSheet({ onClose }: { onClose: () => void }) {
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
            {t('每天对任意 {total} 篇帖子完成点赞/评论/转发/收藏/踩/解锁/打赏任一操作即视为完成 1 篇（同一帖子多次操作只算一次）。', { total: TASK_INTERACTION_POOL_SIZE })}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('阶梯规则：')}</strong>
            {t('默认 {base}%；前 {count} 次每次 +{step}%，后 {count2} 次每次 +{step2}%，满 {total} 次为 100%。', {
              base: TASK_RATIO_BASE, count: TASK_RATIO_STEP1_COUNT, step: TASK_RATIO_STEP1,
              count2: TASK_RATIO_STEP2_COUNT, step2: TASK_RATIO_STEP2, total: TASK_INTERACTION_POOL_SIZE,
            })}
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

/** 本月历史日历：内嵌在互动任务面板底部，不再是需要点开的二级弹窗。 */
function InteractionTaskCalendarSection({ month }: { month: TaskCalendarMonth }) {
  const { t, language } = useApp();
  const intlLocale = calendarIntlLocale(language);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    month.days.find(d => d.isToday && d.snapshot)?.date ?? null
  );
  const selectedDay = month.days.find(d => d.date === selectedDate);

  return (
    <>
      <TaskCalendarView
        month={month}
        caption={t('格内数字是当天到账的收益，点开日期查看当天详情')}
        selectedDate={selectedDate}
        onSelectDay={setSelectedDate}
        dayClassName={day => {
          const snapshot = day.snapshot;
          if (!snapshot) return '';
          if (snapshot.posted && snapshot.interactedCount >= TASK_INTERACTION_POOL_SIZE) return 'is-full';
          if (snapshot.posted || snapshot.interactedCount > 0) return 'is-posted';
          return '';
        }}
        dayExtra={day => {
          const snapshot = day.snapshot;
          if (!snapshot || snapshot.earningsPb === TASK_EARNINGS_UNSETTLED) return null;
          return (
            <span className={`task-calendar-day-earn${snapshot.earningsPb > 0 ? ' is-earned' : ''}`}>
              {snapshot.earningsPb > 0 ? `+${formatTokenAmount(snapshot.earningsPb)}` : '0'}
            </span>
          );
        }}
      />

      {selectedDay?.snapshot && (
        <div className="task-calendar-detail">
          <span className="task-calendar-detail-date">
            {new Intl.DateTimeFormat(intlLocale, { month: 'long', day: 'numeric' }).format(new Date(`${selectedDay.date}T00:00:00`))}
          </span>
          <span className="task-calendar-detail-row">
            {t('当日互动')}<strong>{selectedDay.snapshot.interactedCount} / {TASK_INTERACTION_POOL_SIZE}</strong>
          </span>
          <span className="task-calendar-detail-row">
            {t('空投额度')}<strong>65%</strong>
          </span>
          {selectedDay.snapshot.earningsPb !== TASK_EARNINGS_UNSETTLED && (
            <span className="task-calendar-detail-row">
              {t('当日收益')}<strong>
                {selectedDay.snapshot.earningsPb > 0 ? `+${formatTokenAmount(selectedDay.snapshot.earningsPb)} PB` : t('0（未达成/已错过）')}
              </strong>
            </span>
          )}
          <div className={`task-card task-card--calendar-detail${selectedDay.snapshot.posted ? ' task-card--done' : ''}`}>
            <span className="task-card-icon" aria-hidden="true">
              {selectedDay.snapshot.posted ? <Check size={16} strokeWidth={2.6} /> : <Circle size={16} strokeWidth={1.9} />}
            </span>
            <span className="task-card-body">
              <span className="task-card-title">{t('发 1 篇帖子')}</span>
              <span className="task-card-desc">
                {selectedDay.snapshot.posted ? t('明日可享 BSP 巨星投流收益') : t('完成后可享 BSP 巨星投流收益')}
              </span>
            </span>
            <span className={`task-card-status${selectedDay.snapshot.posted ? ' task-card-status--done' : ''}`}>
              {selectedDay.snapshot.posted ? t('已完成') : selectedDay.isToday ? t('待完成') : t('未完成')}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
