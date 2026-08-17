import React, { useState } from 'react';
import { Bookmark, Check, Ellipsis, Eye, Flame, Gem, HandCoins, MessageCircle, Pencil, Radio, Repeat2, ShoppingCart, ThumbsDown, ThumbsUp, Trash2, Users } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER, getGenesisTier, POST_ACTORS } from '../mockData';
import type { Post, PostAction, PostActorEntry, RepostedBy } from '../types';
import { ArticleFeedCard, AuthorName, Avatar, GenesisBadge, GeminiNodeBadge, MediaPlaceholder, PostContent } from './shared';
import { TipModal, Ios26Alert } from './Overlays';
import { isChinese, localizeTime } from '../i18n';
import { formatCount } from '../formatCount';

/** 未在 mock 数据里显式设置 heat/views 时，按 id 派生一个稳定的演示数值（同一帖子每次渲染保持一致）。*/
function derivedStat(id: string, salt: number, min: number, span: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i) + salt) >>> 0;
  return min + (h % span);
}

// ── ActorsSheet（帖子互动名单浮层）────────────────────────────
export function ActorsSheet({ postId, initialTab, onClose }: {
  postId: string;
  initialTab: PostAction | 'link' | 'tip';
  onClose: () => void;
}) {
  const { navigate, followedAuthors, toggleFollow, t, language } = useApp();
  const [tab, setTab] = useState<PostAction | 'link' | 'tip'>(initialTab);
  const actors = POST_ACTORS[postId];

  const list: PostActorEntry[] = actors
    ? (tab === 'link' ? actors.links : tab === 'like' ? actors.likes : tab === 'dislike' ? actors.dislikes : tab === 'share' ? actors.shares : tab === 'tip' ? actors.tips : actors.saves)
    : [];

  const tabs: { key: PostAction | 'link' | 'tip'; zh: string; en: string }[] = [
    { key: 'link',    zh: '链接', en: 'Links' },
    { key: 'like',    zh: '点赞', en: 'Likes' },
    { key: 'share',   zh: '转发', en: 'Reposts' },
    { key: 'save',    zh: '收藏', en: 'Saves' },
    { key: 'tip',     zh: '赞助', en: 'Sponsorships' },
  ];

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="actors-sheet" role="dialog" onClick={e => e.stopPropagation()}>
        <nav className="actors-sheet-tabs">
          {tabs.map(tb => (
            <button
              key={tb.key}
              type="button"
              className={`actors-sheet-tab${tab === tb.key ? ' actors-sheet-tab--active' : ''}`}
              onClick={() => setTab(tb.key)}
            >
              {isChinese(language) ? tb.zh : tb.en}
            </button>
          ))}
        </nav>

        <div className="actors-sheet-list">
          {list.length === 0 ? (
            <p className="actors-empty">{t('暂无数据')}</p>
          ) : list.map(entry => {
            const isFollowing = followedAuthors.has(entry.user);
            const isSelf = entry.user === CURRENT_USER;
            return (
              <div key={entry.user} className="actors-item">
                <span
                  className="actors-item-avatar"
                  onClick={() => { navigate({ page: 'P6', authorName: entry.user }); onClose(); }}
                >
                  <Avatar index={entry.avatarIdx} />
                </span>
                <div className="actors-item-info">
                  <span
                    className="actors-item-name"
                    onClick={() => { navigate({ page: 'P6', authorName: entry.user }); onClose(); }}
                  >
                    <AuthorName name={entry.user} />
                  </span>
                  <span className="actors-item-time">{entry.time}</span>
                </div>
                {tab === 'tip' ? (
                  <span className="actors-item-amount">
                    <HandCoins size={13} strokeWidth={2.25} />
                    {entry.amount ?? 0} PB
                  </span>
                ) : !isSelf && (
                  <button
                    type="button"
                    className={`follow-btn follow-btn--sm${isFollowing ? ' follow-btn--following' : ''}`}
                    onClick={e => { e.stopPropagation(); toggleFollow(entry.user); }}
                  >
                    {isFollowing ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} strokeWidth={2.5} />{t('已关注')}</span> : t('关注')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Actions（评论 / 转发 / 点赞 / 收藏）────────────────────────
export function Actions({ post, onComment, extra }: {
  post: Post; onComment: (e: React.MouseEvent) => void; extra?: React.ReactNode;
}) {
  const {
    repostedPostIds, likedPostIds, savedPostIds, dislikedPostIds, togglePostAction, requestPostInteraction,
    t, language,
  } = useApp();
  const [confirmShare, setConfirmShare] = useState<'repost' | 'unrepost' | null>(null);
  const isOwn = post.author === CURRENT_USER;

  const actionButton = (action: PostAction, active: boolean, label: string, count: number, icon: React.ReactNode, showCount = true) => (
    <button
      key={action}
      type="button"
      className={`post-action post-action--${action}${active ? ' post-action--active' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        togglePostAction(post.id, action);
      }}
      aria-label={active
        ? t('取消{label}，当前 {count}', { label, count })
        : t('{label}，当前 {count}', { label, count })}
      aria-pressed={active}
    >
      {icon}{showCount && formatCount(count, language)}
    </button>
  );

  const doRepost = () => {
    setConfirmShare(null);
    togglePostAction(post.id, 'share');
    requestPostInteraction(post.id, 'share', { onSkip: () => {}, onPaid: () => {} });
  };

  const doUnrepost = () => {
    setConfirmShare(null);
    togglePostAction(post.id, 'share');
  };

  const active = repostedPostIds.has(post.id);

  return (
    <>
      <div
        className="actions"
        data-layer="post-actions"
        onClick={e => e.stopPropagation()}
      >
        <span
          className="reply-trigger"
          role="button" tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onComment(e);
          }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onComment(e as unknown as React.MouseEvent); }}
          aria-label={t('查看 {replies} 条评论', { replies: post.replies })}
        >
          <MessageCircle size={18} strokeWidth={2.25} />{formatCount(post.replies, language)}
        </span>
        <button
          type="button"
          className={`post-action post-action--share${active ? ' post-action--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setConfirmShare(active ? 'unrepost' : 'repost');
          }}
          aria-label={active
            ? t('取消转发，当前 {shares}', { shares: post.shares })
            : t('转发，当前 {shares}', { shares: post.shares })}
          aria-pressed={active}
        >
          <Repeat2 size={18} strokeWidth={2.25} />{formatCount(post.shares, language)}
        </button>
        {actionButton('like', likedPostIds.has(post.id), t('点赞'), post.likes, <ThumbsUp size={18} strokeWidth={2.25} />)}
        {actionButton('dislike', dislikedPostIds.has(post.id), t('踩'), post.dislikes ?? 0, <ThumbsDown size={18} strokeWidth={2.25} />, isOwn)}
        {actionButton('save', savedPostIds.has(post.id), t('收藏'), post.saves, <Bookmark size={18} strokeWidth={2.25} />)}
        {extra && <div className="actions-extra" onClick={e => e.stopPropagation()}>{extra}</div>}
      </div>

      {confirmShare === 'repost' && (
        <Ios26Alert
          title={t('确认转发？')}
          message={post.title.slice(0, 40) + (post.title.length > 40 ? '…' : '')}
          cancelLabel={t('取消')}
          confirmLabel={t('转发')}
          onCancel={() => setConfirmShare(null)}
          onConfirm={doRepost}
        />
      )}

      {confirmShare === 'unrepost' && (
        <Ios26Alert
          title={t('取消转发？')}
          message={post.title.slice(0, 40) + (post.title.length > 40 ? '…' : '')}
          cancelLabel={t('取消')}
          confirmLabel={t('取消转发')}
          onCancel={() => setConfirmShare(null)}
          onConfirm={doUnrepost}
        />
      )}
    </>
  );
}

// ── PostCard（P0 feed 卡片）────────────────────────────────────
export function PostCard({
  post,
  index,
  hideFollow,
  onOpen,
  repostedBy,
  chainOutline,
}: {
  post: Post;
  index: number;
  hideFollow?: boolean;
  onOpen?: (post: Post) => void;
  repostedBy?: RepostedBy;
  /** 透传给 GeminiNodeBadge：仅「我的主页」用空心链接按钮 */
  chainOutline?: boolean;
}) {
  const { navigate, followedAuthors, toggleFollow, requestDeletePost, openEditPost, openImageLightbox, openLink, openArticleReader, openVideoPlayer, linkedPostIds, language, t, userProfile, channels, subscribedChannelTiers, openChannelSubscribe, requireWallet } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const [actorsTab, setActorsTab] = useState<PostAction | 'link' | 'tip' | null>(null);
  const [showTip, setShowTip] = useState(false);
  const isOwn = post.author === CURRENT_USER;
  const displayName = isOwn ? userProfile.nickname : post.author;
  const avatarSeed = isOwn ? userProfile.avatarSeed : post.author;
  const hasActors = isOwn && !!POST_ACTORS[post.id];
  const heat = post.heat ?? derivedStat(post.id, 1, 300, 260000);
  const views = post.views ?? derivedStat(post.id, 2, 80, 4200);
  const isFollowing = followedAuthors.has(post.author);
  const totalImgs = post.imageCount ?? 3;
  const genesisTier = getGenesisTier(post.author);

  // 频道会员门槛：未达标时强制锁定，优先于按比例解锁（不看 visiblePercent）
  const channel = post.channelId ? channels.find(c => c.id === post.channelId) : undefined;
  const requiredTier = channel && post.minTierIndex != null ? channel.tiers[post.minTierIndex] : undefined;
  const mySubTierIdx = channel ? subscribedChannelTiers[channel.id] : undefined;
  const meetsChannelGate = !requiredTier || (mySubTierIdx != null && mySubTierIdx >= post.minTierIndex!);
  const channelLocked = !!requiredTier && !meetsChannelGate && !isOwn;
  const openChannelGate = () => channel && openChannelSubscribe(channel.id);

  const contentUnlocked = isOwn || linkedPostIds.has(post.id) || post.visiblePercent === 100;
  const imgUnlocked = !channelLocked && contentUnlocked;
  const visibleImgCount = post.kind === 'image'
    ? (channelLocked ? 0 : imgUnlocked ? totalImgs : Math.floor(post.visiblePercent / 100 * totalImgs))
    : totalImgs;
  // 原帖已下架：只在「转发」场景下出现（转发者本人的转发列表），渲染占位态，不展示原帖任何内容、不可点击进入详情
  const isUnavailableRepost = !!repostedBy && !!post.deleted;
  return (
    <>
    <article
      className={`post${isUnavailableRepost ? ' post--unavailable-repost' : ''}`} data-layer="feed-item"
      onClick={() => {
        if (isUnavailableRepost) return;
        onOpen?.(post);
        navigate({ page: 'P2', postId: post.id });
      }}
      role={isUnavailableRepost ? undefined : 'button'}
      tabIndex={isUnavailableRepost ? undefined : 0}
      aria-label={isUnavailableRepost ? undefined : t('查看帖子：{author} — {slice}', { author: post.author, slice: post.title.slice(0, 20) })}
    >
      {repostedBy && (
        <div
          className="repost-banner"
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); navigate({ page: 'P6', authorName: repostedBy.name }); }}
        >
          <span className="repost-banner-avatar"><Avatar index={repostedBy.avatarIdx} seed={repostedBy.name === CURRENT_USER ? userProfile.avatarSeed : repostedBy.name} /></span>
          <Repeat2 size={13} strokeWidth={2.4} className="repost-banner-icon" />
          <span className="repost-banner-text">
            {repostedBy.name === CURRENT_USER
              ? t('你转发了')
              : t('{name} 转发了', { name: repostedBy.name })}
          </span>
        </div>
      )}
      {isUnavailableRepost ? (
        <div className="repost-placeholder">
          <span className="repost-placeholder-text">{t('该内容已不可用')}</span>
          <span className="repost-placeholder-time">{localizeTime(post.time, language)}</span>
        </div>
      ) : (
      <>
      <div className="author-row">
        <Avatar index={index} seed={avatarSeed} onClick={(e) => { e.stopPropagation(); navigate({ page: 'P6', authorName: post.author }); }} />
        <div className="author-meta" onClick={(e) => { e.stopPropagation(); navigate({ page: 'P6', authorName: post.author }); }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate({ page: 'P6', authorName: post.author }); }}>
          <span className="post-author-name-row">
            <AuthorName name={displayName} as="h2" />
            {genesisTier && <GenesisBadge tier={genesisTier} />}
          </span>
          <div className="author-meta-row">
            <span className="author-time">{localizeTime(post.time, language)}</span>
            {channel && (
              <span className="post-channel-badge" aria-label={t('归属频道《{name}》', { name: channel.name })}>
                <Radio size={11} strokeWidth={2.2} />
                {channel.name}
              </span>
            )}
            {isOwn && requiredTier && (
              <span className="post-tier-badge" aria-label={t('需订阅达到 {name} 及以上', { name: requiredTier.name })}>
                <Gem size={11} strokeWidth={2.2} />
                {requiredTier.name}
              </span>
            )}
            {isOwn && post.isNode && (
              <span className="post-visibility-badge">
                {post.visiblePercent === 100
                  ? t('公开')
                  : post.visiblePercent === 0
                    ? t('完全隐藏')
                    : t('{visiblePercent}% 可见', { visiblePercent: post.visiblePercent })}
              </span>
            )}
          </div>
        </div>
        {isOwn && (
          <div className="more-menu-wrap" style={{ position: 'relative' }}>
            <Ellipsis
              className="more"
              size={20}
              strokeWidth={2}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setMoreOpen(v => !v); }}
            />
            {moreOpen && (
              <div className="more-dropdown" onClick={e => e.stopPropagation()}>
                {hasActors && (
                  <button type="button" onClick={() => { setMoreOpen(false); setActorsTab('like'); }}>
                    <Users size={14} strokeWidth={2.2} /> {t('查看互动')}
                  </button>
                )}
                {post.channelId && (
                  <button type="button" onClick={() => { setMoreOpen(false); openEditPost(post.id); }}>
                    <Pencil size={14} strokeWidth={2.2} /> {t('编辑')}
                  </button>
                )}
                <button type="button" onClick={() => { setMoreOpen(false); requestDeletePost(post.id); }} className="more-dropdown__danger">
                  <Trash2 size={14} strokeWidth={2.2} /> {t('删除')}
                </button>
              </div>
            )}
          </div>
        )}
        {!isOwn && !hideFollow && (
          <button
            type="button"
            className={`follow-btn follow-btn--sm${isFollowing ? ' follow-btn--following' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleFollow(post.author); }}
            aria-label={isFollowing ? t('取消关注 {author}', { author: post.author }) : t('关注 {author}', { author: post.author })}
          >
            {isFollowing ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} strokeWidth={2.5} />{t('已关注')}</span> : t('+ 关注')}
          </button>
        )}
      </div>
      {post.kind === 'article' ? (
        <ArticleFeedCard post={post} onClick={() => (channelLocked ? openChannelGate() : openArticleReader(post))} />
      ) : (
        <>
          <PostContent
            post={post}
            collapseLines={4}
            alwaysExpand={isOwn}
            forceLocked={channelLocked}
            lockLabel={channelLocked ? (mySubTierIdx != null ? t('升级到『{name}』解锁', { name: requiredTier!.name }) : t('订阅『{name}』解锁', { name: requiredTier!.name })) : undefined}
            onUnlockOverride={channelLocked ? openChannelGate : undefined}
          />
          <MediaPlaceholder
            kind={post.kind}
            articleHasCover={post.articleHasCover}
            imageCount={totalImgs}
            imageAspect={post.imageAspect}
            imageRatio={post.imageRatio}
            images={post.images}
            visibleImgCount={visibleImgCount}
            visiblePercent={channelLocked ? 0 : post.visiblePercent}
            onImageClick={post.kind === 'image' ? (idx) => {
              if (channelLocked) {
                openChannelGate();
              } else if (idx >= visibleImgCount) {
                openLink(post.id, 'unlock');
              } else {
                openImageLightbox(post, idx, visibleImgCount);
              }
            } : undefined}
            onVideoClick={post.kind === 'video' ? () => (channelLocked ? openChannelGate() : openVideoPlayer(post)) : undefined}
          />
        </>
      )}
      <div onClick={e => e.stopPropagation()}>
        <GeminiNodeBadge
          post={post}
          showChain={post.isNode}
          chainOutline={chainOutline}
          onViewLinks={isOwn ? () => setActorsTab('link') : undefined}
          onGoToPlanet={post.isNode
            ? () => navigate({ page: 'P_PLANET', searchNodeCode: post.nodeId })
            : undefined}
          leftContent={(
            <>
              <span className="post-heat">
                <Flame size={16} strokeWidth={2.25} />
                {formatCount(heat, language)}
              </span>
              {isOwn ? (
                <span className="post-heat-tip-btn post-heat-tip-btn--received">
                  <HandCoins size={13} strokeWidth={2.25} />
                  {t('{tipsReceived} PB', { tipsReceived: post.tipsReceived ?? 0 })}
                </span>
              ) : (
                <span className="post-heat-tip-btn">
                  <HandCoins size={13} strokeWidth={2.25} />
                  {t('打赏')}
                </span>
              )}
            </>
          )}
          onLeftClick={isOwn
            ? (hasActors ? () => setActorsTab('tip') : undefined)
            : () => requireWallet(() => setShowTip(true))}
          leftAriaLabel={isOwn
            ? t('查看打赏详情，已收到 {tipsReceived} PB', { tipsReceived: post.tipsReceived ?? 0 })
            : t('打赏此帖，当前热力值 {heat}', { heat })}
          chainExtra={post.shop && (
            isOwn ? (
              // 自己的帖子不能买自己的；改为展示「小黄车」标识，让作者知道本帖已参与，点按可预览商品页
              <button
                type="button"
                className="post-shop-tag"
                onClick={(e) => { e.stopPropagation(); navigate({ page: 'P_SHOP_ITEM', postId: post.id }); }}
                aria-label={t('本帖已参与小黄车，售价 {price} PB，点按预览商品页', { price: post.shop.price })}
              >
                <ShoppingCart size={13} strokeWidth={2.25} />
                {t('小黄车')}
              </button>
            ) : (
              <button
                type="button"
                className="post-shop-btn"
                onClick={(e) => { e.stopPropagation(); navigate({ page: 'P_SHOP_ITEM', postId: post.id }); }}
                aria-label={t('购买此商品，{price} PB', { price: post.shop.price })}
              >
                <ShoppingCart size={13} strokeWidth={2.25} />
                {t('购买')}
              </button>
            )
          )}
        />
      </div>
      <Actions
        post={post}
        onComment={(e) => {
          e.stopPropagation();
          navigate({ page: 'P2', postId: post.id, scrollToComments: true });
        }}
        extra={(
          <span
            className="post-views"
            aria-label={t('浏览量 {views}', { views })}
          >
            <Eye size={18} strokeWidth={2.25} />
            {formatCount(views, language)}
          </span>
        )}
      />
      </>
      )}
    </article>
    {actorsTab && (
      <ActorsSheet postId={post.id} initialTab={actorsTab} onClose={() => setActorsTab(null)} />
    )}
    {showTip && (
      <TipModal
        recipientName={post.author}
        context="post"
        postId={post.id}
        postTitle={post.title}
        onClose={() => setShowTip(false)}
      />
    )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// P0 — Feed page（推荐 / 关注 / 知识宇宙 三 tab）
// ═══════════════════════════════════════════════════════════════