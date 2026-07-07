import { useState } from 'react';
import { ArrowDownToLine, ArrowUp, ArrowUpToLine, Check, ChevronDown, ChevronRight, Copy, Crown, FileText, Gift, LayoutGrid, Loader2, Lock, MessageCircle, Radio, Repeat2, Search, Star, Wallet, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader, Rating } from '../components/shared';
import { CURRENT_USER, MOCK_WALLET_ADDRESS } from '../mockData';
import { formatSupAmount, formatTokenAmount } from '../stakeConfig';
import type { LucideIcon } from 'lucide-react';

// 面额（PB）：仅 1000 档支持五星升级；100 / 10 档不支持升级
type NodeTier = 10 | 100 | 1000;

// 节点来源：产生该节点的具体行为，便于用户筛选、了解自己节点的构成
type NodeSource = '发帖' | '回帖' | '转发' | '解锁' | '频道开通' | '创世认购';

const ALL_NODE_SOURCES: NodeSource[] = ['发帖', '回帖', '转发', '解锁', '频道开通', '创世认购'];

type KnowledgeNode = {
  id: string;
  nodeCode: string;
  tier: NodeTier;
  stars: number;
  createdAt: string;
  source: NodeSource;
};

type RedPacketRecord = {
  id: string;
  amount: number;
  time: string;
};

type WithdrawRecord = {
  id: string;
  amount: number;
  time: string;
};

const NODE_SOURCE_ICONS: Record<NodeSource, LucideIcon> = {
  '发帖': FileText,
  '回帖': MessageCircle,
  '转发': Repeat2,
  '解锁': Lock,
  '频道开通': Radio,
  '创世认购': Crown,
};

function NodeSourceIcon({ source, size = 14 }: { source: NodeSource | null; size?: number }) {
  if (source === null) {
    return <LayoutGrid size={size} strokeWidth={2} aria-hidden />;
  }
  const Icon = NODE_SOURCE_ICONS[source];
  if (source === '创世认购') {
    return <Icon size={size} strokeWidth={0} fill="currentColor" aria-hidden />;
  }
  return <Icon size={size} strokeWidth={2} aria-hidden />;
}

const INITIAL_NODES: KnowledgeNode[] = [
  // 1000 PB —— 支持五星升级、红包无上限
  { id: 'n1', nodeCode: 'A1B2C3', tier: 1000, stars: 5, createdAt: '2025-12-10 09:32', source: '发帖' },
  { id: 'n2', nodeCode: 'D4E5F6', tier: 1000, stars: 4, createdAt: '2026-01-05 14:17', source: '发帖' },
  { id: 'n3', nodeCode: 'G7H8I9', tier: 1000, stars: 3, createdAt: '2026-01-20 08:55', source: '转发' },
  { id: 'n4', nodeCode: 'J0K1L2', tier: 1000, stars: 2, createdAt: '2026-02-01 21:03', source: '解锁' },
  { id: 'n5', nodeCode: 'M3N4O5', tier: 1000, stars: 1, createdAt: '2026-02-15 11:44', source: '创世认购' },
  // 100 PB —— 不支持升级，红包上限 500 PB（5 倍）
  { id: 'n6', nodeCode: 'P6Q7R8', tier: 100, stars: 1, createdAt: '2026-03-01 16:28', source: '回帖' },
  { id: 'n7', nodeCode: 'S9T0U1', tier: 100, stars: 1, createdAt: '2026-03-10 07:19', source: '发帖' },
  // 10 PB —— 不支持升级，红包上限 10 PB（1 倍）
  { id: 'n8', nodeCode: 'V2W3X4', tier: 10, stars: 1, createdAt: '2026-04-01 13:50', source: '回帖' },
];

const RED_PACKET_HISTORY: RedPacketRecord[] = [
  { id: 'a1', amount: 126, time: '2026-06-22 10:00' },
  { id: 'a2', amount: 81,  time: '2026-06-21 10:00' },
  { id: 'a3', amount: 200, time: '2026-06-20 10:00' },
  { id: 'a4', amount: 150, time: '2026-06-19 10:00' },
];

