import { useState, type ReactNode } from 'react';
import { Check, MoreHorizontal, Plus, X } from 'lucide-react';
import type { AdminAccount } from '../adminAccounts';
import { findRegisteredUserByAddress } from '../mockData';
import { isValidWalletAddress, shortenAddress } from '../formatAddress';
import type { Language } from '../types';
import { translate } from '../locales';
import { Avatar } from './shared';

/** 每个地址都有昵称与地址两项；未设置昵称时，昵称回退为缩短地址。 */
function accountRowText(account: AdminAccount): { nickname: string; address: string; remark?: string } {
  const address = shortenAddress(account.address);
  return {
    nickname: findRegisteredUserByAddress(account.address)?.name ?? address,
    address,
    remark: account.label,
  };
}

type AdminShellProps = {
  accounts: AdminAccount[];
  activeAddress: string;
  onSelect: (address: string) => void;
  onAdd: (account: AdminAccount) => void;
  onRemove: (address: string) => void;
  onRename: (address: string, label: string) => void;
  language: Language;
  children: ReactNode;
};

/** AdminShell 包裹多个独立 App 实例，脱离任何单一账号的 AppProvider，文案走独立的 translate()。 */
export function AdminShell({ accounts, activeAddress, onSelect, onAdd, onRemove, onRename, language, children }: AdminShellProps) {
  const t = (key: string, params?: Record<string, string | number>) => translate(language, key, params);
  const [addOpen, setAddOpen] = useState(false);
  const [mobileSwitcherOpen, setMobileSwitcherOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renameFor, setRenameFor] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleRenameSubmit = () => {
    if (renameFor) onRename(renameFor, renameValue.trim());
    setRenameFor(null);
  };

  const accountList = (
    <div className="admin-sidebar-list">
      {accounts.map(acc => {
        const isActive = acc.address === activeAddress;
        const { nickname, address, remark } = accountRowText(acc);
        return (
          <div key={acc.address} className={`admin-sidebar-row${isActive ? ' admin-sidebar-row--active' : ''}`}>
            <button
              type="button"
              className="admin-sidebar-row-main"
              onClick={() => { onSelect(acc.address); setMobileSwitcherOpen(false); }}
            >
              <Avatar index={0} seed={acc.avatarSeed} />
              <span className="admin-sidebar-row-text">
                <span className="admin-sidebar-row-name">{nickname}</span>
                <span className="admin-sidebar-row-address">{address}</span>
                {remark && <span className="admin-sidebar-row-remark">{t('备注')}：{remark}</span>}
              </span>
              {isActive && <Check size={16} strokeWidth={2.4} className="admin-sidebar-row-check" aria-hidden="true" />}
            </button>
            <div className="admin-sidebar-row-menu-wrap">
              <button
                type="button"
                className="admin-sidebar-row-menu-btn"
                aria-label={t('更多操作')}
                onClick={() => setMenuFor(menuFor === acc.address ? null : acc.address)}
              >
                <MoreHorizontal size={16} strokeWidth={2.2} />
              </button>
              {menuFor === acc.address && (
                <div className="admin-sidebar-row-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setRenameFor(acc.address); setRenameValue(acc.label ?? ''); setMenuFor(null); }}>
                    {t('重命名')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-sidebar-row-menu-danger"
                    disabled={accounts.length <= 1}
                    onClick={() => { onRemove(acc.address); setMenuFor(null); }}
                  >
                    {t('移除')}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="admin-shell">
      <div className="admin-bar">
        <span className="admin-bar-title">{t('知识宇宙')}</span>
      </div>
      <div className="admin-body">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <span>{t('地址管理')}</span>
            <button type="button" className="admin-sidebar-add-btn" aria-label={t('添加地址')} onClick={() => setAddOpen(true)}>
              <Plus size={16} strokeWidth={2.4} />
            </button>
          </div>
          {accountList}
        </aside>
        <main className="admin-stage">
          {children}
        </main>
      </div>

      {mobileSwitcherOpen && (
        <div className="sheet-backdrop sheet-backdrop--bottom" onClick={() => setMobileSwitcherOpen(false)}>
          <div className="payment-sheet admin-mobile-switcher" role="dialog" aria-modal="true" aria-label={t('地址管理')} onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{t('地址管理')}</span>
              <button type="button" className="modal-close" onClick={() => setMobileSwitcherOpen(false)} aria-label={t('关闭')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            {accountList}
            <button type="button" className="planet-confirm-btn" onClick={() => { setMobileSwitcherOpen(false); setAddOpen(true); }}>
              {t('添加地址')}
            </button>
          </div>
        </div>
      )}

      {renameFor && (
        <div className="sheet-backdrop" onClick={() => setRenameFor(null)}>
          <div className="payment-sheet admin-add-sheet" role="dialog" aria-modal="true" aria-label={t('重命名')} onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{t('重命名')}</span>
              <button type="button" className="modal-close" onClick={() => setRenameFor(null)} aria-label={t('关闭')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <input
              className="edit-profile-input"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              placeholder={t('备注名')}
              autoFocus
            />
            <button type="button" className="planet-confirm-btn" onClick={handleRenameSubmit}>
              {t('保存')}
            </button>
          </div>
        </div>
      )}

      {addOpen && (
        <AddAccountSheet
          existing={accounts.map(a => a.address)}
          t={t}
          onClose={() => setAddOpen(false)}
          onSubmit={(address, label) => {
            const registered = findRegisteredUserByAddress(address);
            onAdd({ address, label: label || undefined, avatarSeed: label || registered?.name || address });
            setAddOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AddAccountSheet({ existing, t, onClose, onSubmit }: {
  existing: string[];
  t: (key: string, params?: Record<string, string | number>) => string;
  onClose: () => void;
  onSubmit: (address: string, label: string) => void;
}) {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [attempted, setAttempted] = useState(false);

  const normalized = address.trim().toLowerCase();
  const addressValid = isValidWalletAddress(address);
  const duplicate = addressValid && existing.some(a => a.toLowerCase() === normalized);
  const registered = addressValid && !duplicate ? findRegisteredUserByAddress(address.trim()) : undefined;
  const formReady = addressValid && !duplicate;

  const errorMessage = (() => {
    if (!attempted) return null;
    if (!address.trim()) return t('请填写地址');
    if (!addressValid) return t('请输入有效的 0x 地址');
    if (duplicate) return t('该地址已在列表中');
    return null;
  })();

  const handleSubmit = () => {
    setAttempted(true);
    if (!formReady) return;
    onSubmit(address.trim(), label.trim());
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet admin-add-sheet" role="dialog" aria-modal="true" aria-label={t('添加地址')} onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('添加地址')}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="address-migration-field">
          <label htmlFor="admin-add-address">{t('地址')}</label>
          <div className="stake-code-input-wrap">
            <input
              id="admin-add-address"
              className={`edit-profile-input${errorMessage ? ' edit-profile-input--error' : ''}`}
              value={address}
              onChange={e => { setAddress(e.target.value); setAttempted(false); }}
              placeholder={t('请填写钱包地址')}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="stake-code-paste-btn"
              onClick={async () => {
                try {
                  const text = (await navigator.clipboard.readText()).trim();
                  if (text) setAddress(text);
                } catch {
                  // 剪贴板读取失败：静默忽略，用户仍可手动输入
                }
              }}
            >
              {t('粘贴')}
            </button>
          </div>
        </div>
        {errorMessage && <p className="address-migration-error" role="alert">{errorMessage}</p>}
        <div className="address-migration-field">
          <label htmlFor="admin-add-label">{t('备注名（选填）')}</label>
          <input
            id="admin-add-label"
            className="edit-profile-input"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={registered?.name ?? t('留空使用缩短地址')}
          />
        </div>
        <button type="button" className="planet-confirm-btn" onClick={handleSubmit} disabled={attempted && !formReady}>
          {t('添加')}
        </button>
      </div>
    </div>
  );
}
