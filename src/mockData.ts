import type { ActivityGroup, DmConversation, Post, PostActors, Reply } from './types';

export type UserListItem = {
  name: string;
  desc: string;
  avatarIdx: number;
};

export const CURRENT_USER = '林知远';
export const BATCH_SIZE = 3;

export const MOCK_WALLET_ADDRESS = '0x7a3fb8e2d1c94f6a5b3e0d9c8f2a7e1b4d6c3e8';
export const DEFAULT_WALLET_DISPLAY = MOCK_WALLET_ADDRESS.slice(-6);

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

export const ALL_POSTS: Post[] = [
  {
    id: 'p1', author: 'AI 效率研究所', time: '2 小时前',
    title: 'AI 产品截图 × 提示词模板合集。精选 12 款工具的实测截图，附 3 个月高频使用总结的提示词模板，拿来即用。',
    kind: 'image', imageCount: 3, visiblePercent: 50, isNode: true, stakeTier: 1000, nodeId: 'Kx7mR2',
    rating: 4, replies: 18, links: 42, shares: 36, saves: 152, likes: 306,
  },
  {
    id: 'p7', author: '产品大叔严磊', time: '3 天前',
    title: '我是如何把一个 B 端产品用户留存从 12% 提到 67% 的？\n18 个月的数据与方法论，视频完整复盘。',
    kind: 'video', visiblePercent: 30, isNode: true, stakeTier: 100, nodeId: 'nM4gJs',
    rating: 1, replies: 58, links: 21, shares: 44, saves: 117, likes: 261,
    videoUrl: '/mock-video-2.mp4',
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
    kind: 'image', imageCount: 1, visiblePercent: 100, isNode: false, stakeTier: 0,
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
  },
  {
    id: 'p8', author: '阿May的研究笔记', time: '3 天前',
    title: '今天被一句话点醒：「工具是思维的外化」。\n我们选什么工具，其实是在选什么思维方式。',
    kind: 'text', visiblePercent: 100, isNode: false, stakeTier: 0,
    rating: 0, replies: 19, links: 0, shares: 9, saves: 43, likes: 88,
  },
  {
    id: 'p9', author: '林知远', time: '4 天前',
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
  // ── 林知远自己发布的节点帖子（演示可见百分比标签）──────────────────
  {
    id: 'own-10', author: '林知远', time: '1 小时前',
    title: '这才是做笔记的正确姿势：卡片笔记法实战指南\n跟着做了一周，信息整理效率提高了一倍。',
    kind: 'text', visiblePercent: 10, isNode: true, stakeTier: 10, nodeId: 'Vx8mK3',
    rating: 2, replies: 8, links: 3, shares: 5, saves: 23, likes: 67, tipsReceived: 30,
  },
  {
    id: 'own-50', author: '林知远', time: '2 小时前',
    title: '2025 年个人阅读 Top 5 书单\n每一本都值得反复读，附精读笔记链接。',
    kind: 'image', imageCount: 3, visiblePercent: 50, isNode: true, stakeTier: 100, nodeId: 'Jn9pQ2',
    rating: 1, replies: 12, links: 7, shares: 9, saves: 41, likes: 103, tipsReceived: 120,
  },
];


export const POST_REPLIES: Record<string, Reply[]> = {
  p1: [
    { id: 'r1a', author: '游牧开发者', time: '1 小时前', text: '这个模板真的太有用了，拿来即用！', avatarIdx: 1, likes: 12 },
    { id: 'r1b', author: '深海鱼炸弹', time: '2 小时前', text: '哪个工具最好用？最近在对比 Claude 和 GPT-4o。', avatarIdx: 2, likes: 8 },
    { id: 'r1c', author: '极客前沿', time: '2 小时前', text: '提示词模板那部分很有价值，已收藏。', avatarIdx: 0, likes: 15 },
    { id: 'r1d', author: '设计师刘然', time: '2 小时前', text: '我也整理过类似的合集，感觉你总结的更系统一些。', avatarIdx: 0, likes: 6 },
    { id: 'r1e', author: '产品大叔严磊', time: '3 小时前', text: '对 B 端产品设计有很好的借鉴作用，马住！', avatarIdx: 1, likes: 3 },
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
  p3: [{ id: 'r3a', author: '林知远', time: '22 小时前', text: '内容节奏这块感同身受，节奏一乱全盘皆输。', avatarIdx: 0, likes: 3 }],
  p4: [
    { id: 'r4a', author: '设计师刘然', time: '23 小时前', text: '之前就踩了功能堆砌的坑，这个规律太扎心了。', avatarIdx: 2, likes: 18 },
    { id: 'r4b', author: '阿May的研究笔记', time: '1 天前', text: '「把一件事做到极好」赞同，做产品的北极星。', avatarIdx: 1, likes: 7 },
  ],
  p5: [{ id: 'r5a', author: '游牧开发者', time: '1 天前', text: '设计 token 系统这套工作流学到了，下个项目试试。', avatarIdx: 1, likes: 4 }],
  p6: [
    { id: 'r6a', author: '林知远', time: '2 天前', text: 'tool-use 那段讲得非常清楚，有没有开源版本？', avatarIdx: 0, likes: 22 },
    { id: 'r6b', author: '深海鱼炸弹', time: '2 天前', text: 'Demo 链接能分享出来吗？', avatarIdx: 2, likes: 6 },
  ],
  p7: [
    { id: 'r7a', author: '林知远', time: '2 天前', text: '12% 到 67%，这个增幅太惊人了，方法论帖子什么时候出？', avatarIdx: 0, likes: 31 },
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

// ── 互动通知（针对 林知远 的帖子 p9）──────────────────────────────
export const ACTIVITY_GROUPS: ActivityGroup[] = [
  {
    id: 'agt1', type: 'tip', postId: 'p9', time: '1 小时前', isRead: false,
    actors: [{ user: '阿May的研究笔记', avatarIdx: 1 }],
    tipAmount: 100,
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
  { name: '林知远', desc: '独立创作者，关注知识管理与可视化表达', avatarIdx: 1 },
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
      { user: '阿May的研究笔记', avatarIdx: 1, time: '1 小时前', amount: 100 },
      { user: '极客前沿', avatarIdx: 1, time: '2 小时前', amount: 50 },
      { user: '游牧开发者', avatarIdx: 2, time: '2 小时前', amount: 50 },
      { user: '深海鱼炸弹', avatarIdx: 0, time: '4 天前', amount: 30 },
      { user: '设计师刘然', avatarIdx: 0, time: '4 天前', amount: 20 },
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