const PENDING_RED_PACKET = 239;
// 已领取红包累计形成的「上链额度」（= 历史红包之和），领取后等额增加
const INITIAL_CHAIN_CREDIT = RED_PACKET_HISTORY.reduce((sum, r) => sum + r.amount, 0);

// 升级费用：1000 档升 5 级，前期写死（会议口径 1200 / 3000 / 4000 / 5000）
// 键为「升级后的星级」（1000 档初始即 1 星，故仅 2~5 星可升）
const UPGRADE_COST_BY_NEXT: Record<number, number> = { 2: 1200, 3: 3000, 4: 4000, 5: 5000 };

function canUpgradeNode(node: KnowledgeNode): boolean {
  return node.tier === 1000 && node.stars < 5;
}

function redPacketCapLabel(tier: NodeTier, zh: boolean): string {
  if (tier === 1000) return zh ? '红包无上限' : 'Unlimited red packet';
  if (tier === 100) return zh ? '红包上限 500 PB' : 'Cap 500 PB';
  return zh ? '红包上限 10 PB' : 'Cap 10 PB';
}

const STAR_COLORS: Record<number, string> = {
  0: '#94a3b8',
  1: '#10b981',
  2: '#6366f1',
  3: '#7C3AED',
  4: '#ef4444',
  5: '#f59e0b',
};

const STAR_SHADOWS: Record<number, string> = {
  0: 'rgba(148,163,184,0.3)',
  1: 'rgba(16,185,129,0.5)',
  2: 'rgba(99,102,241,0.5)',
  3: 'rgba(124,58,237,0.5)',
  4: 'rgba(239,68,68,0.5)',
  5: 'rgba(245,158,11,0.8)',
};

function StarDisplay({ level, size = 44 }: { level: number; size?: number }) {
  const color = STAR_COLORS[level];
  const shadow = STAR_SHADOWS[level];

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, filter: `drop-shadow(0 0 8px ${shadow})` }}>
      <Star size={size} fill={color} strokeWidth={0} style={{ display: 'block' }} />
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700,
        fontSize: Math.floor(size * 0.4),
        lineHeight: 1,
        textShadow: '0 1px 2px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
      }}>
        {level}
      </span>
    </div>
  );
}

// 用户开通的频道会同步产生一个来源为"频道开通"的 1000 PB 双子星节点（懒初始化，每次进入本页时依据最新 channels 状态重新推导）
function seedNodesWithChannel(channels: { ownerName: string; id: string; createdAt: string }[]): KnowledgeNode[] {
  const ownChannel = channels.find(c => c.ownerName === CURRENT_USER);
  if (!ownChannel) return INITIAL_NODES;
  return [
    {
      id: `channel-node-${ownChannel.id}`,
      nodeCode: ownChannel.id.slice(-6).toUpperCase(),
      tier: 1000,
      stars: 1,
      createdAt: ownChannel.createdAt,
      source: '频道开通',
    },
    ...INITIAL_NODES,
  ];
}

