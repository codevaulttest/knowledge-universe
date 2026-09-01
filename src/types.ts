export type StakeTier = 0 | 10 | 100 | 1000;

// ── 小黄车（帖子即商品）──────────────────────────────────────────
/** 多规格商品的一个 SKU（扁平列表：卖家自填规格名 + 单价 + 库存） */
export type ShopVariant = {
  id: string;
  label: string;   // 如 "128G · 白色"
  price: number;   // PB，> 0
  stock: number;   // 整数 >= 0
};

/** 卖家在发帖时为帖子挂载的小黄车配置（仅 1000 PB 节点帖可挂载） */
export type ShopInfo = {
  rebatePercent: number; // 兑换方优点赠送比例，0–90（平台固定收 10% 损耗，故上限 90）
  partnerRebatePercent?: number; // 合伙人优点赠送比例；与 rebatePercent 之和 ≤ 90
  price?: number;        // 单规格：商品单价（PB），必须 > 0
  stock?: number;        // 单规格：库存
  variants?: ShopVariant[]; // 多规格：非空时忽略 price/stock
};

/** 买家收货地址 */
export type ShippingAddress = {
  id: string;
  name: string;
  phone: string;
  region?: string;  // 省 市 区（空格分隔），如「广东 深圳 南山区」；旧地址可能未拆分
  detail: string;   // 街道门牌等详细地址
  isDefault?: boolean;
};

/**
 * 订单状态机：待发货 → 已发货 → 已完成（买家确认/7天自动）→ 待结算（次月15日）→ 已结算
 */
export type ShopOrderStatus = 'submitting' | 'failed' | 'to_ship' | 'shipped' | 'completed' | 'to_settle' | 'settled';

export type ShopOrder = {
  id: string;
  postId: string;
  productTitle: string;
  productKind: Post['kind'];
  sellerName: string;
  buyerName: string;
  unitPrice: number;   // 下单时单价（PB）
  unitFee: number;     // 下单时单件 SUP 手续费
  quantity: number;
  rebatePercent: number;
  address: ShippingAddress;
  status: ShopOrderStatus;
  createdAt: number;
  carrier?: string;    // 物流公司
  trackingNo?: string; // 快递单号
  estMerit: number;    // 本单预计赠给买家的优点（占位）
  variantId?: string;
  variantLabel?: string;
  /** 下单时锁定的 PB 钱包；旧 mock 订单省略时按站内 PB 展示。 */
  payWallet?: PbWalletId;
};

export type CertStatus = 'minted' | 'pending' | 'burned';

/** 知识确权认证：一篇文章满 100 赞后由 cron 铸造的链上 NFT 凭证 */
export type KnowledgeCert = {
  id: string; // 证书编号，如 'WV-KC-20260001007'
  postId: string; // 对应文章
  status: CertStatus;
  holder: string; // 当前持有人（作者名）
  issuedAt?: number; // 铸造完成时间戳；pending 时无
  likesAtMint?: number; // 触发铸造时的赞数
  contentHash: string; // 文章内容指纹（64 位 hex）
  tokenId?: string; // 链上 Token ID
  txHash?: string; // 铸造交易哈希
  issuerAddress: string; // 发行方地址
  burnedAt?: number; // 销毁时间戳
  burnReason?: string; // 销毁原因（人工审核判定）
};

