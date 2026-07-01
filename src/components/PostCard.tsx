import React, { useState } from 'react';
import { Bookmark, Check, Ellipsis, Gift, MessageCircle, Repeat2, ThumbsUp, Trash2, Users } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER, POST_ACTORS } from '../mockData';
import type { Post, PostAction, PostActorEntry } from '../types';
import { ArticleFeedCard, AuthorName, Avatar, GeminiNodeBadge, MediaPlaceholder, PostContent } from './shared';
import { TipModal, Ios26Alert } from './Overlays';
import { localizeTime } from '../i18n';

// ── ActorsSheet（帖子互动名单浮层）────────────────────────────
function ActorsSheet({ postId, initialTab, onClose }: {
  postId: string;
  initialTab: PostAction;
  onClose: () => void;
}) {
  const { navigate, followedAuthors, toggleFollow, t } = useApp();
  const [tab, setTab] = useState<PostAction | 'link' | 'tip'>(initialTab);
  const actors = POST_ACTORS[postId];

  const list: PostActorEntry[] = actors
    ? (tab === 'link' ? actors.links : tab === 'like' ? actors.likes : tab === 'share' ? actors.shares : tab === 'tip' ? actors.tips : actors.saves)
    : [];

  const tabs: { key: PostAction | 'link' | 'tip'; zh: string; en: string }[] = [
    { key: 'link',  zh: '链接', en: 'Links' },
    { key: 'like',  zh: '点赞', en: 'Likes' },
    { key: 'share', zh: '转发', en: 'Reposts' },
    { key: 'save',  zh: '收藏', en: 'Saves' },
    { key: 'tip',   zh: '打赏', en: 'Tips' },
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
              {t(tb.zh, tb.en)}
            </button>
          ))}
        </nav>

        <div className="actors-sheet-list">
          {list.length === 0 ? (
            <p className="actors-empty">{t('暂无数据', 'No data yet')}</p>
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
                    <Gift size={13} strokeWidth={2.25} />
                    {entry.amount ?? 0} PB
                  </span>
                ) : !isSelf && (
                  <button
                    type="button"
                    className={`follow-btn follow-btn--sm${isFollowing ? ' follow-btn--following' : ''}`}
                    onClick={e => { e.stopPropagation(); toggleFollow(entry.user); }}
                  >
                    {isFollowing ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} strokeWidth={2.5} />{t('已关注', 'Following')}</span> : t('关注', 'Follow')}
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
    repostedPostIds, likedPostIds, savedPostIds, togglePostAction, requestPostInteraction,
    t,
  } = useApp();
  const [confirmShare, setConfirmShare] = useState<'repost' | 'unrepost' | null>(null);

  const actionButton = (action: PostAction, active: boolean, label: string, count: number, icon: React.ReactNode) => (
    <button
      key={action}
      type="button"
      className={`post-action post-action--${action}${active ? ' post-action--active' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        togglePostAction(post.id, action);
      }}
      aria-label={t(`${active ? '取消' : ''}${label}，当前 ${count}`, `${active ? 'Remove ' : ''}${label}, current count ${count}`)}
      aria-pressed={active}
    >
      {icon}{count}
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
        style={extra ? { gridTemplateColumns: '1fr 1fr 1fr 1fr auto' } : undefined}
      >
        <span
          className="reply-trigger"
          role="button" tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onComment(e);
          }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onComment(e as unknown as React.MouseEvent); }}
          aria-label={t(`查看 ${post.replies} 条评论`, `View ${post.replies} comments`)}
        >
          <MessageCircle size={18} strokeWidth={2.25} />{post.replies}
        </span>
        <button
          type="button"
          className={`post-action post-action--share${active ? ' post-action--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setConfirmShare(active ? 'unrepost' : 'repost');
          }}
          aria-label={t(`${active ? '取消转发' : '转发'}，当前 ${post.shares}`, `${active ? 'Remove repost' : 'Repost'}, current count ${post.shares}`)}
          aria-pressed={active}
        >
          <Repeat2 size={18} strokeWidth={2.25} />{post.shares}
        </button>
        {actionButton('like', likedPostIds.has(post.id), t('点赞', 'like'), post.likes, <ThumbsUp size={18} strokeWidth={2.25} />)}
        {actionButton('save', savedPostIds.has(post.id), t('收藏', 'save'), post.saves, <Bookmark size={18} strokeWidth={2.25} />)}
        {extra && <div className="actions-extra" onClick={e => e.stopPropagation()}>{extra}</div>}
      </div>

      {confirmShare === 'repost' && (
        <Ios26Alert
          title={t('确认转发？', 'Repost this post?')}
          message={post.title.slice(0, 40) + (post.title.length > 40 ? '…' : '')}
          cancelLabel={t('取消', 'Cancel')}
          confirmLabel={t('转发', 'Repost')}
          onCancel={() => setConfirmShare(null)}
          onConfirm={doRepost}
        />
      )}

      {confirmShare === 'unrepost' && (
        <Ios26Alert
          title={t('取消转发？', 'Remove repost?')}
          message={post.title.slice(0, 40) + (post.title.length > 40 ? '…' : '')}
          cancelLabel={t('取消', 'Cancel')}
          confirmLabel={t('取消转发', 'Remove repost')}
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
}: {
  post: Post;
  index: number;
  hideFollow?: boolean;
  onOpen?: (post: Post) => void;
}) {
  const { navigate, followedAuthors, toggleFollow, requestDeletePost, openImageLightbox, openLink, openArticleReader, openVideoPlayer, linkedPostIds, language, t, userProfile } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const [actorsTab, setActorsTab] = useState<PostAction | null>(null);
  const [showTip, setShowTip] = useState(false);
  const isOwn = post.author === CURRENT_USER;
  const displayName = isOwn ? userProfile.nickname : post.author;
  const avatarSeed = isOwn ? userProfile.avatarSeed : post.author;
  const hasActors = isOwn && !!POST_ACTORS[post.id];
  const isFollowing = followedAuthors.has(post.author);
  const totalImgs = post.imageCount ?? 3;
  const imgUnlocked = linkedPostIds.has(post.id) || post.visiblePercent === 100;
  const visibleImgCount = post.kind === 'image'
    ? (imgUnlocked ? totalImgs : Math.floor(post.visiblePercent / 100 * totalImgs))
    : totalImgs;
  return (
    <>
    <article
      className="post" data-layer="feed-item"
      onClick={() => {
        onOpen?.(post);
        navigate({ page: 'P2', postId: post.id });
      }}
      role="button" tabIndex={0}
      aria-label={t(`查看帖子：${post.author} — ${post.title.slice(0, 20)}`, `View post by ${post.author}: ${post.title.slice(0, 20)}`)}
    >
      <div className="author-row">
        <Avatar index={index} seed={avatarSeed} onClick={(e) => { e.stopPropagation(); navigate({ page: 'P6', authorName: post.author }); }} />
        <div className="author-meta" onClick={(e) => { e.stopPropagation(); navigate({ page: 'P6', authorName: post.author }); }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate({ page: 'P6', authorName: post.author }); }}>
          <AuthorName name={displayName} as="h2" />
          <div className="author-meta-row">
            <span className="author-time">{localizeTime(post.time, language)}</span>
            {isOwn && post.isNode && (
              <span className="post-visibility-badge">
                {post.visiblePercent === 100 ? t('公开', 'Public') : t(`${post.visiblePercent}% 可见`, `${post.visiblePercent}% visible`)}
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
                    <Users size={14} strokeWidth={2.2} /> {t('查看互动', 'View interactions')}
                  </button>
                )}
                <button type="button" onClick={() => { setMoreOpen(false); requestDeletePost(post.id); }} className="more-dropdown__danger">
                  <Trash2 size={14} strokeWidth={2.2} /> {t('删除', 'Delete')}
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
            aria-label={isFollowing ? t(`取消关注 ${post.author}`, `Unfollow ${post.author}`) : t(`关注 ${post.author}`, `Follow ${post.author}`)}
          >
            {isFollowing ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} strokeWidth={2.5} />{t('已关注', 'Following')}</span> : t('+ 关注', '+ Follow')}
          </button>
        )}
      </div>
      {post.kind === 'article' ? (
        <ArticleFeedCard post={post} onClick={() => openArticleReader(post)} />
      ) : (
        <>
          <PostContent post={post} collapseLines={4} />
          <MediaPlaceholder
            kind={post.kind}
            articleHasCover={post.articleHasCover}
            imageCount={totalImgs}
            visibleImgCount={visibleImgCount}
            visiblePercent={post.visiblePercent}
            onImageClick={post.kind === 'image' ? (idx) => {
              if (idx >= visibleImgCount) {
                openLink(post.id, 'unlock');
              } else {
                openImageLightbox(post, idx, visibleImgCount);
              }
            } : undefined}
            onVideoClick={post.kind === 'video' ? () => openVideoPlayer(post) : undefined}
          />
        </>
      )}
      {post.isNode && (
        <div onClick={e => e.stopPropagation()}>
          <GeminiNodeBadge post={post} showChain />
        </div>
      )}
      <Actions
        post={post}
        onComment={(e) => {
          e.stopPropagation();
          navigate({ page: 'P2', postId: post.id, scrollToComments: true });
        }}
        extra={isOwn ? (
          <span
            className="post-tip-received"
            aria-label={t(`已收到打赏 ${post.tipsReceived ?? 0} PB`, `Received ${post.tipsReceived ?? 0} PB in tips`)}
          >
            <Gift size={18} strokeWidth={2.25} />
            {post.tipsReceived ?? 0} PB
          </span>
        ) : (
          <button
            type="button"
            className="detail-tip-btn"
            onClick={(e) => { e.stopPropagation(); setShowTip(true); }}
            aria-label={t('打赏此帖', 'Tip this post')}
          >
            <Gift size={18} strokeWidth={2.25} />
            {t('打赏', 'Tip')}
          </button>
        )}
      />
    </article>
    {actorsTab && (
      <ActorsSheet postId={post.id} initialTab={actorsTab} onClose={() => setActorsTab(null)} />
    )}
    {showTip && (
      <TipModal
        recipientName={post.author}
        context="post"
        postTitle={post.title}
        onClose={() => setShowTip(false)}
      />
    )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// P0 — Feed page（推荐 / 关注 / 知识星球 三 tab）
// ═══════════════════════════════════════════════════════════════