import { useRef, useState, type PointerEvent as ReactPointerEvent, useEffect } from 'react';
import { Lock, X, ArrowLeft, Play, Pause, ChevronRight, Maximize, Minimize, Volume2, VolumeX, MessageCircle, Repeat2, ThumbsUp, Bookmark, Check, Gift, Sparkles, CalendarCheck, Link, Flame } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_POSTS, ALL_USERS_MOCK, CURRENT_USER } from '../mockData';
import { KnowledgePlanetIcon } from './KnowledgePlanetIcon';
import { Avatar, AuthorName, Rating, GeminiNodeBadge } from './shared';
import { Actions } from './PostCard';
import { localizeTime } from '../i18n';
import type { InteractionAction, PayCtx, Post, PostAction } from '../types';
import { formatSuperAmount, stakeTierDescription, SUPER_BY_TIER } from '../stakeConfig';
import type { StakeTier } from '../types';
import { CHECK_IN_MAX_DAILY, CHECK_IN_REWARD, type ClaimPreview } from '../checkInConfig';


// Lightbox photo backgrounds — local SVG illustrations, same order as img-grid-cell nth-child
const IMG_GRADIENTS = [
  "#f4e4c4 url('/img/p1.svg') center/cover no-repeat",
  "#1a1b2e url('/img/p2.svg') center/cover no-repeat",
  "#e8eef4 url('/img/p3.svg') center/cover no-repeat",
  "#f8faff url('/img/p4.svg') center/cover no-repeat",
  "#0f1117 url('/img/p5.svg') center/cover no-repeat",
  "#f0faf4 url('/img/p6.svg') center/cover no-repeat",
  "#fdf6e3 url('/img/p7.svg') center/cover no-repeat",
  "#f5f0e8 url('/img/p8.svg') center/cover no-repeat",
  "#0e1a48 url('/img/p9.svg') center/cover no-repeat",
];
const IMG_LABELS = ['图片 1', '图片 2', '图片 3', '图片 4', '图片 5', '图片 6', '图片 7', '图片 8', '图片 9'];

export function ImageLightbox({ post, initialIndex, visibleImgCount, onClose }: {
  post: Post;
  initialIndex: number;
  visibleImgCount: number;
  onClose: () => void;
}) {
  const { openLink, t } = useApp();
  const [idx, setIdx] = useState(initialIndex);
  const dragStartX = useRef<number | null>(null);
  const total = post.imageCount ?? 3;
  const isLocked = idx >= visibleImgCount;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragStartX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;

    const dragDistance = event.clientX - dragStartX.current;
    dragStartX.current = null;

    if (dragDistance < -40) {
      setIdx(current => Math.min(current + 1, total - 1));
    } else if (dragDistance > 40) {
      setIdx(current => Math.max(current - 1, 0));
    }
  };

  const handlePointerCancel = () => {
    dragStartX.current = null;
  };

  const handleUnlock = () => {
    onClose();
    openLink(post.id);
  };

  return (
    <div className="lightbox-overlay" role="dialog" aria-modal="true" aria-label={t('查看图片', 'View images')}>
      {/* Header */}
      <div className="lightbox-header">
        <AuthorName name={post.author} className="lightbox-author" />
        <span className="lightbox-counter">{idx + 1} / {total}</span>
        <button type="button" className="lightbox-close" onClick={onClose} aria-label={t('关闭', 'Close')}>
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Stage */}
      <div
        className="lightbox-stage"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="lightbox-media">
          <div
            className={`lightbox-img${isLocked ? ' lightbox-img--locked' : ''}`}
            style={{ background: IMG_GRADIENTS[idx] }}
            aria-label={IMG_LABELS[idx]}
          />
          {isLocked && (
            <div className="lightbox-lock-overlay">
              <Lock className="lightbox-lock-icon" strokeWidth={1.8} />
              <p className="lightbox-lock-hint">此图片尚未解锁</p>
              <button type="button" className="lightbox-unlock-btn" onClick={handleUnlock}>
                解锁
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dots */}
      <div className="lightbox-dots" role="tablist">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === idx}
            aria-label={t(`第 ${i + 1} 张`, `Image ${i + 1}`)}
            className={`lightbox-dot${i === idx ? ' lightbox-dot--active' : ''}${i >= visibleImgCount ? ' lightbox-dot--locked' : ''}`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  );
}

