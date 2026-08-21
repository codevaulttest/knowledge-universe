import { useEffect, useState } from 'react';
import { Bookmark, HandCoins, Link, MessageCircle, Package, Radio, Repeat2, ThumbsUp } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_POSTS } from '../mockData';
import { Avatar, PageHeader } from '../components/shared';
import { isChinese } from '../i18n';
import type { ActivityGroup, ActivityType } from '../types';

type FilterTab = 'all' | ActivityType;

const ACTION_LABEL: Record<ActivityType, { zh: string; en: string }> = {
  like:    { zh: '点赞', en: 'liked' },
  share:   { zh: '转发', en: 'reposted' },
  save:    { zh: '收藏', en: 'bookmarked' },
  comment: { zh: '评论', en: 'commented on' },
  link:    { zh: '链接', en: 'linked' },
  tip:     { zh: '助力', en: 'sponsored' },
  subscribe: { zh: '订阅', en: 'subscribed to' },
  new_product: { zh: '新品', en: 'new product' },
};

const ACTION_ICON: Record<ActivityType, React.ReactNode> = {
  like:    <ThumbsUp size={13} strokeWidth={2.2} />,
  share:   <Repeat2 size={13} strokeWidth={2.2} />,
  save:    <Bookmark size={13} strokeWidth={2.2} />,
  comment: <MessageCircle size={13} strokeWidth={2.2} />,
  link:    <Link size={13} strokeWidth={2.2} />,
  tip:     <HandCoins size={13} strokeWidth={2.2} />,
  subscribe: <Radio size={13} strokeWidth={2.2} />,
  new_product: <Package size={13} strokeWidth={2.2} />,
};

function groupText(group: ActivityGroup, zh: boolean): string {
  const actors = group.actors;
  if (group.type === 'subscribe') {
    const channel = group.channelName ?? (zh ? '你的频道' : 'your channel');
    const tier = group.tierName ? (zh ? ` · ${group.tierName}` : ` · ${group.tierName}`) : '';
    if (actors.length === 1) {
      return zh
        ? `${actors[0].user} 订阅了你的频道「${channel}」${tier}`
        : `${actors[0].user} subscribed to your channel "${channel}"${tier}`;
    }
    if (actors.length === 2) {
      return zh
        ? `${actors[0].user}、${actors[1].user} 订阅了你的频道「${channel}」${tier}`
        : `${actors[0].user} and ${actors[1].user} subscribed to your channel "${channel}"${tier}`;
    }
    return zh
      ? `${actors[0].user}、${actors[1].user} 等 ${actors.length} 人订阅了你的频道「${channel}」${tier}`
      : `${actors[0].user}, ${actors[1].user} and ${actors.length - 2} others subscribed to your channel "${channel}"${tier}`;
  }
  if (group.type === 'new_product') {
    return zh
      ? `${actors[0].user} 发布了新品，你是 TA 上一件商品的合伙人，需重新加入才能享有本品分成`
      : `${actors[0].user} released a new item — you were a partner on their last one, but this one needs a fresh join to earn a share`;
  }
  const label = zh ? ACTION_LABEL[group.type].zh : ACTION_LABEL[group.type].en;
  if (group.type === 'comment') {
    return zh ? `${actors[0].user} 评论了你的帖子` : `${actors[0].user} commented on your post`;
  }
  if (group.type === 'tip') {
    const amount = group.tipAmount != null ? `（${group.tipAmount} PB）` : '';
    const amountEn = group.tipAmount != null ? ` (${group.tipAmount} PB)` : '';
    if (actors.length === 1) {
      return zh ? `${actors[0].user} 助力了你的帖子${amount}` : `${actors[0].user} sponsored your post${amountEn}`;
    }
    if (actors.length === 2) {
      return zh
        ? `${actors[0].user}、${actors[1].user} 助力了你的帖子${amount}`
        : `${actors[0].user} and ${actors[1].user} sponsored your post${amountEn}`;
    }
    return zh
      ? `${actors[0].user}、${actors[1].user} 等 ${actors.length} 人助力了你的帖子${amount}`
      : `${actors[0].user}, ${actors[1].user} and ${actors.length - 2} others sponsored your post${amountEn}`;
  }
  if (group.type === 'link') {
    if (actors.length === 1) return zh ? `${actors[0].user} 链接了你的节点` : `${actors[0].user} linked your node`;
    if (actors.length === 2) return zh ? `${actors[0].user}、${actors[1].user} 链接了你的节点` : `${actors[0].user} and ${actors[1].user} linked your node`;
    return zh
      ? `${actors[0].user}、${actors[1].user} 等 ${actors.length} 人链接了你的节点`
      : `${actors[0].user}, ${actors[1].user} and ${actors.length - 2} others linked your node`;
  }
  if (actors.length === 1) {
    return zh ? `${actors[0].user} ${label}了你的帖子` : `${actors[0].user} ${label} your post`;
  }
  if (actors.length === 2) {
    return zh
      ? `${actors[0].user}、${actors[1].user} ${label}了你的帖子`
      : `${actors[0].user} and ${actors[1].user} ${label} your post`;
  }
  return zh
    ? `${actors[0].user}、${actors[1].user} 等 ${actors.length} 人${label}了你的帖子`
    : `${actors[0].user}, ${actors[1].user} and ${actors.length - 2} others ${label} your post`;
}

