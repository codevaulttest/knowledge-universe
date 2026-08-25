import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, ArrowUpDown, Bookmark, Check, ChevronDown, ChevronRight, Copy, Crown, Gem, Info, Loader2, Minus, Plus, Radio, RotateCcw, Search, ShieldCheck, ShieldX, Sparkles, Star, Wallet, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { KnowledgePlanetIcon } from '../components/KnowledgePlanetIcon';
import { AssetOverviewCard } from '../components/AssetOverviewCard';
import { PlanetHeroBalances } from '../components/PlanetHeroBalances';
import { PlanetAnnouncementBanner } from '../components/PlanetAnnouncementBanner';
import { BspInvestSheet } from '../components/BspInvestSheet';
import { BspRecordList, BspRecordSummary } from '../components/BspRecordList';
import { BspRulesSheet } from '../components/BspRulesSheet';
import { DevPanel } from '../components/DevPanel';
import { PbWalletPicker } from '../components/PbWalletPicker';
import { PageHeader, PullToRefresh } from '../components/shared';
import { CURRENT_USER, MOCK_WALLET_ADDRESS } from '../mockData';
import { SUP_COST_BY_TIER, formatSupAmount, formatTokenAmount } from '../stakeConfig';
import { buildInitialBspInvestments, type BspInvestment } from '../bspConfig';
import { isChinese } from '../i18n';
import type { KnowledgeNode, NodeTier, PbWalletId } from '../types';
import { walletConsumesSup } from '../walletConfig';

// 创建频道：暂时固定质押 1000 PB 档位
const CREATE_TIER: NodeTier = 1000;

/** 按星级开通：一次生成的固定包（与晋升所需子节点量对齐的演示规则） */
const STAR_PACKS = [
  { level: 5, qty: 63 },
  { level: 4, qty: 31 },
  { level: 3, qty: 15 },
  { level: 2, qty: 7 },
  { level: 1, qty: 3 },
] as const;

/** 付费「按个数」演示上限，避免一次插爆列表；星级包仍按完整包数量生成 */
const PAID_QTY_MAX = 10;

/** 新开通节点「同步中」态时长（demo：用短延迟模拟约 5 分钟生成） */
const CREATE_SYNCING_MS = 4000;

type CreateScaleMode = 'qty' | 'star';

// 转让选节点弹窗：节点数可能达到几万条，默认只渲染一页，靠搜索定位 + 「加载更多」分批追加，避免一次性挂载全部 DOM
const TRANSFER_PICKER_PAGE_SIZE = 50;

// 节点码校验状态机（移植自 gemini 质押流程 bind_node_code）：1 未检测 · 2 输入中 · 3 校验通过 · 4 校验未通过
type CodeCheckStatus = '1' | '2' | '3' | '4';

function generateNodeCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 字符串取种子，供 mulberry32 使用（demo mock：让同一节点每次打开子节点列表看到同一组数据） */
export function seedFromString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return h;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ChildNodeEntry = { code: string; stars: number };

/** 子节点具体名单（demo mock）：按节点 id 生成一份确定性的伪随机列表，条数等于该节点的 childCount */
export function generateChildNodes(node: KnowledgeNode): ChildNodeEntry[] {
  const rand = mulberry32(seedFromString(node.id));
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const list: ChildNodeEntry[] = [];
  for (let i = 0; i < node.childCount; i++) {
    let code = '';
    for (let j = 0; j < 6; j++) code += chars[Math.floor(rand() * chars.length)];
    const stars = Math.ceil(rand() * 5) as 1 | 2 | 3 | 4 | 5;
    list.push({ code, stars });
  }
  return list;
}

/** 批量开通时的频道名：首个用原名，其余加 -2、-3… */
function channelNameForIndex(base: string, index: number): string {
  return index === 0 ? base : `${base}-${index + 1}`;
}

const INITIAL_NODES: KnowledgeNode[] = [
  // 1000 PB —— 支持五星升级、红包无上限
  { id: 'n1', nodeCode: 'A1B2C3', tier: 1000, stars: 5, childCount: 128, boundChildren: 2, origin: 'genesis', serialNo: 1, purchaseSource: 'cash', createdAt: '2025-12-10 09:32', channelName: '深度思考日记', remark: '主力收益节点', level: 2, allowRecommend: true },
  { id: 'n2', nodeCode: 'D4E5F6', tier: 1000, stars: 4, childCount: 64, boundChildren: 2, origin: 'diamond', serialNo: 3, purchaseSource: 'cash', createdAt: '2026-01-05 14:17', channelName: 'AI 效率手记', invitedByCode: 'A1B2C3', level: 1, allowRecommend: true },
  { id: 'n3', nodeCode: 'G7H8I9', tier: 1000, stars: 3, childCount: 31, boundChildren: 1, origin: 'diamond', serialNo: 5, purchaseSource: 'cash', createdAt: '2026-01-20 08:55', channelName: '增长黑客笔记', remark: '待观察升星', invitedByCode: 'D4E5F6', level: 1, allowRecommend: true },
  { id: 'n4', nodeCode: 'J0K1L2', tier: 1000, stars: 2, childCount: 12, boundChildren: 2, origin: 'genesis', serialNo: 8, purchaseSource: 'cash', createdAt: '2026-02-01 21:03', channelName: '投资复盘室', level: 0, allowRecommend: false },
  { id: 'n5', nodeCode: 'M3N4O5', tier: 1000, stars: 1, childCount: 3, boundChildren: 0, origin: 'diamond', serialNo: 7, purchaseSource: 'cash', createdAt: '2026-02-15 11:44', channelName: '产品体验测评', invitedByCode: 'G7H8I9', level: 0, allowRecommend: true },
  // 100 PB —— 不支持升级，红包上限 500 PB（5 倍）
  { id: 'n6', nodeCode: 'P6Q7R8', tier: 100, stars: 1, childCount: 7, boundChildren: 1, origin: 'genesis', serialNo: 12, purchaseSource: 'cash', createdAt: '2026-03-01 16:28', channelName: '读书会频道', level: 0, allowRecommend: true },
  { id: 'n7', nodeCode: 'S9T0U1', tier: 100, stars: 1, childCount: 2, boundChildren: 2, origin: 'diamond', serialNo: 9, purchaseSource: 'cash', createdAt: '2026-03-10 07:19', channelName: '摄影随笔', invitedByCode: 'P6Q7R8', level: 0, allowRecommend: true },
  // 10 PB —— 不支持升级，红包上限 10 PB（1 倍）；用内部 PB 兑换取得，用于演示"不可转让"态
  { id: 'n8', nodeCode: 'V2W3X4', tier: 10, stars: 1, childCount: 0, boundChildren: 0, origin: 'genesis', serialNo: 15, purchaseSource: 'pb', createdAt: '2026-04-01 13:50', channelName: '早期实验室', level: 0, allowRecommend: false },
  { id: 'n9', nodeCode: 'Y5Z6A7', tier: 100, stars: 1, childCount: 1, boundChildren: 1, origin: 'diamond', serialNo: 11, purchaseSource: 'cash', createdAt: '2026-04-12 09:15', channelName: '周报存档', remark: '周报专用', invitedByCode: 'S9T0U1', level: 0, allowRecommend: true },
];

/** demo：带备注的节点默认已收藏（备注仅在收藏流程中选填） */
export const INITIAL_FAVORITE_NODE_IDS = ['n1', 'n3', 'n9'];

// mock：模拟"注册表"里已存在的用户地址——转让校验通过分支用；demo 输入其中任意一个即可校验通过
export const REGISTERED_TRANSFER_ADDRESSES = new Set([
  '0x9c1a2b3d4e5f60718293a4b5c6d7e8f9a0b1c2d',
  '0x1f2e3d4c5b6a798877665544332211aabbccdde',
]);

