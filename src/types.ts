export type StakeTier = 0 | 10 | 100 | 1000;

export type Post = {
  id: string;
  author: string;
  time: string;
  title: string;
  articlePreview?: string;
  kind: 'text' | 'article' | 'image' | 'video';
  articleHasCover?: boolean;
  imageCount?: number;
  visiblePercent: number;
  isNode: boolean;
  stakeTier: StakeTier;
  nodeId?: string;
  rating: number;
  replies: number;
  links: number;
  shares: number;
  saves: number;
  likes: number;
  dislikes?: number;
  videoUrl?: string;
  tipsReceived?: number; // 该帖累计收到的打赏（PB）
  heat?: number; // 热力值（综合热度，用于打赏入口的引导展示）；未设置=按 id 派生一个稳定的演示值
  views?: number; // 浏览量；未设置=按 id 派生一个稳定的演示值
  channelId?: string; // 归属频道；未设置=不属于任何频道
  // 该频道下需订阅达到 channel.tiers[minTierIndex] 及以上档位才可见；未设置=频道内全员免费公开
  // "会员专属再付费"场景：已满足 minTierIndex 后，仍复用现有 stakeTier/visiblePercent 付费解锁机制，无需额外字段
  minTierIndex?: number;
  // 原帖已下架（作者删除/违规下架/账号注销等，UI 不区分具体原因）。
  // 下架后不出现在任何公开列表（feed / 他人主页转发列表），仅在转发者本人的「转发」列表里保留占位记录。
  deleted?: boolean;
};


export type RepostedBy = {
  name: string;
  avatarIdx: number;
};

export type Reply = {
  id: string;
  author: string;
  time: string;
  text: string;
  avatarIdx: number;
  likes: number;
  channelTierName?: string; // 若该评论作者是所在频道的订阅会员，展示对应档位名小标
};

export type Route =
  | { page: 'P0'; tab: 0 | 1 | 2 }
  | { page: 'P2'; postId: string; scrollToComments?: boolean }
  | { page: 'P6'; authorName: string }
  | { page: 'P_CHANNEL'; channelId: string }
  | { page: 'P7' }
  | { page: 'P_SEARCH' }
  | { page: 'P_PLANET'; searchNodeCode?: string; openBsp?: boolean }
  | { page: 'P_DM' }
  | { page: 'P_DM_CHAT'; peerId: string };

// ── 频道 / 会员档位 ──────────────────────────────────────────────
export type ChannelTier = {
  id: string;
  name: string; // 固定编号"金牌/银牌/铜牌"（按档位顺序自动生成，不可自定义）
  price: number; // PB/月，须 > 0，且高于上一档
  // 已下架：不再接受新订阅、不出现在发帖门槛/新用户订阅选择器里；但已订阅用户保留原价与权限，
  // 且该档位不能真删除（避免 minTierIndex / 订阅记录的数组下标错位），只能下架
  archived?: boolean;
};

export type Channel = {
  id: string;
  ownerName: string;
  name: string;
  description: string;
  avatarSeed: string;
  category: string;
  tiers: ChannelTier[]; // 最多 5 档；空数组=不开启订阅（纯免费频道）
  subscriberCount: number;
  createdAt: string;
  // 会员档位设置（涨价/降价/新增/下架档位）30 天内只能改一次；记录上次改动时间（ms 时间戳）
  // 未改动过则为 undefined（可立即修改）；仅频道名称/简介的编辑不受此限制、不刷新该时间戳
  tiersChangedAt?: number;
};

/** 频道订阅者（频道主从个人页查看） */
export type ChannelSubscriber = {
  name: string;
  avatarIdx: number;
  tierName: string;
  subscribedAt: string;
};

export type NewChannelData = {
  name: string;
  description: string;
  category: string;
  tiers: ChannelTier[];
};

export type DmMessage = {
  id: string;
  from: 'me' | 'peer';
  text: string;
  time: string;
};

export type DmConversation = {
  id: string;
  peer: string;
  peerAvatarIdx: number;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: DmMessage[];
};

export type ActivityType = 'like' | 'share' | 'save' | 'comment' | 'link' | 'tip' | 'subscribe';

export type ActivityActor = {
  user: string;
  avatarIdx: number;
};

export type ActivityGroup = {
  id: string;
  type: ActivityType;
  postId?: string;
  actors: ActivityActor[];
  time: string;
  isRead: boolean;
  commentText?: string;
  tipAmount?: number; // type === 'tip' 时，该条打赏的金额（PB）
  channelName?: string; // type === 'subscribe' 时，被订阅的频道名
  tierName?: string;    // type === 'subscribe' 时，订阅档位（如 Lv.2）
};

export type PostActorEntry = {
  user: string;
  avatarIdx: number;
  time: string;
  amount?: number; // 打赏名单时表示该笔打赏金额（PB）
};

export type PostActors = {
  links: PostActorEntry[];
  likes: PostActorEntry[];
  dislikes: PostActorEntry[];
  shares: PostActorEntry[];
  saves: PostActorEntry[];
  tips: PostActorEntry[];
};

export type Draft = {
  id: string;
  kind: Post['kind'];
  title: string;
  articleTitle?: string;
  articleHasCover?: boolean;
  thumbnailUrl?: string;
  imgCount?: number;
  hasVideo?: boolean;
  joinGemini?: boolean;
  stakeTier?: StakeTier;
  visibility?: number;
  savedAt: number; // timestamp
};
export type InteractionAction = PostAction | 'comment' | 'unlock';
export type PayCtx = {
  ctx: 'post' | 'chain' | 'repost' | 'interaction';
  postId?: string;
  action?: InteractionAction;
  stakeTier: StakeTier;
};
export type Language = 'zh-CN' | 'en' | 'zh-TW' | 'ko' | 'ja' | 'ru' | 'es' | 'fr' | 'pt' | 'th' | 'vi';

/** 站内 SUP 流水原因（展示文案在页面层按语言映射） */
export type SupTransactionReason =
  | 'recharge'
  | 'channel_open'
  | 'post'
  | 'chain_unlock'
  | 'repost'
  | 'comment'
  | 'share'
  | 'like'
  | 'dislike'
  | 'save'
  | 'unlock'
  | 'bsp_invest';

/** PB 支出原因（与 SupTransactionReason 平行；PB 侧暂无流水视图，仅用于标注扣款来源）。 */
export type PbTransactionReason = 'bsp_invest' | 'channel_open' | 'transfer';

export type SupTransaction = {
  id: string;
  direction: 'in' | 'out';
  amount: number;
  time: string;
  reason: SupTransactionReason;
};

/** 当前用户发出的打赏记录（帖子打赏 / 主页打赏）。 */
export type OutgoingTip = {
  id: string;
  recipientName: string;
  amount: number;
  context: 'post' | 'author';
  /** context === 'post' 时有值，用于回跳详情 */
  postId?: string;
  postTitle?: string;
  createdAt: number;
};

export type PostAction = 'share' | 'like' | 'save' | 'dislike';

export type NewPostData = {
  title: string;
  kind: Post['kind'];
  visiblePercent: number;
  isNode: boolean;
  stakeTier: StakeTier;
  articleHasCover?: boolean;
  imageCount?: number;
  channelId?: string;
  minTierIndex?: number;
};

export type StakeModalRequest = {
  postId: string;
  action: InteractionAction;
  onSkip: () => void;
  onAfterPay: () => void;
};

export type UserProfile = {
  nickname: string;
  avatarSeed: string;
  avatarUrl?: string;
};
