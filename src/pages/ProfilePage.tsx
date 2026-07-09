import React, { useEffect, useRef, useState } from 'react';
import { Bell, Bookmark, Camera, Check, ChevronRight, CircleCheck, Edit3, FileText, Gem, HandCoins, Languages, LayoutGrid, MessageCircle, Plus, Radio, Repeat2, Settings, Trash2, X } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { useApp } from '../AppContext';
import { ALL_POSTS, ALL_USERS_MOCK, AUTHOR_REPOSTS, CURRENT_USER, DEFAULT_WALLET_DISPLAY, getChannelSubscribers, getGenesisTier, MOCK_WALLET_ADDRESS } from '../mockData';
import type { Channel, ChannelSubscriber, Draft, RepostedBy } from '../types';
import { PostCard } from '../components/PostCard';
import { ConfirmDeleteDraftModal, TipModal } from '../components/Overlays';
import { Avatar, AuthorName, ChannelMemberBadge, GenesisBadge, PageHeader } from '../components/shared';

const AVATAR_COLORS = ['#00cdb8', '#0e3060', '#f4e4c4', '#1a2a4e', '#d6fff6'];

export function ProfilePage({ authorName }: { authorName: string }) {
  const { goBack, canGoBack, navigate, drafts, openComposeWithDraft, deleteDraft, followedAuthors, toggleFollow, language, setLanguage, posts: allPosts, savedPostIds, repostedPostIds, unreadActivityCount, t, userProfile, updateUserProfile, channels, subscribedChannelTiers, openChannelSubscribe, openCreateChannel, openManageChannel } = useApp();
  const isOwn = authorName === CURRENT_USER;
  const isFollowing = followedAuthors.has(authorName);
  // 自己主页优先用预置 channel-lin（含订阅 mock），避免会话里临时开通的空频道盖住演示数据
  const channel = isOwn
    ? (channels.find(c => c.id === 'channel-lin') ?? channels.find(c => c.ownerName === authorName))
    : channels.find(c => c.ownerName === authorName);
  const genesisTier = getGenesisTier(authorName);
  const mySubscribedTierIndex = channel ? subscribedChannelTiers[channel.id] : undefined;
  // 我的主页隐藏长文（article）类型的 mock 帖子
  const myPosts = allPosts.filter(p => p.author === authorName && !(isOwn && p.kind === 'article'));
  const savedPosts = allPosts.filter(p => savedPostIds.has(p.id));
  const repostedPosts = allPosts.filter(p => repostedPostIds.has(p.id));
  const firstPost = allPosts.find(p => p.author === authorName);

  // 当前用户转发的帖子（排除自己发布的），带「转发」标识
  const ownRepostEntries: { post: (typeof allPosts)[number]; repostedBy: RepostedBy }[] = repostedPosts
    .filter(p => p.author !== CURRENT_USER)
    .map(post => ({ post, repostedBy: { name: CURRENT_USER, avatarIdx: 0 } }));
  // 他人主页：该作者转发过的帖子（来自 mock 转发关系）
  const theirAvatarIdx = ALL_USERS_MOCK.find(u => u.name === authorName)?.avatarIdx ?? 0;
  const theirRepostEntries: { post: (typeof allPosts)[number]; repostedBy: RepostedBy }[] = (AUTHOR_REPOSTS[authorName] ?? [])
    .map(id => allPosts.find(p => p.id === id))
    .filter((p): p is (typeof allPosts)[number] => !!p && p.author !== authorName)
    .map(post => ({ post, repostedBy: { name: authorName, avatarIdx: theirAvatarIdx } }));

  // Tab 仅在自己主页上启用：0 = 帖子，1 = 草稿，2 = 转发，3 = 收藏
  const [profileTab, setProfileTab] = useState<0 | 1 | 2 | 3>(0);
  // 他人主页内容筛选：'all' | 'free' | 'sub'
  const [contentFilter, setContentFilter] = useState<'all' | 'free' | 'sub'>('all');
  const [followListType, setFollowListType] = useState<'following' | 'followers' | null>(null);
  const [showSubscribers, setShowSubscribers] = useState(false);
  const [confirmDeleteDraftId, setConfirmDeleteDraftId] = useState<string | null>(null);
  const [tipTarget, setTipTarget] = useState<{ context: 'post' | 'author'; postTitle?: string } | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
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

  // 频道订阅门槛：不限档位（无 minTierIndex，无需订阅即可看到）/ 会员专属（设了 minTierIndex，需订阅达标才可见；是否收费另由知识星球单条付费决定）
  const isChannelExclusive = (p: (typeof allPosts)[number]) => !!channel && p.channelId === channel.id && p.minTierIndex != null;
  const filteredOtherPosts = (() => {
    if (contentFilter === 'free') return myPosts.filter(p => !isChannelExclusive(p));
    if (contentFilter === 'sub') return myPosts.filter(isChannelExclusive);
    return myPosts;
  })();

  const displayedEntries: { post: (typeof allPosts)[number]; repostedBy?: RepostedBy }[] =
    isOwn && profileTab === 2 ? ownRepostEntries
    : isOwn && profileTab === 3 ? savedPosts.map(post => ({ post }))
    : isOwn ? myPosts.map(post => ({ post }))
    : contentFilter === 'all' ? [...filteredOtherPosts.map(post => ({ post })), ...theirRepostEntries]
    : filteredOtherPosts.map(post => ({ post }));
  const displayedPosts = displayedEntries.map(e => e.post);

  // 频道信息条 / 开通频道入口：他人主页展示在身份区下方；自己主页降级为次优先级，排在核心社交数据之后
  const channelSection = channel ? (
    <div className="channel-info-bar">
      <div className="channel-info-bar-top">
        <div className="channel-info-bar-left">
          <span className="channel-info-bar-name">
            <Radio size={13} strokeWidth={2.2} />
            {channel.name}
          </span>
          {isOwn ? (
            <button
              type="button"
              className="channel-info-bar-sub channel-info-bar-sub--btn"
              onClick={() => setShowSubscribers(true)}
              aria-label={t(`查看 ${channel.subscriberCount} 位订阅用户`, `View ${channel.subscriberCount} subscribers`)}
            >
              {t(`${channel.subscriberCount} 人已订阅`, `${channel.subscriberCount} subscribers`)}
              <ChevronRight size={13} strokeWidth={2.2} aria-hidden="true" />
            </button>
          ) : (
            <span className="channel-info-bar-sub">
              {t(`${channel.subscriberCount} 人已订阅`, `${channel.subscriberCount} subscribers`)}
            </span>
          )}
        </div>
        {isOwn ? (
          <button type="button" className="channel-manage-btn" onClick={() => openManageChannel(channel.id)}>
            <Settings size={13} strokeWidth={2.2} />
            {t('管理频道', 'Manage')}
          </button>
        ) : (mySubscribedTierIndex != null || channel.tiers.some(tr => !tr.archived)) ? (
          <button
            type="button"
            className={`channel-manage-btn${mySubscribedTierIndex != null ? ' channel-manage-btn--subscribed' : ''}`}
            onClick={() => openChannelSubscribe(channel.id)}
          >
            {mySubscribedTierIndex != null ? (
              <>
                <CircleCheck size={13} strokeWidth={2.2} aria-hidden="true" />
                {t(`已订阅 · ${channel.tiers[mySubscribedTierIndex].name}`, `Subscribed · ${channel.tiers[mySubscribedTierIndex].name}`)}
              </>
            ) : (
              <>
                <Gem size={13} strokeWidth={2.2} aria-hidden="true" />
                {t('订阅', 'Subscribe')}
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  ) : isOwn ? (
    <button type="button" className="channel-create-entry channel-create-entry--subtle" onClick={openCreateChannel}>
      <Radio size={14} strokeWidth={2.2} />
      {t('开通频道 · 发布专属内容', 'Create a channel · Share exclusive content')}
    </button>
  ) : null;

  return (
    <div className="page">
      {!isOwn && <PageHeader title={authorName} onBack={canGoBack ? goBack : undefined} />}
      <div className="scroll-area">
        <div className="profile-header">
          {/* 自己的主页视为底栏 Tab 根页面，不展示返回（即便从头像 navigate 进来也不出现） */}
          {isOwn ? (
            <div className="avatar">
              {userProfile.avatarUrl
                ? <img src={userProfile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <BoringAvatar size="100%" name={userProfile.avatarSeed} variant="beam" colors={AVATAR_COLORS} />
              }
            </div>
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
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={() => setShowEditProfile(true)}
                >
                  <Edit3 size={12} strokeWidth={2} />
                  {t('编辑资料', 'Edit Profile')}
                </button>
              </>
            ) : (
              <span className="profile-name-row">
                <AuthorName name={authorName} className="profile-name" />
                {genesisTier && <GenesisBadge tier={genesisTier} />}
              </span>
            )}
          </div>
          {isOwn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <button
                type="button"
                className="feed-bell-btn"
                onClick={() => navigate({ page: 'P7' })}
                aria-label={t('互动通知', 'Activity')}
              >
                <Bell size={20} strokeWidth={1.8} />
                {unreadActivityCount > 0 && (
                  <span className="feed-bell-dot">{unreadActivityCount > 9 ? '9+' : unreadActivityCount}</span>
                )}
              </button>
              <button
                type="button"
                className="profile-settings-btn"
                onClick={() => setLanguage(language === 'zh-CN' ? 'en' : 'zh-CN')}
                aria-label={t('切换语言', 'Switch language')}
              >
                <Languages size={20} strokeWidth={1.8} />
              </button>
            </div>
          ) : null}
        </div>

        {/* 他人主页：频道信息条 → 关注数据 → 关注/打赏/私信 操作 */}
        {!isOwn && channelSection}

        {!isOwn && (
          <div className="profile-mini-stats">
            <span className="profile-mini-stat">
              <span className="profile-mini-stat-num">15</span>
              <span className="profile-mini-stat-label">{t('关注', 'Following')}</span>
            </span>
            <span className="profile-mini-stat">
              <span className="profile-mini-stat-num">124</span>
              <span className="profile-mini-stat-label">{t('粉丝', 'Followers')}</span>
            </span>
          </div>
        )}

        {!isOwn && (
          <div className="profile-actions">
            <button
              type="button"
              className={`follow-btn${isFollowing ? ' follow-btn--following' : ''}`}
              onClick={() => toggleFollow(authorName)}
            >
              {isFollowing ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} strokeWidth={2.5} />{t('已关注', 'Following')}</span> : t('+ 关注', '+ Follow')}
            </button>
            <button
              type="button"
              className="profile-tip-btn"
              onClick={() => setTipTarget({ context: 'author' })}
              aria-label={t('打赏博主', 'Tip creator')}
            >
              <HandCoins size={14} strokeWidth={2} />
              {t('打赏', 'Tip')}
            </button>
            <button
              type="button"
              className="profile-tip-btn"
              onClick={() => navigate({ page: 'P_DM_CHAT', peerId: authorName })}
              aria-label={t('发私信', 'Send message')}
            >
              <MessageCircle size={14} strokeWidth={2} />
              {t('私信', 'Message')}
            </button>
          </div>
        )}

        {/* 自己主页：身份之后先展示核心社交数据，频道入口作为次优先级弱化展示 */}
        {isOwn && (
          <div className="profile-mini-stats">
            <button type="button" className="profile-mini-stat profile-mini-stat--btn" onClick={() => setFollowListType('following')}>
              <span className="profile-mini-stat-num">{followedAuthors.size}</span>
              <span className="profile-mini-stat-label">{t('关注', 'Following')}</span>
            </button>
            <button type="button" className="profile-mini-stat profile-mini-stat--btn" onClick={() => setFollowListType('followers')}>
              <span className="profile-mini-stat-num">49</span>
              <span className="profile-mini-stat-label">{t('粉丝', 'Followers')}</span>
            </button>
          </div>
        )}

        {isOwn && channelSection}

        {/* 自己主页显示帖子/收藏 tab；他人主页只显示标签 */}
        {isOwn ? (
          <div className="profile-content-tabs-wrap">
          <nav
            className="profile-content-tabs"
            aria-label={t('内容分类', 'Content categories')}
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
              {t('帖子', 'Posts')}
            </button>
            <button
              type="button"
              id="profile-tab-drafts"
              className={`profile-content-tab${profileTab === 1 ? ' profile-content-tab--active' : ''}`}
              onClick={() => setProfileTab(1)}
              aria-selected={profileTab === 1}
            >
              <Edit3 size={14} strokeWidth={2} />
              {t('草稿', 'Drafts')}
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
              {t('转发', 'Reposted')}
            </button>
            <button
              type="button"
              id="profile-tab-saved"
              className={`profile-content-tab${profileTab === 3 ? ' profile-content-tab--active' : ''}`}
              onClick={() => setProfileTab(3)}
              aria-selected={profileTab === 3}
            >
              <Bookmark size={14} strokeWidth={2} />
              {t('收藏', 'Saved')}
            </button>
          </nav>
          <div className={`profile-content-tabs-fade profile-content-tabs-fade--left${tabsCanScrollLeft ? ' profile-content-tabs-fade--visible' : ''}`} aria-hidden="true" />
          <div className={`profile-content-tabs-fade profile-content-tabs-fade--right${tabsCanScrollRight ? ' profile-content-tabs-fade--visible' : ''}`} aria-hidden="true" />
          </div>
        ) : (
          <div className="profile-content-tabs-wrap">
          <nav
            className="profile-content-tabs"
            aria-label={t('内容筛选', 'Content filter')}
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
                {f === 'all' ? t('全部', 'All') : t('会员', 'Members')}
              </button>
            ))}
          </nav>
          <div className={`profile-content-tabs-fade profile-content-tabs-fade--left${tabsCanScrollLeft ? ' profile-content-tabs-fade--visible' : ''}`} aria-hidden="true" />
          <div className={`profile-content-tabs-fade profile-content-tabs-fade--right${tabsCanScrollRight ? ' profile-content-tabs-fade--visible' : ''}`} aria-hidden="true" />
          </div>
        )}

        {profileTab === 1 ? (
          <section className="feed draft-list">
            {drafts.length === 0 ? (
              <div className="profile-empty-state">
                <Edit3 size={32} strokeWidth={1.2} className="profile-empty-icon" />
                <p className="profile-empty-title">{t('还没有草稿', 'No drafts yet')}</p>
                <p className="profile-empty-sub">{t('在发帖时可以保存草稿，稍后继续编辑', 'Save a draft while composing to find it here')}</p>
              </div>
            ) : (
              drafts.map(d => (
                <DraftItem key={d.id} draft={d} onEdit={() => openComposeWithDraft(d)} onDelete={() => setConfirmDeleteDraftId(d.id)} />
              ))
            )}
          </section>
        ) : (
          <section className="feed">
            {displayedEntries.map((entry, i) => (
              <PostCard
                key={`${entry.post.id}-${entry.repostedBy?.name ?? 'orig'}`}
                post={entry.post}
                index={i % 3}
                hideFollow={!isOwn}
                repostedBy={entry.repostedBy}
              />
            ))}
            {displayedPosts.length === 0 && (
              <div className="profile-empty-state">
                {profileTab === 2 ? (
                  <>
                    <Repeat2 size={32} strokeWidth={1.2} className="profile-empty-icon" />
                    <p className="profile-empty-title">{t('还没有转发', 'No reposted posts')}</p>
                    <p className="profile-empty-sub">{t('点击帖子右下角的转发图标，就能在这里看到了', 'Tap the repost icon on a post to find it here')}</p>
                  </>
                ) : profileTab === 3 ? (
                  <>
                    <Bookmark size={32} strokeWidth={1.2} className="profile-empty-icon" />
                    <p className="profile-empty-title">{t('还没有收藏', 'Nothing saved yet')}</p>
                    <p className="profile-empty-sub">{t('点击帖子右下角的收藏图标，就能在这里看到了', 'Tap the save icon on a post to find it here')}</p>
                  </>
                ) : (
                  <>
                    <FileText size={32} strokeWidth={1.2} className="profile-empty-icon" />
                    <p className="profile-empty-title">{t('还没有帖子', 'No posts yet')}</p>
                    <p className="profile-empty-sub">{t('发布第一篇帖子，开始记录你的知识', 'Publish your first post and start capturing your knowledge')}</p>
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

      {showSubscribers && channel && (
        <SubscriberListModal
          channel={channel}
          onClose={() => setShowSubscribers(false)}
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

      {showEditProfile && (
        <EditProfileModal
          userProfile={userProfile}
          onSave={(profile) => { updateUserProfile(profile); setShowEditProfile(false); }}
          onClose={() => setShowEditProfile(false)}
          t={t}
        />
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Edit Profile Modal
// ═══════════════════════════════════════════════════════════════

function EditProfileModal({
  userProfile,
  onSave,
  onClose,
  t,
}: {
  userProfile: { nickname: string; avatarSeed: string; avatarUrl?: string };
  onSave: (profile: { nickname: string; avatarSeed: string; avatarUrl?: string }) => void;
  onClose: () => void;
  t: (zh: string, en: string) => string;
}) {
  const [nickname, setNickname] = useState(userProfile.nickname);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(userProfile.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trimmed = nickname.trim();
  const maskedWallet = `${MOCK_WALLET_ADDRESS.slice(0, 6)}...${MOCK_WALLET_ADDRESS.slice(-6)}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="edit-profile-sheet" role="dialog" aria-label={t('编辑资料', 'Edit Profile')} onClick={e => e.stopPropagation()}>
        <div className="edit-profile-header">
          <button type="button" className="edit-profile-close" onClick={onClose} aria-label={t('关闭', 'Close')}>
            <X size={18} strokeWidth={2} />
          </button>
          <span className="edit-profile-title">{t('编辑资料', 'Edit Profile')}</span>
          <button
            type="button"
            className="edit-profile-save"
            onClick={() => onSave({ nickname: trimmed, avatarSeed: userProfile.avatarSeed, avatarUrl })}
          >
            {t('保存', 'Save')}
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
              aria-label={t('更换头像', 'Change avatar')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="edit-profile-avatar-img" />
                : <BoringAvatar size="100%" name={userProfile.avatarSeed} variant="beam" colors={AVATAR_COLORS} />
              }
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
            <span className="edit-profile-wallet-label">{t('钱包地址', 'Wallet')}</span>
            <span className="edit-profile-wallet-addr">{maskedWallet}</span>
          </div>

          {/* 昵称输入 */}
          <div className="edit-profile-field">
            <label className="edit-profile-label" htmlFor="ep-nickname">
              {t('昵称', 'Nickname')}
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
        </div>
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
              ? (isOwn ? t('我的关注', 'Following') : t(`${authorName} 的关注`, `${authorName} follows`))
              : (isOwn ? t('我的粉丝', 'Followers') : t(`${authorName} 的粉丝`, `${authorName}’s followers`))}
          </span>
          <button type="button" className="follow-list-close" onClick={onClose} aria-label={t('关闭', 'Close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="follow-list-content">
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ku-color-text-secondary)' }}>
              {t('暂无数据', 'No data yet')}
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
                        {t('已关注', 'Following')}
                      </>
                    ) : (
                      <>
                        <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                        {t('关注', 'Follow')}
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

function SubscriberListModal({
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
            {t(`订阅用户 · ${displayCount}`, `Subscribers · ${displayCount}`)}
          </span>
          <button type="button" className="follow-list-close" onClick={onClose} aria-label={t('关闭', 'Close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="follow-list-content">
          {groups.length === 0 ? (
            <div className="follow-list-empty">
              {t('还没有订阅用户', 'No subscribers yet')}
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
                        {t(`${tier.price} PB/月 · ${group.users.length} 人`, `${tier.price} PB/mo · ${group.users.length}`)}
                      </span>
                    ) : (
                      <span className="subscriber-tier-group-meta">
                        {t(`${group.users.length} 人`, `${group.users.length}`)}
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
                            {t(`订阅于 ${user.subscribedAt}`, `Joined ${user.subscribedAt}`)}
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
                                {t('已关注', 'Following')}
                              </>
                            ) : (
                              <>
                                <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                                {t('关注', 'Follow')}
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

function DraftItem({ draft, onEdit, onDelete }: { draft: Draft; onEdit: () => void; onDelete: () => void }) {
  const { t } = useApp();

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return t('刚刚', 'Just now');
    if (min < 60) return `${min}${t('分钟前', 'm ago')}`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}${t('小时前', 'h ago')}`;
    const days = Math.floor(hours / 24);
    return `${days}${t('天前', 'd ago')}`;
  };

  const hasThumbnail = !!draft.thumbnailUrl;

  return (
    <div className="draft-item" onClick={onEdit}>
      {hasThumbnail && (
        <div className="draft-item-thumb">
          <img src={draft.thumbnailUrl} alt="" className="draft-item-thumb-img" />
        </div>
      )}
      <div className="draft-item-body">
        <div className="draft-item-title">{draft.title || draft.articleTitle || t('（无标题）', '(No title)')}</div>
        <div className="draft-item-meta">
          <span className="draft-item-time">{formatTime(draft.savedAt)}</span>
        </div>
      </div>
      <button
        type="button"
        className="draft-item-delete"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        aria-label={t('删除草稿', 'Delete draft')}
      >
        <Trash2 size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Bottom Nav
// ═══════════════════════════════════════════════════════════════
