import type { ActivityGroup, Channel, ChannelSubscriber, DmConversation, KnowledgeCert, OutgoingTip, Post, PostActors, ProfileContacts, Reply, ShippingAddress, ShopOrder } from './types';
import { withFreeTier } from './channelTiers';

export type UserListItem = {
  name: string;
  desc: string;
  avatarIdx: number;
};

export const BATCH_SIZE = 3;

/** 小黄车卖家联系方式演示数据（其余作者未设置=留空，走查时展示无联系方式的正常状态） */
export const MOCK_SELLER_CONTACTS: Record<string, ProfileContacts> = {
  '拾光杂货铺': { wechat: 'shiguang_shop', phone: '138****2233' },
  '游牧开发者': { whatsapp: '+65 9123 4567' },
  '设计师刘然': { wechat: 'liuran_design' },
  '兜底走查': { wechat: 'daodi_qa' },
};

export const MOCK_WALLET_ADDRESS = '0x7a3fb8e2d1c94f6a5b3e0d9c8f2a7e1b4d6c3e8';
export const DEFAULT_WALLET_DISPLAY = MOCK_WALLET_ADDRESS.slice(-6);
/** 演示登录用户：与钱包短名一致，避免与中文昵称人格混用 */
export const CURRENT_USER = DEFAULT_WALLET_DISPLAY;

/** 演示钱包 PB 余额（连接后展示）—— 数值取到能演示 BSP 巨星投流 1 万单位（1000 万 PB）的量级 */
export const MOCK_PB_WALLETS = {
  onchain: 5600,
  station: 2400,
  credibility: 800,
  airdrop: 3200,
} as const;
/** 演示钱包 SUP 余额，站内/链上两池独立（连接后展示） */
export const MOCK_SUP_WALLETS = {
  site: 50,
  onchain: 1000,
} as const;
/** 演示优点余额——首次结算 9 月 15 日前统一显示 0 */
export const MOCK_MERIT_BALANCE = 0;
/** 演示钱包对应的邀请码（固定随机六位数字） */
export const MOCK_MY_INVITE_CODE = '482915';

/** 邀请码 → 邀请人钱包地址（demo：绑定后展示地址而非邀请码本身） */
export const MOCK_INVITE_CODE_TO_ADDRESS: Record<string, string> = {
  '100861': '0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d',
  '888888': '0x9f8e7d6c5b4a3928170615243a4b5c6d7e8f9012',
  '202607': '0x3c5e7a91b2d4f6081c3e5a7b9d0f1234567890ab',
};

/** 已注册知识宇宙账户的钱包地址（demo：地址迁移时用于识别目标地址身份），key 为小写地址 */
export const MOCK_REGISTERED_ADDRESSES: Record<string, string> = {
  '0xab99f73f93c911d456ffaac9cb41a826bced3b44': '极客前沿',
  '0x5f2a8c1e6d9b3074a5c6e8f0123456789abcdef0': '阿May的研究笔记',
};

/** 按钱包地址查找已注册的知识宇宙账户；未命中返回 undefined */
export function findRegisteredUserByAddress(address: string): UserListItem | undefined {
  const name = MOCK_REGISTERED_ADDRESSES[address.trim().toLowerCase()];
  return name ? ALL_USERS_MOCK.find(u => u.name === name) : undefined;
}

/** 将 6 位邀请码解析为邀请人钱包地址；未知码用确定性 mock 地址，保证 demo 可绑任意码 */
export function resolveInviterAddress(code: string): string {
  if (MOCK_INVITE_CODE_TO_ADDRESS[code]) return MOCK_INVITE_CODE_TO_ADDRESS[code];
  const hex = Array.from(code)
    .map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(40, '0')
    .slice(0, 40);
  return `0x${hex}`;
}

/** 周期性 PB 空投单次发放数量 */
export const MOCK_PB_AIRDROP_AMOUNT = 100;

/** 空投收益上限展示值：可通过提升节点星级提升，仅用于领取弹窗温馨提示展示。 */
export const MOCK_AIRDROP_REWARD_CAP = 99999;

/** 空投领取弹窗里的 5 项金额构成占比：仅用于展示，照搬真实实现的分类，无实际业务含义。 */
const AIRDROP_BREAKDOWN_ITEMS = [
  { key: 'llsy', ratio: 0.4 },
  { key: 'dssy', ratio: 0.25 },
  { key: 'dysy', ratio: 0.2 },
  { key: 'jqbt', ratio: 0.1 },
  { key: 'oldnum', ratio: 0.05 },
] as const;

export type AirdropBreakdownKey = typeof AIRDROP_BREAKDOWN_ITEMS[number]['key'];

/** 按固定占比把今日可领总额拆成 5 项，最后一项吸收舍入差额，保证求和等于总额。 */
export function getAirdropBreakdown(totalPb: number): { key: AirdropBreakdownKey; value: number }[] {
  const rows = AIRDROP_BREAKDOWN_ITEMS.map(item => ({ key: item.key, value: Math.round(totalPb * item.ratio) }));
  const roundedSum = rows.reduce((sum, row) => sum + row.value, 0);
  rows[rows.length - 1].value += totalPb - roundedSum;
  return rows;
}

/** 演示用户名下直连的五星节点数，驱动「公信力任务」每日配额（0 个仍保底 1 组，≥1 个按 ×9 递增）。 */
export const MOCK_FIVE_STAR_NODE_COUNT = 3;

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 正式逻辑：北京时间当天 22:00 截止 */
function getBeijingAirdropDeadline(now: number): number {
  const beijingWallClock = new Date(now + BEIJING_OFFSET_MS);
  const year = beijingWallClock.getUTCFullYear();
  const month = beijingWallClock.getUTCMonth();
  const day = beijingWallClock.getUTCDate();
  return Date.UTC(year, month, day, 22, 0, 0) - BEIJING_OFFSET_MS;
}

/** 每日空投领取截止时间点（毫秒时间戳）：逾期未领取则错过本轮 */
export function getAirdropDeadline(now: number = Date.now()): number {
  return getBeijingAirdropDeadline(now);
}

export const AVATAR_PRESET_SEEDS = [
  'nova-7a3f', 'zenith-e2d1', 'prism-c94f', 'cipher-6a5b',
  'cosmos-3e0d', 'aurora-9c8f', 'nexus-2a7e', 'quasar-1b4d',
];

/** 已认证用户（蓝 V），类似 X 平台认证标识 */
export const VERIFIED_AUTHORS = new Set([
  '阿May的研究笔记',
  'AI 效率研究所',
  '产品大叔严磊',
]);

export function isVerifiedAuthor(name: string): boolean {
  return VERIFIED_AUTHORS.has(name);
}

/** 创世节点持有者身份标记（1000/10000 两档，对应银/金徽章）——链上认购项目独立于本项目，此处仅 mock 展示 */
export const GENESIS_NODE_OWNERS: Record<string, 'silver' | 'gold'> = {
  '极客前沿': 'silver',
  '产品大叔严磊': 'silver',
  'AI 效率研究所': 'gold',
};

export function getGenesisTier(name: string): 'silver' | 'gold' | null {
  return GENESIS_NODE_OWNERS[name] ?? null;
}

// ── 知识宇宙页顶公告（跑马灯 + 加权补贴规则详情）─────────────────
export type PlanetAnnouncement = {
  id: string;
  /** 跑马灯单行文案 */
  titleZh: string;
  titleEn: string;
  sheetTitleZh: string;
  sheetTitleEn: string;
  badgeZh: string;
  badgeEn: string;
  docTitleZh: string;
  docTitleEn: string;
  orgZh: string;
  orgEn: string;
  publishedAtZh: string;
  publishedAtEn: string;
  coreTitleZh: string;
  coreTitleEn: string;
  coreItems: Array<{
    labelZh: string;
    labelEn: string;
    /** 正文；含 `{days}` 时高亮发放天数 */
    bodyZh: string;
    bodyEn: string;
    withDays?: boolean;
  }>;
  benefitTitleZh: string;
  benefitTitleEn: string;
  benefitRows: Array<{
    starZh: string;
    starEn: string;
    benefitZh: string;
    benefitEn: string;
    descZh: string;
    descEn: string;
  }>;
  noteLabelZh: string;
  noteLabelEn: string;
  noteBodyZh: string;
  noteBodyEn: string;
  signTeamZh: string;
  signTeamEn: string;
  signDateZh: string;
  signDateEn: string;
  footerZh: string;
  footerEn: string;
};

