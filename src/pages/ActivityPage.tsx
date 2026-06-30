import { useEffect, useState } from 'react';
import { Bookmark, Gift, Link, MessageCircle, Repeat2, ThumbsUp } from 'lucide-react';
import { useApp } from '../AppContext';
import { Avatar, PageHeader } from '../components/shared';
import type { ActivityGroup, ActivityType } from '../types';

type FilterTab = 'all' | ActivityType;

const ACTION_LABEL: Record<ActivityType, { zh: string; en: string }> = {
  like:    { zh: '点赞', en: 'liked' },
  share:   { zh: '转发', en: 'reposted' },
  save:    { zh: '收藏', en: 'bookmarked' },
  comment: { zh: '评论', en: 'commented on' },
  link:    { zh: '链接', en: 'linked' },
  tip:     { zh: '打赏', en: 'tipped' },
};

const ACTION_ICON: Record<ActivityType, React.ReactNode> = {
  like:    <ThumbsUp size={13} strokeWidth={2.2} />,
  share:   <Repeat2 size={13} strokeWidth={2.2} />,
  save:    <Bookmark size={13} strokeWidth={2.2} />,
  comment: <MessageCircle size={13} strokeWidth={2.2} />,
  link:    <Link size={13} strokeWidth={2.2} />,
  tip:     <Gift size={13} strokeWidth={2.2} />,
};

function groupText(group: ActivityGroup, zh: boolean): string {
  const label = zh ? ACTION_LABEL[group.type].zh : ACTION_LABEL[group.type].en;
  const actors = group.actors;
  if (group.type === 'comment') {
    return zh ? `${actors[0].user} 评论了你的帖子` : `${actors[0].user} commented on your post`;
  }
  if (group.type === 'tip') {
    const amount = group.tipAmount != null ? `（${group.tipAmount} PB）` : '';
    const amountEn = group.tipAmount != null ? ` (${group.tipAmount} PB)` : '';
    if (actors.length === 1) {
      return zh ? `${actors[0].user} 打赏了你的帖子${amount}` : `${actors[0].user} tipped your post${amountEn}`;
    }
    if (actors.length === 2) {
      return zh
        ? `${actors[0].user}、${actors[1].user} 打赏了你的帖子${amount}`
        : `${actors[0].user} and ${actors[1].user} tipped your post${amountEn}`;
    }
    return zh
      ? `${actors[0].user}、${actors[1].user} 等 ${actors.length} 人打赏了你的帖子${amount}`
      : `${actors[0].user}, ${actors[1].user} and ${actors.length - 2} others tipped your post${amountEn}`;
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
  const zh = language === 'zh-CN';

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
        <span className="activity-type-icon">{ACTION_ICON[group.type]}</span>
      </div>
      <div className="activity-content">
        <p className="activity-text">{groupText(group, zh)}</p>
        {group.commentText && (
          <p className="activity-comment-text">「{group.commentText}」</p>
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
    const post = posts.find(p => p.id === postId);
    if (!post) return t('（帖子已删除）', '(Post deleted)');
    const raw = post.title.replace(/\n/g, ' ');
    return raw.length > 36 ? raw.slice(0, 36) + '…' : raw;
  };

  const tabs: { key: FilterTab; zh: string; en: string }[] = [
    { key: 'all',     zh: '全部',   en: 'All' },
    { key: 'link',    zh: '链接',   en: 'Links' },
    { key: 'comment', zh: '评论',   en: 'Comments' },
    { key: 'like',    zh: '点赞',   en: 'Likes' },
    { key: 'share',   zh: '转发',   en: 'Reposts' },
    { key: 'save',    zh: '收藏',   en: 'Saves' },
    { key: 'tip',     zh: '打赏',   en: 'Tips' },
  ];

  return (
    <div className="page">
      <PageHeader
        title={t('通知', 'Notifications')}
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
              {language === 'zh-CN' ? tab.zh : tab.en}
            </button>
          ))}
        </nav>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>{t('暂无通知', 'No notifications yet')}</p>
          </div>
        ) : (
          filtered.map(group => (
            <ActivityItem
              key={group.id}
              group={group}
              postTitle={getPostTitle(group.postId)}
              isRead={group.isRead}
              onNavigatePost={() => navigate({ page: 'P2', postId: group.postId })}
              onNavigateUser={(user) => navigate({ page: 'P6', authorName: user })}
            />
          ))
        )}
      </div>
    </div>
  );
}
