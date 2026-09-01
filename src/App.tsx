import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppProvider } from './AppContext';
import type { AppContextValue } from './AppContext';
import { withFreeTier } from './channelTiers';
import { ACTIVITY_GROUPS, ALL_CHANNELS, ALL_POSTS, AVATAR_PRESET_SEEDS, CURRENT_USER, DEFAULT_WALLET_DISPLAY, findRegisteredUserByAddress, MOCK_CHANNEL_AUTHORIZATIONS, MOCK_FIVE_STAR_NODE_COUNT, MOCK_MERIT_BALANCE, MOCK_MY_INVITE_CODE, MOCK_OUTGOING_TIPS, MOCK_PB_AIRDROP_AMOUNT, MOCK_PB_WALLETS, MOCK_KNOWLEDGE_CERTS, MOCK_SHIPPING_ADDRESSES, MOCK_SHOP_ORDERS, MOCK_SUP_WALLETS, MOCK_WALLET_ADDRESS, getAirdropDeadline, resolveInviterAddress } from './mockData';
import { formatScheduledAt } from './dateUtils';
import { isValidWalletAddress } from './formatAddress';
import type { AddressMigration, Channel, ChannelAuthorization, Draft, InteractionAction, KnowledgeCert, Language, NewChannelData, NewPostData, OutgoingTip, PayCtx, PbUse, PbWalletId, Post, PostAction, Reply, Route, ShippingAddress, ShopOrder, StakeModalRequest, SupTransaction, SupTransactionReason, SupWalletId, UserProfile } from './types';
import { PB_WALLETS, PB_WALLET_DISPLAY_ORDER, PB_WALLET_PRIORITY, allowedWalletsForUse, isWalletAllowedForUse, pbOnchainFee, resolveSupPool, splitAirdropClaim, supReasonForPbUse, walletConsumesSup } from './walletConfig';
import { computeUnitMerit } from './shopConfig';
import { getShopVariant, isMultiVariantShop } from './shopUtils';
import { postHasStake, formatTokenAmount } from './stakeConfig';
import { translate } from './locales';
import { BottomNav } from './components/BottomNav';
import { ArticleReader, ChannelCreatedSuccessModal, ChannelSubscribeModal, ConfirmDeleteModal, ConfirmUnfollowModal, ConnectWalletModal, CreateChannelModal, GeminiStakeModal, ImageLightbox, LinkSheet, PaymentSheet, VideoPlayer } from './components/Overlays';
import { InteractionTaskSheet } from './components/InteractionTaskSheet';
import { LotTaskSheet } from './components/LotTaskSheet';
import { effectiveClaimRatio, getIssuedCredibilityRewardTotal, getLotQuota, getTaskCalendarMonth, getTaskSnapshot, getYesterdaySnapshot, isRatioLadderActive, lotCredibilityEarned, markInteracted, markPosted, recordAirdropClaim, resetTasks, settleDueCredibilityRewards, simulateInteractedCount, taskDayKey, TASK_CELEBRATE_EVERY, type TaskDaySnapshot } from './taskConfig';
import { Toast } from './components/shared';
import { TaskCelebrationOverlay } from './components/TaskCelebrationOverlay';
import { ComposePage } from './pages/ComposePage';
import { FeedPage } from './pages/FeedPage';
import { INITIAL_FAVORITE_NODE_IDS, KnowledgePlanetPage } from './pages/KnowledgePlanetPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { ChannelPage } from './pages/ChannelPage';
import { ActivityPage } from './pages/ActivityPage';
import { DmListPage, DmChatPage } from './pages/DmPage';
import { SearchPage } from './pages/SearchPage';
import { ShopPage } from './pages/ShopPage';
import { ShopItemPage } from './pages/ShopItemPage';
import { OrdersPage } from './pages/OrdersPage';
import { CertsPage } from './pages/CertsPage';
import { CertDetailPage } from './pages/CertDetailPage';
import { NodeDetailPage } from './pages/NodeDetailPage';
import { accountDisplayName, type AdminAccount } from './adminAccounts';


