import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BadgeCheck, ChevronRight, CircleCheck, FileText, Gem, Link, Lock, Radio, RotateCcw, Settings, Star, Wallet } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { useApp } from '../AppContext';
import { isVerifiedAuthor } from '../mockData';
import type { Channel, Post } from '../types';
import { KnowledgePlanetIcon } from './KnowledgePlanetIcon';

const AVATAR_COLORS = ['#00cdb8', '#0e3060', '#f4e4c4', '#1a2a4e', '#d6fff6'];

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  const { t } = useApp();
  return (
    <BadgeCheck
      size={size}
      className="verified-badge"
      strokeWidth={2.25}
      aria-label={t('已认证')}
    />
  );
}

// ── GenesisBadge（创世节点持有者身份标记：银=1000 档 / 金=10000 档）──
// 与频道会员小标（ChannelMemberBadge）视觉上刻意区分：不同图标 + 不同 token 色，避免用户混淆两套身份体系
export function GenesisBadge({ tier, size = 12 }: { tier: 'silver' | 'gold'; size?: number }) {
  const { t } = useApp();
  const label = t('创世');
  return (
    <span
      className={`genesis-owner-badge genesis-owner-badge--${tier}`}
      aria-label={tier === 'gold' ? t('创世节点·金（10000 档）') : t('创世节点·银（1000 档）')}
      title={tier === 'gold' ? t('创世节点·金') : t('创世节点·银')}
    >
      <Gem size={size} strokeWidth={2.4} />
      <span className="genesis-owner-badge-text">{label}</span>
    </span>
  );
}

// ── ChannelMemberBadge（频道会员身份小标，YouTube Membership 式）──
export function ChannelMemberBadge({ tierName, size = 12 }: { tierName: string; size?: number }) {
  const { t } = useApp();
  return (
    <span
      className="channel-member-badge"
      aria-label={t('频道会员 · {tierName}', { tierName })}
      title={t('频道会员 · {tierName}', { tierName })}
    >
      <Gem size={size} strokeWidth={2.4} />
      <span className="channel-member-badge-text">{tierName}</span>
    </span>
  );
}

export function AuthorName({
  name,
  as = 'span',
  className,
}: {
  name: string;
  as?: 'span' | 'h2';
  className?: string;
}) {
  const verified = isVerifiedAuthor(name);
  const rowClass = `author-name-row${className ? ` ${className}` : ''}`;
  const content = (
    <>
      <span className="author-name-text">{name}</span>
      {verified && <VerifiedBadge />}
    </>
  );
  if (as === 'h2') {
    return <h2 className={rowClass}>{content}</h2>;
  }
  return <span className={rowClass}>{content}</span>;
}

export function Avatar({ index, seed, onClick }: { index: number; seed?: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <div
      className="avatar"
      data-layer="avatar"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <BoringAvatar
        size="100%"
        name={seed ?? String(index)}
        variant="beam"
        colors={AVATAR_COLORS}
      />
    </div>
  );
}

// ── ChannelCard（频道卡片：发现页推荐、个人主页频道目录共用同一套展示）──
export function ChannelCard({
  channel,
  index,
  onClick,
  onManage,
  showAvatar = true,
}: {
  channel: Channel;
  index: number;
  onClick: () => void;
  /** 传入后在卡片右侧展示「管理」快捷入口（仅频道主视角） */
  onManage?: () => void;
  /** 同一用户名下的多个频道目前共用同一个头像种子（都取自本人头像），并排展示时
   * 头像完全相同、无法区分，反而占地方——同一用户的频道列表场景可以传 false 隐藏；
   * 跨用户的频道发现场景（不同频道主头像各不相同）应保留 true（默认） */
  showAvatar?: boolean;
}) {
  const { t } = useApp();
  // 注：外层不能用 <button> 包 <button>（管理按钮）——嵌套交互元素是无效 HTML，
  // 部分浏览器（尤其 WebKit）会导致内层点击拿不到事件。改用 div+role="button" 承载整卡点击，
  // 管理按钮保留原生 <button>，两者是兄弟节点而非嵌套。
  return (
    <div
      className="channel-discover-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {showAvatar && <Avatar index={index} seed={channel.avatarSeed} />}
      <div className="channel-discover-info">
        <span className="channel-discover-name">
          <Radio size={13} strokeWidth={2.2} />
          {channel.name}
        </span>
        <span className="channel-discover-desc">{channel.description}</span>
        <div className="channel-discover-meta">
          <span className="channel-discover-subs">{t('{subscriberCount} 人已订阅', { subscriberCount: channel.subscriberCount })}</span>
        </div>
      </div>
      {onManage && (
        <button
          type="button"
          className="channel-manage-btn channel-discover-manage-btn"
          onClick={e => { e.stopPropagation(); onManage(); }}
        >
          <Settings size={13} strokeWidth={2.2} />
          {t('管理频道2')}
        </button>
      )}
    </div>
  );
}

