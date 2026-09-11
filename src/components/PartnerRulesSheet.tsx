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
            <strong className="pb-info-sheet-label">{t('分享二维码：')}</strong>
            {t('在商品页点击「分享」保存的二维码，别人通过该二维码成交时，分享者独享本单分账优点的 80%。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('合伙人分账：')}</strong>
            {t('其余 20%，由本商品已链接的合伙人按节点面额共享。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('直接成交：')}</strong>
            {t('未通过二维码成交的订单，这部分不进入合伙人共享池。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('分配示例：')}</strong>
            {t('假设本单形成 430 优点分账池，二维码分享者获得 344 优点；剩余 86 优点按合伙人质押面额占比分配。若本商品共有 1 位 1000 PB、3 位 100 PB、50 位 10 PB 合伙人，则每位约得 47.78、4.78、0.48 优点——10 PB 合伙人人数越多，他们合计拿到的份额也会相应变大。')}
          </p>
        </div>
      </div>
    </div>
  );
}
