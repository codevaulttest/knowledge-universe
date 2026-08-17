import { useState } from 'react';
import { AlertTriangle, Check, ChevronRight, FileText, Info, Sparkles, X } from 'lucide-react';
import { useApp } from '../AppContext';
import {
  TASK_CELEBRATE_EVERY,
  TASK_INTERACTION_BASE_RATIO,
  TASK_INTERACTION_POOL_SIZE,
  TASK_INTERACTION_TIER1_COUNT,
  TASK_INTERACTION_TIER1_STEP,
  TASK_INTERACTION_TIER2_STEP,
} from '../taskConfig';

type TaskTab = 'today' | 'yesterday';

function useTaskDaySnapshot() {
  const { taskSnapshotToday, taskSnapshotYesterday } = useApp();
  const [tab, setTab] = useState<TaskTab>('today');
  const snapshot = tab === 'today' ? taskSnapshotToday : taskSnapshotYesterday;
  return { tab, setTab, snapshot };
}

function TaskDayToggle({
  tab,
  onChange,
}: {
  tab: TaskTab;
  onChange: (tab: TaskTab) => void;
}) {
  const { t } = useApp();
  return (
    <div className="create-scale-toggle task-panel-toggle">
      <button
        type="button"
        className={`create-scale-tab${tab === 'today' ? ' create-scale-tab--active' : ''}`}
        onClick={() => onChange('today')}
      >
        {t('今天')}
      </button>
      <button
        type="button"
        className={`create-scale-tab${tab === 'yesterday' ? ' create-scale-tab--active' : ''}`}
        onClick={() => onChange('yesterday')}
      >
        {t('昨天')}
      </button>
    </div>
  );
}

/** 互动帖任务弹窗：决定次日空投领取比例 */
export function InteractionTaskSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();
  const { tab, setTab, snapshot } = useTaskDaySnapshot();
  const [rulesOpen, setRulesOpen] = useState(false);
  const tier1Percent = (TASK_INTERACTION_TIER1_COUNT / TASK_INTERACTION_POOL_SIZE) * 100;
  const progressPercent = (snapshot.interactedCount / TASK_INTERACTION_POOL_SIZE) * 100;

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

          <p className="task-panel-note">
            {t('互动帖任务的完成情况将决定明天可领取空投收益的比例')}
          </p>

          <button type="button" className="bsp-rules-entry task-panel-rules-entry" onClick={() => setRulesOpen(true)}>
            <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
            <span className="bsp-rules-entry-text">{t('查看完整任务规则')}</span>
            <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
          </button>

          <TaskDayToggle tab={tab} onChange={setTab} />

          <div className="task-card task-card--interaction">
            <div className="task-card-head">
              <span className="task-card-icon" aria-hidden="true">
                {snapshot.interactedCount >= TASK_INTERACTION_POOL_SIZE
                  ? <Check size={16} strokeWidth={2.6} />
                  : <Sparkles size={16} strokeWidth={1.9} />}
              </span>
              <span className="task-card-body">
                <span className="task-card-title">{t('互动帖任务')}</span>
                <span className="task-card-desc">
                  {tab === 'today'
                    ? t('今天已互动 {count} / {total} 次', { count: snapshot.interactedCount, total: TASK_INTERACTION_POOL_SIZE })
                    : t('昨天已互动 {count} / {total} 次', { count: snapshot.interactedCount, total: TASK_INTERACTION_POOL_SIZE })}
                </span>
              </span>
              <span className="task-card-ratio">{snapshot.claimRatio}%</span>
            </div>

            <div className="task-progress-track">
              <div className="task-progress-fill" style={{ width: `${Math.min(100, progressPercent)}%` }} />
              <span className="task-progress-marker" style={{ left: `${tier1Percent}%` }} aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {rulesOpen && <InteractionTaskRulesSheet onClose={() => setRulesOpen(false)} />}
    </>
  );
}

/** BSP 巨星投流任务弹窗：发帖即达标 */
export function BspTaskSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();
  const { tab, setTab, snapshot } = useTaskDaySnapshot();
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="payment-sheet task-panel-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">{t('BSP 巨星投流任务')}</span>
            <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <p className="task-panel-note">
            {t('当天发帖，次日即可享有 BSP 打赏保底。')}
          </p>

          <button type="button" className="bsp-rules-entry task-panel-rules-entry" onClick={() => setRulesOpen(true)}>
            <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
            <span className="bsp-rules-entry-text">{t('查看 BSP 保底规则')}</span>
            <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
          </button>

          <TaskDayToggle tab={tab} onChange={setTab} />

          <div className={`task-card${snapshot.posted ? ' task-card--done' : ''}`}>
            <span className="task-card-icon" aria-hidden="true">
              {snapshot.posted ? <Check size={16} strokeWidth={2.6} /> : <FileText size={16} strokeWidth={1.9} />}
            </span>
            <span className="task-card-body">
              <span className="task-card-title">{t('发帖任务')}</span>
              <span className="task-card-desc">
                {snapshot.posted ? t('已发布内容') : t('还没有发布内容')}
              </span>
            </span>
          </div>
        </div>
      </div>

      {rulesOpen && <BspTaskRulesSheet onClose={() => setRulesOpen(false)} />}
    </>
  );
}

/** @deprecated 使用 InteractionTaskSheet / BspTaskSheet；保留别名避免旧引用断裂 */
export const TaskPanelSheet = InteractionTaskSheet;

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
            {t('互动帖任务如何影响空投领取比例')}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('互动帖任务：')}</strong>
            {t('系统每天推荐 {total} 篇互动帖，对任意一篇进行点赞/评论/收藏/踩任一操作即视为完成 1 篇（同一帖子多次操作只算一次）。完成越多，次日空投领取比例越高。', { total: TASK_INTERACTION_POOL_SIZE })}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('领取比例换算：')}</strong>
            {t('未完成任何互动的保底比例为 {base}%；前 {tier1} 篇每篇 +{step1}%；第 {tier1Next}～{total} 篇每篇 +{step2}%；{total} 篇全部完成对应 100%。', {
              base: TASK_INTERACTION_BASE_RATIO,
              tier1: TASK_INTERACTION_TIER1_COUNT,
              step1: TASK_INTERACTION_TIER1_STEP,
              tier1Next: TASK_INTERACTION_TIER1_COUNT + 1,
              total: TASK_INTERACTION_POOL_SIZE,
              step2: TASK_INTERACTION_TIER2_STEP,
            })}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('生效时间：')}</strong>
            {t('今天的任务完成情况，决定明天可领取空投收益的比例。')}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('里程碑提示：')}</strong>
            {t('互动帖任务每完成 {every} 次会有一次特效提示，帮助你直观了解当前累计比例。', { every: TASK_CELEBRATE_EVERY })}
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

function BspTaskRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('BSP 保底规则')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="pb-info-sheet-body">
          <p className="pb-info-sheet-para pb-info-sheet-heading">
            {t('BSP 巨星投流任务')}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('发帖任务：')}</strong>
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