/** 仅现金购买的 1-5 星节点可转让（会议纪要 00:00-00:07：PB 兑换/签到取得的节点不可转让） */
export function isTransferable(node: KnowledgeNode): boolean {
  return node.purchaseSource === 'cash' && node.stars >= 1 && node.stars <= 5;
}

// AGENTS.md 红线（费用类文案须有明确出处）在此处经用户明确豁免：真实转让价格尚未公布
// （bobo 会另行在群里公布），这里按星级示意性递增，仅用于截图/演示，不代表最终定价
const TRANSFER_PRICE_BY_STAR: Record<number, number> = { 1: 100, 2: 300, 3: 600, 4: 1000, 5: 2000 };

// 演示用「有效节点码」名单：创建频道时输入的节点码需命中此集合才能校验通过
const VALID_INVITE_CODES = new Set(INITIAL_NODES.map(n => n.nodeCode));

// mock：节点码对应的持有人地址——校验通过后仅展示后四位，方便用户对账、又不泄漏完整地址
const NODE_CODE_OWNER_ADDRESS: Record<string, string> = {
  A1B2C3: '0x9c1a2b3d4e5f60718293a4b5c6d7e8f9a0b1c2d',
  D4E5F6: '0x1f2e3d4c5b6a798877665544332211aabbccdde',
  G7H8I9: '0x3ab4c5d6e7f8091a2b3c4d5e6f7081920a3b4c5d',
  J0K1L2: '0x5cd6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8',
  M3N4O5: '0x7ef8091a2b3c4d5e6f708192a3b4c5d6e7f8091a',
  P6Q7R8: '0x9012a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4',
  S9T0U1: '0xb234c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6',
  V2W3X4: '0xd456e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8',
  Y5Z6A7: '0xf678091a2b3c4d5e6f708192a3b4c5d6e7f8091a',
};

// 节点升级入口暂时隐藏（会议：列表升级按钮先不要；星级仍可见）

const STAR_COLORS: Record<number, string> = {
  0: '#94a3b8',
  1: '#10b981',
  2: '#6366f1',
  3: '#7C3AED',
  4: '#ef4444',
  5: '#f59e0b',
};

export function StarDisplay({ level, size = 44 }: { level: number; size?: number }) {
  const color = STAR_COLORS[level];

  return (
    <div className="planet-node-star-wrap" style={{ width: size, height: size }}>
      <Star size={size} fill={color} strokeWidth={0} style={{ display: 'block' }} />
      <span className="planet-node-star-level" style={{ fontSize: Math.max(13, Math.floor(size * 0.4)) }}>
        {level}
      </span>
    </div>
  );
}

// 用户开通的每个频道都会同步产生一个来源为"频道开通"的 1000 PB 双子星节点（懒初始化，
// 每次进入本页时依据最新 channels 状态按 channelId 重新推导，一个频道对应一个节点，避免遗漏或重复）
function seedNodesWithChannel(channels: { ownerName: string; id: string; name: string; createdAt: string }[]): KnowledgeNode[] {
  const ownChannels = channels.filter(c => c.ownerName === CURRENT_USER);
  if (ownChannels.length === 0) return INITIAL_NODES;
  const maxGenesisSerial = Math.max(...INITIAL_NODES.filter(n => n.origin === 'genesis').map(n => n.serialNo));
  const channelNodes: KnowledgeNode[] = ownChannels.map((channel, i) => ({
    id: `channel-node-${channel.id}`,
    nodeCode: channel.id.slice(-6).toUpperCase(),
    tier: 1000,
    stars: 1,
    childCount: 0,
    boundChildren: 0,
    origin: 'genesis',
    serialNo: maxGenesisSerial + 1 + i,
    purchaseSource: 'pb',
    createdAt: channel.createdAt,
    channelName: channel.name,
  }));
  return [...channelNodes, ...INITIAL_NODES];
}

