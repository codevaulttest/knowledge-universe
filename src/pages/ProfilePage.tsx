import React, { useRef, useState } from 'react';
import { ArrowLeft, Bell, Bookmark, Camera, Check, Edit3, Eye, FileText, Gift, Languages, LayoutGrid, Lock, MessageCircle, Repeat2, Trash2, X } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { useApp } from '../AppContext';
import { ALL_POSTS, ALL_USERS_MOCK, AUTHOR_REPOSTS, CURRENT_USER, DEFAULT_WALLET_DISPLAY, MOCK_WALLET_ADDRESS } from '../mockData';
import type { Draft, RepostedBy } from '../types';
import { PostCard } from '../components/PostCard';
import { ConfirmDeleteDraftModal, TipModal } from '../components/Overlays';
import { Avatar, AuthorName, PageHeader } from '../components/shared';

const AVATAR_COLORS = ['#00cdb8', '#0e3060', '#f4e4c4', '#1a2a4e', '#d6fff6'];

export function ProfilePage({ authorName }: { authorName: string }) {
  const { goBack, canGoBack, navigate, drafts, openComposeWithDraft, deleteDraft, followedAuthors, toggleFollow, language, setLanguage, posts: allPosts, savedPostIds, repostedPostIds, unreadActivityCount, t, userProfile, updateUserProfile } = useApp();
  const isOwn = authorName === CURRENT_USER;
  const isFollowing = followedAuthors.has(authorName);
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
  const [confirmDeleteDraftId, setConfirmDeleteDraftId] = useState<string | null>(null);
  const [tipTarget, setTipTarget] = useState<{ context: 'post' | 'author'; postTitle?: string } | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const filteredOtherPosts = (() => {
    if (contentFilter === 'free') return myPosts.filter(p => p.stakeTier === 0);
    if (contentFilter === 'sub') return myPosts.filter(p => p.stakeTier > 0);
    return myPosts;
  })();

  const displayedEntries: { post: (typeof allPosts)[number]; repostedBy?: RepostedBy }[] =
    isOwn && profileTab === 2 ? ownRepostEntries
    : isOwn && profileTab === 3 ? savedPosts.map(post => ({ post }))
    : isOwn ? [...myPosts.map(post => ({ post })), ...ownRepostEntries]
    : contentFilter === 'all' ? [...filteredOtherPosts.map(post => ({ post })), ...theirRepostEntries]
    : filteredOtherPosts.map(post => ({ post }));
  const displayedPosts = displayedEntries.map(e => e.post);

  return (
    <div className="page">
      {!isOwn && <PageHeader title={authorName} onBack={canGoBack ? goBack : undefined} />}
      <div className="scroll-area">
        <div className="profile-header">
          {isOwn && canGoBack ? (
            <button type="button" className="profile-back-btn" onClick={goBack} aria-label={t('返回', 'Back')}>
              <ArrowLeft size={20} strokeWidth={1.8} />
            </button>
          ) : null}
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
                <span className="author-name-row profile-name"><span className="author-name-text">{userProfile.nickname || DEFAULT_WALLET_DISPLAY}</span></span>
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
              <AuthorName name={authorName} className="profile-name" />
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
              <Gift size={14} strokeWidth={2} />
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

        {isOwn && (
          <div className="profile-mini-stats profile-mini-stats--bordered">
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

        {/* 自己主页显示帖子/收藏 tab；他人主页只显示标签 */}
        {isOwn ? (
          <nav className="profile-content-tabs" aria-label={t('内容分类', 'Content categories')}>
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
        ) : (
          <nav className="profile-content-tabs" aria-label={t('内容筛选', 'Content filter')}>
            {(['all', 'free', 'sub'] as const).map(f => (
              <button
                key={f}
                type="button"
                className={`profile-content-tab${contentFilter === f ? ' profile-content-tab--active' : ''}`}
                onClick={() => setContentFilter(f)}
              >
                {f === 'all' ? <LayoutGrid size={14} strokeWidth={2} /> : f === 'free' ? <Eye size={14} strokeWidth={2} /> : <Lock size={14} strokeWidth={2} />}
                {f === 'all' ? t('全部', 'All') : f === 'free' ? t('免费', 'Free') : t('订阅', 'Paid')}
                <span className="profile-content-tab-badge" style={{ background: contentFilter === f ? 'var(--ku-color-primary)' : 'var(--ku-color-text-secondary)' }}>
                  {f === 'all' ? myPosts.length : f === 'free' ? myPosts.filter(p => p.stakeTier === 0).length : myPosts.filter(p => p.stakeTier > 0).length}
                </span>
              </button>
            ))}
          </nav>
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
                      {isUserFollowing ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} strokeWidth={2.5} />{t('已关注', 'Following')}</span> : t('关注', 'Follow')}
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
