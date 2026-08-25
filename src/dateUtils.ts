/** 本地时区日期键 YYYY-MM-DD。 */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 与每日任务历史日历标签一致的 Intl locale 映射。 */
const CALENDAR_INTL_LOCALE: Record<string, string> = {
  'zh-CN': 'zh-CN', en: 'en-US', 'zh-TW': 'zh-TW', ko: 'ko-KR', ja: 'ja-JP',
  ru: 'ru-RU', es: 'es-ES', fr: 'fr-FR', pt: 'pt-PT', th: 'th-TH', vi: 'vi-VN',
};

export function calendarIntlLocale(language: string): string {
  return CALENDAR_INTL_LOCALE[language] ?? 'en-US';
}

export type CalendarDay = {
  date: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
};

/** 按自然月生成日历格子（含首尾相邻月填充天），供通用日期选择器复用。 */
export function getCalendarMonth(year: number, month: number, now: Date = new Date()): CalendarDay[] {
  const todayKey = dayKey(now);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();
  const result: CalendarDay[] = [];

  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(year, month, 1 - (startWeekday - i));
    const date = dayKey(d);
    result.push({ date, day: d.getDate(), inCurrentMonth: false, isToday: date === todayKey });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const date = dayKey(d);
    result.push({ date, day, inCurrentMonth: true, isToday: date === todayKey });
  }

  const remainder = result.length % 7;
  if (remainder !== 0) {
    for (let i = 1; i <= 7 - remainder; i++) {
      const d = new Date(year, month + 1, i);
      const date = dayKey(d);
      result.push({ date, day: d.getDate(), inCurrentMonth: false, isToday: date === todayKey });
    }
  }

  return result;
}

/** 定时发布的帖子在设定时间之前不可见，相当于用户就是在那个时间发的帖子一样。 */
export function isPostVisible(post: { scheduledAt?: number }, now: number = Date.now()): boolean {
  return post.scheduledAt === undefined || post.scheduledAt <= now;
}

/** 定时发布时间的展示格式：2026-08-20 20:03，不随浏览器 locale 变化。 */
export function formatScheduledAt(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
