import type { Language } from './types';

export function localizeTime(time: string, language: Language): string {
  if (language === 'zh-CN') return time;
  if (time === '刚刚') return 'Just now';

  const match = time.match(/^(\d+)\s*(分钟|小时|天)前$/);
  if (!match) return time;

  const [, amount, unit] = match;
  if (unit === '分钟') return `${amount}m ago`;
  if (unit === '小时') return `${amount}h ago`;
  return `${amount}d ago`;
}
