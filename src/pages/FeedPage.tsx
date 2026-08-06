import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarCheck, RefreshCw, Wallet } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_USERS_MOCK, BATCH_SIZE } from '../mockData';
import type { Channel, Post, RepostedBy } from '../types';
import { PostCard } from '../components/PostCard';
import { GenesisBanner } from '../components/GenesisBanner';
import { ChannelCard } from '../components/shared';
import { DevPanel } from '../components/DevPanel';

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

  // 下架的原帖不出现在公共 feed 里
  const entries: FeedEntry[] = posts
    .filter(post => !post.deleted)
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
  const followedPosts = posts.filter(p => followedAuthors.has(p.author) && !p.deleted);
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
  const [scope, setScope] = useState<'all' | 'subscribed'>('all');
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
          className={`channel-scope-tab${scope === 'all' ? ' channel-scope-tab--active' : ''}`}
          onClick={() => setScope('all')}
          aria-selected={scope === 'all'}
        >
          {t('发现')}
        </button>
        <button
          type="button"
          className={`channel-scope-tab${scope === 'subscribed' ? ' channel-scope-tab--active' : ''}`}
          onClick={() => setScope('subscribed')}
          aria-selected={scope === 'subscribed'}
        >
          {t('已订阅')}
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
        />
      ))}
    </section>
  );
}

export function FeedPage({ tab, setTab }: { tab: 0 | 1 | 2; setTab: (t: 0 | 1 | 2) => void }) {
  const { followedAuthors, navigate, unreadActivityCount, openCheckIn, checkInClaimable, t, walletConnected, connectWallet, requireWallet } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevTabRef = useRef(tab);
  const [slideClass, setSlideClass] = useState('');

  useEffect(() => {
    if (prevTabRef.current === tab) return;
    const dir = tab > prevTabRef.current ? 'feed-slide-left' : 'feed-slide-right';
    prevTabRef.current = tab;
    setSlideClass(dir);
    const t = setTimeout(() => setSlideClass(''), 280);
    return () => clearTimeout(t);
  }, [tab]);

  // 关注 / 频道依赖身份数据，游客点击先引导连接钱包；连接成功后继续切到目标 tab
  const goTab = (next: 0 | 1 | 2) => {
    if (next === 0) { setTab(0); return; }
    requireWallet(() => setTab(next));
  };

  return (
    <>
      <div className="feed-header" data-layer="feed-header">
        <div className="feed-header-left">
          <button
            type="button"
            className="feed-bell-btn feed-checkin-btn"
            onClick={openCheckIn}
            aria-label={t('每日签到')}
          >
            <CalendarCheck size={22} strokeWidth={2} />
            <span className="feed-checkin-label">{t('签到')}</span>
            {checkInClaimable && <span className="feed-bell-dot feed-bell-dot--plain" aria-hidden="true" />}
          </button>
        </div>
        <nav className="tabs" data-layer="top-tabs">
          <button className={tab === 0 ? 'active' : ''} type="button" onClick={() => goTab(0)}>{t('推荐')}</button>
          <button className={tab === 1 ? 'active' : ''} type="button" onClick={() => goTab(1)}>{t('关注2')}</button>
          <button className={tab === 2 ? 'active' : ''} type="button" onClick={() => goTab(2)}>{t('频道')}</button>
        </nav>
        <div className="feed-header-right">
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
      <div className={`scroll-area${slideClass ? ` ${slideClass}` : ''}`} ref={scrollRef}>
        {tab === 0 && <RecommendFeed scrollRef={scrollRef} />}
        {tab === 1 && <FollowFeed followedAuthors={followedAuthors} />}
        {tab === 2 && <ChannelDiscoverFeed />}
      </div>
      <DevPanel />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// P1 — 发帖页
// ═══════════════════════════════════════════════════════════════
