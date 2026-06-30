import { useState } from 'react';

type Theme = 'teal' | 'blue';

function getInitialTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'blue' ? 'blue' : 'teal';
}

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const applyTheme = (t: Theme) => {
    if (t === 'blue') {
      document.documentElement.setAttribute('data-theme', 'blue');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    setTheme(t);
    setOpen(false);
  };

  if (!visible) return null;

  return (
    <div className={`ku-dev-toggle${open ? ' open' : ''}`}>
      <div className="ku-dev-menu">
        <button
          className={`ku-dev-btn${theme === 'teal' ? ' active' : ''}`}
          onClick={() => applyTheme('teal')}
        >
          青绿
        </button>
        <button
          className={`ku-dev-btn${theme === 'blue' ? ' active' : ''}`}
          onClick={() => applyTheme('blue')}
        >
          星云蓝
        </button>
        <div className="ku-dev-sep" />
        <button className="ku-dev-close" onClick={() => setVisible(false)} title="隐藏">✕</button>
      </div>
      <button className="ku-dev-pill" onClick={() => setOpen(o => !o)}>
        Dev
      </button>
    </div>
  );
}