/** 对照 genesis_node `infoSubsidy` 官方公告弹窗（PDF 版式）；发放天数等规则来自该源，非本仓库臆造 */
export const MOCK_PLANET_ANNOUNCEMENT: PlanetAnnouncement = {
  id: 'ann-channel-node-subsidy-2026-07',
  titleZh: '上线「频道节点加权补贴」活动，点击查看详情',
  titleEn: '"Channel Node Weighted Subsidy" is live — tap for details',
  sheetTitleZh: '加权补贴活动规则',
  sheetTitleEn: 'Weighted Subsidy Rules',
  badgeZh: '官方公告',
  badgeEn: 'Official Notice',
  docTitleZh: '知识宇宙：频道节点加权补贴活动规则',
  docTitleEn: 'Wisverse: Channel Node Weighted Subsidy Rules',
  orgZh: '发文单位：知识宇宙平台运营中心',
  orgEn: 'Issued by: Wisverse Platform Operations Center',
  publishedAtZh: '发布时间：2026年7月23日',
  publishedAtEn: 'Published: July 23, 2026',
  coreTitleZh: '一、核心机制',
  coreTitleEn: '1. Core Mechanism',
  coreItems: [
    {
      labelZh: '补贴评估：',
      labelEn: 'Subsidy assessment: ',
      bodyZh: '平台依据节点活跃度算法，定期向各个频道节点发放推流 PB 补贴。',
      bodyEn: 'Based on the node activity algorithm, the platform periodically grants traffic-boost PB subsidies to channel nodes.',
    },
    {
      labelZh: '发放周期：',
      labelEn: 'Release schedule: ',
      bodyZh: '补贴自节点升级/审核通过之日起，分 {days} 天按日线性发放至节点账户。',
      bodyEn: 'Starting from the node upgrade / approval date, subsidies are released linearly over {days} days into the node account.',
      withDays: true,
    },
    {
      labelZh: '使用用途：',
      labelEn: 'Intended use: ',
      bodyZh: '专项辅助节点开展投流与品牌宣传推广。',
      bodyEn: 'Dedicated support for node traffic buying and brand promotion.',
    },
  ],
  benefitTitleZh: '二、星级解锁权益（一星至五星）',
  benefitTitleEn: '2. Star-Tier Benefits (1★–5★)',
  benefitRows: [
    {
      starZh: '一星节点',
      starEn: '1★ Node',
      benefitZh: '基础加权补贴额度',
      benefitEn: 'Basic weighted subsidy quota',
      descZh: '解锁基础推流 PB 补贴，按 100 天按日释放',
      descEn: 'Unlock basic traffic-boost PB subsidy, released daily over 100 days',
    },
    {
      starZh: '二星节点',
      starEn: '2★ Node',
      benefitZh: '进阶加权补贴额度',
      benefitEn: 'Advanced weighted subsidy quota',
      descZh: '解锁更高比例推流 PB 补贴',
      descEn: 'Unlock a higher-ratio traffic-boost PB subsidy',
    },
    {
      starZh: '三星节点',
      starEn: '3★ Node',
      benefitZh: '中级加权补贴额度',
      benefitEn: 'Intermediate weighted subsidy quota',
      descZh: '提高活跃度权重与补贴基数',
      descEn: 'Raise activity weight and subsidy base',
    },
    {
      starZh: '四星节点',
      starEn: '4★ Node',
      benefitZh: '高级加权补贴额度',
      benefitEn: 'High-tier weighted subsidy quota',
      descZh: '获得高阶流量扶持与 PB 补贴',
      descEn: 'Gain higher-tier traffic support and PB subsidy',
    },
    {
      starZh: '五星节点',
      starEn: '5★ Node',
      benefitZh: '顶级加权补贴额度',
      benefitEn: 'Top-tier weighted subsidy quota',
      descZh: '享受最高级别加权 PB 补贴与全网推流倾斜',
      descEn: 'Enjoy top-tier weighted PB subsidy and network-wide traffic preference',
    },
  ],
  noteLabelZh: '重要说明：',
  noteLabelEn: 'Important: ',
  noteBodyZh: '活跃度算法将直接影响实际结算的 PB 数量，星级越高，可解锁的补贴上限与加权系数越大。',
  noteBodyEn: 'The activity algorithm directly affects settled PB. Higher star tiers unlock larger subsidy caps and weighting factors.',
  signTeamZh: '知识宇宙官方运营团队',
  signTeamEn: 'Wisverse Official Operations Team',
  signDateZh: '2026年7月23日',
  signDateEn: 'July 23, 2026',
  footerZh: '知识宇宙官方运营团队 · 保持探索 · 链接未来',
  footerEn: 'Wisverse Official Operations · Keep exploring · Connect the future',
};

// ── 频道 ───────────────────────────────────────────────────────
/** 原型默认：当前用户已开通 5 个频道（DevPanel 可切到「未创建频道」） */
export const MY_DEMO_CHANNELS: Channel[] = [
  {
    id: 'channel-me-1', ownerName: CURRENT_USER, name: `${CURRENT_USER}的频道`,
    description: '分享产品思考与日常灵感，不定期更新。',
    avatarSeed: CURRENT_USER, category: '综合',
    tiers: [],
    subscriberCount: 12, createdAt: '2026-02-18',
  },
  {
    id: 'channel-me-2', ownerName: CURRENT_USER, name: `${CURRENT_USER}的频道 2`,
    description: '会员专属短讯与幕后笔记。',
    avatarSeed: CURRENT_USER, category: '综合',
    tiers: [
      { id: 'me2-1', name: '铜牌', price: 50 },
    ],
    subscriberCount: 38, createdAt: '2026-03-02',
  },
  {
    id: 'channel-me-3', ownerName: CURRENT_USER, name: `${CURRENT_USER}的频道 3`,
    description: '深度长文与专题合集。',
    avatarSeed: CURRENT_USER, category: '创作',
    tiers: [
      { id: 'me3-1', name: '铜牌', price: 30 },
      { id: 'me3-2', name: '银牌', price: 120 },
    ],
    subscriberCount: 64, createdAt: '2026-03-28',
  },
  {
    id: 'channel-me-4', ownerName: CURRENT_USER, name: `${CURRENT_USER}的频道 4`,
    description: '工具测评、工作流模板与实操演示。',
    avatarSeed: CURRENT_USER, category: '效率',
    tiers: [
      { id: 'me4-1', name: '铜牌', price: 20 },
      { id: 'me4-2', name: '银牌', price: 80 },
      { id: 'me4-3', name: '金牌', price: 200 },
    ],
    subscriberCount: 91, createdAt: '2026-04-15',
  },
  {
    id: 'channel-me-5', ownerName: CURRENT_USER, name: `${CURRENT_USER}的频道 5`,
    description: '问答、连载与社群活动预告。',
    avatarSeed: CURRENT_USER, category: '社群',
    tiers: [
      { id: 'me5-1', name: '铜牌', price: 100 },
      { id: 'me5-2', name: '银牌', price: 300 },
    ],
    subscriberCount: 27, createdAt: '2026-05-08',
  },
];

export const ALL_CHANNELS: Channel[] = [
  {
    id: 'channel-amay', ownerName: '阿May的研究笔记', name: '阿May的AI研究站',
    description: 'RAG、大模型应用与工程实践，每周更新深度拆解。',
    avatarSeed: '阿May的研究笔记', category: 'AI / 大模型',
    tiers: [
      { id: 'amay-1', name: '铜牌', price: 100 },
      { id: 'amay-2', name: '银牌', price: 500 },
    ],
    subscriberCount: 86, createdAt: '2026-05-10',
  },
  {
    id: 'channel-yanlei', ownerName: '产品大叔严磊', name: '产品大叔的方法论频道',
    description: 'B 端产品与数据方法论，10 年一线经验复盘。',
    avatarSeed: '产品大叔严磊', category: '产品 / 运营',
    tiers: [
      { id: 'yanlei-1', name: '铜牌', price: 50 },
    ],
    subscriberCount: 42, createdAt: '2026-06-01',
  },
  {
    id: 'channel-jike', ownerName: '极客前沿', name: '极客前沿·深度追踪',
    description: 'LLM / Agent 业界最前沿动态，独家一手信息。',
    avatarSeed: '极客前沿', category: '科技资讯',
    tiers: [
      { id: 'jike-1', name: '铜牌', price: 30 },
      { id: 'jike-2', name: '银牌', price: 150 },
      { id: 'jike-3', name: '金牌', price: 400 },
    ],
    subscriberCount: 215, createdAt: '2026-04-22',
  },
  {
    id: 'channel-aieff', ownerName: 'AI 效率研究所', name: 'AI 效率研究所·工具箱',
    description: 'AI 工具评测、提示词模板与效率工作流，三档订阅覆盖轻度到深度用户。',
    avatarSeed: 'AI 效率研究所', category: 'AI / 大模型',
    tiers: [
      { id: 'aieff-1', name: '铜牌', price: 20 },
      { id: 'aieff-2', name: '银牌', price: 60 },
      { id: 'aieff-3', name: '金牌', price: 150 },
    ],
    subscriberCount: 124, createdAt: '2026-03-15',
  },
  ...MY_DEMO_CHANNELS,
].map(c => ({ ...c, tiers: withFreeTier(c.tiers) }));

/** 频道订阅者名单（频道主从个人页「X 人已订阅」进入查看；UI demo 用局部名单，数量可不等于 subscriberCount） */
export const CHANNEL_SUBSCRIBERS: Record<string, ChannelSubscriber[]> = {
  'channel-amay': [
    { name: '游牧开发者', avatarIdx: 2, tierName: '银牌', subscribedAt: '2 天前' },
    { name: '设计师刘然', avatarIdx: 0, tierName: '铜牌', subscribedAt: '5 天前' },
    { name: '深海鱼炸弹', avatarIdx: 0, tierName: '铜牌', subscribedAt: '1 周前' },
    { name: '极客前沿', avatarIdx: 1, tierName: '银牌', subscribedAt: '2 周前' },
    { name: '产品大叔严磊', avatarIdx: 2, tierName: '铜牌', subscribedAt: '3 周前' },
  ],
  'channel-yanlei': [
    { name: '游牧开发者', avatarIdx: 2, tierName: '铜牌', subscribedAt: '1 天前' },
    { name: '阿May的研究笔记', avatarIdx: 1, tierName: '铜牌', subscribedAt: '4 天前' },
    { name: '设计师刘然', avatarIdx: 0, tierName: '铜牌', subscribedAt: '1 周前' },
  ],
  'channel-jike': [
    { name: 'AI 效率研究所', avatarIdx: 0, tierName: '金牌', subscribedAt: '3 小时前' },
    { name: '阿May的研究笔记', avatarIdx: 1, tierName: '银牌', subscribedAt: '昨天' },
    { name: '游牧开发者', avatarIdx: 2, tierName: '铜牌', subscribedAt: '3 天前' },
    { name: '深海鱼炸弹', avatarIdx: 0, tierName: '银牌', subscribedAt: '1 周前' },
    { name: '设计师刘然', avatarIdx: 0, tierName: '铜牌', subscribedAt: '2 周前' },
    { name: '产品大叔严磊', avatarIdx: 2, tierName: '金牌', subscribedAt: '1 个月前' },
  ],
  'channel-aieff': [
    { name: '阿May的研究笔记', avatarIdx: 1, tierName: '金牌', subscribedAt: '1 小时前' },
    { name: '游牧开发者', avatarIdx: 2, tierName: '银牌', subscribedAt: '昨天' },
    { name: '设计师刘然', avatarIdx: 0, tierName: '铜牌', subscribedAt: '2 天前' },
    { name: '极客前沿', avatarIdx: 1, tierName: '金牌', subscribedAt: '5 天前' },
    { name: '深海鱼炸弹', avatarIdx: 0, tierName: '金牌', subscribedAt: '1 周前' },
    { name: '产品大叔严磊', avatarIdx: 2, tierName: '铜牌', subscribedAt: '2 周前' },
  ],
  // 分组展示用：同档位按订阅时间从新到旧排列
  'channel-lin': [
    { name: '阿May的研究笔记', avatarIdx: 1, tierName: '金牌', subscribedAt: '2 小时前' },
    { name: 'AI 效率研究所', avatarIdx: 0, tierName: '金牌', subscribedAt: '昨天' },
    { name: '极客前沿', avatarIdx: 1, tierName: '金牌', subscribedAt: '5 天前' },
    { name: '游牧开发者', avatarIdx: 2, tierName: '银牌', subscribedAt: '2 天前' },
    { name: '深海鱼炸弹', avatarIdx: 0, tierName: '银牌', subscribedAt: '1 周前' },
    { name: '设计师刘然', avatarIdx: 0, tierName: '铜牌', subscribedAt: '4 天前' },
    { name: '产品大叔严磊', avatarIdx: 2, tierName: '铜牌', subscribedAt: '2 周前' },
  ],
};

