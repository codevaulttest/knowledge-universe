import { useEffect, useRef, useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { useApp } from '../AppContext';

/** 庆祝彩带粒子：由中心向四周迸射（两圈、铺开更大范围），颜色取自 --ku-* token。 */
const PARTICLE_COUNT = 30;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (i % 2) * 0.32;
  const distance = 96 + (i % 5) * 34; // 96 ~ 232px，扩散半径明显更大
  return {
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance),
    delay: (i % 6) * 35,
    size: i % 3 === 0 ? 14 : 10,
    colorVar: ['--ku-color-primary', '--ku-color-genesis-gold', '--ku-color-success-text', '--ku-color-primary-dark'][i % 4],
  };
});

/**
 * 任务里程碑庆祝层：挂在 App 根部，监听 taskCelebrateSignal。
 * 用户在信息流里每完成 5 篇互动帖即就地放一次「烟花」并提示当前进度，
 * 让反馈发生在动作现场，而非需要打开任务面板才能看到。
 */
export function TaskCelebrationOverlay() {
  const { t, taskCelebrateSignal, taskSnapshotToday } = useApp();
  const [shown, setShown] = useState<{ count: number; ratio: number } | null>(null);
  const lastSignalRef = useRef(taskCelebrateSignal);

  useEffect(() => {
    if (taskCelebrateSignal === lastSignalRef.current) return;
    lastSignalRef.current = taskCelebrateSignal;
    setShown({ count: taskSnapshotToday.interactedCount, ratio: taskSnapshotToday.claimRatio });
    const id = setTimeout(() => setShown(null), 1700);
    return () => clearTimeout(id);
  }, [taskCelebrateSignal, taskSnapshotToday]);

  if (!shown) return null;

  return (
    <div className="task-celebrate-overlay">
      <div className="task-celebrate-burst" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="task-celebrate-particle"
            style={{
              ['--dx' as string]: `${p.dx}px`,
              ['--dy' as string]: `${p.dy}px`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}ms`,
              background: `var(${p.colorVar})`,
            }}
          />
        ))}
      </div>
      <div className="task-celebrate-pill" role="status">
        <PartyPopper size={20} strokeWidth={2} aria-hidden="true" />
        <span>{t('已完成 {count} 次互动 · 明日可领 {ratio}% 空投额度', { count: shown.count, ratio: shown.ratio })}</span>
      </div>
    </div>
  );
}