export function KnowledgePlanetPage() {
  const { goBack, canGoBack, showToast, t, language, channels, supBalance, rechargeSup } = useApp();
  const zh = language === 'zh-CN';
  const [nodes, setNodes] = useState<KnowledgeNode[]>(() => seedNodesWithChannel(channels));
  const [sourceFilter, setSourceFilter] = useState<NodeSource | null>(null);
  const [pendingAmount, setPendingAmount] = useState(PENDING_RED_PACKET);
  const [chainCredit, setChainCredit] = useState(INITIAL_CHAIN_CREDIT);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<KnowledgeNode | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [nodeSearch, setNodeSearch] = useState('');
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawRecord[]>([]);
  const [showRechargeSheet, setShowRechargeSheet] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(1);
  const [recharging, setRecharging] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'star' | 'source' | null>(null);

  const maskedWallet = `${MOCK_WALLET_ADDRESS.slice(0, 6)}...${MOCK_WALLET_ADDRESS.slice(-6)}`;

  const copyNodeCode = (node: KnowledgeNode) => {
    navigator.clipboard.writeText(node.nodeCode).then(() => {
      setCopiedId(node.id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const starCounts = [0, 1, 2, 3, 4, 5].map(s => nodes.filter(n => n.stars === s).length);
  const search = nodeSearch.trim().toLowerCase();
  const filteredNodes = nodes.filter(n => {
    if (starFilter !== null && n.stars !== starFilter) return false;
    if (sourceFilter !== null && n.source !== sourceFilter) return false;
    if (search && !n.nodeCode.toLowerCase().includes(search)) return false;
    return true;
  });
  const hasNodeFilters = starFilter !== null || sourceFilter !== null;
  const hasNodeListConstraints = hasNodeFilters || search.length > 0;
  const nodeCountLabel = hasNodeListConstraints
    ? `${filteredNodes.length}/${nodes.length}`
    : String(nodes.length);

  const handleClaim = () => {
    if (claiming || claimed) return;
    const claimedAmount = pendingAmount;
    setClaiming(true);
    setTimeout(() => {
      setClaiming(false);
      setClaimed(true);
      setChainCredit(c => c + claimedAmount);
      setPendingAmount(0);
      showToast(t(
        `红包已领取，上链额度 +${formatTokenAmount(claimedAmount)} PB`,
        `Red packet claimed — on-chain credit +${formatTokenAmount(claimedAmount)} PB`,
      ));
    }, 1500);
  };

  const handleWithdrawConfirm = () => {
    if (withdrawing || chainCredit <= 0) return;
    const withdrawAmount = chainCredit;
    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      setShowWithdrawSheet(false);
      setChainCredit(0);
      setWithdrawHistory(prev => [
        { id: `w${prev.length + 1}`, amount: withdrawAmount, time: new Date().toISOString().slice(0, 16).replace('T', ' ') },
        ...prev,
      ]);
      showToast(t(
        `提取成功，${formatTokenAmount(withdrawAmount)} PB 已提取上链`,
        `Withdrawal successful — ${formatTokenAmount(withdrawAmount)} PB sent on-chain`,
      ));
    }, 1500);
  };

  const handleRechargeConfirm = () => {
    if (recharging || rechargeAmount <= 0) return;
    setRecharging(true);
    setTimeout(() => {
      setRecharging(false);
      setShowRechargeSheet(false);
      rechargeSup(rechargeAmount);
      showToast(t(
        `充值成功，+${rechargeAmount} SUP 已到账`,
        `Recharge successful — +${rechargeAmount} SUP credited`,
      ));
    }, 1500);
  };

  const handleUpgradeConfirm = () => {
    if (!upgradeTarget || upgrading) return;
    setUpgrading(true);
    setTimeout(() => {
      setNodes(prev => prev.map(n =>
        n.id === upgradeTarget.id ? { ...n, stars: Math.min(5, n.stars + 1) } : n
      ));
      setUpgrading(false);
      setUpgradeTarget(null);
      showToast(t('节点升级成功！', 'Node upgraded!'));
    }, 1500);
  };

  const clearNodeFilters = () => {
    setStarFilter(null);
    setSourceFilter(null);
    setOpenDropdown(null);
  };

  return (
    <div className="page">
      <PageHeader title={t('我的知识星球', 'Knowledge Planet')} onBack={canGoBack ? goBack : undefined} />

      <div className="scroll-area planet-scroll">
        <div className="planet-content">

          {/* ── Red Packet → 上链额度 Card ── */}
          <div className="planet-airdrop-card">
            <div className="planet-airdrop-top">
              <div className="planet-airdrop-left">
                <div className="planet-airdrop-icon">
                  <Gift size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="planet-airdrop-label">
                    {t('待领取红包', 'Pending Red Packet')}
                  </div>
                  {claimed ? (
                    <div className="planet-claimed-badge">{t('今日已领取', 'Claimed today')}</div>
                  ) : (
                    <div className="planet-airdrop-amount">
                      {formatTokenAmount(pendingAmount)}
                      <span className="planet-airdrop-unit"> PB</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                className={`planet-claim-btn${claimed ? ' planet-claim-btn--done' : ''}`}
                onClick={handleClaim}
                disabled={claiming || claimed}
              >
                {claiming
                  ? <Loader2 size={14} strokeWidth={2} className="planet-spin" />
                  : claimed
                    ? t('已领取', 'Claimed')
                    : t('立即领取', 'Claim Now')
                }
              </button>
            </div>

            <button className="planet-history-toggle" onClick={() => setShowHistoryModal(true)}>
              <div className="planet-history-toggle-left">
                <div className="planet-history-toggle-icon">
                  <Wallet size={14} strokeWidth={2} />
                </div>
                <span>{t('资产明细', 'Asset Details')}</span>
              </div>
              <div className="planet-history-toggle-right">
                <span className="planet-history-toggle-balance-label">{t('可提取', 'Withdrawable')}</span>
                <span className="planet-history-toggle-balance">{formatTokenAmount(chainCredit)} PB</span>
                <ChevronRight size={14} strokeWidth={2} className="planet-history-toggle-chevron" />
              </div>
            </button>
          </div>

          {/* ── Node Section ── */}
          <div className="planet-section">
            <div className="planet-section-header">
              <span className="planet-section-title">{t('我的节点', 'My Nodes')}</span>
              <span
                className={`planet-section-badge${hasNodeListConstraints ? ' planet-section-badge--filtered' : ''}`}
                aria-label={hasNodeListConstraints
                  ? t(`共 ${nodes.length} 个节点，当前显示 ${filteredNodes.length} 个`, `${filteredNodes.length} of ${nodes.length} nodes`)
                  : t(`共 ${nodes.length} 个节点`, `${nodes.length} nodes total`)}
              >
                {nodeCountLabel}
              </span>
            </div>
          </div>

          <div className="planet-node-search-wrap">
            <Search size={15} strokeWidth={2} className="planet-node-search-icon" />
            <input
              className="planet-node-search-input"
              type="text"
              value={nodeSearch}
              onChange={e => setNodeSearch(e.target.value)}
              placeholder={t('搜索节点编号…', 'Search by node code…')}
            />
            {nodeSearch && (
              <button className="planet-node-search-clear" onClick={() => setNodeSearch('')} aria-label={t('清除', 'Clear')}>
                <X size={13} strokeWidth={2.5} />
              </button>
            )}
          </div>

          <div className="planet-node-filter-row">
            <div className="planet-node-dropdown">
              <button
                type="button"
                className={`planet-node-dropdown-trigger${starFilter !== null ? ' planet-node-dropdown-trigger--active' : ''}`}
                onClick={() => setOpenDropdown(d => d === 'star' ? null : 'star')}
                aria-expanded={openDropdown === 'star'}
                aria-haspopup="listbox"
                aria-label={t('星级筛选', 'Filter by star level')}
              >
                <span className="planet-node-dropdown-value">
                  {starFilter !== null ? (
                    <>
                      <StarDisplay level={starFilter} size={18} />
                      <span>{t(`${starFilter} 星`, `${starFilter}★`)}</span>
                    </>
                  ) : (
                    <>
                      <Star size={14} strokeWidth={2} aria-hidden />
                      <span>{t('全部星级', 'All stars')}</span>
                    </>
                  )}
                </span>
                <ChevronDown size={14} strokeWidth={2} className={`planet-node-dropdown-chevron${openDropdown === 'star' ? ' planet-node-dropdown-chevron--open' : ''}`} />
              </button>
              {openDropdown === 'star' && (
                <div className="planet-node-dropdown-menu planet-node-dropdown-menu--fit" role="listbox">
                  <button
                    type="button"
                    role="option"
                    aria-selected={starFilter === null}
                    className={`planet-node-dropdown-item${starFilter === null ? ' planet-node-dropdown-item--active' : ''}`}
                    onClick={() => { setStarFilter(null); setOpenDropdown(null); }}
                  >
                    <span className="planet-node-dropdown-item-leading">
                      <Star size={14} strokeWidth={2} aria-hidden />
                      <span>{t('全部星级', 'All stars')}</span>
                    </span>
                  </button>
                  {[5, 4, 3, 2, 1, 0].map(s => {
                    const count = starCounts[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        role="option"
                        aria-selected={starFilter === s}
                        disabled={count === 0}
                        className={`planet-node-dropdown-item${starFilter === s ? ' planet-node-dropdown-item--active' : ''}`}
                        onClick={() => { setStarFilter(s); setOpenDropdown(null); }}
                      >
                        <span className="planet-node-dropdown-item-leading">
                          <StarDisplay level={s} size={22} />
                          <span>{t(`${s} 星`, `${s}★`)}</span>
                        </span>
                        <span className="planet-node-dropdown-item-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="planet-node-dropdown">
              <button
                type="button"
                className={`planet-node-dropdown-trigger${sourceFilter !== null ? ' planet-node-dropdown-trigger--active' : ''}`}
                onClick={() => setOpenDropdown(d => d === 'source' ? null : 'source')}
                aria-expanded={openDropdown === 'source'}
                aria-haspopup="listbox"
                aria-label={t('来源筛选', 'Filter by source')}
              >
                <span className="planet-node-dropdown-value">
                  <NodeSourceIcon source={sourceFilter} size={14} />
                  <span>{sourceFilter ?? t('全部来源', 'All sources')}</span>
                </span>
                <ChevronDown size={14} strokeWidth={2} className={`planet-node-dropdown-chevron${openDropdown === 'source' ? ' planet-node-dropdown-chevron--open' : ''}`} />
              </button>
              {openDropdown === 'source' && (
                <div className="planet-node-dropdown-menu" role="listbox">
                  <button
                    type="button"
                    role="option"
                    aria-selected={sourceFilter === null}
                    className={`planet-node-dropdown-item${sourceFilter === null ? ' planet-node-dropdown-item--active' : ''}`}
                    onClick={() => { setSourceFilter(null); setOpenDropdown(null); }}
                  >
                    <span className="planet-node-dropdown-item-leading">
                      <NodeSourceIcon source={null} size={14} />
                      <span>{t('全部来源', 'All sources')}</span>
                    </span>
                  </button>
                  {ALL_NODE_SOURCES.map(source => (
                    <button
                      key={source}
                      type="button"
                      role="option"
                      aria-selected={sourceFilter === source}
                      className={`planet-node-dropdown-item${sourceFilter === source ? ' planet-node-dropdown-item--active' : ''}`}
                      onClick={() => { setSourceFilter(source); setOpenDropdown(null); }}
                    >
                      <span className="planet-node-dropdown-item-leading">
                        <NodeSourceIcon source={source} size={14} />
                        <span>{source}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasNodeFilters && (
              <button
                type="button"
                className="planet-node-filter-reset"
                onClick={clearNodeFilters}
                aria-label={t('清除筛选', 'Clear filters')}
              >
                <X size={14} strokeWidth={2.2} />
                {t('清除', 'Clear')}
              </button>
            )}
          </div>

          {openDropdown && (
            <button
              type="button"
              className="planet-node-dropdown-backdrop"
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpenDropdown(null)}
            />
          )}

          {/* ── Node List ── */}
          <div className="planet-node-list">
            {filteredNodes.length === 0 ? (
              <div className="planet-node-empty">
                <Search size={28} strokeWidth={1.5} />
                <span>{t('未找到节点', 'No nodes found')}</span>
                <span className="planet-node-empty-sub">
                  {nodeSearch.trim()
                    ? t(`编号中不含「${nodeSearch}」`, `No node code contains "${nodeSearch}"`)
                    : hasNodeFilters
                      ? t('没有符合筛选条件的节点', 'No nodes match the current filters')
                      : t('暂无节点', 'No nodes yet')}
                </span>
              </div>
            ) : filteredNodes.map((node, idx) => (
              <div key={node.id} className="planet-node-card">
                <StarDisplay level={node.stars} />
                <div className="planet-node-info">
                  <div className="planet-node-code-row">
                    <span className="planet-node-code">{node.nodeCode}</span>
                    <button
                      className={`planet-node-copy-btn${copiedId === node.id ? ' planet-node-copy-btn--done' : ''}`}
                      onClick={() => copyNodeCode(node)}
                      aria-label={t('复制节点编号', 'Copy node code')}
                    >
                      {copiedId === node.id ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                    </button>
                  </div>
                  <div className="planet-node-badges">
                    <span className={`planet-node-attrs planet-node-attrs--t${node.tier}`}>
                      {t(`质押 ${node.tier} PB`, `Stake ${node.tier} PB`)}
                    </span>
                    <span className={`planet-node-attrs planet-node-attrs--t${node.tier}`}>
                      {redPacketCapLabel(node.tier, zh)}
                    </span>
                    <span className="planet-node-source">{node.source}</span>
                  </div>
                  <span className="planet-node-meta">{node.createdAt}</span>
                </div>
                <div className="planet-node-action">
                  {canUpgradeNode(node) ? (
                    <button
                      className="planet-upgrade-btn"
                      onClick={() => setUpgradeTarget(node)}
                    >
                      <ArrowUp size={12} strokeWidth={2.5} />
                      {t('升级', 'Upgrade')}
                    </button>
                  ) : node.tier === 1000 && node.stars === 5 ? (
                    <span className="planet-max-tag">{t('满级', 'Max')}</span>
                  ) : (
                    <span className="planet-node-locked-tag">{t('不可升级', 'No upgrade')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {showHistoryModal && (
        <div className="sheet-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="payment-sheet planet-history-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{t('资产明细', 'Asset Details')}</span>
              <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={() => setShowHistoryModal(false)} aria-label={t('关闭', 'Close')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="planet-credit-row planet-credit-row--modal">
              <div>
                <span className="planet-credit-label">{t('可提取余额', 'Withdrawable balance')}</span>
                <div className="planet-credit-value">{formatTokenAmount(chainCredit)} PB</div>
              </div>
              <button
                className="planet-withdraw-btn"
                onClick={() => setShowWithdrawSheet(true)}
                disabled={chainCredit <= 0}
              >
                <ArrowDownToLine size={13} strokeWidth={2.2} />
                {t('提取', 'Withdraw')}
              </button>
            </div>
            <div className="planet-credit-row planet-credit-row--modal">
              <div>
                <span className="planet-credit-label">{t('SUP 余额', 'SUP balance')}</span>
                <div className="planet-credit-value">{formatSupAmount(supBalance)} SUP</div>
              </div>
              <button
                className="planet-withdraw-btn"
                onClick={() => setShowRechargeSheet(true)}
              >
                <ArrowUpToLine size={13} strokeWidth={2.2} />
                {t('充值', 'Recharge')}
              </button>
            </div>
            <div className="planet-history-list">
              {withdrawHistory.map(w => (
                <div key={w.id} className="planet-history-item">
                  <div className="planet-history-icon planet-history-icon--withdraw">
                    <ArrowDownToLine size={16} strokeWidth={1.8} />
                  </div>
                  <span className="planet-history-time">{t(`${w.time} · 提取至链上`, `${w.time} · Withdrawn on-chain`)}</span>
                  <span className="planet-history-amount planet-history-amount--withdraw">-{formatTokenAmount(w.amount)} PB</span>
                </div>
              ))}
              {RED_PACKET_HISTORY.map(r => (
                <div key={r.id} className="planet-history-item">
                  <div className="planet-history-icon">
                    <Gift size={16} strokeWidth={1.8} />
                  </div>
                  <span className="planet-history-time">{r.time}</span>
                  <span className="planet-history-amount">+{formatTokenAmount(r.amount)} PB</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Withdraw Sheet ── */}
      {showWithdrawSheet && (
        <div
          className="sheet-backdrop"
          onClick={() => { if (!withdrawing) setShowWithdrawSheet(false); }}
        >
          <div
            className="payment-sheet planet-upgrade-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('提取到链上', 'Withdraw On-Chain')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => { if (!withdrawing) setShowWithdrawSheet(false); }}
                aria-label={t('关闭', 'Close')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="planet-upgrade-row">
              <span className="planet-upgrade-row-label">{t('提取金额', 'Withdraw Amount')}</span>
              <div className="planet-upgrade-cost">
                <span className="planet-upgrade-cost-num">{formatTokenAmount(chainCredit)}</span>
                <span className="planet-upgrade-cost-unit"> PB</span>
              </div>
            </div>
            <div className="planet-upgrade-sep" />
            <div className="planet-upgrade-row">
              <span className="planet-upgrade-row-label">{t('提取至', 'Withdraw To')}</span>
              <span className="planet-upgrade-row-value">{maskedWallet}</span>
            </div>

            <button
              className="planet-confirm-btn"
              onClick={handleWithdrawConfirm}
              disabled={withdrawing}
            >
              {withdrawing
                ? <Loader2 size={16} strokeWidth={2} className="planet-spin" />
                : t('确认提取', 'Confirm Withdrawal')
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Recharge SUP Sheet ── */}
      {showRechargeSheet && (
        <div
          className="sheet-backdrop"
          onClick={() => { if (!recharging) setShowRechargeSheet(false); }}
        >
          <div
            className="payment-sheet planet-upgrade-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('充值 SUP', 'Recharge SUP')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => { if (!recharging) setShowRechargeSheet(false); }}
                aria-label={t('关闭', 'Close')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <p className="gemini-stake-lead">
              {t('充值后将自动计入你的 SUP 余额', 'Your deposit will be added to your SUP balance')}
            </p>

            <div className="stake-tier-list" style={{ marginBottom: 16 }}>
              {[1, 5, 10, 50].map(amount => (
                <button
                  key={amount}
                  type="button"
                  className={`stake-tier-option${rechargeAmount === amount ? ' stake-tier-option--active' : ''}`}
                  onClick={() => setRechargeAmount(amount)}
                >
                  <span className="stake-tier-option__amount">{amount} SUP</span>
                </button>
              ))}
            </div>

            <div className="planet-upgrade-row">
              <span className="planet-upgrade-row-label">{t('从', 'From')}</span>
              <span className="planet-upgrade-row-value">{maskedWallet}</span>
            </div>
            <div className="planet-upgrade-sep" />
            <div className="planet-upgrade-row">
              <span className="planet-upgrade-row-label">{t('到', 'To')}</span>
              <span className="planet-upgrade-row-value">{t('SUP 余额', 'SUP balance')}</span>
            </div>

            <button
              className="planet-confirm-btn"
              onClick={handleRechargeConfirm}
              disabled={recharging}
            >
              {recharging
                ? <Loader2 size={16} strokeWidth={2} className="planet-spin" />
                : t(`确认充值 ${rechargeAmount} SUP`, `Confirm recharge ${rechargeAmount} SUP`)
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Upgrade Modal ── */}
      {upgradeTarget && (() => {
        const nextStars = Math.min(5, upgradeTarget.stars + 1);
        const upgradeCost = UPGRADE_COST_BY_NEXT[nextStars];
        return (
        <div
          className="sheet-backdrop"
          onClick={() => { if (!upgrading) setUpgradeTarget(null); }}
        >
          <div
            className="payment-sheet planet-upgrade-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('节点升级', 'Node Upgrade')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => { if (!upgrading) setUpgradeTarget(null); }}
                aria-label={t('关闭', 'Close')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Stars transition */}
            <div className="planet-upgrade-stars">
              <div className="planet-upgrade-star-item">
                <Rating value={upgradeTarget.stars} />
                <span
                  className="planet-upgrade-star-label"
                  style={{ color: STAR_COLORS[upgradeTarget.stars] }}
                >
                  {upgradeTarget.stars} {t('星', 'Star')}
                </span>
              </div>
              <div className="planet-upgrade-arrow">→</div>
              <div className="planet-upgrade-star-item">
                <Rating value={nextStars} />
                <span
                  className="planet-upgrade-star-label"
                  style={{ color: STAR_COLORS[nextStars] }}
                >
                  {nextStars} {t('星', 'Star')}
                </span>
              </div>
            </div>

            {/* Info rows */}
            <div className="planet-upgrade-row">
              <span className="planet-upgrade-row-label">{t('节点编号', 'Node ID')}</span>
              <span className="planet-upgrade-row-value">#{upgradeTarget.nodeCode}</span>
            </div>
            <div className="planet-upgrade-sep" />
            <div className="planet-upgrade-row">
              <span className="planet-upgrade-row-label">{t('升级费用', 'Upgrade Cost')}</span>
              <div className="planet-upgrade-cost">
                <span className="planet-upgrade-cost-num">{upgradeCost}</span>
                <span className="planet-upgrade-cost-unit"> PB</span>
              </div>
            </div>

            <button
              className="planet-confirm-btn"
              onClick={handleUpgradeConfirm}
              disabled={upgrading}
            >
              {upgrading
                ? <Loader2 size={16} strokeWidth={2} className="planet-spin" />
                : t('确认升级', 'Confirm Upgrade')
              }
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
