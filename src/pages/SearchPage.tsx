import { useEffect, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_USERS_MOCK, CURRENT_USER } from '../mockData';
import { PostCard } from '../components/PostCard';
import { Avatar, AuthorName, ChannelCard } from '../components/shared';

export function SearchPage({ onClose }: { onClose: () => void }) {
  const {
    navigate,
    posts,
    channels,
    followedAuthors,
    toggleFollow,
    recentSearches,
    saveRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    t,
  } = useApp();
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tab, setTab] = useState<'all' | 'posts' | 'users' | 'channels'>('all');
  const [shopOnly, setShopOnly] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDebouncedQ('');
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timerId = window.setTimeout(() => {
      setDebouncedQ(trimmed.toLowerCase());
      setIsSearching(false);
      saveRecentSearch(trimmed);
    }, 300);
    return () => window.clearTimeout(timerId);
  }, [query, saveRecentSearch]);

  useEffect(() => {
    setTab('all');
  }, [query]);

  const matchedPosts = useMemo(() => {
    if (!debouncedQ && !shopOnly) return [];
    return posts.filter(post =>
      (shopOnly ? !!post.shop : true) &&
      (!debouncedQ || post.title.toLowerCase().includes(debouncedQ) || post.author.toLowerCase().includes(debouncedQ)),
    );
  }, [debouncedQ, posts, shopOnly]);

  const matchedUsers = useMemo(() => {
    if (!debouncedQ) return [];
    return ALL_USERS_MOCK.filter(user =>
      user.name.toLowerCase().includes(debouncedQ) ||
      user.desc.toLowerCase().includes(debouncedQ),
    );
  }, [debouncedQ]);

  const matchedChannels = useMemo(() => {
    if (!debouncedQ) return [];
    return channels.filter(channel =>
      channel.name.toLowerCase().includes(debouncedQ) ||
      channel.ownerName.toLowerCase().includes(debouncedQ) ||
      channel.description.toLowerCase().includes(debouncedQ),
    );
  }, [channels, debouncedQ]);

  const visiblePosts = tab === 'users' || tab === 'channels' ? [] : matchedPosts;
  const visibleUsers = tab === 'posts' || tab === 'channels' ? [] : matchedUsers;
  const visibleChannels = tab === 'posts' || tab === 'users' ? [] : matchedChannels;
  const hasQuery = query.trim().length > 0 || shopOnly;
  const hasResults = visiblePosts.length > 0 || visibleUsers.length > 0 || visibleChannels.length > 0;

  const applyQuery = (nextQuery: string) => setQuery(nextQuery);
  const goToProfile = (authorName: string) => {
    navigate({ page: 'P6', authorName });
  };

  return (
    <div className="search-page" role="main" aria-label={t('搜索')}>
      <div className="search-page-shell">
        <div className="search-header">
          <div className="search-input-wrap">
            <Search size={16} strokeWidth={2} className="search-input-icon" />
            <input
              className="search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('搜索帖子、创作者、话题')}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQuery('')}
                aria-label={t('清空搜索词')}
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            )}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="search-page-scroll">
        {!hasQuery ? (
          <div className="search-content">
            {recentSearches.length > 0 && (
              <section className="search-section">
                <div className="search-section-head">
                  <div className="search-section-label">{t('最近搜索')}</div>
                  <button type="button" className="search-clear-all" onClick={clearRecentSearches}>
                    {t('清空全部')}
                  </button>
                </div>
                <div className="search-recent-list">
                  {recentSearches.map(item => (
                    <div key={item} className="search-recent-row">
                      <button type="button" className="search-chip-label" onClick={() => applyQuery(item)}>
                        {item}
                      </button>
                      <button
                        type="button"
                        className="search-chip-remove"
                        onClick={() => removeRecentSearch(item)}
                        aria-label={t('删除最近搜索 {item}', { item })}
                      >
                        <X size={12} strokeWidth={2.2} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        ) : isSearching ? (
          <div className="search-content">
            <div className="profile-empty-state" role="status" aria-live="polite">
              <span className="spinner" />
              <p className="profile-empty-title">{t('搜索中...')}</p>
            </div>
          </div>
        ) : (
          <>
            <nav className="activity-filter-tabs" aria-label={t('搜索筛选')}>
              <button
                type="button"
                className={`activity-filter-tab${tab === 'all' && !shopOnly ? ' activity-filter-tab--active' : ''}`}
                onClick={() => {
                  setTab('all');
                  setShopOnly(false);
                }}
              >
                {t('全部')}
              </button>
              <button
                type="button"
                className={`activity-filter-tab${tab === 'posts' && !shopOnly ? ' activity-filter-tab--active' : ''}`}
                onClick={() => {
                  setTab('posts');
                  setShopOnly(false);
                }}
              >
                {t('帖子')}
              </button>
              <button
                type="button"
                className={`activity-filter-tab${tab === 'users' && !shopOnly ? ' activity-filter-tab--active' : ''}`}
                onClick={() => {
                  setTab('users');
                  setShopOnly(false);
                }}
              >
                {t('用户')}
              </button>
              <button
                type="button"
                className={`activity-filter-tab${tab === 'channels' && !shopOnly ? ' activity-filter-tab--active' : ''}`}
                onClick={() => {
                  setTab('channels');
                  setShopOnly(false);
                }}
              >
                {t('频道')}
              </button>
              <button
                type="button"
                className={`activity-filter-tab activity-filter-tab--shop${shopOnly ? ' activity-filter-tab--active' : ''}`}
                onClick={() => setShopOnly(v => !v)}
                aria-pressed={shopOnly}
              >
                {t('小黄车')}
              </button>
            </nav>

            <div className="search-content">
              {!hasResults ? (
                <div className="profile-empty-state">
                  <Search size={32} strokeWidth={1.3} className="profile-empty-icon" />
                  <p className="profile-empty-title">{t('没有找到相关内容')}</p>
                  <p className="profile-empty-sub">{t('换个关键词试试，或试试热门话题')}</p>
                </div>
              ) : (
                <>
                  {visiblePosts.length > 0 && (
                    <section className="search-results-group">
                      {tab === 'all' && <div className="search-section-label">{t('帖子')}</div>}
                      <div className="feed">
                        {visiblePosts.map((post, index) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            index={index % 3}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {visibleUsers.length > 0 && (
                    <section className="search-results-group">
                      {tab === 'all' && <div className="search-section-label">{t('用户')}</div>}
                      <div className="search-user-list">
                        {visibleUsers.map(user => {
                          const isFollowing = followedAuthors.has(user.name);
                          const isSelf = user.name === CURRENT_USER;
                          return (
                            <div
                              key={user.name}
                              className="follow-list-item"
                              onClick={() => goToProfile(user.name)}
                            >
                              <Avatar index={user.avatarIdx} seed={user.name} />
                              <div className="follow-item-info">
                                <AuthorName name={user.name} className="follow-item-name" />
                                <div className="follow-item-desc">{user.desc}</div>
                              </div>
                              {!isSelf && (
                                <button
                                  type="button"
                                  className={`follow-btn follow-btn--sm${isFollowing ? ' follow-btn--following' : ''}`}
                                  onClick={event => {
                                    event.stopPropagation();
                                    toggleFollow(user.name);
                                  }}
                                >
                                  {isFollowing ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} strokeWidth={2.5} />{t('已关注')}</span> : t('关注')}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {visibleChannels.length > 0 && (
                    <section className="search-results-group">
                      {tab === 'all' && <div className="search-section-label">{t('频道')}</div>}
                      <div className="channel-discover-list">
                        {visibleChannels.map((channel, index) => (
                          <ChannelCard
                            key={channel.id}
                            channel={channel}
                            index={index}
                            onClick={() => navigate({ page: 'P_CHANNEL', channelId: channel.id })}
                            showSubscribe
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
