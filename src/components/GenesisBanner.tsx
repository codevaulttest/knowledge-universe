import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useApp } from '../AppContext';

const DISMISS_KEY = 'ku-bsp-superstar-banner-dismissed';

export function GenesisBanner() {
  const { t, navigateRoot } = useApp();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const handleEnter = () => {
    // 与知识宇宙页「BSP 巨星投流」快捷入口一致：进入该页并打开投流弹层
    navigateRoot({ page: 'P_PLANET', openBsp: true });
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
  };

  return (
    <button
      type="button"
      className="genesis-banner"
      data-layer="genesis-banner"
      onClick={handleEnter}
      aria-label={t('进入 BSP 巨星投流计划')}
    >
      <img className="genesis-banner-bg" src="/img/bsp-superstar-banner.webp" alt="" aria-hidden="true" />
      <span className="genesis-banner-content">
        <span className="genesis-banner-eyebrow">{t('全新上线')}</span>
        <span className="genesis-banner-title">{t('BSP 巨星投流计划')}</span>
        <span className="genesis-banner-sub">
          {t('投流支持创作者')}
          <span className="genesis-banner-scarcity-left">{t('· 1 年长期扶持')}</span>
        </span>
        <span className="genesis-banner-cta">
          {t('立即投流')}
          <ArrowRight size={14} strokeWidth={2.4} />
        </span>
      </span>
      <span
        className="genesis-banner-close"
        role="button"
        tabIndex={0}
        aria-label={t('关闭2')}
        onClick={handleDismiss}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleDismiss(e as unknown as React.MouseEvent); }}
      >
        <X size={15} strokeWidth={2.2} />
      </span>
    </button>
  );
}
