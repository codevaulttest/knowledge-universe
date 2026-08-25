import { useMemo, useState } from 'react';
import { ArrowRightLeft, ArrowUp, Bookmark, Check, ChevronRight, Copy, Gem, Gift, Sparkles, TrendingUp, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader } from '../components/shared';
import { formatTokenAmount } from '../stakeConfig';
import type { KnowledgeNode } from '../types';
import { generateChildNodes, isTransferable, mulberry32, seedFromString, StarDisplay } from './KnowledgePlanetPage';

const SUBSIDY_TIERS = [
  { star: 3, rewardPB: 100 },
  { star: 4, rewardPB: 300 },
  { star: 5, rewardPB: 500 },
] as const;
const INVITED_PREVIEW_COUNT = 2;
const INVITED_MODAL_PAGE_SIZE = 20;
/** 零星升 1 级 1000 PB，升 2 级 2000…升 5 级 5000；每升 1 级面额 +1000、荣誉值 +1000。 */
const LEVEL_UPGRADE_COST_PB = [1000, 2000, 3000, 4000, 5000] as const;
const LEVEL_UPGRADE_VALUE_GAIN = 1000;
const LEVEL_MAX = LEVEL_UPGRADE_COST_PB.length;

export function NodeDetailPage({ node }: { node: KnowledgeNode }) {
  const { canGoBack, goBack, setNodeTransferAutoOpenId, showToast, t, favoriteNodeIds, toggleFavoriteNode } = useApp();
  const [currentLevel, setCurrentLevel] = useState(node.level ?? 0);
  const [allowRecommend, setAllowRecommend] = useState(node.allowRecommend ?? true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [invitedListOpen, setInvitedListOpen] = useState(false);
  const [visibleInvitedCount, setVisibleInvitedCount] = useState(INVITED_MODAL_PAGE_SIZE);
  const invitedNodes = useMemo(() => generateChildNodes(node), [node]);
  const earnings = useMemo(() => {
    const random = mulberry32(seedFromString(`${node.id}:earnings`));
    const airdropCap = node.tier === 1000 ? Number.POSITIVE_INFINITY : node.tier === 100 ? 500 : 10;
    return {
      airdrop: Math.min(Math.round(random() * 5000 + 500), airdropCap),
      centennialSubsidy: Math.round(random() * 800),
    };
  }, [node.id, node.tier]);
  const transferable = isTransferable(node);
  const canUpgrade = node.tier === 1000;
  const isFavorite = favoriteNodeIds.has(node.id);
  const isMaxLevel = currentLevel >= LEVEL_MAX;
  const upgradeCost = LEVEL_UPGRADE_COST_PB[Math.min(currentLevel, LEVEL_MAX - 1)];

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    });
  };

  const handleTransfer = () => {
    setNodeTransferAutoOpenId(node.id);
    goBack();
  };

  return (
    <div className="page node-detail-page">
      <PageHeader title={t('节点详情')} onBack={canGoBack ? goBack : undefined} />
      <div className="scroll-area node-detail-scroll">
        <section
          className="node-detail-hero"
          aria-label={`${node.origin === 'diamond' ? t('钻石节点') : t('创世节点')} #${node.serialNo} · ${t('{stars}星', { stars: node.stars })}`}
        >
          <span className={`node-detail-origin-tag node-detail-origin-tag--${node.origin}`}>
            {node.origin === 'diamond'
              ? <Gem size={14} strokeWidth={2.5} aria-hidden />
              : <Sparkles size={14} strokeWidth={2.5} aria-hidden />}
            {node.origin === 'diamond' ? t('钻石节点') : t('创世节点')}
            <span className="node-detail-origin-serial">#{node.serialNo}</span>
          </span>
          <StarDisplay level={node.stars} size={72} />
          <span className="node-detail-hero-label">{t('{stars}星节点', { stars: node.stars })}</span>
        </section>

        <section className="node-detail-card">
          <h2 className="node-detail-card-title">{t('基本信息')}</h2>
          <div className="node-detail-row">
            <span className="node-detail-row-label">{t('节点码')}</span>
            <span className="node-detail-row-value node-detail-code-value">
              {node.nodeCode}
              <CopyButton copied={copiedKey === 'node-code'} onClick={() => copy(node.nodeCode, 'node-code')} label={t('复制节点编号')} />
            </span>
          </div>
          <InfoRow label={t('星级')} value={t('{stars}星', { stars: node.stars })} />
          <InfoRow label={t('面额')} value={`${formatTokenAmount(node.tier)} PB`} />
          <div className="node-detail-row">
            <span className="node-detail-row-label">{t('邀请节点码')}</span>
            <span className="node-detail-row-value node-detail-code-value">
              {node.invitedByCode ? <>
                {node.invitedByCode}
                <CopyButton copied={copiedKey === 'inviter-code'} onClick={() => copy(node.invitedByCode!, 'inviter-code')} label={t('复制节点编号')} />
              </> : t('创世节点无邀请人')}
            </span>
          </div>
        </section>

        <section className="node-detail-card">
          <div className="node-detail-card-heading">
            <h2 className="node-detail-card-title">{t('我邀请的节点码')}</h2>
            {invitedNodes.length > INVITED_PREVIEW_COUNT && (
              <button
                type="button"
                className="node-detail-view-all"
                onClick={() => {
                  setVisibleInvitedCount(INVITED_MODAL_PAGE_SIZE);
                  setInvitedListOpen(true);
                }}
              >
                {t('查看全部 {count} 个', { count: invitedNodes.length })}
                <ChevronRight size={16} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
          {invitedNodes.length ? (
            <div className="node-detail-invited-list">
              {invitedNodes.slice(0, INVITED_PREVIEW_COUNT).map((child, index) => (
                <InvitedNodeRow key={`${child.code}-${index}`} child={child} copied={copiedKey === `child-${index}`} onCopy={() => copy(child.code, `child-${index}`)} copyLabel={t('复制节点编号')} />
              ))}
            </div>
          ) : <p className="node-detail-empty">{t('该节点暂无子节点')}</p>}
        </section>

        <section className="node-detail-card">
          <div className="node-detail-row node-detail-level-row">
            <span className="node-detail-row-label">{t('当前等级 {level}级', { level: currentLevel })}</span>
            {canUpgrade && (
              isMaxLevel ? (
                <span className="node-detail-upgrade-btn node-detail-upgrade-btn--disabled" aria-disabled="true">
                  {t('已满级')}
                </span>
              ) : (
                <button
                  type="button"
                  className="node-detail-upgrade-btn"
                  onClick={() => {
                    const nextLevel = currentLevel + 1;
                    setCurrentLevel(nextLevel);
                    showToast(t('已升级到 {level} 级 · 面额 +{gain} PB · 荣誉值 +{gain}', { level: nextLevel, gain: LEVEL_UPGRADE_VALUE_GAIN }), 'demo');
                  }}
                >
                  <ArrowUp size={16} strokeWidth={2.5} aria-hidden />
                  {t('升级')}
                  <span className="node-detail-upgrade-cost">{formatTokenAmount(upgradeCost)} PB</span>
                </button>
              )
            )}
          </div>
        </section>

        <section className="node-detail-card">
          <h2 className="node-detail-card-title">{t('收益数据')}</h2>
          <div className="node-detail-earnings">
            <div className="node-detail-earning">
              <TrendingUp size={18} aria-hidden />
              <span>{t('空投收益')}</span>
              <strong>{formatTokenAmount(earnings.airdrop)} PB</strong>
              <small>{node.tier === 1000 ? t('无上限') : t('上限 {amount} PB', { amount: node.tier === 100 ? 500 : 10 })}</small>
            </div>
            <div className="node-detail-earning">
              <Gift size={18} aria-hidden />
              <span>{t('总百日补贴')}</span>
              <strong>{formatTokenAmount(earnings.centennialSubsidy)} PB</strong>
            </div>
          </div>
        </section>

        <section className="node-detail-card">
          <h2 className="node-detail-card-title">{t('百日补贴')}</h2>
          {SUBSIDY_TIERS.map(({ star, rewardPB }) => {
            const completed = node.stars >= star;
            return (
              <button
                type="button"
                className={`node-detail-subsidy-row${completed ? ' node-detail-subsidy-row--done' : ''}`}
                key={star}
                onClick={() => !completed && showToast(t('跳转升级流程'), 'demo')}
                disabled={completed}
              >
                <span className="node-detail-subsidy-icon">{completed ? <Check size={16} aria-hidden /> : <Gift size={16} aria-hidden />}</span>
                <span className="node-detail-subsidy-copy">
                  <span>{completed ? t('已达成') : t('升级到{star}星', { star })}</span>
                  <small>{formatTokenAmount(rewardPB)} PB</small>
                </span>
                {!completed && <ChevronRight size={18} aria-hidden />}
              </button>
            );
          })}
        </section>

        <section className="node-detail-card">
          <InfoRow label={t('来源')} value={`${node.origin === 'diamond' ? t('钻石节点') : t('创世节点')} #${node.serialNo}`} />
          <div className="node-detail-row node-detail-recommend-row">
            <span className="node-detail-row-label">{t('是否允许推荐')}</span>
            <span className="node-detail-toggle" role="group" aria-label={t('是否允许推荐')}>
              <button type="button" className={allowRecommend ? 'node-detail-toggle-btn node-detail-toggle-btn--active' : 'node-detail-toggle-btn'} onClick={() => setAllowRecommend(true)}>{t('允许')}</button>
              <button type="button" className={!allowRecommend ? 'node-detail-toggle-btn node-detail-toggle-btn--active' : 'node-detail-toggle-btn'} onClick={() => setAllowRecommend(false)}>{t('不允许')}</button>
            </span>
          </div>
          <div className="node-detail-row node-detail-recommend-row">
            <span className="node-detail-row-label">{t('是否收藏')}</span>
            <span className="node-detail-toggle" role="group" aria-label={t('是否收藏')}>
              <button
                type="button"
                className={isFavorite ? 'node-detail-toggle-btn node-detail-toggle-btn--active' : 'node-detail-toggle-btn'}
                onClick={() => { if (!isFavorite) toggleFavoriteNode(node.id); }}
              >
                <Bookmark size={13} strokeWidth={2} aria-hidden style={{ marginRight: 4 }} />
                {t('已收藏')}
              </button>
              <button
                type="button"
                className={!isFavorite ? 'node-detail-toggle-btn node-detail-toggle-btn--active' : 'node-detail-toggle-btn'}
                onClick={() => { if (isFavorite) toggleFavoriteNode(node.id); }}
              >
                {t('未收藏')}
              </button>
            </span>
          </div>
        </section>
      </div>

      {invitedListOpen && (
        <div className="sheet-backdrop" onClick={() => setInvitedListOpen(false)}>
          <div
            className="payment-sheet node-detail-invited-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t('我邀请的节点码')}
            onClick={event => event.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('我邀请的节点码')}</span>
              <button type="button" className="back-btn node-detail-invited-sheet-close" onClick={() => setInvitedListOpen(false)} aria-label={t('关闭')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div
              className="node-detail-invited-list node-detail-invited-list--sheet"
              onScroll={event => {
                const list = event.currentTarget;
                if (visibleInvitedCount < invitedNodes.length && list.scrollTop + list.clientHeight >= list.scrollHeight - 1) {
                  setVisibleInvitedCount(count => Math.min(count + INVITED_MODAL_PAGE_SIZE, invitedNodes.length));
                }
              }}
            >
              {invitedNodes.slice(0, visibleInvitedCount).map((child, index) => (
                <InvitedNodeRow key={`${child.code}-${index}`} child={child} copied={copiedKey === `modal-child-${index}`} onCopy={() => copy(child.code, `modal-child-${index}`)} copyLabel={t('复制节点编号')} />
              ))}
            </div>
          </div>
        </div>
      )}

      {transferable && (
        <div className="node-detail-actionbar">
          <button type="button" className="node-detail-transfer-btn" onClick={handleTransfer}>
            <ArrowRightLeft size={18} aria-hidden />
            {t('转让节点')}
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="node-detail-row"><span className="node-detail-row-label">{label}</span><span className="node-detail-row-value">{value}</span></div>;
}

function InvitedNodeRow({ child, copied, onCopy, copyLabel }: { child: { code: string; stars: number }; copied: boolean; onCopy: () => void; copyLabel: string }) {
  return (
    <div className="node-detail-invited-row">
      <StarDisplay level={child.stars} size={28} />
      <span className="node-detail-invited-code">{child.code}</span>
      <CopyButton copied={copied} onClick={onCopy} label={copyLabel} />
    </div>
  );
}

function CopyButton({ copied, onClick, label }: { copied: boolean; onClick: () => void; label: string }) {
  return <button type="button" className={`planet-node-copy-btn${copied ? ' planet-node-copy-btn--done' : ''}`} onClick={onClick} aria-label={label}>{copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}</button>;
}
