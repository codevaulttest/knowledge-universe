import { useState, type ReactNode } from 'react';
import { Wrench, X } from 'lucide-react';
import { useApp } from '../AppContext';

type DevPanelProps = {
  children?: ReactNode;
};

/** 全局开发工具入口；页面可通过 children 追加自己的演示状态。 */
export function DevPanel({ children }: DevPanelProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const { walletConnected, connectWallet, disconnectWallet, t } = useApp();

  if (!visible) return null;

  return (
    <div className="planet-dev-entry" data-layer="dev-entry">
      {open && (
        <button
          type="button"
          className="planet-dev-backdrop"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
      {open && (
        <div className="planet-dev-menu" role="menu">
          <div className="planet-dev-menu-header">
            <span className="planet-dev-menu-title">{t('开发工具', 'Developer tools')}</span>
            <button
              type="button"
              className="planet-dev-menu-close"
              aria-label={t('关闭开发工具（刷新页面后重新出现）', 'Close developer tools (reappears after page refresh)')}
              onClick={() => { setOpen(false); setVisible(false); }}
            >
              <X size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            className="planet-dev-menu-item"
            role="menuitemcheckbox"
            aria-checked={!walletConnected}
            onClick={() => walletConnected ? disconnectWallet() : connectWallet()}
          >
            <span>{t('游客模式', 'Guest mode')}</span>
            <span className={`planet-dev-menu-toggle${!walletConnected ? ' planet-dev-menu-toggle--on' : ''}`}>
              {!walletConnected ? t('开', 'On') : t('关', 'Off')}
            </span>
          </button>
          {children}
        </div>
      )}
      <button
        type="button"
        className="planet-dev-pill"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('开发工具', 'Developer tools')}
        onClick={() => setOpen(value => !value)}
      >
        <Wrench size={14} strokeWidth={2} aria-hidden="true" />
        <span>DEV</span>
      </button>
    </div>
  );
}
