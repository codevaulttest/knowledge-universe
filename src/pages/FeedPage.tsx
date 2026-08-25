import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, RefreshCw, Search, Wallet } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_USERS_MOCK, BATCH_SIZE } from '../mockData';
import type { Channel, Post, RepostedBy } from '../types';
import { PostCard } from '../components/PostCard';
import { GenesisBanner } from '../components/GenesisBanner';
import { ChannelCard } from '../components/shared';
import { DevPanel } from '../components/DevPanel';
import { ShopFeed } from './ShopPage';
import { isPostVisible } from '../dateUtils';

type FeedEntry = { post: Post; repostedBy?: RepostedBy };

// feed 第二条 mock 帖子固定演示为「转发」样式
const DEMO_REPOST_INDEX = 1;
const DEMO_REPOSTER: RepostedBy = {
  name: '游牧开发者',
  avatarIdx: ALL_USERS_MOCK.find(u => u.name === '游牧开发者')?.avatarIdx ?? 2,
};

function RecommendFeed({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const { posts, t } = useApp();
  const [shownCount, setShownCount] = useState(BATCH_SIZE);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 下架的原帖 / 定时发布未到时间的帖子不出现在公共 feed 里
  const entries: FeedEntry[] = posts
    .filter(post => !post.deleted && isPostVisible(post))
    .map((post, i) => (i === DEMO_REPOST_INDEX ? { post, repostedBy: DEMO_REPOSTER } : { post }));
  const hasMore = shownCount < entries.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          setLoading(true);
          setTimeout(() => { setShownCount(c => Math.min(c + BATCH_SIZE, entries.length)); setLoading(false); }, 900);
        }
      },
      { root: scrollRef.current, threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, scrollRef, entries.length]);

  if (posts.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('还没有帖子')}</p>
        <p className="empty-sub">{t('发布第一篇帖子，开始记录你的知识2')}</p>
      </div>
    );
  }

  return (
    <section className="feed" data-layer="feed">
      <GenesisBanner />
      {entries.slice(0, shownCount).map((entry, i) => (
        <PostCard
          key={`${entry.post.id}-${entry.repostedBy?.name ?? 'orig'}`}
          post={entry.post}
          index={i % 3}
          repostedBy={entry.repostedBy}
        />
      ))}
      {loading && <div className="feed-loading"><span className="spinner" /></div>}
      {!hasMore && !loading && <div className="feed-end">— {t('已经到底了')} —</div>}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />
    </section>
  );
}

function FollowFeed({ followedAuthors }: { followedAuthors: Set<string> }) {
  const { posts, t } = useApp();
  const followedPosts = posts.filter(p => followedAuthors.has(p.author) && !p.deleted && isPostVisible(p));
  if (followedPosts.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('还没有关注的人')}</p>
        <p className="empty-sub">{t('去发现感兴趣的创作者，点击帖子右上角「+ 关注」即可')}</p>
      </div>
    );
  }
  return (
    <section className="feed">
      {followedPosts.map((post, i) => <PostCard key={post.id} post={post} index={i % 3} hideFollow />)}
    </section>
  );
}

// ── ChannelDiscoverFeed（频道发现：类似 YouTube 频道推荐）──────────
const CHANNEL_DISCOVER_BATCH = 3;

function pickDiscoverBatch(pool: Channel[], batchIndex: number): Channel[] {
  if (pool.length <= CHANNEL_DISCOVER_BATCH) return pool;
  const start = (batchIndex * CHANNEL_DISCOVER_BATCH) % pool.length;
  const batch: Channel[] = [];
  for (let i = 0; i < CHANNEL_DISCOVER_BATCH; i++) {
    batch.push(pool[(start + i) % pool.length]);
  }
  return batch;
}

