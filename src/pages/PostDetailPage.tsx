import { useEffect, useRef, useState } from 'react';
import { Ellipsis, Eye, Flame, Gem, Heart, Radio, ShoppingCart, Trash2, User } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER, getGenesisTier, POST_ACTORS, POST_REPLIES, replyLikesStore, likedReplyIdsStore } from '../mockData';
import type { Reply } from '../types';
import { Actions, ActorsSheet } from '../components/PostCard';
import { TipModal, Ios26Alert } from '../components/Overlays';
import { Avatar, AuthorName, ChannelMemberBadge, GenesisBadge, GeminiNodeBadge, MediaPlaceholder, PageHeader, PostContent } from '../components/shared';
import { localizeTime } from '../i18n';
import { formatCount } from '../formatCount';
import { getShopMinPrice } from '../shopUtils';
import { formatTokenAmount, postHasStake } from '../stakeConfig';

/** 与 PostCard 一致：未显式设置 heat/views 时按 id 派生稳定演示数值 */
function derivedStat(id: string, salt: number, min: number, span: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i) + salt) >>> 0;
  return min + (h % span);
}

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
    openImageLightbox, incrementReplies, decrementReplies, extraRepliesByPostId, language, t,
    channels, subscribedChannelTiers, expiredChannelIds, openChannelSubscribe, userProfile, requireWallet, walletConnected,
    requestPostInteraction,
  } = useApp();
  const post = posts.find(p => p.id === postId);
  const [replyText, setReplyText] = useState('');
  const [repostOpen, setRepostOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [actorsTab, setActorsTab] = useState<'link' | 'tip' | null>(null);
  // 快照排序：进入页面时按持久化的赞数排一次，会话内点赞不触发重排
  const [snapshotReplies] = useState<Reply[]>(() => sortReplies(POST_REPLIES[postId] ?? [], replyLikesStore));
  const [newReplies, setNewReplies] = useState<Reply[]>([]);
  const [replyLikes, setReplyLikes] = useState<Record<string, number>>(() => ({ ...replyLikesStore }));
  const [likedReplyIds, setLikedReplyIds] = useState<Set<string>>(() => new Set(likedReplyIdsStore));
  // 会话内删除自己的评论：记录已删 id 后过滤，不直接改动快照/模块级存储的源列表
  const [deletedReplyIds, setDeletedReplyIds] = useState<Set<string>>(() => new Set());
  const [pendingDeleteReplyId, setPendingDeleteReplyId] = useState<string | null>(null);
  const repliesSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToComments && repliesSectionRef.current) {
      repliesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollToComments]);

  if (!post) return <div className="page"><PageHeader onBack={goBack} /><div className="empty-state">{t('帖子不存在')}</div></div>;

  const isOwn = post.author === CURRENT_USER;
  const shopPriceFull = post.shop
    ? t('{price} PB', { price: formatTokenAmount(getShopMinPrice(post.shop)) })
    : '';
  const displayName = post.displayAuthorName ?? (isOwn ? userProfile.nickname : post.author);
  const isLinked = linkedPostIds.has(post.id);
  // 频道会员门槛：与 PostCard 一致，未达标时强制锁定，优先于按比例解锁
  const channel = post.channelId ? channels.find(c => c.id === post.channelId) : undefined;
  // 频道帖子至少需要加入免费档；旧帖子未存门槛时同样按免费档处理。
  const requiredTier = channel ? channel.tiers[post.minTierIndex ?? 0] : undefined;
  const channelSubExpired = channel ? expiredChannelIds.has(channel.id) : false;
  const mySubTierIdx = channel && !channelSubExpired ? subscribedChannelTiers[channel.id] : undefined;
  const meetsChannelGate = !requiredTier || (mySubTierIdx != null && mySubTierIdx >= (post.minTierIndex ?? 0));
  const channelLocked = !!requiredTier && !meetsChannelGate && !isOwn;
  const openChannelGate = () => channel && openChannelSubscribe(channel.id, post.minTierIndex ?? 0);
  const channelLockLabel = channelLocked
    ? (channelSubExpired
      ? t('续费『{name}』解锁', { name: requiredTier!.name })
      : mySubTierIdx != null ? t('升级到『{name}』解锁', { name: requiredTier!.name }) : t('订阅『{name}』解锁', { name: requiredTier!.name }))
    : undefined;
  // 频道锁与按次付费锁叠加时（visiblePercent < 100），订阅不承诺解锁内容比例，文案不带"解锁"，避免"解锁至 0%"的荒谬措辞
  const channelLockLabelBare = channelLocked
    ? (channelSubExpired
      ? t('续费『{name}』', { name: requiredTier!.name })
      : mySubTierIdx != null ? t('升级到『{name}』', { name: requiredTier!.name }) : t('订阅『{name}』', { name: requiredTier!.name }))
    : undefined;
  const unlocked = (isOwn || isLinked || post.visiblePercent === 100) && !channelLocked;
  const hasActors = isOwn && !!POST_ACTORS[post.id];
  const heat = post.heat ?? derivedStat(post.id, 1, 300, 260000);
  const views = post.views ?? derivedStat(post.id, 2, 80, 4200);

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
    const text = replyText.trim();
    // 小黄车帖且卖家设了合伙人赠送比例：评论即成为合伙人——弹窗选档后发布评论，无需再写一遍
    if (!isOwn && post.shop && (post.shop.partnerRebatePercent ?? 0) > 0) {
      requireWallet(() => {
        requestPostInteraction(
          post.id,
          'partner',
          {
            onSkip: () => {
              // 用发送时快照发帖，避免弹窗期间输入框被改动导致丢评
              const newReply = {
                id: `new-${Date.now()}`,
                author: CURRENT_USER,
                time: '刚刚' as const,
                text,
                avatarIdx: 0,
                likes: 0,
              };
              setNewReplies(r => [newReply, ...r]);
              incrementReplies(post.id);
              setReplyText('');
              showToast(t('评论成功'));
            },
            onPaid: () => setReplyText(''),
          },
          { presetComment: text },
        );
      });
      return;
    }
    // 知识宇宙节点帖（非小黄车）：评论后弹出选档，可创建子节点或不参与
    requireWallet(() => {
      if (postHasStake(post)) {
        requestPostInteraction(post.id, 'comment', {
          onSkip: () => {
            submitReply();
            showToast(t('评论成功'));
          },
          onPaid: () => {
            submitReply();
            showToast(t('评论成功'));
          },
        });
        return;
      }
      submitReply();
      showToast(t('评论成功'));
    });
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

  const confirmDeleteReply = () => {
    const replyId = pendingDeleteReplyId;
    if (!replyId) return;
    setDeletedReplyIds(prev => new Set(prev).add(replyId));
    // 若删的是本会话新发的评论，也从 newReplies 移除，保持数据一致
    setNewReplies(r => r.filter(x => x.id !== replyId));
    decrementReplies(post.id);
    setPendingDeleteReplyId(null);
    showToast(t('评论已删除'));
  };

  const sessionExtraReplies = extraRepliesByPostId[postId] ?? [];
  const displayReplies = [...newReplies, ...sessionExtraReplies, ...snapshotReplies].filter(r => !deletedReplyIds.has(r.id));

  return (
    <div className="page">
      <PageHeader onBack={goBack} />
      <div className="scroll-area detail-scroll-area">
        {/* 作者行 */}
        <div className="detail-author-row">
          <Avatar
            index={0}
            seed={post.displayAuthorName ?? (isOwn ? userProfile.avatarSeed : post.author)}
            onClick={() => navigate({ page: 'P6', authorName: post.displayAuthorName ?? post.author })}
          />
          <div className="author-meta">
            <span className="post-author-name-row">
              <AuthorName name={displayName} as="h2" />
              {getGenesisTier(post.author) && <GenesisBadge tier={getGenesisTier(post.author)!} />}
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
            </div>
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
                  <button type="button" onClick={handleDelete}><Trash2 size={14} strokeWidth={2.2} /> {t('删除')}</button>
                </div>
              )}
            </div>
          )}
          {!isOwn && <span style={{ width: 22 }} aria-hidden />}
        </div>

        {/* 正文（detail 展示全量或按 N% 遮罩）*/}
        <div className="detail-body">
          <PostContent
            post={post}
            alwaysExpand={unlocked}
            forceLocked={channelLocked}
            lockLabel={channelLockLabel}
            lockLabelBare={channelLockLabelBare}
            onUnlockOverride={channelLocked ? openChannelGate : undefined}
          />
          <MediaPlaceholder
            kind={post.kind}
            articleHasCover={post.articleHasCover}
            imageCount={post.imageCount ?? 3}
            imageAspect={post.imageAspect}
            imageRatio={post.imageRatio}
            images={post.images}
            imageRatios={post.imageRatios}
            visibleImgCount={post.kind === 'image'
              ? (channelLocked ? 0 : unlocked ? (post.imageCount ?? 3) : Math.floor(post.visiblePercent / 100 * (post.imageCount ?? 3)))
              : (post.imageCount ?? 3)}
            visiblePercent={channelLocked ? 0 : post.visiblePercent}
            lockActionLabel={channelLocked ? (post.visiblePercent < 100 ? channelLockLabelBare : channelLockLabel) : undefined}
            onImageClick={post.kind === 'image' ? (idx) => {
              if (channelLocked) {
                openChannelGate();
                return;
              }
              const total = post.imageCount ?? 3;
              const vCount = unlocked ? total : Math.floor(post.visiblePercent / 100 * total);
              if (idx >= vCount) {
                openLink(post.id);
              } else {
                openImageLightbox(post, idx, vCount);
              }
            } : undefined}
            onVideoClick={post.kind === 'video' && channelLocked ? openChannelGate : undefined}
          />

          {/* 热力值/打赏（+知识宇宙节点）：与首页 Feed 同步 */}
          <GeminiNodeBadge
            post={post}
            showChain={post.isNode}
            onViewLinks={isOwn ? () => setActorsTab('link') : undefined}
            onGoToPlanet={post.isNode
              ? () => navigate({ page: 'P_PLANET', searchNodeCode: post.nodeId })
              : undefined}
            leftContent={(
              <span className="post-heat">
                <span className="post-heat-value">
                  <Flame size={16} strokeWidth={2.25} />
                  {formatCount(heat, language)}
                </span>
                {(!isOwn || (post.tipsReceived ?? 0) > 0) && (
                  <>
                    <span className="post-heat-divider" />
                    <span className={`post-heat-cta${isOwn ? ' post-heat-cta--received' : ''}`}>
                      {isOwn
                        ? t('{tipsReceived} PB', { tipsReceived: post.tipsReceived ?? 0 })
                        : t('打赏')}
                    </span>
                  </>
                )}
              </span>
            )}
            onLeftClick={isOwn
              ? (hasActors ? () => setActorsTab('tip') : undefined)
              : () => requireWallet(() => setShowTip(true))}
            leftAriaLabel={isOwn
              ? t('查看打赏详情，已收到 {tipsReceived} PB', { tipsReceived: post.tipsReceived ?? 0 })
              : t('打赏此帖，当前热力值 {heat}', { heat })}
            chainExtra={post.shop && (
              isOwn ? (
                <button
                  type="button"
                  className="post-shop-tag"
                  onClick={(e) => { e.stopPropagation(); navigate({ page: 'P_SHOP_ITEM', postId: post.id }); }}
                  aria-label={t('本帖已参与小黄车，{price}，点按预览商品页', { price: shopPriceFull })}
                >
                  <ShoppingCart size={13} strokeWidth={2.25} />
                  {t('小黄车')}
                </button>
              ) : (
                <button
                  type="button"
                  className="post-shop-btn"
                  onClick={(e) => { e.stopPropagation(); navigate({ page: 'P_SHOP_ITEM', postId: post.id }); }}
                  aria-label={t('购买此商品，{price}', { price: shopPriceFull })}
                >
                  <ShoppingCart size={13} strokeWidth={2.25} />
                  {t('购买')}
                </button>
              )
            )}
          />
        </div>

        {/* 操作行（复用 feed 样式；原打赏位改为浏览量）*/}
        <div className="detail-body-actions">
          <Actions
            post={post}
            onComment={() => repliesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
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
        </div>

        {/* 回复列表（全量可见，不受 N% 限制）*/}
        <div className="reply-section" ref={repliesSectionRef}>
          <div className="reply-section-title">
            {t('{length} 条评论', { length: displayReplies.length })}
          </div>
          {displayReplies.length === 0 && (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>{t('还没有评论')}</p>
              <p className="empty-sub">{t('成为第一个发表评论的人')}</p>
            </div>
          )}
          {displayReplies.map((r) => {
            const liked = likedReplyIds.has(r.id);
            const likeCount = replyLikes[r.id] ?? r.likes;
            // 评论作者若是该频道的订阅会员，展示会员档位小标（mock 数据里预置的 channelTierName，
            // 或当前用户本人在自己已订阅的频道帖子下评论时动态计算）
            const myTierName = post.channelId && r.author === CURRENT_USER && !expiredChannelIds.has(post.channelId)
              ? channels.find(c => c.id === post.channelId)?.tiers[subscribedChannelTiers[post.channelId] ?? -1]?.name
              : undefined;
            const channelTierName = r.channelTierName ?? myTierName;
            return (
              <div key={r.id} className="detail-reply-item">
                <Avatar index={r.avatarIdx} />
                <div className="detail-reply-content">
                  <div className="detail-reply-header">
                    <AuthorName name={r.author} className="detail-reply-author" />
                    {channelTierName && <ChannelMemberBadge tierName={channelTierName} />}
                    <span className="detail-reply-time">{localizeTime(r.time, language)}</span>
                    <button
                      type="button"
                      className={`reply-like-btn${liked ? ' reply-like-btn--active' : ''}`}
                      onClick={() => handleReplyLike(r.id, r.likes)}
                    >
                      <Heart size={13} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} />
                      {likeCount > 0 && <span>{likeCount}</span>}
                    </button>
                    {r.author === CURRENT_USER && (
                      <button
                        type="button"
                        className="reply-delete-btn"
                        onClick={() => setPendingDeleteReplyId(r.id)}
                        aria-label={t('删除评论')}
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  <p className="detail-reply-text">{r.text}</p>
                </div>
              </div>
            );
          })}
          {displayReplies.length > 0 && (
            <div className="feed-end">— {t('已经到底了')} —</div>
          )}
        </div>

      </div>

      {showTip && (
        <TipModal
          recipientName={post.author}
          context="post"
          postId={post.id}
          postTitle={post.title}
          onClose={() => setShowTip(false)}
        />
      )}

      {/* 固定在详情页底部的回复输入 */}
      <div className="detail-reply-compose">
        {walletConnected ? (
          <Avatar index={0} seed={userProfile.avatarSeed} />
        ) : (
          <span className="avatar avatar--guest" aria-hidden="true">
            <User size={16} strokeWidth={2} />
          </span>
        )}
        <input
          className="reply-input"
          placeholder={t('回复 {author}…', { author: displayName })}
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSendReply(); }}
          onMouseDown={(e) => {
            // 游客态：输入前先引导连接钱包，避免打完一段字才被打断、造成内容丢失的挫败感
            if (walletConnected) return;
            e.preventDefault();
            requireWallet(() => {});
          }}
          onFocus={(e) => {
            if (walletConnected) return;
            e.currentTarget.blur();
            requireWallet(() => {});
          }}
        />
        <button className="reply-send" type="button" onClick={handleSendReply} disabled={!replyText.trim()}>
          {t('发送')}
        </button>
      </div>

      {actorsTab && (
        <ActorsSheet postId={post.id} initialTab={actorsTab} onClose={() => setActorsTab(null)} />
      )}

      {pendingDeleteReplyId && (
        <Ios26Alert
          title={t('删除评论')}
          message={t('确定要删除这条评论吗？')}
          cancelLabel={t('取消')}
          confirmLabel={t('删除')}
          onCancel={() => setPendingDeleteReplyId(null)}
          onConfirm={confirmDeleteReply}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// P3 — 链接 + 选填回贴浮层
// ═══════════════════════════════════════════════════════════════
