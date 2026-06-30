import { Home, MessageCircle, Plus, User } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER, DM_CONVERSATIONS } from '../mockData';
import type { Route } from '../types';
import { KnowledgePlanetIcon } from './KnowledgePlanetIcon';

export function BottomNav({ route, setTab }: {
  route: Route;
  setTab: (t: 0 | 1) => void;
}) {
  const { navigate, navigateRoot, openCompose, t } = useApp();
  const unreadDmCount = DM_CONVERSATIONS.reduce((s, c) => s + c.unread, 0);

  const isHome = route.page === 'P0';
  const isPlanet = route.page === 'P_PLANET';
  const isDm = route.page === 'P_DM' || route.page === 'P_DM_CHAT';
  const isMine = route.page === 'P6' && route.authorName === CURRENT_USER;

  const activeCol = isHome ? 0 : isPlanet ? 1 : isDm ? 3 : isMine ? 4 : -1;

  return (
    <nav
      className="bottom-nav"
      data-layer="bottom-nav"
      style={{ '--nav-active-col': activeCol } as React.CSSProperties}
    >
      <div className="nav-indicator" aria-hidden />
      <button
        type="button"
        className={`nav-item${isHome ? ' nav-item--active' : ''}`}
        onClick={() => { if (!isHome) navigate({ page: 'P0', tab: 0 }); else setTab(0); }}
        aria-label={t('首页', 'Home')}
      >
        <Home size={22} strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`nav-item nav-item--planet${isPlanet ? ' nav-item--active' : ''}`}
        onClick={() => { if (!isPlanet) navigateRoot({ page: 'P_PLANET' }); }}
        aria-label={t('知识星球', 'Knowledge Planet')}
      >
        <KnowledgePlanetIcon className="knowledge-planet-icon" />
      </button>
      <button
        type="button"
        className="nav-item nav-item--compose"
        onClick={() => openCompose()}
        aria-label={t('发帖', 'Create post')}
      >
        <Plus size={22} strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`nav-item${isDm ? ' nav-item--active' : ''}`}
        onClick={() => navigate({ page: 'P_DM' })}
        aria-label={t('私信', 'Messages')}
        style={{ position: 'relative' }}
      >
        <MessageCircle size={22} strokeWidth={2} />
        {unreadDmCount > 0 && (
          <span className="nav-inbox-dot">{unreadDmCount > 9 ? '9+' : unreadDmCount}</span>
        )}
      </button>
      <button
        type="button"
        className={`nav-item${isMine ? ' nav-item--active' : ''}`}
        onClick={() => navigateRoot({ page: 'P6', authorName: CURRENT_USER })}
        aria-label={t('我的', 'Me')}
      >
        <User size={22} strokeWidth={2} />
      </button>
    </nav>
  );
}