// ── Rating（移植自 gemini-codevault/gemini-app/NodesPage.tsx StarPatternGraphic）──
const STAR_COLORS: Record<number, string> = {
  0: '#94a3b8',
  1: '#10b981',
  2: '#6366f1',
  3: '#7C3AED',
  4: '#ef4444',
  5: '#f59e0b',
};
const STAR_SHADOWS: Record<number, string> = {
  0: 'rgba(148,163,184,0.3)',
  1: 'rgba(16,185,129,0.5)',
  2: 'rgba(99,102,241,0.5)',
  3: 'rgba(124,58,237,0.5)',
  4: 'rgba(239,68,68,0.5)',
  5: 'rgba(245,158,11,0.8)',
};

export function Rating({ value, size = 28 }: { value: number; size?: number }) {
  const { t } = useApp();
  const level = Math.max(0, Math.min(5, value));
  const color = STAR_COLORS[level] ?? STAR_COLORS[0];
  const shadow = STAR_SHADOWS[level] ?? STAR_SHADOWS[0];

  return (
    <div
      aria-label={t('{level} 星', { level, unit: level === 1 ? 'star' : 'stars' })}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0, filter: `drop-shadow(0 0 6px ${shadow})` }}
    >
      <Star size={size} fill={color} strokeWidth={0} style={{ display: 'block' }} />
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700,
        fontSize: Math.floor(size * 0.4),
        lineHeight: 1,
        textShadow: '0 1px 2px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
      }}>
        {level}
      </span>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────
export function Toast({ msg, type }: { msg: string; type?: 'demo' }) {
  return (
    <div className={`toast${type === 'demo' ? ' toast--demo' : ''}`} role="status">
      {type === 'demo' && <span className="toast-demo-badge">DEMO</span>}
      {msg}
    </div>
  );
}

// ── PullToRefresh（下拉刷新：触屏拖拽触发 onRefresh，用于重新拉取余额 / 空投 / 节点等 mock 数据；移植自 genesis-node-diamond）──
const PTR_TRIGGER = 56;
const PTR_MAX = 90;

export function PullToRefresh({
  className,
  onRefresh,
  disabled,
  children,
}: {
  className?: string;
  onRefresh: () => void | Promise<void>;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Pointer Events 统一处理触屏手指与桌面鼠标拖拽（PC Chrome 用鼠标下拉即可测试）
    const handlePointerDown = (e: PointerEvent) => {
      if (disabled || refreshing) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (el.scrollTop > 0) return;
      startYRef.current = e.clientY;
      pullingRef.current = false;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (disabled || refreshing || startYRef.current === null) return;
      const deltaY = e.clientY - startYRef.current;
      if (deltaY <= 0 || el.scrollTop > 0) {
        if (pullingRef.current) setPullDistance(0);
        pullingRef.current = false;
        return;
      }
      pullingRef.current = true;
      e.preventDefault();
      setPullDistance(Math.min(PTR_MAX, deltaY * 0.5));
    };

    const handlePointerUp = () => {
      startYRef.current = null;
      if (!pullingRef.current) return;
      pullingRef.current = false;
      setPullDistance(current => {
        if (current >= PTR_TRIGGER && !disabled) {
          setRefreshing(true);
          Promise.resolve(onRefresh()).finally(() => {
            setRefreshing(false);
            setPullDistance(0);
          });
          return PTR_TRIGGER;
        }
        return 0;
      });
    };

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove, { passive: false });
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);
    el.addEventListener('pointerleave', handlePointerUp);
    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerUp);
      el.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [disabled, refreshing, onRefresh]);

  const progress = Math.min(1, pullDistance / PTR_TRIGGER);
  const visiblePull = refreshing ? PTR_TRIGGER : pullDistance;
  const statusLabel = refreshing
    ? t('刷新中…')
    : progress >= 1
      ? t('松开刷新')
      : t('下拉刷新');

  return (
    <div className={className} ref={containerRef}>
      {/* 正常文档流占位：高度随下拉距离增长，把下方内容自然推开，不覆盖顶部插画的圆角叠层 */}
      <div
        className="ptr-indicator"
        style={{
          height: visiblePull,
          transition: refreshing || pullDistance === 0 ? 'height 0.25s ease' : 'none',
        }}
        aria-hidden={!refreshing}
      >
        <span className={`ptr-indicator-pill${refreshing ? ' ptr-indicator-pill--active' : ''}`} style={{ opacity: refreshing ? 1 : progress }}>
          <RotateCcw
            size={14}
            strokeWidth={2}
            className={refreshing ? 'planet-spin' : undefined}
            style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
          />
          <span>{statusLabel}</span>
        </span>
      </div>
      {children}
    </div>
  );
}

