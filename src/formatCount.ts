import type { Language } from './types';

/** 将数字压缩为易读短格式（互动数、资产概览余额等），避免超长数字撑坏窄栏布局。*/
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

/**
 * 资产余额窄栏展示：整数位不超过 7 位时保留完整面额（避免 1050→1K），
 * 更长时再走本地化缩写（万/亿 或 K/M/B）。
 */
export function formatCompactBalance(n: number, language: Language): string {
  const abs = Math.abs(n);
  const intDigits = String(Math.floor(abs)).length;
  if (intDigits <= 7) {
    if (Number.isInteger(n)) return (n < 0 ? '-' : '') + String(Math.round(abs));
    return (n < 0 ? '-' : '') + String(abs);
  }
  return formatCount(n, language);
}

function trimUnit(value: number): string {
  const truncated = Math.floor(value * 10) / 10;
  return Number.isInteger(truncated) ? String(truncated) : truncated.toFixed(1);
}
