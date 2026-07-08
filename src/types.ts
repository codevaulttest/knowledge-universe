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
  videoUrl?: string;
  tipsReceived?: number; // 该帖累计收到的打赏（PB），仅在自己主页展示
  channelId?: string; // 归属频道；未设置=不属于任何频道
  // 该频道下需订阅达到 channel.tiers[minTierIndex] 及以上档位才可见；未设置=频道内全员免费公开
  // "会员专属再付费"场景：已满足 minTierIndex 后，仍复用现有 stakeTier/visiblePercent 付费解锁机制，无需额外字段
  minTierIndex?: number;
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
  | { page: 'P7' }
  | { page: 'P_SEARCH' }
  | { page: 'P_PLANET' }
  | { page: 'P_DM' }
  | { page: 'P_DM_CHAT'; peerId: string };

// ── 频道 / 会员档位 ──────────────────────────────────────────────
export type ChannelTier = {
  id: string;
  name: string; // 固定编号 Lv.1/Lv.2/Lv.3…（按档位顺序自动生成，不可自定义）
  price: number; // PB/月，须 > 0，且高于上一档
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

export type ActivityType = 'like' | 'share' | 'save' | 'comment' | 'link' | 'tip';

export type ActivityActor = {
  user: string;
  avatarIdx: number;
};

export type ActivityGroup = {
  id: string;
  type: ActivityType;
  postId: string;
  actors: ActivityActor[];
  time: string;
  isRead: boolean;
  commentText?: string;
  tipAmount?: number; // type === 'tip' 时，该条打赏的金额（PB）
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
export type Language = 'zh-CN' | 'en';
export type PostAction = 'share' | 'like' | 'save';

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