function ChannelDiscoverFeed() {
  const { channels, subscribedChannelTiers, navigate, t } = useApp();
  const [scope, setScope] = useState<'all' | 'subscribed'>('subscribed');
  const [batchIndex, setBatchIndex] = useState(0);
  const subscribedChannels = useMemo(
    () => channels.filter(c => subscribedChannelTiers[c.id] != null),
    [channels, subscribedChannelTiers],
  );
  const displayedChannels = scope === 'subscribed'
    ? subscribedChannels
    : pickDiscoverBatch(channels, batchIndex);
  const canRefresh = scope === 'all' && channels.length > CHANNEL_DISCOVER_BATCH;

  if (channels.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('暂无频道')}</p>
      </div>
    );
  }
  return (
    <section className="channel-discover-list">
      <nav className="channel-scope-nav" aria-label={t('频道范围')}>
        <button
          type="button"
          className={`channel-scope-tab${scope === 'subscribed' ? ' channel-scope-tab--active' : ''}`}
          onClick={() => setScope('subscribed')}
          aria-selected={scope === 'subscribed'}
        >
          {t('已订阅')}
        </button>
        <button
          type="button"
          className={`channel-scope-tab${scope === 'all' ? ' channel-scope-tab--active' : ''}`}
          onClick={() => setScope('all')}
          aria-selected={scope === 'all'}
        >
          {t('发现')}
        </button>
      </nav>

      {displayedChannels.length > 0 && (
        <div className="channel-discover-section-head">
          <span className="channel-discover-section-label">
            {scope === 'all' ? t('为你推荐') : t('我的订阅')}
          </span>
          {canRefresh && (
            <button
              type="button"
              className="channel-refresh-btn"
              onClick={() => setBatchIndex(i => i + 1)}
              aria-label={t('换一批频道推荐')}
            >
              <RefreshCw size={13} strokeWidth={2.2} />
              {t('换一批')}
            </button>
          )}
        </div>
      )}
      {displayedChannels.length === 0 ? (
        <div className="empty-state">
          <p>{t('还没有订阅任何频道')}</p>
          <p className="empty-sub">{t('去"发现"里看看有没有喜欢的频道')}</p>
        </div>
      ) : displayedChannels.map((channel, i) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          index={i % 3}
          onClick={() => navigate({ page: 'P_CHANNEL', channelId: channel.id })}
          showSubscribe
        />
      ))}
    </section>
  );
}

// 下滑判定阈值（px）：滚动距离超过它才切换导航显隐，避免抖动
const NAV_HIDE_SCROLL_DELTA = 6;
// 距顶部多近内强制显示导航（避免刚滚动一点就误隐藏）
const NAV_HIDE_TOP_GUARD = 24;

