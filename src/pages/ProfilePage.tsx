import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Award, Bell, Bookmark, Camera, Check, ChevronRight, ClipboardList, Clock, Edit3, FileText, Flame, Gem, HandCoins, Languages, LayoutGrid, MessageCircle, MessageCircleMore, Phone, Plus, Radio, Repeat2, Search, ThumbsUp, Trash2, X } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { useApp } from '../AppContext';
import { ALL_POSTS, ALL_USERS_MOCK, AUTHOR_REPOSTS, CURRENT_USER, DEFAULT_WALLET_DISPLAY, findRegisteredUserByAddress, getChannelSubscribers, getGenesisTier, MOCK_WALLET_ADDRESS } from '../mockData';
import type { UserListItem } from '../mockData';
import type { AddressMigration, Channel, ChannelSubscriber, Draft, Language, OutgoingTip, ProfileContacts, RepostedBy, UserProfile } from '../types';
import { PostCard } from '../components/PostCard';
import { DevPanel } from '../components/DevPanel';
import { ConfirmDeleteDraftModal, Ios26Alert, TipModal } from '../components/Overlays';
import { Avatar, AuthorName, ChannelCard, ChannelMemberBadge, GenesisBadge, PageHeader } from '../components/shared';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useChannelListSearch } from '../components/channelSearch';
import { isPostVisible, formatScheduledAt } from '../dateUtils';

const AVATAR_COLORS = ['#00cdb8', '#0e3060', '#f4e4c4', '#1a2a4e', '#d6fff6'];

