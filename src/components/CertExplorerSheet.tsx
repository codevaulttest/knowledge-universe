import { Copy, X } from 'lucide-react';
import { useApp } from '../AppContext';

/** 模拟「在区块浏览器查看」的详情弹层：项目不接真链，用本地 sheet 展示完整链上字段 + 复制。 */
export function CertExplorerSheet({ label, value, onClose }: { label: string; value: string; onClose: () => void }) {
  const { t, showToast } = useApp();

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => showToast(t('已复制')));
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet task-panel-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('在区块浏览器查看')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: '4px 4px 20px' }}>
          <div style={{ font: 'var(--ku-text-caption)', color: 'var(--ku-color-text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
          <div style={{ fontFamily: 'var(--ku-font-mono)', fontSize: 13, color: 'var(--ku-color-text-primary)', wordBreak: 'break-all', lineHeight: 1.6 }}>
            {value}
          </div>
          <button type="button" className="planet-confirm-btn" style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={copy}>
            <Copy size={15} strokeWidth={2.2} />
            {t('复制')}
          </button>
        </div>
      </div>
    </div>
  );
}
