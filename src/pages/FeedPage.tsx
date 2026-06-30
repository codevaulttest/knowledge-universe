import React, { useEffect, useRef, useState } from 'react';
import { Bell, CalendarCheck } from 'lucide-react';
import { useApp } from '../AppContext';
import { BATCH_SIZE } from '../mockData';
import { PostCard } from '../components/PostCard';
import { GenesisBanner } from '../components/GenesisBanner';

function RecommendFeed({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const { posts, t } = useApp();
  const [shownCount, setShownCount] = useState(BATCH_SIZE);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = shownCount < posts.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          setLoading(true);
          setTimeout(() => { setShownCount(c => Math.min(c + BATCH_SIZE, posts.length)); setLoading(false); }, 900);
        }
      },
      { root: scrollRef.current, threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, scrollRef, posts.length]);

  if (posts.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('还没有帖子', 'No posts yet')}</p>
        <p className="empty-sub">{t('发布第一篇帖子，开始记录你的知识', 'Publish your first post to start capturing knowledge')}</p>
      </div>
    );
  }

  return (
    <section className="feed" data-layer="feed">
      <GenesisBanner />
      {posts.slice(0, shownCount).map((post, i) => (
        <PostCard key={post.id} post={post} index={i % 3} />
      ))}
      {loading && <div className="feed-loading"><span className="spinner" /></div>}
      {!hasMore && !loading && <div className="feed-end">— {t('已经到底了', "You're all caught up")} —</div>}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />
    </section>
  );
}

function FollowFeed({ followedAuthors }: { followedAuthors: Set<string> }) {
  const { posts, t } = useApp();
  const followedPosts = posts.filter(p => followedAuthors.has(p.author));
  if (followedPosts.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('还没有关注的人', "You're not following anyone yet")}</p>
        <p className="empty-sub">{t('去发现感兴趣的创作者，点击帖子右上角「+ 关注」即可', 'Discover creators you like and tap "+ Follow" on a post')}</p>
      </div>
    );
  }
  return (
    <section className="feed">
      {followedPosts.map((post, i) => <PostCard key={post.id} post={post} index={i % 3} hideFollow />)}
    </section>
  );
}

export function FeedPage({ tab, setTab }: { tab: 0 | 1; setTab: (t: 0 | 1) => void }) {
  const { followedAuthors, navigate, unreadActivityCount, openCheckIn, checkInClaimable, t } = useApp();
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

  return (
    <>
      <div className="feed-header" data-layer="feed-header">
        <div className="feed-header-left" />
        <nav className="tabs" data-layer="top-tabs">
          <button className={tab === 0 ? 'active' : ''} type="button" onClick={() => setTab(0)}>{t('推荐', 'For You')}</button>
          <button className={tab === 1 ? 'active' : ''} type="button" onClick={() => setTab(1)}>{t('关注', 'Following')}</button>
        </nav>
        <div className="feed-header-right">
          <button
            type="button"
            className="feed-bell-btn"
            onClick={openCheckIn}
            aria-label={t('每日签到', 'Daily check-in')}
          >
            <CalendarCheck size={22} strokeWidth={2} />
            {checkInClaimable && <span className="feed-bell-dot feed-bell-dot--plain" aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="feed-bell-btn"
            onClick={() => navigate({ page: 'P7' })}
            aria-label={t('通知', 'Notifications')}
          >
            <Bell size={22} strokeWidth={2} />
            {unreadActivityCount > 0 && (
              <span className="feed-bell-dot">{unreadActivityCount > 9 ? '9+' : unreadActivityCount}</span>
            )}
          </button>
        </div>
      </div>
      <div className={`scroll-area${slideClass ? ` ${slideClass}` : ''}`} ref={scrollRef}>
        {tab === 0 && <RecommendFeed scrollRef={scrollRef} />}
        {tab === 1 && <FollowFeed followedAuthors={followedAuthors} />}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// P1 — 发帖页
// ═══════════════════════════════════════════════════════════════
