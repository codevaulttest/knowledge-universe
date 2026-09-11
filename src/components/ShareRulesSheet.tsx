import { X } from 'lucide-react';
import { useApp } from '../AppContext';

/** 商品分享二维码 —— 分享人分账规则说明 */
export function ShareRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('分享人分账规则')}</span>
          <button className="back-btn bsp-rules-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="pb-info-sheet-body">
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('分享二维码：')}</strong>
            {t('通过你保存的二维码成交时，你独享本单分账优点的 80%。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('分配示例：')}</strong>
            {t('假设本单形成 100 优点分账池，通过你的二维码成交，你将获得其中 80 优点。')}
          </p>
        </div>
      </div>
    </div>
  );
}
