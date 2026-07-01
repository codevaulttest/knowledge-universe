import { useEffect, useRef, useState } from 'react';
import { Ellipsis, Gift, Heart, Trash2 } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER, POST_REPLIES, replyLikesStore, likedReplyIdsStore } from '../mockData';
import type { Reply } from '../types';
import { Actions } from '../components/PostCard';
import { TipModal } from '../components/Overlays';
import { Avatar, AuthorName, GeminiNodeBadge, MediaPlaceholder, PageHeader, PostContent } from '../components/shared';
import { postHasStake } from '../stakeConfig';
import { localizeTime } from '../i18n';

function parseTimeToMinutes(time: string): number {
  if (time === '刚刚' || time === 'Just now') return 0;
  const m = time.match(/^(\d+)\s*(分钟|小时|天|m|h|d)(?:\s*ago)?$/);
  if (!m) return 0;
  const n = parseInt(m[1]);
  const unit = m[2];
  if (unit === '分钟' || unit === 'm') return n;
  if (unit === '小时' || unit === 'h') return n * 60;
  if (unit === '天' || unit === 'd') return n * 1440;
  return 0;
}

function sortReplies(replies: Reply[], likes: Record<string, number>): Reply[] {
  return [...replies].sort((a, b) => {
    const la = likes[a.id] ?? a.likes;
    const lb = likes[b.id] ?? b.likes;
    if (lb !== la) return lb - la;
    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
  });
}

