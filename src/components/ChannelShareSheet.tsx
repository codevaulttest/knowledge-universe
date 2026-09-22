import { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QRCode from 'qrcode';
import BoringAvatar from 'boring-avatars';
import { Download, Link2, X } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Channel } from '../types';
import { AVATAR_COLORS } from './shared';

/** 分享频道：二维码名片（头像、频道名、节点码、二维码）为主，扫码跳转逻辑尚未实现，链接通过文字按钮复制，二维码支持保存到相册，两者指向同一个 mock 链接。 */
export function ChannelShareSheet({ channel, onClose }: { channel: Channel; onClose: () => void }) {
  const { t, showToast } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const shareLink = `https://wisverse.invalid/channel/${channel.id}`;
  const nodeCode = channel.nodeCode ?? channel.id.slice(-6).toUpperCase();

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    const size = 320;
    const captionHeight = 56;
    const avatarSize = 60;
    const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    const generatedAvatarSrc = () => {
      let svg = renderToStaticMarkup(
        <BoringAvatar size={avatarSize * 2} name={channel.avatarSeed ?? '0'} variant="beam" colors={AVATAR_COLORS} square />,
      );
      if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };
    const loadAvatar = () => (channel.avatarUrl
      ? loadImage(channel.avatarUrl).catch(() => loadImage(generatedAvatarSrc()))
      : loadImage(generatedAvatarSrc()));

    Promise.all([
      // 中心放 logo，用最高容错等级保证遮挡后仍可识别
      QRCode.toDataURL(shareLink, { width: size, margin: 0, errorCorrectionLevel: 'H', color: { dark: '#1a1a1a', light: '#ffffff' } }).then(loadImage),
      loadAvatar(),
      loadImage('/img/ku-favicon.png'),
    ]).then(([qrImg, avatarImg, logoImg]) => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const fontFamily = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';
      const pad = 0;
      const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };
      // 头部：左侧圆形头像，右侧频道名（最多两行）+ 节点码
      const textX = pad + avatarSize + 14;
      const maxWidth = size - textX - pad;
      ctx.font = `700 22px ${fontFamily}`;
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
      const lineHeight = 28;
      const codeHeight = 24;
      const textBlock = lines.length * lineHeight + codeHeight;
      const headerHeight = Math.max(avatarSize, textBlock);
      const headerTop = pad;
      const qrTop = headerTop + headerHeight + 20;
      canvas.width = size;
      canvas.height = qrTop + size + captionHeight;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const avatarTop = headerTop + (headerHeight - avatarSize) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(pad + avatarSize / 2, avatarTop + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, pad, avatarTop, avatarSize, avatarSize);
      ctx.restore();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const textTop = headerTop + (headerHeight - textBlock) / 2;
      ctx.fillStyle = '#1a1a1a';
      ctx.font = `700 22px ${fontFamily}`;
      lines.forEach((l, i) => ctx.fillText(l, textX, textTop + lineHeight / 2 + i * lineHeight));
      ctx.fillStyle = '#5d6d85';
      ctx.font = `500 16px ${fontFamily}`;
      ctx.fillText(nodeCode, textX, textTop + lines.length * lineHeight + codeHeight / 2);

      ctx.drawImage(qrImg, 0, qrTop, size, size);
      const logoBox = 64;
      const logoX = (size - logoBox) / 2;
      const logoY = qrTop + (size - logoBox) / 2;
      ctx.fillStyle = '#ffffff';
      roundRect(logoX, logoY, logoBox, logoBox, 12);
      ctx.fill();
      ctx.drawImage(logoImg, logoX + 4, logoY + 4, logoBox - 8, logoBox - 8);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#5d6d85';
      ctx.font = `500 18px ${fontFamily}`;
      ctx.fillText(t('用「知识宇宙」App 扫一扫'), size / 2, qrTop + size + captionHeight / 2);
      setQrDataUrl(canvas.toDataURL('image/png'));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [shareLink, channel.name, channel.avatarUrl, channel.avatarSeed, nodeCode, t]);

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