export function KnowledgePlanetPage({ initialSearch, openBsp }: { initialSearch?: string; openBsp?: boolean } = {}) {
  const { showToast, t, language, channels, walletAddress, walletConnecting, connectWallet, goBack, canGoBack, payPb, navigate, nodeTransferAutoOpenId, setNodeTransferAutoOpenId, favoriteNodeIds, toggleFavoriteNode } = useApp();
  const zh = isChinese(language);
  const [nodes, setNodes] = useState<KnowledgeNode[]>(() => seedNodesWithChannel(channels));
  const [bspRecords, setBspRecords] = useState<BspInvestment[]>(() => buildInitialBspInvestments(MOCK_WALLET_ADDRESS));
  const [bspSheetOpen, setBspSheetOpen] = useState(false);
  const bspAutoOpenedRef = useRef(false);
  const [bspRulesOpen, setBspRulesOpen] = useState(false);
  const [bspRecordsOpen, setBspRecordsOpen] = useState(false);
  const [nodeSearch, setNodeSearch] = useState(initialSearch ?? '');
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'star'>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'star' | 'sort' | null>(null);

  // ── 创建频道：单页 Sheet（规模 + 身份 + 账单一次性提交）+ 批量 mock ──
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [connectWalletSheetOpen, setConnectWalletSheetOpen] = useState(false);
  const [createScaleMode, setCreateScaleMode] = useState<CreateScaleMode>('qty');
  const [createQty, setCreateQty] = useState(1);
  const [createStarLevel, setCreateStarLevel] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [channelNameInput, setChannelNameInput] = useState('');
  const [channelDescInput, setChannelDescInput] = useState('');
  const [channelDescOpen, setChannelDescOpen] = useState(false);
  const [nodeCodeInput, setNodeCodeInput] = useState('');
  const [codeCheckStatus, setCodeCheckStatus] = useState<CodeCheckStatus>('1');
  const [verifying, setVerifying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createPayWallet, setCreatePayWallet] = useState<PbWalletId | null>(null);
  const [devForceEmptyNodes, setDevForceEmptyNodes] = useState(false);
  const [devBspInsufficient, setDevBspInsufficient] = useState(false);
  const [childListNode, setChildListNode] = useState<KnowledgeNode | null>(null);
  const [childListVisibleCount, setChildListVisibleCount] = useState(TRANSFER_PICKER_PAGE_SIZE);

  // ── 转让节点（仅现金购买的 1-5 星节点）：入口收敛到「我的节点」标题行，先选节点再进转让流程 ──
  const [transferPickerOpen, setTransferPickerOpen] = useState(false);
  const [transferPickerSearch, setTransferPickerSearch] = useState('');
  const [transferPickerVisibleCount, setTransferPickerVisibleCount] = useState(TRANSFER_PICKER_PAGE_SIZE);
  const [transferSheetNode, setTransferSheetNode] = useState<KnowledgeNode | null>(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferCheckStatus, setTransferCheckStatus] = useState<CodeCheckStatus>('1');
  const [transferVerifying, setTransferVerifying] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferPayWallet, setTransferPayWallet] = useState<PbWalletId | null>(null);
  const [remarkSheetNode, setRemarkSheetNode] = useState<KnowledgeNode | null>(null);
  const [remarkInput, setRemarkInput] = useState('');

  const displayNodes = devForceEmptyNodes ? [] : nodes;
  const showNoNodesEmpty = Boolean(walletAddress) && displayNodes.length === 0;

  const selectedStarPack = STAR_PACKS.find(p => p.level === createStarLevel) ?? STAR_PACKS[STAR_PACKS.length - 1];
  const createCount = createScaleMode === 'star' ? selectedStarPack.qty : createQty;
  const createStars = createScaleMode === 'star' ? selectedStarPack.level : 1;
  const pbCost = CREATE_TIER * createCount;
  const supCost = SUP_COST_BY_TIER[CREATE_TIER] * createCount;

  const step1Ready = createCount >= 1 && (createScaleMode === 'qty' ? createCount <= PAID_QTY_MAX : true);

  const step2Ready = channelNameInput.trim().length > 0
    && (codeCheckStatus === '1' || codeCheckStatus === '3')
    && !verifying;

  const createConfirmReady = step1Ready && step2Ready && !creating;

  const handleClaimDiamondNode = () => {
    showToast(t('跳转「钻石节点」'), 'demo');
  };

  const handleOpenBsp = () => {
    if (!walletAddress) {
      setConnectWalletSheetOpen(true);
      return;
    }
    setBspSheetOpen(true);
  };

  // Feed 横幅「立即投流」等入口：进入本页后自动打开投流弹层（未连钱包则先走连接拦截）
  useEffect(() => {
    if (!openBsp || bspAutoOpenedRef.current) return;
    if (!walletAddress) {
      setConnectWalletSheetOpen(true);
      return;
    }
    bspAutoOpenedRef.current = true;
    setBspSheetOpen(true);
  }, [openBsp, walletAddress]);

  const resetCreateSheet = () => {
    setCreateScaleMode('qty');
    setCreateQty(1);
    setCreateStarLevel(1);
    setChannelNameInput('');
    setChannelDescInput('');
    setChannelDescOpen(false);
    setNodeCodeInput('');
    setCodeCheckStatus('1');
    setVerifying(false);
    setCreating(false);
  };

  const handleCreateChannel = () => {
    if (!walletAddress) {
      setConnectWalletSheetOpen(true);
      return;
    }
    resetCreateSheet();
    setCreateSheetOpen(true);
  };

  useEffect(() => {
    if (walletAddress) setConnectWalletSheetOpen(false);
  }, [walletAddress]);

  const closeCreateSheet = () => {
    if (creating) return;
    setCreateSheetOpen(false);
  };

  const handleSelectScaleMode = (mode: CreateScaleMode) => {
    setCreateScaleMode(mode);
    if (mode === 'star') {
      if (!STAR_PACKS.some(p => p.level === createStarLevel)) {
        setCreateStarLevel(STAR_PACKS[0].level as 1 | 2 | 3 | 4 | 5);
      }
    } else {
      setCreateQty(1);
    }
  };

  const handleNodeCodeChange = (value: string) => {
    setNodeCodeInput(value);
    setCodeCheckStatus(value.trim() ? '2' : '1');
  };

  const handlePasteNodeCode = async () => {
    if (creating) return;
    try {
      const clip = (await navigator.clipboard.readText()).trim().slice(0, 12);
      if (clip) handleNodeCodeChange(clip);
    } catch {
      // 剪贴板读取失败（权限被拒等）：静默忽略，用户仍可手动输入
    }
  };

  const handleVerifyNodeCode = () => {
    const code = nodeCodeInput.trim();
    if (!code || verifying) return;
    setVerifying(true);
    setTimeout(() => {
      setCodeCheckStatus(VALID_INVITE_CODES.has(code.toUpperCase()) ? '3' : '4');
      setVerifying(false);
    }, 500);
  };

  const handleConfirmCreate = () => {
    if (!createConfirmReady) return;
    if (!createPayWallet || !payPb({ amount: pbCost, use: 'channel_open', wallet: createPayWallet, supCost })) {
      showToast(t('所选钱包余额不足或不适用于此操作'));
      return;
    }
    const baseName = channelNameInput.trim();
    const description = channelDescInput.trim() || undefined;
    const stars = createStars;
    const count = createCount;

    setCreating(true);
    setTimeout(() => {
      const stamp = Date.now();
      const createdAt = formatNow();
      let nextPaidSerial = Math.max(0, ...nodes.map(n => n.serialNo));

      const newNodes: KnowledgeNode[] = Array.from({ length: count }, (_, i) => ({
        id: `node-${stamp}-${i}`,
        nodeCode: generateNodeCode(),
        tier: CREATE_TIER,
        stars,
        childCount: 0,
        boundChildren: 0 as const,
        origin: 'diamond' as const,
        serialNo: ++nextPaidSerial,
        purchaseSource: 'pb' as const,
        channelName: channelNameForIndex(baseName, i),
        channelDescription: description,
        syncing: true,
        createdAt,
      }));

      setNodes(prev => [...newNodes, ...prev]);

      const newIds = newNodes.map(n => n.id);
      window.setTimeout(() => {
        setNodes(prev => prev.map(n => (newIds.includes(n.id) ? { ...n, syncing: false } : n)));
      }, CREATE_SYNCING_MS);

      showToast(t('已提交开通 {count} 个频道，列表同步中', { count }));
      setCreating(false);
      setCreateSheetOpen(false);
    }, 900);
  };

  const copyNodeCode = (node: KnowledgeNode) => {
    navigator.clipboard.writeText(node.nodeCode).then(() => {
      setCopiedId(node.id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const openTransferSheet = (node: KnowledgeNode) => {
    setTransferPickerOpen(false);
    setTransferSheetNode(node);
    setTransferAddress('');
    setTransferCheckStatus('1');
    setTransferVerifying(false);
    setTransferring(false);
    setTransferPayWallet(null);
  };

  useEffect(() => {
    if (!nodeTransferAutoOpenId) return;
    const target = nodes.find(node => node.id === nodeTransferAutoOpenId);
    if (target) openTransferSheet(target);
    setNodeTransferAutoOpenId(null);
  }, [nodeTransferAutoOpenId, nodes, setNodeTransferAutoOpenId]);

  const closeTransferSheet = () => {
    if (transferring) return;
    setTransferSheetNode(null);
  };

  const handleTransferAddressChange = (value: string) => {
    setTransferAddress(value);
    setTransferCheckStatus(value.trim() ? '2' : '1');
  };

  const handlePasteTransferAddress = async () => {
    if (transferring) return;
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) handleTransferAddressChange(text);
    } catch {
      // 剪贴板读取失败（权限被拒等）：静默忽略，用户仍可手动输入
    }
  };

  // 校验规则（会议纪要 00:03-00:04 拍板）：接收方地址须已在系统注册过，否则不允许转让，
  // 也没有"确认后仍强转"的例外
  const handleVerifyTransferAddress = () => {
    const address = transferAddress.trim().toLowerCase();
    if (!address || transferVerifying) return;
    setTransferVerifying(true);
    setTimeout(() => {
      setTransferCheckStatus(REGISTERED_TRANSFER_ADDRESSES.has(address) ? '3' : '4');
      setTransferVerifying(false);
    }, 500);
  };

  const handleConfirmTransfer = () => {
    if (!transferSheetNode || transferCheckStatus !== '3' || transferring || !transferPayWallet) return;
    const node = transferSheetNode;
    const wallet = transferPayWallet;
    setTransferring(true);
    setTimeout(() => {
      const price = TRANSFER_PRICE_BY_STAR[node.stars] ?? 0;
      const gas = SUP_COST_BY_TIER[node.tier];
      if (!payPb({ amount: price, use: 'node_transfer', wallet, supCost: gas })) {
        showToast(t('所选钱包余额不足或不适用于此操作'));
        setTransferring(false);
        return;
      }
      setNodes(prev => prev.filter(n => n.id !== node.id));
      showToast(t('节点 {nodeCode} 转让成功', { nodeCode: node.nodeCode }));
      setTransferring(false);
      setTransferSheetNode(null);
    }, 1400);
  };

  const transferableNodes = displayNodes.filter(isTransferable);
  const transferPickerSearchTerm = transferPickerSearch.trim().toLowerCase();
  const transferPickerFiltered = transferPickerSearchTerm
    ? transferableNodes.filter(n =>
        n.nodeCode.toLowerCase().includes(transferPickerSearchTerm) ||
        n.channelName.toLowerCase().includes(transferPickerSearchTerm)
      )
    : transferableNodes;
  const transferPickerVisible = transferPickerFiltered.slice(0, transferPickerVisibleCount);
  const transferPickerHasMore = transferPickerFiltered.length > transferPickerVisible.length;
  const childListEntries = useMemo(() => (childListNode ? generateChildNodes(childListNode) : []), [childListNode]);
  const childListVisible = childListEntries.slice(0, childListVisibleCount);
  const childListHasMore = childListEntries.length > childListVisible.length;
  const starCounts = [0, 1, 2, 3, 4, 5].map(s => displayNodes.filter(n => n.stars === s).length);
  const favoriteCount = displayNodes.filter(n => favoriteNodeIds.has(n.id)).length;
  const search = nodeSearch.trim().toLowerCase();
  const filteredNodes = displayNodes
    .filter(n => {
      if (starFilter !== null && n.stars !== starFilter) return false;
      if (showFavoritesOnly && !favoriteNodeIds.has(n.id)) return false;
      if (search) {
        const haystack = `${n.nodeCode} ${n.remark ?? ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => {
      const favoriteRank = Number(favoriteNodeIds.has(b.id)) - Number(favoriteNodeIds.has(a.id));
      if (favoriteRank !== 0) return favoriteRank;
      if (sortBy === 'star') return b.stars - a.stars;
      if (sortBy === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      // 最新优先：钻石节点整体排在创世节点上方，组内再按最新优先排序
      const originRank = (n: KnowledgeNode) => n.origin === 'diamond' ? 0 : 1;
      const rankDiff = originRank(a) - originRank(b);
      if (rankDiff !== 0) return rankDiff;
      return b.createdAt.localeCompare(a.createdAt);
    });
  const hasNodeFilters = starFilter !== null || showFavoritesOnly || sortBy !== 'newest';
  const hasNodeListConstraints = hasNodeFilters || search.length > 0;
  const nodeCountLabel = hasNodeListConstraints
    ? `${filteredNodes.length}/${displayNodes.length}`
    : String(displayNodes.length);

  const sortLabel =
    sortBy === 'star' ? t('按星级')
    : sortBy === 'oldest' ? t('最早优先')
    : t('最新优先');

  const clearNodeFilters = () => {
    setStarFilter(null);
    setShowFavoritesOnly(false);
    setSortBy('newest');
    setOpenDropdown(null);
  };

  /** 未收藏 → 弹出选填备注；已收藏 → 取消收藏并清除备注 */
  const handleFavoriteClick = (node: KnowledgeNode) => {
    if (favoriteNodeIds.has(node.id)) {
      toggleFavoriteNode(node.id);
      setNodes(prev => prev.map(n => (
        n.id === node.id ? { ...n, remark: undefined } : n
      )));
      showToast(t('已取消收藏2'));
      return;
    }
    setRemarkInput('');
    setRemarkSheetNode(node);
  };

  const closeFavoriteSheet = () => {
    setRemarkSheetNode(null);
    setRemarkInput('');
  };

  const confirmFavorite = () => {
    if (!remarkSheetNode) return;
    const remark = remarkInput.trim();
    const nodeId = remarkSheetNode.id;
    toggleFavoriteNode(nodeId);
    setNodes(prev => prev.map(n => (
      n.id === nodeId ? { ...n, remark: remark || undefined } : n
    )));
    closeFavoriteSheet();
    showToast(t('已收藏2'));
  };

  // 下拉刷新：demo 环境无真实后端，用短暂延迟模拟重新拉取余额 / 空投 / 节点数据，
  // 并按最新 channels 状态重新推导节点列表（顶栏余额与空投倒计时自身已是响应式，会随之一起呈现最新值）
  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 900));
    setNodes(seedNodesWithChannel(channels));
    setBspRecords(buildInitialBspInvestments(MOCK_WALLET_ADDRESS));
    showToast(t('数据已刷新'));
  };

  return (
    <div className="page">
      {canGoBack && <PageHeader onBack={goBack} className="page-header--transparent" />}
      <PullToRefresh className="scroll-area planet-scroll" onRefresh={handleRefresh}>
        <div className="planet-content">

          {/* ── 页顶插画 hero：星云插画 + 产品名（随内容滚动，与 .scroll-area 的固定壳体
              布局兼容——沿用 ProfilePage .profile-hero 同款的“内容内叠压”写法，而非 genesis-node-diamond 中
              把 hero 提到 .page 外层再用负 margin 顶起整页的写法，避免破坏本 app 固定视口 + 内部滚动的壳体结构） ── */}
          <div className="planet-hero">
            <img className="planet-hero-bg" src="/img/genesis-bigbang.webp" alt="" aria-hidden="true" />
            <div className="planet-hero-row">
              <h1 className="planet-hero-title">{t('知识宇宙')}</h1>
              <PlanetHeroBalances />
            </div>
          </div>

          {/* ── 页顶公告：单条可关闭横幅，点开看全文；负 margin 叠压在 hero 底边上 ── */}
          <div className="planet-hero-overlap-anchor">
            <PlanetAnnouncementBanner />
          </div>

          {/* ── 资产概览：空投主区 + 今日互动任务 ── */}
          <AssetOverviewCard />

          {/* ── Quick Actions: BSP 巨星投流 / 创建频道 ── */}
          <div className="planet-quick-actions">
            <button
              type="button"
              className="planet-quick-action-btn planet-quick-action-btn--genesis"
              onClick={handleOpenBsp}
            >
              <span className="planet-quick-action-icon">
                <Crown size={20} strokeWidth={2} />
              </span>
              <span className="planet-quick-action-label">{t('BSP 巨星投流')}</span>
            </button>
            <button
              type="button"
              className="planet-quick-action-btn planet-quick-action-btn--channel"
              onClick={handleCreateChannel}
            >
              <span className="planet-quick-action-icon">
                <Radio size={20} strokeWidth={2} />
              </span>
              <span className="planet-quick-action-label">{t('抢先开通频道')}</span>
            </button>
          </div>

          {!walletAddress ? (
            <div className="planet-wallet-empty" data-layer="wallet-empty">
              <Wallet size={40} strokeWidth={1.5} aria-hidden="true" />
              <span className="planet-wallet-empty-title">{t('尚未连接钱包')}</span>
              <span className="planet-wallet-empty-sub">
                {t('连接钱包后查看节点与管理频道')}
              </span>
              <button
                type="button"
                className="planet-wallet-empty-cta"
                onClick={connectWallet}
                disabled={walletConnecting}
              >
                {walletConnecting
                  ? <Loader2 size={16} strokeWidth={2} className="planet-spin" aria-hidden="true" />
                  : <Wallet size={16} strokeWidth={2} aria-hidden="true" />
                }
                <span>{walletConnecting ? t('连接中…') : t('连接钱包')}</span>
              </button>
            </div>
          ) : (
          <>

          {/* ── BSP 巨星投流：交易历史摘要，完整记录收进底部弹层 ── */}
          <BspRecordSummary
            investments={bspRecords}
            onOpen={() => setBspRecordsOpen(true)}
            onOpenInvest={handleOpenBsp}
          />

          {/* ── Node Section ── */}
          <div className="planet-section">
            <div className="planet-section-header">
              <span className="planet-section-title">{t('我的节点')}</span>
              <span
                className={`planet-section-badge${hasNodeListConstraints ? ' planet-section-badge--filtered' : ''}`}
                aria-label={hasNodeListConstraints
                  ? t('共 {length} 个节点，当前显示 {length2} 个', { length: displayNodes.length, length2: filteredNodes.length })
                  : t('共 {length} 个节点', { length: displayNodes.length })}
              >
                {nodeCountLabel}
              </span>
              {transferableNodes.length > 0 && (
                <button
                  type="button"
                  className="planet-node-transfer-entry"
                  onClick={() => {
                    setTransferPickerSearch('');
                    setTransferPickerVisibleCount(TRANSFER_PICKER_PAGE_SIZE);
                    setTransferPickerOpen(true);
                  }}
                >
                  <ArrowRightLeft size={13} strokeWidth={2.2} aria-hidden />
                  {t('转让')}
                </button>
              )}
            </div>
          </div>

          {showNoNodesEmpty ? (
            <div className="planet-nodes-empty" data-layer="nodes-empty">
              <KnowledgePlanetIcon width={40} height={40} strokeWidth={1.5} className="planet-nodes-empty-icon" />
              <span className="planet-nodes-empty-title">{t('还没有节点')}</span>
              <p className="planet-nodes-empty-text">
                {zh ? (
                  <>
                    点击「
                    <button type="button" className="planet-nodes-empty-link" onClick={handleClaimDiamondNode}>钻石节点</button>
                    」或「
                    <button type="button" className="planet-nodes-empty-link" onClick={handleCreateChannel}>抢先开通频道</button>
                    」获得节点
                  </>
                ) : (
                  <>
                    Tap{' '}
                    <button type="button" className="planet-nodes-empty-link" onClick={handleClaimDiamondNode}>Diamond Node</button>
                    {' '}or{' '}
                    <button type="button" className="planet-nodes-empty-link" onClick={handleCreateChannel}>Early Channel Access</button>
                    {' '}to get a node
                  </>
                )}
              </p>
            </div>
          ) : (
          <>

          <div className="planet-node-toolbar">
          <div className="planet-node-search-wrap">
            <Search size={15} strokeWidth={2} className="planet-node-search-icon" />
            <input
              className="planet-node-search-input"
              type="text"
              value={nodeSearch}
              onChange={e => setNodeSearch(e.target.value)}
              placeholder={t('搜索节点编号或备注…')}
            />
            {nodeSearch && (
              <button className="planet-node-search-clear" onClick={() => setNodeSearch('')} aria-label={t('清除')}>
                <X size={13} strokeWidth={2.5} />
              </button>
            )}
          </div>

          <div className="planet-node-filter-row">
            <button
              type="button"
              className={`planet-node-dropdown-trigger${showFavoritesOnly ? ' planet-node-dropdown-trigger--active' : ''}`}
              onClick={() => setShowFavoritesOnly(visible => !visible)}
              aria-pressed={showFavoritesOnly}
              aria-label={showFavoritesOnly ? t('显示全部节点') : t('仅显示已收藏节点')}
            >
              <span className="planet-node-dropdown-value">
                <Bookmark size={14} strokeWidth={2} fill={showFavoritesOnly ? 'currentColor' : 'none'} aria-hidden />
                <span>{t('已收藏2')}</span>
                <span className="planet-node-filter-count">{favoriteCount}</span>
              </span>
            </button>
            <div className="planet-node-dropdown">
              <button
                type="button"
                className={`planet-node-dropdown-trigger${starFilter !== null ? ' planet-node-dropdown-trigger--active' : ''}`}
                onClick={() => setOpenDropdown(d => d === 'star' ? null : 'star')}
                aria-expanded={openDropdown === 'star'}
                aria-haspopup="listbox"
                aria-label={t('星级筛选')}
              >
                <span className="planet-node-dropdown-value">
                  {starFilter !== null ? (
                    <>
                      <StarDisplay level={starFilter} size={18} />
                      <span>{t('{starFilter} 星', { starFilter })}</span>
                    </>
                  ) : (
                    <>
                      <Star size={14} strokeWidth={2} aria-hidden />
                      <span>{t('全部星级')}</span>
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
                      <span>{t('全部星级')}</span>
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
                        onClick={() => {
                          setStarFilter(s);
                          if (sortBy === 'star') setSortBy('newest');
                          setOpenDropdown(null);
                        }}
                      >
                        <span className="planet-node-dropdown-item-leading">
                          <StarDisplay level={s} size={22} />
                          <span>{t('{s} 星', { s })}</span>
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
                className="planet-node-dropdown-trigger"
                onClick={() => setOpenDropdown(d => d === 'sort' ? null : 'sort')}
                aria-expanded={openDropdown === 'sort'}
                aria-haspopup="listbox"
                aria-label={t('排序方式')}
              >
                <span className="planet-node-dropdown-value">
                  <ArrowUpDown size={14} strokeWidth={2} aria-hidden />
                  <span>{sortLabel}</span>
                </span>
                <ChevronDown size={14} strokeWidth={2} className={`planet-node-dropdown-chevron${openDropdown === 'sort' ? ' planet-node-dropdown-chevron--open' : ''}`} />
              </button>
              {openDropdown === 'sort' && (
                <div className="planet-node-dropdown-menu planet-node-dropdown-menu--fit" role="listbox">
                  <button
                    type="button"
                    role="option"
                    aria-selected={sortBy === 'newest'}
                    className={`planet-node-dropdown-item${sortBy === 'newest' ? ' planet-node-dropdown-item--active' : ''}`}
                    onClick={() => { setSortBy('newest'); setOpenDropdown(null); }}
                  >
                    <span className="planet-node-dropdown-item-leading">
                      <span>{t('最新优先')}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="option"
                    aria-selected={sortBy === 'oldest'}
                    className={`planet-node-dropdown-item${sortBy === 'oldest' ? ' planet-node-dropdown-item--active' : ''}`}
                    onClick={() => { setSortBy('oldest'); setOpenDropdown(null); }}
                  >
                    <span className="planet-node-dropdown-item-leading">
                      <span>{t('最早优先')}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="option"
                    aria-selected={sortBy === 'star'}
                    disabled={starFilter !== null}
                    title={starFilter !== null ? t('已按星级筛选，排序不生效') : undefined}
                    className={`planet-node-dropdown-item${sortBy === 'star' ? ' planet-node-dropdown-item--active' : ''}`}
                    onClick={() => { setSortBy('star'); setOpenDropdown(null); }}
                  >
                    <span className="planet-node-dropdown-item-leading">
                      <span>{t('按星级')}</span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            {hasNodeFilters && (
              <button
                type="button"
                className="planet-node-filter-reset"
                onClick={clearNodeFilters}
                aria-label={t('重置筛选')}
              >
                <RotateCcw size={14} strokeWidth={2.2} />
                {t('重置')}
              </button>
            )}
          </div>
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
                <span>{t('未找到节点')}</span>
                <span className="planet-node-empty-sub">
                  {nodeSearch.trim()
                    ? t('编号或备注中不含「{nodeSearch}」', { nodeSearch })
                    : hasNodeFilters
                      ? t('没有符合筛选条件的节点')
                      : t('暂无节点')}
                </span>
              </div>
            ) : filteredNodes.map((node) => (
              <div
                key={node.id}
                className={`planet-node-card planet-node-card--tagged${node.boundChildren === 2 ? ' planet-node-card--earning' : ''}`}
                role="link"
                tabIndex={0}
                aria-label={t('查看节点详情 {nodeCode}', { nodeCode: node.nodeCode })}
                onClick={() => navigate({ page: 'P_NODE', node })}
                onKeyDown={event => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate({ page: 'P_NODE', node });
                  }
                }}
              >
                {node.origin === 'diamond' ? (
                  <span className="planet-node-origin-tag planet-node-origin-tag--diamond">
                    <Gem size={12} strokeWidth={2.5} aria-hidden />
                    {t('钻石节点')}
                    <span className="planet-node-origin-serial">#{node.serialNo}</span>
                  </span>
                ) : (
                  <span className="planet-node-origin-tag planet-node-origin-tag--genesis">
                    <Sparkles size={12} strokeWidth={2.5} aria-hidden />
                    {t('创世节点')}
                    <span className="planet-node-origin-serial">#{node.serialNo}</span>
                  </span>
                )}
                <button
                  type="button"
                  className={`planet-node-favorite-btn${favoriteNodeIds.has(node.id) ? ' planet-node-favorite-btn--active' : ''}`}
                  onClick={event => {
                    event.stopPropagation();
                    handleFavoriteClick(node);
                  }}
                  aria-pressed={favoriteNodeIds.has(node.id)}
                  aria-label={favoriteNodeIds.has(node.id)
                    ? t('取消收藏 {nodeCode}', { nodeCode: node.nodeCode })
                    : t('收藏 {nodeCode}', { nodeCode: node.nodeCode })}
                >
                  <Bookmark size={18} strokeWidth={2} fill={favoriteNodeIds.has(node.id) ? 'currentColor' : 'none'} aria-hidden />
                </button>
                <div className="planet-node-star-col">
                  <StarDisplay level={node.stars} />
                </div>
                <div className="planet-node-info">
                  <div className="planet-node-code-row">
                    <span className="planet-node-code">{node.nodeCode}</span>
                    {node.syncing && (
                      <span className="planet-node-syncing-badge">
                        <Loader2 size={12} strokeWidth={2.5} className="planet-spin" aria-hidden />
                        {t('同步中')}
                      </span>
                    )}
                    <button
                      className={`planet-node-copy-btn${copiedId === node.id ? ' planet-node-copy-btn--done' : ''}`}
                      onClick={event => {
                        event.stopPropagation();
                        copyNodeCode(node);
                      }}
                      aria-label={t('复制节点编号')}
                    >
                      {copiedId === node.id ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                    </button>
                  </div>
                  <div className="planet-node-meta-row">
                    <span className="planet-node-meta">{node.createdAt}</span>
                  </div>
                </div>
                <div className="planet-node-action">
                  <button
                    type="button"
                    className="planet-node-child-count planet-node-child-count--clickable"
                    onClick={event => {
                      event.stopPropagation();
                      setChildListNode(node);
                      setChildListVisibleCount(TRANSFER_PICKER_PAGE_SIZE);
                    }}
                    aria-label={t('查看 {count} 个子节点', { count: node.childCount })}
                  >
                    <span className="planet-node-child-count-num">{node.childCount}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          </>
          )}

          </>
          )}

        </div>
      </PullToRefresh>

      {/* ── Create Channel Sheet：规模 + 身份 + 账单一次性提交 ── */}
      {walletAddress && createSheetOpen && (
        <div className="sheet-backdrop" onClick={closeCreateSheet}>
          <div
            className="payment-sheet planet-upgrade-sheet planet-create-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('抢先开通频道')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={closeCreateSheet}
                aria-label={t('关闭')}
                disabled={creating}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="create-step-body">
              <div className="planet-pregen-note">
                {t('知识星球系统尚未正式上线，当前生成的是预留频道，系统上线后自动转为正式频道')}
              </div>

              <div className="stake-code-block">
                <div className="stake-code-label-row">
                  <span className="stake-code-label">{t('开通规模')}</span>
                </div>
                <div className="create-scale-toggle">
                  <button
                    type="button"
                    className={`create-scale-tab${createScaleMode === 'qty' ? ' create-scale-tab--active' : ''}`}
                    disabled={creating}
                    onClick={() => handleSelectScaleMode('qty')}
                  >
                    {t('按个数')}
                  </button>
                  <button
                    type="button"
                    className={`create-scale-tab${createScaleMode === 'star' ? ' create-scale-tab--active' : ''}`}
                    disabled={creating}
                    onClick={() => handleSelectScaleMode('star')}
                  >
                    {t('按星级包')}
                  </button>
                </div>
              </div>

              {createScaleMode === 'qty' ? (
                <div className="create-qty-block">
                  <button
                    type="button"
                    className="create-qty-btn"
                    disabled={creating || createQty <= 1}
                    onClick={() => setCreateQty(q => Math.max(1, q - 1))}
                    aria-label={t('减少')}
                  >
                    <Minus size={18} strokeWidth={2} />
                  </button>
                  <span className="create-qty-value font-mono">{createQty}</span>
                  <button
                    type="button"
                    className="create-qty-btn"
                    disabled={creating || createQty >= PAID_QTY_MAX}
                    onClick={() => setCreateQty(q => Math.min(PAID_QTY_MAX, q + 1))}
                    aria-label={t('增加')}
                  >
                    <Plus size={18} strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <div className="create-star-packs">
                  {STAR_PACKS.map(pack => {
                    return (
                      <button
                        key={pack.level}
                        type="button"
                        className={`create-star-pack${createStarLevel === pack.level ? ' create-star-pack--active' : ''}`}
                        disabled={creating}
                        onClick={() => setCreateStarLevel(pack.level as 1 | 2 | 3 | 4 | 5)}
                      >
                        <StarDisplay level={pack.level} size={28} />
                        <span className="create-star-pack-copy">
                          <span className="create-star-pack-title">{t('{level} 星包', { level: pack.level })}</span>
                          <span className="create-star-pack-sub">
                            {t('一次生成 {qty} 个', { qty: pack.qty })}
                          </span>
                        </span>
                        <span className="create-star-pack-qty font-mono">×{pack.qty}</span>
                      </button>
                    );
                  })}
                  <span className="stake-code-caption">
                    {t('星级包按晋升所需数量一次生成，不是把单个节点直接改成该星级')}
                  </span>
                </div>
              )}

              <div className="stake-code-block">
                <div className="stake-code-label-row">
                  <span className="stake-code-label">{t('频道名称2')}</span>
                  <span className="stake-code-required-tag">{t('必填')}</span>
                </div>
                <input
                  className="stake-code-input stake-name-input"
                  type="text"
                  value={channelNameInput}
                  onChange={e => setChannelNameInput(e.target.value)}
                  placeholder={t('给频道起个名字')}
                  disabled={creating}
                  maxLength={20}
                />
                {createCount > 1 && (
                  <span className="stake-code-caption">
                    {t('批量时其余频道自动加序号，如 名称-2、名称-3')}
                  </span>
                )}
              </div>

              <div className="stake-code-block">
                <div className="stake-code-label-row">
                  <span className="stake-code-label">{t('频道简介')}</span>
                  <span className="stake-code-optional-tag">{t('选填')}</span>
                </div>
                <textarea
                  className="stake-code-input stake-code-textarea"
                  value={channelDescInput}
                  onChange={e => setChannelDescInput(e.target.value)}
                  placeholder={t('介绍一下你的频道')}
                  disabled={creating}
                  maxLength={100}
                  rows={3}
                />
              </div>

              <div className="stake-code-block">
                <div className="stake-code-label-row">
                  <span className="stake-code-label">{t('节点码')}</span>
                  <span className="stake-code-optional-tag">{t('选填')}</span>
                </div>
                <div className="stake-code-row">
                  <div className="stake-code-input-wrap">
                    <input
                      className="stake-code-input"
                      type="text"
                      value={nodeCodeInput}
                      onChange={e => handleNodeCodeChange(e.target.value)}
                      placeholder={t('不填则跳过')}
                      disabled={creating}
                      maxLength={12}
                    />
                    <button
                      type="button"
                      className="stake-code-paste-btn"
                      onClick={handlePasteNodeCode}
                      disabled={creating}
                    >
                      {t('粘贴')}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="stake-code-verify-btn"
                    onClick={handleVerifyNodeCode}
                    disabled={!nodeCodeInput.trim() || verifying || creating}
                  >
                    {verifying
                      ? <Loader2 size={14} strokeWidth={2} className="planet-spin" />
                      : t('校验')
                    }
                  </button>
                </div>
                {codeCheckStatus === '3' && (
                  <span className="stake-code-status stake-code-status--ok">
                    <ShieldCheck size={13} strokeWidth={2} />
                    {t('校验通过')}
                    {(() => {
                      const owner = NODE_CODE_OWNER_ADDRESS[nodeCodeInput.trim().toUpperCase()];
                      return owner ? t('，对应地址尾号 {slice}', { slice: owner.slice(-4) }) : null;
                    })()}
                  </span>
                )}
                {codeCheckStatus === '4' && (
                  <span className="stake-code-status stake-code-status--fail">
                    <ShieldX size={13} strokeWidth={2} />
                    {t('校验未通过')}
                  </span>
                )}
                {codeCheckStatus === '1' && (
                  <span className="stake-code-caption">
                    {t('填写后将无法修改，如无节点码可直接跳过')}
                  </span>
                )}
              </div>

              <div className="create-confirm-card">
                <span className="create-confirm-label">{t('费用明细2')}</span>
                <div className="planet-upgrade-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <span className="planet-upgrade-row-label">
                    {createScaleMode === 'star'
                      ? t('将生成 {createCount} 个 · 目标 {createStars} 星', { createCount, createStars })
                      : t('将生成 {createCount} 个节点（1 星）', { createCount })}
                  </span>
                </div>
                <div className="planet-upgrade-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <span className="planet-upgrade-row-label">{t('所需 PB')}</span>
                  <div className="planet-upgrade-cost">
                    <span className="planet-upgrade-cost-num">{formatTokenAmount(pbCost)}</span>
                    <span className="planet-upgrade-cost-unit"> PB</span>
                  </div>
                </div>
                <div className="planet-upgrade-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <span className="planet-upgrade-row-label">{t('Gas 费')}</span>
                  <div className="planet-upgrade-cost">
                    <span className="planet-upgrade-cost-num">{Number(supCost.toFixed(4))}</span>
                    <span className="planet-upgrade-cost-unit"> SUP</span>
                  </div>
                </div>
              </div>

              <PbWalletPicker use="channel_open" amount={pbCost} value={createPayWallet} onChange={setCreatePayWallet} />

              <div className="create-delay-note">
                <Info size={14} strokeWidth={2} aria-hidden />
                <span>{t('节点生成时间有5分钟延迟，请耐心等待')}</span>
              </div>

              <button
                type="button"
                className="planet-confirm-btn"
                onClick={handleConfirmCreate}
                disabled={!createConfirmReady || !createPayWallet}
              >
                {creating
                  ? <Loader2 size={16} strokeWidth={2} className="planet-spin" />
                  : t('确认支付并开通')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BSP 巨星投流：购买弹窗 ── */}
      {bspSheetOpen && (
        <BspInvestSheet
          myAddress={walletAddress ?? MOCK_WALLET_ADDRESS}
          forceInsufficient={devBspInsufficient}
          onOpenRules={() => setBspRulesOpen(true)}
          onClose={() => setBspSheetOpen(false)}
          onConfirmed={record => setBspRecords(prev => [record, ...prev])}
        />
      )}

      {/* ── BSP 巨星投流：完整投流记录底部弹层 ── */}
      {bspRecordsOpen && (
        <div className="sheet-backdrop sheet-backdrop--bottom" onClick={() => setBspRecordsOpen(false)}>
          <div
            className="payment-sheet bsp-record-list-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t('我的投流记录')}
            onClick={event => event.stopPropagation()}
          >
            <BspRecordList
              investments={bspRecords}
              onOpenInvest={() => {
                setBspRecordsOpen(false);
                handleOpenBsp();
              }}
              onClose={() => setBspRecordsOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── BSP 巨星投流：保底规则说明 ── */}
      {bspRulesOpen && <BspRulesSheet onClose={() => setBspRulesOpen(false)} />}

      {/* ── 收藏弹窗：选填备注，确认后收藏；有备注则展示在卡片上 ── */}
      {remarkSheetNode && (
        <div className="sheet-backdrop" onClick={closeFavoriteSheet}>
          <div
            className="payment-sheet planet-remark-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">
                {t('收藏 · {nodeCode}', { nodeCode: remarkSheetNode.nodeCode })}
              </span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={closeFavoriteSheet}
                aria-label={t('关闭')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="stake-code-block">
              <div className="stake-code-label-row">
                <span className="stake-code-label">{t('备注')}</span>
                <span className="stake-code-optional-tag">{t('选填')}</span>
              </div>
              <input
                className="stake-code-input stake-name-input"
                type="text"
                value={remarkInput}
                onChange={e => setRemarkInput(e.target.value)}
                placeholder={t('方便自己识别节点，如「主力收益」')}
                maxLength={20}
                autoFocus
              />
            </div>
            <button className="planet-confirm-btn" type="button" onClick={confirmFavorite}>
              {t('确认收藏')}
            </button>
          </div>
        </div>
      )}

      {/* ── Connect Wallet Sheet (创建频道前置) ── */}
      {connectWalletSheetOpen && !walletAddress && (
        <div className="sheet-backdrop" onClick={() => setConnectWalletSheetOpen(false)}>
          <div
            className="payment-sheet planet-connect-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('抢先开通频道')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setConnectWalletSheetOpen(false)}
                aria-label={t('关闭')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="planet-connect-sheet-body">
              <Wallet size={36} strokeWidth={1.5} aria-hidden="true" />
              <span className="planet-connect-sheet-title">{t('请先连接钱包')}</span>
              <span className="planet-connect-sheet-sub">
                {t('创建频道需要连接钱包后才能继续')}
              </span>
              <button
                type="button"
                className="planet-confirm-btn planet-connect-sheet-cta"
                onClick={connectWallet}
                disabled={walletConnecting}
              >
                {walletConnecting
                  ? <Loader2 size={16} strokeWidth={2} className="planet-spin" />
                  : t('连接钱包')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer node picker (「我的节点」标题行转让入口 → 先选节点) ── */}
      {walletAddress && transferPickerOpen && (
        <div className="sheet-backdrop" onClick={() => setTransferPickerOpen(false)}>
          <div
            className="payment-sheet planet-transfer-picker-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('选择要转让的节点')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setTransferPickerOpen(false)}
                aria-label={t('关闭')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="planet-transfer-picker-search-wrap">
              <Search size={15} strokeWidth={2} className="planet-node-search-icon" />
              <input
                className="planet-node-search-input"
                type="text"
                value={transferPickerSearch}
                onChange={e => {
                  setTransferPickerSearch(e.target.value);
                  setTransferPickerVisibleCount(TRANSFER_PICKER_PAGE_SIZE);
                }}
                placeholder={t('搜索节点编号或频道名…')}
              />
              {transferPickerSearch && (
                <button
                  className="planet-node-search-clear"
                  onClick={() => setTransferPickerSearch('')}
                  aria-label={t('清除')}
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              )}
            </div>

            <div className="planet-transfer-picker-list">
              {transferPickerVisible.length === 0 ? (
                <div className="planet-transfer-picker-empty">
                  {t('未找到匹配的节点')}
                </div>
              ) : (
                <>
                  {transferPickerVisible.map(node => (
                    <button
                      key={node.id}
                      type="button"
                      className="planet-transfer-picker-item"
                      onClick={() => openTransferSheet(node)}
                    >
                      <StarDisplay level={node.stars} />
                      <div className="planet-transfer-picker-info">
                        <span className="planet-transfer-picker-code">{node.nodeCode}</span>
                      </div>
                      <span className="planet-transfer-picker-price">
                        {formatTokenAmount(TRANSFER_PRICE_BY_STAR[node.stars] ?? 0)} PB
                      </span>
                      <ChevronRight size={16} strokeWidth={2} className="planet-transfer-picker-chevron" aria-hidden />
                    </button>
                  ))}
                  {transferPickerHasMore && (
                    <button
                      type="button"
                      className="planet-transfer-picker-more-btn"
                      onClick={() => setTransferPickerVisibleCount(c => c + TRANSFER_PICKER_PAGE_SIZE)}
                    >
                      {t('加载更多（剩余 {length}）', { length: transferPickerFiltered.length - transferPickerVisible.length })}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer node sheet (仅现金购买的 1-5 星节点) ── */}
      {walletAddress && transferSheetNode && (
        <div className="sheet-backdrop" onClick={closeTransferSheet}>
          <div
            className="payment-sheet planet-transfer-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">
                {t('转让节点 {nodeCode}', { nodeCode: transferSheetNode.nodeCode })}
              </span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={closeTransferSheet}
                aria-label={t('关闭')}
                disabled={transferring}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="stake-hint">
              {t('仅支持转让给已在知识宇宙注册过的用户。')}
            </div>

            <div className="stake-code-block">
              <div className="stake-code-label-row">
                <span className="stake-code-label">{t('接收方地址')}</span>
                <span className="stake-code-required-tag">{t('必填')}</span>
              </div>
              <div className="stake-code-row">
                <div className="stake-code-input-wrap">
                  <input
                    className="stake-code-input"
                    type="text"
                    value={transferAddress}
                    onChange={e => handleTransferAddressChange(e.target.value)}
                    placeholder={t('请输入接收方钱包地址')}
                    disabled={transferring}
                  />
                  <button
                    type="button"
                    className="stake-code-paste-btn"
                    onClick={handlePasteTransferAddress}
                    disabled={transferring}
                  >
                    {t('粘贴')}
                  </button>
                </div>
                <button
                  type="button"
                  className="stake-code-verify-btn"
                  onClick={handleVerifyTransferAddress}
                  disabled={!transferAddress.trim() || transferVerifying || transferring}
                >
                  {transferVerifying
                    ? <Loader2 size={14} strokeWidth={2} className="planet-spin" />
                    : t('校验')
                  }
                </button>
              </div>
              {transferCheckStatus === '3' && (
                <span className="stake-code-status stake-code-status--ok">
                  <ShieldCheck size={13} strokeWidth={2} />
                  {t('地址校验通过')}
                </span>
              )}
              {transferCheckStatus === '4' && (
                <span className="stake-code-status stake-code-status--fail">
                  <ShieldX size={13} strokeWidth={2} />
                  {t('该地址从未使用过知识宇宙，请确认地址是否正确')}
                </span>
              )}
            </div>

            <div className="planet-upgrade-sep" />

            {transferCheckStatus === '3' && (
              <PbWalletPicker
                use="node_transfer"
                amount={TRANSFER_PRICE_BY_STAR[transferSheetNode.stars] ?? 0}
                value={transferPayWallet}
                onChange={setTransferPayWallet}
              />
            )}

            <div className="planet-upgrade-row">
              <span className="planet-upgrade-row-label">
                {t('转让价格')}
              </span>
              <div className="planet-upgrade-cost">
                <span className="planet-upgrade-cost-num">
                  {formatTokenAmount(TRANSFER_PRICE_BY_STAR[transferSheetNode.stars] ?? 0)}
                </span>
                <span className="planet-upgrade-cost-unit"> PB</span>
              </div>
            </div>
            {(!transferPayWallet || walletConsumesSup(transferPayWallet)) && (
              <div className="planet-upgrade-row">
                <span className="planet-upgrade-row-label">{t('Gas 费')}</span>
                <div className="planet-upgrade-cost">
                  <span className="planet-upgrade-cost-num">
                    {formatSupAmount(SUP_COST_BY_TIER[transferSheetNode.tier])}
                  </span>
                  <span className="planet-upgrade-cost-unit"> SUP</span>
                </div>
              </div>
            )}

            <button
              className="planet-confirm-btn"
              onClick={handleConfirmTransfer}
              disabled={transferCheckStatus !== '3' || transferring || !transferPayWallet}
            >
              {transferring
                ? <Loader2 size={16} strokeWidth={2} className="planet-spin" />
                : t('确认转让')
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Child node list (点击卡片「子节点」数字 → 该频道具体子节点名单) ── */}
      {childListNode && (
        <div className="sheet-backdrop" onClick={() => setChildListNode(null)}>
          <div
            className="payment-sheet planet-transfer-picker-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header planet-child-list-sheet-header">
              <div className="planet-child-list-sheet-heading">
                <span className="sheet-title">
                  {t('子节点列表 · {nodeCode}', { nodeCode: childListNode.nodeCode })}
                </span>
                <span className="planet-child-list-sheet-count">
                  {t('共 {length} 个', { length: childListEntries.length })}
                </span>
              </div>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setChildListNode(null)}
                aria-label={t('关闭')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="planet-transfer-picker-list">
              {childListVisible.length === 0 ? (
                <div className="planet-transfer-picker-empty">
                  {t('该节点暂无子节点')}
                </div>
              ) : (
                <>
                  {childListVisible.map((entry, i) => {
                    const copyKey = `child-${i}-${entry.code}`;
                    return (
                      <div key={copyKey} className="planet-transfer-picker-item">
                        <StarDisplay level={entry.stars} />
                        <div className="planet-transfer-picker-info">
                          <div className="planet-node-code-row">
                            <span className="planet-transfer-picker-code">{entry.code}</span>
                            <button
                              type="button"
                              className={`planet-node-copy-btn${copiedId === copyKey ? ' planet-node-copy-btn--done' : ''}`}
                              onClick={() => {
                                navigator.clipboard.writeText(entry.code).then(() => {
                                  setCopiedId(copyKey);
                                  setTimeout(() => setCopiedId(null), 1800);
                                });
                              }}
                              aria-label={t('复制编号')}
                            >
                              {copiedId === copyKey ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {childListHasMore && (
                    <button
                      type="button"
                      className="planet-transfer-picker-more-btn"
                      onClick={() => setChildListVisibleCount(c => c + TRANSFER_PICKER_PAGE_SIZE)}
                    >
                      {t('加载更多（剩余 {length}）', { length: childListEntries.length - childListVisible.length })}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <DevPanel>
            <button
              type="button"
              className="planet-dev-menu-item"
              role="menuitemcheckbox"
              aria-checked={devForceEmptyNodes}
              onClick={() => setDevForceEmptyNodes(v => !v)}
            >
              <span>{t('无节点空状态')}</span>
              <span className={`planet-dev-menu-toggle${devForceEmptyNodes ? ' planet-dev-menu-toggle--on' : ''}`}>
                {devForceEmptyNodes ? t('开') : t('关')}
              </span>
            </button>
            <button
              type="button"
              className="planet-dev-menu-item"
              role="menuitemcheckbox"
              aria-checked={devBspInsufficient}
              onClick={() => setDevBspInsufficient(v => !v)}
            >
              <span>{t('BSP 余额不足演示')}</span>
              <span className={`planet-dev-menu-toggle${devBspInsufficient ? ' planet-dev-menu-toggle--on' : ''}`}>
                {devBspInsufficient ? t('开') : t('关')}
              </span>
            </button>
      </DevPanel>
    </div>
  );
}
