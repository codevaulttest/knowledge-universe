import { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QRCode from 'qrcode';
import BoringAvatar from 'boring-avatars';
import { ArrowLeft, Download, Share, Star } from 'lucide-react';
import { useApp } from '../AppContext';
import { NODE_STARS_BY_CODE } from '../mockData';
import type { Channel } from '../types';
import { Avatar, Rating } from './shared';
import { AVATAR_COLORS, STAR_COLORS } from './shared';

const QR_SIZE = 320;
const CARD_WIDTH = 390;
const CAPTION_HEIGHT = 56;
const CARD_AVATAR_SIZE = 60;
const CARD_FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

/** 分享频道页：页面本身用 DOM 展示名片，保存与系统分享时把同一份内容画成一张 PNG。扫码跳转逻辑尚未实现，二维码指向 mock 链接。 */
export function ChannelShareSheet({ channel, onClose }: { channel: Channel; onClose: () => void }) {
  const { t, showToast } = useApp();
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const shareLink = `https://wisverse.invalid/channel/${channel.id}`;
  const nodeCode = channel.nodeCode ?? channel.id.slice(-6).toUpperCase();
  const nodeStars = NODE_STARS_BY_CODE[nodeCode] ?? 1;
  const caption = t('用「知识宇宙」App 扫一扫');

  useEffect(() => {
    let cancelled = false;
    setQrUrl(null);
    // 中心放 logo，用最高容错等级保证遮挡后仍可识别
    Promise.all([
      QRCode.toDataURL(shareLink, { width: QR_SIZE, margin: 0, errorCorrectionLevel: 'H', color: { dark: '#1a1a1a', light: '#ffffff' } }).then(loadImage),
      loadImage('/img/ku-favicon.png'),
    ]).then(([qrImg, logoImg]) => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = QR_SIZE;
      canvas.height = QR_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(qrImg, 0, 0, QR_SIZE, QR_SIZE);
      drawLogo(ctx, logoImg, 0, 0);
      setQrUrl(canvas.toDataURL('image/png'));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [shareLink]);

  /** 把名片画成 PNG：头部与描述贴左边缘，二维码居中，底部是扫码说明 */
  const buildCardImage = async () => {
    const generatedAvatarSrc = () => {
      let svg = renderToStaticMarkup(
        <BoringAvatar size={CARD_AVATAR_SIZE * 2} name={channel.avatarSeed ?? '0'} variant="beam" colors={AVATAR_COLORS} square />,
      );
      if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };
    const starSrc = () => {
      let svg = renderToStaticMarkup(
        <Star size={40} fill={STAR_COLORS[nodeStars] ?? STAR_COLORS[0]} strokeWidth={0} />,
      );
      if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };
    const [qrImg, avatarImg, logoImg, starImg] = await Promise.all([
      QRCode.toDataURL(shareLink, { width: QR_SIZE, margin: 0, errorCorrectionLevel: 'H', color: { dark: '#1a1a1a', light: '#ffffff' } }).then(loadImage),
      channel.avatarUrl
        ? loadImage(channel.avatarUrl).catch(() => loadImage(generatedAvatarSrc()))
        : loadImage(generatedAvatarSrc()),
      loadImage('/img/ku-favicon.png'),
      loadImage(starSrc()),
    ]);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 按宽度断行，超出行数上限时末行截断加省略号
    const wrap = (text: string, width: number, maxLines: number) => {
      const out: string[] = [];
      let line = '';
      for (const ch of Array.from(text)) {
        if (ctx.measureText(line + ch).width > width) {
          out.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
      if (line) out.push(line);
      if (out.length > maxLines) {
        let last = out[maxLines - 1];
        while (last && ctx.measureText(last + '…').width > width) last = last.slice(0, -1);
        out.splice(maxLines - 1, out.length - maxLines + 1, last + '…');
      }
      return out;
    };

    const textX = CARD_AVATAR_SIZE + 14;
    ctx.font = `700 22px ${CARD_FONT}`;
    const nameLines = wrap(channel.name, CARD_WIDTH - textX, 2);
    const lineHeight = 28;
    const codeHeight = 24;
    const textBlock = nameLines.length * lineHeight + codeHeight;
    const headerHeight = Math.max(CARD_AVATAR_SIZE, textBlock);
    ctx.font = `400 16px ${CARD_FONT}`;
    const descLines = channel.description ? wrap(channel.description, CARD_WIDTH, 2) : [];
    const descLineHeight = 24;
    const descTop = headerHeight + (descLines.length ? 14 : 0);
    const qrTop = descTop + descLines.length * descLineHeight + 20;

    canvas.width = CARD_WIDTH;
    canvas.height = qrTop + QR_SIZE + CAPTION_HEIGHT;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const avatarTop = (headerHeight - CARD_AVATAR_SIZE) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(CARD_AVATAR_SIZE / 2, avatarTop + CARD_AVATAR_SIZE / 2, CARD_AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, 0, avatarTop, CARD_AVATAR_SIZE, CARD_AVATAR_SIZE);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textTop = (headerHeight - textBlock) / 2;
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `700 22px ${CARD_FONT}`;
    nameLines.forEach((l, i) => ctx.fillText(l, textX, textTop + lineHeight / 2 + i * lineHeight));
    ctx.fillStyle = '#5d6d85';
    ctx.font = `500 16px ${CARD_FONT}`;
    const codeY = textTop + nameLines.length * lineHeight + codeHeight / 2;
    const starSize = 20;
    ctx.drawImage(starImg, textX, codeY - starSize / 2, starSize, starSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.floor(starSize * 0.4)}px ${CARD_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(nodeStars), textX + starSize / 2, codeY);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5d6d85';
    ctx.font = `500 16px ${CARD_FONT}`;
    ctx.fillText(nodeCode, textX + starSize + 6, codeY);
    ctx.font = `400 16px ${CARD_FONT}`;
    descLines.forEach((l, i) => ctx.fillText(l, 0, descTop + descLineHeight / 2 + i * descLineHeight));

    const qrLeft = (CARD_WIDTH - QR_SIZE) / 2;
    ctx.drawImage(qrImg, qrLeft, qrTop, QR_SIZE, QR_SIZE);
    drawLogo(ctx, logoImg, qrLeft, qrTop);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#5d6d85';
    ctx.font = `500 18px ${CARD_FONT}`;
    ctx.fillText(caption, CARD_WIDTH / 2, qrTop + QR_SIZE + CAPTION_HEIGHT / 2);
    return canvas.toDataURL('image/png');
  };

  const handleSave = async () => {
    const dataUrl = await buildCardImage();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${channel.id}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t('二维码已保存到相册'));
  };

  const handleShareQr = async () => {
    const dataUrl = await buildCardImage();
    if (!dataUrl) return;
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `${channel.id}-qrcode.png`, { type: 'image/png' });
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: channel.name });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // 系统分享面板不可用时降级为保存二维码
      }
    }
    handleSave();
  };

  return (
    <div className="sheet-backdrop full-page-flow" onClick={onClose}>
      <div className="payment-sheet channel-share-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header sheet-header--centered">
          <button type="button" className="sheet-header-back" onClick={onClose} aria-label={t('返回')}>
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <span className="sheet-title sheet-title--centered">{t('分享频道')}</span>
          <div className="sheet-header-spacer" aria-hidden />
        </div>

        <div className="channel-share-card">
          <div className="channel-share-identity">
            <Avatar index={0} seed={channel.avatarSeed} avatarUrl={channel.avatarUrl} />
            <div className="channel-share-identity-text">
              <span className="channel-share-name">{channel.name}</span>
              <span className="channel-share-code">
                <Rating value={nodeStars} size={20} />
                {nodeCode}
              </span>
            </div>
          </div>
          {channel.description && (
            <p className="channel-share-desc">{channel.description}</p>
          )}
          <div className="channel-share-qr-row">
            {qrUrl && <img src={qrUrl} alt={t('频道二维码')} className="channel-share-qr-img" />}
          </div>
          <p className="channel-share-caption">{caption}</p>
        </div>

        <button type="button" className="channel-share-cta-btn" onClick={handleShareQr} disabled={!qrUrl}>
          <Share size={16} strokeWidth={2} />
          {t('分享二维码')}
        </button>
        <button type="button" className="channel-share-copy-btn" onClick={handleSave} disabled={!qrUrl}>
          <Download size={16} strokeWidth={2} />
          {t('保存二维码')}
        </button>
      </div>
    </div>
  );
}

/** 二维码中心的 App logo：先垫一层白底圆角方块，再画 favicon */
function drawLogo(ctx: CanvasRenderingContext2D, logoImg: HTMLImageElement, qrLeft: number, qrTop: number) {
  const box = 64;
  const r = 12;
  const x = qrLeft + (QR_SIZE - box) / 2;
  const y = qrTop + (QR_SIZE - box) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + box, y, x + box, y + box, r);
  ctx.arcTo(x + box, y + box, x, y + box, r);
  ctx.arcTo(x, y + box, x, y, r);
  ctx.arcTo(x, y, x + box, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.drawImage(logoImg, x + 4, y + 4, box - 8, box - 8);
}
