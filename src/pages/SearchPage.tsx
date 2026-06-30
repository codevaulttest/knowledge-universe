import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Search, TrendingUp, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_USERS_MOCK, CURRENT_USER } from '../mockData';
import { PostCard } from '../components/PostCard';
import { Avatar, AuthorName } from '../components/shared';

const TRENDING = ['AI Agent', 'RAG 技术', '独立开发', 'Figma 组件', 'Prompt 工程', 'Web3', '知识星球', '数据方法论'];

export function SearchPage() {
  const {
    goBack,
    navigate,
    posts,
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
  const [tab, setTab] = useState<'all' | 'posts' | 'users'>('all');

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
    }, 300);
    return () => window.clearTimeout(timerId);
  }, [query]);

  useEffect(() => {
    setTab('all');
  }, [query]);

  const matchedPosts = useMemo(() => {
    if (!debouncedQ) return [];
    return posts.filter(post =>
      post.title.toLowerCase().includes(debouncedQ) ||
      post.author.toLowerCase().includes(debouncedQ),
    );
  }, [debouncedQ, posts]);

  const matchedUsers = useMemo(() => {
    if (!debouncedQ) return [];
    return ALL_USERS_MOCK.filter(user =>
      user.name.toLowerCase().includes(debouncedQ) ||
      user.desc.toLowerCase().includes(debouncedQ),
    );
  }, [debouncedQ]);

  const visiblePosts = tab === 'users' ? [] : matchedPosts;
  const visibleUsers = tab === 'posts' ? [] : matchedUsers;
  const hasQuery = query.trim().length > 0;
  const hasResults = visiblePosts.length > 0 || visibleUsers.length > 0;

  const applyQuery = (nextQuery: string) => setQuery(nextQuery);
  const commitQuery = () => saveRecentSearch(query);

  return (
    <div className="page search-page">
      <div className="search-header">
        <button type="button" className="back-btn" onClick={goBack} aria-label={t('返回', 'Back')}>
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <div className="search-input-wrap">
          <Search size={16} strokeWidth={2} className="search-input-icon" />
          <input
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('搜索帖子、创作者、话题', 'Search posts, creators, topics')}
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setQuery('')}
              aria-label={t('清空搜索词', 'Clear search')}
            >
              <X size={14} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      <div className="scroll-area">
        {!hasQuery ? (
          <div className="search-content">
            {recentSearches.length > 0 && (
              <section className="search-section">
                <div className="search-section-head">
                  <div className="search-section-label">{t('最近搜索', 'Recent searches')}</div>
                  <button type="button" className="search-clear-all" onClick={clearRecentSearches}>
                    {t('清空全部', 'Clear all')}
                  </button>
                </div>
                <div className="search-chips">
                  {recentSearches.map(item => (
                    <div key={item} className="search-chip search-chip--recent">
                      <button type="button" className="search-chip-label" onClick={() => applyQuery(item)}>
                        {item}
                      </button>
                      <button
                        type="button"
                        className="search-chip-remove"
                        onClick={() => removeRecentSearch(item)}
                        aria-label={t(`删除最近搜索 ${item}`, `Remove recent search ${item}`)}
                      >
                        <X size={12} strokeWidth={2.2} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="search-section">
              <div className="search-section-head">
                <div className="search-section-label">{t('热门话题', 'Trending')}</div>
              </div>
              <div className="search-chips">
                {TRENDING.map(item => (
                  <button key={item} type="button" className="search-chip" onClick={() => applyQuery(item)}>
                    <TrendingUp size={14} strokeWidth={2} />
                    {item}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : isSearching ? (
          <div className="search-content">
            <div className="profile-empty-state" role="status" aria-live="polite">
              <span className="spinner" />
              <p className="profile-empty-title">{t('搜索中...', 'Searching...')}</p>
            </div>
          </div>
        ) : (
          <>
            <nav className="activity-filter-tabs" aria-label={t('搜索筛选', 'Search filters')}>
              <button
                type="button"
                className={`activity-filter-tab${tab === 'all' ? ' activity-filter-tab--active' : ''}`}
                onClick={() => setTab('all')}
              >
                {t('全部', 'All')}
              </button>
              <button
                type="button"
                className={`activity-filter-tab${tab === 'posts' ? ' activity-filter-tab--active' : ''}`}
                onClick={() => setTab('posts')}
              >
                {t('帖子', 'Posts')}
              </button>
              <button
                type="button"
                className={`activity-filter-tab${tab === 'users' ? ' activity-filter-tab--active' : ''}`}
                onClick={() => setTab('users')}
              >
                {t('用户', 'Users')}
              </button>
            </nav>

            <div className="search-content">
              {!hasResults ? (
                <div className="profile-empty-state">
                  <Search size={32} strokeWidth={1.3} className="profile-empty-icon" />
                  <p className="profile-empty-title">{t('没有找到相关内容', 'No matching results')}</p>
                  <p className="profile-empty-sub">{t('换个关键词试试，或试试热门话题', 'Try another keyword or explore a trending topic')}</p>
                </div>
              ) : (
                <>
                  {visiblePosts.length > 0 && (
                    <section className="search-results-group">
                      {tab === 'all' && <div className="search-section-label">{t('帖子', 'Posts')}</div>}
                      <div className="feed">
                        {visiblePosts.map((post, index) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            index={index % 3}
                            onOpen={commitQuery}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {visibleUsers.length > 0 && (
                    <section className="search-results-group">
                      {tab === 'all' && <div className="search-section-label">{t('用户', 'Users')}</div>}
                      <div className="search-user-list">
                        {visibleUsers.map(user => {
                          const isFollowing = followedAuthors.has(user.name);
                          const isSelf = user.name === CURRENT_USER;
                          return (
                            <div
                              key={user.name}
                              className="follow-list-item"
                              onClick={() => {
                                commitQuery();
                                navigate({ page: 'P6', authorName: user.name });
                              }}
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
                                  {isFollowing ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} strokeWidth={2.5} />{t('已关注', 'Following')}</span> : t('关注', 'Follow')}
                                </button>
                              )}
                            </div>
                          );
                        })}
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
  );
}
