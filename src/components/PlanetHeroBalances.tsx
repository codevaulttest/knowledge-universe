import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronRight, Info, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { formatCompactBalance } from '../formatCount';
import { formatSupAmount, formatTokenAmount } from '../stakeConfig';
import { PB_WALLETS, PB_WALLET_DISPLAY_ORDER } from '../walletConfig';
import { MERIT_PER_ADN } from '../shopConfig';

/** 页顶 hero 资产摘要：最多展示三种高频资产；后续类型以 +N 保持入口高度不变。 */
export function PlanetHeroBalances() {
  const { t, language, walletConnected, pbWallets, supWallets, supBalance, meritBalance } = useApp();
  const [pbInfoOpen, setPbInfoOpen] = useState(false);
  const [pbDetailOpen, setPbDetailOpen] = useState(false);
  const [honorInfoOpen, setHonorInfoOpen] = useState(false);
  const [supInfoOpen, setSupInfoOpen] = useState(false);

  if (!walletConnected) return null;

  // 新资产只需追加到此列表；首页固定展示前三种，其余由 +N 种资产承接。
  const heroAssets = [
    { id: 'pb', value: pbWallets.onchain + pbWallets.airdrop + pbWallets.station, unit: 'PB', ariaLabel: 'PB' },
    { id: 'honor', value: pbWallets.honor, unit: t('荣誉值'), ariaLabel: t('荣誉值') },
    { id: 'sup', value: supBalance, unit: 'SUP', ariaLabel: 'SUP' },
  ];
  const visibleHeroAssets = heroAssets.slice(0, 3);
  const hiddenAssetCount = heroAssets.length - visibleHeroAssets.length;
  const [pbAsset, honorAsset, supAsset] = visibleHeroAssets;
  const assetAriaLabel = `${visibleHeroAssets.map(asset => `${formatCompactBalance(asset.value, language)} ${asset.ariaLabel}`).join('，')}${hiddenAssetCount > 0 ? `，${t('+{count} 种资产', { count: hiddenAssetCount })}` : ''}，${t('查看资产余额')}`;

  return (
    <>
      <button
        type="button"
        className="planet-hero-balances"
        onClick={() => setPbInfoOpen(true)}
        aria-label={assetAriaLabel}
        title={assetAriaLabel}
      >
        <span className="planet-hero-balances-stack">
          <span className="planet-hero-balances-row">
            <span className="planet-hero-balances-item planet-hero-balances-item--pb">
              <span className="planet-hero-balances-value">{formatCompactBalance(pbAsset.value, language)}</span>
              <span className="planet-hero-balances-unit">{pbAsset.unit}</span>
            </span>
            <span className="planet-hero-balances-item planet-hero-balances-item--honor">
              <span className="planet-hero-balances-value">{formatCompactBalance(honorAsset.value, language)}</span>
              <span className="planet-hero-balances-unit">{honorAsset.unit}</span>
            </span>
          </span>
          <span className="planet-hero-balances-row planet-hero-balances-row--bottom">
            <span className="planet-hero-balances-item">
              <span className="planet-hero-balances-value">{formatCompactBalance(supAsset.value, language)}</span>
              <span className="planet-hero-balances-unit">{supAsset.unit}</span>
            </span>
            {hiddenAssetCount > 0 && (
              <span className="planet-hero-balances-overflow">{t('+{count} 种资产', { count: hiddenAssetCount })}</span>
            )}
            <ChevronRight size={14} strokeWidth={2} className="planet-hero-balances-chevron" aria-hidden="true" />
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
              <span className="sheet-title">{t('我的资产')}</span>
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
                {PB_WALLET_DISPLAY_ORDER.map(wallet => {
                  const meta = PB_WALLETS[wallet];
                  const isHonor = wallet === 'honor';
                  return (
                    <div className="pb-info-balance-row" key={wallet}>
                      <span className="pb-info-balance-label pb-info-balance-label--with-action">
                        <span>{`${t(meta.labelKey)} · ${t(meta.sourceKey)}`}</span>
                        <button
                          type="button"
                          className="asset-overview-info-btn"
                          onClick={() => {
                            setPbInfoOpen(false);
                            if (isHonor) setHonorInfoOpen(true); else setPbDetailOpen(true);
                          }}
                          aria-label={isHonor ? t('查看荣誉值说明') : t('查看 PB 说明')}
                        >
                          <Info size={13} strokeWidth={2} />
                        </button>
                      </span>
                      <span className="pb-info-balance-value">
                        {formatTokenAmount(pbWallets[wallet])} {t(meta.unitKey)}
                      </span>
                    </div>
                  );
                })}
                <div className="pb-info-balance-row">
                  <span className="pb-info-balance-label pb-info-balance-label--with-action">
                    <span>{t('站内 SUP')}</span>
                    <button
                      type="button"
                      className="asset-overview-info-btn"
                      onClick={() => {
                        setPbInfoOpen(false);
                        setSupInfoOpen(true);
                      }}
                      aria-label={t('查看 SUP 说明')}
                    >
                      <Info size={13} strokeWidth={2} />
                    </button>
                  </span>
                  <span className="pb-info-balance-value">{formatSupAmount(supWallets.site)} SUP</span>
                </div>
                <div className="pb-info-balance-row">
                  <span className="pb-info-balance-label">{t('链上 SUP')}</span>
                  <span className="pb-info-balance-value">{formatSupAmount(supWallets.onchain)} SUP</span>
                </div>
                <div className="pb-info-balance-row">
                  <span className="pb-info-balance-label">{t('优点 · 小黄车购物赠送')}</span>
                  <span className="pb-info-balance-value">{meritBalance} {t('优点')}</span>
                </div>
              </div>
              <p className="pb-info-sheet-para">{t('满 {count} 优点兑 1 张 ADN 抽奖券；优点结算将于 9 月 15 日首次发放', { count: MERIT_PER_ADN })}</p>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {pbDetailOpen && createPortal(
        <div className="sheet-backdrop" onClick={() => setPbDetailOpen(false)}>
          <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{t('PB 说明')}</span>
              <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={() => setPbDetailOpen(false)} aria-label={t('关闭')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="pb-info-sheet-body">
              <p className="pb-info-sheet-para pb-info-sheet-heading">{t('关于知识宇宙"PB"的定义与核心机制说明')}</p>
              <p className="pb-info-sheet-para">{t('在知识宇宙生态中，PB（全称 Public Belief，即"公信力积分"）是贯穿整个数贸与节点网络的核心资产。其核心定义与运行规则如下：')}</p>
              <p className="pb-info-sheet-para"><strong className="pb-info-sheet-label">{t('本质定位：')}</strong>{t('PB 是对用户参与生态建设的贡献值计量单位，而非传统意义上的数字货币。')}</p>
              <p className="pb-info-sheet-para"><strong className="pb-info-sheet-label">{t('获取机制（基于 AI 算法）：')}</strong>{t('用户通过每日登录签到、发布优质作品、点赞转发互动以及链接推广等行为建设生态。系统通过 AI 算法对上述行为进行多维权重计算，最终以生态空投的形式将 PB 赠送给用户。')}</p>
              <p className="pb-info-sheet-para pb-info-sheet-subheading">{t('核心用途：')}</p>
              <p className="pb-info-sheet-para"><strong className="pb-info-sheet-label">{t('解锁与待遇：')}</strong>{t('用于解锁频道高级功能、消耗订阅以链接子节点，并换取相应的生态权益与星级待遇。')}</p>
              <p className="pb-info-sheet-para"><strong className="pb-info-sheet-label">{t('自由转让：')}</strong>{t('支持在生态网络内部进行用户间的自由转让与流通。')}</p>
              <p className="pb-info-sheet-para"><strong className="pb-info-sheet-label">{t('合规红线：')}</strong>{t('平台不做任何法币兑换的承诺。PB 的价值完全取决于生态内公信力的凝聚与应用场景的拓展，属于纯粹的生态功能性凭证。')}</p>
              <div className="sup-deposit-warning">
                <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                <span>{t('支持在生态网络内部进行用户间的自由转让与协作使用。平台严禁任何用户利用PB进行私下法币买卖或变相代币承兑，一经发现将对违规节点进行降星或封禁处理。')}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {honorInfoOpen && createPortal(
        <div className="sheet-backdrop" onClick={() => setHonorInfoOpen(false)}>
          <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{t('荣誉值说明')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setHonorInfoOpen(false)}
                aria-label={t('关闭')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="pb-info-sheet-body">
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('来源：')}</strong>
                {t('完成每日任务的“发帖 + 10 次互动”里程碑后，系统于次日凌晨发放荣誉值。')}
              </p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('用途：')}</strong>
                {t('荣誉值可用于开通频道、BSP 巨星投流、节点升级、转让节点。')}
              </p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('支付规则：')}</strong>
                {t('使用荣誉值支付时免 Gas。')}
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {supInfoOpen && createPortal(
        <div className="sheet-backdrop" onClick={() => setSupInfoOpen(false)}>
          <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{t('SUP 说明')}</span>
              <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={() => setSupInfoOpen(false)} aria-label={t('关闭')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="pb-info-sheet-body">
              <p className="pb-info-sheet-para pb-info-sheet-heading">{t('超智链原生代币：SUP (Super AI Chain Token)')}</p>
              <p className="pb-info-sheet-para">{t('SUP 是超智链（Super AI Chain）生态系统中的原生公链资产。在超智链网络中，SUP 的定位与以太坊网络中的 ETH 完全相同，是维持整个区块链网络运转的核心燃料。')}</p>
              <p className="pb-info-sheet-para"><strong className="pb-info-sheet-label">{t('生态定位：')}</strong>{t('充当网络内的底层清结算工具，作用等同于 ETH。')}</p>
              <p className="pb-info-sheet-para pb-info-sheet-subheading">{t('核心用途：')}</p>
              <p className="pb-info-sheet-para"><strong className="pb-info-sheet-label">{t('网络 Gas 费：')}</strong>{t('用于支付链上智能合约执行、资产转账及 AI 算力调用时的交易手续费（Gas）。')}</p>
              <p className="pb-info-sheet-para"><strong className="pb-info-sheet-label">{t('共识质押：')}</strong>{t('节点通过质押 SUP 参与网络共识维护，保障公链的安全与去中心化，并获取相应的网络奖励。')}</p>
              <p className="pb-info-sheet-para"><strong className="pb-info-sheet-label">{t('治理权益：')}</strong>{t('持有者拥有社区提案投票权，直接参与超智链未来升级与生态参数的治理决策。')}</p>
              <div className="sup-deposit-warning">
                <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                <span>{t('作为承载链上价值、驱动 AI 与区块链融合的核心纽带，SUP 的流动性与经济模型贯穿超智链的整个应用生态。')}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
