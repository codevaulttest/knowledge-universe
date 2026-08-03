import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useApp } from '../AppContext';

const DISMISS_KEY = 'ku-bsp-superstar-banner-dismissed';

export function GenesisBanner() {
  const { t, showToast } = useApp();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const handleEnter = () => {
    showToast(t('打开“BSP 巨星投流计划”', 'Opening "BSP Big Star Plan"'), 'demo');
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
      aria-label={t('进入 BSP 巨星投流计划', 'Open BSP Big Star Plan')}
    >
      <img className="genesis-banner-bg" src="/img/bsp-superstar-banner.webp" alt="" aria-hidden="true" />
      <span className="genesis-banner-content">
        <span className="genesis-banner-eyebrow">{t('全新上线', 'Now Live')}</span>
        <span className="genesis-banner-title">{t('BSP 巨星投流计划', 'BSP Big Star Plan')}</span>
        <span className="genesis-banner-sub">
          {t('投流支持创作者', 'Back creators with traffic')}
          <span className="genesis-banner-scarcity-left">{t('· 1 年长期扶持', '· 1-year support')}</span>
        </span>
        <span className="genesis-banner-cta">
          {t('立即投流', 'Invest now')}
          <ArrowRight size={14} strokeWidth={2.4} />
        </span>
      </span>
      <span
        className="genesis-banner-close"
        role="button"
        tabIndex={0}
        aria-label={t('关闭', 'Dismiss')}
        onClick={handleDismiss}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleDismiss(e as unknown as React.MouseEvent); }}
      >
        <X size={15} strokeWidth={2.2} />
      </span>
    </button>
  );
}
