import type { Language } from '../types';
import { zhCN } from './zh-CN';
import { en } from './en';
import { zhTW } from './zh-TW';
import { ja } from './ja';
import { ko } from './ko';
import { ru } from './ru';
import { es } from './es';
import { fr } from './fr';
import { pt } from './pt';
import { th } from './th';
import { vi } from './vi';

const dictionaries: Record<Language, Record<string, string>> = {
  'zh-CN': zhCN,
  en,
  'zh-TW': zhTW,
  ja,
  ko,
  ru,
  es,
  fr,
  pt,
  th,
  vi,
};

export function translate(language: Language, key: string, params?: Record<string, string | number>): string {
  let text = dictionaries[language]?.[key] ?? dictionaries.en?.[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
