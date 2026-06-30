import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useApp } from '../AppContext';

const DISMISS_KEY = 'ku-genesis-banner-dismissed';

// 创世节点总量来自原始需求：共 100 个（序号 1–100），按顺序抢占、抢完即止
const TOTAL_NODES = 100;

export function GenesisBanner() {
  const { t, showToast } = useApp();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (dismissed) return null;

  const handleEnter = () => {
    showToast(t('跳转“知识宇宙·创世节点 DApp”', 'Opening "Knowledge Universe · Genesis Node" DApp'), 'demo');
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
      aria-label={t('进入知识宇宙·创世节点', 'Open Knowledge Universe · Genesis Node')}
    >
      <img className="genesis-banner-bg" src="/img/genesis-bigbang.webp" alt="" aria-hidden="true" />
      <span className="genesis-banner-content">
        <span className="genesis-banner-eyebrow">{t('全新上线', 'Now Live')}</span>
        <span className="genesis-banner-title">{t('知识宇宙·创世节点', 'Genesis Node')}</span>
        <span className="genesis-banner-sub">
          {t(`全球限量 ${TOTAL_NODES} 个`, `Only ${TOTAL_NODES} worldwide`)}
          <span className="genesis-banner-scarcity-left">{t('· 抢完即止', '· gone once claimed')}</span>
        </span>
        <span className="genesis-banner-cta">
          {t('立即抢占', 'Claim now')}
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
