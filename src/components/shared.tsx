import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BadgeCheck, ChevronRight, CircleCheck, FileText, Link, Lock, Star } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { useApp } from '../AppContext';
import { isVerifiedAuthor } from '../mockData';
import type { Post } from '../types';
import { KnowledgePlanetIcon } from './KnowledgePlanetIcon';

const AVATAR_COLORS = ['#00cdb8', '#0e3060', '#f4e4c4', '#1a2a4e', '#d6fff6'];

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  const { t } = useApp();
  return (
    <BadgeCheck
      size={size}
      className="verified-badge"
      strokeWidth={2.25}
      aria-label={t('已认证', 'Verified')}
    />
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
      aria-label={t(`${level} 星`, `${level} ${level === 1 ? 'star' : 'stars'}`)}
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

// ── PageHeader ─────────────────────────────────────────────────
export function PageHeader({ title, onBack, action }: { title?: string; onBack?: () => void; action?: React.ReactNode }) {
  const { t } = useApp();
  return (
    <div className="page-header" data-layer="page-header">
      {onBack && (
        <button className="back-btn" type="button" onClick={onBack} aria-label={t('返回', 'Back')}>
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
          aria-label={t('阅读文章', 'Read article')}
          onKeyDown={onArticleClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onArticleClick(); } : undefined}
        >
          <div className="media-article-card-head">
            <span className="media-article-card-badge">
              <FileText size={14} strokeWidth={2} aria-hidden="true" />
              {t('长文', 'Article')}
            </span>
            <span className="media-article-card-cta">
              {t('阅读全文', 'Read article')}
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
        aria-label={t('阅读文章', 'Read article')}
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
        aria-label={t('播放视频', 'Play video')}
        onKeyDown={onVideoClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onVideoClick(); } : undefined}
      >
        <div className="video-text"><span>{t('RAG 技术', 'RAG Technology')}</span><span>{t('原理与实践', 'Theory & Practice')}</span><i /></div>
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
            aria-label={clickable ? (locked ? t('点击解锁查看图片', 'Unlock to view image') : t('查看大图', 'View full image')) : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onImageClick!(i); } : undefined}
          >
            {locked && clickable && (
              <div className="img-lock-overlay">
                <div className="img-lock-badge">
                  <Lock size={13} strokeWidth={2.5} aria-hidden="true" />
                  <span>{t('解锁', 'Unlock')}</span>
                </div>
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
      aria-label={onClick ? t('阅读文章', 'Read article') : undefined}
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
}: {
  post: Post;
  alwaysExpand?: boolean;
  /** Max lines to show in feed; 0 = no clamp (detail page). Default 0. */
  collapseLines?: number;
}) {
  const { openLink, linkedPostIds, t } = useApp();
  const isPaid = post.visiblePercent < 100 && !alwaysExpand && !linkedPostIds.has(post.id);
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
          aria-label={t('全文', 'Show full text')}
        >
          {t('全文', 'Full text')}
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
            onClick={(e) => { e.stopPropagation(); openLink(post.id, 'unlock'); }}
          >
            <Lock size={11} strokeWidth={2.5} />
            <span>{t('解锁全部内容', 'Unlock full content')}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── GeminiNodeBadge ────────────────────────────────────────────
export function GeminiNodeBadge({ post, showChain = true }: { post: Post; showChain?: boolean }) {
  const { openLink, linkedPostIds, t } = useApp();
  const isLinked = linkedPostIds.has(post.id);

  const handleLink = () => openLink(post.id);
  return (
    <div
      className="gemini-badge"
      data-layer="gemini-node-badge"
      role="button"
      tabIndex={0}
      onClick={handleLink}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleLink();
        }
      }}
      aria-label={t(`链接节点 ${post.nodeId}，${post.rating} 星`, `Link node ${post.nodeId}, ${post.rating} ${post.rating === 1 ? 'star' : 'stars'}`)}
    >
      <div className="gemini-left">
        <KnowledgePlanetIcon className="gemini-icon" />
        <span className="gemini-label">{t('知识星球', 'Knowledge Planet')}</span>
        <span className="gemini-sep">·</span>
        <Rating value={post.rating} />
        <span className="gemini-sep">·</span>
        <span className="gemini-id">{post.nodeId}</span>
      </div>
      {showChain && (
        isLinked ? (
          <div className="gemini-chain gemini-chain--linked" aria-label={t(`已链接，共 ${post.links} 人`, `Linked by ${post.links} people`)}>
            <CircleCheck size={14} strokeWidth={2.5} />
            <span>{t('已链接', 'Linked')}</span>
            <span className="gemini-chain-count">{post.links}</span>
          </div>
        ) : (
          <button type="button" className="gemini-chain"
            onClick={(e) => { e.stopPropagation(); openLink(post.id); }}
            aria-label={t(`链接此节点，当前 ${post.links} 人已链接`, `Link this node, ${post.links} people linked`)}>
            <Link size={14} strokeWidth={2.5} />{post.links}
            <ChevronRight size={12} strokeWidth={2.5} />
          </button>
        )
      )}
    </div>
  );
}

// ── InlineComments ─────────────────────────────────────────────
