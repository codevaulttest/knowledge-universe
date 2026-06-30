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
};


export type Reply = {
  id: string;
  author: string;
  time: string;
  text: string;
  avatarIdx: number;
  likes: number;
};

export type Route =
  | { page: 'P0'; tab: 0 | 1 }
  | { page: 'P2'; postId: string; scrollToComments?: boolean }
  | { page: 'P6'; authorName: string }
  | { page: 'P7' }
  | { page: 'P_SEARCH' }
  | { page: 'P_PLANET' }
  | { page: 'P_DM' }
  | { page: 'P_DM_CHAT'; peerId: string };

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
