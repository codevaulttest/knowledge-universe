import type { Language } from './types';

/** 将互动数字压缩为易读的短格式，避免超长数字撑坏操作栏布局。*/
export function formatCount(n: number, language: Language): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (language === 'zh-CN' || language === 'zh-TW') {
    if (abs < 10000) return sign + String(abs);
    if (abs < 100000000) return sign + trimUnit(abs / 10000) + '万';
    if (abs < 1000000000000) return sign + trimUnit(abs / 100000000) + '亿';
    return sign + '9999亿+';
  }
  if (abs < 1000) return sign + String(abs);
  if (abs < 1000000) return sign + trimUnit(abs / 1000) + 'K';
  if (abs < 1000000000) return sign + trimUnit(abs / 1000000) + 'M';
  if (abs < 1000000000000) return sign + trimUnit(abs / 1000000000) + 'B';
  return sign + '999B+';
}

function trimUnit(value: number): string {
  const truncated = Math.floor(value * 10) / 10;
  return Number.isInteger(truncated) ? String(truncated) : truncated.toFixed(1);
}