export default function App({ account, onLanguageChange }: {
  /** 运营后台模式下，以哪个账号身份运行本应用实例；不传即今天的单账号行为 */
  account?: AdminAccount;
  onLanguageChange?: (language: Language) => void;
} = {}) {
  /** 账号命名空间：运营后台模式下每个账号的本地存储互相隔离 */
  const ns = useCallback((key: string) => account ? `${key}:${account.address}` : key, [account]);
  const [stack, setStack] = useState<Route[]>([{ page: 'P0', tab: 0 }]);
  const [nodeTransferAutoOpenId, setNodeTransferAutoOpenId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const composeCloseHandler = useRef<() => void>(() => {});
  const editComposeCloseHandler = useRef<() => void>(() => {});
  // shop-notebook 预置为已加入合伙人，演示「合伙人绑商品不绑人」：同一卖家的新品 shop-mug 需重新加入才享分成
  const [linkedPostIds, setLinkedPostIds] = useState<Set<string>>(new Set(['shop-notebook']));
  const [followedAuthors, setFollowedAuthors] = useState<Set<string>>(new Set(['阿May的研究笔记']));
  const [repostedPostIds, setRepostedPostIds] = useState<Set<string>>(new Set(['p1', 'p4', 'p6']));
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set(['p2', 'p5', 'im3']));
  const [dislikedPostIds, setDislikedPostIds] = useState<Set<string>>(new Set());
  const [outgoingTips, setOutgoingTips] = useState<OutgoingTip[]>(() => [...MOCK_OUTGOING_TIPS]);
  const [toastMsg, setToastMsg] = useState<{ msg: string; type?: 'demo' } | null>(null);
  const [paySheet, setPaySheet] = useState<PayCtx | null>(null);
  const [stakeModal, setStakeModal] = useState<StakeModalRequest | null>(null);
  const [linkSheet, setLinkSheet] = useState<{ postId: string; mode: 'link' | 'unlock' } | null>(null);
  const pendingPaySuccessRef = useRef<(() => void) | null>(null);
  const pendingPartnerCommentRef = useRef<{ postId: string; text: string } | null>(null);
  const pendingWalletActionRef = useRef<(() => void) | null>(null);
  const [extraRepliesByPostId, setExtraRepliesByPostId] = useState<Record<string, Reply[]>>({});

  const [language, setLanguage] = useState<Language>('zh-CN');
  useEffect(() => { onLanguageChange?.(language); }, [language, onLanguageChange]);
  const [confirmDelete, setConfirmDelete] = useState<{ postId: string; onAfterDelete?: () => void } | null>(null);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [confirmUnfollow, setConfirmUnfollow] = useState<string | null>(null);
  const [imageLightbox, setImageLightbox] = useState<{ post: Post; imgIdx: number; visibleImgCount: number } | null>(null);
  const [articleReaderPost, setArticleReaderPost] = useState<Post | null>(null);
  const [videoPlayerPost, setVideoPlayerPost] = useState<Post | null>(null);
  const [activityGroups, setActivityGroups] = useState(ACTIVITY_GROUPS);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [interactionTaskOpen, setInteractionTaskOpen] = useState(false);
  const [lotTaskOpen, setLotTaskOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = () => setSearchOpen(true);
  const closeSearch = () => setSearchOpen(false);
  // 首页信息流下滑沉浸效果：顶部/底部导航渐隐；离开首页时复位
  const [navBarsHidden, setNavBarsHidden] = useState(false);

  // 演示默认使用已连接的钱包；断开后仍可作为游客浏览帖子。
  const [walletConnected, setWalletConnected] = useState(true);
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  // 知识宇宙页用的钱包地址态，与 walletConnected 同步维护，供该页头部的钱包 chip 展示
  const [walletAddress, setWalletAddress] = useState<string | null>(account?.address ?? MOCK_WALLET_ADDRESS);
  const [walletConnecting, setWalletConnecting] = useState(false);

  // 显式的"连接钱包"入口（顶部快捷按钮、主页引导按钮）直接连接，无需二次确认；
  // 若是从确认弹窗触发（携带被拦截的原操作），连接后继续执行该操作
  const connectWallet = () => {
    setWalletConnected(true);
    setShowConnectWallet(false);
    showToast(t('钱包已连接'));
    const pending = pendingWalletActionRef.current;
    pendingWalletActionRef.current = null;
    pending?.();
    setWalletConnecting(true);
    setTimeout(() => {
      setWalletAddress(account?.address ?? MOCK_WALLET_ADDRESS);
      setWalletConnecting(false);
    }, 600);
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(null);
  };

  // 其余触发到需要身份/资产/链上能力操作的入口，先弹窗确认
  const requireWallet = (action: () => void) => {
    if (walletConnected) { action(); return; }
    pendingWalletActionRef.current = action;
    setShowConnectWallet(true);
  };

  // ── 知识宇宙页：PB 余额 / 邀请绑定 / 周期性空投 ──────────────────
  const getInitialPbWallets = (): Record<PbWalletId, number> => ({
    ...MOCK_PB_WALLETS,
    credibility: MOCK_PB_WALLETS.credibility + getIssuedCredibilityRewardTotal(getLotQuota(MOCK_FIVE_STAR_NODE_COUNT).interactions),
  });
  const [pbWallets, setPbWallets] = useState<Record<PbWalletId, number>>(getInitialPbWallets);
  /** 总额只用于资产总览，支付必须通过单钱包的 payPb。 */
  const pbBalance = useMemo(() => Object.values(pbWallets).reduce((sum, balance) => sum + balance, 0), [pbWallets]);
  const [inviterAddress, setInviterAddress] = useState<string | null>(null);
  const [airdropClaimed, setAirdropClaimed] = useState(false);

  // 每日任务：互动帖任务决定明天空投领取比例，公信力任务决定今天公信力签到奖，两者互不相关
  const [taskSnapshotToday, setTaskSnapshotToday] = useState<TaskDaySnapshot>(
    () => getTaskSnapshot(taskDayKey(), getLotQuota(MOCK_FIVE_STAR_NODE_COUNT).interactions),
  );
  // 开发工具：模拟 9/1 后阶梯规则生效 / 模拟新用户（无昨日记录）/ 切换直连五星节点数
  const [demoForceLadder, setDemoForceLadder] = useState(true);
  const [demoForceNewUser, setDemoForceNewUser] = useState(false);
  const [demoFiveStarNodeCount, setDemoFiveStarNodeCount] = useState(MOCK_FIVE_STAR_NODE_COUNT);
  const [taskSnapshotYesterday, setTaskSnapshotYesterday] = useState<TaskDaySnapshot | null>(
    () => getYesterdaySnapshot(new Date(), { forceNewUser: demoForceNewUser, quotaInteractions: getLotQuota(MOCK_FIVE_STAR_NODE_COUNT).interactions }),
  );
  const airdropClaimRatio = useMemo(() => {
    // demoForceLadder 只需让 isRatioLadderActive 判定为真，用生效日当天即可，无需模拟精确日期
    const now = demoForceLadder ? new Date('2026-09-02T00:00:00+08:00') : new Date();
    return effectiveClaimRatio(taskSnapshotYesterday, now);
  }, [taskSnapshotYesterday, demoForceLadder]);
  const airdropRatioLadderActive = useMemo(() => {
    const now = demoForceLadder ? new Date('2026-09-02T00:00:00+08:00') : new Date();
    return isRatioLadderActive(now);
  }, [demoForceLadder]);
  const lotQuota = useMemo(() => getLotQuota(demoFiveStarNodeCount), [demoFiveStarNodeCount]);
  useEffect(() => {
    setTaskSnapshotToday(getTaskSnapshot(taskDayKey(), lotQuota.interactions));
    setTaskSnapshotYesterday(getYesterdaySnapshot(new Date(), {
      forceNewUser: demoForceNewUser,
      quotaInteractions: lotQuota.interactions,
    }));
  }, [demoForceNewUser, lotQuota.interactions]);
  const toggleDemoForceLadder = useCallback(() => setDemoForceLadder(prev => !prev), []);
  const toggleDemoForceNewUser = useCallback(() => setDemoForceNewUser(prev => !prev), []);
  const FIVE_STAR_NODE_COUNT_CYCLE = [0, 1, 3, 5];
  const cycleDemoFiveStarNodeCount = useCallback(() => {
    setDemoFiveStarNodeCount(prev => {
      const idx = FIVE_STAR_NODE_COUNT_CYCLE.indexOf(prev);
      return FIVE_STAR_NODE_COUNT_CYCLE[(idx + 1) % FIVE_STAR_NODE_COUNT_CYCLE.length];
    });
  }, []);
  // 每完成 N 篇互动帖 +1，供任务面板监听触发一次性庆祝动效
  const [taskCelebrateSignal, setTaskCelebrateSignal] = useState(0);
  // 知识宇宙节点收藏：详情页与列表页共享，避免两处状态漂移
  const [favoriteNodeIds, setFavoriteNodeIds] = useState<Set<string>>(() => new Set(INITIAL_FAVORITE_NODE_IDS));
  const toggleFavoriteNode = useCallback((nodeId: string) => {
    setFavoriteNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  }, []);

  const recordTaskInteraction = (postId: string) => {
    const { state, added } = markInteracted(postId);
    const after = getTaskSnapshot(taskDayKey(), lotQuota.interactions);
    setTaskSnapshotToday(after);
    if (added && state.interactedPostIds.length > 0 && state.interactedPostIds.length % TASK_CELEBRATE_EVERY === 0) {
      setTaskCelebrateSignal(s => s + 1);
    }
  };

  const recordTaskPosted = () => {
    markPosted();
    const after = getTaskSnapshot(taskDayKey(), lotQuota.interactions);
    setTaskSnapshotToday(after);
  };

  // 开发工具：重置今日任务记录，便于重新体验任务面板
  const resetDemoTasks = () => {
    resetTasks();
    setTaskSnapshotToday(getTaskSnapshot(taskDayKey(), lotQuota.interactions));
  };

  // 开发工具：直接模拟今日互动帖完成数（无需真的操作 35 篇帖子即可预览阶梯比例与庆祝动效）
  const simulateDemoTaskInteractions = (count: number) => {
    simulateInteractedCount(count);
    setTaskSnapshotToday(getTaskSnapshot(taskDayKey(), lotQuota.interactions));
    if (count > 0 && count % TASK_CELEBRATE_EVERY === 0) setTaskCelebrateSignal(s => s + 1);
  };

  const bindInviter = (code: string) => {
    if (inviterAddress) return { ok: false, message: t('已绑定邀请人，无法更换') };
    if (!/^\d{6}$/.test(code)) return { ok: false, message: t('请输入 6 位数字邀请码') };
    if (code === MOCK_MY_INVITE_CODE) return { ok: false, message: t('不能绑定自己的邀请码') };
    setInviterAddress(resolveInviterAddress(code));
    showToast(t('绑定成功'));
    return { ok: true, message: '' };
  };

  const claimAirdrop = () => {
    if (airdropClaimed || Date.now() > getAirdropDeadline()) return;
    // 可领取金额取决于 airdropClaimRatio：已统一处理昨日互动帖完成度、9/1 阶梯生效与新用户默认值
    const claimedAmount = Math.round(MOCK_PB_AIRDROP_AMOUNT * airdropClaimRatio / 100);
    const { onchainAmount, airdropAmount, fee } = splitAirdropClaim(claimedAmount);
    setPbWallets(prev => ({ ...prev, onchain: prev.onchain + onchainAmount, airdrop: prev.airdrop + airdropAmount }));
    if (fee > 0) deductSup(fee, 'airdrop', resolveSupPool(supWallets, 'site_first', fee) ?? 'onchain');
    setAirdropClaimed(true);
    recordAirdropClaim(claimedAmount);
    setTaskSnapshotToday(getTaskSnapshot(taskDayKey(), lotQuota.interactions));
    showToast(t('领取成功，+{MOCK_PB_AIRDROP_AMOUNT} PB', { MOCK_PB_AIRDROP_AMOUNT: claimedAmount }));
  };

  const getPbWalletOptions = useCallback((use: PbUse, amount: number) => (
    PB_WALLET_DISPLAY_ORDER.map(wallet => ({
      wallet,
      allowed: isWalletAllowedForUse(wallet, use),
      sufficient: pbWallets[wallet] >= amount,
    }))
  ), [pbWallets]);

  const pickDefaultPbWallet = useCallback((use: PbUse, amount: number): PbWalletId | null => (
    PB_WALLET_PRIORITY.find(wallet => isWalletAllowedForUse(wallet, use) && pbWallets[wallet] >= amount) ?? null
  ), [pbWallets]);

  const payPb = (payment: { amount: number; use: PbUse; wallet: PbWalletId; supCost?: number; supReason?: SupTransactionReason }) => {
    const { amount, use, wallet, supCost = 0, supReason } = payment;
    if (!isWalletAllowedForUse(wallet, use) || pbWallets[wallet] < amount) return false;
    const supSource = PB_WALLETS[wallet].supSource;
    const supPool = supCost > 0 ? resolveSupPool(supWallets, supSource, supCost) : null;
    if (walletConsumesSup(wallet) && supCost > 0 && !supPool) return false;
    setPbWallets(prev => ({ ...prev, [wallet]: prev[wallet] - amount }));
    if (supPool) deductSup(supCost, supReason ?? supReasonForPbUse(use), supPool);
    return true;
  };

  const setDemoPbWallets = (preset: 'normal' | 'limited') => {
    setPbWallets(preset === 'normal'
      ? getInitialPbWallets()
      : { onchain: 80, station: 2400, credibility: 800 + getIssuedCredibilityRewardTotal(lotQuota.interactions), airdrop: 40 });
  };

  const [supWallets, setSupWallets] = useState<Record<SupWalletId, number>>(MOCK_SUP_WALLETS);
  /** 总额只用于资产总览展示，扣减必须通过 resolveSupPool 选定单一池子。 */
  const supBalance = useMemo(() => supWallets.site + supWallets.onchain, [supWallets]);
  const INITIAL_SUP_HISTORY: SupTransaction[] = [
    { id: 's1', direction: 'in', amount: 10, time: '2026-06-01 09:00', reason: 'recharge', wallet: 'onchain' },
    { id: 's2', direction: 'in', amount: 3.1, time: '2026-06-12 16:20', reason: 'recharge', wallet: 'onchain' },
    { id: 's3', direction: 'out', amount: 0.1, time: '2026-06-20 10:15', reason: 'channel_open', wallet: 'site' },
  ];
  const [supHistory, setSupHistory] = useState<SupTransaction[]>(INITIAL_SUP_HISTORY);

  const appendSupTransaction = (tx: Omit<SupTransaction, 'id' | 'time'> & { time?: string }) => {
    const time = tx.time ?? new Date().toISOString().slice(0, 16).replace('T', ' ');
    setSupHistory(prev => [{ ...tx, id: `s${Date.now()}`, time }, ...prev]);
  };

  const deductSup = (amount: number, reason: SupTransactionReason, pool: SupWalletId = 'site') => {
    setSupWallets(prev => ({ ...prev, [pool]: Math.max(0, prev[pool] - amount) }));
    appendSupTransaction({ direction: 'out', amount, reason, wallet: pool });
  };

  /** 站内 SUP 是最小 0.0001 精度的小额资产；避免浮点减法产生的长尾小数污染显示。 */
  const roundSup = (n: number) => Math.round(n * 10000) / 10000;

  // ── 可提取 PB / 站内 SUP 充值·提取：站内 PB 明确不可上链，不提供入口 ──
  const depositAirdropPb = (amount: number) => {
    if (amount <= 0) return;
    setPbWallets(prev => ({ ...prev, airdrop: prev.airdrop + amount }));
  };

  const withdrawAirdropPb = (amount: number): boolean => {
    if (amount <= 0 || pbWallets.airdrop < amount) return false;
    const fee = pbOnchainFee(amount);
    const pool = resolveSupPool(supWallets, 'site_first', fee);
    if (fee > 0 && !pool) return false;
    setPbWallets(prev => ({ ...prev, airdrop: prev.airdrop - amount, onchain: prev.onchain + amount }));
    if (fee > 0 && pool) deductSup(fee, 'withdraw', pool);
    return true;
  };

  const depositSiteSup = (amount: number) => {
    if (amount <= 0) return;
    setSupWallets(prev => ({ ...prev, site: roundSup(prev.site + amount) }));
    appendSupTransaction({ direction: 'in', amount, reason: 'recharge', wallet: 'site' });
  };

  const withdrawSiteSup = (amount: number): boolean => {
    if (amount <= 0 || supWallets.site < amount) return false;
    const fee = pbOnchainFee(amount);
    const net = roundSup(amount - fee);
    setSupWallets(prev => ({ ...prev, site: roundSup(prev.site - amount), onchain: roundSup(prev.onchain + net) }));
    appendSupTransaction({ direction: 'out', amount, reason: 'withdraw', wallet: 'site' });
    return true;
  };

  // ── 地址迁移：前端只模拟申请、冻结和撤销；实际资料迁移交由后续服务处理 ──
  const ADDRESS_MIGRATION_PB_FEE = 100;
  const ADDRESS_MIGRATION_SUP_FEE = 0.01;
  const ADDRESS_MIGRATION_APPEAL_MS = 24 * 60 * 60 * 1000;
  const [addressMigrations, setAddressMigrations] = useState<AddressMigration[]>([]);

  const settleExpiredAddressMigrations = useCallback(() => {
    const now = Date.now();
    setAddressMigrations(prev => {
      let changed = false;
      const next = prev.map(migration => {
        if (migration.status === 'pending' && migration.expiresAt <= now) {
          changed = true;
          return { ...migration, status: 'awaiting_execution' as const };
        }
        return migration;
      });
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    settleExpiredAddressMigrations();
    const timer = window.setInterval(settleExpiredAddressMigrations, 60_000);
    return () => window.clearInterval(timer);
  }, [settleExpiredAddressMigrations]);

  const requestAddressMigration = (targetAddress: string) => {
    const sourceAddress = walletAddress;
    const normalizedTarget = targetAddress.trim().toLowerCase();
    const now = Date.now();
    if (!sourceAddress) return { ok: false, message: t('请先连接钱包') };
    if (addressMigrations.some(m => m.status === 'pending' && m.expiresAt > now)) {
      return { ok: false, message: t('迁移申请进行中，暂不能发起新的申请') };
    }
    if (pbWallets.onchain < ADDRESS_MIGRATION_PB_FEE) return { ok: false, message: t('链上 PB 余额不足') };
    if (supBalance < ADDRESS_MIGRATION_SUP_FEE) return { ok: false, message: t('SUP 余额不足') };

    const migration: AddressMigration = {
      id: `migration-${now}`,
      sourceAddress,
      targetAddress: normalizedTarget,
      pbFee: ADDRESS_MIGRATION_PB_FEE,
      supFee: ADDRESS_MIGRATION_SUP_FEE,
      createdAt: now,
      expiresAt: now + ADDRESS_MIGRATION_APPEAL_MS,
      status: 'pending',
    };
    setPbWallets(prev => ({ ...prev, onchain: prev.onchain - ADDRESS_MIGRATION_PB_FEE }));
    deductSup(ADDRESS_MIGRATION_SUP_FEE, 'address_migration', resolveSupPool(supWallets, 'site_first', ADDRESS_MIGRATION_SUP_FEE) ?? 'onchain');
    setAddressMigrations(prev => [migration, ...prev]);
    showToast(t('迁移申请已提交'));
    return { ok: true };
  };

  const cancelAddressMigration = (migrationId: string) => {
    const now = Date.now();
    const migration = addressMigrations.find(item => item.id === migrationId);
    if (!migration || migration.status !== 'pending' || migration.expiresAt <= now) {
      settleExpiredAddressMigrations();
      return false;
    }
    setAddressMigrations(prev => prev.map(item => (
      item.id === migrationId ? { ...item, status: 'cancelled', cancelledAt: now } : item
    )));
    setPbWallets(prev => ({ ...prev, onchain: prev.onchain + migration.pbFee }));
    setSupWallets(prev => ({ ...prev, site: prev.site + migration.supFee }));
    appendSupTransaction({ direction: 'in', amount: migration.supFee, reason: 'address_migration', wallet: 'site' });
    showToast(t('已提交撤销申请，冻结费用已释放'));
    return true;
  };

  const dismissMigrationReminder = (migrationId: string) => {
    setAddressMigrations(prev => prev.map(item => (
      item.id === migrationId ? { ...item, reminderSeen: true } : item
    )));
  };

  const [channels, setChannels] = useState<Channel[]>(ALL_CHANNELS);

  // ── 频道授权：频道主授权他人钱包地址代为发帖，需对方接受后生效，双方可随时撤销 ──
  const [channelAuthorizations, setChannelAuthorizations] = useState<ChannelAuthorization[]>(MOCK_CHANNEL_AUTHORIZATIONS);
  const normalizedWalletAddress = (walletAddress ?? '').toLowerCase();

  const delegatedChannels = useMemo(() => {
    const activeChannelIds = new Set(
      channelAuthorizations
        .filter(a => a.status === 'active' && a.delegateAddress === normalizedWalletAddress)
        .map(a => a.channelId),
    );
    return channels.filter(c => activeChannelIds.has(c.id));
  }, [channels, channelAuthorizations, normalizedWalletAddress]);

  const pendingIncomingChannelAuthorizations = useMemo(
    () => channelAuthorizations.filter(a => a.status === 'pending' && a.delegateAddress === normalizedWalletAddress),
    [channelAuthorizations, normalizedWalletAddress],
  );

  const requestChannelAuthorization = (channelId: string, delegateAddress: string): { ok: boolean; message?: string } => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel || channel.ownerName !== CURRENT_USER) return { ok: false, message: t('无权操作该频道') };
    if (!isValidWalletAddress(delegateAddress)) return { ok: false, message: t('请输入合法的钱包地址') };
    const normalized = delegateAddress.trim().toLowerCase();
    if (normalized === normalizedWalletAddress) return { ok: false, message: t('不能授权给自己') };
    const alreadyExists = channelAuthorizations.some(a =>
      a.channelId === channelId && a.delegateAddress === normalized && (a.status === 'pending' || a.status === 'active'));
    if (alreadyExists) return { ok: false, message: t('该地址已是本频道的协作者或邀请待处理') };

    const delegate = findRegisteredUserByAddress(normalized);
    const authorization: ChannelAuthorization = {
      id: `collab-${Date.now()}`,
      channelId,
      ownerName: CURRENT_USER,
      delegateAddress: normalized,
      delegateName: delegate?.name,
      status: 'pending',
      createdAt: Date.now(),
    };
    setChannelAuthorizations(prev => [authorization, ...prev]);
    showToast(t('已发送授权邀请，等待对方接受'));
    return { ok: true };
  };

  const respondToChannelAuthorization = (authId: string, response: 'accept' | 'decline') => {
    const auth = channelAuthorizations.find(a => a.id === authId);
    if (!auth || auth.status !== 'pending' || auth.delegateAddress !== normalizedWalletAddress) return;
    setChannelAuthorizations(prev => prev.map(a => a.id === authId
      ? { ...a, status: response === 'accept' ? 'active' : 'declined', respondedAt: Date.now() }
      : a));
    showToast(response === 'accept' ? t('已接受授权，可在发帖时选择该频道') : t('已婉拒该邀请'));
  };

  const revokeChannelAuthorization = (authId: string) => {
    const auth = channelAuthorizations.find(a => a.id === authId);
    if (!auth || (auth.status !== 'pending' && auth.status !== 'active')) return;
    const isOwnerSide = auth.ownerName === CURRENT_USER;
    const isDelegateSide = auth.delegateAddress === normalizedWalletAddress;
    if (!isOwnerSide && !isDelegateSide) return;
    setChannelAuthorizations(prev => prev.map(a => a.id === authId
      ? { ...a, status: 'revoked', revokedAt: Date.now(), revokedBy: isOwnerSide ? 'owner' : 'delegate' }
      : a));
    showToast(t('已撤销授权'));
  };

  const resolveDelegatedDisplayAuthor = (channelId?: string): string | undefined => {
    if (!channelId) return undefined;
    const channel = channels.find(c => c.id === channelId);
    if (!channel || channel.ownerName === CURRENT_USER) return undefined;
    const hasActiveGrant = channelAuthorizations.some(a =>
      a.channelId === channelId && a.status === 'active' && a.delegateAddress === normalizedWalletAddress);
    return hasActiveGrant ? channel.ownerName : undefined;
  };
  // 开发工具：模拟「当前用户尚未创建任何频道」；默认关闭（原型自带 5 个自有频道）
  const [demoHideOwnChannels, setDemoHideOwnChannels] = useState(false);
  const visibleChannels = useMemo(
    () => (demoHideOwnChannels ? channels.filter(c => c.ownerName !== CURRENT_USER) : channels),
    [channels, demoHideOwnChannels],
  );
  const toggleDemoHideOwnChannels = useCallback(() => {
    setDemoHideOwnChannels(prev => !prev);
  }, []);
  // channel-yanlei 只有 1 个付费档「铜牌」，tiers[0] 恒为免费档，故铜牌下标是 1
  const [subscribedChannelTiers, setSubscribedChannelTiers] = useState<Record<string, number>>({ 'channel-yanlei': 1 });
  // 演示到期续费态：产品大叔的方法论频道保留铜牌订阅记录，但已到期失去权限
  const [expiredChannelIds, setExpiredChannelIds] = useState<Set<string>>(new Set(['channel-yanlei']));
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [manageChannelId, setManageChannelId] = useState<string | null>(null);
  const [channelCreatedPromptId, setChannelCreatedPromptId] = useState<string | null>(null);
  const [channelSubscribeId, setChannelSubscribeId] = useState<string | null>(null);
  const [channelSubscribeRequiredTier, setChannelSubscribeRequiredTier] = useState<number | undefined>(undefined);

  const MOCK_DRAFTS: Draft[] = [
    {
      id: 'draft-mock-video',
      kind: 'video',
      title: 'AI Agent 从入门到部署：完整视频教程（未完成）',
      hasVideo: true,
      thumbnailUrl: '/img/p7.svg',
      joinGemini: true,
      visibility: 50,
      savedAt: Date.now() - 1000 * 60 * 35, // 35 min ago
    },
    {
      id: 'draft-mock-image',
      kind: 'image',
      title: 'Figma 组件库截图整理——设计系统第一版',
      imgCount: 5,
      thumbnailUrl: '/img/p1.svg',
      joinGemini: false,
      savedAt: Date.now() - 1000 * 60 * 60 * 2, // 2h ago
    },
    {
      id: 'draft-mock-article',
      kind: 'article',
      title: '独立开发者出海指南',
      articleTitle: '如何用 AI 工具独立完成一套 SaaS 产品？',
      articleHasCover: true,
      thumbnailUrl: '/img/art.svg',
      joinGemini: true,
      visibility: 30,
      savedAt: Date.now() - 1000 * 60 * 60 * 24, // 1d ago
    },
    {
      id: 'draft-mock-text',
      kind: 'text',
      title: '今天在咖啡馆想到的一个产品思路：',
      joinGemini: false,
      savedAt: Date.now() - 1000 * 60 * 60 * 48, // 2d ago
    },
  ];

  const [drafts, setDrafts] = useState<Draft[]>(() => {
    try {
      const saved = localStorage.getItem(ns('ku-drafts'));
      return saved ? JSON.parse(saved) : MOCK_DRAFTS;
    } catch { return MOCK_DRAFTS; }
  });

  useEffect(() => {
    localStorage.setItem(ns('ku-drafts'), JSON.stringify(drafts));
  }, [drafts, ns]);

  const defaultProfile = (): UserProfile => account
    ? { nickname: accountDisplayName(account), avatarSeed: account.avatarSeed }
    : { nickname: DEFAULT_WALLET_DISPLAY, avatarSeed: AVATAR_PRESET_SEEDS[0] };

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(ns('ku-profile'));
      const profile: UserProfile = saved ? JSON.parse(saved) : defaultProfile();
      // 旧演示人格「林知远」已废弃，统一落到钱包短名
      if (profile.nickname === '林知远') {
        profile.nickname = DEFAULT_WALLET_DISPLAY;
        localStorage.setItem(ns('ku-profile'), JSON.stringify(profile));
      }
      return profile;
    } catch { return defaultProfile(); }
  });

  const updateUserProfile = (profile: UserProfile) => {
    requireWallet(() => {
      setUserProfile(profile);
      localStorage.setItem(ns('ku-profile'), JSON.stringify(profile));
    });
  };

  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(language, key, params), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // 常驻入口：随时打开「互动帖任务」面板；未连接钱包时先引导连接
  const openInteractionTask = () => {
    requireWallet(() => setInteractionTaskOpen(true));
  };

  // 常驻入口：随时打开「公信力任务」面板；未连接钱包时先引导连接
  const openLotTask = () => {
    requireWallet(() => setLotTaskOpen(true));
  };

  // 今天是否还有可领取的空投奖励，供互动帖任务入口红点展示
  const interactionTaskAlert = !airdropClaimed && Date.now() <= getAirdropDeadline();
  // 今天是否还有待达成的公信力奖励，供公信力任务入口红点展示
  const lotTaskAlert = !taskSnapshotToday.bonusEligible;


  const route = stack[stack.length - 1];
  const shopItemOpen = route.page === 'P_SHOP_ITEM';
  const certOpen = route.page === 'P_CERT';
  const pageRoute = (shopItemOpen || certOpen) && stack.length > 1 ? stack[stack.length - 2]! : route;
  const tab = pageRoute.page === 'P0' ? pageRoute.tab : 0;
  const navigate = (r: Route) => { setSearchOpen(false); setStack(s => [...s, r]); };
  const navigateRoot = (r: Route) => setStack([r]);
  // 跳转到自己的主页并自动展开「账户与资料」（用于小黄车联系方式发现引导）
  const [editProfileAutoOpen, setEditProfileAutoOpen] = useState(false);
  const openEditProfileContacts = () => {
    navigate({ page: 'P6', authorName: CURRENT_USER });
    setEditProfileAutoOpen(true);
  };
  const goBack = () => setStack(s => s.length > 1 ? s.slice(0, -1) : s);
  const setTab = (t: 0 | 1 | 2) => setStack(s => [...s.slice(0, -1), { page: 'P0', tab: t }]);

  useEffect(() => {
    if (pageRoute.page !== 'P0' && navBarsHidden) setNavBarsHidden(false);
  }, [pageRoute.page, navBarsHidden]);

  const [posts, setPosts] = useState<Post[]>(ALL_POSTS.filter(p => p.kind !== 'article'));
  const [homeFeedRefreshNonce, setHomeFeedRefreshNonce] = useState(0);
  const refreshHomeFeed = useCallback(() => setHomeFeedRefreshNonce(n => n + 1), []);

  const showToast = (msg: string, type?: 'demo') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 2500);
  };

  // 奖励在北京时间跨日后结算；重新打开原型时也会补结算此前未发放的奖励。
  useEffect(() => {
    const refreshForNewTaskDay = () => {
      const settledDates = settleDueCredibilityRewards(lotQuota.interactions);
      if (settledDates.length > 0) {
        const amount = settledDates.reduce((total, date) => {
          const snapshot = getTaskSnapshot(date, lotQuota.interactions);
          return total + lotCredibilityEarned(snapshot.postedCount, snapshot.interactedCount, lotQuota.interactions);
        }, 0);
        setPbWallets(prev => ({ ...prev, credibility: prev.credibility + amount }));
        showToast(t('已发放任务奖励 +{bonus} 公信力', { bonus: amount }));
      }
      setTaskSnapshotToday(getTaskSnapshot(taskDayKey(), lotQuota.interactions));
      setTaskSnapshotYesterday(getYesterdaySnapshot(new Date(), {
        forceNewUser: demoForceNewUser,
        quotaInteractions: lotQuota.interactions,
      }));
    };

    refreshForNewTaskDay();
    let previousDay = taskDayKey();
    const timer = window.setInterval(() => {
      const nextDay = taskDayKey();
      if (nextDay === previousDay) return;
      previousDay = nextDay;
      refreshForNewTaskDay();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [t, demoForceNewUser, lotQuota.interactions]);

  const openLink = (postId: string, mode: 'link' | 'unlock' = 'link') => {
    requireWallet(() => {
      if (linkedPostIds.has(postId)) {
        showToast(t('已链接，无需重复操作'));
        return;
      }
      const post = posts.find(p => p.id === postId);
      if (!post?.isNode) return;
      setLinkSheet({ postId, mode });
    });
  };

  const openPay = (p: PayCtx) => setPaySheet(p);

  const performLink = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    const hadPaywall = post ? post.visiblePercent < 100 : false;
    setLinkedPostIds(s => new Set(s).add(postId));
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, links: p.links + 1, visiblePercent: 100 } : p
    ));
    showToast(hadPaywall
      ? t('链接成功！子节点已创建，全文已解锁')
      : t('链接成功！子节点已创建')
    );
  };

  const beginPaidInteraction = (postId: string, action: InteractionAction, onAfterPay: () => void) => {
    requireWallet(() => {
      const post = posts.find(p => p.id === postId);
      if (!post || !postHasStake(post)) {
        onAfterPay();
        return;
      }
      pendingPaySuccessRef.current = onAfterPay;
      setPaySheet({
        ctx: action === 'unlock' ? 'chain' : 'interaction',
        postId,
        action,
        stakeTier: post.stakeTier,
      });
    });
  };

  const requestPostInteraction = (
    postId: string,
    action: InteractionAction,
    handlers: { onSkip: () => void; onPaid: () => void },
    options?: { presetComment?: string },
  ) => {
    requireWallet(() => {
      const post = posts.find(p => p.id === postId);
      if (!post || !postHasStake(post)) {
        handlers.onSkip();
        return;
      }
      setStakeModal({
        postId,
        action,
        mode: action === 'partner' ? 'partner' : 'default',
        presetComment: options?.presetComment,
        onSkip: handlers.onSkip,
        onAfterPay: handlers.onPaid,
      });
    });
  };

  const toggleFollow = (author: string) => {
    requireWallet(() => {
      if (followedAuthors.has(author)) {
        setConfirmUnfollow(author);
      } else {
        setFollowedAuthors(s => new Set(s).add(author));
      }
    });
  };

  const handleConfirmUnfollow = () => {
    if (!confirmUnfollow) return;
    setFollowedAuthors(s => {
      const next = new Set(s);
      next.delete(confirmUnfollow);
      return next;
    });
    setConfirmUnfollow(null);
    showToast(t('已取消关注'));
  };

  const togglePostAction = (postId: string, action: PostAction) => {
    requireWallet(() => {
      const actionState = action === 'share' ? repostedPostIds : action === 'like' ? likedPostIds : action === 'dislike' ? dislikedPostIds : savedPostIds;
      const setActionState = action === 'share' ? setRepostedPostIds : action === 'like' ? setLikedPostIds : action === 'dislike' ? setDislikedPostIds : setSavedPostIds;
      const countKey: 'shares' | 'likes' | 'dislikes' | 'saves' = action === 'share' ? 'shares' : action === 'like' ? 'likes' : action === 'dislike' ? 'dislikes' : 'saves';
      const active = actionState.has(postId);
      const labels = action === 'share'
        ? [t('已取消转发'), t('转发成功')]
        : action === 'like'
          ? [t('已取消点赞'), t('已点赞')]
          : action === 'dislike'
            ? [t('已取消踩'), t('已踩')]
            : [t('已取消收藏'), t('已收藏')];

      // 点赞与踩互斥：激活其中一个时，若另一个已激活则一并取消
      const opposite = action === 'like' ? 'dislike' : action === 'dislike' ? 'like' : undefined;
      const oppositeState = opposite === 'like' ? likedPostIds : opposite === 'dislike' ? dislikedPostIds : undefined;
      const setOppositeState = opposite === 'like' ? setLikedPostIds : opposite === 'dislike' ? setDislikedPostIds : undefined;
      const oppositeCountKey: 'likes' | 'dislikes' | undefined = opposite === 'like' ? 'likes' : opposite === 'dislike' ? 'dislikes' : undefined;
      const clearOpposite = !active && !!oppositeState && oppositeState.has(postId);

      setActionState(previous => {
        const next = new Set(previous);
        active ? next.delete(postId) : next.add(postId);
        return next;
      });
      if (clearOpposite && setOppositeState) {
        setOppositeState(previous => {
          const next = new Set(previous);
          next.delete(postId);
          return next;
        });
      }
      setPosts(previous => previous.map(post => post.id === postId
        ? {
            ...post,
            [countKey]: Math.max(0, (post[countKey] ?? 0) + (active ? -1 : 1)),
            ...(clearOpposite && oppositeCountKey ? { [oppositeCountKey]: Math.max(0, (post[oppositeCountKey] ?? 0) - 1) } : {}),
          }
        : post));
      if (action !== 'like' && action !== 'dislike') showToast(active ? labels[0] : labels[1]);
      // 新增互动（非取消）时，计入今日互动帖任务进度
      if (!active) recordTaskInteraction(postId);
    });
  };

  const recordOutgoingTip = (tip: Omit<OutgoingTip, 'id' | 'createdAt'>) => {
    setOutgoingTips(prev => [{
      ...tip,
      id: `tip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    }, ...prev]);
  };

  const deletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    showToast(t('帖子已删除'));
  };

  const requestDeletePost = (postId: string, onAfterDelete?: () => void) => {
    requireWallet(() => setConfirmDelete({ postId, onAfterDelete }));
  };

  const openEditPost = (postId: string) => {
    requireWallet(() => setEditPostId(postId));
  };

  const updatePost = (postId: string, newTitle: string, tierUpdate?: { minTierIndex: number | undefined }) => {
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, title: newTitle, ...(tierUpdate ? { minTierIndex: tierUpdate.minTierIndex } : {}) }
      : p));
    setEditPostId(null);
    showToast(t('已保存'));
  };

  const incrementReplies = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies: p.replies + 1 } : p));
    // 评论同样计入今日互动帖任务进度
    recordTaskInteraction(postId);
  }, []);

  const appendPostReply = useCallback((postId: string, text: string) => {
    const reply: Reply = {
      id: `reply-${Date.now()}`,
      author: CURRENT_USER,
      time: t('刚刚'),
      text: text.trim(),
      avatarIdx: 0,
      likes: 0,
    };
    setExtraRepliesByPostId(prev => ({
      ...prev,
      [postId]: [reply, ...(prev[postId] ?? [])],
    }));
    incrementReplies(postId);
  }, [incrementReplies, t]);

  // 删除自己的评论后回收计数；不减任务进度（互动一旦发生即视为完成，删除评论不倒扣）
  const decrementReplies = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies: Math.max(0, p.replies - 1) } : p));
  }, []);

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    deletePost(confirmDelete.postId);
    if (confirmDelete.onAfterDelete) confirmDelete.onAfterDelete();
    setConfirmDelete(null);
  };

  const openCreateChannel = () => {
    requireWallet(() => setCreateChannelOpen(true));
  };
  const closeCreateChannel = () => setCreateChannelOpen(false);
  const openManageChannel = (channelId: string) => {
    requireWallet(() => setManageChannelId(channelId));
  };
  const closeManageChannel = () => setManageChannelId(null);

  // 开通频道是一步流程：CreateChannelModal 自己跑完支付动画（1000 PB + 100 PB + 0.1 SUP）后直接调用此函数建号
  const createChannel = (data: NewChannelData) => {
    // 演示「未创建」态时若真的去开通，退出该演示态，否则新建频道会被继续隐藏
    if (demoHideOwnChannels) setDemoHideOwnChannels(false);
    const channelId = `channel-${Date.now()}`;
    // 代开通频道：地址校验通过后，频道归属受益人，付款人只记录在 payerName 里
    const beneficiary = data.beneficiaryAddress ? findRegisteredUserByAddress(data.beneficiaryAddress) : undefined;
    const newChannel: Channel = {
      id: channelId,
      ownerName: beneficiary?.name ?? CURRENT_USER,
      name: data.name,
      description: data.description,
      avatarSeed: userProfile.avatarSeed,
      category: data.category,
      tiers: withFreeTier(data.tiers),
      subscriberCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      payerName: beneficiary ? CURRENT_USER : undefined,
    };
    setChannels(prev => [...prev, newChannel]);
    setChannelCreatedPromptId(channelId);
    return channelId;
  };

  const updateChannel = (channelId: string, data: NewChannelData) => {
    setChannels(prev => prev.map(c => {
      if (c.id !== channelId) return c;
      // 只有档位设置（价格/是否下架/档位数量）真的变了才刷新冷却计时；
      // 单纯改频道名称、简介不受 30 天限制、不重置冷却
      const tiersSignature = (tiers: typeof data.tiers) => JSON.stringify(tiers.map(tr => [tr.id, tr.price, !!tr.archived]));
      const tiersChanged = tiersSignature(c.tiers) !== tiersSignature(data.tiers);
      return {
        ...c,
        name: data.name,
        description: data.description,
        category: data.category,
        tiers: withFreeTier(data.tiers),
        tiersChangedAt: tiersChanged ? Date.now() : c.tiersChangedAt,
      };
    }));
    showToast(t('频道信息已更新'));
  };

  // 开发工具：清空档位设置 30 天冷却期的记录时间，便于演示/测试
  const resetChannelTierCooldown = (channelId: string) => {
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, tiersChangedAt: undefined } : c));
    showToast(t('已重置档位设置冷却期'));
  };

  const openChannelSubscribe = (channelId: string, requiredTierIndex?: number) => {
    requireWallet(() => {
      setChannelSubscribeRequiredTier(requiredTierIndex);
      setChannelSubscribeId(channelId);
    });
  };

  const subscribeToChannelTier = (channelId: string, tierIndex: number) => {
    const wasExpired = expiredChannelIds.has(channelId);
    const isNewSubscriber = subscribedChannelTiers[channelId] == null || wasExpired;
    setSubscribedChannelTiers(prev => ({ ...prev, [channelId]: tierIndex }));
    if (wasExpired) {
      setExpiredChannelIds(prev => {
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });
    }
    setChannels(prev => prev.map(c => c.id === channelId && isNewSubscriber
      ? { ...c, subscriberCount: c.subscriberCount + 1 }
      : c));
    const channel = channels.find(c => c.id === channelId);
    const tierName = channel?.tiers[tierIndex]?.name ?? '';
    showToast(wasExpired
      ? t('续费成功！已恢复「{tierName}」专属内容访问权限', { tierName })
      : t('订阅成功！已解锁「{tierName}」专属内容', { tierName }));
  };

  // ── 小黄车：收货地址 + 订单 ──────────────────────────────────────
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>(MOCK_SHIPPING_ADDRESSES);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>(MOCK_SHOP_ORDERS);
  const [knowledgeCerts, setKnowledgeCerts] = useState<KnowledgeCert[]>(MOCK_KNOWLEDGE_CERTS);

  const defaultAddress = shippingAddresses.find(a => a.isDefault) ?? shippingAddresses[0] ?? null;

  const addShippingAddress = (data: Omit<ShippingAddress, 'id'>): ShippingAddress => {
    const addr: ShippingAddress = { ...data, id: `addr-${Date.now()}` };
    setShippingAddresses(prev => {
      // 若新地址设为默认，其余取消默认
      const next = addr.isDefault ? prev.map(a => ({ ...a, isDefault: false })) : [...prev];
      return [...next, addr];
    });
    return addr;
  };

  const setDefaultAddress = (addressId: string) => {
    setShippingAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === addressId })));
  };

  const updateShippingAddress = (addressId: string, data: Omit<ShippingAddress, 'id'>) => {
    setShippingAddresses(prev => prev.map(a => {
      if (a.id === addressId) return { ...a, ...data };
      return data.isDefault ? { ...a, isDefault: false } : a;
    }));
  };

  const removeShippingAddress = (addressId: string) => {
    setShippingAddresses(prev => {
      const filtered = prev.filter(a => a.id !== addressId);
      if (filtered.length === 0) return [];
      const deleted = prev.find(a => a.id === addressId);
      if (deleted?.isDefault) {
        return filtered.map((a, i) => ({ ...a, isDefault: i === 0 }));
      }
      return filtered;
    });
  };

  // 下单第 2 步：链上确认通过 → 扣款、减库存、订单转「待发货」，toast 通知
  const confirmShopOrder = (order: ShopOrder) => {
    const totalPb = order.unitPrice * order.quantity;
    const totalSup = Math.round(order.unitFee * order.quantity * 10000) / 10000;
    const wallet = order.payWallet ?? 'airdrop';
    if (!payPb({ amount: totalPb, use: 'purchase', wallet, supCost: totalSup, supReason: 'purchase' })) {
      failShopOrder(order.id);
      return;
    }
    setPosts(ps => ps.map(p => {
      if (p.id !== order.postId || !p.shop) return p;
      const shop = p.shop;
      if (order.variantId && shop.variants?.length) {
        return {
          ...p,
          shop: {
            ...shop,
            variants: shop.variants.map(v =>
              v.id === order.variantId
                ? { ...v, stock: Math.max(0, v.stock - order.quantity) }
                : v
            ),
          },
        };
      }
      return { ...p, shop: { ...shop, stock: Math.max(0, (shop.stock ?? 0) - order.quantity) } };
    }));
    setShopOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'to_ship' } : o));
    showToast(t('订单已确认，已扣 {pb} PB', { pb: formatTokenAmount(totalPb) }));
  };

  // 下单第 2 步（失败分支）：链上确认未通过 → 订单置「已取消」保留记录，未扣款、库存不变，toast 通知
  const failShopOrder = (orderId: string) => {
    setShopOrders(prev => prev.map(o => o.id === orderId && o.status === 'submitting' ? { ...o, status: 'failed' } : o));
    showToast(t('订单确认失败，商品款未扣除'));
  };

  // 买家下单：先创建「确认中」订单（不扣款、不减库存）并立即返回，
  // 链上确认在后台异步完成——计时器挂在 App 层，用户关闭商品页/离开也不中断。
  const placeShopOrder = (postId: string, quantity: number, address: ShippingAddress, variantId?: string, payWallet?: PbWalletId) => {
    const post = posts.find(p => p.id === postId);
    if (!post?.shop) return;
    const variant = getShopVariant(post.shop, variantId);
    if (!variant || variant.stock < quantity) return;
    const { rebatePercent } = post.shop;
    const price = variant.price;
    const unitFee = Math.round(price * 0.0001 * 10000) / 10000;
    const order: ShopOrder = {
      id: `ord-${Date.now()}`,
      postId,
      productTitle: post.title.split('\n')[0].slice(0, 40),
      productKind: post.kind,
      sellerName: post.author,
      buyerName: CURRENT_USER,
      unitPrice: price,
      unitFee,
      quantity,
      rebatePercent,
      address,
      status: 'submitting',
      createdAt: Date.now(),
      estMerit: computeUnitMerit(price, rebatePercent) * quantity,
      variantId: isMultiVariantShop(post.shop) ? variant.id : undefined,
      variantLabel: isMultiVariantShop(post.shop) ? variant.label : undefined,
      payWallet,
    };
    setShopOrders(prev => [order, ...prev]);
    // 后台模拟链上确认（演示用 ~6s；真实可能数分钟）：约 12% 概率失败
    setTimeout(() => {
      if (Math.random() < 0.12) failShopOrder(order.id);
      else confirmShopOrder(order);
    }, 6000);
    return order;
  };

  // 卖家发货：填物流公司 + 快递单号
  const shipShopOrder = (orderId: string, carrier: string, trackingNo: string) => {
    setShopOrders(prev => prev.map(o => o.id === orderId
      ? { ...o, status: 'shipped', carrier, trackingNo }
      : o));
    showToast(t('已发货'));
  };

  // 买家确认收货 → 已完成，标注次月 15 日结算
  const confirmShopReceipt = (orderId: string) => {
    setShopOrders(prev => prev.map(o => o.id === orderId
      ? { ...o, status: 'to_settle' }
      : o));
    showToast(t('已确认收货，货款将于次月 15 日结算给卖家'));
  };

  // 开发工具：把待结算订单推进到已结算（演示 T+15 月结到账）
  const simulateShopSettle = (orderId: string) => {
    setShopOrders(prev => prev.map(o => o.id === orderId
      ? { ...o, status: 'settled' }
      : o));
    showToast(t('已结算'));
  };

  // 开发工具：模拟 cron 完成铸造（pending → minted）
  const simulateCertMint = (certId: string) => {
    setKnowledgeCerts(prev => prev.map(c => c.id === certId
      ? {
          ...c,
          status: 'minted',
          issuedAt: Date.now(),
          tokenId: c.tokenId ?? String(Math.floor(Math.random() * 1e17)).padStart(17, '0'),
          txHash: c.txHash ?? `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        }
      : c));
    showToast(t('已确权'));
  };

  // 开发工具：模拟人工判定刷赞后回收（minted → burned）
  const simulateCertBurn = (certId: string, reason: string) => {
    setKnowledgeCerts(prev => prev.map(c => c.id === certId
      ? { ...c, status: 'burned', burnedAt: Date.now(), burnReason: reason }
      : c));
    showToast(t('已回收'));
  };

  const handlePaySuccess = () => {
    if (!paySheet) return;
    const { ctx, postId } = paySheet;
    setPaySheet(null);
    if (ctx === 'chain' && postId) {
      performLink(postId);
    } else if (ctx === 'post') {
      if (pendingNewPost) {
        const newPost: Post = {
          id: `p-${Date.now()}`,
          author: CURRENT_USER,
          time: t('刚刚'),
          title: pendingNewPost.title,
          kind: pendingNewPost.kind,
          articleHasCover: pendingNewPost.articleHasCover,
          imageCount: pendingNewPost.imageCount,
          visiblePercent: pendingNewPost.visiblePercent,
          isNode: true,
          stakeTier: pendingNewPost.stakeTier,
          nodeId: Math.random().toString(36).slice(2, 8).toUpperCase(),
          channelId: pendingNewPost.channelId,
          displayAuthorName: resolveDelegatedDisplayAuthor(pendingNewPost.channelId),
          minTierIndex: pendingNewPost.minTierIndex,
          shop: pendingNewPost.shop,
          rating: 0,
          replies: 0,
          links: 0,
          shares: 0,
          saves: 0,
          likes: 0,
        };
        setPosts(prev => [newPost, ...prev]);
        setPendingNewPost(null);
      }
      setComposeOpen(false);
      setComposeDraftId(null);
      showToast(t('发布成功！知识宇宙节点已生成'));
    } else if (ctx === 'repost') {
      showToast(t('转发成功！子节点已创建'));
    } else if (ctx === 'interaction') {
      if (paySheet.action === 'partner' && postId) {
        // 合伙人不设次数上限：每次质押都单独计一次链接，可反复质押、反复计分成权重
        setLinkedPostIds(s => new Set(s).add(postId));
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, links: p.links + 1, visiblePercent: 100 } : p
        ));
        if (pendingPartnerCommentRef.current?.postId === postId) {
          appendPostReply(postId, pendingPartnerCommentRef.current.text);
          pendingPartnerCommentRef.current = null;
        }
        showToast(t('已加入合伙人'));
      } else {
        showToast(t('子节点已创建'));
      }
    }
    pendingPaySuccessRef.current?.();
    pendingPaySuccessRef.current = null;
  };

  const unreadActivityCount = activityGroups.filter(g => !g.isRead).length;
  const markAllRead = useCallback(() => setActivityGroups(gs => gs.map(g => ({ ...g, isRead: true }))), []);
  const saveRecentSearch = useCallback((query: string) => {
    const normalized = query.trim();
    if (!normalized) return;
    setRecentSearches(previous => {
      const deduped = previous.filter(item => item !== normalized);
      return [normalized, ...deduped].slice(0, 8);
    });
  }, []);
  const removeRecentSearch = (query: string) => {
    setRecentSearches(previous => previous.filter(item => item !== query));
  };
  const clearRecentSearches = () => setRecentSearches([]);

  const isOwnProfile = pageRoute.page === 'P6' && pageRoute.authorName === CURRENT_USER;
  const showBottomNav = pageRoute.page === 'P0' || pageRoute.page === 'P_PLANET' || pageRoute.page === 'P7' || pageRoute.page === 'P_DM' || pageRoute.page === 'P_SHOP' || isOwnProfile;

  const [composeDraftId, setComposeDraftId] = useState<string | null>(null);
  const [pendingNewPost, setPendingNewPost] = useState<NewPostData | null>(null);

  const openCompose = () => {
    requireWallet(() => { setComposeDraftId(null); setComposeOpen(true); });
  };
  const openComposeWithDraft = (draft: Draft) => {
    requireWallet(() => {
      setComposeDraftId(draft.id);
      setComposeOpen(true);
    });
  };

  const openImageLightbox = (post: Post, imgIdx: number, visibleImgCount: number) => setImageLightbox({ post, imgIdx, visibleImgCount });
  const openArticleReader = (post: Post) => setArticleReaderPost(post);
  const openVideoPlayer = (post: Post) => setVideoPlayerPost(post);

  const saveDraft = useCallback((data: Omit<Draft, 'id' | 'savedAt'>) => {
    const draft: Draft = {
      ...data,
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      savedAt: Date.now(),
    };
    setDrafts(prev => [draft, ...prev]);
  }, []);

  const updateDraft = useCallback((draftId: string, data: Omit<Draft, 'id' | 'savedAt'>) => {
    setDrafts(prev => prev.map(d => d.id === draftId ? { ...data, id: draftId, savedAt: Date.now() } : d));
  }, []);

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  }, []);

  const stagePendingPost = (data: NewPostData) => {
    setPendingNewPost(data);
  };

  const publishPost = (data: NewPostData) => {
    const newPost: Post = {
      id: `p-${Date.now()}`,
      author: CURRENT_USER,
      time: t('刚刚'),
      title: data.title,
      kind: data.kind,
      articleHasCover: data.articleHasCover,
      imageCount: data.imageCount,
      visiblePercent: data.isNode ? data.visiblePercent : 100,
      isNode: data.isNode,
      stakeTier: data.stakeTier,
      nodeId: data.isNode ? Math.random().toString(36).slice(2, 8).toUpperCase() : undefined,
      channelId: data.channelId,
      displayAuthorName: resolveDelegatedDisplayAuthor(data.channelId),
      minTierIndex: data.minTierIndex,
      shop: data.shop,
      scheduledAt: data.scheduledAt,
      rating: 0,
      replies: 0,
      links: 0,
      shares: 0,
      saves: 0,
      likes: 0,
    };
    setPosts(prev => [newPost, ...prev]);
    setComposeOpen(false);
    setComposeDraftId(null);
    recordTaskPosted();
    if (data.scheduledAt) {
      showToast(t('定时发布已设置，{time} 后自动展示', { time: formatScheduledAt(data.scheduledAt) }));
    } else {
      showToast(data.isNode
        ? t('发布成功！知识宇宙节点已生成')
        : t('发布成功！帖子已公开')
      );
    }
  };

  const ctx: AppContextValue = {
    navigate, navigateRoot, goBack, canGoBack: stack.length > 1, openCompose, openComposeWithDraft, showToast, openLink, openPay, openImageLightbox,
    linkedPostIds, followedAuthors, toggleFollow,
    language, setLanguage, t,
    posts, homeFeedRefreshNonce, refreshHomeFeed, repostedPostIds, likedPostIds, savedPostIds, dislikedPostIds, togglePostAction,
    outgoingTips, recordOutgoingTip,
    requestPostInteraction, beginPaidInteraction,
    deletePost, requestDeletePost,
    openEditPost, updatePost, incrementReplies, decrementReplies, appendPostReply, extraRepliesByPostId,
    stagePendingPost, publishPost,
    openArticleReader, openVideoPlayer,
    activityGroups, unreadActivityCount, markAllRead,
    interactionTaskOpen, openInteractionTask, interactionTaskAlert,
    lotTaskOpen, openLotTask, lotTaskAlert,
    recentSearches, saveRecentSearch, removeRecentSearch, clearRecentSearches,
    searchOpen, openSearch, closeSearch,
    drafts, saveDraft, updateDraft, deleteDraft,
    userProfile, updateUserProfile,
    editProfileAutoOpen, setEditProfileAutoOpen, openEditProfileContacts,
    nodeTransferAutoOpenId, setNodeTransferAutoOpenId,
    channels: visibleChannels, subscribedChannelTiers, expiredChannelIds,
    openChannelSubscribe, subscribeToChannelTier,
    createChannel, updateChannel, resetChannelTierCooldown,
    openCreateChannel, createChannelOpen, closeCreateChannel,
    openManageChannel, closeManageChannel,
    demoHideOwnChannels, toggleDemoHideOwnChannels,
    supWallets, supBalance, supHistory, deductSup, meritBalance: MOCK_MERIT_BALANCE,
    depositAirdropPb, withdrawAirdropPb, depositSiteSup, withdrawSiteSup,
    walletConnected, connectWallet, requireWallet,
    walletAddress, walletConnecting, disconnectWallet,
    pbWallets, pbBalance, getPbWalletOptions, pickDefaultPbWallet, payPb, setDemoPbWallets, myInviteCode: MOCK_MY_INVITE_CODE, inviterAddress, bindInviter,
    addressMigrations, requestAddressMigration, cancelAddressMigration, dismissMigrationReminder,
    channelAuthorizations, requestChannelAuthorization, respondToChannelAuthorization, revokeChannelAuthorization,
    delegatedChannels, pendingIncomingChannelAuthorizations,
    airdropClaimed, claimAirdrop,
    taskSnapshotToday, taskSnapshotYesterday, airdropClaimRatio, airdropRatioLadderActive, lotQuota,
    taskCelebrateSignal, recordTaskInteraction, getDailyTaskCalendar: () => getTaskCalendarMonth(new Date(), lotQuota.interactions),
    resetDemoTasks, simulateDemoTaskInteractions,
    demoForceLadder, toggleDemoForceLadder, demoForceNewUser, toggleDemoForceNewUser,
    demoFiveStarNodeCount, cycleDemoFiveStarNodeCount,
    favoriteNodeIds, toggleFavoriteNode,
    shopOrders, shippingAddresses, defaultAddress,
    addShippingAddress, setDefaultAddress, removeShippingAddress, updateShippingAddress,
    placeShopOrder, shipShopOrder, confirmShopReceipt, simulateShopSettle,
    knowledgeCerts, simulateCertMint, simulateCertBurn,
    navBarsHidden, setNavBarsHidden,
  };


  return (
    <AppProvider value={ctx}>
      <div className="phone-shell" data-layer="knowledge-feed-page">
        <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="cert-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--ku-cert-gold-shine)" />
              <stop offset="42%" stopColor="var(--ku-cert-gold)" />
              <stop offset="72%" stopColor="var(--ku-cert-gold-strong)" />
              <stop offset="100%" stopColor="var(--ku-cert-gold)" />
            </linearGradient>
          </defs>
        </svg>
        {/* 页面主体 */}
        {pageRoute.page === 'P0' && <FeedPage tab={tab} setTab={setTab} />}
        {pageRoute.page === 'P2' && <PostDetailPage postId={pageRoute.postId} scrollToComments={pageRoute.scrollToComments} />}
        {pageRoute.page === 'P6' && <ProfilePage authorName={pageRoute.authorName} />}
        {pageRoute.page === 'P_CHANNEL' && <ChannelPage channelId={pageRoute.channelId} />}
        {pageRoute.page === 'P_NODE' && <NodeDetailPage node={pageRoute.node} />}
        {pageRoute.page === 'P7' && <ActivityPage />}
        {pageRoute.page === 'P_PLANET' && <KnowledgePlanetPage initialSearch={pageRoute.searchNodeCode} openBsp={pageRoute.openBsp} />}
        {pageRoute.page === 'P_DM' && <DmListPage />}
        {pageRoute.page === 'P_DM_CHAT' && <DmChatPage peerId={pageRoute.peerId} />}
        {pageRoute.page === 'P_SHOP' && <ShopPage />}
        {pageRoute.page === 'P_ORDERS' && <OrdersPage initialRole={pageRoute.role} />}
        {pageRoute.page === 'P_CERTS' && <CertsPage />}

        {/* 码库全局底部导航（知识宇宙内始终保持同一套宿主导航）*/}
        {showBottomNav && <BottomNav route={pageRoute} setTab={setTab} />}

        {/* 覆盖层：商品详情弹窗 */}
        {shopItemOpen && (
          <ShopItemPage postId={route.postId} onClose={goBack} />
        )}

        {/* 覆盖层：认证详情弹窗 */}
        {certOpen && (
          <div className="sheet-backdrop cert-detail-backdrop" onClick={goBack}>
            <div className="payment-sheet" role="dialog" aria-modal="true" aria-label={t('认证详情')} onClick={e => e.stopPropagation()}>
              <CertDetailPage certId={route.certId} onClose={goBack} />
            </div>
          </div>
        )}

        {/* 覆盖层：发帖居中弹窗 */}
        {composeOpen && (
          <div className="sheet-backdrop" onClick={() => composeCloseHandler.current()}>
            <div className="compose-modal" role="dialog" aria-modal="true" aria-label={t('发帖')} onClick={e => e.stopPropagation()}>
              <ComposePage
                onClose={() => { setComposeOpen(false); setComposeDraftId(null); }}
                onRegisterCloseHandler={handler => { composeCloseHandler.current = handler; }}
                draft={composeDraftId ? drafts.find(d => d.id === composeDraftId) ?? null : null}
              />
            </div>
          </div>
        )}

        {/* 覆盖层：编辑帖子弹窗 */}
        {editPostId && (() => {
          const editPost = posts.find(p => p.id === editPostId);
          return editPost ? (
            <div className="sheet-backdrop" onClick={() => editComposeCloseHandler.current()}>
              <div className="compose-modal" role="dialog" aria-modal="true" aria-label={t('编辑帖子')} onClick={e => e.stopPropagation()}>
                <ComposePage
                  onClose={() => setEditPostId(null)}
                  onRegisterCloseHandler={handler => { editComposeCloseHandler.current = handler; }}
                  editPost={editPost}
                />
              </div>
            </div>
          ) : null;
        })()}

        {/* 覆盖层：P1.x 支付浮层 */}
        {paySheet && (
          <PaymentSheet
            payCtx={paySheet}
            onSuccess={handlePaySuccess}
            onClose={() => {
              setPaySheet(null);
              pendingPaySuccessRef.current = null;
              pendingPartnerCommentRef.current = null;
            }}
          />
        )}

        {stakeModal && (() => {
          const stakePost = posts.find(p => p.id === stakeModal.postId);
          if (!stakePost) return null;
          return (
            <GeminiStakeModal
              post={stakePost}
              mode={stakeModal.mode ?? (stakeModal.action === 'partner' ? 'partner' : 'default')}
              presetComment={stakeModal.presetComment}
              onClose={() => setStakeModal(null)}
              onSkip={() => { stakeModal.onSkip(); setStakeModal(null); }}
              onParticipate={(tier, commentText) => {
                const { postId, action, onAfterPay } = stakeModal;
                setStakeModal(null);
                if (action === 'partner' && commentText) {
                  pendingPartnerCommentRef.current = { postId, text: commentText };
                }
                pendingPaySuccessRef.current = onAfterPay;
                setPaySheet({ ctx: 'interaction', postId, action, stakeTier: tier });
              }}
            />
          );
        })()}

        {/* 覆盖层：删除确认弹窗 */}
        {confirmDelete && (
          <ConfirmDeleteModal
            postId={confirmDelete.postId}
            onConfirm={handleConfirmDelete}
            onCancel={() => setConfirmDelete(null)}
          />
        )}

        {/* 覆盖层：取消关注确认弹窗 */}
        {confirmUnfollow && (
          <ConfirmUnfollowModal
            author={confirmUnfollow}
            onConfirm={handleConfirmUnfollow}
            onCancel={() => setConfirmUnfollow(null)}
          />
        )}

        {/* 覆盖层：图片查看器 */}
        {imageLightbox && (
          <ImageLightbox
            post={imageLightbox.post}
            initialIndex={imageLightbox.imgIdx}
            visibleImgCount={imageLightbox.visibleImgCount}
            onClose={() => setImageLightbox(null)}
          />
        )}

        {/* 覆盖层：文章阅读器 */}
        {articleReaderPost && (
          <ArticleReader
            post={articleReaderPost}
            onClose={() => setArticleReaderPost(null)}
          />
        )}

        {/* 覆盖层：视频播放器 */}
        {videoPlayerPost && (
          <VideoPlayer
            post={videoPlayerPost}
            onClose={() => setVideoPlayerPost(null)}
          />
        )}

        {/* 覆盖层：链接面额选择 */}
        {linkSheet && (() => {
          const linkPost = posts.find(p => p.id === linkSheet.postId);
          if (!linkPost) return null;
          return (
            <LinkSheet
              post={linkPost}
              mode={linkSheet.mode}
              onSuccess={() => {
                const id = linkSheet.postId;
                setLinkSheet(null);
                performLink(id);
              }}
              onClose={() => setLinkSheet(null)}
            />
          );
        })()}

        {/* 覆盖层：开通频道 */}
        {createChannelOpen && (
          <CreateChannelModal onClose={closeCreateChannel} />
        )}

        {/* 覆盖层：管理频道 */}
        {manageChannelId && (() => {
          const channel = channels.find(c => c.id === manageChannelId);
          if (!channel) return null;
          return <CreateChannelModal existingChannel={channel} onClose={closeManageChannel} />;
        })()}

        {/* 覆盖层：开通成功 → 引导设置会员档位（代开通场景付款人不是频道主，不引导设置档位） */}
        {channelCreatedPromptId && (() => {
          const createdChannel = channels.find(c => c.id === channelCreatedPromptId);
          return (
            <ChannelCreatedSuccessModal
              ownerName={createdChannel?.payerName ? createdChannel.ownerName : undefined}
              onSetTiers={() => {
                openManageChannel(channelCreatedPromptId);
                setChannelCreatedPromptId(null);
              }}
              onDismiss={() => setChannelCreatedPromptId(null)}
            />
          );
        })()}

        {/* 覆盖层：频道订阅（多档选择） */}
        {channelSubscribeId && (
          <ChannelSubscribeModal
            channelId={channelSubscribeId}
            requiredTierIndex={channelSubscribeRequiredTier}
            onClose={() => setChannelSubscribeId(null)}
          />
        )}

        {/* 覆盖层：互动帖任务（决定明天的空投领取比例） */}
        {interactionTaskOpen && <InteractionTaskSheet onClose={() => setInteractionTaskOpen(false)} />}

        {/* 覆盖层：公信力任务（发帖 + 公信力任务，决定今天的公信力奖励） */}
        {lotTaskOpen && (
          <LotTaskSheet onClose={() => setLotTaskOpen(false)} />
        )}

        {/* 搜索全页面：覆盖宿主内容，关闭后回到原信息流 */}
        {searchOpen && <SearchPage onClose={closeSearch} />}

        {/* Toast */}
        {/* 覆盖层：连接钱包二次确认（游客触发需身份/资产/链上能力的操作时弹出） */}
        {showConnectWallet && (
          <ConnectWalletModal
            onConnect={connectWallet}
            onClose={() => { setShowConnectWallet(false); pendingWalletActionRef.current = null; }}
          />
        )}

        {toastMsg && <Toast msg={toastMsg.msg} type={toastMsg.type} />}

        {/* 任务里程碑庆祝：每完成 5 篇互动帖就地放烟花（在信息流动作现场触发） */}
        <TaskCelebrationOverlay />

      </div>
    </AppProvider>
  );
}
