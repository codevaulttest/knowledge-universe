import { useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Circle, Info, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { calendarIntlLocale } from '../dateUtils';
import {
  lotCredibilityEarned,
  lotRequiredPostCount,
  TASK_LOT_CREDIBILITY_PER_UNIT,
  TASK_LOT_INTERACTIONS_PER_UNIT,
  TASK_LOT_UNITS_PER_NODE,
  type LotQuota,
  type TaskCalendarMonth,
} from '../taskConfig';
import { TaskCalendarView } from './TaskCalendarView';

/** 公信力任务面板：今天进度（公信力任务 + BSP 巨星投流保底）+ 规则 + 本月历史日历，一个入口直达，不再分成两层弹窗。 */
export function LotTaskSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t, getDailyTaskCalendar, lotQuota } = useApp();
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="payment-sheet task-panel-sheet lot-task-panel-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">{t('本月公信力收益历史')}</span>
            <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <button type="button" className="bsp-rules-entry task-panel-rules-entry task-panel-rules-entry--neutral" onClick={() => setRulesOpen(true)}>
            <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
            <span className="bsp-rules-entry-text">{t('查看完整公信力任务规则')}</span>
            <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
          </button>

          <LotTaskCalendarSection month={getDailyTaskCalendar()} lotQuota={lotQuota} />
        </div>
      </div>

      {rulesOpen && <LotTaskRulesSheet onClose={() => setRulesOpen(false)} />}
    </>
  );
}

function LotTaskRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('公信力任务规则')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="pb-info-sheet-body">
          <p className="pb-info-sheet-para">
            {t('未直连五星节点时，当日上限为 {credibility} 公信力：发 1 篇帖子并完成 {baseline} 次互动即可领满。', {
              credibility: TASK_LOT_CREDIBILITY_PER_UNIT,
              baseline: TASK_LOT_INTERACTIONS_PER_UNIT,
            })}
          </p>
          <p className="pb-info-sheet-para">
            {t('直连五星节点时，当日上限按直连节点数计算：每个节点对应 {perNode} 公信力额度，发 1 篇帖子并完成 {perNode} 次互动即可领满。例如，有 {nodes} 个直连五星节点，每天最多可获得 {total} 公信力额度，发 {nodes} 篇帖子并完成 {total} 次互动即可领满。', {
              perNode: TASK_LOT_UNITS_PER_NODE * TASK_LOT_CREDIBILITY_PER_UNIT,
              nodes: 3,
              total: 3 * TASK_LOT_UNITS_PER_NODE * TASK_LOT_CREDIBILITY_PER_UNIT,
            })}
          </p>
          <p className="pb-info-sheet-para">
            {t('奖励次日凌晨结算。')}
          </p>
          <div className="sup-deposit-warning">
            <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t('具体数值后续可能调整，请以任务面板内实际展示为准。')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 本月历史日历：内嵌在公信力任务面板底部，不再是需要点开的二级弹窗。 */
function LotTaskCalendarSection({
  month,
  lotQuota,
}: {
  month: TaskCalendarMonth;
  lotQuota: LotQuota;
}) {
  const { t, language } = useApp();
  const intlLocale = calendarIntlLocale(language);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    month.days.find(d => d.isToday && d.snapshot)?.date ?? null
  );
  const selectedDay = month.days.find(d => d.date === selectedDate);
  const snapshot = selectedDay?.snapshot;
  const requiredPostCount = lotRequiredPostCount(lotQuota.fiveStarNodeCount);
  const postCountDone = (snapshot?.postedCount ?? 0) >= requiredPostCount;
  const interactionDone = (snapshot?.interactedCount ?? 0) >= lotQuota.interactions;
  const earned = snapshot
    ? lotCredibilityEarned(snapshot.postedCount, snapshot.interactedCount, lotQuota.interactions)
    : 0;

  return (
    <>
      <TaskCalendarView
        month={month}
        caption={t('格内标记的是当天公信力任务的达成状态，点开日期查看当天详情')}
        selectedDate={selectedDate}
        onSelectDay={setSelectedDate}
        dayClassName={day => (day.snapshot?.bonusEligible ? 'is-full' : (day.snapshot?.posted ? 'is-posted' : ''))}
        dayExtra={day => {
          const snapshot = day.snapshot;
          if (!snapshot) return null;
          const earned = lotCredibilityEarned(snapshot.postedCount, snapshot.interactedCount, lotQuota.interactions);
          return (
            <span className={`task-calendar-day-earn${earned > 0 ? ' is-earned' : ''}`}>
              {earned > 0 ? `+${earned}` : '0'}
            </span>
          );
        }}
      />

      {snapshot && (
        <div className="task-calendar-detail">
          <div className="task-calendar-detail-meta">
            <span className="task-calendar-detail-date">
              {selectedDay.isToday
                ? t('今天')
                : new Intl.DateTimeFormat(intlLocale, { month: 'long', day: 'numeric' }).format(new Date(`${selectedDay.date}T00:00:00`))}
            </span>
          </div>
          {selectedDay.isToday && (
            <div className="task-calendar-detail-summary">
              <span className="task-calendar-detail-summary-copy">
                {lotQuota.fiveStarNodeCount > 0
                  ? t('你已直连 {nodes} 个五星节点，今天发布 ', { nodes: lotQuota.fiveStarNodeCount })
                  : t('今天发布 ')}
                <strong className="task-calendar-detail-summary-emphasis">{requiredPostCount}</strong>
                {t(' 篇帖子、对他人帖子完成互动 ')}
                <strong className="task-calendar-detail-summary-emphasis">{lotQuota.interactions}</strong>
                {t(' 次，最多 ')}
                <strong className="task-calendar-detail-summary-emphasis">+{lotQuota.credibility}</strong>
                {t(' 公信力')}
              </span>
            </div>
          )}
          <div className="task-calendar-detail-conditions">
            <span className={`task-calendar-detail-status${postCountDone ? ' is-posted' : ''}`}>
              {postCountDone ? <Check size={13} strokeWidth={2.6} /> : <Circle size={13} strokeWidth={1.9} />}
              {t('发帖')}
              <strong>{t('已发')} <span className="task-calendar-detail-number">{snapshot.postedCount}</span> / <span className="task-calendar-detail-number">{requiredPostCount}</span> {t('篇')}</strong>
            </span>
            <span className={`task-calendar-detail-status${interactionDone ? ' is-posted' : ''}`}>
              {interactionDone ? <Check size={13} strokeWidth={2.6} /> : <Circle size={13} strokeWidth={1.9} />}
              {t('跟别人的帖子互动')}
              <strong>{t('已互动')} <span className="task-calendar-detail-number">{snapshot.interactedCount}</span> / <span className="task-calendar-detail-number">{lotQuota.interactions}</span> {t('次')}</strong>
            </span>
          </div>
          <span className="task-calendar-detail-row">
            {t('当日公信力奖励')}<strong>
              <span className="task-calendar-detail-number">+{earned}</span> {t('公信力')}
            </strong>
          </span>
        </div>
      )}
    </>
  );
}
