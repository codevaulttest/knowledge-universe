import { Home, Plus, ShoppingCart, User } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER } from '../mockData';
import type { Route } from '../types';
import { KnowledgePlanetIcon } from './KnowledgePlanetIcon';

// 判定是否已在顶部的阈值（px）
const HOME_TOP_THRESHOLD = 8;

export function BottomNav({ route, setTab }: {
  route: Route;
  setTab: (t: 0 | 1 | 2) => void;
}) {
  const { navigate, navigateRoot, openCompose, requireWallet, t, refreshHomeFeed, navBarsHidden } = useApp();

  const isHome = route.page === 'P0';
  const isPlanet = route.page === 'P_PLANET';
  const isShop = route.page === 'P_SHOP';
  const isMine = route.page === 'P6' && route.authorName === CURRENT_USER;

  const activeCol = isHome && !isShop ? 0 : isPlanet ? 1 : isShop ? 3 : isMine ? 4 : -1;

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
      className={`bottom-nav${navBarsHidden ? ' bottom-nav--hidden' : ''}`}
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
        className={`nav-item${isShop ? ' nav-item--active' : ''}`}
        onClick={() => navigateRoot({ page: 'P_SHOP' })}
        aria-label={t('小黄车')}
      >
        <ShoppingCart size={20} strokeWidth={2} />
        <span className="nav-label">{t('小黄车')}</span>
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
