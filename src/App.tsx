import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppProvider } from './AppContext';
import type { AppContextValue } from './AppContext';
import { ACTIVITY_GROUPS, ALL_CHANNELS, ALL_POSTS, AVATAR_PRESET_SEEDS, CURRENT_USER, DEFAULT_WALLET_DISPLAY, MOCK_MY_INVITE_CODE, MOCK_OUTGOING_TIPS, MOCK_PB_AIRDROP_AMOUNT, MOCK_SHIPPING_ADDRESSES, MOCK_SHOP_ORDERS, MOCK_WALLET_ADDRESS, MOCK_WALLET_PB_BALANCE, MOCK_WALLET_SUP_BALANCE, getAirdropDeadline, resolveInviterAddress } from './mockData';
import type { Channel, Draft, InteractionAction, Language, NewChannelData, NewPostData, OutgoingTip, PayCtx, PbTransactionReason, Post, PostAction, Route, ShippingAddress, ShopOrder, StakeModalRequest, SupTransaction, SupTransactionReason, UserProfile } from './types';
import { computeUnitMerit } from './shopConfig';
import { postHasStake, formatTokenAmount } from './stakeConfig';
import { translate } from './locales';
import { isChinese } from './i18n';
import { BottomNav } from './components/BottomNav';
import { ArticleReader, ChannelCreatedSuccessModal, ChannelSubscribeModal, CheckInModal, ConfirmDeleteModal, ConfirmUnfollowModal, ConnectWalletModal, CreateChannelModal, GeminiStakeModal, ImageLightbox, LinkSheet, PaymentSheet, VideoPlayer } from './components/Overlays';
import { commitClaim, getClaimPreview, CHECK_IN_REWARD, type ClaimPreview } from './checkInConfig';
import { getTaskSnapshot, getYesterdaySnapshot, markInteracted, markPosted, resetTasks, simulateInteractedCount, TASK_CELEBRATE_EVERY, type TaskDaySnapshot } from './taskConfig';
import { Toast } from './components/shared';
import { TaskCelebrationOverlay } from './components/TaskCelebrationOverlay';
import { ComposePage } from './pages/ComposePage';
import { FeedPage } from './pages/FeedPage';
import { KnowledgePlanetPage } from './pages/KnowledgePlanetPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { ChannelPage } from './pages/ChannelPage';
import { ActivityPage } from './pages/ActivityPage';
import { DmListPage, DmChatPage } from './pages/DmPage';
import { SearchPage } from './pages/SearchPage';
import { ShopPage } from './pages/ShopPage';
import { ShopItemPage } from './pages/ShopItemPage';
import { OrdersPage } from './pages/OrdersPage';


