import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, X } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Post } from '../types';

/** 分享商品的二维码原型：扫码跳转逻辑尚未实现，这里先落地生成二维码 + 保存到相册的交互。 */
export function ShopItemShareSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const { t, showToast } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    QRCode.toDataURL(`wisverse://shop/${post.id}`, {
      width: 320,
      margin: 1,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    }).then(url => { if (!cancelled) setQrDataUrl(url); });
    return () => { cancelled = true; };
  }, [post.id]);

  const handleSave = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${post.id}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t('二维码已保存到相册'));
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet shop-share-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('分享商品')}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label={t('关闭')}><X size={18} strokeWidth={2} /></button>
        </div>

        <p className="shop-share-title">{post.title}</p>

        <div className="shop-share-qr-card">
          {qrDataUrl && <img src={qrDataUrl} alt={t('商品二维码')} className="shop-share-qr-img" />}
        </div>

        <p className="shop-share-hint">{t('使用「知识宇宙」App 扫一扫，识别二维码直达商品')}</p>

        <button type="button" className="shop-share-save-btn" onClick={handleSave} disabled={!qrDataUrl}>
          <Download size={16} strokeWidth={2} />
          {t('保存到相册')}
        </button>
      </div>
    </div>
  );
}