// ── PageHeader ─────────────────────────────────────────────────
export function PageHeader({ title, onBack, action, className }: { title?: string; onBack?: () => void; action?: React.ReactNode; className?: string }) {
  const { t } = useApp();
  return (
    <div className={`page-header${className ? ` ${className}` : ''}`} data-layer="page-header">
      {onBack && (
        <button className="back-btn" type="button" onClick={onBack} aria-label={t('返回')}>
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
      )}
      {title && <span className="page-title">{title}</span>}
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

// ── MediaPlaceholder ───────────────────────────────────────────
export function MediaPlaceholder({
  kind,
  articleHasCover = true,
  imageCount = 3,
  visibleImgCount = 3,
  visiblePercent = 100,
  onImageClick,
  onArticleClick,
  onVideoClick,
}: {
  kind: Post['kind'];
  articleHasCover?: boolean;
  imageCount?: number;
  visibleImgCount?: number;
  visiblePercent?: number;
  onImageClick?: (idx: number) => void;
  onArticleClick?: () => void;
  onVideoClick?: () => void;
}) {
  const { t } = useApp();
  if (kind === 'text') return null;
  if (kind === 'article') {
    if (articleHasCover === false) {
      return (
        <div
          className={`media media-article-card${onArticleClick ? ' media-article-card--clickable' : ''}`}
          data-layer="article-card"
          onClick={onArticleClick ? (e) => { e.stopPropagation(); onArticleClick(); } : undefined}
          role={onArticleClick ? 'button' : undefined}
          tabIndex={onArticleClick ? 0 : undefined}
          aria-label={t('阅读文章')}
          onKeyDown={onArticleClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onArticleClick(); } : undefined}
        >
          <div className="media-article-card-head">
            <span className="media-article-card-badge">
              <FileText size={14} strokeWidth={2} aria-hidden="true" />
              {t('长文')}
            </span>
            <span className="media-article-card-cta">
              {t('阅读全文')}
              <ChevronRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </span>
          </div>
          <div className="media-article-card-lines" aria-hidden="true">
            <span className="media-article-card-line media-article-card-line--strong" />
            <span className="media-article-card-line media-article-card-line--mid" />
            <span className="media-article-card-line media-article-card-line--short" />
          </div>
        </div>
      );
    }
    return (
      <div
        className={`media media-article${onArticleClick ? ' media-article--clickable' : ''}`}
        data-layer="article-cover"
        onClick={onArticleClick ? (e) => { e.stopPropagation(); onArticleClick(); } : undefined}
        role={onArticleClick ? 'button' : undefined}
        tabIndex={onArticleClick ? 0 : undefined}
        aria-label={t('阅读文章')}
        onKeyDown={onArticleClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onArticleClick(); } : undefined}
      />
    );
  }
  if (kind === 'video') {
    return (
      <div
        className={`media media-video${onVideoClick ? ' media-video--clickable' : ''}`}
        data-layer="video-cover"
        onClick={onVideoClick ? (e) => { e.stopPropagation(); onVideoClick(); } : undefined}
        role={onVideoClick ? 'button' : undefined}
        tabIndex={onVideoClick ? 0 : undefined}
        aria-label={t('播放视频')}
        onKeyDown={onVideoClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onVideoClick(); } : undefined}
      >
        <div className="video-text"><span>{t('RAG 技术')}</span><span>{t('原理与实践')}</span><i /></div>
        <div className="play"><span /></div>
        <span className="duration">18:42</span>
      </div>
    );
  }
  // image — 多图网格，支持 1-9 张
  const clickable = !!onImageClick;
  const colClass = imageCount === 1 ? 'img-grid--1'
    : imageCount === 2 ? 'img-grid--2'
    : imageCount === 3 ? 'img-grid--3'
    : imageCount === 4 ? 'img-grid--4'
    : imageCount <= 6 ? 'img-grid--3'
    : 'img-grid--multi';
  const lockedCount = Math.max(0, imageCount - visibleImgCount);
  return (
    <div className={`img-grid ${colClass}${lockedCount > 0 ? ' img-grid--has-locked' : ''}`} data-layer="image-cover">
      {Array.from({ length: imageCount }, (_, i) => {
        const locked = i >= visibleImgCount;
        return (
          <div
            key={i}
            className={`img-grid-cell${clickable ? ' img-grid-cell--clickable' : ''}${locked ? ' img-grid-cell--locked' : ''}`}
            onClick={clickable ? (e) => { e.stopPropagation(); onImageClick!(i); } : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={clickable ? (locked ? t('点击解锁查看图片') : t('查看大图')) : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onImageClick!(i); } : undefined}
          >
            {locked && (
              <div className="img-lock-overlay" aria-hidden="true">
                <KnowledgePlanetIcon className="img-lock-pattern" />
                {clickable && (
                  <div className="img-lock-badge">
                    <Lock size={13} strokeWidth={2.5} aria-hidden="true" />
                    <span>{t('解锁')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ArticleFeedCard({ post, onClick }: { post: Post; onClick?: () => void }) {
  const { t } = useApp();
  const preview = post.articlePreview ?? post.title.replace(/\n+/g, ' ');
  const title = post.title.split('\n')[0]?.trim() || post.title;

  const handleClick = onClick
    ? (e: React.MouseEvent) => { e.stopPropagation(); onClick(); }
    : undefined;

  return (
    <div
      className={`article-feed-card${post.articleHasCover === false ? ' article-feed-card--no-cover' : ''}${onClick ? ' article-feed-card--clickable' : ''}`}
      data-layer="article-feed-card"
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? t('阅读文章') : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      } : undefined}
    >
      {post.articleHasCover !== false && <div className="media media-article article-feed-card-cover" data-layer="article-cover" />}
      <div className="article-feed-card-body">
        <h3 className="article-feed-card-title">{title}</h3>
        <p className="article-feed-card-preview">{preview}</p>
      </div>
    </div>
  );
}

// ── PostContent ────────────────────────────────────────────────

export function PostContent({
  post,
  alwaysExpand = false,
  collapseLines = 0,
  forceLocked = false,
  lockLabel,
  onUnlockOverride,
}: {
  post: Post;
  alwaysExpand?: boolean;
  /** Max lines to show in feed; 0 = no clamp (detail page). Default 0. */
  collapseLines?: number;
  /** 频道会员门槛未达标时强制锁定，无视 visiblePercent（频道锁优先于按比例解锁）*/
  forceLocked?: boolean;
  /** 锁定提示文案覆盖，如"订阅『Lv.2』解锁" */
  lockLabel?: string;
  /** 解锁点击行为覆盖，如跳转频道订阅弹窗而非常规按次付费解锁 */
  onUnlockOverride?: () => void;
}) {
  const { openLink, linkedPostIds, t } = useApp();
  const isPaid = forceLocked || (post.visiblePercent < 100 && !alwaysExpand && !linkedPostIds.has(post.id));
  const [clamped, setClamped] = useState(true);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  const shouldClamp = collapseLines > 0 && clamped && !alwaysExpand && !isPaid;

  useEffect(() => {
    const el = textRef.current;
    if (!el || collapseLines <= 0 || alwaysExpand || isPaid) return;
    // Check if content overflows the line clamp
    if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
      setOverflowing(true);
    }
  }, [post.title, collapseLines, alwaysExpand, isPaid]);

  return (
    <div className={`post-content-wrap${isPaid ? ' is-paid' : ''}${shouldClamp ? ' post-content-wrap--clamp' : ''}`} data-layer="post-content">
      <p
        ref={textRef}
        className={`post-title${shouldClamp ? ' post-title--clamped' : ''}${collapseLines > 0 ? ` post-title--max-${collapseLines}` : ''}`}
        style={shouldClamp ? { '--clamp-lines': collapseLines } as React.CSSProperties : undefined}
      >
        {post.title}
      </p>
      {shouldClamp && overflowing && (
        <button
          className="post-expand-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setClamped(false);
          }}
          aria-label={t('全文')}
        >
          {t('全文2')}
        </button>
      )}
      {isPaid && (
        <>
          <div className="content-mask" data-layer="content-mask" />
          <div
            className="unlock-hint"
            data-layer="unlock-hint"
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onUnlockOverride ? onUnlockOverride() : openLink(post.id, 'unlock'); }}
          >
            <Lock size={11} strokeWidth={2.5} />
            <span>{lockLabel ?? t('解锁全部内容')}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── GeminiNodeBadge ────────────────────────────────────────────
// leftContent：用其它内容（如 feed 卡片的热力值/打赏）覆盖默认的「知识宇宙·星级·节点ID」左侧内容；
// 此时整条外层点击行为改由 onLeftClick 控制（未传则该区域不可点击），与 onGoToPlanet/链接跳转逻辑互斥。
export function GeminiNodeBadge({ post, showChain = true, onViewLinks, onGoToPlanet, leftContent, onLeftClick, leftAriaLabel }: {
  post: Post; showChain?: boolean; onViewLinks?: () => void; onGoToPlanet?: () => void;
  leftContent?: React.ReactNode; onLeftClick?: () => void; leftAriaLabel?: string;
}) {
  const { openLink, linkedPostIds, t } = useApp();
  const isLinked = linkedPostIds.has(post.id);

  const handleLink = () => (onViewLinks ? onViewLinks() : openLink(post.id));
  const handleBadgeClick = leftContent ? onLeftClick : (onGoToPlanet ? onGoToPlanet : handleLink);
  const clickable = leftContent ? !!onLeftClick : true;
  return (
    <div
      className={`gemini-badge${leftContent ? ' gemini-badge--heat' : ''}`}
      data-layer="gemini-node-badge"
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleBadgeClick : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleBadgeClick!();
        }
      } : undefined}
      aria-label={leftContent
        ? leftAriaLabel
        : (onGoToPlanet
          ? t('查看知识宇宙节点 {nodeId}，{rating} 星', { nodeId: post.nodeId ?? '', rating: post.rating, unit: post.rating === 1 ? 'star' : 'stars' })
          : t('链接节点 {nodeId}，{rating} 星', { nodeId: post.nodeId ?? '', rating: post.rating, unit: post.rating === 1 ? 'star' : 'stars' }))}
    >
      <div className="gemini-left">
        {leftContent ?? (
          <>
            <KnowledgePlanetIcon className="gemini-icon" />
            <span className="gemini-label">{t('知识宇宙')}</span>
            <span className="gemini-sep">·</span>
            <Rating value={post.rating} />
            <span className="gemini-sep">·</span>
            <span className="gemini-id">{post.nodeId}</span>
            {onGoToPlanet && (
              <button
                type="button"
                className="gemini-id-goto"
                onClick={(e) => { e.stopPropagation(); onGoToPlanet(); }}
                aria-label={t('在知识宇宙中查看节点 {nodeId}', { nodeId: post.nodeId ?? '' })}
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            )}
          </>
        )}
      </div>
      {showChain && (
        isLinked ? (
          <div className="gemini-chain gemini-chain--linked" aria-label={t('已链接，共 {links} 人', { links: post.links })}>
            <CircleCheck size={14} strokeWidth={2.5} />
            <span>{t('已链接')}</span>
            <span className="gemini-chain-count">{post.links}</span>
          </div>
        ) : (
          <button type="button" className="gemini-chain"
            onClick={(e) => { e.stopPropagation(); handleLink(); }}
            aria-label={onViewLinks
              ? t('查看 {links} 人链接了此节点', { links: post.links })
              : t('链接此节点，当前 {links} 人已链接', { links: post.links })}>
            <Link size={14} strokeWidth={2.5} />{post.links}
            <ChevronRight size={12} strokeWidth={2.5} />
          </button>
        )
      )}
    </div>
  );
}

// ── InlineComments ─────────────────────────────────────────────