function ActivityItem({
  group,
  postTitle,
  isRead,
  onNavigatePost,
  onNavigateUser,
}: {
  group: ActivityGroup;
  postTitle: string;
  isRead: boolean;
  onNavigatePost: () => void;
  onNavigateUser: (user: string, avatarIdx: number) => void;
}) {
  const { language, t } = useApp();
  const zh = isChinese(language);

  return (
    <div
      className={`activity-item${isRead ? '' : ' activity-item--unread'}`}
      onClick={onNavigatePost}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onNavigatePost(); }}
    >
      <div className={`activity-avatars activity-avatars--${Math.min(group.actors.length, 3)}`}>
        {group.actors.slice(0, 3).map((a, i) => (
          <span
            key={a.user}
            className="activity-avatar-wrap"
            style={{ zIndex: 3 - i }}
            onClick={e => { e.stopPropagation(); onNavigateUser(a.user, a.avatarIdx); }}
          >
            <Avatar index={a.avatarIdx} />
          </span>
        ))}
        <span className={`activity-type-icon${group.type === 'tip' ? ' activity-type-icon--tip' : ''}`}>{ACTION_ICON[group.type]}</span>
      </div>
      <div className="activity-content">
        <p className="activity-text">{groupText(group, zh)}</p>
        {group.commentText && (
          <p className="activity-comment-text">「{group.commentText}」</p>
        )}
        {group.tipMessage && (
          <p className="activity-tip-message">「{group.tipMessage}」</p>
        )}
        <p className="activity-post-summary">{postTitle}</p>
        <p className="activity-time">{group.time}</p>
      </div>
      {!isRead && <span className="activity-unread-dot" aria-hidden="true" />}
    </div>
  );
}

export function ActivityPage() {
  const { goBack, navigate, activityGroups, markAllRead, posts, t, language } = useApp();
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const filtered = filter === 'all' ? activityGroups : activityGroups.filter(g => g.type === filter);

  const getPostTitle = (postId: string) => {
    // 通知引用的帖子可能被全局过滤（如长文不在 feed/主页展示），仍需从完整 mock 数据解析标题
    const post = posts.find(p => p.id === postId) ?? ALL_POSTS.find(p => p.id === postId);
    if (!post) return t('（帖子已删除）');
    const raw = post.title.replace(/\n/g, ' ');
    return raw.length > 36 ? raw.slice(0, 36) + '…' : raw;
  };

  const getActivitySummary = (group: ActivityGroup) => {
    if (group.type === 'subscribe') {
      return group.tierName
        ? t('频道会员 · {tierName}', { tierName: group.tierName })
        : t('频道订阅');
    }
    return group.postId ? getPostTitle(group.postId) : t('（帖子已删除）');
  };

  const tabs: { key: FilterTab; zh: string; en: string }[] = [
    { key: 'all',     zh: '全部',   en: 'All' },
    { key: 'link',    zh: '链接',   en: 'Links' },
    { key: 'comment', zh: '评论',   en: 'Comments' },
    { key: 'like',    zh: '点赞',   en: 'Likes' },
    { key: 'share',   zh: '转发',   en: 'Reposts' },
    { key: 'save',    zh: '收藏',   en: 'Saves' },
    { key: 'tip',     zh: '助力',   en: 'Sponsorships' },
    { key: 'subscribe', zh: '订阅', en: 'Subscriptions' },
    { key: 'new_product', zh: '新品', en: 'New items' },
  ];

  return (
    <div className="page">
      <PageHeader
        title={t('通知')}
        onBack={goBack}
      />
      <div className="scroll-area">
        <nav className="activity-filter-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`activity-filter-tab${filter === tab.key ? ' activity-filter-tab--active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {isChinese(language) ? tab.zh : tab.en}
            </button>
          ))}
        </nav>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>{t('暂无通知')}</p>
          </div>
        ) : (
          filtered.map(group => (
            <ActivityItem
              key={group.id}
              group={group}
              postTitle={getActivitySummary(group)}
              isRead={group.isRead}
              onNavigatePost={() => {
                if (group.type === 'subscribe') {
                  navigate({ page: 'P6', authorName: group.actors[0].user });
                } else if (group.postId) {
                  navigate({ page: 'P2', postId: group.postId });
                }
              }}
              onNavigateUser={(user) => navigate({ page: 'P6', authorName: user })}
            />
          ))
        )}
      </div>
    </div>
  );
}
