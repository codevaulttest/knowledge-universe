import type { ReactNode } from 'react';
import { useApp } from '../AppContext';
import { calendarIntlLocale } from '../dateUtils';
import type { TaskCalendarDay, TaskCalendarMonth } from '../taskConfig';

/** 每日任务历史日历共享骨架：月份标题 + 星期表头 + 日历格子，供各业务的历史弹窗复用。 */
export function TaskCalendarView({
  month,
  caption,
  selectedDate,
  onSelectDay,
  dayClassName,
  dayExtra,
}: {
  month: TaskCalendarMonth;
  caption: string;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  /** 该业务的"已达成"判定，返回要叠加的 class（如 'is-full' / 'is-posted'），无叠加返回空字符串 */
  dayClassName: (day: TaskCalendarDay) => string;
  /** 格子第二行内容，无内容返回 null */
  dayExtra: (day: TaskCalendarDay) => ReactNode;
}) {
  const { language } = useApp();
  const intlLocale = calendarIntlLocale(language);
  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: 'long' }).format(new Date(`${month.anchorDate}T00:00:00`));
  // 2023-01-01 是周日，用它取各语言"周几"的极简单字符标签，对齐 getDay() 的 0=周日 顺序
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intlLocale, { weekday: 'narrow' }).format(new Date(2023, 0, 1 + i))
  );

  return (
    <>
      <div className="task-calendar-month">{monthLabel}</div>

      <p className="task-calendar-caption">{caption}</p>

      <div className="task-calendar-weekdays">
        {weekdayLabels.map((label, i) => (
          <span key={i} className="task-calendar-weekday">{label}</span>
        ))}
      </div>

      <div className="task-calendar-grid">
        {Array.from({ length: month.leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} className="task-calendar-day-blank" aria-hidden="true" />
        ))}
        {month.days.map(day => (
          <button
            type="button"
            key={day.date}
            disabled={!day.snapshot}
            onClick={() => onSelectDay(day.date)}
            className={[
              'task-calendar-day',
              day.isToday && 'is-today',
              day.snapshot && dayClassName(day),
              day.date === selectedDate && 'is-selected',
            ].filter(Boolean).join(' ')}
          >
            <span className="task-calendar-day-num">{day.day}</span>
            {day.snapshot && dayExtra(day)}
          </button>
        ))}
      </div>
    </>
  );
}
