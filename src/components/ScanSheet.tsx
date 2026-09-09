import { useEffect, useState } from 'react';
import { CircleCheck, X } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Route } from '../types';

/** 扫一扫：模拟扫码，不接入真实摄像头，固定时长后自动跳转到 target（未指定时默认跳 demo 商品）。 */
export function ScanSheet({ onClose, target }: { onClose: () => void; target?: Route | null }) {
  const { t, navigate } = useApp();
  const [phase, setPhase] = useState<'scanning' | 'success'>('scanning');
  const isChannel = target?.page === 'P_CHANNEL';

  useEffect(() => {
    const toSuccess = setTimeout(() => setPhase('success'), 1800);
    const toResult = setTimeout(() => {
      navigate(target ?? { page: 'P_SHOP_ITEM', postId: 'shop-iphone' });
      onClose();
    }, 2600);
    return () => { clearTimeout(toSuccess); clearTimeout(toResult); };
  }, [navigate, onClose, target]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="scan-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="scan-header">
          <button type="button" className="video-player-back scan-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="scan-viewfinder">
          <div className={`scan-frame${phase === 'success' ? ' scan-frame--success' : ''}`}>
            <span className="scan-corner scan-corner--tl" />
            <span className="scan-corner scan-corner--tr" />
            <span className="scan-corner scan-corner--bl" />
            <span className="scan-corner scan-corner--br" />
            {phase === 'scanning' && <span className="scan-line" />}
            {phase === 'success' && (
              <div className="scan-success">
                <CircleCheck size={40} strokeWidth={2} />
              </div>
            )}
          </div>
        </div>

        <p className="scan-hint">
          {phase === 'scanning' ? t('将二维码放入框内，即可自动扫描') : t(isChannel ? '识别成功，正在跳转到频道' : '识别成功，正在跳转到商品')}
        </p>
      </div>
    </div>
  );
}
