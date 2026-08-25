import { useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Circle, Gift, History, Info, MousePointerClick, ThumbsUp, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { calendarIntlLocale } from '../dateUtils';
import { formatTokenAmount } from '../stakeConfig';
import {
  TASK_EARNINGS_UNSETTLED,
  TASK_INTERACTION_POOL_SIZE,
  TASK_LOT_HONOR_PER_UNIT,
  TASK_LOT_LIKES_PER_UNIT,
  TASK_LOT_UNITS_PER_NODE,
  type LotQuota,
  type TaskCalendarMonth,
} from '../taskConfig';

/** 每日任务统一面板：互动帖任务 + 一发十赞 + 发帖任务 + BSP 保底 + 历史日历。 */
export function DailyTaskSheet({
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
            {t('互动帖任务决定明天的领取上限；一发十赞决定今天的荣誉值奖励')}
          </p>

          <button type="button" className="bsp-rules-entry task-panel-rules-entry" onClick={() => setRulesOpen(true)}>
            <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
            <span className="bsp-rules-entry-text">{t('查看完整任务规则')}</span>
            <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
          </button>

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
                <span className="task-card-ratio">{interacted}</span>
                <span className="task-card-ratio-label">/ {TASK_INTERACTION_POOL_SIZE} {t('次')}</span>
              </span>
            </div>

            <div className="task-progress-track">
              <div className="task-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>

            <p className="task-group-note">{t('今天的互动次数决定明天的空投领取上限')}</p>
          </div>

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

      {rulesOpen && <DailyTaskRulesSheet onClose={() => setRulesOpen(false)} />}
      {historyOpen && <DailyTaskHistorySheet onClose={() => setHistoryOpen(false)} month={getDailyTaskCalendar()} lotQuota={lotQuota} />}
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
            {t('当天发帖，每 {likes} 个赞为 1 组，每组 +{honor} 荣誉值', { likes: TASK_LOT_LIKES_PER_UNIT, honor: TASK_LOT_HONOR_PER_UNIT })}
          </span>
        </span>
        <span className="task-card-ratio-col">
          <span className="task-card-ratio">{lotQuota.honor}</span>
          <span className="task-card-ratio-label">{t('荣誉值上限')}</span>
        </span>
      </div>

      <p className="task-group-note">
        {lotQuota.units > 0
          ? t('已链接 {nodes} 个节点，今日可完成 {units} 组「一发十赞」，共 {likes} 个赞', {
              nodes: lotQuota.nodeCount, units: lotQuota.units, likes: lotQuota.likes,
            })
          : t('链接节点后即可解锁「一发十赞」配额')}
      </p>

      <div className="task-milestone-row">
        <span className={`task-milestone-chip${bonusEligible ? ' task-milestone-chip--done' : ''}`}>
          {bonusEligible ? <Check size={12} strokeWidth={2.6} /> : <Gift size={12} strokeWidth={1.9} />}
          {t('发帖 + 满 {likes} 赞 · +{honor} 荣誉值', { likes: TASK_LOT_LIKES_PER_UNIT, honor: TASK_LOT_HONOR_PER_UNIT })}
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
            {t('每天对任意 {total} 篇帖子完成点赞/评论/转发/收藏/踩/解锁/打赏任一操作即视为完成 1 篇（同一帖子多次操作只算一次）。', { total: TASK_INTERACTION_POOL_SIZE })}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('一发十赞：')}</strong>
            {t('每个已链接节点每天可完成 {perNode} 组「一发十赞」，每组为当天发帖 + 满 {likes} 个赞，发放 +{honor} 荣誉值，次日凌晨结算。', {
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

function DailyTaskHistorySheet({
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
  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: 'long' }).format(new Date(`${month.anchorDate}T00:00:00`));
  // 2023-01-01 是周日，用它取各语言"周几"的极简单字符标签，对齐 getDay() 的 0=周日 顺序
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intlLocale, { weekday: 'narrow' }).format(new Date(2023, 0, 1 + i))
  );
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

        <div className="task-calendar-month">{monthLabel}</div>

        <p className="task-calendar-caption">{t('格内数字是当天到账的收益，点开日期查看当天详情')}</p>

        <div className="task-calendar-weekdays">
          {weekdayLabels.map((label, i) => (
            <span key={i} className="task-calendar-weekday">{label}</span>
          ))}
        </div>

        <div className="task-calendar-grid">
          {Array.from({ length: month.leadingBlanks }, (_, i) => (
            <span key={`blank-${i}`} className="task-calendar-day-blank" aria-hidden="true" />
          ))}
          {month.days.map(day => {
            const snapshot = day.snapshot;
            return (
              <button
                type="button"
                key={day.date}
                disabled={!snapshot}
                onClick={() => setSelectedDate(day.date)}
                className={[
                  'task-calendar-day',
                  day.isToday && 'is-today',
                  snapshot && (snapshot.posted && snapshot.interactedCount >= TASK_INTERACTION_POOL_SIZE
                    ? 'is-full'
                    : (snapshot.posted || snapshot.interactedCount > 0) && 'is-posted'),
                  day.date === selectedDate && 'is-selected',
                ].filter(Boolean).join(' ')}
              >
                <span className="task-calendar-day-num">{day.day}</span>
                {snapshot && snapshot.earningsPb !== TASK_EARNINGS_UNSETTLED && (
                  <span className={`task-calendar-day-earn${snapshot.earningsPb > 0 ? ' is-earned' : ''}`}>
                    {snapshot.earningsPb > 0 ? `+${formatTokenAmount(snapshot.earningsPb)}` : '0'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedDay?.snapshot && (
          <div className="task-calendar-detail">
            <span className="task-calendar-detail-date">
              {new Intl.DateTimeFormat(intlLocale, { month: 'long', day: 'numeric' }).format(new Date(`${selectedDay.date}T00:00:00`))}
            </span>
            <span className={`task-calendar-detail-status${selectedDay.snapshot.posted ? ' is-posted' : ''}`}>
              {selectedDay.snapshot.posted ? <Check size={13} strokeWidth={2.6} /> : <Circle size={13} strokeWidth={1.9} />}
              {selectedDay.snapshot.posted ? t('当日已发帖') : t('当日未发帖')}
            </span>
            <span className="task-calendar-detail-row">
              {t('当日互动')}<strong>{selectedDay.snapshot.interactedCount} / {TASK_INTERACTION_POOL_SIZE}</strong>
            </span>
            {selectedDay.snapshot.earningsPb !== TASK_EARNINGS_UNSETTLED && (
              <span className="task-calendar-detail-row">
                {t('当日收益')}<strong>
                  {selectedDay.snapshot.earningsPb > 0 ? `+${formatTokenAmount(selectedDay.snapshot.earningsPb)} PB` : t('0（未达成/已错过）')}
                </strong>
              </span>
            )}
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
          {lotQuota.units > 0
            ? t('你已链接 {nodes} 个节点，每天可完成 {units} 组「一发十赞」，共 {likes} 个赞，最多 +{honor} 荣誉值', {
                nodes: lotQuota.nodeCount, units: lotQuota.units, likes: lotQuota.likes, honor: lotQuota.honor,
              })
            : t('你名下还没有挂节点，暂时拿不到「一发十赞」配额；链接节点后这里会显示你每天可完成的组数')}
        </p>
      </div>
    </div>
  );
}
