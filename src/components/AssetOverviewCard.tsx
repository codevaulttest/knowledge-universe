import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, ChevronRight, Gift, Info, Wallet, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { formatCompactBalance } from '../formatCount';
import { getAirdropDeadline, MOCK_PB_AIRDROP_AMOUNT } from '../mockData';
import { formatSupAmount, formatTokenAmount } from '../stakeConfig';
import { TaskPanelSheet } from './TaskPanelSheet';
import { TASK_INTERACTION_POOL_SIZE } from '../taskConfig';

export function AssetOverviewCard() {
  const { t, language, navigateRoot, walletConnected, pbBalance, supBalance, airdropClaimed, claimAirdrop, taskSnapshotToday, taskSnapshotYesterday } = useApp();
  const [pbInfoOpen, setPbInfoOpen] = useState(false);
  const [airdropRuleOpen, setAirdropRuleOpen] = useState(false);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const airdropMissed = !airdropClaimed && getAirdropDeadline(now) - now <= 0;
  const airdropClaimable = !airdropClaimed && !airdropMissed;

  // 全部换算成 PB（和上方金额同单位），页面不出现百分比，方便直接比大小
  const fullPb = MOCK_PB_AIRDROP_AMOUNT;
  const todayPb = Math.round(fullPb * taskSnapshotYesterday.claimRatio / 100);
  const tomorrowPb = Math.round(fullPb * taskSnapshotToday.claimRatio / 100);
  const interacted = taskSnapshotToday.interactedCount;
  const remaining = Math.max(0, TASK_INTERACTION_POOL_SIZE - interacted);
  const isFull = remaining === 0;
  const progressPct = Math.min(100, (interacted / TASK_INTERACTION_POOL_SIZE) * 100);

  if (!walletConnected) return null;

  return (
    <>
      <div className="asset-overview-card">
        {/* 今天可以领 */}
        <div className="asset-overview-airdrop-top">
          <div className="asset-overview-airdrop-left">
            <span className="asset-overview-icon-col">
              <span className="asset-overview-airdrop-icon">
                <Gift size={20} strokeWidth={1.8} />
              </span>
            </span>
            <div className="asset-overview-airdrop-info">
              <div className="asset-overview-airdrop-label-row">
                <span className="asset-overview-airdrop-label">
                  {t('今天可以领')}
                </span>
              </div>
              {airdropClaimed ? (
                <span className="asset-overview-airdrop-badge">{t('今日已领取')}</span>
              ) : airdropMissed ? (
                <span className="asset-overview-airdrop-badge asset-overview-airdrop-badge--missed">
                  {t('今日已错过')}
                  <button
                    type="button"
                    className="asset-overview-info-btn"
                    onClick={() => setAirdropRuleOpen(true)}
                    aria-label={t('查看空投规则')}
                  >
                    <Info size={13} strokeWidth={2} />
                  </button>
                </span>
              ) : (
                <>
                  <div className="asset-overview-airdrop-amount">
                    {formatTokenAmount(todayPb)}
                    <span className="asset-overview-airdrop-unit"> PB</span>
                  </div>
                  <span className="asset-overview-airdrop-deadline">
                    {t('今晚 10 点后过期作废')}
                    <button
                      type="button"
                      className="asset-overview-info-btn"
                      onClick={() => setAirdropRuleOpen(true)}
                      aria-label={t('查看空投规则')}
                    >
                      <Info size={13} strokeWidth={2} />
                    </button>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="asset-overview-airdrop-claim-col">
            <button
              type="button"
              className={`asset-overview-claim-btn${airdropClaimed || airdropMissed ? ' asset-overview-claim-btn--done' : ''}`}
              onClick={claimAirdrop}
              disabled={airdropClaimed || airdropMissed}
            >
              {airdropClaimed ? t('已领取') : airdropMissed ? t('已错过') : t('领取空投')}
            </button>
          </div>
        </div>

        {/* 明天可以领 */}
        <div className="asset-overview-tomorrow">
          <button
            type="button"
            className="asset-overview-tomorrow-head"
            onClick={() => setTaskPanelOpen(true)}
            aria-label={t('查看任务')}
          >
            <span className="asset-overview-icon-col">
              <span className="asset-overview-tomorrow-icon">
                <CalendarClock size={20} strokeWidth={1.8} />
              </span>
            </span>
            <span className="asset-overview-tomorrow-title">{t('明天可以领')}</span>
            <ChevronRight size={15} strokeWidth={2} className="asset-overview-toggle-chevron" />
          </button>

          <div className="asset-overview-tomorrow-body">
            <div className="asset-overview-tomorrow-amount">
              <span className="asset-overview-tomorrow-amount-value">
                {formatTokenAmount(tomorrowPb)}
                <span className="asset-overview-airdrop-unit"> PB</span>
              </span>
              <ArrowRight size={15} strokeWidth={2.4} className="asset-overview-tomorrow-arrow" aria-hidden="true" />
              <span className="asset-overview-tomorrow-max">{t('最多 {max} PB', { max: formatTokenAmount(fullPb) })}</span>
            </div>

            <div className="asset-overview-tomorrow-progress">
              <span className="asset-overview-tomorrow-track">
                <span className="asset-overview-tomorrow-fill" style={{ width: `${progressPct}%` }} />
              </span>
              <span className="asset-overview-tomorrow-caption">
                {t('今天已互动 {count} 次', { count: interacted })}
              </span>
            </div>

            <div className="asset-overview-tomorrow-action">
              <span className="asset-overview-tomorrow-hint">
                {isFull
                  ? t('明天可领满 {max} PB', { max: formatTokenAmount(fullPb) })
                  : t('再互动 {remaining} 次，明天就能领满', { remaining })}
              </span>
              {!isFull && (
                <button
                  type="button"
                  className="asset-overview-go-btn"
                  onClick={() => navigateRoot({ page: 'P0', tab: 0 })}
                >
                  {t('去互动')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="asset-overview-balances">
          <button
            type="button"
            className="asset-overview-balance-cell"
            onClick={() => setPbInfoOpen(true)}
            aria-label={t('查看 PB 说明')}
            title={`${formatTokenAmount(pbBalance)} PB`}
          >
            <span className="asset-overview-balance-cell-label">
              <Wallet size={13} strokeWidth={2} className="asset-overview-balance-cell-wallet" aria-hidden="true" />
              {t('PB 余额')}
              <Info size={12} strokeWidth={2} className="asset-overview-balance-cell-info" />
            </span>
            <span className="asset-overview-balance-cell-value">
              {formatCompactBalance(pbBalance, language)}
              <span className="asset-overview-balance-cell-unit"> PB</span>
            </span>
          </button>
          <span className="asset-overview-balance-divider" aria-hidden="true" />
          <div
            className="asset-overview-balance-cell asset-overview-balance-cell--static"
            title={`${formatSupAmount(supBalance)} SUP`}
            aria-label={`${t('SUP 余额')} ${formatSupAmount(supBalance)} SUP`}
          >
            <span className="asset-overview-balance-cell-label">
              <Wallet size={13} strokeWidth={2} className="asset-overview-balance-cell-wallet" aria-hidden="true" />
              {t('SUP 余额')}
            </span>
            <span className="asset-overview-balance-cell-value">
              {formatCompactBalance(supBalance, language)}
              <span className="asset-overview-balance-cell-unit"> SUP</span>
            </span>
          </div>
        </div>
      </div>

      {pbInfoOpen && (
        <div className="sheet-backdrop" onClick={() => setPbInfoOpen(false)}>
          <div
            className="payment-sheet pb-info-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('PB 说明')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setPbInfoOpen(false)}
                aria-label={t('关闭')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="pb-info-sheet-body">
              <div className="pb-info-balance-row">
                <span className="pb-info-balance-label">{t('当前余额')}</span>
                <span className="pb-info-balance-value">{formatTokenAmount(pbBalance)} PB</span>
              </div>
              <p className="pb-info-sheet-para pb-info-sheet-heading">
                {t('关于知识宇宙"PB"的定义与核心机制说明')}
              </p>
              <p className="pb-info-sheet-para">
                {t('在知识宇宙生态中，PB（全称 Public Belief，即"公信力积分"）是贯穿整个数贸与节点网络的核心资产。其核心定义与运行规则如下：')}
              </p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('本质定位：')}</strong>
                {t('PB 是对用户参与生态建设的贡献值计量单位，而非传统意义上的数字货币。')}
              </p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('获取机制（基于 AI 算法）：')}</strong>
                {t('用户通过每日登录签到、发布优质作品、点赞转发互动以及链接推广等行为建设生态。系统通过 AI 算法对上述行为进行多维权重计算，最终以生态空投的形式将 PB 赠送给用户。')}
              </p>
              <p className="pb-info-sheet-para pb-info-sheet-subheading">{t('核心用途：')}</p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('解锁与待遇：')}</strong>
                {t('用于解锁频道高级功能、消耗订阅以链接子节点，并换取相应的生态权益与星级待遇。')}
              </p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('自由转让：')}</strong>
                {t('支持在生态网络内部进行用户间的自由转让与流通。')}
              </p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('合规红线：')}</strong>
                {t('平台不做任何法币兑换的承诺。PB 的价值完全取决于生态内公信力的凝聚与应用场景的拓展，属于纯粹的生态功能性凭证。')}
              </p>
              <div className="sup-deposit-warning">
                <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  {t('支持在生态网络内部进行用户间的自由转让与协作使用。平台严禁任何用户利用PB进行私下法币买卖或变相代币承兑，一经发现将对违规节点进行降星或封禁处理。')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {airdropRuleOpen && (
        <div className="sheet-backdrop" onClick={() => setAirdropRuleOpen(false)}>
          <div
            className="payment-sheet pb-info-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('空投规则')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setAirdropRuleOpen(false)}
                aria-label={t('关闭')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="pb-info-sheet-body">
              <p className="pb-info-sheet-para">
                {t('需在北京时间当天 22:00 前点击"领取空投"，逾期未领取则本轮空投作废。')}
              </p>
              <p className="pb-info-sheet-para">
                {t('可领取比例取决于昨日互动帖任务完成度，完成度越高可领取比例越高。')}
              </p>
              <button
                type="button"
                className="bsp-rules-entry"
                onClick={() => { setAirdropRuleOpen(false); setTaskPanelOpen(true); }}
              >
                <CalendarClock size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
                <span className="bsp-rules-entry-text">{t('查看任务')}</span>
                <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}

      {taskPanelOpen && <TaskPanelSheet onClose={() => setTaskPanelOpen(false)} />}
    </>
  );
}
