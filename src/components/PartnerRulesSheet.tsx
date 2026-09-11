import { X } from 'lucide-react';
import { useApp } from '../AppContext';

/** 商品合伙人 —— 分账规则说明 */
export function PartnerRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('合伙人分账规则')}</span>
          <button className="back-btn bsp-rules-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="pb-info-sheet-body">
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('合伙人分账：')}</strong>
            {t('本商品已链接的合伙人，按节点面额比例共享该商品的合伙人分账优点。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('分配示例：')}</strong>
            {t('假设本商品合伙人分账池为 1110 优点，若本商品共有 1 位 1000 PB、1 位 100 PB、1 位 10 PB 合伙人，则三位合伙人分别得 1000、100、10 优点。')}
          </p>
        </div>
      </div>
    </div>
  );
}
