import { useState, useSyncExternalStore } from 'react';
import App from './App';
import { AdminShell } from './components/AdminShell';
import { getShellMode, subscribeShellMode } from './shellMode';
import { loadAdminAccounts, saveAdminAccounts, type AdminAccount } from './adminAccounts';
import type { Language } from './types';

export default function Root() {
  const mode = useSyncExternalStore(subscribeShellMode, getShellMode);

  if (mode === 'app') return <App />;

  return <AdminRoot />;
}

function AdminRoot() {
  const [accounts, setAccounts] = useState<AdminAccount[]>(loadAdminAccounts);
  const [activeAddress, setActiveAddress] = useState(accounts[0].address);
  // 懒挂载：账号第一次被选中才创建自己的 App 实例，之后一直保留（用 hidden 切换可见性），
  // 这样切换账号时各自的发帖/草稿/资料状态都还在。
  const [mountedAddresses, setMountedAddresses] = useState<string[]>([accounts[0].address]);
  const [language, setLanguage] = useState<Language>('zh-CN');

  const persist = (next: AdminAccount[]) => {
    setAccounts(next);
    saveAdminAccounts(next);
  };

  const handleSelect = (address: string) => {
    setActiveAddress(address);
    setMountedAddresses(prev => prev.includes(address) ? prev : [...prev, address]);
  };

  const handleAdd = (account: AdminAccount) => {
    persist([...accounts, account]);
    handleSelect(account.address);
  };

  const handleRemove = (address: string) => {
    if (accounts.length <= 1) return;
    const next = accounts.filter(a => a.address !== address);
    persist(next);
    setMountedAddresses(prev => prev.filter(a => a !== address));
    if (activeAddress === address) setActiveAddress(next[0].address);
  };

  const handleRename = (address: string, label: string) => {
    persist(accounts.map(a => a.address === address ? { ...a, label: label || undefined } : a));
  };

  return (
    <AdminShell
      accounts={accounts}
      activeAddress={activeAddress}
      onSelect={handleSelect}
      onAdd={handleAdd}
      onRemove={handleRemove}
      onRename={handleRename}
      language={language}
    >
      {mountedAddresses.map(address => {
        const account = accounts.find(a => a.address === address);
        if (!account) return null;
        return (
          <div key={address} hidden={address !== activeAddress} className="admin-app-instance">
            <App account={account} onLanguageChange={address === activeAddress ? setLanguage : undefined} />
          </div>
        );
      })}
    </AdminShell>
  );
}