export function PaymentSheet({ payCtx, onSuccess, onClose }: {
  payCtx: PayCtx; onSuccess: () => void; onClose: () => void;
}) {
  const { t, posts } = useApp();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const [failReason, setFailReason] = useState('');
  const tier = payCtx.stakeTier;
  const relatedPost = payCtx.postId ? posts.find(p => p.id === payCtx.postId) : null;
  const superAmount = tier > 0 ? SUPER_BY_TIER[tier as Exclude<StakeTier, 0>] : 0;

  const titles: Record<PayCtx['ctx'], string> = {
    post:   t('发布知识星球节点', 'Publish Knowledge Planet Node'),
    chain:  t('解锁全文', 'Unlock full content'),
    repost: t('转发并创建子节点', 'Repost and create child node'),
    interaction: t('参与知识星球', 'Join Gemini'),
  };

  const interactionLabels: Record<InteractionAction, [string, string]> = {
    comment: [t('评论', 'Comment'), t('评论并创建子节点', 'Comment and create child node')],
    share: [t('转发', 'Repost'), t('转发并创建子节点', 'Repost and create child node')],
    like: [t('点赞', 'Like'), t('点赞并创建子节点', 'Like and create child node')],
    save: [t('收藏', 'Save'), t('收藏并创建子节点', 'Save and create child node')],
    unlock: [t('解锁', 'Unlock'), t('解锁并创建子节点', 'Unlock and create child node')],
  };

  const sheetTitle = payCtx.ctx === 'interaction' && payCtx.action
    ? interactionLabels[payCtx.action][1]
    : titles[payCtx.ctx];

  const pay = () => {
    setStatus('loading');
    setTimeout(() => {
      const shouldFail = Math.random() < 0.12;
      if (shouldFail) {
        setFailReason(t('余额不足，请充值后重试', 'Insufficient balance, please top up and retry'));
        setStatus('failed');
      } else {
        setStatus('done');
        setTimeout(onSuccess, 700);
      }
    }, 1300);
  };

  return (
    <div className="sheet-backdrop" onClick={status === 'loading' ? undefined : onClose}>
      <div className="payment-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{sheetTitle}</span>
          <button type="button" className="modal-close" onClick={onClose} disabled={status === 'loading'} aria-label={t('关闭', 'Close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {relatedPost && (
          <div className="link-modal-post">
            <div className="gemini-left">
              <KnowledgePlanetIcon className="gemini-icon" />
              <span className="gemini-label">{t('知识星球', 'Knowledge Planet')}</span>
              <span className="gemini-sep">·</span>
              <Rating value={relatedPost.rating} />
              <span className="gemini-sep">·</span>
              <span className="gemini-id">{relatedPost.nodeId}</span>
            </div>
          </div>
        )}

        {tier > 0 && (
          <div className="pay-combo-breakdown">
            <div className="pay-combo-row">
              <span className="pay-combo-label">{t('P客 PB', 'P-Pay PB')}</span>
              <span className="pay-combo-value">{tier} PB</span>
            </div>
            <div className="pay-combo-row">
              <span className="pay-combo-label">{t('码库 SUP', 'CodeVault SUP')}</span>
              <span className="pay-combo-value">{formatSuperAmount(superAmount)} SUP</span>
            </div>
            <p className="pay-combo-hint">
              {t('将从 P客扣除 PB，同时通过码库支付 SUP', 'Deducts PB from P-Pay and pays SUP via CodeVault')}
            </p>
          </div>
        )}

        {status === 'idle' && (
          <div className="pay-options">
            <button type="button" className="pay-option pay-option--primary" onClick={pay}>
              <div className="pay-option-copy">
                <span className="pay-option-name">{t('组合支付', 'Combo payment')}</span>
                <span className="pay-option-sub">
                  {tier > 0
                    ? `${tier} PB + ${formatSuperAmount(superAmount)} SUP`
                    : t('确认支付', 'Confirm payment')}
                </span>
              </div>
              <span className="pay-option-tag">{t('推荐', 'Recommended')}</span>
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="pay-status">
            <span className="spinner" />
            <span>{t('支付中…', 'Processing…')}</span>
          </div>
        )}

        {status === 'done' && (
          <div className="pay-status pay-status--done">
            <span className="pay-check">✓</span>
            <span>{t('支付成功', 'Payment successful')}</span>
          </div>
        )}

        {status === 'failed' && (
          <div className="pay-status pay-status--failed">
            <span className="pay-fail-icon">✕</span>
            <span className="pay-fail-reason">{failReason}</span>
            <button
              type="button"
              className="pay-retry-btn"
              onClick={() => setStatus('idle')}
            >
              {t('重试', 'Retry')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const INTERACTION_ACTION_LABEL: Record<InteractionAction, [string, string]> = {
  comment: ['评论', 'Comment'],
  share: ['转发', 'Repost'],
  like: ['点赞', 'Like'],
  save: ['收藏', 'Save'],
  unlock: ['解锁', 'Unlock'],
};

export function GeminiStakeModal({
  post,
  onParticipate,
  onClose,
}: {
  post: Post;
  onParticipate: (tier: Exclude<StakeTier, 0>) => void;
  onClose: () => void;
}) {
  const { t, language } = useApp();
  const zh = language === 'zh-CN';
  const [selected, setSelected] = useState<Exclude<StakeTier, 0>>(10);
  const tiers: Exclude<StakeTier, 0>[] = [10, 100, 1000];

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="gemini-stake-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('同步创建子节点', 'Create a child node')}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭', 'Close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <p className="gemini-stake-lead">
          {t('该帖子已参与知识星球，选择面额后同步链接创建子节点', 'This post is in Knowledge Planet — choose an amount to link and create a child node')}
        </p>

        <div className="stake-tier-list" style={{ marginBottom: 16 }}>
          {tiers.map(tier => (
            <button
              key={tier}
              type="button"
              className={`stake-tier-option${selected === tier ? ' stake-tier-option--active' : ''}`}
              onClick={() => setSelected(tier)}
            >
              <span className="stake-tier-option__amount">{tier} PB</span>
              <span className="stake-tier-option__desc">{stakeTierDescription(tier, zh)}</span>
            </button>
          ))}
        </div>

        <button type="button" className="gemini-stake-btn gemini-stake-btn--primary" onClick={() => onParticipate(selected)}>
          {t(`创建子节点 · ${selected} PB`, `Create child node · ${selected} PB`)}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LinkSheet — 链接面额选择 + 支付
// ═══════════════════════════════════════════════════════════════
export function LinkSheet({ post, mode = 'link', onSuccess, onClose }: {
  post: Post;
  mode?: 'link' | 'unlock';
  onSuccess: (tier: Exclude<StakeTier, 0>) => void;
  onClose: () => void;
}) {
  const { t, language } = useApp();
  const zh = language === 'zh-CN';
  const [selected, setSelected] = useState<Exclude<StakeTier, 0>>(10);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const [failReason, setFailReason] = useState('');

  const tiers: Exclude<StakeTier, 0>[] = [10, 100, 1000];

  const pay = () => {
    setStatus('loading');
    setTimeout(() => {
      if (Math.random() < 0.12) {
        setFailReason(t('余额不足，请充值后重试', 'Insufficient balance, please top up and retry'));
        setStatus('failed');
      } else {
        setStatus('done');
        setTimeout(() => onSuccess(selected), 700);
      }
    }, 1300);
  };

  return (
    <div className="sheet-backdrop" onClick={status === 'loading' ? undefined : onClose}>
      <div className="gemini-stake-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">
            <Link size={14} strokeWidth={2.5} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {mode === 'unlock' ? t('解锁全部内容', 'Unlock full content') : t('创建子节点', 'Create child node')}
          </span>
          <button type="button" className="modal-close" onClick={onClose} disabled={status === 'loading'} aria-label={t('关闭', 'Close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {post.nodeId && (
          <div className="link-modal-post">
            <div className="gemini-left">
              <KnowledgePlanetIcon className="gemini-icon" />
              <span className="gemini-label">{t('知识星球', 'Knowledge Planet')}</span>
              <span className="gemini-sep">·</span>
              <Rating value={post.rating} />
              <span className="gemini-sep">·</span>
              <span className="gemini-id">{post.nodeId}</span>
            </div>
          </div>
        )}

        {status === 'idle' && (
          <>
            <p className="gemini-stake-lead">
              {mode === 'unlock'
                ? t('选择面额创建知识星球子节点，同步解锁全部内容', 'Choose an amount to create a Knowledge Planet child node and unlock full content')
                : t('选择链接面额，在此节点下生成子节点并加入空投激励网络', 'Choose an amount to create a child node and join airdrop rewards')}
            </p>
            <div className="stake-tier-list" style={{ marginBottom: 16 }}>
              {tiers.map(tier => (
                <button
                  key={tier}
                  type="button"
                  className={`stake-tier-option${selected === tier ? ' stake-tier-option--active' : ''}`}
                  onClick={() => setSelected(tier)}
                >
                  <span className="stake-tier-option__amount">{tier} PB</span>
                  <span className="stake-tier-option__desc">{stakeTierDescription(tier, zh)}</span>
                </button>
              ))}
            </div>
            <button type="button" className="gemini-stake-btn gemini-stake-btn--primary" onClick={pay}>
              {mode === 'unlock'
                ? t(`解锁并创建子节点 · ${selected} PB`, `Unlock & create child node · ${selected} PB`)
                : t(`创建子节点 · ${selected} PB`, `Create child node · ${selected} PB`)}
            </button>
          </>
        )}

        {status === 'loading' && (
          <div className="pay-status">
            <span className="spinner" />
            <span>{t('链接中…', 'Linking…')}</span>
          </div>
        )}

        {status === 'done' && (
          <div className="pay-status pay-status--done">
            <span className="pay-check">✓</span>
            <span>{t('链接成功', 'Linked successfully')}</span>
          </div>
        )}

        {status === 'failed' && (
          <div className="pay-status pay-status--failed">
            <span className="pay-fail-icon">✕</span>
            <span className="pay-fail-reason">{failReason}</span>
            <button type="button" className="pay-retry-btn" onClick={() => setStatus('idle')}>
              {t('重试', 'Retry')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ArticleReader — 文章阅读器（支持 N% 可见遮罩）
// ═══════════════════════════════════════════════════════════════
const ARTICLE_CONTENT: Record<string, string> = {
  p2: `# 一文读懂 RAG 技术：原理、应用场景与落地实践

## 什么是 RAG？

RAG（Retrieval-Augmented Generation，检索增强生成）是一种将信息检索与文本生成相结合的技术范式。它通过从外部知识库中检索相关文档片段，将其作为上下文注入到大语言模型中，从而提升生成内容的准确性、时效性和可解释性。

## 核心原理

RAG 的工作流程可以分为三个主要阶段：

### 1. 索引阶段
- 文档切分（Chunking）：将原始文档按段落或语义边界切分为小块
- 向量化（Embedding）：使用嵌入模型将每个块转换为向量表示
- 存储（Indexing）：将向量存入向量数据库（如 Pinecone、Weaviate、Milvus）

### 2. 检索阶段
- 用户输入查询后，同样进行向量化
- 在向量数据库中执行相似度搜索（余弦相似度或欧氏距离）
- 返回 Top-K 最相关的文档片段

### 3. 生成阶段
- 将检索到的文档片段与原始查询拼接为 Prompt
- 输入大语言模型生成最终回答

## 应用场景

- **企业知识库问答**：将内部文档、规范、FAQ 作为知识源，构建智能问答系统
- **客服系统**：实时检索产品手册和历史工单，辅助客服快速响应
- **学术研究**：检索最新论文，辅助文献综述和研究方向探索
- **代码辅助**：检索项目文档和 API 规范，提供更准确的代码建议

## 落地实践要点

1. **分块策略**：块大小直接影响检索质量，建议 256-512 tokens，重叠 10-20%
2. **混合检索**：结合关键词搜索（BM25）和向量搜索，提升召回率
3. **重排序**：对检索结果进行二次排序，过滤不相关内容
4. **Prompt 模板**：设计清晰的指令模板，引导模型正确使用检索内容

## 开源方案推荐

- **LangChain**：最流行的 RAG 框架，提供完整的链式调用
- **LlamaIndex**：专注于数据索引和检索，API 设计简洁
- **Haystack**：生产级框架，支持多种检索器和生成器组合
- **Chroma**：轻量级向量数据库，适合原型开发

## 资源清单

- [LangChain RAG 官方教程](https://python.langchain.com/docs/use_cases/question_answering/)
- [LlamaIndex 入门指南](https://gpt-index.readthedocs.io/)
- [Haystack 文档](https://docs.haystack.deepset.ai/)

> 本文结合多个项目实战经验总结，如有疑问欢迎在评论区交流。`,
  p9: `# 读书笔记 × 可视化：把《思考，快与慢》画成一张图

## 双系统理论概述

丹尼尔·卡尼曼在《思考，快与慢》中提出了著名的双系统理论，将人类的思维模式分为两个系统：

### 系统 1：快思考
- **特点**：自动、直觉、快速、无意识
- **运作方式**：基于经验和模式识别，几乎不消耗认知资源
- **优势**：能够快速做出判断和决策，适合日常简单任务
- **劣势**：容易受到偏见和启发式的影响，导致系统性错误

### 系统 2：慢思考
- **特点**：理性、分析、缓慢、有意识
- **运作方式**：需要主动调动注意力，进行逻辑推理和计算
- **优势**：能够处理复杂问题，纠正系统 1 的错误
- **劣势**：消耗大量认知资源，容易疲劳

## 核心概念图谱

### 1. 启发式与偏见
- **可得性启发式**：高估容易想到的事件的概率
- **代表性启发式**：根据典型性而非概率做判断
- **锚定效应**：初始信息对后续判断产生不成比例的影响
- **确认偏误**：倾向于寻找支持自己已有观点的信息

### 2. 前景理论
- **损失厌恶**：损失带来的痛苦远大于等量收益带来的快乐
- **框架效应**：同一问题的不同表述方式会导致不同决策
- **心理账户**：人们在心里将资金划分到不同账户，影响消费决策

### 3. 峰终定律
- 人们对一段体验的评价主要基于两个时刻：**高峰时刻**（最强烈的感受）和**结束时刻**（最后的感受）

## 可视化概念图

[此处为概念图示意]

将双系统理论的核心概念以思维导图的形式呈现，可以帮助更直观地理解各概念之间的关系。

## 可下载模板

本文附带了可编辑的概念图模板文件，支持以下格式：
- **XMind**（.xmind）
- **MindNode**（.mindnode）
- **PDF 打印版**

> `,
  p10: `# 产品周报到底该怎么写，团队才真的会看？

## 先说结论

多数周报没人看，不是因为大家不重视同步，而是因为内容没有帮助读者更快做判断。

## 我把有效周报拆成三个问题

### 1. 这周最重要的变化是什么？
- 只写 1-3 条真正影响方向的变化
- 每条都要能回答"为什么这值得被知道"

### 2. 哪些地方需要协作或拍板？
- 把需要谁做决定写清楚
- 最好给出建议方案，而不是只抛问题

### 3. 下周最关键的推进点是什么？
- 不求面面俱到
- 重点写会影响节奏和资源配置的事项

## 一个更好用的结构

1. 本周结论
2. 数据变化
3. 风险与决策点
4. 下周重点

## 最后

周报不是留档工具，而是推动团队对齐的沟通接口。`,
};

export function ArticleReader({ post, onClose }: { post: Post; onClose: () => void }) {
  const { openLink, linkedPostIds, navigate, followedAuthors, toggleFollow, language, t } = useApp();
  const isOwn = post.author === CURRENT_USER;
  const [showTip, setShowTip] = useState(false);
  const isLinked = linkedPostIds.has(post.id);
  const unlocked = isOwn || isLinked || post.visiblePercent === 100;
  const content = ARTICLE_CONTENT[post.id] ?? `# ${post.title}\n\n文章内容加载中…`;
  const hasCover = post.articleHasCover !== false;
  const displayTitle = post.title.split('\n')[0]?.trim() || post.title;
  const authorMeta = ALL_USERS_MOCK.find(user => user.name === post.author);
  const avatarIdx = authorMeta?.avatarIdx ?? Math.max(0, ALL_POSTS.findIndex(p => p.author === post.author)) % 3;
  const isFollowing = followedAuthors.has(post.author);

  const lines = content.split('\n');
  const visibleLineCount = unlocked ? lines.length : Math.max(1, Math.floor(lines.length * post.visiblePercent / 100));
  const visibleLines = lines.slice(0, visibleLineCount);
  const bodyLines = visibleLines[0]?.startsWith('# ') ? visibleLines.slice(1) : visibleLines;

  const renderLine = (line: string, i: number) => {
    if (line.startsWith('## ')) {
      return <h2 key={i} className="article-h2">{line.slice(3)}</h2>;
    }
    if (line.startsWith('### ')) {
      return <h3 key={i} className="article-h3">{line.slice(4)}</h3>;
    }
    if (line.startsWith('- **')) {
      const match = line.match(/- \*\*(.+?)\*\*(.*)/);
      if (match) {
        return <p key={i} className="article-p"><strong>{match[1]}</strong>{match[2]}</p>;
      }
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="article-li">{line.slice(2)}</li>;
    }
    if (line.startsWith('> ')) {
      return <blockquote key={i} className="article-blockquote">{line.slice(2)}</blockquote>;
    }
    if (line.startsWith('1. ') || line.match(/^\d+\. /)) {
      return <li key={i} className="article-li">{line.replace(/^\d+\.\s*/, '')}</li>;
    }
    if (line.trim() === '') {
      return <div key={i} className="article-spacer" />;
    }
    return <p key={i} className="article-p">{line}</p>;
  };

  const handleComment = () => {
    onClose();
    navigate({ page: 'P2', postId: post.id });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="article-reader" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="article-reader-scroll">
          <div className={`article-reader-hero${hasCover ? '' : ' article-reader-hero--no-cover'}`}>
            {hasCover && <div className="media media-article article-reader-cover" data-layer="article-cover" />}
            <button
              type="button"
              className={`article-reader-back${hasCover ? '' : ' article-reader-back--on-light'}`}
              onClick={onClose}
              aria-label={t('返回', 'Back')}
            >
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="article-reader-meta-block">
            <h1 className="article-reader-title">{displayTitle}</h1>
            <div className="article-reader-author-row">
              <div
                className="article-reader-author-info"
                role="button"
                tabIndex={0}
                onClick={() => navigate({ page: 'P6', authorName: post.author })}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate({ page: 'P6', authorName: post.author }); }}
              >
                <Avatar index={avatarIdx} seed={post.author} />
                <div className="article-reader-author-text">
                  <AuthorName name={post.author} className="article-reader-author-name" />
                  <span className="article-reader-time">{localizeTime(post.time, language)}</span>
                </div>
              </div>
              {!isOwn && (
                <button
                  type="button"
                  className={`follow-btn follow-btn--sm${isFollowing ? ' follow-btn--following' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleFollow(post.author); }}
                  aria-label={isFollowing ? t(`取消关注 ${post.author}`, `Unfollow ${post.author}`) : t(`关注 ${post.author}`, `Follow ${post.author}`)}
                >
                  {isFollowing
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} strokeWidth={2.5} />{t('已关注', 'Following')}</span>
                    : t('+ 关注', '+ Follow')}
                </button>
              )}
            </div>
          </div>

          <div className="article-reader-content">
            {bodyLines.map(renderLine)}
          </div>

          {!unlocked && (
            <div className="article-reader-mask">
              <div className="article-reader-mask-fade" />
              <div className="article-reader-unlock">
                <Lock size={16} strokeWidth={2} />
                <span>{t(`已显示前 ${post.visiblePercent}% 内容`, `Showing the first ${post.visiblePercent}% of content`)}</span>
                <button
                  type="button"
                  className="article-reader-unlock-btn"
                  onClick={(e) => { e.stopPropagation(); onClose(); openLink(post.id); }}
                >
                  {t('解锁全文', 'Unlock full text')}
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="article-reader-footer" data-layer="post-actions">
          <Actions
            post={post}
            onComment={handleComment}
            extra={!isOwn ? (
              <button
                type="button"
                className="detail-tip-btn"
                onClick={() => setShowTip(true)}
                aria-label={t('打赏此文章', 'Tip this article')}
              >
                <Gift size={15} strokeWidth={2} />
                {t('打赏', 'Tip')}
              </button>
            ) : undefined}
          />
        </footer>
        {showTip && (
          <TipModal
            recipientName={post.author}
            context="post"
            postTitle={post.title}
            onClose={() => setShowTip(false)}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VideoPlayer — 视频播放器（支持 N% 时长限制）
// ═══════════════════════════════════════════════════════════════
export function VideoPlayer({ post, index = 0, onClose }: { post: Post; index?: number; onClose: () => void }) {
  const { openLink, linkedPostIds, navigate, repostedPostIds, likedPostIds, savedPostIds, togglePostAction, t } = useApp();
  const [showTip, setShowTip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOwn = post.author === CURRENT_USER;
  const isLinked = linkedPostIds.has(post.id);
  const unlocked = isOwn || isLinked || post.visiblePercent === 100;
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(true);
  const [showUnlockOverlay, setShowUnlockOverlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const authorMeta = ALL_USERS_MOCK.find(u => u.name === post.author);
  const authorAvatarIdx = authorMeta?.avatarIdx ?? 0;

  // Close speed menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    if (showSpeedMenu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showSpeedMenu]);

  // Calculate max playable time based on visiblePercent
  const maxPlayableRatio = unlocked ? 1 : post.visiblePercent / 100;
  const maxPlayableTime = duration * maxPlayableRatio;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (!unlocked && video.currentTime >= maxPlayableTime) {
        video.pause();
        setPaused(true);
        setShowUnlockOverlay(true);
      }
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const onPause = () => setPaused(true);
    const onPlay = () => setPaused(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('pause', onPause);
    video.addEventListener('play', onPlay);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('play', onPlay);
    };
  }, [unlocked, maxPlayableTime]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleUnlock = () => {
    onClose();
    openLink(post.id);
  };

  const handleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } catch {}
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const newVol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(newVol);
    setMuted(newVol === 0);
    const video = videoRef.current;
    if (video) {
      video.volume = newVol;
      video.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    video.muted = nextMuted;
    if (nextMuted) {
      video.volume = 0;
    } else {
      video.volume = volume || 0.5;
      setVolume(v => v || 0.5);
    }
  };

  // Listen for fullscreen exit
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="video-player-overlay" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        {/* Top close button */}
        <button type="button" className="video-player-back" onClick={onClose} aria-label={t('返回', 'Back')}>
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <div className="video-player-stage" ref={containerRef}>
          <video
            ref={videoRef}
            className="video-player-video"
            src={post.videoUrl}
            playsInline
            preload="metadata"
            onClick={handlePlayPause}
            onError={() => setVideoError(true)}
          />
          {/* Video load error */}
          {videoError && (
            <div className="video-player-unlock-overlay">
              <p className="video-player-unlock-text">{t('视频暂时无法播放', 'Video unavailable')}</p>
            </div>
          )}
          {/* Play button overlay when paused */}
          {paused && !showUnlockOverlay && !videoError && (
            <div className="video-player-play-overlay" onClick={handlePlayPause}>
              <div className="video-player-play-btn">
                <Play size={32} strokeWidth={2} fill="#fff" />
              </div>
            </div>
          )}
          {/* Unlock overlay when preview limit reached */}
          {showUnlockOverlay && (
            <div className="video-player-unlock-overlay">
              <Lock size={24} strokeWidth={1.8} />
              <p className="video-player-unlock-text">
                {t(`预览结束，已播放前 ${post.visiblePercent}%`, `Preview ended — first ${post.visiblePercent}% played`)}
              </p>
              <button
                type="button"
                className="video-player-unlock-btn"
                onClick={handleUnlock}
              >
                {t('解锁完整视频', 'Unlock full video')}
              </button>
            </div>
          )}
          {/* Bottom overlay: info + controls */}
          <div className="video-player-bottom">
            {/* Author row */}
            <div className="video-player-author-row">
              <Avatar index={authorAvatarIdx} seed={post.author} onClick={() => navigate({ page: 'P6', authorName: post.author })} />
              <div className="video-player-author-meta" onClick={() => navigate({ page: 'P6', authorName: post.author })} style={{ cursor: 'pointer' }}>
                <AuthorName name={post.author} as="h2" />
                <span>{post.time}</span>
              </div>
            </div>
            {/* Post title */}
            <div className="video-player-post-title">{post.title.split('\n')[0]}</div>
            {/* Gemini Node Badge */}
            {post.isNode && (
              <div className="video-player-gemini-badge">
                <GeminiNodeBadge post={post} showChain />
              </div>
            )}
            {/* Actions (comment / share / like / save) */}
            <div className="video-player-actions" data-layer="post-actions">
              <span
                className="video-player-action-item reply-trigger"
                role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); navigate({ page: 'P2', postId: post.id }); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate({ page: 'P2', postId: post.id }); }}
                aria-label={t(`查看 ${post.replies} 条评论`, `View ${post.replies} comments`)}
              >
                <MessageCircle size={16} strokeWidth={2.25} />{post.replies}
              </span>
              <button
                type="button"
                className={`video-player-action-item${repostedPostIds.has(post.id) ? ' video-player-action-item--active' : ''}`}
                onClick={(e) => { e.stopPropagation(); togglePostAction(post.id, 'share'); }}
              >
                <Repeat2 size={16} strokeWidth={2.25} />{post.shares}
              </button>
              <button
                type="button"
                className={`video-player-action-item${likedPostIds.has(post.id) ? ' video-player-action-item--active' : ''}`}
                onClick={(e) => { e.stopPropagation(); togglePostAction(post.id, 'like'); }}
              >
                <ThumbsUp size={16} strokeWidth={2.25} />{post.likes}
              </button>
              <button
                type="button"
                className={`video-player-action-item${savedPostIds.has(post.id) ? ' video-player-action-item--active' : ''}`}
                onClick={(e) => { e.stopPropagation(); togglePostAction(post.id, 'save'); }}
              >
                <Bookmark size={16} strokeWidth={2.25} />{post.saves}
              </button>
              {!isOwn && (
                <button
                  type="button"
                  className="video-player-action-item video-player-action-item--tip"
                  onClick={(e) => { e.stopPropagation(); setShowTip(true); }}
                  aria-label={t('打赏', 'Tip')}
                >
                  <Gift size={16} strokeWidth={2} />
                  <span>{t('打赏', 'Tip')}</span>
                </button>
              )}
            </div>
            {/* Progress bar */}
            <div className="video-player-progress" onClick={(e) => {
              const video = videoRef.current;
              if (!video || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const targetTime = unlocked ? ratio * duration : Math.min(ratio * duration, maxPlayableTime);
              video.currentTime = targetTime;
              setShowUnlockOverlay(false);
            }}>
              <div className="video-player-progress-fill" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
              {!unlocked && <div className="video-player-progress-limit" style={{ left: `${maxPlayableRatio * 100}%` }} />}
            </div>
            {/* Controls */}
            <div className="video-player-controls">
              <div className="video-player-controls-left">
                {/* Play/Pause */}
                <button
                  type="button"
                  className="video-player-ctrl-btn"
                  onClick={handlePlayPause}
                  aria-label={paused ? t('播放', 'Play') : t('暂停', 'Pause')}
                >
                  {paused ? <Play size={16} strokeWidth={2} /> : <Pause size={16} strokeWidth={2} />}
                </button>
                {/* Time */}
                <span className="video-player-controls-time">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <div className="video-player-controls-right">
                {/* Speed */}
                <div className="video-player-speed-wrap" ref={speedMenuRef}>
                  <button
                    type="button"
                    className="video-player-ctrl-btn video-player-speed-btn"
                    onClick={() => setShowSpeedMenu(v => !v)}
                    aria-label={t('播放速度', 'Playback speed')}
                  >
                    {playbackRate}x
                  </button>
                  {showSpeedMenu && (
                    <div className="video-player-speed-menu">
                      {SPEEDS.map(speed => (
                        <button
                          key={speed}
                          type="button"
                          className={`video-player-speed-opt${speed === playbackRate ? ' video-player-speed-opt--active' : ''}`}
                          onClick={() => {
                            setPlaybackRate(speed);
                            const video = videoRef.current;
                            if (video) video.playbackRate = speed;
                            setShowSpeedMenu(false);
                          }}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Volume */}
                <div
                  className="video-player-volume-wrap"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    type="button"
                    className="video-player-ctrl-btn"
                    onClick={toggleMute}
                    aria-label={muted ? t('取消静音', 'Unmute') : t('静音', 'Mute')}
                  >
                    {muted || volume === 0 ? <VolumeX size={16} strokeWidth={2} /> : <Volume2 size={16} strokeWidth={2} />}
                  </button>
                  {showVolumeSlider && (
                    <div className="video-player-volume-slider-wrap">
                      <div className="video-player-volume-slider" onClick={handleVolumeChange}>
                        <div
                          className="video-player-volume-fill"
                          style={{ width: `${muted ? 0 : volume * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Fullscreen */}
                <button
                  type="button"
                  className="video-player-ctrl-btn"
                  onClick={handleFullscreen}
                  aria-label={isFullscreen ? t('退出全屏', 'Exit fullscreen') : t('全屏', 'Fullscreen')}
                >
                  {isFullscreen ? <Minimize size={16} strokeWidth={2} /> : <Maximize size={16} strokeWidth={2} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showTip && (
        <TipModal
          recipientName={post.author}
          context="post"
          postTitle={post.title}
          onClose={() => setShowTip(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// P6 — 用户个人主页
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// iOS 26 原生确认弹窗
// ═══════════════════════════════════════════════════════════════

export function Ios26Alert({
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message?: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="sheet-backdrop sheet-backdrop--ios26-alert" onClick={onCancel}>
      <div
        className="ios26-alert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ios26-alert-title"
        aria-describedby={message ? 'ios26-alert-message' : undefined}
        onClick={e => e.stopPropagation()}
      >
        <div className="ios26-alert__content">
          <div className="ios26-alert__title" id="ios26-alert-title">{title}</div>
          {message && (
            <div className="ios26-alert__message" id="ios26-alert-message">{message}</div>
          )}
        </div>
        <div className="ios26-alert__actions">
          <button type="button" className="ios26-alert__btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <div className="ios26-alert__sep" aria-hidden />
          <button type="button" className="ios26-alert__btn ios26-alert__btn--destructive" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDeleteModal({ postId: _postId, onConfirm, onCancel }: {
  postId: string; onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useApp();
  return (
    <Ios26Alert
      title={t('删除帖子', 'Delete post')}
      message={t('确定要删除该帖子吗？', 'Are you sure you want to delete this post?')}
      cancelLabel={t('取消', 'Cancel')}
      confirmLabel={t('删除', 'Delete')}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function ConfirmUnfollowModal({ author, onConfirm, onCancel }: {
  author: string; onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useApp();
  return (
    <Ios26Alert
      title={t(`不再关注 ${author}？`, `Unfollow ${author}?`)}
      cancelLabel={t('取消', 'Cancel')}
      confirmLabel={t('确定', 'Confirm')}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function ConfirmDeleteDraftModal({ onConfirm, onCancel }: {
  onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useApp();
  return (
    <Ios26Alert
      title={t('删除草稿', 'Delete draft')}
      message={t('确定要删除该草稿吗？', 'Are you sure you want to delete this draft?')}
      cancelLabel={t('取消', 'Cancel')}
      confirmLabel={t('删除', 'Delete')}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// TipModal — 打赏弹窗（帖子 / 博主）
// ═══════════════════════════════════════════════════════════════

const TIP_AMOUNTS = [10, 50, 100, 500];

export function TipModal({
  recipientName,
  context,
  postTitle,
  onClose,
}: {
  recipientName: string;
  context: 'post' | 'author';
  postTitle?: string;
  onClose: () => void;
}) {
  const { t, showToast } = useApp();
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const handlePay = () => {
    if (!selected || status !== 'idle') return;
    setStatus('loading');
    setTimeout(() => {
      setStatus('done');
      setTimeout(() => {
        showToast(t('打赏成功！感谢你的支持', 'Tip sent! Thank you for your support'));
        onClose();
      }, 700);
    }, 1300);
  };

  return (
    <div className="sheet-backdrop" onClick={status === 'loading' ? undefined : onClose}>
      <div className="payment-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">
            {context === 'author'
              ? t(`打赏 ${recipientName}`, `Tip ${recipientName}`)
              : t('打赏此帖', 'Tip this post')}
          </span>
          <button type="button" className="modal-close" onClick={onClose} disabled={status === 'loading'} aria-label={t('关闭', 'Close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {context === 'post' && postTitle && (
          <p className="tip-post-title">{postTitle.split('\n')[0]}</p>
        )}

        <div className="tip-amounts">
          {TIP_AMOUNTS.map(amount => (
            <button
              key={amount}
              type="button"
              className={`tip-amount-chip${selected === amount ? ' tip-amount-chip--active' : ''}`}
              onClick={() => setSelected(amount)}
              disabled={status !== 'idle'}
            >
              {amount} PB
            </button>
          ))}
        </div>


        {status === 'idle' && (
          <button
            type="button"
            className="planet-confirm-btn"
            disabled={!selected}
            onClick={handlePay}
          >
            {selected
              ? t(`确认打赏 ${selected} PB`, `Confirm Tip ${selected} PB`)
              : t('请选择金额', 'Select an amount')}
          </button>
        )}

        {status === 'loading' && (
          <div className="pay-status">
            <span className="spinner" />
            <span>{t('支付中…', 'Processing…')}</span>
          </div>
        )}

        {status === 'done' && (
          <div className="pay-status pay-status--done">
            <span className="pay-check">✓</span>
            <span>{t('打赏成功', 'Tip sent!')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CheckInModal — 每日签到领取空投
// ═══════════════════════════════════════════════════════════════

export function CheckInModal({
  preview,
  onClaim,
  onClose,
}: {
  preview: ClaimPreview;
  onClaim: () => void;
  onClose: () => void;
}) {
  const { t, language } = useApp();
  const zh = language === 'zh-CN';
  const [status, setStatus] = useState<'idle' | 'done'>('idle');

  const rewardName = zh ? CHECK_IN_REWARD.name.zh : CHECK_IN_REWARD.name.en;
  const symbol = zh ? CHECK_IN_REWARD.symbol.zh : CHECK_IN_REWARD.symbol.en;

  // 今日已签到（从常驻入口打开）：仅展示连签进度，不再可领取
  const alreadyClaimed = !preview.shouldShow;
  const showAsDone = status === 'done' || alreadyClaimed;

  const displayDay = Math.min(preview.claimDay, CHECK_IN_MAX_DAILY);
  const streakCount = preview.claimDay;
  const afterBalance = Math.max(0, preview.balance + preview.reward - preview.penalty);
  const shownBalance = status === 'done' ? afterBalance : preview.balance;

  const handleClaim = () => {
    if (status !== 'idle') return;
    onClaim();
    setStatus('done');
    setTimeout(onClose, 1500);
  };

  return (
    <div className="sheet-backdrop" onClick={status === 'idle' ? onClose : undefined}>
      <div className="checkin-modal" role="dialog" aria-modal="true" aria-label={t('每日签到', 'Daily check-in')} onClick={e => e.stopPropagation()}>
        <button type="button" className="modal-close checkin-close" onClick={onClose} aria-label={t('关闭', 'Close')}>
          <X size={18} strokeWidth={2} />
        </button>

        <div className="checkin-hero">
          <div className="checkin-hero-icon" aria-hidden="true">
            <CalendarCheck size={28} strokeWidth={1.9} />
          </div>
          <span className="checkin-hero-title">{t('每日签到', 'Daily check-in')}</span>
          <span className="checkin-hero-sub">
            {t(`连续签到，免费领${rewardName}`, `Check in daily for free ${rewardName}`)}
          </span>
        </div>

        <div className="checkin-streak">
          <Flame size={13} strokeWidth={2.2} aria-hidden="true" />
          <span>
            {showAsDone
              ? t(`已连续签到 ${streakCount} 天`, `${streakCount}-day check-in streak`)
              : t(`连续签到第 ${streakCount} 天`, `Check-in streak: day ${streakCount}`)}
          </span>
        </div>

        {preview.isBroken && status === 'idle' && !alreadyClaimed && (
          <div className="checkin-break" role="status">
            {t(
              `签到中断了，已扣除 ${preview.penalty} ${symbol}，今天起重新累积`,
              `Your streak ended — ${preview.penalty} ${symbol} deducted. Starting fresh today.`,
            )}
          </div>
        )}

        <div className="checkin-grid">
          {Array.from({ length: CHECK_IN_MAX_DAILY }, (_, idx) => {
            const day = idx + 1;
            const claimed = day < displayDay || (showAsDone && day === displayDay);
            const isToday = day === displayDay && !showAsDone;
            const isCap = day === CHECK_IN_MAX_DAILY;
            return (
              <div
                key={day}
                className={`checkin-day${claimed ? ' is-claimed' : ''}${isToday ? ' is-today' : ''}`}
              >
                <span className="checkin-day-label">
                  {isCap ? t(`第${day}天起`, `Day ${day}+`) : t(`第${day}天`, `Day ${day}`)}
                </span>
                <span className="checkin-day-token" aria-hidden="true">
                  {claimed ? <Check size={15} strokeWidth={2.6} /> : <Sparkles size={14} strokeWidth={1.9} />}
                </span>
                <span className="checkin-day-amount">
                  +{day}
                  <span className="checkin-day-symbol">{symbol}</span>
                </span>
              </div>
            );
          })}
        </div>

        <p className="checkin-rule">
          {t(
            `第 1 天领 1 ${symbol}，往后每天多领 1，第 ${CHECK_IN_MAX_DAILY} 天起每天稳定领 ${CHECK_IN_MAX_DAILY} ${symbol}；中断后会扣除 ${CHECK_IN_MAX_DAILY} ${symbol}，并从第 1 天重新开始。`,
            `Day 1 gives 1 ${symbol}, then +1 each day, up to ${CHECK_IN_MAX_DAILY} ${symbol} per day from Day ${CHECK_IN_MAX_DAILY}. Miss a day and ${CHECK_IN_MAX_DAILY} ${symbol} is deducted, restarting from Day 1.`,
          )}
        </p>

        {status === 'done' ? (
          <div className="checkin-done">
            <span className="checkin-done-icon" aria-hidden="true">
              <Check size={20} strokeWidth={3} />
            </span>
            <span className="checkin-done-text">
              {t(`已领取 +${preview.reward} ${symbol}`, `Claimed +${preview.reward} ${symbol}`)}
            </span>
          </div>
        ) : alreadyClaimed ? (
          <>
            <div className="checkin-done checkin-done--static">
              <span className="checkin-done-icon" aria-hidden="true">
                <Check size={20} strokeWidth={3} />
              </span>
              <span className="checkin-done-text">
                {t('今日已签到，明天再来', "Checked in today — see you tomorrow")}
              </span>
            </div>
            <button type="button" className="checkin-ghost-btn" onClick={onClose}>
              {t('知道了', 'Got it')}
            </button>
          </>
        ) : (
          <button type="button" className="checkin-claim-btn" onClick={handleClaim}>
            {t(
              `领取今日奖励 +${preview.reward} ${symbol}`,
              `Claim today's reward +${preview.reward} ${symbol}`,
            )}
          </button>
        )}

        <span className="checkin-balance">
          {t(`累计已领 ${shownBalance} ${symbol}`, `Total earned: ${shownBalance} ${symbol}`)}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// App（路由 + 全局状态）
// ═══════════════════════════════════════════════════════════════
