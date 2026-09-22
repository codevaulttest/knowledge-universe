import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Link2, X } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Channel } from '../types';

/** 分享频道：链接 + 二维码名片，同屏展示。扫码跳转逻辑尚未实现，链接通过文字按钮复制，二维码支持保存到相册，两者指向同一个 mock 链接。 */
export function ChannelShareSheet({ channel, onClose }: { channel: Channel; onClose: () => void }) {
  const { t, showToast } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const shareLink = `https://wisverse.invalid/channel/${channel.id}`;

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
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const fontFamily = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';
        // 频道名放在二维码上方，最多两行，超出截断加省略号
        ctx.font = `700 24px ${fontFamily}`;
        const maxWidth = size - 40;
        const lines: string[] = [];
        let line = '';
        for (const ch of Array.from(channel.name)) {
          if (ctx.measureText(line + ch).width > maxWidth) {
            lines.push(line);
            line = ch;
          } else {
            line += ch;
          }
        }
        if (line) lines.push(line);
        if (lines.length > 2) {
          let second = lines[1];
          while (second && ctx.measureText(second + '…').width > maxWidth) second = second.slice(0, -1);
          lines.splice(1, lines.length - 1, second + '…');
        }
        const lineHeight = 32;
        const nameHeight = 24 + lines.length * lineHeight;
        canvas.width = size;
        canvas.height = nameHeight + size + captionHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a1a1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 24px ${fontFamily}`;
        lines.forEach((l, i) => ctx.fillText(l, size / 2, 20 + lineHeight / 2 + i * lineHeight));
        ctx.drawImage(img, 0, nameHeight, size, size);
        ctx.font = `600 20px ${fontFamily}`;
        ctx.fillText(t('用「知识宇宙」App 扫一扫'), size / 2, nameHeight + size + captionHeight / 2);
        setQrDataUrl(canvas.toDataURL('image/png'));
      };
      img.src = rawUrl;
    });
    return () => { cancelled = true; };
  }, [shareLink, channel.name, t]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => showToast(t('链接已复制'))).catch(() => {});
  };

  const handleSave = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${channel.id}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t('二维码已保存到相册'));
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet channel-share-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('分享频道')}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label={t('关闭')}><X size={18} strokeWidth={2} /></button>
        </div>

        <div className="channel-share-qr-row">
          <div className="channel-share-qr-card">
            {qrDataUrl && <img src={qrDataUrl} alt={t('频道二维码')} className="channel-share-qr-img" />}
          </div>
        </div>
        <button type="button" className="channel-share-cta-btn" onClick={handleSave} disabled={!qrDataUrl}>
          <Download size={16} strokeWidth={2} />
          {t('保存二维码')}
        </button>
        <button type="button" className="channel-share-copy-btn" onClick={handleCopyLink}>
          <Link2 size={16} strokeWidth={2} />
          {t('复制链接')}
        </button>
      </div>
    </div>
  );
}
