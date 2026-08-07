import { useState } from 'react';
import { AlertTriangle, Check, ChevronRight, FileText, Info, Sparkles, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { BSP_GUARANTEE_MIN_INTERACTIONS } from '../bspConfig';
import {
  TASK_CELEBRATE_EVERY,
  TASK_INTERACTION_BASE_RATIO,
  TASK_INTERACTION_POOL_SIZE,
  TASK_INTERACTION_TIER1_COUNT,
  TASK_INTERACTION_TIER1_STEP,
  TASK_INTERACTION_TIER2_STEP,
} from '../taskConfig';

type TaskTab = 'today' | 'yesterday';

/** 任务面板：展示「今天/昨天」发帖任务与互动帖任务的完成情况与对应领取比例 */
export function TaskPanelSheet({ onClose }: { onClose: () => void }) {
  const { t, taskSnapshotToday, taskSnapshotYesterday } = useApp();
  const [tab, setTab] = useState<TaskTab>('today');
  const [rulesOpen, setRulesOpen] = useState(false);

  const snapshot = tab === 'today' ? taskSnapshotToday : taskSnapshotYesterday;
  const tier1Percent = (TASK_INTERACTION_TIER1_COUNT / TASK_INTERACTION_POOL_SIZE) * 100;
  const progressPercent = (snapshot.interactedCount / TASK_INTERACTION_POOL_SIZE) * 100;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="payment-sheet task-panel-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">{t('任务')}</span>
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

          <div className="create-scale-toggle task-panel-toggle">
            <button
              type="button"
              className={`create-scale-tab${tab === 'today' ? ' create-scale-tab--active' : ''}`}
              onClick={() => setTab('today')}
            >
              {t('今天')}
            </button>
            <button
              type="button"
              className={`create-scale-tab${tab === 'yesterday' ? ' create-scale-tab--active' : ''}`}
              onClick={() => setTab('yesterday')}
            >
              {t('昨天')}
            </button>
          </div>

          <p className="task-group-label">{t('影响空投领取比例')}</p>

          <div className="task-card task-card--interaction">
            <div className="task-card-head">
              <span className="task-card-icon" aria-hidden="true">
                {snapshot.interactedCount >= TASK_INTERACTION_POOL_SIZE ? <Check size={16} strokeWidth={2.6} /> : <Sparkles size={16} strokeWidth={1.9} />}
              </span>
              <span className="task-card-body">
                <span className="task-card-title">{t('互动帖任务')}</span>
                <span className="task-card-desc">
                  {t('已完成 {count} / {total} 篇', { count: snapshot.interactedCount, total: TASK_INTERACTION_POOL_SIZE })}
                </span>
              </span>
              <span className="task-card-ratio">{snapshot.claimRatio}%</span>
            </div>

            <div className="task-progress-track">
              <div className="task-progress-fill" style={{ width: `${Math.min(100, progressPercent)}%` }} />
              <span className="task-progress-marker" style={{ left: `${tier1Percent}%` }} aria-hidden="true" />
            </div>
          </div>

          <p className="task-group-label">{t('影响 BSP 巨星投流保底')}</p>

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

          <p className="task-group-note">
            {t('需当天发帖，且互动帖任务完成 {min} 篇以上，次日才享有 BSP 打赏保底。', { min: BSP_GUARANTEE_MIN_INTERACTIONS })}
          </p>
        </div>
      </div>

      {rulesOpen && <TaskRulesSheet onClose={() => setRulesOpen(false)} />}
    </>
  );
}

/** 任务规则说明 —— 阶梯比例表与生效时间说明 */
function TaskRulesSheet({ onClose }: { onClose: () => void }) {
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
            <strong className="pb-info-sheet-label">{t('发帖任务：')}</strong>
            {t('当天至少发布 1 篇内容即视为完成。它是 BSP 巨星投流每日打赏保底的门槛：当天发帖、且互动帖任务完成 {min} 篇以上，次日才享有打赏保底。', { min: BSP_GUARANTEE_MIN_INTERACTIONS })}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('生效时间：')}</strong>
            {t('今天的任务完成情况，决定明天可领取空投收益的比例。')}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('里程碑提示：')}</strong>
            {t('互动帖任务每完成 {every} 篇会有一次特效提示，帮助你直观了解当前累计比例。', { every: TASK_CELEBRATE_EVERY })}
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