/** 解析订阅者名单：优先按频道 id；当前用户若只有运行时新建的空频道，回落到 channel-lin 演示数据 */
export function getChannelSubscribers(channel: Channel): ChannelSubscriber[] {
  const byId = CHANNEL_SUBSCRIBERS[channel.id];
  if (byId && byId.length > 0) return byId;
  if (channel.ownerName === CURRENT_USER) return CHANNEL_SUBSCRIBERS['channel-lin'] ?? [];
  return byId ?? [];
}

export const ALL_POSTS: Post[] = [
  // ── 多规格小黄车演示（首条：推荐流 + 商城 Tab 均置顶）──
  {
    id: 'shop-iphone', author: '极客前沿', time: '1 天前',
    title: 'iPhone 17 · 国行正品，支持验机。颜色与容量见规格，全国顺丰包邮。',
    kind: 'image', imageCount: 4, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Ip7nQ2',
    rating: 5, replies: 42, links: 14, shares: 28, saves: 156, likes: 428,
    shop: {
      rebatePercent: 20,
      partnerRebatePercent: 5,
      variants: [
        { id: 'ip-128w', label: '128G · 白色', price: 5000, stock: 12 },
        { id: 'ip-128b', label: '128G · 黑色', price: 5000, stock: 8 },
        { id: 'ip-256g', label: '256G · 金色', price: 6000, stock: 5 },
      ],
    },
  },
  // ── 图片兜底走查（首屏可见）：封面图地址失效，验证加载失败时的兜底展示 ──
  {
    id: 'fallback-demo', author: '兜底走查', time: '刚刚',
    title: '封面图地址已失效：回退到裂图占位',
    kind: 'image', imageCount: 1, imageRatio: 16 / 9, images: ['https://broken.invalid/cover.jpg'], visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Rz0dW2',
    rating: 0, replies: 0, links: 0, shares: 0, saves: 0, likes: 0,
    shop: { price: 199, rebatePercent: 30, partnerRebatePercent: 10, stock: 50 },
  },
  // ── 图片比例走查（首屏可见）：单图不同宽高比 + 多图 carousel 不同封面比例 ──
  // 规则见 docs/image-display-spec.md：画框比例 = clamp(真实比例, 9:21, 21:9)，cover 居中裁。
  // 按钮组合走查：链接=isNode、兑换=shop，覆盖 全有/只链接/只兑换/都没有 四种
  {
    id: 'ratio-single-249', author: '比例走查', time: '刚刚',
    title: '单图 · 超宽 24:9（超出上限：画框夹到 21:9，裁左右 ~12.5%，点开看全）',
    kind: 'image', imageCount: 1, imageRatio: 24 / 9, images: ['/img/ratio-24x9.svg'], visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 0, links: 0, shares: 0, saves: 0, likes: 0,
  },
  {
    id: 'ratio-single-pano', author: '比例走查', time: '刚刚',
    title: '单图 · 全景 21:9（横图上限，满宽不裁，最矮 ~150px）',
    kind: 'image', imageCount: 1, imageRatio: 21 / 9, images: ['/img/ratio-21x9.svg'], visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Rz1aP7',
    rating: 0, replies: 0, links: 12, shares: 0, saves: 0, likes: 0,
    shop: { price: 1800, rebatePercent: 40, partnerRebatePercent: 10, stock: 30 },
  },
  {
    id: 'ratio-single-169', author: '比例走查', time: '刚刚',
    title: '单图 · 横图 16:9（区间内，满宽不裁；横图上限已放宽到 21:9）',
    kind: 'image', imageCount: 1, imageRatio: 16 / 9, images: ['/img/ratio-16x9.svg'], visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Rz2bK4',
    rating: 0, replies: 0, links: 8, shares: 0, saves: 0, likes: 0,
  },
  {
    id: 'ratio-single-11', author: '比例走查', time: '刚刚',
    title: '单图 · 方图 1:1（区间内，满宽不裁）',
    kind: 'image', imageCount: 1, imageRatio: 1, images: ['/img/ratio-1x1.svg'], visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 0, links: 0, shares: 0, saves: 0, likes: 0,
  },
  {
    id: 'ratio-single-34', author: '比例走查', time: '刚刚',
    title: '单图 · 竖图 3:4（区间内，不裁；窄屏满宽，超最大高则按高定宽居左）',
    kind: 'image', imageCount: 1, imageRatio: 3 / 4, images: ['/img/ratio-3x4.svg'], visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 0, links: 0, shares: 0, saves: 0, likes: 0,
  },
  {
    id: 'ratio-single-916', author: '比例走查', time: '刚刚',
    title: '单图 · 瘦长 9:16（区间内，不裁；超最大高→按高定宽、缩窄居左，不吃屏）',
    kind: 'image', imageCount: 1, imageRatio: 9 / 16, images: ['/img/ratio-9x16.svg'], visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Rz3cT9',
    rating: 0, replies: 0, links: 5, shares: 0, saves: 0, likes: 0,
    shop: { price: 2600, rebatePercent: 50, partnerRebatePercent: 10, stock: 8 },
  },
  {
    id: 'ratio-single-921', author: '比例走查', time: '刚刚',
    title: '单图 · 超高 9:21（竖图上限，不裁；按最大高定宽、缩到最窄居左）',
    kind: 'image', imageCount: 1, imageRatio: 9 / 21, images: ['/img/ratio-9x21.svg'], visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 0, links: 0, shares: 0, saves: 0, likes: 0,
  },
  {
    id: 'ratio-single-924', author: '比例走查', time: '刚刚',
    title: '单图 · 超高 9:24（超出上限：画框夹到 9:21 裁上下 ~12.5%，且缩窄居左，点开看全）',
    kind: 'image', imageCount: 1, imageRatio: 9 / 24, images: ['/img/ratio-9x24.svg'], visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 0, links: 0, shares: 0, saves: 0, likes: 0,
  },
  {
    id: 'ratio-multi-169', author: '比例走查', time: '刚刚',
    title: '多图 carousel · 封面 16:9（3 张比例各不同，高随封面固定，宽各自夹上下限）',
    kind: 'image', imageCount: 3, imageRatio: 16 / 9,
    images: ['/img/ratio-16x9.svg', '/img/ratio-21x9.svg', '/img/ratio-1x1.svg'],
    imageRatios: [16 / 9, 21 / 9, 1], visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 0, links: 0, shares: 0, saves: 0, likes: 0,
  },
  {
    id: 'ratio-multi-34-lock', author: '比例走查', time: '刚刚',
    title: '多图 carousel · 封面 3:4 竖框（5 张比例各不同，后 2 张锁定，看角标与解锁遮罩）',
    kind: 'image', imageCount: 5, imageRatio: 3 / 4,
    images: ['/img/ratio-3x4.svg', '/img/ratio-9x16.svg', '/img/ratio-1x1.svg', '/img/ratio-16x9.svg', '/img/ratio-21x9.svg'],
    imageRatios: [3 / 4, 9 / 16, 1, 16 / 9, 21 / 9], visiblePercent: 60, isNode: true, stakeTier: 1000, nodeId: 'Rt5mK9',
    rating: 0, replies: 0, links: 3, shares: 0, saves: 0, likes: 0,
  },
  {
    id: 'ratio-multi-wide-then-tall', author: '比例走查', time: '刚刚',
    title: '多图 carousel · 封面 16:9 宽图，第 2 张 9:16 竖图（画框不随第 2 张变窄变形，第 2 张按上限收窄裁上下）',
    kind: 'image', imageCount: 2, imageRatio: 16 / 9,
    images: ['/img/ratio-16x9.svg', '/img/ratio-9x16.svg'],
    imageRatios: [16 / 9, 9 / 16], visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 0, links: 0, shares: 0, saves: 0, likes: 0,
  },
  {
    id: 'p1', author: 'AI 效率研究所', time: '2 小时前',
    title: 'AI 产品截图 × 提示词模板合集。精选 12 款工具的实测截图，附 3 个月高频使用总结的提示词模板，拿来即用。',
    kind: 'image', imageCount: 3, visiblePercent: 50, isNode: true, stakeTier: 1000, nodeId: 'Kx7mR2',
    rating: 4, replies: 18, links: 42, shares: 36, saves: 152, likes: 306, tipsReceived: 89,
    channelId: 'channel-aieff',
    shop: { price: 2000, rebatePercent: 40, partnerRebatePercent: 10, stock: 50 },
  },
  // ── 商城封面占位样式演示（首屏可见）──
  {
    id: 'shop-ph-text', author: '游牧开发者', time: '9 天前',
    title: '《独立开发者的 100 条心法》电子版。纯文字交付，无配图；下单后私信发送 PDF 与 Notion 模板链接。',
    kind: 'text', visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Ph1tX9',
    rating: 4, replies: 12, links: 3, shares: 8, saves: 45, likes: 128,
    shop: { price: 88, rebatePercent: 45, partnerRebatePercent: 10, stock: 999 },
  },
  {
    id: 'shop-ph-article', author: '阿May的研究笔记', time: '10 天前',
    title: 'RAG 落地检查清单 · 可打印版。长文无封面，附 32 项自检表与踩坑对照；适合团队 onboarding 用。',
    articlePreview: '从数据清洗、切片策略、检索召回、重排到评测闭环，这份清单把 RAG 上线前必须拍板的项逐条列清。',
    kind: 'article', articleHasCover: false, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Ph2aR4',
    rating: 5, replies: 19, links: 6, shares: 11, saves: 62, likes: 201,
    shop: { price: 120, rebatePercent: 40, partnerRebatePercent: 10, stock: 300 },
  },
  {
    id: 'shop-ph-locked', author: '极客前沿', time: '11 天前',
    title: '2025 技术书单完整版（含封面图）。帖子配图全部付费可见，商城列表展示默认小黄车占位封面。',
    kind: 'image', imageCount: 4, visiblePercent: 0, isNode: true, stakeTier: 1000, nodeId: 'Ph3lK7',
    rating: 3, replies: 27, links: 14, shares: 9, saves: 71, likes: 189,
    shop: { price: 560, rebatePercent: 30, partnerRebatePercent: 10, stock: 80 },
  },
  {
    id: 'shop-ph-video', author: '产品大叔严磊', time: '12 天前',
    title: 'B 端留存复盘 · 内部录屏课（无预览帧）。视频封面在付费前不可见，商城卡片走占位图样式。',
    kind: 'video', visiblePercent: 0, isNode: true, stakeTier: 1000, nodeId: 'Ph4vD2',
    rating: 4, replies: 33, links: 8, shares: 15, saves: 95, likes: 256,
    videoUrl: '/mock-video-2.mp4',
    shop: { price: 1500, rebatePercent: 25, partnerRebatePercent: 10, stock: 30 },
  },
  {
    id: 'shop-mug', author: '拾光杂货铺', time: '4 小时前',
    title: '「知识星探」联名马克杯 · 陶瓷 400ml。附赠贴纸一套，晒单返优点。图为实拍，颜色以实物为准。',
    kind: 'image', imageCount: 3, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Sg9pL3',
    rating: 5, replies: 24, links: 12, shares: 8, saves: 66, likes: 188, tipsReceived: 12,
    shop: { price: 800, rebatePercent: 30, partnerRebatePercent: 10, stock: 120 },
  },
  {
    id: 'shop-mine', author: CURRENT_USER, time: '1 天前',
    title: '我的手作机械键盘（客制化 · 静电容轴）。整套含卫星轴调教与消音棉，支持改键。下单请备注配列。',
    kind: 'image', imageCount: 2, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Mk2wQ8',
    rating: 5, replies: 9, links: 5, shares: 3, saves: 41, likes: 132,
    shop: { price: 12000, rebatePercent: 20, partnerRebatePercent: 10, stock: 5 },
  },
  {
    id: 'shop-notebook', author: '拾光杂货铺', time: '6 小时前',
    title: '手账本 A5 · 牛皮纸封面。内页 80g 道林纸，无酸墨水不洇墨。附赠 3 支彩墨钢笔一套。',
    kind: 'image', imageCount: 4, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Nb4rT6',
    rating: 5, replies: 31, links: 9, shares: 14, saves: 88, likes: 234,
    shop: { price: 480, rebatePercent: 35, partnerRebatePercent: 10, stock: 200 },
  },
  {
    id: 'shop-desk-mat', author: '游牧开发者', time: '2 天前',
    title: '超大桌垫 900×400mm。细面微粒材质，防滑底，锁边处理。颜色：墨绿 / 深灰 / 米白可选。',
    kind: 'image', imageCount: 3, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Dm7sP3',
    rating: 4, replies: 17, links: 6, shares: 11, saves: 59, likes: 163,
    shop: {
      rebatePercent: 25,
      partnerRebatePercent: 10,
      variants: [
        { id: 'dm-green', label: '墨绿', price: 360, stock: 30 },
        { id: 'dm-gray', label: '深灰', price: 360, stock: 25 },
        { id: 'dm-beige', label: '米白', price: 380, stock: 25 },
      ],
    },
  },
  {
    id: 'shop-poster', author: '设计师刘然', time: '3 天前',
    title: '「系统思维」极简主义装饰海报 A3。哑光铜版纸印刷，颜色准且不反光。',
    kind: 'image', imageCount: 2, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Ps2xQ9',
    rating: 5, replies: 22, links: 8, shares: 19, saves: 76, likes: 207,
    shop: { price: 280, rebatePercent: 30, partnerRebatePercent: 10, stock: 150 },
  },
  {
    id: 'shop-stand', author: '极客前沿', time: '4 天前',
    title: '铝合金笔记本支架 · 可折叠。六档角度调节，散热镂空设计，收纳厚度仅 1.2cm。',
    kind: 'image', imageCount: 5, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'St5hL1',
    rating: 4, replies: 38, links: 11, shares: 26, saves: 112, likes: 318,
    shop: { price: 1200, rebatePercent: 20, partnerRebatePercent: 10, stock: 40 },
  },
  {
    id: 'shop-cable', author: '深海鱼炸弹', time: '5 天前',
    title: '编织数据线 1.5m · USB-C to USB-C。240W 快充，10Gbps 传输，兼容 PD / PPS。颜色随机发货。',
    kind: 'image', imageCount: 3, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Cb9wZ4',
    rating: 4, replies: 14, links: 4, shares: 8, saves: 43, likes: 119,
    shop: { price: 150, rebatePercent: 40, partnerRebatePercent: 10, stock: 500 },
  },
  {
    id: 'shop-candle', author: '拾光杂货铺', time: '6 天前',
    title: '大豆蜡香薰蜡烛 200g。香调：白茶 + 雪松，燃烧时长约 45 小时。附赠礼盒包装。',
    kind: 'image', imageCount: 4, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Cn3vR7',
    rating: 5, replies: 29, links: 7, shares: 22, saves: 94, likes: 271,
    shop: { price: 680, rebatePercent: 35, partnerRebatePercent: 10, stock: 60 },
  },
  {
    id: 'shop-prompt-book', author: 'AI 效率研究所', time: '7 天前',
    title: '《Prompt 工程师手册》实体版 · 精装。128 页，涵盖 Claude / GPT / Gemini 三大平台，每章附可撕便利贴索引。',
    kind: 'image', imageCount: 6, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Pb6mN2',
    rating: 5, replies: 45, links: 16, shares: 31, saves: 138, likes: 392,
    shop: { price: 980, rebatePercent: 30, partnerRebatePercent: 10, stock: 100 },
  },
  {
    id: 'shop-wallpaper', author: '设计师刘然', time: '8 天前',
    title: '知识宇宙主题壁纸包 · 50 张。4K 分辨率，含手机横版 / 竖版 / 桌面三套，zip 下载码随订单发送。',
    kind: 'image', imageCount: 9, visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Wp1cK8',
    rating: 4, replies: 18, links: 5, shares: 13, saves: 67, likes: 182,
    shop: { price: 200, rebatePercent: 50, partnerRebatePercent: 10, stock: 999 },
  },
  {
    id: 'p7', author: '产品大叔严磊', time: '3 天前',
    title: '我是如何把一个 B 端产品用户留存从 12% 提到 67% 的？\n18 个月的数据与方法论，视频完整复盘。',
    kind: 'video', visiblePercent: 30, isNode: true, stakeTier: 100, nodeId: 'nM4gJs',
    rating: 1, replies: 58, links: 21, shares: 44, saves: 117, likes: 100000000000000,
    videoUrl: '/mock-video-2.mp4',
    channelId: 'channel-yanlei', minTierIndex: 1,
  },
  {
    id: 'p2', author: '阿May的研究笔记', time: '5 小时前',
    title: '一文读懂 RAG 技术：原理、应用场景与落地实践\n结合项目经验，拆解 RAG 如何让大模型「更懂你的知识」，\n附开源方案与资源清单。',
    articlePreview: 'RAG（Retrieval-Augmented Generation，检索增强生成）是一种将信息检索与文本生成相结合的技术范式。它通过从外部知识库中检索相关文档片段，将其作为上下文注入到大语言模型中，从而提升生成内容的准确性、时效性和可解释性。',
    kind: 'article', visiblePercent: 30, isNode: true, stakeTier: 100, nodeId: 'aB9fNz',
    rating: 1, replies: 62, links: 37, shares: 22, saves: 98, likes: 214,
  },
  // ── 图文锁定状态演示（四种可见比例：0/1/2/3 张可见，共 4 张）──
  {
    id: 'lock-i0', author: '极客前沿', time: '1 小时前',
    title: '2025 年最值得精读的 10 本技术书单（完整版）\n涵盖系统设计、AI 工程、产品思维三大方向，附每本核心摘要。',
    kind: 'image', imageCount: 4, visiblePercent: 0, isNode: true, stakeTier: 1000, nodeId: 'Rk3mP9',
    rating: 3, replies: 31, links: 24, shares: 19, saves: 88, likes: 245,
    channelId: 'channel-jike', minTierIndex: 3,
  },
  {
    id: 'lock-i25', author: '深海鱼炸弹', time: '2 小时前',
    title: '从 0 构建个人知识库：Obsidian + AI 全流程演示\n工具链配置 / 笔记结构 / 自动标签，完整复盘。',
    kind: 'image', imageCount: 4, visiblePercent: 25, isNode: true, stakeTier: 100, nodeId: 'Wc5hX2',
    rating: 2, replies: 47, links: 18, shares: 33, saves: 104, likes: 317,
  },
  {
    id: 'lock-i50', author: '阿May的研究笔记', time: '5 小时前',
    title: 'Prompt 工程师成长路径：从入门到精通的完整地图\n附 50 个实战场景模板与评测方法论。',
    kind: 'image', imageCount: 4, visiblePercent: 50, isNode: true, stakeTier: 10, nodeId: 'Jn8vQ4',
    rating: 4, replies: 56, links: 31, shares: 27, saves: 136, likes: 402,
    channelId: 'channel-amay', minTierIndex: 1,
  },
  {
    id: 'lock-i75', author: '游牧开发者', time: '8 小时前',
    title: '独立开发者如何做增长：真实案例拆解\n用户获取 / 留存 / 变现全漏斗，数据驱动的完整复盘。',
    kind: 'image', imageCount: 4, visiblePercent: 75, isNode: false, stakeTier: 0,
    rating: 0, replies: 29, links: 0, shares: 21, saves: 67, likes: 198,
  },
  // ── 图片张数演示帖（1–9 张）────────────────────────────────────
  {
    id: 'im1', author: '游牧开发者', time: '30 分钟前',
    title: '年度书单：一张图总结 2024 读过最好的书。',
    kind: 'image', imageCount: 1, imageAspect: 'tall', visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 7, links: 0, shares: 5, saves: 31, likes: 88,
  },
  {
    id: 'im2', author: '设计师刘然', time: '1 小时前',
    title: '两款 Markdown 编辑器正面对比：Obsidian vs Notion。用了各自 3 个月后的真实体验。',
    kind: 'image', imageCount: 2, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 14, links: 0, shares: 9, saves: 47, likes: 132,
  },
  {
    id: 'im3', author: '极客前沿', time: '2 小时前',
    title: '三种远程工作桌面布局实测：哪种最护腰？高度 / 光线 / 显示器距离全记录。',
    kind: 'image', imageCount: 3, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 22, links: 0, shares: 17, saves: 68, likes: 204,
    channelId: 'channel-jike',
  },
  {
    id: 'im4', author: 'AI 效率研究所', time: '3 小时前',
    title: '四个季度 OKR 完成率对比，用数据说话——哪个季度最打脸？',
    kind: 'image', imageCount: 4, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 19, links: 0, shares: 11, saves: 53, likes: 157,
  },
  {
    id: 'im5', author: '阿May的研究笔记', time: '4 小时前',
    title: '横评五款 AI 写作工具：Claude / GPT-4o / Gemini / Kimi / 文心，真实输出截图对比。',
    kind: 'image', imageCount: 5, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 41, links: 0, shares: 28, saves: 119, likes: 367,
    channelId: 'channel-amay',
  },
  {
    id: 'im6', author: '深海鱼炸弹', time: '5 小时前',
    title: '独立开发第 180 天打卡。六个月，每天一截图，产品从 0 到第一个付费用户的完整记录。',
    kind: 'image', imageCount: 6, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 33, links: 0, shares: 24, saves: 91, likes: 278,
  },
  {
    id: 'im7', author: '产品大叔严磊', time: '6 小时前',
    title: '七天读完《原则》精华：每天最触动我的一页，附思维导图片段。',
    kind: 'image', imageCount: 7, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 28, links: 0, shares: 16, saves: 74, likes: 221,
    channelId: 'channel-yanlei',
  },
  {
    id: 'im8', author: '游牧开发者', time: '8 小时前',
    title: '深圳 8 家联合办公测评：座位 / WiFi / 噪音 / 价格全维度横评，附定位信息。',
    kind: 'image', imageCount: 8, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 52, links: 0, shares: 35, saves: 143, likes: 412,
  },
  {
    id: 'im9', author: '设计师刘然', time: '10 小时前',
    title: '九个让我效率翻倍的 Mac 桌面插件，每一个都在用。附图展示工作流集成效果。',
    kind: 'image', imageCount: 9, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 67, links: 0, shares: 48, saves: 189, likes: 534,
  },
  {
    id: 'p3', author: '深海鱼炸弹', time: '1 天前',
    title: 'Web3 社区运营其实就三件事：内容节奏、激励设计、关键人引入。\n节奏乱了什么激励都救不了。踩了半年坑才想明白这个。',
    kind: 'text', visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 11, links: 0, shares: 7, saves: 28, likes: 59,
  },
  {
    id: 'p4', author: '游牧开发者', time: '1 天前',
    title: '做了 3 年独立产品，总结出一个反直觉的规律：\n用户不是因为功能多而留下，而是因为有一件事做得极好。',
    kind: 'text', visiblePercent: 30, isNode: true, stakeTier: 100, nodeId: '3wQpL8',
    rating: 3, replies: 47, links: 29, shares: 18, saves: 86, likes: 173,
    // 演示：原帖已下架，仅在转发过它的当前用户「转发」列表里保留占位记录
    deleted: true,
  },
  {
    id: 'p5', author: '设计师刘然', time: '2 天前',
    title: 'Figma → 代码 全流程记录\n从组件规范到自动生成 design tokens，\n附插件清单与踩坑笔记。',
    kind: 'image', imageCount: 3, visiblePercent: 20, isNode: true, stakeTier: 10, nodeId: 'Vy6cT1',
    rating: 2, replies: 33, links: 18, shares: 14, saves: 61, likes: 128,
  },
  {
    id: 'p6', author: '极客前沿', time: '2 天前',
    title: 'LLM Agent 实战：从零搭建能自动写代码的 AI 助手\n完整展示 tool-use 调用链路，含代码和 Demo 演示。',
    kind: 'video', visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 24, links: 0, shares: 31, saves: 74, likes: 209,
    videoUrl: '/mock-video.mp4',
    channelId: 'channel-jike', minTierIndex: 2,
  },
  {
    id: 'p8', author: '阿May的研究笔记', time: '3 天前',
    title: '今天被一句话点醒：「工具是思维的外化」。\n我们选什么工具，其实是在选什么思维方式。',
    kind: 'text', visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 19, links: 0, shares: 9, saves: 43, likes: 88,
  },
  {
    id: 'p9', author: CURRENT_USER, time: '4 天前',
    title: '读书笔记 × 可视化：把《思考，快与慢》画成一张图\n用概念图梳理双系统理论，附可下载的模板文件。',
    articlePreview: '丹尼尔·卡尼曼在《思考，快与慢》中提出了双系统理论：系统 1 负责自动、直觉、快速的判断，系统 2 负责理性、分析、缓慢的思考。把这些概念画成图之后，会更容易看清启发式、偏见、前景理论和峰终定律之间的关系。',
    kind: 'article', visiblePercent: 100, isNode: true, stakeTier: 1000, nodeId: 'Zd0Hk5',
    rating: 2, replies: 41, links: 15, shares: 27, saves: 93, likes: 184, tipsReceived: 200,
  },
  {
    id: 'p10', author: '产品大叔严磊', time: '6 小时前',
    title: '产品周报到底该怎么写，团队才真的会看？\n我把自己这两年反复重写后的结构拆开讲，适合 PM / 运营 / 创业团队直接套用。',
    articlePreview: '多数周报没人看，不是因为大家不重视同步，而是因为内容没有帮助读者更快做判断。真正有效的周报，要先讲这周最重要的变化，再明确哪些地方需要协作或拍板，最后只保留那些会影响下周节奏的推进点。',
    kind: 'article', articleHasCover: false, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 16, links: 0, shares: 12, saves: 57, likes: 143,
  },
  // ── 当前用户自己发布的节点帖子（演示可见百分比标签）──────────────────
  {
    id: 'own-10', author: CURRENT_USER, time: '1 小时前',
    title: '这才是做笔记的正确姿势：卡片笔记法实战指南\n跟着做了一周，信息整理效率提高了一倍。',
    kind: 'text', visiblePercent: 10, isNode: true, stakeTier: 10, nodeId: 'Vx8mK3',
    rating: 2, replies: 8, links: 3, shares: 5, saves: 23, likes: 67, tipsReceived: 30,
  },
  {
    id: 'own-50', author: CURRENT_USER, time: '2 小时前',
    title: '2025 年个人阅读 Top 5 书单\n每一本都值得反复读，附精读笔记链接。',
    kind: 'image', imageCount: 3, visiblePercent: 50, isNode: true, stakeTier: 100, nodeId: 'Jn9pQ2',
    rating: 1, replies: 12, links: 7, shares: 9, saves: 41, likes: 103, tipsReceived: 120,
  },
  // ── 本人演示频道 mock 帖（频道详情页「免费 / 会员」筛选有内容可看）──
  {
    id: 'me1-free-1', author: CURRENT_USER, time: '40 分钟前',
    title: '本周灵感碎片：把「做完」定义得更小一点\n连续三天卡住同一个方案，后来发现是目标太大，拆成 25 分钟就能推进。',
    kind: 'text', visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 6, links: 0, shares: 4, saves: 18, likes: 52, tipsReceived: 10,
    channelId: 'channel-me-1',
  },
  {
    id: 'me1-free-2', author: CURRENT_USER, time: '昨天',
    title: '频道开张第一帖：我会在这里更新什么？\n产品思考、阅读摘录、偶尔的工具测评——先从公开免费内容开始。',
    kind: 'image', imageCount: 2, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 9, links: 0, shares: 7, saves: 26, likes: 74,
    channelId: 'channel-me-1',
  },
  {
    id: 'me1-free-3', author: CURRENT_USER, time: '3 天前',
    title: '一张图说清我最近的信息流结构\nInbox → 暂存 → 主题库，尽量少让未处理的东西过夜。',
    kind: 'image', imageCount: 1, visiblePercent: 100, isNode: true, stakeTier: 10, nodeId: 'Me1aK2',
    rating: 1, replies: 11, links: 4, shares: 8, saves: 33, likes: 91, tipsReceived: 20,
    channelId: 'channel-me-1',
  },
  {
    id: 'me2-free-1', author: CURRENT_USER, time: '5 小时前',
    title: '会员频道也会发公开预告：下周专题预告\n主题是「如何写一份别人愿意读完的周报」，会员档会放完整模板。',
    kind: 'text', visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 5, links: 0, shares: 3, saves: 14, likes: 41,
    channelId: 'channel-me-2',
  },
  {
    id: 'me2-sub-1', author: CURRENT_USER, time: '昨天',
    title: '【会员专属】周报模板完整版 + 填写示例\n含可复制大纲、常见踩坑，以及我自己用过的两份真实样例。',
    kind: 'image', imageCount: 3, visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 14, links: 0, shares: 6, saves: 48, likes: 126,
    channelId: 'channel-me-2', minTierIndex: 1,
  },
  {
    id: 'me2-sub-2', author: CURRENT_USER, time: '4 天前',
    title: '【会员专属】幕后笔记：这条选题是怎么筛出来的\n从 12 个备选缩到 1 个的判断标准，公开帖不会写这么细。',
    kind: 'text', visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 8, links: 0, shares: 2, saves: 29, likes: 67,
    channelId: 'channel-me-2', minTierIndex: 1,
  },
  // ── 知识确权认证演示帖（当前用户）：pending / burned 两态 ──
  {
    id: 'cert-pending-1', author: CURRENT_USER, time: '3 小时前',
    title: '从零搭建个人知识库：工具选型与目录结构实践\n记录了三次推倒重来后，最终稳定下来的一套方法论。',
    articlePreview: '知识库最容易崩的地方不是工具，而是目录结构。这篇复盘了从大而全到按项目切分的演变过程，附可直接套用的目录模板。',
    kind: 'article', visiblePercent: 100, isNode: true, stakeTier: 100, nodeId: 'Kb3mZ7',
    rating: 3, replies: 22, links: 9, shares: 14, saves: 51, likes: 132,
  },
  {
    id: 'cert-burned-1', author: CURRENT_USER, time: '9 天前',
    title: '效率工具横评：5 款笔记软件深度体验\n用了三个月才敢下结论，附打分表。',
    articlePreview: '从编辑体验、同步速度、跨端一致性到导出自由度，五款主流笔记软件的真实使用对比。',
    kind: 'article', visiblePercent: 100, isNode: true, stakeTier: 100, nodeId: 'Ef6nQ1',
    rating: 2, replies: 15, links: 5, shares: 8, saves: 33, likes: 145,
  },

];