export default function App() {
  const [stack, setStack] = useState<Route[]>([{ page: 'P0', tab: 0 }]);
  const [composeOpen, setComposeOpen] = useState(false);
  const composeCloseHandler = useRef<() => void>(() => {});
  const editComposeCloseHandler = useRef<() => void>(() => {});
  const [linkedPostIds, setLinkedPostIds] = useState<Set<string>>(new Set());
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
  const pendingWalletActionRef = useRef<(() => void) | null>(null);

  const [language, setLanguage] = useState<Language>('zh-CN');
  const [confirmDelete, setConfirmDelete] = useState<{ postId: string; onAfterDelete?: () => void } | null>(null);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [confirmUnfollow, setConfirmUnfollow] = useState<string | null>(null);
  const [imageLightbox, setImageLightbox] = useState<{ post: Post; imgIdx: number; visibleImgCount: number } | null>(null);
  const [articleReaderPost, setArticleReaderPost] = useState<Post | null>(null);
  const [videoPlayerPost, setVideoPlayerPost] = useState<Post | null>(null);
  const [activityGroups, setActivityGroups] = useState(ACTIVITY_GROUPS);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [checkInPreview, setCheckInPreview] = useState<ClaimPreview | null>(null);
  const [checkInClaimable, setCheckInClaimable] = useState(false);

  // 演示默认使用已连接的钱包；断开后仍可作为游客浏览帖子。
  const [walletConnected, setWalletConnected] = useState(true);
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  // 知识宇宙页用的钱包地址态，与 walletConnected 同步维护，供该页头部的钱包 chip 展示
  const [walletAddress, setWalletAddress] = useState<string | null>(MOCK_WALLET_ADDRESS);
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
      setWalletAddress(MOCK_WALLET_ADDRESS);
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
  const [pbBalance, setPbBalance] = useState(MOCK_WALLET_PB_BALANCE);
  const [inviterAddress, setInviterAddress] = useState<string | null>(null);
  const [airdropClaimed, setAirdropClaimed] = useState(false);

  // 每日任务（发帖任务 + 互动帖任务）：今天的完成度决定明天可领取空投收益的比例
  const [taskSnapshotToday, setTaskSnapshotToday] = useState<TaskDaySnapshot>(() => getTaskSnapshot());
  const [taskSnapshotYesterday] = useState<TaskDaySnapshot>(() => getYesterdaySnapshot());
  // 每完成 N 篇互动帖 +1，供任务面板监听触发一次性庆祝动效
  const [taskCelebrateSignal, setTaskCelebrateSignal] = useState(0);

  const recordTaskInteraction = (postId: string) => {
    const { state, added } = markInteracted(postId);
    setTaskSnapshotToday(getTaskSnapshot());
    if (added && state.interactedPostIds.length > 0 && state.interactedPostIds.length % TASK_CELEBRATE_EVERY === 0) {
      setTaskCelebrateSignal(s => s + 1);
    }
  };

  const recordTaskPosted = () => {
    markPosted();
    setTaskSnapshotToday(getTaskSnapshot());
  };

  // 开发工具：重置今日任务记录，便于重新体验任务面板
  const resetDemoTasks = () => {
    resetTasks();
    setTaskSnapshotToday(getTaskSnapshot());
  };

  // 开发工具：直接模拟今日互动帖完成数（无需真的操作 35 篇帖子即可预览阶梯比例与庆祝动效）
  const simulateDemoTaskInteractions = (count: number) => {
    simulateInteractedCount(count);
    setTaskSnapshotToday(getTaskSnapshot());
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
    // 可领取金额取决于昨日任务（发帖任务 + 互动帖任务）完成度对应的比例
    const claimedAmount = Math.round(MOCK_PB_AIRDROP_AMOUNT * taskSnapshotYesterday.claimRatio / 100);
    setPbBalance(prev => prev + claimedAmount);
    setAirdropClaimed(true);
    showToast(t('领取成功，+{MOCK_PB_AIRDROP_AMOUNT} PB', { MOCK_PB_AIRDROP_AMOUNT: claimedAmount }));
  };

  const deductPb = (amount: number, _reason: PbTransactionReason) => {
    setPbBalance(b => Math.max(0, b - amount));
  };

  const [supBalance, setSupBalance] = useState(MOCK_WALLET_SUP_BALANCE);
  const INITIAL_SUP_HISTORY: SupTransaction[] = [
    { id: 's1', direction: 'in', amount: 10, time: '2026-06-01 09:00', reason: 'recharge' },
    { id: 's2', direction: 'in', amount: 3.1, time: '2026-06-12 16:20', reason: 'recharge' },
    { id: 's3', direction: 'out', amount: 0.1, time: '2026-06-20 10:15', reason: 'channel_open' },
  ];
  const [supHistory, setSupHistory] = useState<SupTransaction[]>(INITIAL_SUP_HISTORY);

  const appendSupTransaction = (tx: Omit<SupTransaction, 'id' | 'time'> & { time?: string }) => {
    const time = tx.time ?? new Date().toISOString().slice(0, 16).replace('T', ' ');
    setSupHistory(prev => [{ ...tx, id: `s${Date.now()}`, time }, ...prev]);
  };

  const deductSup = (amount: number, reason: SupTransactionReason) => {
    setSupBalance(b => Math.max(0, b - amount));
    appendSupTransaction({ direction: 'out', amount, reason });
  };

  const [channels, setChannels] = useState<Channel[]>(ALL_CHANNELS);
  // 开发工具：模拟「当前用户尚未创建任何频道」；默认关闭（原型自带 5 个自有频道）
  const [demoHideOwnChannels, setDemoHideOwnChannels] = useState(false);
  const visibleChannels = useMemo(
    () => (demoHideOwnChannels ? channels.filter(c => c.ownerName !== CURRENT_USER) : channels),
    [channels, demoHideOwnChannels],
  );
  const toggleDemoHideOwnChannels = useCallback(() => {
    setDemoHideOwnChannels(prev => !prev);
  }, []);
  const [subscribedChannelTiers, setSubscribedChannelTiers] = useState<Record<string, number>>({});
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [manageChannelId, setManageChannelId] = useState<string | null>(null);
  const [channelCreatedPromptId, setChannelCreatedPromptId] = useState<string | null>(null);
  const [channelSubscribeId, setChannelSubscribeId] = useState<string | null>(null);

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
      const saved = localStorage.getItem('ku-drafts');
      return saved ? JSON.parse(saved) : MOCK_DRAFTS;
    } catch { return MOCK_DRAFTS; }
  });

  useEffect(() => {
    localStorage.setItem('ku-drafts', JSON.stringify(drafts));
  }, [drafts]);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('ku-profile');
      const profile: UserProfile = saved
        ? JSON.parse(saved)
        : { nickname: DEFAULT_WALLET_DISPLAY, avatarSeed: AVATAR_PRESET_SEEDS[0] };
      // 旧演示人格「林知远」已废弃，统一落到钱包短名
      if (profile.nickname === '林知远') {
        profile.nickname = DEFAULT_WALLET_DISPLAY;
        localStorage.setItem('ku-profile', JSON.stringify(profile));
      }
      return profile;
    } catch { return { nickname: DEFAULT_WALLET_DISPLAY, avatarSeed: AVATAR_PRESET_SEEDS[0] }; }
  });

  const updateUserProfile = (profile: UserProfile) => {
    requireWallet(() => {
      setUserProfile(profile);
      localStorage.setItem('ku-profile', JSON.stringify(profile));
    });
  };

  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(language, key, params), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // 每天首次进入知识宇宙：弹出签到领取空投
  useEffect(() => {
    const preview = getClaimPreview();
    setCheckInClaimable(preview.shouldShow);
    if (preview.shouldShow) setCheckInPreview(preview);
  }, []);

  // 常驻入口：随时打开签到（已领取则展示连签进度）；未连接钱包时先引导连接
  const openCheckIn = () => {
    requireWallet(() => setCheckInPreview(getClaimPreview()));
  };

  const handleClaimCheckIn = () => {
    if (!checkInPreview) return;
    requireWallet(() => {
      commitClaim(checkInPreview);
      setCheckInClaimable(false);
      const symbol = isChinese(language) ? CHECK_IN_REWARD.symbol.zh : CHECK_IN_REWARD.symbol.en;
      showToast(t('领取成功！+{reward} {symbol}', { reward: checkInPreview.reward, symbol }));
    });
  };


  const route = stack[stack.length - 1];
  const shopItemOpen = route.page === 'P_SHOP_ITEM';
  const pageRoute = shopItemOpen && stack.length > 1 ? stack[stack.length - 2]! : route;
  const tab = pageRoute.page === 'P0' ? pageRoute.tab : 0;
  const navigate = (r: Route) => setStack(s => [...s, r]);
  const navigateRoot = (r: Route) => setStack([r]);
  const goBack = () => setStack(s => s.length > 1 ? s.slice(0, -1) : s);
  const setTab = (t: 0 | 1 | 2 | 3) => setStack(s => [...s.slice(0, -1), { page: 'P0', tab: t }]);

  const [posts, setPosts] = useState<Post[]>(ALL_POSTS.filter(p => p.kind !== 'article'));
  const [homeFeedRefreshNonce, setHomeFeedRefreshNonce] = useState(0);
  const refreshHomeFeed = useCallback(() => setHomeFeedRefreshNonce(n => n + 1), []);

  const showToast = (msg: string, type?: 'demo') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 2500);
  };

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
    const newChannel: Channel = {
      id: channelId,
      ownerName: CURRENT_USER,
      name: data.name,
      description: data.description,
      avatarSeed: userProfile.avatarSeed,
      category: data.category,
      tiers: data.tiers,
      subscriberCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
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
        tiers: data.tiers,
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

  const openChannelSubscribe = (channelId: string) => {
    requireWallet(() => setChannelSubscribeId(channelId));
  };

  const subscribeToChannelTier = (channelId: string, tierIndex: number) => {
    const isNewSubscriber = subscribedChannelTiers[channelId] == null;
    setSubscribedChannelTiers(prev => ({ ...prev, [channelId]: tierIndex }));
    setChannels(prev => prev.map(c => c.id === channelId && isNewSubscriber
      ? { ...c, subscriberCount: c.subscriberCount + 1 }
      : c));
    const channel = channels.find(c => c.id === channelId);
    const tierName = channel?.tiers[tierIndex]?.name ?? '';
    showToast(t('订阅成功！已解锁「{tierName}」专属内容', { tierName }));
  };

  const unsubscribeFromChannel = (channelId: string) => {
    setSubscribedChannelTiers(prev => {
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
    setChannels(prev => prev.map(c => c.id === channelId
      ? { ...c, subscriberCount: Math.max(0, c.subscriberCount - 1) }
      : c));
    showToast(t('已取消订阅'));
  };

  // ── 小黄车：收货地址 + 订单 ──────────────────────────────────────
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>(MOCK_SHIPPING_ADDRESSES);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>(MOCK_SHOP_ORDERS);

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
    deductPb(totalPb, 'purchase');
    if (totalSup > 0) deductSup(totalSup, 'purchase');
    setPosts(ps => ps.map(p => p.id === order.postId && p.shop
      ? { ...p, shop: { ...p.shop, stock: Math.max(0, p.shop.stock - order.quantity) } }
      : p));
    setShopOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'to_ship' } : o));
    showToast(t('订单已确认，已扣 {pb} PB', { pb: formatTokenAmount(totalPb) }));
  };

  // 下单第 2 步（失败分支）：链上确认未通过 → 撤销订单，未扣款、库存不变，toast 通知
  const failShopOrder = (orderId: string) => {
    setShopOrders(prev => prev.filter(o => !(o.id === orderId && o.status === 'submitting')));
    showToast(t('订单确认失败，商品款未扣除'));
  };

  // 买家下单：先创建「确认中」订单（不扣款、不减库存）并立即返回，
  // 链上确认在后台异步完成——计时器挂在 App 层，用户关闭商品页/离开也不中断。
  const placeShopOrder = (postId: string, quantity: number, address: ShippingAddress) => {
    const post = posts.find(p => p.id === postId);
    if (!post?.shop) return;
    const { price, rebatePercent } = post.shop;
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
      showToast(t('子节点已创建'));
    }
    pendingPaySuccessRef.current?.();
    pendingPaySuccessRef.current = null;
  };

  const unreadActivityCount = activityGroups.filter(g => !g.isRead).length;
  const markAllRead = useCallback(() => setActivityGroups(gs => gs.map(g => ({ ...g, isRead: true }))), []);
  const saveRecentSearch = (query: string) => {
    const normalized = query.trim();
    if (!normalized) return;
    setRecentSearches(previous => {
      const deduped = previous.filter(item => item !== normalized);
      return [normalized, ...deduped].slice(0, 8);
    });
  };
  const removeRecentSearch = (query: string) => {
    setRecentSearches(previous => previous.filter(item => item !== query));
  };
  const clearRecentSearches = () => setRecentSearches([]);

  const isOwnProfile = pageRoute.page === 'P6' && pageRoute.authorName === CURRENT_USER;
  const showBottomNav = pageRoute.page === 'P0' || pageRoute.page === 'P_PLANET' || pageRoute.page === 'P_SEARCH' || pageRoute.page === 'P7' || pageRoute.page === 'P_DM' || pageRoute.page === 'P_SHOP' || isOwnProfile;

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
      minTierIndex: data.minTierIndex,
      shop: data.shop,
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
    showToast(data.isNode
      ? t('发布成功！知识宇宙节点已生成')
      : t('发布成功！帖子已公开')
    );
  };

  const ctx: AppContextValue = {
    navigate, navigateRoot, goBack, canGoBack: stack.length > 1, openCompose, openComposeWithDraft, showToast, openLink, openPay, openImageLightbox,
    linkedPostIds, followedAuthors, toggleFollow,
    language, setLanguage, t,
    posts, homeFeedRefreshNonce, refreshHomeFeed, repostedPostIds, likedPostIds, savedPostIds, dislikedPostIds, togglePostAction,
    outgoingTips, recordOutgoingTip,
    requestPostInteraction, beginPaidInteraction,
    deletePost, requestDeletePost,
    openEditPost, updatePost, incrementReplies, decrementReplies,
    stagePendingPost, publishPost,
    openArticleReader, openVideoPlayer,
    activityGroups, unreadActivityCount, markAllRead,
    openCheckIn, checkInClaimable,
    recentSearches, saveRecentSearch, removeRecentSearch, clearRecentSearches,
    drafts, saveDraft, updateDraft, deleteDraft,
    userProfile, updateUserProfile,
    channels: visibleChannels, subscribedChannelTiers,
    openChannelSubscribe, subscribeToChannelTier, unsubscribeFromChannel,
    createChannel, updateChannel, resetChannelTierCooldown,
    openCreateChannel, createChannelOpen, closeCreateChannel,
    openManageChannel, closeManageChannel,
    demoHideOwnChannels, toggleDemoHideOwnChannels,
    supBalance, supHistory, deductSup,
    walletConnected, connectWallet, requireWallet,
    walletAddress, walletConnecting, disconnectWallet,
    pbBalance, deductPb, myInviteCode: MOCK_MY_INVITE_CODE, inviterAddress, bindInviter,
    airdropClaimed, claimAirdrop,
    taskSnapshotToday, taskSnapshotYesterday, taskCelebrateSignal,
    resetDemoTasks, simulateDemoTaskInteractions,
    shopOrders, shippingAddresses, defaultAddress,
    addShippingAddress, setDefaultAddress, removeShippingAddress,
    placeShopOrder, shipShopOrder, confirmShopReceipt, simulateShopSettle,
  };


  return (
    <AppProvider value={ctx}>
      <div className="phone-shell" data-layer="knowledge-feed-page">
        {/* 页面主体 */}
        {pageRoute.page === 'P0' && <FeedPage tab={tab} setTab={setTab} />}
        {pageRoute.page === 'P2' && <PostDetailPage postId={pageRoute.postId} scrollToComments={pageRoute.scrollToComments} />}
        {pageRoute.page === 'P6' && <ProfilePage authorName={pageRoute.authorName} />}
        {pageRoute.page === 'P_CHANNEL' && <ChannelPage channelId={pageRoute.channelId} />}
        {pageRoute.page === 'P7' && <ActivityPage />}
        {pageRoute.page === 'P_SEARCH' && <SearchPage />}
        {pageRoute.page === 'P_PLANET' && <KnowledgePlanetPage initialSearch={pageRoute.searchNodeCode} openBsp={pageRoute.openBsp} />}
        {pageRoute.page === 'P_DM' && <DmListPage />}
        {pageRoute.page === 'P_DM_CHAT' && <DmChatPage peerId={pageRoute.peerId} />}
        {pageRoute.page === 'P_SHOP' && <ShopPage />}
        {pageRoute.page === 'P_ORDERS' && <OrdersPage initialRole={pageRoute.role} />}

        {/* 码库全局底部导航（知识宇宙内始终保持同一套宿主导航）*/}
        {showBottomNav && <BottomNav route={pageRoute} setTab={setTab} />}

        {/* 覆盖层：商品详情弹窗 */}
        {shopItemOpen && (
          <ShopItemPage postId={route.postId} onClose={goBack} />
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
            }}
          />
        )}

        {stakeModal && (() => {
          const stakePost = posts.find(p => p.id === stakeModal.postId);
          if (!stakePost) return null;
          return (
            <GeminiStakeModal
              post={stakePost}
              onClose={() => setStakeModal(null)}
              onSkip={() => { stakeModal.onSkip(); setStakeModal(null); }}
              onParticipate={(tier) => {
                const { postId, action, onAfterPay } = stakeModal;
                setStakeModal(null);
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

        {/* 覆盖层：开通成功 → 引导设置会员档位 */}
        {channelCreatedPromptId && (
          <ChannelCreatedSuccessModal
            onSetTiers={() => {
              openManageChannel(channelCreatedPromptId);
              setChannelCreatedPromptId(null);
            }}
            onDismiss={() => setChannelCreatedPromptId(null)}
          />
        )}

        {/* 覆盖层：频道订阅（多档选择） */}
        {channelSubscribeId && (
          <ChannelSubscribeModal
            channelId={channelSubscribeId}
            onClose={() => setChannelSubscribeId(null)}
          />
        )}

        {/* 覆盖层：每日签到领取空投 */}
        {checkInPreview && (
          <CheckInModal
            preview={checkInPreview}
            onClaim={handleClaimCheckIn}
            onClose={() => setCheckInPreview(null)}
          />
        )}

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
