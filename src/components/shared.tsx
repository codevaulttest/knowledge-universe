import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BadgeCheck, ChevronRight, CircleCheck, FileText, Gem, ImageOff, Link, Lock, Radio, RotateCcw, Settings, Star, Wallet } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { useApp } from '../AppContext';
import { isVerifiedAuthor } from '../mockData';
import type { Channel, Post } from '../types';
import { KnowledgePlanetIcon } from './KnowledgePlanetIcon';
import { ImageWithFallback } from './ImageWithFallback';

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

export function Avatar({ index, seed, avatarUrl, onClick }: { index: number; seed?: string; avatarUrl?: string; onClick?: (e: React.MouseEvent) => void }) {
  const generated = (
    <BoringAvatar
      size="100%"
      name={seed ?? String(index)}
      variant="beam"
      colors={AVATAR_COLORS}
    />
  );
  return (
    <div
      className="avatar"
      data-layer="avatar"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {avatarUrl
        ? <ImageWithFallback src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} fallback={generated} />
        : generated
      }
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
  showSubscribe = false,
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
  /** 访客视角：在卡片右侧展示「订阅 / 已订阅」快捷入口 */
  showSubscribe?: boolean;
}) {
  const { t, subscribedChannelTiers, expiredChannelIds, openChannelSubscribe } = useApp();
  const subscribedTierIndex = subscribedChannelTiers[channel.id];
  const isExpired = expiredChannelIds.has(channel.id);
  const isSubscribed = subscribedTierIndex != null && !isExpired;
  const canSubscribe = isSubscribed || isExpired || channel.tiers.some(tr => !tr.archived);
  // 价格徽章只看付费档位——免费档恒存在，不该把「起价」拉到 0
  const paidActiveTiers = channel.tiers.filter(tr => !tr.archived && !tr.free);
  const subscribedTier = subscribedTierIndex != null ? channel.tiers[subscribedTierIndex] : undefined;
  const accessLabel = (() => {
    if (subscribedTier && isExpired) {
      return t('已过期 · {name}', { name: subscribedTier.name });
    }
    if (subscribedTier) {
      return t('已订阅 · {name}', { name: subscribedTier.name });
    }
    if (paidActiveTiers.length === 0) return t('免费');
    if (paidActiveTiers.length === 1) {
      return t('{price} PB/月', { price: paidActiveTiers[0].price });
    }
    const fromPrice = Math.min(...paidActiveTiers.map(tr => tr.price));
    return t('{price} PB/月起', { price: fromPrice });
  })();
  // 注：外层不能用 <button> 包 <button>（管理/订阅按钮）——嵌套交互元素是无效 HTML，
  // 部分浏览器（尤其 WebKit）会导致内层点击拿不到事件。改用 div+role="button" 承载整卡点击，
  // 右侧操作保留原生 <button>，两者是兄弟节点而非嵌套。
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
          <span className="channel-discover-meta-dot" aria-hidden="true">·</span>
          <span className={`channel-discover-access${paidActiveTiers.length === 0 && !subscribedTier ? ' channel-discover-access--free' : ''}${subscribedTier && !isExpired ? ' channel-discover-access--subscribed' : ''}${isExpired ? ' channel-discover-access--expired' : ''}`}>
            {accessLabel}
          </span>
        </div>
      </div>
      {onManage && (
        <button
          type="button"
          className="channel-manage-btn channel-discover-manage-btn"
          onClick={e => { e.stopPropagation(); onManage(); }}
          aria-label={t('管理频道2')}
          title={t('管理频道2')}
        >
          <Settings size={16} strokeWidth={2.2} />
        </button>
      )}
      {showSubscribe && !onManage && canSubscribe && (
        <button
          type="button"
          className={`channel-manage-btn channel-discover-subscribe-btn${isSubscribed ? ' channel-manage-btn--subscribed' : ''}`}
          onClick={e => { e.stopPropagation(); openChannelSubscribe(channel.id); }}
        >
          {isExpired ? (
            <>
              <RotateCcw size={13} strokeWidth={2.2} aria-hidden="true" />
              {t('续费')}
            </>
          ) : isSubscribed ? (
            <>
              <CircleCheck size={13} strokeWidth={2.2} aria-hidden="true" />
              {t('已订阅')}
            </>
          ) : (
            <>
              <Gem size={13} strokeWidth={2.2} aria-hidden="true" />
              {t('订阅')}
            </>
          )}
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
export function PageHeader({ title, onBack, action, className }: { title?: React.ReactNode; onBack?: () => void; action?: React.ReactNode; className?: string }) {
  const { t } = useApp();
  return (
    <div className={`page-header${className ? ` ${className}` : ''}`} data-layer="page-header">
      {onBack && (
        <button className="back-btn" type="button" onClick={onBack} aria-label={t('返回')}>
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
      )}
      {title != null && title !== '' && <span className="page-title">{title}</span>}
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

// 探测图片是否加载失败（用于封面图等只能用 CSS backgroundImage 渲染、无法直接用 <img onError> 的场景）
function useImageBroken(src?: string): boolean {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    if (!src) { setBroken(false); return; }
    setBroken(false);
    const img = new window.Image();
    img.onload = () => setBroken(false);
    img.onerror = () => setBroken(true);
    img.src = src;
  }, [src]);
  return broken;
}

// ── MediaCarousel（多图左右滑，替代宫格）──────────────────────────
// 规则：封面决定画框高 H；其余每张按自己的真实比例在 H 下算出宽度，
// 再夹到 [H×FRAME_MIN, min(列宽, H×FRAME_MAX)]——复用与单图同一组比例上下限，不额外开 token。
// 单图与多图 carousel 共用同一函数，保证同一套裁切/定框逻辑。
const FRAME_MIN = 9 / 21;  // 竖图上限（最高、最瘦的框）：与 21:9 对称，两个方向都到 21:9，好记
const FRAME_MAX = 21 / 9;  // 横图上限（最扁的框）：放到 21:9，全景等宽图零裁切；更宽（如 1:16 横条）才裁
export function clampFrameRatio(ratio: number): number {
  return Math.min(FRAME_MAX, Math.max(FRAME_MIN, ratio));
}

// 非封面张的宽度百分比（相对画框列宽）：自身比例 ÷ 封面画框比例 = 高固定时的自然宽度占比，
// 再夹到 [FRAME_MIN/frameRatio, min(88%, FRAME_MAX/frameRatio)]——88% 与封面同宽、与 --ku-media-carousel-slide-width 保持一致。
const MAX_SLIDE_PCT = 88;
function nonCoverSlideWidthPct(ratio: number, frameRatio: number): number {
  const natural = (ratio / frameRatio) * 100;
  const minPct = (FRAME_MIN / frameRatio) * 100;
  const maxPct = Math.min(MAX_SLIDE_PCT, (FRAME_MAX / frameRatio) * 100);
  return Math.min(maxPct, Math.max(minPct, natural));
}

// 方向 C：竖图（画框比例 < 1）不满宽——按最大高度反推宽度（宽 = 最大高 × 比例），
// 超高只缩窄、不裁切，居左留右白边。横图/方图（≥1）照旧满宽，返回 undefined 走默认 100%。
function frameCapWidth(frameRatio: number): string | undefined {
  return frameRatio < 1
    ? `min(100%, calc(var(--ku-media-frame-max-h) * ${frameRatio}))`
    : undefined;
}

// 右上页码（无底部圆点，省垂直空间）；横滑走 carousel、竖滑照常滚 feed。
function MediaCarousel({
  imageCount,
  visibleImgCount,
  frameRatio,
  images,
  imageRatios,
  onImageClick,
  lockActionLabel,
}: {
  imageCount: number;
  visibleImgCount: number;
  frameRatio: number;
  images?: string[];
  imageRatios?: number[];
  onImageClick?: (idx: number) => void;
  /** 锁图角标动作文案覆盖，如频道门槛锁用"订阅"、按次付费锁用默认的"解锁" */
  lockActionLabel?: string;
}) {
  const { t } = useApp();
  const clickable = !!onImageClick;
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  // 拖拽临时态放 ref，避免每帧 setState 重渲染；moved 用于区分「滑动」与「点击看大图」
  const drag = useRef({ x0: 0, offset: 0, active: false, moved: false });
  const GAP = 8; // 与 --ku-media-carousel-gap 保持一致（JS 需用数值计算位移）

  // 各张宽度不再统一（封面按封面自身比例定宽，其余张各自算），滑动位移改累加各张实际渲染宽度
  const cumulativeOffset = (i: number) => {
    const tr = trackRef.current;
    if (!tr) return 0;
    let total = 0;
    for (let k = 0; k < i; k++) {
      const el = tr.children[k] as HTMLElement | undefined;
      total += (el?.getBoundingClientRect().width ?? 0) + GAP;
    }
    return total;
  };

  const settle = (i: number) => {
    const tr = trackRef.current;
    if (!tr) return;
    tr.style.transition = '';
    tr.style.transform = `translateX(${-cumulativeOffset(i)}px)`;
  };

  useEffect(() => { settle(idx); });

  useEffect(() => {
    const onResize = () => settle(idx);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [idx]);

  // 拖拽期间把 move/up 挂到 window：既能在露边滑出元素后继续收事件，
  // 又不用 setPointerCapture——capture 会把随后的 click 改派到容器上，
  // 绕过 slide 自身的 onClick+stopPropagation，导致 feed 里误跳帖子详情。
  const handleMove = (e: PointerEvent) => onMove(e.clientX);
  const handleEnd = (e: PointerEvent) => {
    onUp(e.clientX);
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleEnd);
    window.removeEventListener('pointercancel', handleEnd);
  };
  const handleDown = (e: React.PointerEvent) => {
    const tr = trackRef.current;
    if (!tr) return;
    drag.current = { x0: e.clientX, offset: cumulativeOffset(idx), active: true, moved: false };
    tr.style.transition = 'none';
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
  };
  const onMove = (x: number) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = x - d.x0;
    if (Math.abs(dx) > 4) d.moved = true;
    if (trackRef.current) trackRef.current.style.transform = `translateX(${-d.offset + dx}px)`;
  };
  const onUp = (x: number) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const dx = x - d.x0;
    let next = idx;
    if (dx < -40) next = Math.min(imageCount - 1, idx + 1);
    else if (dx > 40) next = Math.max(0, idx - 1);
    if (next === idx) settle(idx); else setIdx(next);
  };

  return (
    <div
      className="media-carousel"
      data-layer="image-cover"
      style={{ width: frameCapWidth(frameRatio) }}
      onPointerDown={handleDown}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="media-carousel-viewport" style={{ aspectRatio: String(frameRatio) }}>
        <div className="media-carousel-track" ref={trackRef}>
          {Array.from({ length: imageCount }, (_, i) => {
            const locked = i >= visibleImgCount;
            // 封面（第 1 张）固定与画框同宽（默认 88%，走 CSS token）；其余张按自身真实比例算宽度，无数据时回退封面比例（等宽，旧行为）
            const widthPct = i === 0 ? undefined : nonCoverSlideWidthPct(imageRatios?.[i] ?? frameRatio, frameRatio);
            return (
              <div
                key={i}
                className={`media-carousel-slide${locked ? ' media-carousel-slide--locked' : ''}${clickable ? ' media-carousel-slide--clickable' : ''}`}
                style={{
                  ...(!locked && images?.[i] ? { backgroundImage: `url('${images[i]}')` } : {}),
                  ...(widthPct !== undefined ? { flex: `0 0 ${widthPct}%` } : {}),
                }}
                onClick={clickable ? (e) => { e.stopPropagation(); if (!drag.current.moved) onImageClick!(i); } : undefined}
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
                        <span>{lockActionLabel ?? t('解锁全部内容（{count} 张）', { count: imageCount })}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="media-carousel-overlay-counter">{idx + 1} / {imageCount}</div>
      </div>
    </div>
  );
}

// ── MediaPlaceholder ───────────────────────────────────────────
export function MediaPlaceholder({
  kind,
  articleHasCover = true,
  imageCount = 3,
  imageAspect = 'landscape',
  imageRatio,
  images,
  imageRatios,
  visibleImgCount = 3,
  visiblePercent = 100,
  onImageClick,
  onArticleClick,
  onVideoClick,
  lockActionLabel,
}: {
  kind: Post['kind'];
  articleHasCover?: boolean;
  imageCount?: number;
  imageAspect?: 'landscape' | 'tall';
  imageRatio?: number;
  images?: string[];
  imageRatios?: number[];
  visibleImgCount?: number;
  visiblePercent?: number;
  onImageClick?: (idx: number) => void;
  onArticleClick?: () => void;
  onVideoClick?: () => void;
  /** 锁图角标动作文案覆盖，如频道门槛锁用"订阅"、按次付费锁用默认的"解锁" */
  lockActionLabel?: string;
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
    const locked = visiblePercent < 100;
    return (
      <div
        className={`media media-video${onVideoClick ? ' media-video--clickable' : ''}${locked ? ' media-video--locked' : ''}`}
        data-layer="video-cover"
        onClick={onVideoClick ? (e) => { e.stopPropagation(); onVideoClick(); } : undefined}
        role={onVideoClick ? 'button' : undefined}
        tabIndex={onVideoClick ? 0 : undefined}
        aria-label={locked ? t('点击解锁播放视频') : t('播放视频')}
        onKeyDown={onVideoClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onVideoClick(); } : undefined}
      >
        <div className="video-text"><span>{t('RAG 技术')}</span><span>{t('原理与实践')}</span><i /></div>
        {locked ? (
          <div className="img-lock-badge img-lock-badge--video">
            <Lock size={13} strokeWidth={2.5} aria-hidden="true" />
            <span>{lockActionLabel ?? t('解锁全部内容')}</span>
          </div>
        ) : (
          <div className="play"><span /></div>
        )}
        <span className="duration">18:42</span>
      </div>
    );
  }
  // image — 画框比例统一由真实宽高比夹取 [3:4,16:9]；缺省回退旧的 landscape/tall 两档
  const frameRatio = clampFrameRatio(imageRatio ?? (imageAspect === 'tall' ? 9 / 16 : 16 / 9));
  // 多图（≥2 张）走左右滑 carousel；单图用同一画框比例
  if (imageCount >= 2) {
    return (
      <MediaCarousel
        imageCount={imageCount}
        visibleImgCount={visibleImgCount}
        frameRatio={frameRatio}
        images={images}
        imageRatios={imageRatios}
        onImageClick={onImageClick}
        lockActionLabel={lockActionLabel}
      />
    );
  }
  const clickable = !!onImageClick;
  const lockedCount = Math.max(0, imageCount - visibleImgCount);
  // 竖图（画框比例 < 1）换竖构图插画资产；用独立类只换背景图，不带旧 tall 的窄宽约束
  const tallArt = frameRatio < 1;
  // eslint-disable-next-line react-hooks/rules-of-hooks -- imageCount 恒为 1，非条件调用
  const broken = useImageBroken(images?.[0]);
  return (
    <div className={`img-grid img-grid--1${tallArt ? ' img-grid--1-tall' : ''}${lockedCount > 0 ? ' img-grid--has-locked' : ''}`} data-layer="image-cover" style={{ aspectRatio: String(frameRatio), width: frameCapWidth(frameRatio) }}>
      {Array.from({ length: imageCount }, (_, i) => {
        const locked = i >= visibleImgCount;
        const cellBroken = i === 0 && broken;
        return (
          <div
            key={i}
            className={`img-grid-cell${clickable ? ' img-grid-cell--clickable' : ''}${locked ? ' img-grid-cell--locked' : ''}`}
            style={!locked && images?.[i] && !cellBroken ? { backgroundImage: `url('${images[i]}')` } : undefined}
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
                    <span>{lockActionLabel ?? t('解锁全部内容')}</span>
                  </div>
                )}
              </div>
            )}
            {!locked && cellBroken && (
              <div className="image-fallback" aria-hidden="true">
                <ImageOff size={22} strokeWidth={1.8} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ArticleFeedCard({ post, onClick, locked = false, lockLabel }: { post: Post; onClick?: () => void; /** 频道会员门槛未达标：隐藏摘要，标题走固定预览 */ locked?: boolean; lockLabel?: string }) {
  const { t } = useApp();
  const preview = post.articlePreview ?? post.title.replace(/\n+/g, ' ');
  const title = locked ? lockedTeaser(post.title) : (post.title.split('\n')[0]?.trim() || post.title);

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
        {locked ? (
          <div className="unlock-hint" data-layer="unlock-hint">
            <Lock size={11} strokeWidth={2.5} />
            <span>{lockLabel ?? t('解锁全部内容')}</span>
          </div>
        ) : (
          <p className="article-feed-card-preview">{preview}</p>
        )}
      </div>
    </div>
  );
}

// ── PostContent ────────────────────────────────────────────────

/** 会员门槛锁定态的固定预览字数上限（加权单位）：与屏幕宽度、visiblePercent 无关，跨设备统一 */
const LOCKED_TEASER_CAP = 60;

/** 全角字符（中日韩统一表意文字、假名、谚文、全角标点等）实际显示宽度约为半角字符的两倍，计权重 2；
 * 英文字母、数字、半角标点、空格计权重 1。避免中英文混排标题在同一字数上限下渲染宽度差一倍。 */
function charWeight(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  const isFullWidth =
    (code >= 0x1100 && code <= 0x115F) || // 谚文字母
    (code >= 0x2E80 && code <= 0x303E) || // 中日韩部首、符号
    (code >= 0x3041 && code <= 0x33FF) || // 平假名/片假名..中日韩兼容
    (code >= 0x3400 && code <= 0x4DBF) || // 中日韩扩展 A
    (code >= 0x4E00 && code <= 0x9FFF) || // 中日韩统一表意文字
    (code >= 0xA960 && code <= 0xA97F) ||
    (code >= 0xAC00 && code <= 0xD7A3) || // 谚文音节
    (code >= 0xF900 && code <= 0xFAFF) || // 中日韩兼容表意文字
    (code >= 0xFF00 && code <= 0xFF60) || // 全角字符
    (code >= 0xFFE0 && code <= 0xFFE6);
  return isFullWidth ? 2 : 1;
}

/** 频道会员锁定时的固定预览文案：只取创作者换行分出的第一段，并按加权字数硬上限截断，不看屏幕宽度；截断处交给正常排版收尾，不拼省略号字符 */
function lockedTeaser(title: string): string {
  const firstPara = title.split('\n')[0] ?? '';
  let weight = 0;
  let result = '';
  for (const ch of firstPara) {
    const w = charWeight(ch);
    if (weight + w > LOCKED_TEASER_CAP) break;
    weight += w;
    result += ch;
  }
  return result;
}

export function PostContent({
  post,
  alwaysExpand = false,
  collapseLines = 0,
  forceLocked = false,
  lockLabel,
  lockLabelBare,
  onUnlockOverride,
}: {
  post: Post;
  alwaysExpand?: boolean;
  /** Max lines to show in feed; 0 = no clamp (detail page). Default 0. */
  collapseLines?: number;
  /** 频道会员门槛未达标时强制锁定，无视 visiblePercent（频道锁优先于按比例解锁）*/
  forceLocked?: boolean;
  /** 锁定提示文案覆盖，如"订阅『Lv.2』解锁"；仅频道锁单独生效（不叠加按次付费锁）时使用 */
  lockLabel?: string;
  /** 频道锁与按次付费锁叠加时使用的文案，不带"解锁"承诺，如"订阅『Lv.2』" */
  lockLabelBare?: string;
  /** 解锁点击行为覆盖，如跳转频道订阅弹窗而非常规按次付费解锁 */
  onUnlockOverride?: () => void;
}) {
  const { openLink, linkedPostIds, showToast, t } = useApp();
  // 频道锁与按次付费锁是两套独立机制：分别判断，叠加时两个入口都要展示，避免付了频道费才发现按次付费还没解锁
  const stakeLocked = post.visiblePercent < 100 && !alwaysExpand && !linkedPostIds.has(post.id);
  const stacked = forceLocked && stakeLocked;
  const isPaid = forceLocked || stakeLocked;
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
    <div className={`post-content-wrap${isPaid ? ' is-paid' : ''}${forceLocked ? ' is-locked-teaser' : ''}${shouldClamp ? ' post-content-wrap--clamp' : ''}`} data-layer="post-content">
      <p
        ref={textRef}
        className={`post-title${forceLocked ? ' post-title--locked-teaser' : shouldClamp ? ' post-title--clamped' : ''}${collapseLines > 0 && !forceLocked ? ` post-title--max-${collapseLines}` : ''}`}
        style={shouldClamp && !forceLocked ? { '--clamp-lines': collapseLines } as React.CSSProperties : undefined}
      >
        {forceLocked ? lockedTeaser(post.title) : post.title}
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
          {stacked ? (
            <div className="unlock-hint-group" data-layer="unlock-hint-group">
              <div
                className="unlock-hint"
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onUnlockOverride ? onUnlockOverride() : openLink(post.id, 'unlock'); }}
              >
                <Lock size={11} strokeWidth={2.5} />
                <span>{lockLabelBare ?? lockLabel ?? t('解锁全部内容')}</span>
              </div>
              {/* 按次付费锁必须在频道锁解决后才能点——此分支只在频道锁仍生效时渲染，天然处于禁用态；
                  点了不跳付费流程，只用 toast 说明原因；频道锁解决后 stacked 变 false，
                  会走下面的单锁分支渲染出可点击的"解锁" */}
              <div
                className="unlock-hint unlock-hint--disabled"
                role="button"
                tabIndex={0}
                aria-disabled="true"
                onClick={(e) => { e.stopPropagation(); showToast(t('先{label}才能解锁全文', { label: lockLabelBare ?? lockLabel ?? '' })); }}
              >
                <Lock size={11} strokeWidth={2.5} />
                <span>{t('解锁全部内容')}</span>
              </div>
            </div>
          ) : (
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
          )}
        </>
      )}
    </div>
  );
}

// ── GeminiNodeBadge ────────────────────────────────────────────
// leftContent：用其它内容（如 feed 卡片的热力值/打赏）覆盖默认的「知识宇宙·星级·节点ID」左侧内容；
// 此时整条外层点击行为改由 onLeftClick 控制（未传则该区域不可点击），与 onGoToPlanet/链接跳转逻辑互斥。
// 有 leftContent 时：热力值+赞助独立 pill 靠右；showChain 时链接/购买靠左。
export function GeminiNodeBadge({ post, showChain = true, onViewLinks, onGoToPlanet, leftContent, onLeftClick, leftAriaLabel, chainOutline = false, chainExtra }: {
  post: Post; showChain?: boolean; onViewLinks?: () => void; onGoToPlanet?: () => void;
  leftContent?: React.ReactNode; onLeftClick?: () => void; leftAriaLabel?: string;
  /** 仅「我的主页」等场景：链接按钮改空心并去掉右箭头，其它页面保持实心 CTA */
  chainOutline?: boolean;
  /** 紧贴「链接」按钮之后的附加内容（如小黄车「购买」入口）*/
  chainExtra?: React.ReactNode;
}) {
  const { openLink, linkedPostIds, t } = useApp();
  const isLinked = linkedPostIds.has(post.id);

  const handleLink = () => (onViewLinks ? onViewLinks() : openLink(post.id));
  const handleBadgeClick = leftContent ? onLeftClick : (onGoToPlanet ? onGoToPlanet : handleLink);
  const clickable = leftContent ? !!onLeftClick : true;
  const heatRowLayout = !!leftContent;

  const chainEl = showChain ? (
    isLinked ? (
      <div className="gemini-chain gemini-chain--linked" aria-label={t('已链接，共 {links} 人', { links: post.links })}>
        <CircleCheck size={14} strokeWidth={2.5} />
        <span>{t('已链接')}</span>
        <span className="gemini-chain-count">{post.links}</span>
      </div>
    ) : (
      <button type="button" className={`gemini-chain${chainOutline ? ' gemini-chain--outline' : ''}`}
        onClick={(e) => { e.stopPropagation(); handleLink(); }}
        aria-label={onViewLinks
          ? t('查看 {links} 人链接了此节点', { links: post.links })
          : t('链接此节点，当前 {links} 人已链接', { links: post.links })}>
        <Link size={14} strokeWidth={2.5} />{post.links}
        {!chainOutline && <ChevronRight size={12} strokeWidth={2.5} />}
      </button>
    )
  ) : null;

  // Feed：链接（连接数量）+ 购买靠左 + 热力值/赞助靠右
  if (heatRowLayout) {
    return (
      <div className="post-heat-gemini-row" data-layer="gemini-node-badge">
        {chainEl}
        {chainExtra}
        <div
          className="gemini-badge gemini-badge--heat"
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
          onClick={clickable ? handleBadgeClick : undefined}
          onKeyDown={clickable ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBadgeClick!();
            }
          } : undefined}
          aria-label={leftAriaLabel}
        >
          <div className="gemini-left">{leftContent}</div>
        </div>
      </div>
    );
  }

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
      {chainEl}
    </div>
  );
}

// ── InlineComments ─────────────────────────────────────────────