export const POST_REPLIES: Record<string, Reply[]> = {
  p1: [
    { id: 'r1a', author: '游牧开发者', time: '1 小时前', text: '这个模板真的太有用了，拿来即用！', avatarIdx: 1, likes: 12 },
    { id: 'r1b', author: '深海鱼炸弹', time: '2 小时前', text: '哪个工具最好用？最近在对比 Claude 和 GPT-4o。', avatarIdx: 2, likes: 8, channelTierName: '金牌' },
    { id: 'r1c', author: '极客前沿', time: '2 小时前', text: '提示词模板那部分很有价值，已收藏。', avatarIdx: 0, likes: 15, channelTierName: '金牌' },
    { id: 'r1d', author: '设计师刘然', time: '2 小时前', text: '我也整理过类似的合集，感觉你总结的更系统一些。', avatarIdx: 0, likes: 6 },
    { id: 'r1e', author: '产品大叔严磊', time: '3 小时前', text: '对 B 端产品设计有很好的借鉴作用，马住！', avatarIdx: 1, likes: 3, channelTierName: '铜牌' },
    { id: 'r1f', author: '阿May的研究笔记', time: '3 小时前', text: '实测了几个模板，效果确实比自己瞎写的要好。', avatarIdx: 1, likes: 7 },
    { id: 'r1g', author: '游牧开发者', time: '4 小时前', text: '太强了！正好在写项目文档，太需要这个了。', avatarIdx: 2, likes: 0 },
    { id: 'r1h', author: '深海鱼炸弹', time: '4 小时前', text: '已经转发给同事，大家都说总结得很接地气。', avatarIdx: 2, likes: 2 },
    { id: 'r1i', author: '极客前沿', time: '5 小时前', text: '赞，期待下一次的更新，最好能有长文分析。', avatarIdx: 0, likes: 4 },
    { id: 'r1j', author: '设计师刘然', time: '5 小时前', text: '已链接支持！节点编号是 Kx7mR2 吧？', avatarIdx: 0, likes: 1 },
    { id: 'r1k', author: '产品大叔严磊', time: '6 小时前', text: '这种结构化提示词确实是未来的趋势。', avatarIdx: 1, likes: 5 },
    { id: 'r1l', author: '阿May的研究笔记', time: '6 小时前', text: '请问这些截图有更清晰的打包下载地址吗？', avatarIdx: 1, likes: 0 },
    { id: 'r1m', author: '极客前沿', time: '7 小时前', text: '二刷此文，每一次都有新的启发。', avatarIdx: 2, likes: 9 },
    { id: 'r1n', author: '深海鱼炸弹', time: '7 小时前', text: '非常实用的提问技巧，很多运营同事也该看看。', avatarIdx: 2, likes: 0 },
    { id: 'r1o', author: '游牧开发者', time: '8 小时前', text: '感觉这个激励机制很好玩，我也去发个贴。', avatarIdx: 0, likes: 0 },
    { id: 'r1p', author: '设计师刘然', time: '8 小时前', text: '收藏了，准备跟着你的模板一行行练习。', avatarIdx: 0, likes: 3 },
    { id: 'r1q', author: '产品大叔严磊', time: '9 小时前', text: '大佬有讨论群吗？想交流一下 AI 工作的心得。', avatarIdx: 1, likes: 1 },
    { id: 'r1r', author: '阿May的研究笔记', time: '9 小时前', text: '支持知识付费！物超所值。', avatarIdx: 1, likes: 11 },
  ],
  p2: [
    { id: 'r2a', author: '设计师刘然', time: '4 小时前', text: 'RAG 配合私有知识库效果翻倍，推荐哪个向量数据库？', avatarIdx: 2, likes: 14 },
    { id: 'r2b', author: '产品大叔严磊', time: '5 小时前', text: '讲得比之前看过的都清楚，已转发给团队。', avatarIdx: 1, likes: 5 },
  ],
  p3: [{ id: 'r3a', author: CURRENT_USER, time: '22 小时前', text: '内容节奏这块感同身受，节奏一乱全盘皆输。', avatarIdx: 0, likes: 3 }],
  p4: [
    { id: 'r4a', author: '设计师刘然', time: '23 小时前', text: '之前就踩了功能堆砌的坑，这个规律太扎心了。', avatarIdx: 2, likes: 18 },
    { id: 'r4b', author: '阿May的研究笔记', time: '1 天前', text: '「把一件事做到极好」赞同，做产品的北极星。', avatarIdx: 1, likes: 7 },
  ],
  p5: [{ id: 'r5a', author: '游牧开发者', time: '1 天前', text: '设计 token 系统这套工作流学到了，下个项目试试。', avatarIdx: 1, likes: 4 }],
  p6: [
    { id: 'r6a', author: CURRENT_USER, time: '2 天前', text: 'tool-use 那段讲得非常清楚，有没有开源版本？', avatarIdx: 0, likes: 22 },
    { id: 'r6b', author: '深海鱼炸弹', time: '2 天前', text: 'Demo 链接能分享出来吗？', avatarIdx: 2, likes: 6, channelTierName: '银牌' },
  ],
  p7: [
    { id: 'r7a', author: CURRENT_USER, time: '2 天前', text: '12% 到 67%，这个增幅太惊人了，方法论帖子什么时候出？', avatarIdx: 0, likes: 31 },
    { id: 'r7b', author: '深海鱼炸弹', time: '3 天前', text: '纯视频复盘形式很好，配合数据说服力更强。', avatarIdx: 2, likes: 9 },
  ],
  p8: [{ id: 'r8a', author: '游牧开发者', time: '3 天前', text: '「工具是思维的外化」——记下来了，深刻。', avatarIdx: 1, likes: 16 }],
  p9: [
    { id: 'r9a', author: '极客前沿', time: '3 天前', text: '双系统可视化角度很有趣，模板在哪里下载？', avatarIdx: 0, likes: 11 },
    { id: 'r9b', author: '产品大叔严磊', time: '4 天前', text: '这种知识图谱笔记形式，我也要试试。', avatarIdx: 1, likes: 0 },
  ],
  p10: [
    { id: 'r10a', author: '阿May的研究笔记', time: '5 小时前', text: '这个结构很适合跨团队同步，我准备下周直接照着改。', avatarIdx: 1, likes: 9 },
    { id: 'r10b', author: '游牧开发者', time: '5 小时前', text: '“周报不是留档工具”这句很准，很多团队就是卡在这里。', avatarIdx: 2, likes: 4 },
  ],
};