export function FeedPage({ tab, setTab }: { tab: 0 | 1 | 2 | 3; setTab: (t: 0 | 1 | 2 | 3) => void }) {
  const { followedAuthors, navigate, unreadActivityCount, openLotTask, lotTaskAlert, t, walletConnected, connectWallet, requireWallet, homeFeedRefreshNonce, showToast, navBarsHidden, setNavBarsHidden, openSearch } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevTabRef = useRef(tab);
  const lastRefreshNonce = useRef(homeFeedRefreshNonce);
  const [slideClass, setSlideClass] = useState('');
  const [feedKey, setFeedKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // 下滑时顶部/底部导航渐隐让出沉浸空间，上滑或回到顶部时恢复
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let lastTop = el.scrollTop;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const top = el.scrollTop;
        const delta = top - lastTop;
        if (top < NAV_HIDE_TOP_GUARD) setNavBarsHidden(false);
        else if (delta > NAV_HIDE_SCROLL_DELTA) setNavBarsHidden(true);
        else if (delta < -NAV_HIDE_SCROLL_DELTA) setNavBarsHidden(false);
        lastTop = top;
        ticking = false;
      });
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [setNavBarsHidden]);

  // 离开首页信息流时复位，避免导航停在隐藏态
  useEffect(() => () => setNavBarsHidden(false), [setNavBarsHidden]);

  useEffect(() => {
    if (homeFeedRefreshNonce === lastRefreshNonce.current) return;
    lastRefreshNonce.current = homeFeedRefreshNonce;
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setFeedKey(k => k + 1);
    setRefreshing(true);
    const timer = setTimeout(() => {
      setRefreshing(false);
      showToast(t('数据已刷新'));
    }, 700);
    return () => clearTimeout(timer);
  }, [homeFeedRefreshNonce, showToast, t]);

  useEffect(() => {
    if (prevTabRef.current === tab) return;
    const dir = tab > prevTabRef.current ? 'feed-slide-left' : 'feed-slide-right';
    prevTabRef.current = tab;
    setSlideClass(dir);
    const t = setTimeout(() => setSlideClass(''), 280);
    return () => clearTimeout(t);
  }, [tab]);

  // 关注 / 频道依赖身份数据，游客点击先引导连接钱包；推荐、商城为公开浏览，无需连接
  const goTab = (next: 0 | 1 | 2 | 3) => {
    if (next === 0 || next === 3) { setTab(next); return; }
    requireWallet(() => setTab(next));
  };

  // 左右拖拽切换标签页；触点落在多图 carousel 内时整段手势交给它自己处理，避免抢手势
  const swipeRef = useRef<{ x0: number; y0: number; axis: 'x' | 'y' | 'ignore' | null }>({ x0: 0, y0: 0, axis: null });
  const SWIPE_THRESHOLD = 60;
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const ignore = !!(e.target as HTMLElement).closest('.media-carousel');
    swipeRef.current = { x0: t.clientX, y0: t.clientY, axis: ignore ? 'ignore' : null };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (s.axis === 'ignore' || s.axis) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x0;
    const dy = t.clientY - s.y0;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      s.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (s.axis !== 'x') return;
    const dx = e.changedTouches[0].clientX - s.x0;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0 && tab < 3) goTab((tab + 1) as 0 | 1 | 2 | 3);
    else if (dx > 0 && tab > 0) goTab((tab - 1) as 0 | 1 | 2 | 3);
  };

  return (
    <>
      <div className={`feed-header-shell${navBarsHidden ? ' feed-header-shell--hidden' : ''}`}>
      <div className="feed-header" data-layer="feed-header">
        <div className="feed-header-left">
          <button
            type="button"
            className="feed-bell-btn feed-lot-bonus-btn"
            onClick={openLotTask}
            aria-label={t('一发十赞')}
          >
            <img src="/img/lot-bonus-reward-icon-white-safe.png" alt="" aria-hidden="true" />
            {lotTaskAlert && <span className="feed-bell-dot feed-bell-dot--plain" aria-hidden="true" />}
          </button>
        </div>
        <nav className="tabs" data-layer="top-tabs">
          <button className={tab === 0 ? 'active' : ''} type="button" onClick={() => goTab(0)}>{t('推荐')}</button>
          <button className={tab === 1 ? 'active' : ''} type="button" onClick={() => goTab(1)}>{t('关注2')}</button>
          <button className={tab === 2 ? 'active' : ''} type="button" onClick={() => goTab(2)}>{t('频道')}</button>
          <button className={tab === 3 ? 'active' : ''} type="button" onClick={() => goTab(3)}>{t('商城')}</button>
        </nav>
        <div className="feed-header-right">
          <button
            type="button"
            className="feed-bell-btn"
            onClick={openSearch}
            aria-label={t('搜索')}
          >
            <Search size={22} strokeWidth={2} />
          </button>
          {!walletConnected && (
            <button
              type="button"
              className="wallet-connect-pill"
              onClick={connectWallet}
            >
              <Wallet size={13} strokeWidth={2.2} />
              {t('连接钱包')}
            </button>
          )}
          {walletConnected && (
            <button
              type="button"
              className="feed-bell-btn"
              onClick={() => navigate({ page: 'P7' })}
              aria-label={t('通知')}
            >
              <Bell size={22} strokeWidth={2} />
              {unreadActivityCount > 0 && (
                <span className="feed-bell-dot">{unreadActivityCount > 99 ? '99+' : unreadActivityCount}</span>
              )}
            </button>
          )}
        </div>
      </div>
      </div>
      <div
        className={`scroll-area${slideClass ? ` ${slideClass}` : ''}`}
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {refreshing && (
          <div className="feed-loading" aria-live="polite">
            <span className="spinner" />
            <span className="feed-loading-label">{t('加载中')}</span>
          </div>
        )}
        {tab === 0 && <RecommendFeed key={feedKey} scrollRef={scrollRef} />}
        {tab === 1 && <FollowFeed key={feedKey} followedAuthors={followedAuthors} />}
        {tab === 2 && <ChannelDiscoverFeed key={feedKey} />}
        {tab === 3 && <ShopFeed key={feedKey} />}
      </div>
      <DevPanel />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// P1 — 发帖页
// ═══════════════════════════════════════════════════════════════
