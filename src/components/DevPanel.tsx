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
  const {
    walletConnected, connectWallet, disconnectWallet, demoHideOwnChannels, toggleDemoHideOwnChannels, t,
    taskSnapshotToday, resetDemoTasks, simulateDemoTaskInteractions,
  } = useApp();

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
            <span className="planet-dev-menu-title">{t('开发工具')}</span>
            <button
              type="button"
              className="planet-dev-menu-close"
              aria-label={t('关闭开发工具（刷新页面后重新出现）')}
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
            <span>{t('游客模式')}</span>
            <span className={`planet-dev-menu-toggle${!walletConnected ? ' planet-dev-menu-toggle--on' : ''}`}>
              {!walletConnected ? t('开') : t('关')}
            </span>
          </button>
          <button
            type="button"
            className="planet-dev-menu-item"
            role="menuitemcheckbox"
            aria-checked={demoHideOwnChannels}
            onClick={toggleDemoHideOwnChannels}
          >
            <span>{t('未创建频道')}</span>
            <span className={`planet-dev-menu-toggle${demoHideOwnChannels ? ' planet-dev-menu-toggle--on' : ''}`}>
              {demoHideOwnChannels ? t('开') : t('关')}
            </span>
          </button>
          <button
            type="button"
            className="planet-dev-menu-item"
            onClick={() => simulateDemoTaskInteractions(Math.min(35, taskSnapshotToday.interactedCount + 5))}
          >
            <span>{t('模拟互动 +5 篇（今日任务）')}</span>
          </button>
          <button
            type="button"
            className="planet-dev-menu-item"
            onClick={resetDemoTasks}
          >
            <span>{t('重置今日任务')}</span>
          </button>
          {children}
        </div>
      )}
      <button
        type="button"
        className="planet-dev-pill"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('开发工具')}
        onClick={() => setOpen(value => !value)}
      >
        <Wrench size={14} strokeWidth={2} aria-hidden="true" />
        <span>DEV</span>
      </button>
    </div>
  );
}