// 模块级存储：SPA 导航不重载模块，下次进入页面时可读到上次点赞结果
export const replyLikesStore: Record<string, number> = {};
export const likedReplyIdsStore = new Set<string>();

/** 当前用户发出的打赏 mock：含帖子打赏与用户主页打赏两类 */
export const MOCK_OUTGOING_TIPS: OutgoingTip[] = [
  {
    id: 'ot1',
    recipientName: 'AI 效率研究所',
    amount: 100,
    context: 'post',
    postId: 'p1',
    postTitle: 'AI 产品截图 × 提示词模板合集。精选 12 款工具的实测截图，附 3 个月高频使用总结的提示词模板，拿来即用。',
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: 'ot2',
    recipientName: '阿May的研究笔记',
    amount: 50,
    context: 'author',
    createdAt: Date.now() - 5 * 60 * 60 * 1000,
  },
  {
    id: 'ot3',
    recipientName: '产品大叔严磊',
    amount: 500,
    context: 'post',
    postId: 'p7',
    postTitle: '我是如何把一个 B 端产品用户留存从 12% 提到 67% 的？\n18 个月的数据与方法论，视频完整复盘。',
    createdAt: Date.now() - 26 * 60 * 60 * 1000,
  },
  {
    id: 'ot4',
    recipientName: '极客前沿',
    amount: 10,
    context: 'author',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'ot5',
    recipientName: '游牧开发者',
    amount: 50,
    context: 'post',
    postId: 'p4',
    postTitle: '做了 3 年独立产品，总结出一个反直觉的规律：\n用户不是因为功能多而留下，而是因为有一件事做得极好。',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
];

// ── 互动通知（针对当前用户帖子 p9）──────────────────────────────
export const ACTIVITY_GROUPS: ActivityGroup[] = [
  {
    id: 'ags1', type: 'subscribe', time: '30 分钟前', isRead: false,
    actors: [{ user: '游牧开发者', avatarIdx: 2 }],
    channelName: `${DEFAULT_WALLET_DISPLAY}的频道`,
    tierName: '银牌',
  },
  {
    id: 'ags2', type: 'subscribe', time: '5 小时前', isRead: false,
    actors: [{ user: '产品大叔严磊', avatarIdx: 2 }, { user: '设计师刘然', avatarIdx: 0 }],
    channelName: `${DEFAULT_WALLET_DISPLAY}的频道`,
    tierName: '铜牌',
  },
  {
    id: 'agt1', type: 'tip', postId: 'p9', time: '1 小时前', isRead: false,
    actors: [{ user: '阿May的研究笔记', avatarIdx: 1 }],
    tipAmount: 100,
    tipMessage: '这篇写得太到位了，双系统理论配上这张图一下就理解了，冲！',
  },
  {
    id: 'agt2', type: 'tip', postId: 'p9', time: '2 小时前', isRead: false,
    actors: [{ user: '极客前沿', avatarIdx: 1 }, { user: '游牧开发者', avatarIdx: 2 }],
    tipAmount: 50,
  },
  {
    id: 'ag1', type: 'like', postId: 'p9', time: '3 小时前', isRead: false,
    actors: [{ user: '极客前沿', avatarIdx: 1 }, { user: '产品大叔严磊', avatarIdx: 2 }, { user: '深海鱼炸弹', avatarIdx: 0 }],
  },
  {
    id: 'agc1', type: 'comment', postId: 'p9', time: '4 小时前', isRead: false,
    actors: [{ user: '游牧开发者', avatarIdx: 2 }],
    commentText: '这个双系统概念图太清晰了，收藏！',
  },
  {
    id: 'ag2', type: 'save', postId: 'p9', time: '6 小时前', isRead: false,
    actors: [{ user: '阿May的研究笔记', avatarIdx: 1 }],
  },
  {
    id: 'agc2', type: 'comment', postId: 'p9', time: '7 小时前', isRead: false,
    actors: [{ user: '设计师刘然', avatarIdx: 0 }],
    commentText: '模板文件可以分享一下吗？',
  },
  {
    id: 'ag3', type: 'share', postId: 'p9', time: '8 小时前', isRead: false,
    actors: [{ user: '游牧开发者', avatarIdx: 2 }],
  },
  {
    id: 'agl1', type: 'link', postId: 'p9', time: '9 小时前', isRead: false,
    actors: [{ user: '深海鱼炸弹', avatarIdx: 0 }, { user: '设计师刘然', avatarIdx: 0 }, { user: '极客前沿', avatarIdx: 1 }],
  },
  {
    id: 'ag4', type: 'like', postId: 'p9', time: '1 天前', isRead: true,
    actors: [{ user: '设计师刘然', avatarIdx: 0 }, { user: '阿May的研究笔记', avatarIdx: 1 }, { user: '游牧开发者', avatarIdx: 2 }],
  },
  {
    id: 'agc3', type: 'comment', postId: 'p9', time: '1 天前', isRead: true,
    actors: [{ user: '极客前沿', avatarIdx: 1 }],
    commentText: '《思考快与慢》也是我的年度书单，这个总结角度很独特',
  },
  {
    id: 'ag5', type: 'save', postId: 'p9', time: '2 天前', isRead: true,
    actors: [{ user: '产品大叔严磊', avatarIdx: 2 }, { user: '极客前沿', avatarIdx: 1 }, { user: '游牧开发者', avatarIdx: 2 }],
  },
  {
    id: 'ag6', type: 'share', postId: 'p9', time: '3 天前', isRead: true,
    actors: [{ user: '深海鱼炸弹', avatarIdx: 0 }, { user: '设计师刘然', avatarIdx: 0 }],
  },
  {
    id: 'agl2', type: 'link', postId: 'p9', time: '3 天前', isRead: true,
    actors: [{ user: '产品大叔严磊', avatarIdx: 2 }],
  },
  {
    id: 'ag7', type: 'like', postId: 'p9', time: '4 天前', isRead: true,
    actors: [{ user: '产品大叔严磊', avatarIdx: 2 }],
  },
  {
    id: 'agt3', type: 'tip', postId: 'p9', time: '4 天前', isRead: true,
    actors: [{ user: '深海鱼炸弹', avatarIdx: 0 }, { user: '设计师刘然', avatarIdx: 0 }, { user: '产品大叔严磊', avatarIdx: 2 }],
    tipAmount: 50,
  },
];

export const ALL_USERS_MOCK: UserListItem[] = [
  { name: 'AI 效率研究所', desc: '专注 AI 工具提效与工作流拆解', avatarIdx: 0 },
  { name: '阿May的研究笔记', desc: 'RAG 与大模型技术专家', avatarIdx: 1 },
  { name: '游牧开发者', desc: '独立开发者，专注优质工具开发', avatarIdx: 2 },
  { name: '设计师刘然', desc: 'Figma 深度用户，组件化开发先锋', avatarIdx: 0 },
  { name: '极客前沿', desc: '追踪 LLM / Agent 业界最前沿动态', avatarIdx: 1 },
  { name: '产品大叔严磊', desc: '10 年 B 端产品经理，分享数据方法论', avatarIdx: 2 },
  { name: '深海鱼炸弹', desc: 'Web3 社区运营，精通流量变现逻辑', avatarIdx: 0 },
  { name: CURRENT_USER, desc: '独立创作者，关注知识管理与可视化表达', avatarIdx: 1 },
];

// ── 其他用户的转发记录（author → 转发的帖子 id 列表）──────────────
// 用于在 feed / 他人主页「帖子」列表中展示「XX 转发了」标识，与 POST_ACTORS.p9.shares 保持一致
export const AUTHOR_REPOSTS: Record<string, string[]> = {
  '游牧开发者': ['p9', 'p1'],
  '深海鱼炸弹': ['p9'],
  '设计师刘然': ['p9'],
  '阿May的研究笔记': ['p6'],
  '产品大叔严磊': ['p1'],
};

// ── 帖子互动名单（第二层：点击数字查看完整名单）──────────────────
export const POST_ACTORS: Record<string, PostActors> = {
  p9: {
    links: [
      { user: '极客前沿', avatarIdx: 1, time: '1 小时前' },
      { user: '深海鱼炸弹', avatarIdx: 0, time: '4 小时前' },
      { user: '设计师刘然', avatarIdx: 0, time: '1 天前' },
    ],
    likes: [
      { user: '极客前沿', avatarIdx: 1, time: '3 小时前' },
      { user: '产品大叔严磊', avatarIdx: 2, time: '3 小时前' },
      { user: '深海鱼炸弹', avatarIdx: 0, time: '5 小时前' },
      { user: '设计师刘然', avatarIdx: 0, time: '12 小时前' },
      { user: '阿May的研究笔记', avatarIdx: 1, time: '1 天前' },
      { user: '游牧开发者', avatarIdx: 2, time: '2 天前' },
    ],
    dislikes: [
      { user: '深海鱼炸弹', avatarIdx: 0, time: '7 小时前' },
    ],
    shares: [
      { user: '游牧开发者', avatarIdx: 2, time: '8 小时前' },
      { user: '深海鱼炸弹', avatarIdx: 0, time: '2 天前' },
      { user: '设计师刘然', avatarIdx: 0, time: '3 天前' },
    ],
    saves: [
      { user: '阿May的研究笔记', avatarIdx: 1, time: '6 小时前' },
      { user: '产品大叔严磊', avatarIdx: 2, time: '1 天前' },
      { user: '极客前沿', avatarIdx: 1, time: '2 天前' },
      { user: '游牧开发者', avatarIdx: 2, time: '3 天前' },
    ],
    tips: [
      { user: '阿May的研究笔记', avatarIdx: 1, time: '1 小时前', amount: 100, message: '这篇写得太到位了，冲！' },
      { user: '极客前沿', avatarIdx: 1, time: '2 小时前', amount: 50 },
      { user: '游牧开发者', avatarIdx: 2, time: '2 小时前', amount: 50, message: '收藏了，下次实操试试' },
      { user: '深海鱼炸弹', avatarIdx: 0, time: '4 天前', amount: 30 },
      { user: '设计师刘然', avatarIdx: 0, time: '4 天前', amount: 20 },
    ],
  },
  'own-10': {
    links: [
      { user: '阿May的研究笔记', avatarIdx: 1, time: '30 分钟前' },
      { user: '游牧开发者', avatarIdx: 2, time: '45 分钟前' },
      { user: '设计师刘然', avatarIdx: 0, time: '1 小时前' },
    ],
    likes: [
      { user: '阿May的研究笔记', avatarIdx: 1, time: '20 分钟前' },
      { user: '游牧开发者', avatarIdx: 2, time: '40 分钟前' },
      { user: '设计师刘然', avatarIdx: 0, time: '50 分钟前' },
    ],
    dislikes: [],
    shares: [
      { user: '深海鱼炸弹', avatarIdx: 0, time: '1 小时前' },
    ],
    saves: [
      { user: '极客前沿', avatarIdx: 1, time: '1 小时前' },
    ],
    tips: [
      { user: '阿May的研究笔记', avatarIdx: 1, time: '30 分钟前', amount: 20, message: '卡片笔记法真的有用，已经开始用了' },
      { user: '游牧开发者', avatarIdx: 2, time: '1 小时前', amount: 10 },
    ],
  },
  'own-50': {
    links: [
      { user: '产品大叔严磊', avatarIdx: 2, time: '1 小时前' },
      { user: '阿May的研究笔记', avatarIdx: 1, time: '1 小时前' },
      { user: '极客前沿', avatarIdx: 1, time: '1.5 小时前' },
      { user: '游牧开发者', avatarIdx: 2, time: '1.5 小时前' },
      { user: '深海鱼炸弹', avatarIdx: 0, time: '2 小时前' },
      { user: '设计师刘然', avatarIdx: 0, time: '2 小时前' },
      { user: 'AI 效率研究所', avatarIdx: 0, time: '2 小时前' },
    ],
    likes: [
      { user: '产品大叔严磊', avatarIdx: 2, time: '1 小时前' },
      { user: '阿May的研究笔记', avatarIdx: 1, time: '1.5 小时前' },
    ],
    dislikes: [
      { user: '设计师刘然', avatarIdx: 0, time: '1 小时前' },
    ],
    shares: [
      { user: '游牧开发者', avatarIdx: 2, time: '2 小时前' },
    ],
    saves: [
      { user: '极客前沿', avatarIdx: 1, time: '2 小时前' },
    ],
    tips: [
      { user: '产品大叔严磊', avatarIdx: 2, time: '1 小时前', amount: 80 },
      { user: '阿May的研究笔记', avatarIdx: 1, time: '2 小时前', amount: 40 },
    ],
  },
};

export const DM_CONVERSATIONS: DmConversation[] = [
  {
    id: 'dm1',
    peer: '阿May的研究笔记',
    peerAvatarIdx: 1,
    lastMessage: '好的，我看一下你的文章！',
    lastTime: '10 分钟前',
    unread: 2,
    messages: [
      { id: 'm1', from: 'me', text: '你好，看了你关于 RAG 技术的文章，写得很棒！', time: '昨天 20:14' },
      { id: 'm2', from: 'peer', text: '谢谢你！写了挺久的，希望对你有帮助', time: '昨天 20:31' },
      { id: 'm3', from: 'me', text: '有个问题想请教：分块策略那部分你们实际用多大的 chunk size？', time: '昨天 20:35' },
      { id: 'm4', from: 'peer', text: '我们用 512 tokens，重叠 10%，效果还不错', time: '昨天 21:02' },
      { id: 'm5', from: 'peer', text: '对了，我刚更新了一篇混合检索的实践，你可以看看', time: '10 分钟前' },
      { id: 'm6', from: 'peer', text: '好的，我看一下你的文章！', time: '10 分钟前' },
    ],
  },
  {
    id: 'dm2',
    peer: '产品大叔严磊',
    peerAvatarIdx: 2,
    lastMessage: '周五有空聊聊吗？',
    lastTime: '1 小时前',
    unread: 1,
    messages: [
      { id: 'm1', from: 'peer', text: '你好，看了你的 OKR 复盘帖子，很有参考价值', time: '2 天前 14:22' },
      { id: 'm2', from: 'me', text: '谢谢！你的留存率案例我也读了好几遍 😄', time: '2 天前 15:08' },
      { id: 'm3', from: 'peer', text: '哈哈，互相学习。你们团队现在多大规模？', time: '2 天前 15:20' },
      { id: 'm4', from: 'me', text: '目前 8 人，还在扩张中', time: '2 天前 15:45' },
      { id: 'm5', from: 'peer', text: '周五有空聊聊吗？', time: '1 小时前' },
    ],
  },
  {
    id: 'dm3',
    peer: '游牧开发者',
    peerAvatarIdx: 2,
    lastMessage: '已收到，感谢！',
    lastTime: '3 天前',
    unread: 0,
    messages: [
      { id: 'm1', from: 'peer', text: '想问一下你用的是哪个向量数据库？', time: '4 天前 09:11' },
      { id: 'm2', from: 'me', text: '我们用 Chroma，轻量，适合小团队原型开发', time: '4 天前 09:34' },
      { id: 'm3', from: 'peer', text: '了解，我也在评估 Qdrant，听说性能更好', time: '4 天前 10:00' },
      { id: 'm4', from: 'me', text: '是的，Qdrant 生产环境更稳，可以试试', time: '4 天前 10:22' },
      { id: 'm5', from: 'peer', text: '已收到，感谢！', time: '3 天前' },
    ],
  },
];

// ── 小黄车：收货地址 + 订单种子数据 ──────────────────────────────
export const MOCK_SHIPPING_ADDRESSES: ShippingAddress[] = [
  { id: 'addr1', name: '苏晓', phone: '138****6621', region: '上海 上海市 浦东新区', detail: '世纪大道 100 号 环球金融中心 32F', isDefault: true },
  { id: 'addr2', name: '苏晓（公司）', phone: '139****0075', region: '广东 深圳 南山区', detail: '科技园 T3 栋 1801' },
];

/** 演示订单：既有当前用户「我买的」，也有「我卖的」，覆盖各状态 */
export const MOCK_SHOP_ORDERS: ShopOrder[] = [
  // 我买的
  {
    id: 'ord-1001', postId: 'shop-mug', productTitle: '「知识星探」联名马克杯 · 陶瓷 400ml', productKind: 'image',
    sellerName: '拾光杂货铺', buyerName: CURRENT_USER,
    unitPrice: 800, unitFee: 0.08, quantity: 2, rebatePercent: 30,
    address: MOCK_SHIPPING_ADDRESSES[0], status: 'shipped', createdAt: Date.now() - 1000 * 60 * 60 * 26,
    carrier: '顺丰速运', trackingNo: 'SF1398820156283', estMerit: 30,
  },
  {
    id: 'ord-1002', postId: 'p1', productTitle: 'AI 产品截图 × 提示词模板合集', productKind: 'image',
    sellerName: 'AI 效率研究所', buyerName: CURRENT_USER,
    unitPrice: 2000, unitFee: 0.2, quantity: 1, rebatePercent: 40,
    address: MOCK_SHIPPING_ADDRESSES[0], status: 'to_ship', createdAt: Date.now() - 1000 * 60 * 60 * 3,
    estMerit: 50,
  },
  {
    id: 'ord-1003', postId: 'shop-mug', productTitle: '「知识星探」联名马克杯 · 陶瓷 400ml', productKind: 'image',
    sellerName: '拾光杂货铺', buyerName: CURRENT_USER,
    unitPrice: 800, unitFee: 0.08, quantity: 1, rebatePercent: 30,
    address: MOCK_SHIPPING_ADDRESSES[1], status: 'to_settle', createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
    carrier: '中通快递', trackingNo: 'ZT758210934471', estMerit: 15,
  },
  // 我卖的（商品 shop-mine 由当前用户发布）
  {
    id: 'ord-2001', postId: 'shop-mine', productTitle: '我的手作机械键盘（客制化 · 静电容轴）', productKind: 'image',
    sellerName: CURRENT_USER, buyerName: '深海鱼炸弹',
    unitPrice: 12000, unitFee: 1.2, quantity: 1, rebatePercent: 20,
    address: { id: 'addr-b1', name: '陈先生', phone: '137****4408', detail: '杭州市西湖区文三路 478 号 华星时代广场 A 座 15F' },
    status: 'to_ship', createdAt: Date.now() - 1000 * 60 * 60 * 5, estMerit: 150,
  },
  {
    id: 'ord-2002', postId: 'shop-mine', productTitle: '我的手作机械键盘（客制化 · 静电容轴）', productKind: 'image',
    sellerName: CURRENT_USER, buyerName: '游牧开发者',
    unitPrice: 12000, unitFee: 1.2, quantity: 1, rebatePercent: 20,
    address: { id: 'addr-b2', name: '刘女士', phone: '135****9902', detail: '成都市高新区天府三街 199 号 太平洋保险大厦 20F' },
    status: 'completed', createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    carrier: '京东物流', trackingNo: 'JD0055217788013', estMerit: 150,
  },
];

// ── 知识确权认证：文章满 100 赞后由 cron 铸造的链上 NFT 凭证种子数据 ──
export const MOCK_KNOWLEDGE_CERTS: KnowledgeCert[] = [
  {
    id: 'WV-KC-20260000412', postId: 'p9', status: 'minted', holder: CURRENT_USER,
    issuedAt: Date.now() - 1000 * 60 * 60 * 24 * 3, likesAtMint: 150,
    contentHash: '05bd857af7f70bf51b6aac9d4e112a8f3c7b2e91f4d6a0c8e5b3d2f1a7c9e4b6',
    tokenId: '53234914853141795189840113938456271650482947316',
    txHash: '0xa89df6537e7998a5f9dfb288a9262d80f50c26c60a5174ce1de7a10616c3b95f',
    issuerAddress: '0x0EF376766C69400A8A6C3e92c07eDD18e7d6eA74',
  },
  {
    id: 'WV-KC-20260000198', postId: 'p2', status: 'minted', holder: '阿May的研究笔记',
    issuedAt: Date.now() - 1000 * 60 * 60 * 24 * 11, likesAtMint: 214,
    contentHash: '9e2c6f1a4d7b0834eac5f92d1b6087a3c4e5f60918273645fabc0d1e2f3a4b5',
    tokenId: '41207765218843906612205173390946612053177720184',
    txHash: '0x71bcaa4d61e2f5c8a4b9d0e6f2317c8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
    issuerAddress: '0x0EF376766C69400A8A6C3e92c07eDD18e7d6eA74',
  },
  {
    id: 'WV-KC-20260000355', postId: 'shop-ph-article', status: 'minted', holder: '阿May的研究笔记',
    issuedAt: Date.now() - 1000 * 60 * 60 * 24 * 6, likesAtMint: 201,
    contentHash: '3f8a1c9e2b6d5074f1a3c8e9d2b4f6017c9e2a4d6b8f0135e7c9a1b3d5f7091',
    tokenId: '68901234567890123456789012345678901234567890123',
    txHash: '0x2b4d6f8091a3c5e7092b4d6f8a1c3e5f7091b3d5f7092b4d6f8a1c3e5f70912',
    issuerAddress: '0x0EF376766C69400A8A6C3e92c07eDD18e7d6eA74',
  },
  {
    id: 'WV-KC-20260000487', postId: 'cert-pending-1', status: 'pending', holder: CURRENT_USER,
    likesAtMint: 132,
    contentHash: '7c1e3a5f9082b4d6f8091a3c5e7092b4d6f8a1c3e5f7091b3d5f7092b4d6f8a',
    issuerAddress: '0x0EF376766C69400A8A6C3e92c07eDD18e7d6eA74',
  },
  {
    id: 'WV-KC-20260000276', postId: 'cert-burned-1', status: 'burned', holder: CURRENT_USER,
    issuedAt: Date.now() - 1000 * 60 * 60 * 24 * 8, likesAtMint: 145,
    burnedAt: Date.now() - 1000 * 60 * 60 * 6,
    burnReason: '经人工核查存在异常点赞，认证已回收',
    contentHash: 'ad2f4b6d8e01f3a5c7092b4d6f8a1c3e5f7091b3d5f7092b4d6f8a1c3e5f709',
    tokenId: '10293847561029384756102938475610293847561029384',
    txHash: '0xf0918273645fabc0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5061728394a5b6c7d8',
    issuerAddress: '0x0EF376766C69400A8A6C3e92c07eDD18e7d6eA74',
  },
  {
    id: 'WV-KC-20260000523', postId: 'shop-iphone', status: 'minted', holder: '极客前沿',
    issuedAt: Date.now() - 1000 * 60 * 60 * 24 * 2, likesAtMint: 428,
    contentHash: 'f9758b650f17751cfc8089d6355fabebad635fa92f6aebb1f0ce96fd9c8b527c',
    tokenId: '62592625540211963',
    txHash: '0x6bc18f6d161cc14a6c5e022fc96a903ad1f2682cdc2d6ba53d0a9729f4de9de6',
    issuerAddress: '0x0EF376766C69400A8A6C3e92c07eDD18e7d6eA74',
  },
  {
    id: 'WV-KC-20260000601', postId: 'shop-mine', status: 'minted', holder: CURRENT_USER,
    issuedAt: Date.now() - 1000 * 60 * 60 * 24 * 1, likesAtMint: 132,
    contentHash: '93afbd59996bbc200cadb46c7fee4a1eb8830ab4f2b10ae63be0d4560aba3301',
    tokenId: '19930683504345219',
    txHash: '0x16a80e6a42a66f6acf24b7ed5a8c2806ad4e05ce242ef77ac04cb18e4c001aa2',
    issuerAddress: '0x0EF376766C69400A8A6C3e92c07eDD18e7d6eA74',
  },
];