export function PostDetailPage({ postId, scrollToComments }: { postId: string; scrollToComments?: boolean }) {
  const {
    goBack, navigate, showToast, openLink, linkedPostIds, posts, requestDeletePost,
    openImageLightbox, incrementReplies, language, t, requestPostInteraction,
  } = useApp();
  const post = posts.find(p => p.id === postId);
  const [replyText, setReplyText] = useState('');
  const [repostOpen, setRepostOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);
  // 快照排序：进入页面时按持久化的赞数排一次，会话内点赞不触发重排
  const [snapshotReplies] = useState<Reply[]>(() => sortReplies(POST_REPLIES[postId] ?? [], replyLikesStore));
  const [newReplies, setNewReplies] = useState<Reply[]>([]);
  const [replyLikes, setReplyLikes] = useState<Record<string, number>>(() => ({ ...replyLikesStore }));
  const [likedReplyIds, setLikedReplyIds] = useState<Set<string>>(() => new Set(likedReplyIdsStore));
  const repliesSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToComments && repliesSectionRef.current) {
      repliesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollToComments]);

  if (!post) return <div className="page"><PageHeader onBack={goBack} /><div className="empty-state">{t('帖子不存在', 'Post not found')}</div></div>;

  const isOwn = post.author === CURRENT_USER;
  const isLinked = linkedPostIds.has(post.id);
  const unlocked = isOwn || isLinked || post.visiblePercent === 100;

  const handleDelete = () => {
    setMoreOpen(false);
    requestDeletePost(post.id, goBack);
  };

  const submitReply = () => {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    const newReply: Reply = { id: `new-${Date.now()}`, author: CURRENT_USER, time: '刚刚', text, avatarIdx: 0, likes: 0 };
    setNewReplies(r => [newReply, ...r]);
    incrementReplies(post.id);
    setReplyText('');
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    if (postHasStake(post)) {
      requestPostInteraction(post.id, 'comment', {
        onSkip: submitReply,
        onPaid: submitReply,
      });
      return;
    }
    submitReply();
  };

  const handleReplyLike = (replyId: string, baseLikes: number) => {
    const isLiked = likedReplyIds.has(replyId);
    const current = replyLikes[replyId] ?? baseLikes;
    const next = isLiked ? current - 1 : current + 1;
    // 写入模块级存储，下次进入页面时生效
    replyLikesStore[replyId] = next;
    isLiked ? likedReplyIdsStore.delete(replyId) : likedReplyIdsStore.add(replyId);
    setReplyLikes(prev => ({ ...prev, [replyId]: next }));
    setLikedReplyIds(prev => {
      const s = new Set(prev);
      isLiked ? s.delete(replyId) : s.add(replyId);
      return s;
    });
  };

  const displayReplies = [...newReplies, ...snapshotReplies];

  return (
    <div className="page">
      <PageHeader onBack={goBack} />
      <div className="scroll-area detail-scroll-area">
        {/* 作者行 */}
        <div className="detail-author-row">
          <Avatar
            index={0}
            seed={post.author}
            onClick={() => navigate({ page: 'P6', authorName: post.author })}
          />
          <div className="author-meta">
            <AuthorName name={post.author} as="h2" />
            <span className="author-time">{localizeTime(post.time, language)}</span>
          </div>
          {isOwn && (
            <div className="more-menu-wrap" style={{ position: 'relative' }}>
              <Ellipsis
                className="more"
                size={22}
                strokeWidth={2}
                role="button"
                tabIndex={0}
                onClick={() => setMoreOpen(v => !v)}
              />
              {moreOpen && (
                <div className="more-dropdown" onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={handleDelete}><Trash2 size={14} strokeWidth={2.2} /> {t('删除', 'Delete')}</button>
                </div>
              )}
            </div>
          )}
          {!isOwn && <span style={{ width: 22 }} aria-hidden />}
        </div>

        {/* 正文（detail 展示全量或按 N% 遮罩）*/}
        <div className="detail-body">
          <PostContent post={post} alwaysExpand={unlocked} />
          <MediaPlaceholder
            kind={post.kind}
            articleHasCover={post.articleHasCover}
            imageCount={post.imageCount ?? 3}
            visibleImgCount={post.kind === 'image'
              ? (unlocked ? (post.imageCount ?? 3) : Math.floor(post.visiblePercent / 100 * (post.imageCount ?? 3)))
              : (post.imageCount ?? 3)}
            onImageClick={post.kind === 'image' ? (idx) => {
              const total = post.imageCount ?? 3;
              const vCount = unlocked ? total : Math.floor(post.visiblePercent / 100 * total);
              if (idx >= vCount) {
                openLink(post.id);
              } else {
                openImageLightbox(post, idx, vCount);
              }
            } : undefined}
          />

          {/* 知识星球节点标识 → 点击打开链接弹窗（onClick 由 GeminiNodeBadge 自身处理）*/}
          {post.isNode && <GeminiNodeBadge post={post} showChain />}
        </div>

        {/* 操作行（复用 feed 样式）*/}
        <div className="detail-body-actions">
          <Actions
            post={post}
            onComment={() => repliesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            extra={!isOwn ? (
              <button
                type="button"
                className="detail-tip-btn"
                onClick={() => setShowTip(true)}
                aria-label={t('打赏此帖', 'Tip this post')}
              >
                <Gift size={15} strokeWidth={2} />
                {t('打赏', 'Tip')}
              </button>
            ) : undefined}
          />
        </div>

        {/* 回复列表（全量可见，不受 N% 限制）*/}
        <div className="reply-section" ref={repliesSectionRef}>
          <div className="reply-section-title">
            {t(`${displayReplies.length} 条评论`, `${displayReplies.length} comments`)}
          </div>
          {displayReplies.length === 0 && (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>{t('还没有评论', 'No comments yet')}</p>
              <p className="empty-sub">{t('成为第一个发表评论的人', 'Be the first to comment')}</p>
            </div>
          )}
          {displayReplies.map((r) => {
            const liked = likedReplyIds.has(r.id);
            const likeCount = replyLikes[r.id] ?? r.likes;
            return (
              <div key={r.id} className="detail-reply-item">
                <Avatar index={r.avatarIdx} />
                <div className="detail-reply-content">
                  <div className="detail-reply-header">
                    <AuthorName name={r.author} className="detail-reply-author" />
                    <span className="detail-reply-time">{localizeTime(r.time, language)}</span>
                    <button
                      type="button"
                      className={`reply-like-btn${liked ? ' reply-like-btn--active' : ''}`}
                      onClick={() => handleReplyLike(r.id, r.likes)}
                    >
                      <Heart size={13} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} />
                      {likeCount > 0 && <span>{likeCount}</span>}
                    </button>
                  </div>
                  <p className="detail-reply-text">{r.text}</p>
                </div>
              </div>
            );
          })}
          {displayReplies.length > 0 && (
            <div className="feed-end">— {t('已经到底了', "You're all caught up")} —</div>
          )}
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

      {/* 固定在详情页底部的回复输入 */}
      <div className="detail-reply-compose">
        <Avatar index={0} />
        <input
          className="reply-input"
          placeholder={t(`回复 ${post.author}…`, `Reply to ${post.author}…`)}
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSendReply(); }}
        />
        <button className="reply-send" type="button" onClick={handleSendReply} disabled={!replyText.trim()}>
          {t('发送', 'Send')}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// P3 — 链接 + 选填回贴浮层
// ═══════════════════════════════════════════════════════════════
