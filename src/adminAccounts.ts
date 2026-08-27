import { findRegisteredUserByAddress, MOCK_WALLET_ADDRESS } from './mockData';
import { shortenAddress } from './formatAddress';

export type AdminAccount = {
  address: string;
  /** 用户自填备注名；未填时按已注册账号昵称 → 缩短地址兜底展示 */
  label?: string;
  avatarSeed: string;
};

const STORAGE_KEY = 'ku-admin-accounts';

/** 第一条固定为默认钱包地址，保证「运营后台」首次打开时的当前账号与 app 模式一致。 */
export const MOCK_ADMIN_ACCOUNTS: AdminAccount[] = [
  { address: MOCK_WALLET_ADDRESS, avatarSeed: MOCK_WALLET_ADDRESS },
  { address: '0x5f2a8c1e6d9b3074a5c6e8f0123456789abcdef0', label: '张三', avatarSeed: '张三' },
  { address: '0x9d4c2b1a8e7f605132435465768798a9bacbdce', label: '李四', avatarSeed: '李四' },
];

export function accountDisplayName(account: AdminAccount): string {
  if (account.label) return account.label;
  const registered = findRegisteredUserByAddress(account.address);
  if (registered) return registered.name;
  return shortenAddress(account.address);
}

export function loadAdminAccounts(): AdminAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as AdminAccount[] : null;
    if (parsed && parsed.length > 0) return parsed;
  } catch {
    // 解析失败：回退到种子数据
  }
  return MOCK_ADMIN_ACCOUNTS;
}

export function saveAdminAccounts(accounts: AdminAccount[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}
