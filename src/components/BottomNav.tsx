import { Home, MessageCircle, Plus, User } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER, DM_CONVERSATIONS } from '../mockData';
import type { Route } from '../types';
import { KnowledgePlanetIcon } from './KnowledgePlanetIcon';

// 判定是否已在顶部的阈值（px）
const HOME_TOP_THRESHOLD = 8;

export function BottomNav({ route, setTab }: {
  route: Route;
  setTab: (t: 0 | 1 | 2 | 3) => void;
}) {
  const { navigate, navigateRoot, openCompose, requireWallet, t, refreshHomeFeed } = useApp();
  const unreadDmCount = DM_CONVERSATIONS.reduce((s, c) => s + c.unread, 0);

  const isHome = route.page === 'P0';
  const isPlanet = route.page === 'P_PLANET';
  const isDm = route.page === 'P_DM' || route.page === 'P_DM_CHAT';
  const isMine = route.page === 'P6' && route.authorName === CURRENT_USER;

  const activeCol = isHome ? 0 : isPlanet ? 1 : isDm ? 3 : isMine ? 4 : -1;

  // 首页点击：不在顶部先滚回顶部，已在顶部再点才刷新 feed
  const onHomeClick = () => {
    if (!isHome) {
      navigate({ page: 'P0', tab: 0 });
      return;
    }
    const scroller = document.querySelector<HTMLElement>('.scroll-area');
    if (scroller && scroller.scrollTop > HOME_TOP_THRESHOLD) {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    refreshHomeFeed();
  };

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
        onClick={onHomeClick}
        aria-label={t('首页')}
      >
        <Home size={20} strokeWidth={2} />
        <span className="nav-label">{t('首页')}</span>
      </button>
      <button
        type="button"
        className={`nav-item nav-item--planet${isPlanet ? ' nav-item--active' : ''}`}
        onClick={() => requireWallet(() => { if (!isPlanet) navigateRoot({ page: 'P_PLANET' }); })}
        aria-label={t('知识宇宙')}
      >
        <KnowledgePlanetIcon className="knowledge-planet-icon" />
        <span className="nav-label">{t('知识宇宙2')}</span>
      </button>
      <button
        type="button"
        className="nav-item nav-item--compose"
        onClick={() => openCompose()}
        aria-label={t('发帖')}
      >
        <Plus size={22} strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`nav-item${isDm ? ' nav-item--active' : ''}`}
        onClick={() => requireWallet(() => navigate({ page: 'P_DM' }))}
        aria-label={t('消息')}
        style={{ position: 'relative' }}
      >
        <MessageCircle size={20} strokeWidth={2} />
        <span className="nav-label">{t('消息')}</span>
        {unreadDmCount > 0 && (
          <span className="nav-inbox-dot">{unreadDmCount > 9 ? '9+' : unreadDmCount}</span>
        )}
      </button>
      <button
        type="button"
        className={`nav-item${isMine ? ' nav-item--active' : ''}`}
        onClick={() => requireWallet(() => navigateRoot({ page: 'P6', authorName: CURRENT_USER }))}
        aria-label={t('我')}
      >
        <User size={20} strokeWidth={2} />
        <span className="nav-label">{t('我')}</span>
      </button>
    </nav>
  );
}
