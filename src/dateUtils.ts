/** 本地时区日期键 YYYY-MM-DD。 */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