export type Post = {
  id: string;
  author: string;
  avatarUrl?: string; // 作者头像图源；未设置或加载失败=回退按 seed 生成的头像
  time: string;
  title: string;
  articlePreview?: string;
  kind: 'text' | 'article' | 'image' | 'video';
  articleHasCover?: boolean;
  imageCount?: number;
  imageAspect?: 'landscape' | 'tall'; // 单图构图：默认横图，'tall' 为瘦长竖图
  imageRatio?: number; // 封面/单图真实宽高比（宽÷高）；渲染时夹到 [3:4, 16:9] 定画框。缺省回退 imageAspect
  images?: string[]; // 各画框真实图源（按序对应 1..imageCount）；缺省回退 index 映射的 p1..p9 占位图
  imageRatios?: number[]; // 多图时各张真实宽高比（按序对应 images）；缺省回退封面 imageRatio（旧行为：全部等宽）
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
  // 该频道下需订阅达到 channel.tiers[minTierIndex] 及以上档位才可见；频道帖子未设置时按免费档（tiers[0]）处理
  // "会员专属再付费"场景：已满足 minTierIndex 后，仍复用现有 stakeTier/visiblePercent 付费解锁机制，无需额外字段
  minTierIndex?: number;
  // 代发帖署名覆盖：仅当帖子经由「频道授权」由代发人发布时设置，值为频道主名称。
  // author 字段本身保持代发人身份不变，isOwn / 节点归属 / PB 扣款均不受影响，只影响署名展示。
  displayAuthorName?: string;
  // 原帖已下架（作者删除/违规下架/账号注销等，UI 不区分具体原因）。
  // 下架后不出现在任何公开列表（feed / 他人主页转发列表），仅在转发者本人的「转发」列表里保留占位记录。
  deleted?: boolean;
  // 小黄车配置；未设置=该帖未挂载小黄车（仅 1000 PB 节点帖可挂载）
  shop?: ShopInfo;
  // 定时发布：设置该时间戳之前，帖子对除作者外的所有人不可见；未设置=立即发帖
  scheduledAt?: number;
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
  | { page: 'P_NODE'; node: KnowledgeNode }
  | { page: 'P7' }
  | { page: 'P_PLANET'; searchNodeCode?: string; openBsp?: boolean }
  | { page: 'P_DM' }
  | { page: 'P_DM_CHAT'; peerId: string }
  | { page: 'P_SHOP' }
  | { page: 'P_SHOP_ITEM'; postId: string }
  | { page: 'P_ORDERS'; role?: 'buyer' | 'seller' }
  | { page: 'P_CERTS' }
  | { page: 'P_CERT'; certId: string };

// ── 知识星球节点 ───────────────────────────────────────────────
export type NodeTier = 10 | 100 | 1000;
export type NodeOrigin = 'diamond' | 'genesis';
export type PurchaseSource = 'cash' | 'pb';

export type KnowledgeNode = {
  id: string;
  nodeCode: string;
  tier: NodeTier;
  stars: number;
  childCount: number;
  boundChildren: 0 | 1 | 2;
  origin: NodeOrigin;
  serialNo: number;
  purchaseSource: PurchaseSource;
  channelName: string;
  channelDescription?: string;
  remark?: string;
  syncing?: boolean;
  createdAt: string;
  /** 邀请该节点的节点码；创世节点没有该字段。 */
  invitedByCode?: string;
  /** 节点详情页的本地演示初始等级。 */
  level?: number;
  /** 节点详情页的本地演示初始推荐设置。 */
  allowRecommend?: boolean;
};

// ── 频道 / 会员档位 ──────────────────────────────────────────────
export type ChannelTier = {
  id: string;
  name: string; // 固定编号「免费 / 铜牌 / 银牌 / 金牌」（按档位顺序自动生成，不可自定义）
  price: number; // PB/月，须 > 0 且高于上一档；免费档固定为 0，不受此约束
  // 每个频道固定存在的免费档位（price 恒为 0），由 withFreeTier() 保证始终位于 tiers[0]；
  // 不计入 archived 也不可下架/删除，是频道免费内容的加入入口；帖子级 minTierIndex 为 0 时要求加入免费档
  free?: boolean;
  // 已下架：不再接受新订阅、不出现在发帖门槛/新用户订阅选择器里；但已订阅用户保留原价与权限，
  // 且该档位不能真删除（避免 minTierIndex / 订阅记录的数组下标错位），只能下架。免费档位不适用此状态。
  archived?: boolean;
};

export type Channel = {
  id: string;
  ownerName: string;
  name: string;
  description: string;
  avatarSeed: string;
  category: string;
  tiers: ChannelTier[]; // 固定含 1 个免费档（tiers[0]）+ 最多 3 个付费档
  subscriberCount: number;
  createdAt: string;
  // 会员档位设置（涨价/降价/新增/下架档位）30 天内只能改一次；记录上次改动时间（ms 时间戳）
  // 未改动过则为 undefined（可立即修改）；仅频道名称/简介的编辑不受此限制、不刷新该时间戳
  tiersChangedAt?: number;
  /** 代开通频道时的付款人；自己开通则不设置。 */
  payerName?: string;
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
  /** 代开通频道：已校验通过的他人钱包地址；自己开通则不传。 */
  beneficiaryAddress?: string;
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
  tipMessage?: string; // type === 'tip' 时，对方助力时附带的留言
  channelName?: string; // type === 'subscribe' 时，被订阅的频道名
  tierName?: string;    // type === 'subscribe' 时，订阅档位（如 Lv.2）
};

export type PostActorEntry = {
  user: string;
  avatarIdx: number;
  time: string;
  amount?: number; // 打赏名单时表示该笔打赏金额（PB）
  message?: string; // 打赏名单时，对方附带的留言
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
export type InteractionAction = PostAction | 'comment' | 'unlock' | 'partner';
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
  | 'partner'
  | 'bsp_invest'
  | 'purchase'
  | 'address_migration'
  | 'airdrop'
  | 'node_upgrade'
  | 'node_transfer'
  | 'withdraw';

/** 四种 PB 钱包。余额彼此独立，一笔支付只使用其中一个钱包。 */
export type PbWalletId = 'onchain' | 'station' | 'credibility' | 'airdrop';

/** 站内 SUP(184) / 链上 SUP，手续费只从其中一个池子出，不跨池拼单。 */
export type SupWalletId = 'site' | 'onchain';

/** 需要消耗 PB 的业务用途，用于集中校验钱包可用范围。 */
export type PbUse =
  | 'channel_open'
  | 'bsp_invest'
  | 'post'
  | 'like'
  | 'dislike'
  | 'share'
  | 'comment'
  | 'save'
  | 'unlock'
  | 'partner'
  | 'channel_subscribe'
  | 'purchase'
  | 'tip'
  | 'node_upgrade'
  | 'node_transfer';

/** 地址迁移由后续服务执行；前端只维护申请、撤销与展示状态。 */
export type AddressMigrationStatus = 'pending' | 'cancelled' | 'awaiting_execution' | 'completed';

export type AddressMigration = {
  id: string;
  sourceAddress: string;
  targetAddress: string;
  pbFee: number;
  supFee: number;
  createdAt: number;
  expiresAt: number;
  status: AddressMigrationStatus;
  cancelledAt?: number;
  completedAt?: number;
  /** 迁移提交后的确认弹窗是否已被用户关闭，用于避免重复进入主页时反复弹出 */
  reminderSeen?: boolean;
};

/** 频道授权：频道主授权他人钱包地址代为发帖，代发帖署名仍展示为频道主，需对方接受后生效，双方可随时撤销。 */
export type ChannelAuthorizationStatus = 'pending' | 'active' | 'declined' | 'revoked';

export type ChannelAuthorization = {
  id: string;
  channelId: string;
  ownerName: string; // 发起授权的频道主（Channel.ownerName）
  delegateAddress: string; // 被授权钱包地址，统一存小写
  delegateName?: string; // 校验通过时解析出的已注册账户名，仅展示用
  status: ChannelAuthorizationStatus;
  createdAt: number;
  respondedAt?: number; // 接受/婉拒时间
  revokedAt?: number;
  revokedBy?: 'owner' | 'delegate';
};

export type SupTransaction = {
  id: string;
  direction: 'in' | 'out';
  amount: number;
  time: string;
  reason: SupTransactionReason;
  wallet: SupWalletId;
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
  /** 赞助时附带的私信（对方可见，并生成一条私信） */
  message?: string;
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
  shop?: ShopInfo;
  scheduledAt?: number;
};

export type StakeModalRequest = {
  postId: string;
  action: InteractionAction;
  /** partner：强制选档位 + 评论，隐藏「不参与」 */
  mode?: 'default' | 'partner';
  /** 详情页已写好的评论：弹窗内不再要求二次输入 */
  presetComment?: string;
  onSkip: () => void;
  onAfterPay: () => void;
};

/** 个人联系方式（小黄车卖家可选填，买家在商品详情页可见）；键留空=未设置该渠道 */
export type ProfileContacts = {
  wechat?: string;
  whatsapp?: string;
  phone?: string;
};

export type UserProfile = {
  nickname: string;
  avatarSeed: string;
  avatarUrl?: string;
  contacts?: ProfileContacts;
  bio?: string;
};
