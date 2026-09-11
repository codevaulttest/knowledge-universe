import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ChevronRight, Download, Info, Link2, Share2, X } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Post } from '../types';
import { ShareRulesSheet } from './ShareRulesSheet';

/** 分享商品：链接 + 二维码原型，同屏展示。扫码跳转逻辑尚未实现，链接调起系统分享面板（不支持时降级为复制），二维码支持保存到相册，两者指向同一个 mock 链接。 */
export function ShopItemShareSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const { t, showToast } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const shareLink = `https://wisverse.invalid/shop/${post.id}`;

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    const size = 320;
    const captionHeight = 56;
    QRCode.toDataURL(shareLink, {
      width: size,
      margin: 1,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    }).then(rawUrl => {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size + captionHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, size, size);
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t('用「知识宇宙」App 扫一扫'), size / 2, size + captionHeight / 2);
        setQrDataUrl(canvas.toDataURL('image/png'));
      };
      img.src = rawUrl;
    });
    return () => { cancelled = true; };
  }, [shareLink, t]);

  const handleShareLink = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: post.title, url: shareLink });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // 系统分享面板不可用时降级为复制链接
      }
    }
    navigator.clipboard.writeText(shareLink).then(() => showToast(t('链接已复制'))).catch(() => {});
  };

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
    <>
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet shop-share-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('分享商品')}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label={t('关闭')}><X size={18} strokeWidth={2} /></button>
        </div>

        <p className="shop-share-title">{post.title}</p>

        <div className="shop-share-link-card">
          <Link2 size={16} strokeWidth={2} aria-hidden="true" />
          <span className="shop-share-link-text">{shareLink}</span>
        </div>
        <button type="button" className="shop-share-cta-btn" onClick={handleShareLink}>
          <Share2 size={16} strokeWidth={2} />
          {t('分享链接')}
        </button>

        <div className="shop-share-qr-row">
          <div className="shop-share-qr-card">
            {qrDataUrl && <img src={qrDataUrl} alt={t('商品二维码')} className="shop-share-qr-img" />}
          </div>
          <p className="shop-share-qr-hint">{t('使用「知识宇宙」App 扫一扫，识别二维码直达商品')}</p>
        </div>
        <button type="button" className="shop-share-cta-btn shop-share-cta-btn--secondary" onClick={handleSave} disabled={!qrDataUrl}>
          <Download size={16} strokeWidth={2} />
          {t('保存二维码')}
        </button>

        <button
          type="button"
          className="bsp-rules-entry task-panel-rules-entry--neutral"
          onClick={() => setRulesOpen(true)}
          aria-label={t('了解分享人分账规则')}
        >
          <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
          <span className="bsp-rules-entry-text">{t('了解分享人分账规则')}</span>
          <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
        </button>
      </div>
    </div>
    {rulesOpen && <ShareRulesSheet onClose={() => setRulesOpen(false)} />}
    </>
  );
}
