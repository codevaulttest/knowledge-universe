import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { formatCompactBalance } from '../formatCount';
import { formatSupAmount, formatTokenAmount } from '../stakeConfig';

/** 页顶 hero 极简余额：数字 + 单位，点开看资产说明 */
export function PlanetHeroBalances() {
  const { t, language, walletConnected, pbBalance, supBalance } = useApp();
  const [pbInfoOpen, setPbInfoOpen] = useState(false);

  if (!walletConnected) return null;

  return (
    <>
      <button
        type="button"
        className="planet-hero-balances"
        onClick={() => setPbInfoOpen(true)}
        aria-label={`${formatCompactBalance(pbBalance, language)} PB，${formatCompactBalance(supBalance, language)} SUP，${t('查看资产说明')}`}
        title={`${formatTokenAmount(pbBalance)} PB · ${formatSupAmount(supBalance)} SUP`}
      >
        <span className="planet-hero-balances-stack">
          <span className="planet-hero-balances-item planet-hero-balances-item--pb">
            <span className="planet-hero-balances-value">{formatCompactBalance(pbBalance, language)}</span>
            <span className="planet-hero-balances-unit">PB</span>
            <ChevronRight size={14} strokeWidth={2} className="planet-hero-balances-chevron" aria-hidden="true" />
          </span>
          <span className="planet-hero-balances-item">
            <span className="planet-hero-balances-value">{formatCompactBalance(supBalance, language)}</span>
            <span className="planet-hero-balances-unit">SUP</span>
          </span>
        </span>
      </button>

      {pbInfoOpen && createPortal(
        <div className="sheet-backdrop" onClick={() => setPbInfoOpen(false)}>
          <div
            className="payment-sheet pb-info-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('资产说明')}</span>
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
              <div className="pb-info-balances">
                <div className="pb-info-balance-row">
                  <span className="pb-info-balance-label">{t('PB 余额')}</span>
                  <span className="pb-info-balance-value">{formatTokenAmount(pbBalance)} PB</span>
                </div>
                <div className="pb-info-balance-row">
                  <span className="pb-info-balance-label">{t('SUP 余额')}</span>
                  <span className="pb-info-balance-value">{formatSupAmount(supBalance)} SUP</span>
                </div>
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
        </div>,
        document.body,
      )}
    </>
  );
}
