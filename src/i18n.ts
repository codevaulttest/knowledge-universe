import type { Language } from './types';

export function isChinese(language: Language): boolean {
  return language === 'zh-CN' || language === 'zh-TW';
}

export function localizeTime(time: string, language: Language): string {
  if (language === 'zh-CN') return time;
  if (language === 'zh-TW') {
    return time
      .replace(/刚刚/g, '剛剛')
      .replace(/分钟/g, '分鐘')
      .replace(/小时/g, '小時');
  }
  if (time === '刚刚') return 'Just now';

  const match = time.match(/^(\d+)\s*(分钟|小时|天)前$/);
  if (!match) return time;

  const [, amount, unit] = match;
  if (unit === '分钟') return `${amount}m ago`;
  if (unit === '小时') return `${amount}h ago`;
  return `${amount}d ago`;
}
