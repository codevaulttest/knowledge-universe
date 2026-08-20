import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useApp } from '../AppContext';
import {
  calendarIntlLocale,
  dayKey,
  formatScheduledAt,
  getCalendarMonth,
} from '../dateUtils';

/** Date → YYYY-MM-DDTHH:mm（本地时区），与 ComposePage 既有 scheduledAtLocal 格式对齐。 */
export function toLocalDateTimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduleDate(minMs: number): Date {
  const d = new Date(Math.max(Date.now() + 60 * 60_000, minMs));
  d.setSeconds(0, 0);
  return d;
}

function parseLocalDateTime(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 自定义日期时间选择器：用站内语言渲染月历/时分，规避原生 datetime-local
 * 弹层语言跟随浏览器设置、不受页面 lang 控制的问题。
 */
export function ScheduleDateTimePicker({
  value,
  minMs = Date.now() + 60_000,
  onConfirm,
  onClose,
}: {
  value: string;
  minMs?: number;
  onConfirm: (localValue: string) => void;
  onClose: () => void;
}) {
  const { t, language } = useApp();
  const intlLocale = calendarIntlLocale(language);
  const initial = parseLocalDateTime(value) ?? defaultScheduleDate(minMs);

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selectedDate, setSelectedDate] = useState(dayKey(initial));
  const [hour, setHour] = useState(initial.getHours());
  const [minute, setMinute] = useState(initial.getMinutes());

  const minDate = dayKey(new Date(minMs));
  const minViewYear = new Date(minMs).getFullYear();
  const minViewMonth = new Date(minMs).getMonth();
  const canGoPrev = viewYear > minViewYear || (viewYear === minViewYear && viewMonth > minViewMonth);

  const days = useMemo(() => getCalendarMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = new Intl.DateTimeFormat(intlLocale, { year: 'numeric', month: 'long' })
    .format(new Date(viewYear, viewMonth, 1));
  // 2023-01-01 是周日，对齐 getDay() 的 0=周日 顺序
  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(intlLocale, { weekday: 'narrow' }).format(new Date(2023, 0, 1 + i))
    ),
    [intlLocale],
  );

  const draft = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d, hour, minute, 0, 0);
  }, [selectedDate, hour, minute]);

  const draftValid = draft.getTime() > minMs;
  const preview = formatScheduledAt(draft.getTime());

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    if (delta < 0 && (next.getFullYear() < minViewYear || (next.getFullYear() === minViewYear && next.getMonth() < minViewMonth))) {
      return;
    }
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleConfirm = () => {
    if (!draftValid) return;
    onConfirm(toLocalDateTimeValue(draft));
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="payment-sheet schedule-picker-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('选择发布时间')}
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-header">
          <span className="sheet-title">{t('选择发布时间')}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="schedule-picker-month-nav">
          <button
            type="button"
            className="schedule-picker-month-btn"
            onClick={() => shiftMonth(-1)}
            disabled={!canGoPrev}
            aria-label={t('上个月')}
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <span className="task-calendar-month schedule-picker-month-label">{monthLabel}</span>
          <button
            type="button"
            className="schedule-picker-month-btn"
            onClick={() => shiftMonth(1)}
            aria-label={t('下个月')}
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="task-calendar-weekdays">
          {weekdayLabels.map((label, i) => (
            <span key={i} className="task-calendar-weekday">{label}</span>
          ))}
        </div>

        <div className="task-calendar-grid">
          {days.map(day => {
            const disabled = !day.inCurrentMonth || day.date < minDate;
            return (
              <button
                type="button"
                key={`${day.date}-${day.inCurrentMonth ? 'in' : 'out'}`}
                disabled={disabled}
                onClick={() => setSelectedDate(day.date)}
                className={[
                  'task-calendar-day',
                  !day.inCurrentMonth && 'is-outside',
                  day.date < minDate && 'is-past',
                  day.isToday && 'is-today',
                  day.date === selectedDate && day.inCurrentMonth && 'is-selected',
                ].filter(Boolean).join(' ')}
              >
                <span className="task-calendar-day-num">{day.day}</span>
              </button>
            );
          })}
        </div>

        <div className="schedule-picker-time" role="group" aria-label={t('时间')}>
          <label className="schedule-picker-time-field">
            <select
              className="schedule-picker-select"
              value={hour}
              onChange={e => setHour(Number(e.target.value))}
              aria-label={t('时')}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
              ))}
            </select>
            <span className="schedule-picker-time-unit">{t('时')}</span>
          </label>
          <span className="schedule-picker-time-sep" aria-hidden="true">:</span>
          <label className="schedule-picker-time-field">
            <select
              className="schedule-picker-select"
              value={minute}
              onChange={e => setMinute(Number(e.target.value))}
              aria-label={t('分')}
            >
              {Array.from({ length: 60 }, (_, m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
            <span className="schedule-picker-time-unit">{t('分')}</span>
          </label>
        </div>

        <p className={`schedule-picker-preview${!draftValid ? ' is-invalid' : ''}`}>
          {draftValid ? preview : t('定时发布时间需晚于当前时间')}
        </p>

        <button
          type="button"
          className="planet-confirm-btn"
          disabled={!draftValid}
          onClick={handleConfirm}
        >
          {t('确认')}
        </button>
      </div>
    </div>
  );
}
