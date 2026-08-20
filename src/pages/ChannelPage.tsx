import { useState } from 'react';
import { ChevronRight, CircleCheck, Gem, Radio, RotateCcw, Settings } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER } from '../mockData';
import { PostCard } from '../components/PostCard';
import { Avatar, PageHeader } from '../components/shared';
import { DevPanel } from '../components/DevPanel';
import { SubscriberListModal } from './ProfilePage';
import { isPostVisible } from '../dateUtils';

export function ChannelPage({ channelId }: { channelId: string }) {
  const {
    goBack, canGoBack, navigate, channels, posts, subscribedChannelTiers, expiredChannelIds,
    openChannelSubscribe, openManageChannel, resetChannelTierCooldown, t,
  } = useApp();
  const channel = channels.find(c => c.id === channelId);
  const [contentFilter, setContentFilter] = useState<'all' | 'sub'>('all');
  const [showSubscribers, setShowSubscribers] = useState(false);

  if (!channel) {
    return (
      <div className="page">
        <PageHeader title={t('频道不存在')} onBack={canGoBack ? goBack : undefined} />
        <div className="scroll-area">
          <div className="profile-empty-state">
            <Radio size={32} strokeWidth={1.2} className="profile-empty-icon" />
            <p className="profile-empty-title">{t('频道不存在')}</p>
            <p className="profile-empty-sub">{t('该频道可能已被下架')}</p>
          </div>
        </div>
      </div>
    );
  }

  const isOwn = channel.ownerName === CURRENT_USER;
  const isSubExpired = expiredChannelIds.has(channel.id);
  const mySubscribedTierIndex = subscribedChannelTiers[channel.id];
  const channelPosts = posts.filter(p => p.channelId === channel.id && !p.deleted && (isOwn || isPostVisible(p)));
  const isExclusive = (p: (typeof channelPosts)[number]) => p.minTierIndex != null;
  const displayedPosts = contentFilter === 'sub'
    ? channelPosts.filter(isExclusive)
    : channelPosts.filter(p => !isExclusive(p));

  return (
    <div className="page">
      <PageHeader
        title={(
          <>
            <Radio size={16} strokeWidth={2.2} aria-hidden="true" />
            {channel.name}
          </>
        )}
        onBack={canGoBack ? goBack : undefined}
      />
      <div className="scroll-area">
        <div className="channel-page-hero">
          <Avatar
            index={0}
            seed={channel.avatarSeed}
            onClick={() => navigate({ page: 'P6', authorName: channel.ownerName })}
          />
          <div className="channel-page-hero-info">
            <span className="channel-page-hero-name">{channel.name}</span>
            <button
              type="button"
              className="channel-page-hero-owner"
              onClick={() => navigate({ page: 'P6', authorName: channel.ownerName })}
            >
              {t('由 {ownerName} 运营', { ownerName: channel.ownerName })}
              <ChevronRight size={13} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>

        {channel.description && (
          <p className="channel-page-desc">{channel.description}</p>
        )}

        <div className="channel-info-bar">
          <div className="channel-info-bar-top">
            <div className="channel-info-bar-left">
              {isOwn ? (
                <button
                  type="button"
                  className="channel-info-bar-sub channel-info-bar-sub--btn"
                  onClick={() => setShowSubscribers(true)}
                  aria-label={t('查看 {subscriberCount} 位订阅用户', { subscriberCount: channel.subscriberCount })}
                >
                  {t('{subscriberCount} 人已订阅', { subscriberCount: channel.subscriberCount })}
                  <ChevronRight size={13} strokeWidth={2.2} aria-hidden="true" />
                </button>
              ) : (
                <span className="channel-info-bar-sub">
                  {t('{subscriberCount} 人已订阅', { subscriberCount: channel.subscriberCount })}
                </span>
              )}
            </div>
            {isOwn ? (
              <button type="button" className="channel-manage-btn" onClick={() => openManageChannel(channel.id)}>
                <Settings size={13} strokeWidth={2.2} />
                {t('管理频道2')}
              </button>
            ) : (mySubscribedTierIndex != null || channel.tiers.some(tr => !tr.archived)) ? (
              <button
                type="button"
                className={`channel-manage-btn${mySubscribedTierIndex != null && !isSubExpired ? ' channel-manage-btn--subscribed' : ''}`}
                onClick={() => openChannelSubscribe(channel.id)}
              >
                {isSubExpired ? (
                  <>
                    <RotateCcw size={13} strokeWidth={2.2} aria-hidden="true" />
                    {t('续费')}
                  </>
                ) : mySubscribedTierIndex != null ? (
                  <>
                    <CircleCheck size={13} strokeWidth={2.2} aria-hidden="true" />
                    {t('已订阅 · {name}', { name: channel.tiers[mySubscribedTierIndex].name })}
                  </>
                ) : (
                  <>
                    <Gem size={13} strokeWidth={2.2} aria-hidden="true" />
                    {t('订阅')}
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>

        <div className="profile-content-tabs-wrap profile-content-tabs-wrap--hero">
          <nav className="profile-content-tabs" aria-label={t('内容筛选')}>
            {(['all', 'sub'] as const).map(f => (
              <button
                key={f}
                type="button"
                className={`profile-content-tab${contentFilter === f ? ' profile-content-tab--active' : ''}`}
                onClick={() => setContentFilter(f)}
              >
                {f === 'sub' && <Gem size={14} strokeWidth={2} />}
                {f === 'all' ? t('免费') : t('会员')}
              </button>
            ))}
          </nav>
        </div>

        <section className="feed">
          {displayedPosts.map((post, i) => (
            <PostCard key={post.id} post={post} index={i % 3} />
          ))}
          {displayedPosts.length === 0 && (
            <div className="profile-empty-state">
              <Radio size={32} strokeWidth={1.2} className="profile-empty-icon" />
              <p className="profile-empty-title">{t('还没有帖子')}</p>
              <p className="profile-empty-sub">{t('该频道还没有发布任何内容')}</p>
            </div>
          )}
        </section>
      </div>

      {showSubscribers && (
        <SubscriberListModal
          channel={channel}
          onClose={() => setShowSubscribers(false)}
        />
      )}

      {isOwn && (
        <DevPanel>
          <button
            type="button"
            className="planet-dev-menu-item"
            onClick={() => resetChannelTierCooldown(channel.id)}
          >
            <span>{t('重置档位设置 30 天限制')}</span>
          </button>
        </DevPanel>
      )}
    </div>
  );
}