export function ProfilePage({ authorName }: { authorName: string }) {
  const { goBack, canGoBack, navigate, drafts, openComposeWithDraft, deleteDraft, followedAuthors, toggleFollow, language, setLanguage, posts: allPosts, savedPostIds, likedPostIds, repostedPostIds, outgoingTips, unreadActivityCount, t, userProfile, updateUserProfile, channels, openCreateChannel, requireWallet, shopOrders, editProfileAutoOpen, setEditProfileAutoOpen, showToast, addressMigrations, cancelAddressMigration, dismissMigrationReminder, meritBalance } = useApp();
  const isOwn = authorName === CURRENT_USER;
  const isFollowing = followedAuthors.has(authorName);
  // 频道从「用户主页单个附属信息」改为独立实体：一个用户可拥有任意数量频道，主页展示为可搜索的目录
  const ownerChannels = channels.filter(c => c.ownerName === authorName);
  const genesisTier = getGenesisTier(authorName);
  const displayBio = isOwn
    ? userProfile.bio?.trim()
    : ALL_USERS_MOCK.find(u => u.name === authorName)?.desc;
  // 我的主页隐藏长文（article）类型的 mock 帖子；下架的原帖不出现在任何"帖子/收藏/赞过"列表里
  // 自己主页仍展示定时发布中的帖子（带待发布状态），他人主页在设定时间前完全不可见
  const myPosts = allPosts.filter(p => p.author === authorName && !p.deleted && !(isOwn && p.kind === 'article') && (isOwn || isPostVisible(p)));
  const savedPosts = allPosts.filter(p => savedPostIds.has(p.id) && !p.deleted && isPostVisible(p));
  const likedPosts = allPosts.filter(p => likedPostIds.has(p.id) && !p.deleted && isPostVisible(p));
  // 转发列表不过滤 deleted：下架的原帖仍需保留在转发者本人的「转发」列表里，改为占位展示
  const repostedPosts = allPosts.filter(p => repostedPostIds.has(p.id));
  const firstPost = allPosts.find(p => p.author === authorName);

  // 当前用户转发的帖子（排除自己发布的），带「转发」标识；原帖下架也保留，交给 PostCard 渲染占位态
  const ownRepostEntries: { post: (typeof allPosts)[number]; repostedBy: RepostedBy }[] = repostedPosts
    .filter(p => p.author !== CURRENT_USER)
    .map(post => ({ post, repostedBy: { name: CURRENT_USER, avatarIdx: 0 } }));
  // 他人主页：该作者转发过的帖子（来自 mock 转发关系）；原帖下架后不在他人视角展示，直接过滤掉
  const theirAvatarIdx = ALL_USERS_MOCK.find(u => u.name === authorName)?.avatarIdx ?? 0;
  const theirRepostEntries: { post: (typeof allPosts)[number]; repostedBy: RepostedBy }[] = (AUTHOR_REPOSTS[authorName] ?? [])
    .map(id => allPosts.find(p => p.id === id))
    .filter((p): p is (typeof allPosts)[number] => !!p && !p.deleted && p.author !== authorName && isPostVisible(p))
    .map(post => ({ post, repostedBy: { name: authorName, avatarIdx: theirAvatarIdx } }));

  // Tab 仅在自己主页上启用：0 = 帖子，1 = 草稿，2 = 转发，3 = 打赏，4 = 收藏，5 = 赞过
  const [profileTab, setProfileTab] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  // 他人主页内容筛选：'all' | 'free' | 'sub'
  const [contentFilter, setContentFilter] = useState<'all' | 'free' | 'sub'>('all');
  const [followListType, setFollowListType] = useState<'following' | 'followers' | null>(null);
  const [confirmDeleteDraftId, setConfirmDeleteDraftId] = useState<string | null>(null);
  const [tipTarget, setTipTarget] = useState<{ context: 'post' | 'author'; postTitle?: string } | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [migrationReminderId, setMigrationReminderId] = useState<string | null>(null);
  useEffect(() => {
    if (isOwn && editProfileAutoOpen) {
      setShowEditProfile(true);
      setEditProfileAutoOpen(false);
    }
  }, [isOwn, editProfileAutoOpen, setEditProfileAutoOpen]);
  const pendingMigration = isOwn
    ? addressMigrations.find(migration => migration.status === 'pending' && migration.expiresAt > Date.now() && !migration.reminderSeen)
    : undefined;
  useEffect(() => {
    if (pendingMigration) setMigrationReminderId(pendingMigration.id);
  }, [pendingMigration?.id]);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const tabsScrollRef = useRef<HTMLElement | null>(null);
  const [tabsCanScrollLeft, setTabsCanScrollLeft] = useState(false);
  const [tabsCanScrollRight, setTabsCanScrollRight] = useState(false);
  const updateTabsScrollState = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setTabsCanScrollLeft(el.scrollLeft > 4);
    setTabsCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  useEffect(() => {
    updateTabsScrollState();
    window.addEventListener('resize', updateTabsScrollState);
    return () => window.removeEventListener('resize', updateTabsScrollState);
  }, [isOwn, language]);

  // 频道帖子从免费档起可见；付费内容需要达到对应的付费档位。
  const isChannelExclusive = (p: (typeof allPosts)[number]) => !!p.channelId && ownerChannels.some(c => c.id === p.channelId) && (p.minTierIndex ?? 0) > 0;
  const filteredOtherPosts = (() => {
    if (contentFilter === 'free') return myPosts.filter(p => !isChannelExclusive(p));
    if (contentFilter === 'sub') return myPosts.filter(isChannelExclusive);
    return myPosts;
  })();

  const displayedEntries: { post: (typeof allPosts)[number]; repostedBy?: RepostedBy }[] =
    isOwn && profileTab === 2 ? ownRepostEntries
    : isOwn && profileTab === 4 ? savedPosts.map(post => ({ post }))
    : isOwn && profileTab === 5 ? likedPosts.map(post => ({ post }))
    : isOwn ? myPosts.map(post => ({ post }))
    : contentFilter === 'all' ? [...filteredOtherPosts.map(post => ({ post })), ...theirRepostEntries]
    : filteredOtherPosts.map(post => ({ post }));
  const displayedPosts = displayedEntries.map(e => e.post);

  // 频道目录：他人主页展示在身份区下方；自己主页降级为次优先级，排在核心社交数据之后。
  // 主页上只放一个固定高度的摘要入口，完整的搜索 + 分页目录收进弹层——否则频道一多
  // （几十上千个），主页会被频道列表占满，「帖子/草稿/转发」等 tab 永远刷不到。
  // 摘要行本身补上频道主、总订阅数、前 1-2 个频道名预览，尽量在不占用额外高度的前提下提升信息密度
  const [channelDirectoryOpen, setChannelDirectoryOpen] = useState(false);
  const channelTotalSubscribers = ownerChannels.reduce((sum, c) => sum + c.subscriberCount, 0);
  const channelNamePreview = (() => {
    const names = ownerChannels.slice(0, 2).map(c => c.name).join('、');
    return ownerChannels.length > 2 ? t('{names} 等', { names }) : names;
  })();
  const channelSection = ownerChannels.length > 0 ? (
    <button type="button" className="channel-summary-entry" onClick={() => setChannelDirectoryOpen(true)}>
      <Radio size={14} strokeWidth={2.2} className="channel-summary-entry-icon" />
      <span className="channel-summary-entry-text">
        <span className="channel-summary-entry-label">
          {t('{count} 个频道 · 共 {total} 人已订阅', { count: ownerChannels.length, total: channelTotalSubscribers })}
        </span>
        <span className="channel-summary-entry-sub">
          {channelNamePreview}
        </span>
      </span>
      <ChevronRight size={15} strokeWidth={2.2} aria-hidden="true" className="channel-summary-entry-chevron" />
    </button>
  ) : isOwn ? (
    <button type="button" className="channel-create-entry channel-create-entry--subtle" onClick={openCreateChannel}>
      <Radio size={14} strokeWidth={2.2} />
      {t('开通频道 · 发布专属内容')}
    </button>
  ) : null;

  // 我的订单入口（仅自己主页）：待处理 = 作为买家已发货待收货 + 作为卖家待发货
  const pendingOrderCount = isOwn
    ? shopOrders.filter(o =>
        (o.buyerName === CURRENT_USER && o.status === 'shipped')
        || (o.sellerName === CURRENT_USER && o.status === 'to_ship'))
        .length
    : 0;
  const orderSection = isOwn ? (
    <button type="button" className="channel-summary-entry channel-summary-entry--half" onClick={() => navigate({ page: 'P_ORDERS' })}>
      <ClipboardList size={14} strokeWidth={2.2} className="channel-summary-entry-icon" style={{ color: 'var(--ku-color-shop)' }} />
      <span className="channel-summary-entry-text">
        <span className="channel-summary-entry-label">{t('我的订单')}</span>
        {pendingOrderCount > 0 && (
          <span className="channel-summary-entry-sub">{t('{count} 笔待处理', { count: pendingOrderCount })}</span>
        )}
      </span>
      <ChevronRight size={15} strokeWidth={2.2} aria-hidden="true" className="channel-summary-entry-chevron" />
    </button>
  ) : null;

  const meritSection = isOwn ? (
    <button
      type="button"
      className="channel-summary-entry channel-summary-entry--half"
      onClick={() => showToast(t('该功能暂未开放，敬请期待'))}
    >
      <Award size={14} strokeWidth={2.2} className="channel-summary-entry-icon" style={{ color: 'var(--ku-color-shop)' }} />
      <span className="channel-summary-entry-text">
        <span className="channel-summary-entry-label">{t('我的 ADN')}</span>
        <span className="channel-summary-entry-sub">{t('{count} 优点', { count: meritBalance })}</span>
      </span>
      <ChevronRight size={15} strokeWidth={2.2} aria-hidden="true" className="channel-summary-entry-chevron" />
    </button>
  ) : null;

  return (
    <div className="page">
      {!isOwn && <PageHeader onBack={canGoBack ? goBack : undefined} className="page-header--transparent" />}
      <div className="scroll-area">
        <div className={`profile-hero${!isOwn ? ' profile-hero--with-header' : ''}`}>
        <img className="profile-header-bg" src="/img/genesis-bigbang.webp" alt="" aria-hidden="true" />
        <div className="profile-header profile-header--hero">
          {/* 自己的主页视为底栏 Tab 根页面，不展示返回（即便从头像 navigate 进来也不出现） */}
          {isOwn ? (
            <button
              type="button"
              className="avatar profile-avatar-edit-btn"
              onClick={() => setShowEditProfile(true)}
              aria-label={t('账户与资料')}
            >
              <ImageWithFallback
                src={userProfile.avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                fallback={<BoringAvatar size="100%" name={userProfile.avatarSeed} variant="beam" colors={AVATAR_COLORS} />}
              />
            </button>
          ) : (
            <Avatar index={firstPost ? ALL_POSTS.indexOf(firstPost) % 3 : 0} seed={authorName} />
          )}
          <div className="profile-info">
            {isOwn ? (
              <>
                <span className="author-name-row profile-name">
                  <span className="author-name-text">{userProfile.nickname || DEFAULT_WALLET_DISPLAY}</span>
                  {genesisTier && <GenesisBadge tier={genesisTier} />}
                </span>
                {displayBio && <p className="profile-bio">{displayBio}</p>}
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={() => setShowEditProfile(true)}
                >
                  <Edit3 size={12} strokeWidth={2} />
                  {t('账户与资料')}
                </button>
              </>
            ) : (
              <span className="profile-name-row">
                <AuthorName name={authorName} className="profile-name" />
                {genesisTier && <GenesisBadge tier={genesisTier} />}
              </span>
            )}
            {!isOwn && displayBio && <p className="profile-bio">{displayBio}</p>}
          </div>
          {isOwn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <button
                type="button"
                className="feed-bell-btn"
                onClick={() => requireWallet(() => navigate({ page: 'P7' }))}
                aria-label={t('互动通知')}
              >
                <Bell size={20} strokeWidth={1.8} />
                {unreadActivityCount > 0 && (
                  <span className="feed-bell-dot">{unreadActivityCount > 99 ? '99+' : unreadActivityCount}</span>
                )}
              </button>
              <button
                type="button"
                className="profile-settings-btn"
                onClick={() => setShowLanguageSheet(true)}
                aria-label={t('切换语言')}
              >
                <Languages size={20} strokeWidth={1.8} />
              </button>
            </div>
          ) : null}
        </div>

        {/* 身份之后先展示核心社交数据，与头部背景插画同属一个视觉区块（自己/他人主页共用同一套顶部样式） */}
        <div className="profile-mini-stats profile-mini-stats--hero">
          {isOwn ? (
            <>
              <button type="button" className="profile-mini-stat profile-mini-stat--btn" onClick={() => setFollowListType('following')}>
                <span className="profile-mini-stat-num">{followedAuthors.size}</span>
                <span className="profile-mini-stat-label">{t('关注2')}</span>
              </button>
              <button type="button" className="profile-mini-stat profile-mini-stat--btn" onClick={() => setFollowListType('followers')}>
                <span className="profile-mini-stat-num">49</span>
                <span className="profile-mini-stat-label">{t('粉丝')}</span>
              </button>
            </>
          ) : (
            <>
              <span className="profile-mini-stat">
                <span className="profile-mini-stat-num">15</span>
                <span className="profile-mini-stat-label">{t('关注2')}</span>
              </span>
              <span className="profile-mini-stat">
                <span className="profile-mini-stat-num">124</span>
                <span className="profile-mini-stat-label">{t('粉丝')}</span>
              </span>
            </>
          )}
        </div>

        {channelSection}
        {isOwn && (
          <div className="channel-summary-row">
            {orderSection}
            {meritSection}
          </div>
        )}

        {/* 关注/打赏/私信操作行延伸进头部视觉区块，与背景插画同属一体 */}
        {!isOwn && (
          <div className="profile-actions profile-actions--hero">
            <button
              type="button"
              className={`follow-btn${isFollowing ? ' follow-btn--following' : ''}`}
              onClick={() => toggleFollow(authorName)}
            >
              {/* 双标签叠放：宽度取「+ 关注 / 已关注」较大者，切换态不抖动 */}
              <span className="profile-follow-face" data-active={isFollowing ? undefined : true} aria-hidden={isFollowing || undefined}>
                {t('+ 关注')}
              </span>
              <span className="profile-follow-face" data-active={isFollowing ? true : undefined} aria-hidden={!isFollowing || undefined}>
                <Check size={12} strokeWidth={2.5} />
                {t('已关注')}
              </span>
            </button>
            <button
              type="button"
              className="profile-tip-btn"
              onClick={() => requireWallet(() => setTipTarget({ context: 'author' }))}
              aria-label={t('打赏博主')}
            >
              <HandCoins size={14} strokeWidth={2} />
              {t('打赏')}
            </button>
            <button
              type="button"
              className="profile-dm-btn"
              onClick={() => requireWallet(() => navigate({ page: 'P_DM_CHAT', peerId: authorName }))}
              aria-label={t('发私信')}
            >
              <MessageCircle size={14} strokeWidth={2} />
              {t('私信')}
            </button>
          </div>
        )}
        </div>

        {/* 自己主页显示帖子/收藏 tab；他人主页只显示标签 */}
        {isOwn ? (
          <div className="profile-content-tabs-wrap profile-content-tabs-wrap--hero">
          <nav
            className="profile-content-tabs"
            aria-label={t('内容分类')}
            ref={tabsScrollRef as React.RefObject<HTMLElement>}
            onScroll={updateTabsScrollState}
          >
            <button
              type="button"
              id="profile-tab-posts"
              className={`profile-content-tab${profileTab === 0 ? ' profile-content-tab--active' : ''}`}
              onClick={() => setProfileTab(0)}
              aria-selected={profileTab === 0}
            >
              <FileText size={14} strokeWidth={2} />
              {t('帖子')}
            </button>
            <button
              type="button"
              id="profile-tab-drafts"
              className={`profile-content-tab${profileTab === 1 ? ' profile-content-tab--active' : ''}`}
              onClick={() => setProfileTab(1)}
              aria-selected={profileTab === 1}
            >
              <Edit3 size={14} strokeWidth={2} />
              {t('草稿')}
              {drafts.length > 0 && <span className="profile-content-tab-badge">{drafts.length}</span>}
            </button>
            <button
              type="button"
              id="profile-tab-reposted"
              className={`profile-content-tab${profileTab === 2 ? ' profile-content-tab--active' : ''}`}
              onClick={() => setProfileTab(2)}
              aria-selected={profileTab === 2}
            >
              <Repeat2 size={14} strokeWidth={2} />
              {t('转发2')}
            </button>
            <button
              type="button"
              id="profile-tab-tipped"
              className={`profile-content-tab${profileTab === 3 ? ' profile-content-tab--active' : ''}`}
              onClick={() => setProfileTab(3)}
              aria-selected={profileTab === 3}
            >
              <HandCoins size={14} strokeWidth={2} />
              {t('打赏2')}
            </button>
            <button
              type="button"
              id="profile-tab-saved"
              className={`profile-content-tab${profileTab === 4 ? ' profile-content-tab--active' : ''}`}
              onClick={() => setProfileTab(4)}
              aria-selected={profileTab === 4}
            >
              <Bookmark size={14} strokeWidth={2} />
              {t('收藏3')}
            </button>
            <button
              type="button"
              id="profile-tab-liked"
              className={`profile-content-tab${profileTab === 5 ? ' profile-content-tab--active' : ''}`}
              onClick={() => setProfileTab(5)}
              aria-selected={profileTab === 5}
            >
              <ThumbsUp size={14} strokeWidth={2} />
              {t('赞过')}
            </button>
          </nav>
          <div className={`profile-content-tabs-fade profile-content-tabs-fade--left${tabsCanScrollLeft ? ' profile-content-tabs-fade--visible' : ''}`} aria-hidden="true" />
          <div className={`profile-content-tabs-fade profile-content-tabs-fade--right${tabsCanScrollRight ? ' profile-content-tabs-fade--visible' : ''}`} aria-hidden="true" />
          </div>
        ) : (
          <div className="profile-content-tabs-wrap profile-content-tabs-wrap--hero">
          <nav
            className="profile-content-tabs"
            aria-label={t('内容筛选')}
            ref={tabsScrollRef as React.RefObject<HTMLElement>}
            onScroll={updateTabsScrollState}
          >
            {(['all', 'sub'] as const).map(f => (
              <button
                key={f}
                type="button"
                className={`profile-content-tab${contentFilter === f ? ' profile-content-tab--active' : ''}`}
                onClick={() => setContentFilter(f)}
              >
                {f === 'all' ? <LayoutGrid size={14} strokeWidth={2} /> : <Gem size={14} strokeWidth={2} />}
                {f === 'all' ? t('全部') : t('会员')}
              </button>
            ))}
          </nav>
          <div className={`profile-content-tabs-fade profile-content-tabs-fade--left${tabsCanScrollLeft ? ' profile-content-tabs-fade--visible' : ''}`} aria-hidden="true" />
          <div className={`profile-content-tabs-fade profile-content-tabs-fade--right${tabsCanScrollRight ? ' profile-content-tabs-fade--visible' : ''}`} aria-hidden="true" />
          </div>
        )}

        {isOwn && profileTab === 1 ? (
          <section className="feed draft-list">
            {drafts.length === 0 ? (
              <div className="profile-empty-state">
                <Edit3 size={32} strokeWidth={1.2} className="profile-empty-icon" />
                <p className="profile-empty-title">{t('还没有草稿')}</p>
                <p className="profile-empty-sub">{t('在发帖时可以保存草稿，稍后继续编辑')}</p>
              </div>
            ) : (
              drafts.map(d => (
                <DraftItem key={d.id} draft={d} onEdit={() => openComposeWithDraft(d)} onDelete={() => setConfirmDeleteDraftId(d.id)} />
              ))
            )}
          </section>
        ) : isOwn && profileTab === 3 ? (
          <section className="feed tip-history-list">
            {outgoingTips.length === 0 ? (
              <div className="profile-empty-state">
                <HandCoins size={32} strokeWidth={1.2} className="profile-empty-icon" />
                <p className="profile-empty-title">{t('还没有打赏')}</p>
                <p className="profile-empty-sub">{t('在帖子或用户主页点击打赏，就能在这里看到了')}</p>
              </div>
            ) : (
              outgoingTips.map(tip => (
                <OutgoingTipItem
                  key={tip.id}
                  tip={tip}
                  onOpen={() => {
                    if (tip.postId) navigate({ page: 'P2', postId: tip.postId });
                    else navigate({ page: 'P6', authorName: tip.recipientName });
                  }}
                />
              ))
            )}
          </section>
        ) : (
          <section className="feed">
            {displayedEntries.map((entry, i) => (
              <React.Fragment key={`${entry.post.id}-${entry.repostedBy?.name ?? 'orig'}`}>
                {isOwn && !isPostVisible(entry.post) && entry.post.scheduledAt && (
                  <p className="profile-scheduled-badge">
                    <Clock size={12} strokeWidth={2} aria-hidden />
                    {t('定时发布 · {time}', { time: formatScheduledAt(entry.post.scheduledAt) })}
                  </p>
                )}
                <PostCard
                  post={entry.post}
                  index={i % 3}
                  hideFollow={!isOwn}
                  repostedBy={entry.repostedBy}
                  chainOutline={isOwn}
                />
              </React.Fragment>
            ))}
            {displayedPosts.length === 0 && (
              <div className="profile-empty-state">
                {profileTab === 2 ? (
                  <>
                    <Repeat2 size={32} strokeWidth={1.2} className="profile-empty-icon" />
                    <p className="profile-empty-title">{t('还没有转发')}</p>
                    <p className="profile-empty-sub">{t('点击帖子右下角的转发图标，就能在这里看到了')}</p>
                  </>
                ) : profileTab === 4 ? (
                  <>
                    <Bookmark size={32} strokeWidth={1.2} className="profile-empty-icon" />
                    <p className="profile-empty-title">{t('还没有收藏')}</p>
                    <p className="profile-empty-sub">{t('点击帖子右下角的收藏图标，就能在这里看到了')}</p>
                  </>
                ) : profileTab === 5 ? (
                  <>
                    <ThumbsUp size={32} strokeWidth={1.2} className="profile-empty-icon" />
                    <p className="profile-empty-title">{t('还没有赞过')}</p>
                    <p className="profile-empty-sub">{t('点击帖子右下角的点赞图标，就能在这里看到了')}</p>
                  </>
                ) : (
                  <>
                    <FileText size={32} strokeWidth={1.2} className="profile-empty-icon" />
                    <p className="profile-empty-title">{t('还没有帖子')}</p>
                    <p className="profile-empty-sub">{t('发布第一篇帖子，开始记录你的知识')}</p>
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* 删除草稿确认弹窗 */}
      {confirmDeleteDraftId && (
        <ConfirmDeleteDraftModal
          onConfirm={() => { deleteDraft(confirmDeleteDraftId); setConfirmDeleteDraftId(null); }}
          onCancel={() => setConfirmDeleteDraftId(null)}
        />
      )}

      {followListType && (
        <FollowListModal
          type={followListType}
          authorName={authorName}
          onClose={() => setFollowListType(null)}
        />
      )}

      {channelDirectoryOpen && (
        <ChannelDirectoryModal
          channels={ownerChannels}
          isOwn={isOwn}
          onClose={() => setChannelDirectoryOpen(false)}
        />
      )}

      {tipTarget && (
        <TipModal
          recipientName={authorName}
          context={tipTarget.context}
          postTitle={tipTarget.postTitle}
          onClose={() => setTipTarget(null)}
        />
      )}

      {showLanguageSheet && (
        <LanguageSheet onClose={() => setShowLanguageSheet(false)} />
      )}

      {showEditProfile && (
        <EditProfileModal
          userProfile={userProfile}
          onSave={(profile) => { updateUserProfile(profile); setShowEditProfile(false); }}
          onClose={() => setShowEditProfile(false)}
          t={t}
        />
      )}

      {migrationReminderId && (() => {
        const migration = addressMigrations.find(item => item.id === migrationReminderId);
        return migration ? (
          <AddressMigrationStatusModal
            migration={migration}
            onCancel={cancelAddressMigration}
            onClose={() => { dismissMigrationReminder(migration.id); setMigrationReminderId(null); }}
          />
        ) : null;
      })()}

      {isOwn && <DevPanel />}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Account & Profile Modal
// ═══════════════════════════════════════════════════════════════

const CONTACT_FIELDS_PRIMARY: { key: keyof ProfileContacts; label: string; icon: typeof MessageCircle; placeholder: string }[] = [
  { key: 'wechat', label: '微信', icon: MessageCircle, placeholder: '微信号' },
  { key: 'phone', label: '电话', icon: Phone, placeholder: '电话号码' },
];
const CONTACT_FIELDS_MORE: { key: keyof ProfileContacts; label: string; icon: typeof MessageCircle; placeholder: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircleMore, placeholder: 'WhatsApp 号码' },
];

function EditProfileModal({
  userProfile,
  onSave,
  onClose,
  t,
}: {
  userProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { addressMigrations, cancelAddressMigration, requestAddressMigration, walletAddress } = useApp();
  const [nickname, setNickname] = useState(userProfile.nickname);
  const [bio, setBio] = useState(userProfile.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(userProfile.avatarUrl);
  const [contacts, setContacts] = useState<ProfileContacts>(userProfile.contacts ?? {});
  const [moreContactsOpen, setMoreContactsOpen] = useState(
    !!userProfile.contacts?.whatsapp?.trim()
  );
  const [migrationSheetOpen, setMigrationSheetOpen] = useState(false);
  const [migrationStatusOpen, setMigrationStatusOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trimmed = nickname.trim();
  const sourceAddress = walletAddress ?? MOCK_WALLET_ADDRESS;
  const maskedWallet = shortenWalletAddress(sourceAddress);
  const activeMigration = addressMigrations.find(migration => migration.status === 'pending' && migration.expiresAt > Date.now());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="edit-profile-sheet" role="dialog" aria-label={t('账户与资料')} onClick={e => e.stopPropagation()}>
        <div className="edit-profile-header">
          <button type="button" className="edit-profile-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
          <span className="edit-profile-title">{t('账户与资料')}</span>
          <button
            type="button"
            className="edit-profile-save"
            onClick={() => onSave({ nickname: trimmed, avatarSeed: userProfile.avatarSeed, avatarUrl, contacts, bio: bio.trim() || undefined })}
          >
            {t('保存')}
          </button>
        </div>

        <div className="edit-profile-body">
          {/* 头像上传 */}
          <div className="edit-profile-avatar-upload">
            <div
              className="edit-profile-avatar-preview"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label={t('更换头像')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              <ImageWithFallback
                src={avatarUrl}
                alt=""
                className="edit-profile-avatar-img"
                fallback={<BoringAvatar size="100%" name={userProfile.avatarSeed} variant="beam" colors={AVATAR_COLORS} />}
              />
              <div className="edit-profile-avatar-badge">
                <Camera size={12} strokeWidth={2.5} />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* 钱包地址（只读） */}
          <div className="edit-profile-wallet">
            <div className="edit-profile-wallet-info">
              <span className="edit-profile-wallet-label">{t('钱包地址')}</span>
              <span className="edit-profile-wallet-addr">{maskedWallet}</span>
            </div>
            <button
              type="button"
              className="address-migration-entry"
              onClick={() => activeMigration ? setMigrationStatusOpen(true) : setMigrationSheetOpen(true)}
            >
              {activeMigration
                ? <Clock size={14} strokeWidth={2.2} aria-hidden="true" />
                : <Repeat2 size={14} strokeWidth={2.2} aria-hidden="true" />}
              {activeMigration ? t('迁移处理中') : t('迁移账户')}
            </button>
          </div>
          {/* 昵称输入 */}
          <div className="edit-profile-field">
            <label className="edit-profile-label" htmlFor="ep-nickname">
              {t('昵称')}
            </label>
            <input
              id="ep-nickname"
              className="edit-profile-input"
              value={nickname}
              maxLength={24}
              placeholder={DEFAULT_WALLET_DISPLAY}
              onChange={e => setNickname(e.target.value)}
              autoComplete="off"
            />
            <span className="edit-profile-charcount">{nickname.length}/24</span>
          </div>

          {/* 一句话简介：展示在主页昵称下方 */}
          <div className="edit-profile-field">
            <label className="edit-profile-label" htmlFor="ep-bio">
              {t('个人简介')}
            </label>
            <textarea
              id="ep-bio"
              className="edit-profile-textarea"
              value={bio}
              maxLength={60}
              rows={2}
              placeholder={t('写一句话介绍自己')}
              onChange={e => setBio(e.target.value)}
            />
            <span className="edit-profile-charcount">{bio.length}/60</span>
          </div>

          {/* 联系方式：小黄车卖家可选填，供买家在商品详情页联系 */}
          <div className="edit-profile-field">
            <label className="edit-profile-label">{t('小黄车联系方式')}</label>
            <p className="edit-profile-hint">{t('填写后，买家能在你的小黄车商品页看到并联系你')}</p>
            <div className="edit-profile-contacts">
              {CONTACT_FIELDS_PRIMARY.map(({ key, label, icon: Icon, placeholder }) => (
                <div className="edit-profile-contact-row" key={key}>
                  <Icon size={16} strokeWidth={2} className="edit-profile-contact-icon" aria-hidden="true" />
                  <div className="edit-profile-contact-input-wrap">
                    <input
                      className="edit-profile-input edit-profile-contact-input"
                      value={contacts[key] ?? ''}
                      placeholder={t(placeholder)}
                      aria-label={t(label)}
                      onChange={e => setContacts(c => ({ ...c, [key]: e.target.value }))}
                      autoComplete="off"
                    />
                    {contacts[key] && (
                      <button
                        type="button"
                        className="edit-profile-contact-clear"
                        onClick={() => setContacts(c => ({ ...c, [key]: '' }))}
                        aria-label={t('清空')}
                      >
                        <X size={13} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {moreContactsOpen && CONTACT_FIELDS_MORE.map(({ key, label, icon: Icon, placeholder }) => (
                <div className="edit-profile-contact-row" key={key}>
                  <Icon size={16} strokeWidth={2} className="edit-profile-contact-icon" aria-hidden="true" />
                  <div className="edit-profile-contact-input-wrap">
                    <input
                      className="edit-profile-input edit-profile-contact-input"
                      value={contacts[key] ?? ''}
                      placeholder={t(placeholder)}
                      aria-label={t(label)}
                      onChange={e => setContacts(c => ({ ...c, [key]: e.target.value }))}
                      autoComplete="off"
                    />
                    {contacts[key] && (
                      <button
                        type="button"
                        className="edit-profile-contact-clear"
                        onClick={() => setContacts(c => ({ ...c, [key]: '' }))}
                        aria-label={t('清空')}
                      >
                        <X size={13} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!moreContactsOpen && (
                <button
                  type="button"
                  className="edit-profile-contacts-more"
                  onClick={() => setMoreContactsOpen(true)}
                >
                  {t('其他联系方式')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {migrationSheetOpen && (
        <AddressMigrationSheet
          sourceAddress={sourceAddress}
          onClose={() => setMigrationSheetOpen(false)}
          onSubmit={(targetAddress) => {
            const result = requestAddressMigration(targetAddress);
            if (result.ok) setMigrationSheetOpen(false);
            return result;
          }}
        />
      )}
      {migrationStatusOpen && activeMigration && (
        <AddressMigrationStatusModal
          migration={activeMigration}
          onClose={() => setMigrationStatusOpen(false)}
          onCancel={cancelAddressMigration}
        />
      )}
    </div>
  );
}

const ADDRESS_MIGRATION_PB_FEE = 100;
const ADDRESS_MIGRATION_SUP_FEE = 0.01;

function shortenWalletAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-6)}` : address;
}

function formatMigrationDate(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function useMigrationNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function AddressMigrationSheet({
  sourceAddress,
  onSubmit,
  onClose,
}: {
  sourceAddress: string;
  onSubmit: (targetAddress: string) => { ok: boolean; message?: string };
  onClose: () => void;
}) {
  const { t, pbWallets, supBalance } = useApp();
  const [targetAddress, setTargetAddress] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const normalizedTarget = targetAddress.trim().toLowerCase();
  const addressValid = /^0x[a-fA-F0-9]{40}$/.test(targetAddress.trim());
  const isDifferentAddress = normalizedTarget !== sourceAddress.toLowerCase();
  const pbSufficient = pbWallets.onchain >= ADDRESS_MIGRATION_PB_FEE;
  const supSufficient = supBalance >= ADDRESS_MIGRATION_SUP_FEE;
  const matchedUser = addressValid && isDifferentAddress ? findRegisteredUserByAddress(normalizedTarget) : undefined;
  const unregisteredAddress = addressValid && isDifferentAddress && !matchedUser;
  const formReady = addressValid && isDifferentAddress && !!matchedUser && pbSufficient && supSufficient;

  const validationMessage = (() => {
    if (!targetAddress.trim()) return t('请填写新地址');
    if (!addressValid) return t('请输入有效的 0x 地址');
    if (!isDifferentAddress) return t('新地址需与当前地址不同');
    if (unregisteredAddress) return t('迁移目标需关联知识宇宙账户');
    if (!pbSufficient) return t('链上 PB 余额不足');
    if (!supSufficient) return t('SUP 余额不足');
    return null;
  })();

  const handleSubmit = () => {
    setAttempted(true);
    setSubmitError(null);
    if (!formReady) return;
    setConfirmOpen(true);
  };

  const handleConfirmMigration = () => {
    const result = onSubmit(normalizedTarget);
    if (!result.ok) {
      setSubmitError(result.message ?? t('提交失败，请稍后重试'));
      setConfirmOpen(false);
    }
  };

  const handlePasteAddress = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) { setTargetAddress(text); setSubmitError(null); }
    } catch {
      // 剪贴板读取失败（权限被拒等）：静默忽略，用户仍可手动输入
    }
  };

  return (
    <div className="sheet-backdrop address-migration-backdrop" onClick={onClose}>
      <div className="payment-sheet address-migration-sheet" role="dialog" aria-modal="true" aria-label={t('账户迁移申请')} onClick={event => event.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('账户迁移申请')}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="address-migration-address-block">
          <span>{t('当前地址')}</span>
          <strong>{sourceAddress}</strong>
        </div>
        <div className="address-migration-field">
          <label htmlFor="address-migration-target">{t('新地址')}</label>
          <div className="stake-code-input-wrap">
            <input
              id="address-migration-target"
              className={`edit-profile-input address-migration-target-input${(attempted && validationMessage) || unregisteredAddress ? ' edit-profile-input--error' : ''}`}
              value={targetAddress}
              onChange={event => { setTargetAddress(event.target.value); setSubmitError(null); }}
              placeholder={t('请填写新地址')}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="stake-code-paste-btn" onClick={handlePasteAddress}>
              {t('粘贴')}
            </button>
          </div>
        </div>
        {unregisteredAddress || (attempted && validationMessage) || submitError ? (
          <p className="address-migration-error" role="alert">
            {unregisteredAddress ? t('迁移目标需关联知识宇宙账户') : (submitError ?? validationMessage)}
          </p>
        ) : null}

        <div className="address-migration-fee-card">
          <span className="address-migration-fee-title">{t('迁移费用')}</span>
          <div><span>{t('手续费')}</span><strong>{ADDRESS_MIGRATION_PB_FEE} PB</strong></div>
          <div><span>{t('Gas 费')}</span><strong>{ADDRESS_MIGRATION_SUP_FEE} SUP</strong></div>
        </div>
        <div className="address-migration-risk" role="note">
          <AlertTriangle size={16} strokeWidth={2.2} aria-hidden="true" />
          <p>{t('提交后，资料将在 24 小时撤销期结束时迁移至新地址。撤销期内可提交撤销申请；撤销期结束后，迁移将进入执行流程，并由新地址管理。请确认新地址可由你控制。')}</p>
        </div>
        <button type="button" className="planet-confirm-btn address-migration-submit" onClick={handleSubmit} disabled={!formReady}>
          {t('提交迁移申请')}
        </button>
      </div>
      {confirmOpen && matchedUser && (
        <AddressMigrationConfirmModal
          targetAddress={normalizedTarget}
          matchedUser={matchedUser}
          onConfirm={handleConfirmMigration}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

function AddressMigrationConfirmModal({
  targetAddress,
  matchedUser,
  onConfirm,
  onCancel,
}: {
  targetAddress: string;
  matchedUser: UserListItem;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useApp();
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="payment-sheet address-migration-confirm" role="dialog" aria-modal="true" aria-label={t('确认迁移账户')} onClick={event => event.stopPropagation()}>
        <span className="address-migration-confirm-title">{t('确认迁移账户')}</span>
        <div className="address-migration-address-block">
          <span>{t('新地址')}</span>
          <strong>{targetAddress}</strong>
        </div>
        <div className="address-migration-match-card">
          <span className="address-migration-match-hint">{t('该地址关联的知识宇宙账户')}</span>
          <div className="address-migration-match-user">
            <Avatar index={matchedUser.avatarIdx} />
            <AuthorName name={matchedUser.name} />
          </div>
        </div>
        <div className="address-migration-confirm-stats">
          <div className="address-migration-confirm-stat">
            <span className="address-migration-confirm-stat-num">15</span>
            <span className="address-migration-confirm-stat-label">{t('关注2')}</span>
          </div>
          <div className="address-migration-confirm-stat">
            <span className="address-migration-confirm-stat-num">124</span>
            <span className="address-migration-confirm-stat-label">{t('粉丝')}</span>
          </div>
          <div className="address-migration-confirm-stat">
            <span className="address-migration-confirm-stat-num">32</span>
            <span className="address-migration-confirm-stat-label">{t('帖子')}</span>
          </div>
        </div>
        <div className="address-migration-confirm-actions">
          <button type="button" className="gemini-stake-btn gemini-stake-btn--ghost" onClick={onCancel}>
            {t('返回修改')}
          </button>
          <button type="button" className="planet-confirm-btn" onClick={onConfirm}>
            {t('确认迁移')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressMigrationStatusModal({
  migration,
  onClose,
  onCancel,
}: {
  migration: AddressMigration;
  onClose: () => void;
  onCancel: (migrationId: string) => boolean;
}) {
  const { t } = useApp();
  const now = useMigrationNow();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const canCancel = migration.status === 'pending' && migration.expiresAt > now;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet address-migration-reminder" role="dialog" aria-modal="true" aria-label={t('账户迁移申请处理中')} onClick={event => event.stopPropagation()}>
        <div className="address-migration-reminder-icon"><Clock size={24} strokeWidth={2.2} aria-hidden="true" /></div>
        <span className="address-migration-reminder-title">{t('账户迁移申请处理中')}</span>
        <div className="address-migration-reminder-addresses">
          <div className="address-migration-reminder-address">
            <span>{t('原地址')}</span>
            <strong>{migration.sourceAddress}</strong>
          </div>
          <div className="address-migration-reminder-address">
            <span>{t('新地址')}</span>
            <strong>{migration.targetAddress}</strong>
          </div>
          <div className="address-migration-reminder-address">
            <span>{t('撤销截止')}</span>
            <strong>{formatMigrationDate(migration.expiresAt)}</strong>
          </div>
        </div>
        {canCancel && (
          <div className="address-migration-reminder-note" role="note">
            <AlertTriangle size={16} strokeWidth={2.2} aria-hidden="true" />
            <p>{t('过期后无法撤销；若非本人操作，请立即撤销')}</p>
          </div>
        )}
        <div className="address-migration-reminder-actions">
          {canCancel && (
            <button type="button" className="gemini-stake-btn gemini-stake-btn--ghost address-migration-reminder-cancel" onClick={() => setConfirmCancel(true)}>
              {t('撤销迁移')}
            </button>
          )}
          <button type="button" className="planet-confirm-btn address-migration-reminder-primary" onClick={onClose}>{t('我知道了')}</button>
        </div>
      </div>
      {confirmCancel && (
        <Ios26Alert
          title={t('确认撤销迁移')}
          message={t('撤销后将释放已冻结的迁移费用')}
          cancelLabel={t('继续等待')}
          confirmLabel={t('撤销迁移')}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => {
            if (onCancel(migration.id)) { setConfirmCancel(false); onClose(); }
          }}
        />
      )}
    </div>
  );
}

const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'ru', label: 'Русский' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
];

function LanguageSheet({ onClose }: { onClose: () => void }) {
  const { language, setLanguage, t } = useApp();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet lang-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('选择语言')}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="lang-option-list">
          {LANGUAGE_OPTIONS.map(opt => (
            <button
              key={opt.code}
              type="button"
              className="lang-option"
              onClick={() => { setLanguage(opt.code); onClose(); }}
            >
              <span className="lang-option__label">{opt.label}</span>
              {language === opt.code && (
                <Check size={16} strokeWidth={2.5} className="lang-option__check" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Channel Directory Modal（频道目录：搜索 + 每页 50 条「加载更多」，
// 承载千级频道规模，主页只留一个固定高度的摘要入口打开它）
// ═══════════════════════════════════════════════════════════════

function ChannelDirectoryModal({
  channels,
  isOwn,
  onClose,
}: {
  channels: Channel[];
  isOwn: boolean;
  onClose: () => void;
}) {
  const { t, navigate, openManageChannel, openCreateChannel } = useApp();
  const channelListState = useChannelListSearch(channels);
  const ownerName = channels[0]?.ownerName ?? '';

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="follow-list-modal channel-directory-modal" onClick={e => e.stopPropagation()}>
        <div className="follow-list-header">
          <span className="follow-list-title">
            {isOwn
              ? t('我的频道 · {count}', { count: channels.length })
              : t('{ownerName} 的频道 · {count}', { ownerName, count: channels.length })}
          </span>
          <button type="button" className="follow-list-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        {channels.length > 1 && (
          <div className="channel-directory-search-wrap">
            <Search size={15} strokeWidth={2} className="channel-directory-search-icon" aria-hidden />
            <input
              className="channel-directory-search-input"
              type="text"
              value={channelListState.search}
              onChange={e => channelListState.setSearch(e.target.value)}
              placeholder={t('搜索频道名称或简介')}
              aria-label={t('搜索频道名称或简介')}
            />
          </div>
        )}
        <div className="follow-list-content channel-directory-list">
          {channelListState.visible.length === 0 ? (
            <div className="channel-directory-empty">{t('没有找到匹配的频道')}</div>
          ) : channelListState.visible.map((c, i) => (
            <ChannelCard
              key={c.id}
              channel={c}
              index={i % 3}
              onClick={() => { navigate({ page: 'P_CHANNEL', channelId: c.id }); onClose(); }}
              onManage={isOwn ? () => openManageChannel(c.id) : undefined}
              showSubscribe={!isOwn}
              showAvatar={false}
            />
          ))}
          {channelListState.hasMore && (
            <button type="button" className="channel-directory-more-btn" onClick={channelListState.loadMore}>
              {t('加载更多（剩余 {length}）', { length: channelListState.filteredCount - channelListState.visible.length })}
            </button>
          )}
        </div>
        {isOwn && (
          <div className="channel-directory-footer">
            <button type="button" className="channel-directory-create-btn" onClick={openCreateChannel}>
              <Plus size={16} strokeWidth={2.4} />
              {t('创建新频道')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FollowListModal({
  type,
  authorName,
  onClose,
}: {
  type: 'following' | 'followers';
  authorName: string;
  onClose: () => void;
}) {
  const { navigate, followedAuthors, toggleFollow, t } = useApp();
  const isOwn = authorName === CURRENT_USER;

  let users: typeof ALL_USERS_MOCK = [];

  if (type === 'following') {
    if (isOwn) {
      users = ALL_USERS_MOCK.filter(u => followedAuthors.has(u.name));
      followedAuthors.forEach(name => {
        if (!users.some(u => u.name === name)) {
          users.push({
            name,
            desc: '内容创作者',
            avatarIdx: 0,
          });
        }
      });
    } else {
      users = ALL_USERS_MOCK.filter(u => u.name !== authorName).slice(0, 3);
    }
  } else {
    users = ALL_USERS_MOCK.filter(u => u.name !== authorName);
    if (!isOwn && followedAuthors.has(authorName)) {
      users = [{ name: CURRENT_USER, desc: '独立创作者（我）', avatarIdx: 0 }, ...users];
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="follow-list-modal" onClick={e => e.stopPropagation()}>
        <div className="follow-list-header">
          <span className="follow-list-title">
            {type === 'following'
              ? (isOwn ? t('我的关注') : t('{authorName} 的关注', { authorName }))
              : (isOwn ? t('我的粉丝') : t('{authorName} 的粉丝', { authorName }))}
          </span>
          <button type="button" className="follow-list-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="follow-list-content">
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ku-color-text-secondary)' }}>
              {t('暂无数据')}
            </div>
          ) : (
            users.map((user) => {
              const isUserFollowing = followedAuthors.has(user.name);
              const isSelf = user.name === CURRENT_USER;

              return (
                <div
                  key={user.name}
                  className="follow-list-item"
                  onClick={() => {
                    navigate({ page: 'P6', authorName: user.name });
                    onClose();
                  }}
                >
                  <Avatar index={user.avatarIdx} />
                  <div className="follow-item-info">
                    <AuthorName name={user.name} className="follow-item-name" />
                    <div className="follow-item-desc">{user.desc}</div>
                  </div>
                  {!isSelf && (
                  <button
                    type="button"
                    className={`follow-btn follow-btn--sm${isUserFollowing ? ' follow-btn--following' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFollow(user.name);
                    }}
                  >
                    {isUserFollowing ? (
                      <>
                        <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                        {t('已关注')}
                      </>
                    ) : (
                      <>
                        <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                        {t('关注')}
                      </>
                    )}
                  </button>
                )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function SubscriberListModal({
  channel,
  onClose,
}: {
  channel: Channel;
  onClose: () => void;
}) {
  const { navigate, followedAuthors, toggleFollow, t } = useApp();
  const subscribers = getChannelSubscribers(channel);
  const displayCount = Math.max(channel.subscriberCount, subscribers.length);

  // 分组：档位从高到低；组内沿用 mock 顺序（已按订阅时间从新到旧排好）
  const tierRank = (tierName: string) => {
    const idx = channel.tiers.findIndex(tr => tr.name === tierName);
    return idx >= 0 ? idx : -1;
  };
  const groups: { tierName: string; users: ChannelSubscriber[] }[] = [];
  const sorted = [...subscribers].sort((a, b) => {
    const byTier = tierRank(b.tierName) - tierRank(a.tierName);
    if (byTier !== 0) return byTier;
    return 0; // 同档保持 mock 原序（新→旧）
  });
  for (const user of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.tierName === user.tierName) last.users.push(user);
    else groups.push({ tierName: user.tierName, users: [user] });
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="follow-list-modal" onClick={e => e.stopPropagation()}>
        <div className="follow-list-header">
          <span className="follow-list-title">
            {t('订阅用户 · {displayCount}', { displayCount })}
          </span>
          <button type="button" className="follow-list-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="follow-list-content">
          {groups.length === 0 ? (
            <div className="follow-list-empty">
              {t('还没有订阅用户')}
            </div>
          ) : (
            groups.map(group => {
              const tier = channel.tiers.find(tr => tr.name === group.tierName);
              return (
                <section key={group.tierName} className="subscriber-tier-group">
                  <h3 className="subscriber-tier-group-title">
                    {group.tierName}
                    {tier ? (
                      <span className="subscriber-tier-group-meta">
                        {t('{price} PB/月 · {length} 人', { price: tier.price, length: group.users.length })}
                      </span>
                    ) : (
                      <span className="subscriber-tier-group-meta">
                        {t('{length} 人', { length: group.users.length })}
                      </span>
                    )}
                  </h3>
                  {group.users.map(user => {
                    const isUserFollowing = followedAuthors.has(user.name);
                    const isSelf = user.name === CURRENT_USER;
                    return (
                      <div
                        key={user.name}
                        className="follow-list-item"
                        onClick={() => {
                          navigate({ page: 'P6', authorName: user.name });
                          onClose();
                        }}
                      >
                        <Avatar index={user.avatarIdx} />
                        <div className="follow-item-info">
                          <div className="follow-item-name-row">
                            <AuthorName name={user.name} className="follow-item-name" />
                            <ChannelMemberBadge tierName={user.tierName} />
                          </div>
                          <div className="follow-item-desc">
                            {t('订阅于 {subscribedAt}', { subscribedAt: user.subscribedAt })}
                          </div>
                        </div>
                        {!isSelf && (
                          <button
                            type="button"
                            className={`follow-btn follow-btn--sm${isUserFollowing ? ' follow-btn--following' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollow(user.name);
                            }}
                          >
                            {isUserFollowing ? (
                              <>
                                <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                                {t('已关注')}
                              </>
                            ) : (
                              <>
                                <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                                {t('关注')}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Draft Item Row
// ═══════════════════════════════════════════════════════════════

function OutgoingTipItem({ tip, onOpen }: { tip: OutgoingTip; onOpen: () => void }) {
  const { t } = useApp();

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return t('刚刚');
    if (min < 60) return `${min}${t('分钟前')}`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}${t('小时前')}`;
    const days = Math.floor(hours / 24);
    return `${days}${t('天前')}`;
  };

  const title = tip.context === 'post' && tip.postTitle
    ? tip.postTitle.split('\n')[0]
    : t('打赏给 {recipientName}', { recipientName: tip.recipientName });

  return (
    <button type="button" className="tip-history-item" onClick={onOpen}>
      <div className="tip-history-item-icon" aria-hidden="true">
        <Flame size={16} strokeWidth={2} />
      </div>
      <div className="tip-history-item-body">
        <div className="tip-history-item-title">{title}</div>
        {tip.message && <div className="tip-history-item-message">{tip.message}</div>}
        <div className="tip-history-item-meta">
          <span>{tip.recipientName}</span>
          <span>{formatTime(tip.createdAt)}</span>
        </div>
      </div>
      <span className="tip-history-item-amount">-{tip.amount} PB</span>
    </button>
  );
}

function DraftItem({ draft, onEdit, onDelete }: { draft: Draft; onEdit: () => void; onDelete: () => void }) {
  const { t } = useApp();

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return t('刚刚');
    if (min < 60) return `${min}${t('分钟前')}`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}${t('小时前')}`;
    const days = Math.floor(hours / 24);
    return `${days}${t('天前')}`;
  };

  const hasThumbnail = !!draft.thumbnailUrl;

  return (
    <div className="draft-item" onClick={onEdit}>
      {hasThumbnail && (
        <div className="draft-item-thumb">
          <ImageWithFallback src={draft.thumbnailUrl} alt="" className="draft-item-thumb-img" />
        </div>
      )}
      <div className="draft-item-body">
        <div className="draft-item-title">{draft.title || draft.articleTitle || t('（无标题）')}</div>
        <div className="draft-item-meta">
          <span className="draft-item-time">{formatTime(draft.savedAt)}</span>
        </div>
      </div>
      <button
        type="button"
        className="draft-item-delete"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        aria-label={t('删除草稿')}
      >
        <Trash2 size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Bottom Nav
// ═══════════════════════════════════════════════════════════════
