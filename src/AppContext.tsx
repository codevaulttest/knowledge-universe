import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { ActivityGroup, Channel, Draft, InteractionAction, Language, NewChannelData, NewPostData, OutgoingTip, PayCtx, PbUse, PbWalletId, Post, PostAction, Reply, Route, ShippingAddress, ShopOrder, StakeModalRequest, SupTransaction, SupTransactionReason, UserProfile } from './types';
import type { TaskCalendarDay, TaskDaySnapshot } from './taskConfig';

export type AppContextValue = {
  navigate: (route: Route) => void;
  navigateRoot: (route: Route) => void;
  goBack: () => void;
  canGoBack: boolean;
  openCompose: () => void;
  openComposeWithDraft: (draft: Draft) => void;
  showToast: (message: string, type?: 'demo') => void;
  openLink: (postId: string, mode?: 'link' | 'unlock') => void;
  openPay: (context: PayCtx) => void;
  linkedPostIds: Set<string>;
  followedAuthors: Set<string>;
  toggleFollow: (author: string) => void;
  language: Language;
  setLanguage: Dispatch<SetStateAction<Language>>;
  t: (key: string, params?: Record<string, string | number>) => string;
  posts: Post[];
  /** 递增以通知首页信息流回顶并重新加载帖子 */
  homeFeedRefreshNonce: number;
  refreshHomeFeed: () => void;
  repostedPostIds: Set<string>;
  likedPostIds: Set<string>;
  savedPostIds: Set<string>;
  dislikedPostIds: Set<string>;
  togglePostAction: (postId: string, action: PostAction) => void;
  /** 当前用户发出的打赏记录（新→旧） */
  outgoingTips: OutgoingTip[];
  recordOutgoingTip: (tip: Omit<OutgoingTip, 'id' | 'createdAt'>) => void;
  requestPostInteraction: (
    postId: string,
    action: InteractionAction,
    handlers: { onSkip: () => void; onPaid: () => void },
    options?: { presetComment?: string },
  ) => void;
  beginPaidInteraction: (postId: string, action: InteractionAction, onAfterPay: () => void) => void;
  deletePost: (postId: string) => void;
  requestDeletePost: (postId: string, onAfterDelete?: () => void) => void;
  openEditPost: (postId: string) => void;
  // tierUpdate 传入即代表本次连带修改了频道可见档位（30 天冷却期由调用方校验后才允许传入）
  updatePost: (postId: string, newTitle: string, tierUpdate?: { minTierIndex: number | undefined }) => void;
  incrementReplies: (postId: string) => void;
  decrementReplies: (postId: string) => void;
  /** 付费互动（如加入合伙人）成功后追加的评论 */
  appendPostReply: (postId: string, text: string) => void;
  extraRepliesByPostId: Record<string, Reply[]>;
  stagePendingPost: (data: NewPostData) => void;
  publishPost: (data: NewPostData) => void;
  openImageLightbox: (post: Post, imgIdx: number, imgCount: number) => void;
  openArticleReader: (post: Post) => void;
  openVideoPlayer: (post: Post) => void;
  activityGroups: ActivityGroup[];
  unreadActivityCount: number;
  markAllRead: () => void;
  openDailyTask: () => void;
  /** 今天是否还有可领取/待达成的每日任务奖励，供入口红点展示 */
  dailyTaskAlert: boolean;
  recentSearches: string[];
  saveRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  drafts: Draft[];
  saveDraft: (draft: Omit<Draft, 'id' | 'savedAt'>) => void;
  updateDraft: (draftId: string, draft: Omit<Draft, 'id' | 'savedAt'>) => void;
  deleteDraft: (draftId: string) => void;
  userProfile: UserProfile;
  updateUserProfile: (profile: UserProfile) => void;
  /** 跳转自己主页时是否自动展开「编辑资料」（用于小黄车联系方式发现引导，消费后需自行置回 false） */
  editProfileAutoOpen: boolean;
  setEditProfileAutoOpen: Dispatch<SetStateAction<boolean>>;
  /** 节点详情页回退到列表后自动打开转让弹层的单次标记。 */
  nodeTransferAutoOpenId: string | null;
  setNodeTransferAutoOpenId: Dispatch<SetStateAction<string | null>>;
  /** 跳转到自己的主页并自动展开「编辑资料」 */
  openEditProfileContacts: () => void;
  channels: Channel[];
  // 频道 id → 当前订阅的档位下标（未订阅则不在此 map 中；到期后仍保留，用于「续费」时回显原档位）
  subscribedChannelTiers: Record<string, number>;
  // 已到期、待续费的频道 id（仍在 subscribedChannelTiers 中，但已失去会员权限）
  expiredChannelIds: Set<string>;
  openChannelSubscribe: (channelId: string, requiredTierIndex?: number) => void;
  subscribeToChannelTier: (channelId: string, tierIndex: number) => void;
  // 开通频道：一步完成——校验通过后直接建号（1000 PB + 100 PB + 0.1 SUP 由弹窗自身走支付动画后调用）
  createChannel: (data: NewChannelData) => string;
  updateChannel: (channelId: string, data: NewChannelData) => void;
  // 开发工具：清空档位设置 30 天冷却期的记录时间，便于演示/测试
  resetChannelTierCooldown: (channelId: string) => void;
  openCreateChannel: () => void;
  createChannelOpen: boolean;
  closeCreateChannel: () => void;
  openManageChannel: (channelId: string) => void;
  closeManageChannel: () => void;
  // 开发工具：模拟当前用户「未创建频道」空态（默认关闭，原型自带 5 个自有频道）
  demoHideOwnChannels: boolean;
  toggleDemoHideOwnChannels: () => void;
  // SUP（SUP 链原生代币）：站内余额，产生节点时与 PB 同步扣除
  supBalance: number;
  supHistory: SupTransaction[];
  deductSup: (amount: number, reason: SupTransactionReason) => void;
  // 游客模式：未连接钱包时可浏览，涉及身份/资产/链上操作需先连接钱包
  walletConnected: boolean;
  connectWallet: () => void;
  // 供无法直接改造成 context action 的本地交互（如私信发送、评论提交）复用同一套连接钱包拦截逻辑
  requireWallet: (action: () => void) => void;
  // 知识宇宙页：钱包地址态（与 walletConnected 同步维护）+ 断开钱包
  walletAddress: string | null;
  walletConnecting: boolean;
  disconnectWallet: () => void;
  /** 四种 PB 的独立余额；pbBalance 仅用于总资产展示。 */
  pbWallets: Record<PbWalletId, number>;
  pbBalance: number;
  getPbWalletOptions: (use: PbUse, amount: number) => Array<{ wallet: PbWalletId; allowed: boolean; sufficient: boolean }>;
  pickDefaultPbWallet: (use: PbUse, amount: number) => PbWalletId | null;
  /** 单一钱包支付；余额或用途不符合时返回 false，绝不混用。 */
  payPb: (payment: { amount: number; use: PbUse; wallet: PbWalletId; supCost?: number; supReason?: SupTransactionReason }) => boolean;
  /** 开发工具：切换可用与受限钱包的演示余额。 */
  setDemoPbWallets: (preset: 'normal' | 'limited') => void;
  // 知识宇宙页：邀请码绑定
  myInviteCode: string;
  /** 已绑定邀请人的钱包地址；未绑定为 null */
  inviterAddress: string | null;
  bindInviter: (code: string) => { ok: boolean; message: string };
  // 知识宇宙页：周期性 PB 空投
  airdropClaimed: boolean;
  claimAirdrop: () => void;
  // 每日任务（发帖任务 + 互动帖任务）：今天的完成度决定明天可领取空投收益的比例
  taskSnapshotToday: TaskDaySnapshot;
  taskSnapshotYesterday: TaskDaySnapshot;
  /** 每完成 5 篇互动帖 +1，供任务面板监听触发一次性庆祝动效 */
  taskCelebrateSignal: number;
  /** 成功完成一次帖子互动后计入每日任务；同一帖子只计一次。 */
  recordTaskInteraction: (postId: string) => void;
  /** 当前自然月的日历格子（含首尾灰显的相邻月填充天），供历史日历以常见日历样式展示 */
  getDailyTaskCalendar: () => TaskCalendarDay[];
  // 开发工具：重置/模拟今日任务，便于演示
  resetDemoTasks: () => void;
  simulateDemoTaskInteractions: (count: number) => void;
  // ── 小黄车（帖子即商品）──────────────────────────────────────────
  shopOrders: ShopOrder[];
  shippingAddresses: ShippingAddress[];
  /** 默认收货地址（下单时自动填充）；无地址为 null */
  defaultAddress: ShippingAddress | null;
  addShippingAddress: (data: Omit<ShippingAddress, 'id'>) => ShippingAddress;
  setDefaultAddress: (addressId: string) => void;
  removeShippingAddress: (addressId: string) => void;
  /** 买家下单：创建「确认中」订单并立即返回，链上确认在后台异步完成（成功扣款转「待发货」，失败撤单，均 toast 通知） */
  placeShopOrder: (postId: string, quantity: number, address: ShippingAddress, variantId?: string, payWallet?: PbWalletId) => ShopOrder | undefined;
  /** 卖家发货：填物流公司 + 快递单号 */
  shipShopOrder: (orderId: string, carrier: string, trackingNo: string) => void;
  /** 买家确认收货 → 待结算（次月 15 日） */
  confirmShopReceipt: (orderId: string) => void;
  /** 开发工具：模拟 T+15 月结到账（待结算 → 已结算） */
  simulateShopSettle: (orderId: string) => void;
  /** 首页信息流下滑时，顶部/底部导航渐隐让出沉浸空间 */
  navBarsHidden: boolean;
  setNavBarsHidden: Dispatch<SetStateAction<boolean>>;
};


const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ value, children }: { value: AppContextValue; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
