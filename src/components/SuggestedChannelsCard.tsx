import React, { useState } from 'react';
import { ChevronRight, CircleCheck, Gem, Radio, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { getChannelSubscribers } from '../mockData';
import { Avatar } from './shared';

const BATCH_SIZE = 4;

export function SuggestedChannelsCard() {
  const { channels, subscribedChannelTiers, expiredChannelIds, followedAuthors, openChannelSubscribe, navigate, openChannelDiscover, t } = useApp();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // 有共同订阅的频道更值得推荐，排在前面
  const pool = channels
    .filter(c => {
      const subscribedTierIndex = subscribedChannelTiers[c.id];
      const isSubscribed = subscribedTierIndex != null && !expiredChannelIds.has(c.id);
      return !isSubscribed && !dismissed.has(c.id);
    })
    .map(channel => ({
      channel,
      mutualCount: getChannelSubscribers(channel).filter(s => followedAuthors.has(s.name)).length,
    }))
    .sort((a, b) => b.mutualCount - a.mutualCount);
  if (pool.length === 0) return null;

  const batch = pool.slice(0, BATCH_SIZE);

  return (
    <section className="suggested-users-card">
      <div className="suggested-users-head">
        <span className="suggested-users-label">{t('为你推荐的频道')}</span>
        <button
          type="button"
          className="channel-refresh-btn"
          onClick={openChannelDiscover}
          aria-label={t('查看全部推荐频道')}
        >
          {t('查看全部')}
          <ChevronRight size={13} strokeWidth={2.2} />
        </button>
      </div>
      <div className="suggested-users-row">
        {batch.map(({ channel, mutualCount }, i) => {
          const subscribedTierIndex = subscribedChannelTiers[channel.id];
          const isSubscribed = subscribedTierIndex != null && !expiredChannelIds.has(channel.id);
          return (
            <div
              key={channel.id}
              className="suggested-user-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate({ page: 'P_CHANNEL', channelId: channel.id })}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ page: 'P_CHANNEL', channelId: channel.id }); } }}
            >
              <button
                type="button"
                className="suggested-user-dismiss"
                onClick={e => { e.stopPropagation(); setDismissed(prev => new Set(prev).add(channel.id)); }}
                aria-label={t('不感兴趣')}
              >
                <X size={12} strokeWidth={2.2} />
              </button>
              <Avatar index={i} seed={channel.avatarSeed} />
              <span className="suggested-user-name">
                <Radio size={12} strokeWidth={2.2} />
                <span className="author-name-text">{channel.name}</span>
              </span>
              <span className="suggested-user-meta">
                {mutualCount > 0
                  ? t('{count} 位共同订阅', { count: mutualCount })
                  : t('{subscriberCount} 人已订阅', { subscriberCount: channel.subscriberCount })}
              </span>
              <button
                type="button"
                className={`channel-manage-btn${isSubscribed ? ' channel-manage-btn--subscribed' : ''}`}
                onClick={e => { e.stopPropagation(); openChannelSubscribe(channel.id); }}
              >
                {isSubscribed ? (
                  <>
                    <CircleCheck size={13} strokeWidth={2.2} aria-hidden="true" />
                    {t('已订阅')}
                  </>
                ) : (
                  <>
                    <Gem size={13} strokeWidth={2.2} aria-hidden="true" />
                    {t('订阅')}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
