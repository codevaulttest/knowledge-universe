import { useRef, useState, type PointerEvent as ReactPointerEvent, useEffect, type ReactNode } from 'react';
import { Lock, X, ArrowLeft, Play, Pause, ChevronRight, Maximize, Minimize, Volume2, VolumeX, MessageCircle, Repeat2, ThumbsUp, Bookmark, Check, HandCoins, Gift, Plus, Save, Wallet, Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_POSTS, ALL_USERS_MOCK, CURRENT_USER, findRegisteredUserByAddress } from '../mockData';
import { KnowledgePlanetIcon } from './KnowledgePlanetIcon';
import { withFreeTier } from '../channelTiers';
import { ChannelTierName } from './ChannelTierMedal';
import { Avatar, AuthorName, Rating, GeminiNodeBadge } from './shared';
import { Actions } from './PostCard';
import { isChinese, localizeTime } from '../i18n';
import { formatCount } from '../formatCount';
import type { Channel, ChannelTier, InteractionAction, PayCtx, PbUse, PbWalletId, Post, PostAction, SupTransactionReason } from '../types';
import { formatSuperAmount, formatSupAmount, stakeTierDescription, SUPER_BY_TIER, SUP_COST_BY_TIER } from '../stakeConfig';
import type { StakeTier } from '../types';
import { PbWalletPicker } from './PbWalletPicker';
import { CHANNEL_OPEN_PB_COST, walletConsumesSup } from '../walletConfig';
import { shortenAddress } from '../formatAddress';


// Lightbox photo backgrounds — local SVG illustrations, same order as img-grid-cell nth-child
// index 映射的占位图源（帖子未显式给 images 时回退）
const IMG_FALLBACK_SRC = [
  '/img/p1.svg', '/img/p2.svg', '/img/p3.svg', '/img/p4.svg', '/img/p5.svg',
  '/img/p6.svg', '/img/p7.svg', '/img/p8.svg', '/img/p9.svg',
];
// lightbox 显示完整原图不裁切：contain 居中，黑底衬边，比例跟随图片自身
function lightboxBg(src: string): React.CSSProperties {
  return {
    backgroundColor: '#000',
    backgroundImage: `url('${src}')`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
  };
}
const IMG_LABELS = ['图片 1', '图片 2', '图片 3', '图片 4', '图片 5', '图片 6', '图片 7', '图片 8', '图片 9'];

function payCtxToSupReason(payCtx: PayCtx): SupTransactionReason {
  if (payCtx.ctx === 'interaction' && payCtx.action) return payCtx.action;
  if (payCtx.ctx === 'chain') return 'chain_unlock';
  if (payCtx.ctx === 'repost') return 'repost';
  return 'post';
}

function payCtxToPbUse(payCtx: PayCtx): PbUse {
  if (payCtx.ctx === 'interaction' && payCtx.action) return payCtx.action;
  if (payCtx.ctx === 'chain') return 'unlock';
  if (payCtx.ctx === 'repost') return 'share';
  return 'post';
}

export function ImageLightbox({ post, initialIndex, visibleImgCount, onClose }: {
  post: Post;
  initialIndex: number;
  visibleImgCount: number;
  onClose: () => void;
}) {
  const { openLink, t } = useApp();
  const [idx, setIdx] = useState(initialIndex);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  // 首次移动超过阈值后锁定手势方向：横向切图 / 纵向下滑关闭，避免斜滑时两种手势打架
  const dragAxis = useRef<'x' | 'y' | null>(null);
  const total = post.imageCount ?? 3;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragStartX.current = event.clientX;
    dragStartY.current = event.clientY;
    dragAxis.current = null;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null || dragStartY.current === null) return;
    const dx = event.clientX - dragStartX.current;
    const dy = event.clientY - dragStartY.current;
    if (dragAxis.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      dragAxis.current = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
    }
    if (dragAxis.current === 'x') {
      let delta = dx;
      // 拖到首/末张时做橡皮筋阻尼，暗示已到边界
      if (idx === 0 && delta > 0) delta /= 3;
      if (idx === total - 1 && delta < 0) delta /= 3;
      setDragX(delta);
    } else {
      // 只允许向下滑关闭；向上做强阻尼，避免图片被拖飞
      setDragY(dy > 0 ? dy : dy / 4);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null || dragStartY.current === null) return;
    const dx = event.clientX - dragStartX.current;
    const dy = event.clientY - dragStartY.current;
    const axis = dragAxis.current;
    dragStartX.current = null;
    dragStartY.current = null;
    dragAxis.current = null;
    setIsDragging(false);
    setDragX(0);
    setDragY(0);

    if (axis === 'y') {
      if (dy > 100) onClose(); // 下滑足够远即关闭
      return;
    }
    if (dx < -40) {
      setIdx(current => Math.min(current + 1, total - 1));
    } else if (dx > 40) {
      setIdx(current => Math.max(current - 1, 0));
    }
  };

  const handlePointerCancel = () => {
    dragStartX.current = null;
    dragStartY.current = null;
    dragAxis.current = null;
    setIsDragging(false);
    setDragX(0);
    setDragY(0);
  };

  const handleUnlock = () => {
    onClose();
    openLink(post.id);
  };

  return (
    <div
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('查看图片')}
      // 下滑过程中背景随位移渐隐，给出"即将关闭"的反馈
      style={dragY > 0 ? { opacity: 1 - Math.min(dragY / 600, 0.35) } : undefined}
    >
      {/* 沉浸式看图：无任何 chrome——左右滑切图，向下滑关闭 */}
      {/* Stage */}
      <div
        className="lightbox-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          className="lightbox-track"
          style={{
            transform: `translateX(calc(${-idx * 100}% + ${dragX}px)) translateY(${dragY}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {Array.from({ length: total }).map((_, i) => {
            const slideLocked = i >= visibleImgCount;
            return (
              <div className="lightbox-media" key={i}>
                <div
                  className={`lightbox-img${slideLocked ? ' lightbox-img--locked' : ''}`}
                  style={lightboxBg(post.images?.[i] ?? IMG_FALLBACK_SRC[i % IMG_FALLBACK_SRC.length])}
                  aria-label={IMG_LABELS[i]}
                />
                {slideLocked && (
                  <div className="img-lock-overlay lightbox-lock-overlay">
                    <KnowledgePlanetIcon className="img-lock-pattern" />
                    <button type="button" className="img-lock-badge" onClick={handleUnlock}>
                      <Lock size={13} strokeWidth={2.5} aria-hidden="true" />
                      <span>{t('解锁')}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

export function PaymentSheet({ payCtx, onSuccess, onClose }: {
  payCtx: PayCtx; onSuccess: () => void; onClose: () => void;
}) {
  const { t, posts, payPb } = useApp();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const [failReason, setFailReason] = useState('');
  const tier = payCtx.stakeTier;
  const relatedPost = payCtx.postId ? posts.find(p => p.id === payCtx.postId) : null;
  // 产生节点时同步扣除 SUP（SUP 链原生代币，千分之一比例）
  const supCost = tier > 0 ? SUP_COST_BY_TIER[tier as Exclude<StakeTier, 0>] : 0;
  const pbUse = payCtxToPbUse(payCtx);
  const [payWallet, setPayWallet] = useState<PbWalletId | null>(null);

  const titles: Record<PayCtx['ctx'], string> = {
    post:   t('发布知识宇宙节点'),
    chain:  t('解锁全文'),
    repost: t('转发并创建子节点'),
    interaction: t('参与知识宇宙'),
  };

  const interactionLabels: Record<InteractionAction, [string, string]> = {
    comment: [t('评论'), t('评论并创建子节点')],
    share: [t('转发'), t('转发并创建子节点')],
    like: [t('点赞2'), t('点赞并创建子节点')],
    dislike: [t('踩2'), t('踩并创建子节点')],
    save: [t('收藏2'), t('收藏并创建子节点')],
    unlock: [t('解锁'), t('解锁并创建子节点')],
    partner: [t('加入合伙人'), t('加入合伙人并创建子节点')],
  };

  const sheetTitle = payCtx.ctx === 'interaction' && payCtx.action
    ? interactionLabels[payCtx.action][1]
    : titles[payCtx.ctx];

  const pay = () => {
    if (tier > 0 && (!payWallet || !payPb({ amount: tier, use: pbUse, wallet: payWallet, supCost, supReason: payCtxToSupReason(payCtx) }))) {
      setFailReason(t('所选钱包余额不足或不适用于此操作'));
      setStatus('failed');
      return;
    }
    setStatus('loading');
    setTimeout(() => {
      setStatus('done');
      setTimeout(onSuccess, 700);
    }, 1300);
  };

  return (
    <div className="sheet-backdrop" onClick={status === 'loading' ? undefined : onClose}>
      <div className="payment-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{sheetTitle}</span>
          <button type="button" className="modal-close" onClick={onClose} disabled={status === 'loading'} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {relatedPost && (
          <div className="link-modal-post">
            <div className="gemini-left">
              <KnowledgePlanetIcon className="gemini-icon" />
              <span className="gemini-label">{t('知识宇宙')}</span>
              <span className="gemini-sep">·</span>
              <Rating value={relatedPost.rating} />
              <span className="gemini-sep">·</span>
              <span className="gemini-id">{relatedPost.nodeId}</span>
            </div>
          </div>
        )}

        {tier > 0 && (
          <PbWalletPicker use={pbUse} amount={tier} value={payWallet} onChange={setPayWallet} />
        )}

        {tier > 0 && (
          <div className="pay-combo-breakdown">
            <div className="pay-combo-row">
              <span className="pay-combo-label">{t('PB 消耗')}</span>
              <span className="pay-combo-value">{formatSuperAmount(tier)} PB</span>
            </div>
            <div className="pay-combo-row">
              <span className="pay-combo-label">{t('SUP 消耗')}</span>
              <span className="pay-combo-value">{formatSupAmount(supCost)} SUP</span>
            </div>
            <p className="pay-combo-hint">
              {t('将扣除 PB，并同步扣除站内 SUP')}
            </p>
          </div>
        )}

        {status === 'idle' && (
          <button type="button" className="planet-confirm-btn" onClick={pay}>
            {tier > 0
              ? `${t('支付')} · ${formatSuperAmount(tier)} PB + ${formatSupAmount(supCost)} SUP`
              : t('确认支付')}
          </button>
        )}

        {status === 'loading' && (
          <div className="pay-status">
            <span className="spinner" />
            <span>{t('支付中…')}</span>
          </div>
        )}

        {status === 'done' && (
          <div className="pay-status pay-status--done">
            <span className="pay-check">✓</span>
            <span>{t('支付成功')}</span>
          </div>
        )}

        {status === 'failed' && (
          <div className="pay-status pay-status--failed">
            <span className="pay-fail-icon">✕</span>
            <span className="pay-fail-reason">{failReason}</span>
            <button
              type="button"
              className="pay-retry-btn"
              onClick={() => setStatus('idle')}
            >
              {t('重试')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const INTERACTION_ACTION_LABEL: Record<InteractionAction, [string, string]> = {
  comment: ['评论', 'Comment'],
  share: ['转发', 'Repost'],
  like: ['点赞', 'Like'],
  dislike: ['踩', 'Dislike'],
  save: ['收藏', 'Save'],
  unlock: ['解锁', 'Unlock'],
  partner: ['成为合伙人', 'Become a partner'],
};

export function GeminiStakeModal({
  post,
  mode = 'default',
  presetComment,
  onParticipate,
  onSkip,
  onClose,
}: {
  post: Post;
  mode?: 'default' | 'partner';
  /** 详情页已写好的评论：隐藏二次输入，确认时直接带上 */
  presetComment?: string;
  onParticipate: (tier: Exclude<StakeTier, 0>, commentText?: string) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  const isPartner = mode === 'partner';
  const hasPresetComment = Boolean(presetComment?.trim());
  const [selected, setSelected] = useState<Exclude<StakeTier, 0>>(10);
  const [commentText, setCommentText] = useState('');
  const tiers: Exclude<StakeTier, 0>[] = [10, 100, 1000];
  const canConfirm = !isPartner || hasPresetComment || commentText.trim().length > 0;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="gemini-stake-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{isPartner ? t('加入合伙人') : t('同步创建子节点')}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <p className="gemini-stake-lead">
          {isPartner
            ? (hasPresetComment
              ? t('选择面额成为合伙人，或仅发表评论')
              : t('选择面额并评论，链接该帖成为合伙人'))
            : t('该帖子已参与知识宇宙，选择面额后同步链接创建子节点')}
        </p>

        <div className="stake-tier-list stake-tier-list--row" style={{ marginBottom: 8 }}>
          {tiers.map(tier => (
            <button
              key={tier}
              type="button"
              className={`stake-tier-option${selected === tier ? ' stake-tier-option--active' : ''}`}
              onClick={() => setSelected(tier)}
            >
              <span className="stake-tier-option__amount">
                <span className="stake-tier-option__value">{tier}</span>
                <span className="stake-tier-option__unit">PB</span>
              </span>
            </button>
          ))}
        </div>
        <div className="compose-stake-gas" style={{ marginBottom: 16 }}>
          <span className="compose-stake-gas-label">{t('Gas 费')}</span>
          <span className="compose-stake-gas-value">{SUP_COST_BY_TIER[selected]} SUP</span>
        </div>

        {isPartner && !hasPresetComment && (
          <label className="gemini-stake-comment">
            <span className="gemini-stake-comment-label">{t('写评论加入合伙人')}</span>
            <textarea
              className="gemini-stake-comment-input"
              rows={3}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder={t('回复 {author}…', { author: post.displayAuthorName ?? post.author })}
            />
          </label>
        )}

        <button
          type="button"
          className="gemini-stake-btn gemini-stake-btn--primary"
          disabled={!canConfirm}
          onClick={() => onParticipate(
            selected,
            isPartner ? (presetComment?.trim() || commentText.trim()) : undefined,
          )}
        >
          {isPartner
            ? t('加入合伙人 · {selected} PB', { selected })
            : t('创建子节点 · {selected} PB', { selected })}
        </button>
        {(!isPartner || hasPresetComment) && (
          <button type="button" className="gemini-stake-btn gemini-stake-btn--secondary" onClick={onSkip}>
            {hasPresetComment ? t('仅评论') : t('不参与')}
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PaymentConfirmPage — 全页支付确认（内部组件）
// ═══════════════════════════════════════════════════════════════

const MOCK_WALLET_ADDR = '0xB6E546209F774f5F0307cF68b8c1998B1E2d0C85';
const MOCK_NETWORK     = 'BSC';

function FeeLabelTooltip({ label, tip }: { label: string; tip: string }) {
  return (
    <span
      className="fee-tooltip"
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${tip}`}
    >
      <span className="fee-tooltip-trigger pay-page-row-label">{label}</span>
      <span className="fee-tooltip-bubble" role="tooltip">{tip}</span>
    </span>
  );
}

function PaymentConfirmPage({
  pageStep,
  icon,
  productName,
  remark,
  amountText,
  networkFee,
  tokenFee,
  gasFee,
  walletId,
  failReason,
  onConfirm,
  onRetry,
  onBack,
}: {
  pageStep: 'confirm' | 'paying' | 'done' | 'failed';
  icon: ReactNode;
  productName: string;
  remark: string;
  amountText: string;
  networkFee: string;
  tokenFee: string;
  gasFee?: string;
  walletId?: PbWalletId | null;
  failReason?: string;
  onConfirm: () => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  const { t, pbWallets } = useApp();
  const isPaying = pageStep === 'paying';
  const isDone   = pageStep === 'done';
  const isFailed = pageStep === 'failed';

  return (
    <div className="pay-page-wrap">
      {/* Gradient header */}
      <div className="pay-page-header">
        <div className="pay-page-header-spacer" aria-hidden />
        <span className="pay-page-header-title">{t('确认支付2')}</span>
        <div className="pay-page-header-spacer" aria-hidden />
      </div>

      {/* Brand circle overlapping the header gradient */}
      <div className="pay-page-brand-row">
        <div className="pay-page-brand-circle">{icon}</div>
      </div>

      {/* Confirm / Paying state */}
      {(pageStep === 'confirm' || isPaying) && (
        <>
          <div className="pay-page-hero">
            <span className="pay-page-hero-amount">{amountText}</span>
          </div>

          <div className="pay-page-sep" aria-hidden />

          <div className="pay-page-rows">
            <div className="pay-page-row">
              <span className="pay-page-row-label">{t('商品名称')}</span>
              <span className="pay-page-row-value">{productName}</span>
            </div>
            <div className="pay-page-row">
              <span className="pay-page-row-label">{t('备注')}</span>
              <span className="pay-page-row-value">{remark}</span>
            </div>
            <div className="pay-page-row">
              <span className="pay-page-row-label">{t('钱包地址')}</span>
              <span className="pay-page-row-value pay-page-addr">{MOCK_WALLET_ADDR}</span>
            </div>
            <div className="pay-page-row">
              <span className="pay-page-row-label">{t('余额')}</span>
              <span className="pay-page-row-value">{walletId ? `${formatSuperAmount(pbWallets[walletId])} PB` : '—'}</span>
            </div>
            <div className="pay-page-row">
              <span className="pay-page-row-label">{t('网络')}</span>
              <span className="pay-page-row-value">{MOCK_NETWORK}</span>
            </div>
            <div className="pay-page-fee-section">
              <div className="pay-page-row">
                <FeeLabelTooltip
                  label={t('网络手续费')}
                  tip={t('提示文案占位')}
                />
                <span className="pay-page-row-value">{networkFee}</span>
              </div>
              <div className="pay-page-row">
                <FeeLabelTooltip
                  label={t('代币手续费')}
                  tip={t('提示文案占位')}
                />
                <span className="pay-page-row-value">{tokenFee}</span>
              </div>
              {gasFee != null && (
                <div className="pay-page-row">
                  <span className="pay-page-row-label">{t('Gas 费')}</span>
                  <span className="pay-page-row-value">{gasFee}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pay-page-footer">
            <button
              type="button"
              className="pay-page-confirm-btn"
              onClick={onConfirm}
              disabled={isPaying}
            >
              {isPaying
                ? <><span className="spinner pay-page-spinner" />{t('支付中…')}</>
                : t('确定')}
            </button>
            <button
              type="button"
              className="pay-page-reject-btn"
              onClick={onBack}
              disabled={isPaying}
            >
              {t('拒绝')}
            </button>
          </div>
        </>
      )}

      {/* Done state */}
      {isDone && (
        <div className="pay-page-result">
          <div className="pay-page-result-icon pay-page-result-icon--success">
            <Check size={32} strokeWidth={2.5} />
          </div>
          <span className="pay-page-result-title">{t('支付成功')}</span>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="pay-page-result">
          <div className="pay-page-result-icon pay-page-result-icon--error">✕</div>
          <span className="pay-page-result-title">{t('支付失败')}</span>
          {failReason && <p className="pay-page-result-reason">{failReason}</p>}
          <button type="button" className="pay-retry-btn" onClick={onRetry}>
            {t('重试')}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LinkSheet — 链接面额选择 + 支付
// ═══════════════════════════════════════════════════════════════
export function LinkSheet({ post, mode = 'link', onSuccess, onClose }: {
  post: Post;
  mode?: 'link' | 'unlock';
  onSuccess: (tier: Exclude<StakeTier, 0>) => void;
  onClose: () => void;
}) {
  const { t, language, channels, subscribedChannelTiers, expiredChannelIds, payPb, recordTaskInteraction } = useApp();
  const zh = isChinese(language);
  const [selected, setSelected] = useState<Exclude<StakeTier, 0>>(10);
  const [step, setStep] = useState<'select' | 'confirm' | 'paying' | 'done' | 'failed'>('select');
  const [failReason, setFailReason] = useState('');
  const [payWallet, setPayWallet] = useState<PbWalletId | null>(null);

  const tiers: Exclude<StakeTier, 0>[] = [10, 100, 1000];
  const superAmount = SUPER_BY_TIER[selected];
  const hasHiddenContent = post.visiblePercent < 100;

  // 频道会员门槛：未达标时链接不会解锁内容，不展示「解锁」相关文案（与 PostCard 一致）
  const channel = post.channelId ? channels.find(c => c.id === post.channelId) : undefined;
  const requiredTier = channel ? channel.tiers[post.minTierIndex ?? 0] : undefined;
  const isOwn = post.author === CURRENT_USER;
  const mySubTierIdx = channel && !expiredChannelIds.has(channel.id) ? subscribedChannelTiers[channel.id] : undefined;
  const meetsChannelGate = !requiredTier || (mySubTierIdx != null && mySubTierIdx >= (post.minTierIndex ?? 0));
  const channelLocked = !!requiredTier && !meetsChannelGate && !isOwn;
  const showUnlockCopy = hasHiddenContent && !channelLocked;

  const pay = () => {
    if (!payWallet || !payPb({ amount: selected, use: 'unlock', wallet: payWallet, supCost: SUP_COST_BY_TIER[selected] })) {
      setFailReason(t('所选钱包余额不足或不适用于此操作'));
      setStep('failed');
      return;
    }
    setStep('paying');
    setTimeout(() => {
      setStep('done');
      setTimeout(() => {
        if (mode === 'unlock') recordTaskInteraction(post.id);
        onSuccess(selected);
      }, 800);
    }, 1300);
  };

  // Full-page confirm/paying/done/failed
  if (step !== 'select') {
    return (
      <PaymentConfirmPage
        pageStep={step}
        icon={<div className="pay-page-brand-icon"><KnowledgePlanetIcon style={{ width: 30, height: 30 }} /></div>}
        productName={t('知识宇宙')}
        remark={post.nodeId ? `节点 ${post.nodeId}` : t('知识宇宙')}
        amountText={`${selected} PB`}
        networkFee={`${formatSuperAmount(superAmount)} PB`}
        tokenFee={`${selected} PB`}
        walletId={payWallet}
        failReason={failReason}
        onConfirm={pay}
        onRetry={() => setStep('confirm')}
        onBack={() => setStep('select')}
      />
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="gemini-stake-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">
            {mode === 'unlock' ? t('解锁全部内容') : t('创建子节点并链接')}
          </span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {post.nodeId && (
          <div className="link-modal-post">
            <div className="gemini-left">
              <KnowledgePlanetIcon className="gemini-icon" />
              <span className="gemini-label">{t('知识宇宙')}</span>
              <span className="gemini-sep">·</span>
              <Rating value={post.rating} />
              <span className="gemini-sep">·</span>
              <span className="gemini-id">{post.nodeId}</span>
            </div>
          </div>
        )}

        <p className="gemini-stake-lead">
          {mode === 'unlock'
            ? t('选择面额创建知识宇宙子节点，同步解锁全部内容')
            : t('选择链接面额，在此节点下生成子节点并加入空投激励网络')}
        </p>
        {mode === 'link' && showUnlockCopy && (
          <p className="link-modal-unlock-hint">
            <Check size={14} className="link-modal-unlock-hint__icon" />
            {t('链接后同步解锁本帖全部内容')}
          </p>
        )}
        <div className="stake-tier-list stake-tier-list--row" style={{ marginBottom: 8 }}>
          {tiers.map(tier => (
            <button
              key={tier}
              type="button"
              className={`stake-tier-option${selected === tier ? ' stake-tier-option--active' : ''}`}
              onClick={() => setSelected(tier)}
            >
              <span className="stake-tier-option__amount">
                <span className="stake-tier-option__value">{tier}</span>
                <span className="stake-tier-option__unit">PB</span>
              </span>
            </button>
          ))}
        </div>
        <div className="compose-stake-gas" style={{ marginBottom: 16 }}>
          <span className="compose-stake-gas-label">{t('Gas 费')}</span>
          <span className="compose-stake-gas-value">{SUP_COST_BY_TIER[selected]} SUP</span>
        </div>
        <PbWalletPicker use="unlock" amount={selected} value={payWallet} onChange={setPayWallet} />
        <button type="button" className="gemini-stake-btn gemini-stake-btn--primary" onClick={() => setStep('confirm')}>
          {mode === 'unlock'
            ? t('解锁并创建子节点 · {selected} PB', { selected })
            : showUnlockCopy
              ? t('解锁全文并链接 · {selected} PB', { selected })
              : t('创建子节点并链接 · {selected} PB', { selected })}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ArticleReader — 文章阅读器（支持 N% 可见遮罩）
// ═══════════════════════════════════════════════════════════════
const ARTICLE_CONTENT: Record<string, string> = {
  p2: `# 一文读懂 RAG 技术：原理、应用场景与落地实践

## 什么是 RAG？

RAG（Retrieval-Augmented Generation，检索增强生成）是一种将信息检索与文本生成相结合的技术范式。它通过从外部知识库中检索相关文档片段，将其作为上下文注入到大语言模型中，从而提升生成内容的准确性、时效性和可解释性。

## 核心原理

RAG 的工作流程可以分为三个主要阶段：

### 1. 索引阶段
- 文档切分（Chunking）：将原始文档按段落或语义边界切分为小块
- 向量化（Embedding）：使用嵌入模型将每个块转换为向量表示
- 存储（Indexing）：将向量存入向量数据库（如 Pinecone、Weaviate、Milvus）

### 2. 检索阶段
- 用户输入查询后，同样进行向量化
- 在向量数据库中执行相似度搜索（余弦相似度或欧氏距离）
- 返回 Top-K 最相关的文档片段

### 3. 生成阶段
- 将检索到的文档片段与原始查询拼接为 Prompt
- 输入大语言模型生成最终回答

## 应用场景

- **企业知识库问答**：将内部文档、规范、FAQ 作为知识源，构建智能问答系统
- **客服系统**：实时检索产品手册和历史工单，辅助客服快速响应
- **学术研究**：检索最新论文，辅助文献综述和研究方向探索
- **代码辅助**：检索项目文档和 API 规范，提供更准确的代码建议

## 落地实践要点

1. **分块策略**：块大小直接影响检索质量，建议 256-512 tokens，重叠 10-20%
2. **混合检索**：结合关键词搜索（BM25）和向量搜索，提升召回率
3. **重排序**：对检索结果进行二次排序，过滤不相关内容
4. **Prompt 模板**：设计清晰的指令模板，引导模型正确使用检索内容

## 开源方案推荐

- **LangChain**：最流行的 RAG 框架，提供完整的链式调用
- **LlamaIndex**：专注于数据索引和检索，API 设计简洁
- **Haystack**：生产级框架，支持多种检索器和生成器组合
- **Chroma**：轻量级向量数据库，适合原型开发

## 资源清单

- [LangChain RAG 官方教程](https://python.langchain.com/docs/use_cases/question_answering/)
- [LlamaIndex 入门指南](https://gpt-index.readthedocs.io/)
- [Haystack 文档](https://docs.haystack.deepset.ai/)

> 本文结合多个项目实战经验总结，如有疑问欢迎在评论区交流。`,
  p9: `# 读书笔记 × 可视化：把《思考，快与慢》画成一张图

## 双系统理论概述

丹尼尔·卡尼曼在《思考，快与慢》中提出了著名的双系统理论，将人类的思维模式分为两个系统：

### 系统 1：快思考
- **特点**：自动、直觉、快速、无意识
- **运作方式**：基于经验和模式识别，几乎不消耗认知资源
- **优势**：能够快速做出判断和决策，适合日常简单任务
- **劣势**：容易受到偏见和启发式的影响，导致系统性错误

### 系统 2：慢思考
- **特点**：理性、分析、缓慢、有意识
- **运作方式**：需要主动调动注意力，进行逻辑推理和计算
- **优势**：能够处理复杂问题，纠正系统 1 的错误
- **劣势**：消耗大量认知资源，容易疲劳

## 核心概念图谱

### 1. 启发式与偏见
- **可得性启发式**：高估容易想到的事件的概率
- **代表性启发式**：根据典型性而非概率做判断
- **锚定效应**：初始信息对后续判断产生不成比例的影响
- **确认偏误**：倾向于寻找支持自己已有观点的信息

### 2. 前景理论
- **损失厌恶**：损失带来的痛苦远大于等量收益带来的快乐
- **框架效应**：同一问题的不同表述方式会导致不同决策
- **心理账户**：人们在心里将资金划分到不同账户，影响消费决策

### 3. 峰终定律
- 人们对一段体验的评价主要基于两个时刻：**高峰时刻**（最强烈的感受）和**结束时刻**（最后的感受）

## 可视化概念图

[此处为概念图示意]

将双系统理论的核心概念以思维导图的形式呈现，可以帮助更直观地理解各概念之间的关系。

## 可下载模板

本文附带了可编辑的概念图模板文件，支持以下格式：
- **XMind**（.xmind）
- **MindNode**（.mindnode）
- **PDF 打印版**

> `,
  p10: `# 产品周报到底该怎么写，团队才真的会看？

## 先说结论

多数周报没人看，不是因为大家不重视同步，而是因为内容没有帮助读者更快做判断。

## 我把有效周报拆成三个问题

### 1. 这周最重要的变化是什么？
- 只写 1-3 条真正影响方向的变化
- 每条都要能回答"为什么这值得被知道"

### 2. 哪些地方需要协作或拍板？
- 把需要谁做决定写清楚
- 最好给出建议方案，而不是只抛问题

### 3. 下周最关键的推进点是什么？
- 不求面面俱到
- 重点写会影响节奏和资源配置的事项

## 一个更好用的结构

1. 本周结论
2. 数据变化
3. 风险与决策点
4. 下周重点

## 最后

周报不是留档工具，而是推动团队对齐的沟通接口。`,
};

export function ArticleReader({ post, onClose }: { post: Post; onClose: () => void }) {
  const { openLink, linkedPostIds, navigate, followedAuthors, toggleFollow, language, t } = useApp();
  const isOwn = post.author === CURRENT_USER;
  const [showTip, setShowTip] = useState(false);
  const isLinked = linkedPostIds.has(post.id);
  const unlocked = isOwn || isLinked || post.visiblePercent === 100;
  const content = ARTICLE_CONTENT[post.id] ?? `# ${post.title}\n\n文章内容加载中…`;
  const hasCover = post.articleHasCover !== false;
  const displayTitle = post.title.split('\n')[0]?.trim() || post.title;
  const displayName = post.displayAuthorName ?? post.author;
  const authorMeta = ALL_USERS_MOCK.find(user => user.name === displayName);
  const avatarIdx = authorMeta?.avatarIdx ?? Math.max(0, ALL_POSTS.findIndex(p => p.author === post.author)) % 3;
  const isFollowing = followedAuthors.has(displayName);

  const lines = content.split('\n');
  const visibleLineCount = unlocked ? lines.length : Math.max(1, Math.floor(lines.length * post.visiblePercent / 100));
  const visibleLines = lines.slice(0, visibleLineCount);
  const bodyLines = visibleLines[0]?.startsWith('# ') ? visibleLines.slice(1) : visibleLines;

  const renderLine = (line: string, i: number) => {
    if (line.startsWith('## ')) {
      return <h2 key={i} className="article-h2">{line.slice(3)}</h2>;
    }
    if (line.startsWith('### ')) {
      return <h3 key={i} className="article-h3">{line.slice(4)}</h3>;
    }
    if (line.startsWith('- **')) {
      const match = line.match(/- \*\*(.+?)\*\*(.*)/);
      if (match) {
        return <p key={i} className="article-p"><strong>{match[1]}</strong>{match[2]}</p>;
      }
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="article-li">{line.slice(2)}</li>;
    }
    if (line.startsWith('> ')) {
      return <blockquote key={i} className="article-blockquote">{line.slice(2)}</blockquote>;
    }
    if (line.startsWith('1. ') || line.match(/^\d+\. /)) {
      return <li key={i} className="article-li">{line.replace(/^\d+\.\s*/, '')}</li>;
    }
    if (line.trim() === '') {
      return <div key={i} className="article-spacer" />;
    }
    return <p key={i} className="article-p">{line}</p>;
  };

  const handleComment = () => {
    onClose();
    navigate({ page: 'P2', postId: post.id });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="article-reader" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="article-reader-scroll">
          <div className={`article-reader-hero${hasCover ? '' : ' article-reader-hero--no-cover'}`}>
            {hasCover && <div className="media media-article article-reader-cover" data-layer="article-cover" />}
            <button
              type="button"
              className={`article-reader-back${hasCover ? '' : ' article-reader-back--on-light'}`}
              onClick={onClose}
              aria-label={t('返回')}
            >
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="article-reader-meta-block">
            <h1 className="article-reader-title">{displayTitle}</h1>
            <div className="article-reader-author-row">
              <div
                className="article-reader-author-info"
                role="button"
                tabIndex={0}
                onClick={() => navigate({ page: 'P6', authorName: displayName })}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate({ page: 'P6', authorName: displayName }); }}
              >
                <Avatar index={avatarIdx} seed={displayName} />
                <div className="article-reader-author-text">
                  <AuthorName name={displayName} className="article-reader-author-name" />
                  <span className="article-reader-time">{localizeTime(post.time, language)}</span>
                </div>
              </div>
              {!isOwn && (
                <button
                  type="button"
                  className={`follow-btn follow-btn--sm${isFollowing ? ' follow-btn--following' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleFollow(displayName); }}
                  aria-label={isFollowing ? t('取消关注 {author}', { author: displayName }) : t('关注 {author}', { author: displayName })}
                >
                  {isFollowing
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} strokeWidth={2.5} />{t('已关注')}</span>
                    : t('+ 关注')}
                </button>
              )}
            </div>
          </div>

          <div className="article-reader-content">
            {bodyLines.map(renderLine)}
          </div>

          {!unlocked && (
            <div className="article-reader-mask">
              <div className="article-reader-mask-fade" />
              <div className="article-reader-unlock">
                <Lock size={16} strokeWidth={2} />
                <span>{t('部分内容已隐藏')}</span>
                <button
                  type="button"
                  className="article-reader-unlock-btn"
                  onClick={(e) => { e.stopPropagation(); onClose(); openLink(post.id); }}
                >
                  {t('解锁全文2')}
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="article-reader-footer" data-layer="post-actions">
          <Actions
            post={post}
            onComment={handleComment}
            extra={!isOwn ? (
              <button
                type="button"
                className="detail-tip-btn"
                onClick={() => setShowTip(true)}
                aria-label={t('打赏此文章')}
              >
                <HandCoins size={15} strokeWidth={2} />
              </button>
            ) : undefined}
          />
        </footer>
        {showTip && (
          <TipModal
            recipientName={post.author}
            context="post"
            postId={post.id}
            postTitle={post.title}
            onClose={() => setShowTip(false)}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VideoPlayer — 视频播放器（支持 N% 时长限制）
// ═══════════════════════════════════════════════════════════════
export function VideoPlayer({ post, index = 0, onClose }: { post: Post; index?: number; onClose: () => void }) {
  const { openLink, linkedPostIds, navigate, repostedPostIds, likedPostIds, savedPostIds, togglePostAction, t, language } = useApp();
  const [showTip, setShowTip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOwn = post.author === CURRENT_USER;
  const isLinked = linkedPostIds.has(post.id);
  const unlocked = isOwn || isLinked || post.visiblePercent === 100;
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(true);
  const [showUnlockOverlay, setShowUnlockOverlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const videoDisplayName = post.displayAuthorName ?? post.author;
  const authorMeta = ALL_USERS_MOCK.find(u => u.name === videoDisplayName);
  const authorAvatarIdx = authorMeta?.avatarIdx ?? 0;

  // Close speed menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    if (showSpeedMenu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showSpeedMenu]);

  // Calculate max playable time based on visiblePercent
  const maxPlayableRatio = unlocked ? 1 : post.visiblePercent / 100;
  const maxPlayableTime = duration * maxPlayableRatio;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (!unlocked && video.currentTime >= maxPlayableTime) {
        video.pause();
        setPaused(true);
        setShowUnlockOverlay(true);
      }
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const onPause = () => setPaused(true);
    const onPlay = () => setPaused(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('pause', onPause);
    video.addEventListener('play', onPlay);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('play', onPlay);
    };
  }, [unlocked, maxPlayableTime]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleUnlock = () => {
    onClose();
    openLink(post.id);
  };

  const handleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } catch {}
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const newVol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(newVol);
    setMuted(newVol === 0);
    const video = videoRef.current;
    if (video) {
      video.volume = newVol;
      video.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    video.muted = nextMuted;
    if (nextMuted) {
      video.volume = 0;
    } else {
      video.volume = volume || 0.5;
      setVolume(v => v || 0.5);
    }
  };

  // Listen for fullscreen exit
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="video-player-overlay" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        {/* Top close button */}
        <button type="button" className="video-player-back" onClick={onClose} aria-label={t('返回')}>
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <div className="video-player-stage" ref={containerRef}>
          <video
            ref={videoRef}
            className="video-player-video"
            src={post.videoUrl}
            playsInline
            preload="metadata"
            onClick={handlePlayPause}
            onError={() => setVideoError(true)}
          />
          {/* Video load error */}
          {videoError && (
            <div className="video-player-unlock-overlay">
              <p className="video-player-unlock-text">{t('视频暂时无法播放')}</p>
            </div>
          )}
          {/* Play button overlay when paused */}
          {paused && !showUnlockOverlay && !videoError && (
            <div className="video-player-play-overlay" onClick={handlePlayPause}>
              <div className="video-player-play-btn">
                <Play size={32} strokeWidth={0} fill="#fff" />
              </div>
            </div>
          )}
          {/* Unlock overlay when preview limit reached */}
          {showUnlockOverlay && (
            <div className="video-player-unlock-overlay">
              <Lock size={24} strokeWidth={1.8} />
              <p className="video-player-unlock-text">
                {t('预览已结束')}
              </p>
              <button
                type="button"
                className="video-player-unlock-btn"
                onClick={handleUnlock}
              >
                {t('解锁完整视频')}
              </button>
            </div>
          )}
          {/* Bottom overlay: info + controls */}
          <div className="video-player-bottom">
            {/* Author row */}
            <div className="video-player-author-row">
              <Avatar index={authorAvatarIdx} seed={videoDisplayName} onClick={() => navigate({ page: 'P6', authorName: videoDisplayName })} />
              <div className="video-player-author-meta" onClick={() => navigate({ page: 'P6', authorName: videoDisplayName })} style={{ cursor: 'pointer' }}>
                <AuthorName name={videoDisplayName} as="h2" />
                <span>{post.time}</span>
              </div>
            </div>
            {/* Post title */}
            <div className="video-player-post-title">{post.title.split('\n')[0]}</div>
            {/* Gemini Node Badge */}
            {post.isNode && (
              <div className="video-player-gemini-badge">
                <GeminiNodeBadge post={post} showChain />
              </div>
            )}
            {/* Actions (comment / share / like / save) */}
            <div className="video-player-actions" data-layer="post-actions">
              <span
                className="video-player-action-item reply-trigger"
                role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); navigate({ page: 'P2', postId: post.id }); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate({ page: 'P2', postId: post.id }); }}
                aria-label={t('查看 {replies} 条评论', { replies: post.replies })}
              >
                <MessageCircle size={16} strokeWidth={2.25} />{formatCount(post.replies, language)}
              </span>
              <button
                type="button"
                className={`video-player-action-item${repostedPostIds.has(post.id) ? ' video-player-action-item--active' : ''}`}
                onClick={(e) => { e.stopPropagation(); togglePostAction(post.id, 'share'); }}
              >
                <Repeat2 size={16} strokeWidth={2.25} />{formatCount(post.shares, language)}
              </button>
              <button
                type="button"
                className={`video-player-action-item${likedPostIds.has(post.id) ? ' video-player-action-item--active' : ''}`}
                onClick={(e) => { e.stopPropagation(); togglePostAction(post.id, 'like'); }}
              >
                <ThumbsUp size={16} strokeWidth={2.25} />{formatCount(post.likes, language)}
              </button>
              <button
                type="button"
                className={`video-player-action-item${savedPostIds.has(post.id) ? ' video-player-action-item--active' : ''}`}
                onClick={(e) => { e.stopPropagation(); togglePostAction(post.id, 'save'); }}
              >
                <Bookmark size={16} strokeWidth={2.25} />{formatCount(post.saves, language)}
              </button>
              {!isOwn && (
                <button
                  type="button"
                  className="video-player-action-item video-player-action-item--tip"
                  onClick={(e) => { e.stopPropagation(); setShowTip(true); }}
                  aria-label={t('打赏')}
                >
                  <HandCoins size={16} strokeWidth={2} />
                </button>
              )}
            </div>
            {/* Progress bar */}
            <div className="video-player-progress" onClick={(e) => {
              const video = videoRef.current;
              if (!video || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const targetTime = unlocked ? ratio * duration : Math.min(ratio * duration, maxPlayableTime);
              video.currentTime = targetTime;
              setShowUnlockOverlay(false);
            }}>
              <div className="video-player-progress-fill" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
              {!unlocked && <div className="video-player-progress-limit" style={{ left: `${maxPlayableRatio * 100}%` }} />}
            </div>
            {/* Controls */}
            <div className="video-player-controls">
              <div className="video-player-controls-left">
                {/* Play/Pause */}
                <button
                  type="button"
                  className="video-player-ctrl-btn"
                  onClick={handlePlayPause}
                  aria-label={paused ? t('播放') : t('暂停')}
                >
                  {paused ? <Play size={16} strokeWidth={2} /> : <Pause size={16} strokeWidth={2} />}
                </button>
                {/* Time */}
                <span className="video-player-controls-time">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <div className="video-player-controls-right">
                {/* Speed */}
                <div className="video-player-speed-wrap" ref={speedMenuRef}>
                  <button
                    type="button"
                    className="video-player-ctrl-btn video-player-speed-btn"
                    onClick={() => setShowSpeedMenu(v => !v)}
                    aria-label={t('播放速度')}
                  >
                    {playbackRate}x
                  </button>
                  {showSpeedMenu && (
                    <div className="video-player-speed-menu">
                      {SPEEDS.map(speed => (
                        <button
                          key={speed}
                          type="button"
                          className={`video-player-speed-opt${speed === playbackRate ? ' video-player-speed-opt--active' : ''}`}
                          onClick={() => {
                            setPlaybackRate(speed);
                            const video = videoRef.current;
                            if (video) video.playbackRate = speed;
                            setShowSpeedMenu(false);
                          }}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Volume */}
                <div
                  className="video-player-volume-wrap"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    type="button"
                    className="video-player-ctrl-btn"
                    onClick={toggleMute}
                    aria-label={muted ? t('取消静音') : t('静音')}
                  >
                    {muted || volume === 0 ? <VolumeX size={16} strokeWidth={2} /> : <Volume2 size={16} strokeWidth={2} />}
                  </button>
                  {showVolumeSlider && (
                    <div className="video-player-volume-slider-wrap">
                      <div className="video-player-volume-slider" onClick={handleVolumeChange}>
                        <div
                          className="video-player-volume-fill"
                          style={{ width: `${muted ? 0 : volume * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Fullscreen */}
                <button
                  type="button"
                  className="video-player-ctrl-btn"
                  onClick={handleFullscreen}
                  aria-label={isFullscreen ? t('退出全屏') : t('全屏')}
                >
                  {isFullscreen ? <Minimize size={16} strokeWidth={2} /> : <Maximize size={16} strokeWidth={2} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showTip && (
        <TipModal
          recipientName={post.author}
          context="post"
          postId={post.id}
          postTitle={post.title}
          onClose={() => setShowTip(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// P6 — 用户个人主页
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// iOS 26 原生确认弹窗
// ═══════════════════════════════════════════════════════════════

export function Ios26Alert({
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message?: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="sheet-backdrop sheet-backdrop--ios26-alert" onClick={onCancel}>
      <div
        className="ios26-alert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ios26-alert-title"
        aria-describedby={message ? 'ios26-alert-message' : undefined}
        onClick={e => e.stopPropagation()}
      >
        <div className="ios26-alert__content">
          <div className="ios26-alert__title" id="ios26-alert-title">{title}</div>
          {message && (
            <div className="ios26-alert__message" id="ios26-alert-message">{message}</div>
          )}
        </div>
        <div className="ios26-alert__actions">
          <button type="button" className="ios26-alert__btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <div className="ios26-alert__sep" aria-hidden />
          <button type="button" className="ios26-alert__btn ios26-alert__btn--destructive" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDeleteModal({ postId: _postId, onConfirm, onCancel }: {
  postId: string; onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useApp();
  return (
    <Ios26Alert
      title={t('删除帖子')}
      message={t('确定要删除该帖子吗？')}
      cancelLabel={t('取消')}
      confirmLabel={t('删除')}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function ConfirmUnfollowModal({ author, onConfirm, onCancel }: {
  author: string; onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useApp();
  return (
    <Ios26Alert
      title={t('不再关注 {author}？', { author })}
      cancelLabel={t('取消')}
      confirmLabel={t('确定')}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// ConnectWalletModal — 游客触发需连接钱包的操作时弹出二次确认
// ═══════════════════════════════════════════════════════════════

export function ConnectWalletModal({ onConnect, onClose }: {
  onConnect: () => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="connect-wallet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-wallet-title"
        aria-describedby="connect-wallet-message"
        onClick={e => e.stopPropagation()}
      >
        <div className="connect-wallet-modal-hero">
          <div className="connect-wallet-modal-icon" aria-hidden="true">
            <Wallet size={26} strokeWidth={2.2} />
          </div>
          <h2 className="connect-wallet-modal-title" id="connect-wallet-title">
            {t('连接钱包以继续')}
          </h2>
          <p className="connect-wallet-modal-message" id="connect-wallet-message">
            {t('就差一步，连接钱包即可继续')}
          </p>
        </div>
        <div className="connect-wallet-modal-actions">
          <button type="button" className="planet-confirm-btn" onClick={onConnect}>
            <Wallet size={16} strokeWidth={2} />
            {t('连接钱包')}
          </button>
          <button type="button" className="gemini-stake-btn gemini-stake-btn--ghost" onClick={onClose}>
            {t('再看一看')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDeleteDraftModal({ onConfirm, onCancel }: {
  onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useApp();
  return (
    <Ios26Alert
      title={t('删除草稿')}
      message={t('确定要删除该草稿吗？')}
      cancelLabel={t('取消')}
      confirmLabel={t('删除')}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function ChannelCreatedSuccessModal({ ownerName, onSetTiers, onDismiss }: {
  /** 代开通场景下传入受益人名字；付款人不是频道主，不引导设置档位。自己开通时不传。 */
  ownerName?: string;
  onSetTiers: () => void;
  onDismiss: () => void;
}) {
  const { t } = useApp();
  const isProxyCreated = !!ownerName;
  return (
    <div className="sheet-backdrop" onClick={onDismiss}>
      <div
        className="channel-success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="channel-success-title"
        aria-describedby="channel-success-message"
        onClick={e => e.stopPropagation()}
      >
        <div className="channel-success-hero">
          <div className="channel-success-icon" aria-hidden="true">
            <Check size={28} strokeWidth={2.2} />
          </div>
          <h2 className="channel-success-title" id="channel-success-title">
            {isProxyCreated ? t('已为 {name} 开通频道', { name: ownerName }) : t('频道开通成功')}
          </h2>
          <p className="channel-success-message" id="channel-success-message">
            {isProxyCreated ? t('对方登录后即可设置会员档位并开始收益') : t('设置会员档位后，用户订阅即可为你带来收益')}
          </p>
        </div>
        <div className="channel-success-actions">
          {isProxyCreated ? (
            <button type="button" className="planet-confirm-btn" onClick={onDismiss}>
              {t('知道了')}
            </button>
          ) : (
            <>
              <button type="button" className="planet-confirm-btn" onClick={onSetTiers}>
                {t('设置会员档位')}
              </button>
              <button type="button" className="gemini-stake-btn gemini-stake-btn--ghost" onClick={onDismiss}>
                {t('暂不设置')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TipModal — 打赏弹窗（帖子 / 博主）
// ═══════════════════════════════════════════════════════════════

const TIP_AMOUNTS = [66, 88, 666, 888];
const TIP_MIN = 1;
const TIP_MAX = 100000;

export function TipModal({
  recipientName,
  context,
  postTitle,
  postId,
  onClose,
}: {
  recipientName: string;
  context: 'post' | 'author';
  postTitle?: string;
  postId?: string;
  onClose: () => void;
}) {
  const { t, showToast, recordOutgoingTip, payPb, recordTaskInteraction } = useApp();
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'select' | 'confirm' | 'paying' | 'done'>('select');
  const [payWallet, setPayWallet] = useState<PbWalletId | null>(null);

  // 自定义金额优先：填了自定义就以自定义为准，否则取选中的档位
  const customAmount = custom.trim() === '' ? null : Math.floor(Number(custom));
  const amount = customAmount != null && customAmount > 0 ? customAmount : selected;
  const amountValid = amount != null && amount >= TIP_MIN && amount <= TIP_MAX;

  const pickChip = (value: number) => {
    setSelected(value);
    setCustom('');
  };
  const onCustomChange = (v: string) => {
    setCustom(v.replace(/[^\d]/g, ''));
    setSelected(null);
  };

  const handlePay = () => {
    if (!amountValid || amount == null) return;
    if (!payWallet || !payPb({ amount, use: 'tip', wallet: payWallet, supCost: amount / 10000 })) return;
    setStep('paying');
    setTimeout(() => {
      setStep('done');
      recordOutgoingTip({
        recipientName,
        amount,
        context,
        postId: context === 'post' ? postId : undefined,
        postTitle: context === 'post' ? postTitle : undefined,
        message: message.trim() || undefined,
      });
      if (context === 'post' && postId) recordTaskInteraction(postId);
      setTimeout(() => {
        showToast(t('打赏成功！感谢你的支持'));
        onClose();
      }, 800);
    }, 1300);
  };

  const titleLabel = context === 'author'
    ? t('打赏 {recipientName}', { recipientName })
    : t('打赏此帖');

  const tipRemark = context === 'post' && postTitle
    ? postTitle.split('\n')[0]
    : t('打赏给 {recipientName}', { recipientName });

  // Full-page confirm/paying/done
  if (step !== 'select') {
    return (
      <PaymentConfirmPage
        pageStep={step}
        icon={<div className="pay-page-brand-icon pay-page-brand-icon--tip"><HandCoins size={28} strokeWidth={2} /></div>}
        productName={t('知识宇宙')}
        remark={tipRemark}
        amountText={`${amount} PB`}
        networkFee="1 PB"
        tokenFee={`${amount} PB`}
        gasFee={`${formatSupAmount((amount ?? 0) / 10000)} SUP`}
        walletId={payWallet}
        onConfirm={handlePay}
        onRetry={() => setStep('confirm')}
        onBack={() => setStep('select')}
      />
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{titleLabel}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="tip-recipient">
          <span className="tip-recipient-avatar">
            <Avatar index={0} seed={recipientName} />
          </span>
          <div className="tip-recipient-info">
            <div className="tip-recipient-name">{t('打赏 {recipientName}', { recipientName })}</div>
            {postTitle && (
              <p className="tip-recipient-sub">{postTitle.split('\n')[0]}</p>
            )}
          </div>
        </div>

        <div className="tip-section-heading">
          <HandCoins size={16} strokeWidth={2} className="tip-section-heading__icon" />
          {t('选择赞助金额')}
        </div>

        <div className="tip-amounts">
          {TIP_AMOUNTS.map(value => (
            <button
              key={value}
              type="button"
              className={`tip-amount-chip${selected === value ? ' tip-amount-chip--active' : ''}`}
              onClick={() => pickChip(value)}
            >
              <span className="tip-amount-chip__num">{value}</span>
              <span className="tip-amount-chip__unit">PB</span>
            </button>
          ))}
        </div>

        <div className="tip-field">
          <label className="tip-field-label" htmlFor="tip-custom">{t('自定义金额')}</label>
          <input
            id="tip-custom"
            className="edit-profile-input"
            type="text"
            inputMode="numeric"
            value={custom}
            placeholder={t('请输入赞助金额（{min}~{max} PB）', { min: TIP_MIN, max: TIP_MAX })}
            onChange={e => onCustomChange(e.target.value)}
          />
        </div>

        <div className="tip-field">
          <label className="tip-field-label" htmlFor="tip-message">{t('留言')}</label>
          <input
            id="tip-message"
            className="edit-profile-input"
            type="text"
            maxLength={60}
            value={message}
            placeholder={t('写点什么，对方可见')}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <div className="planet-upgrade-row" style={{ padding: 0 }}>
          <span className="planet-upgrade-row-label">{t('Gas 费')}</span>
          <div className="planet-upgrade-cost">
            <span className="planet-upgrade-cost-num">{formatSupAmount((amount ?? 0) / 10000)}</span>
            <span className="planet-upgrade-cost-unit"> SUP</span>
          </div>
        </div>

        {amountValid && amount != null && (
          <PbWalletPicker use="tip" amount={amount} value={payWallet} onChange={setPayWallet} />
        )}

        <button
          type="button"
          className="planet-confirm-btn"
          disabled={!amountValid || !payWallet}
          onClick={() => amountValid && payWallet && setStep('confirm')}
        >
          {amountValid && amount != null
            ? t('确认打赏 {selected} PB', { selected: amount })
            : t('请选择数额')}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ChannelSubscribeModal — 频道订阅（多档选择）
// ═══════════════════════════════════════════════════════════════

export function ChannelSubscribeModal({ channelId, requiredTierIndex, onClose }: { channelId: string; requiredTierIndex?: number; onClose: () => void }) {
  const { t, channels, subscribedChannelTiers, expiredChannelIds, subscribeToChannelTier, payPb } = useApp();
  const channel = channels.find(c => c.id === channelId);
  const currentTierIndex = subscribedChannelTiers[channelId];
  const isExpired = expiredChannelIds.has(channelId);
  // 从内容门槛锁点进来时，默认选中该内容要求的档位，省去用户再手动挑一次；
  // 已订阅档位优先（此时 requiredTierIndex 通常已满足，不会走到这个入口）
  const [selected, setSelected] = useState<number | null>(currentTierIndex ?? requiredTierIndex ?? null);
  const [step, setStep] = useState<'select' | 'confirm' | 'paying' | 'done'>('select');
  const [payWallet, setPayWallet] = useState<PbWalletId | null>(null);

  if (!channel) return null;
  const selectedTier = selected !== null ? channel.tiers[selected] : null;

  const handlePay = () => {
    if (!selectedTier || !payWallet || !payPb({
      amount: selectedTier.price,
      use: 'channel_subscribe',
      wallet: payWallet,
      supCost: selectedTier.price / 10000,
    })) return;
    setStep('paying');
    setTimeout(() => {
      setStep('done');
      setTimeout(() => {
        if (selected !== null) subscribeToChannelTier(channelId, selected);
        onClose();
      }, 800);
    }, 1300);
  };

  if (step !== 'select' && selectedTier) {
    return (
      <PaymentConfirmPage
        pageStep={step}
        icon={<div className="pay-page-brand-icon"><KnowledgePlanetIcon className="gemini-icon" /></div>}
        productName={t('知识宇宙')}
        remark={isExpired && selected === currentTierIndex
          ? t('续费《{name}》· {name2}', { name: channel.name, name2: selectedTier.name })
          : t('订阅《{name}》· {name2}', { name: channel.name, name2: selectedTier.name })}
        amountText={`${selectedTier.price} PB`}
        networkFee="1 PB"
        tokenFee={`${formatSupAmount(selectedTier.price / 10000)} SUP/${t('月')}`}
        walletId={payWallet}
        onConfirm={handlePay}
        onRetry={() => setStep('confirm')}
        onBack={() => setStep('select')}
      />
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{isExpired ? t('续费《{name}》', { name: channel.name }) : t('订阅《{name}》', { name: channel.name })}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="stake-tier-list" style={{ marginBottom: 16 }}>
          {channel.tiers.map((tier, idx) => {
            const isCurrent = currentTierIndex === idx;
            // 已下架档位不接受新订阅，只在是本人当前档位时保留展示（方便查看自己的订阅状态）
            if (tier.archived && !isCurrent) return null;
            const isDowngrade = currentTierIndex != null && idx < currentTierIndex && !isExpired;
            return (
              <button
                key={tier.id}
                type="button"
                disabled={isDowngrade || tier.archived}
                className={`stake-tier-option${selected === idx ? ' stake-tier-option--active' : ''}`}
                onClick={() => setSelected(idx)}
              >
                <span className="stake-tier-option__amount">
                  <ChannelTierName name={tier.name} tierIndex={idx} />
                  {!tier.free && (
                    <>
                      {' · '}{tier.price} PB/{t('月')}
                      <span className="stake-tier-option__fee">
                        {t('+ {fee} SUP/月', { fee: formatSupAmount(tier.price / 10000) })}
                      </span>
                    </>
                  )}
                </span>
                <span className="stake-tier-option__desc">
                  {isCurrent
                    ? (isExpired
                      ? t('已过期档位，续费恢复访问权限')
                      : tier.archived ? t('当前档位（已下架，不影响你的权限）') : t('当前档位'))
                    : tier.free ? t('无需付费，随时可加入') : t('可看全部 {name} 及以下档位专属内容', { name: tier.name })}
                </span>
              </button>
            );
          })}
        </div>

        {selectedTier && !selectedTier.free && (
          <PbWalletPicker use="channel_subscribe" amount={selectedTier.price} value={payWallet} onChange={setPayWallet} />
        )}

        <button
          type="button"
          className="planet-confirm-btn"
          disabled={selected === null || (selected === currentTierIndex && !isExpired) || (!selectedTier?.free && !payWallet)}
          onClick={() => {
            if (selected === null) return;
            // 免费档不产生付费，跳过支付确认流程直接加入
            if (selectedTier?.free) { subscribeToChannelTier(channelId, selected); onClose(); return; }
            setStep('confirm');
          }}
        >
          {selected !== null
            ? (isExpired && selected === currentTierIndex
              ? t('续费')
              : selectedTier?.free
                ? t('免费加入')
                : currentTierIndex != null && selected > currentTierIndex
                  ? t('升级订阅')
                  : t('订阅'))
            : t('请选择档位')}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CreateChannelModal — 开通频道 / 管理会员档位
// ═══════════════════════════════════════════════════════════════

const MAX_CHANNEL_TIERS = 3;
const DEFAULT_CHANNEL_CATEGORY = 'AI / 大模型';
const DEFAULT_TIER_PRICES = [100, 500, 2000] as const;
// 档位名不可自定义，按档位顺序固定分配
const DEFAULT_TIER_NAMES = ['铜牌', '银牌', '金牌'] as const;

// 仅对预设范围内、未下架的付费档位重新赋名；免费档（恒为 tiers[0]）与已下架档位保留原名不动
function normalizeTierNames(tiers: ChannelTier[]): ChannelTier[] {
  return tiers.map((tier, index) => {
    if (tier.free || tier.archived) return tier;
    const preset = DEFAULT_TIER_NAMES[index - 1];
    return preset ? { ...tier, name: preset } : tier;
  });
}

function defaultTierPreset(index: number): number {
  return DEFAULT_TIER_PRICES[index] ?? DEFAULT_TIER_PRICES[DEFAULT_TIER_PRICES.length - 1];
}

function defaultTierPrice(index: number, tiers: ChannelTier[]): number {
  const preset = defaultTierPreset(index);
  if (index === 0) return preset;
  return Math.max(preset, tiers[index - 1].price + 1);
}

function sanitizeTierPrices(tiers: ChannelTier[]): ChannelTier[] {
  return tiers.map((tier, index) => tier.free ? tier : ({
    ...tier,
    price: tier.price > 0 ? tier.price : defaultTierPreset(index - 1),
  }));
}

// 已下架档位不再对外销售，价格已冻结，不参与校验（也不作为后面档位排序校验的基准）
function lastActivePrice(tiers: ChannelTier[], beforeIdx: number): number | null {
  for (let i = beforeIdx - 1; i >= 0; i--) {
    if (!tiers[i].archived) return tiers[i].price;
  }
  return null;
}

function isChannelTierPriceInvalid(tiers: ChannelTier[], idx: number): boolean {
  if (tiers[idx].free || tiers[idx].archived) return false;
  const price = tiers[idx].price;
  if (price <= 0) return true;
  const prevPrice = lastActivePrice(tiers, idx);
  return prevPrice != null && price <= prevPrice;
}

function channelTierPriceError(
  tiers: ChannelTier[],
  idx: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string | null {
  if (tiers[idx].free || tiers[idx].archived) return null;
  const price = tiers[idx].price;
  if (price <= 0) {
    return t('月费不可为 0');
  }
  const prevPrice = lastActivePrice(tiers, idx);
  if (prevPrice != null && price <= prevPrice) {
    return t('须高于上一档（{prevPrice} PB）', { prevPrice });
  }
  return null;
}

function ChannelCollaboratorsSection({ channel }: { channel: Channel }) {
  const { t, showToast, channelAuthorizations, requestChannelAuthorization, revokeChannelAuthorization } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressStatus, setAddressStatus] = useState<'1' | '2' | '3' | '4'>('1');
  const [verifying, setVerifying] = useState(false);
  const collabDelegate = addressStatus === '3' ? findRegisteredUserByAddress(addressInput.trim()) : undefined;
  const collabAuths = channelAuthorizations.filter(a => a.channelId === channel.id && a.status !== 'declined');

  const handleAddressChange = (value: string) => {
    setAddressInput(value);
    setAddressStatus(value.trim() ? '2' : '1');
  };

  const handleVerifyAddress = () => {
    const address = addressInput.trim();
    if (!address || verifying) return;
    setVerifying(true);
    setTimeout(() => {
      setAddressStatus(findRegisteredUserByAddress(address) ? '3' : '4');
      setVerifying(false);
    }, 500);
  };

  const handleSendInvite = () => {
    const result = requestChannelAuthorization(channel.id, addressInput.trim());
    if (result.ok) {
      setFormOpen(false);
      setAddressInput('');
      setAddressStatus('1');
    } else {
      showToast(result.message ?? t('发送失败'));
    }
  };

  const statusLabel = (status: 'pending' | 'active' | 'declined' | 'revoked') => {
    if (status === 'pending') return t('待对方接受');
    if (status === 'active') return t('协作中');
    if (status === 'revoked') return t('已撤销');
    return t('已婉拒');
  };

  return (
    <div className="edit-profile-field">
      <span className="edit-profile-label">{t('协作者授权')}</span>
      <p className="channel-tier-section-hint">
        {t('授权后对方可用自己的账号为该频道发帖，发布内容仍展示为你的频道署名')}
      </p>
      {collabAuths.map(auth => (
        <div key={auth.id} className="channel-collab-row">
          <span className="channel-collab-name">{auth.delegateName ?? shortenAddress(auth.delegateAddress)}</span>
          <span className={`channel-collab-status channel-collab-status--${auth.status}`}>
            {statusLabel(auth.status)}
          </span>
          {(auth.status === 'pending' || auth.status === 'active') && (
            <button type="button" className="channel-collab-revoke-btn" onClick={() => revokeChannelAuthorization(auth.id)}>
              {t('撤销')}
            </button>
          )}
        </div>
      ))}
      {!formOpen ? (
        <button type="button" className="channel-tier-add-btn" onClick={() => setFormOpen(true)}>
          <Plus size={16} strokeWidth={2.5} aria-hidden />
          {t('授权协作者')}
        </button>
      ) : (
        <div className="stake-code-block">
          <div className="stake-code-row">
            <div className="stake-code-input-wrap">
              <input
                className="stake-code-input"
                type="text"
                value={addressInput}
                onChange={e => handleAddressChange(e.target.value)}
                placeholder={t('请输入对方钱包地址')}
              />
            </div>
            <button
              type="button"
              className="stake-code-verify-btn"
              onClick={handleVerifyAddress}
              disabled={!addressInput.trim() || verifying}
            >
              {verifying ? <Loader2 size={14} strokeWidth={2} className="planet-spin" /> : t('校验')}
            </button>
          </div>
          {addressStatus === '3' && collabDelegate && (
            <span className="stake-code-status stake-code-status--ok">
              <ShieldCheck size={13} strokeWidth={2} />
              {t('将授权 {name} 代发内容', { name: collabDelegate.name })}
            </span>
          )}
          {addressStatus === '4' && (
            <span className="stake-code-status stake-code-status--fail">
              <ShieldX size={13} strokeWidth={2} />
              {t('该地址未在知识宇宙注册，请确认地址是否正确')}
            </span>
          )}
          <button type="button" className="planet-confirm-btn" disabled={addressStatus !== '3'} onClick={handleSendInvite}>
            {t('发送授权邀请')}
          </button>
        </div>
      )}
    </div>
  );
}

export function CreateChannelModal({ existingChannel, onClose }: { existingChannel?: Channel; onClose: () => void }) {
  const { t, createChannel, updateChannel, userProfile, payPb, showToast, channels } = useApp();
  // 一个人可以开多个频道，默认名称如果都叫「{nickname}的频道」会难以区分——
  // 撞名时依次追加编号（2/3/4…），直到不与本人现有频道重名
  const baseChannelName = t('{nickname}的频道', { nickname: userProfile.nickname });
  const defaultChannelName = (() => {
    const myChannelNames = new Set(channels.filter(c => c.ownerName === CURRENT_USER).map(c => c.name));
    if (!myChannelNames.has(baseChannelName)) return baseChannelName;
    let suffix = 2;
    while (myChannelNames.has(`${baseChannelName} ${suffix}`)) suffix++;
    return `${baseChannelName} ${suffix}`;
  })();
  const [paying, setPaying] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [failReason, setFailReason] = useState('');
  const [payWallet, setPayWallet] = useState<PbWalletId | null>(null);
  // 代开通频道：输入他人地址校验通过后，频道归属受益人，用自己的钱包付款
  const [beneficiaryMode, setBeneficiaryMode] = useState<'self' | 'other'>('self');
  const [addressInput, setAddressInput] = useState('');
  const [addressStatus, setAddressStatus] = useState<'1' | '2' | '3' | '4'>('1');
  const [verifying, setVerifying] = useState(false);
  const beneficiary = addressStatus === '3' ? findRegisteredUserByAddress(addressInput.trim()) : undefined;

  const handleAddressChange = (value: string) => {
    setAddressInput(value);
    setAddressStatus(value.trim() ? '2' : '1');
  };

  const handleVerifyAddress = () => {
    const address = addressInput.trim();
    if (!address || verifying) return;
    setVerifying(true);
    setTimeout(() => {
      setAddressStatus(findRegisteredUserByAddress(address) ? '3' : '4');
      setVerifying(false);
    }, 500);
  };

  const handleSelectBeneficiaryMode = (next: 'self' | 'other') => {
    setBeneficiaryMode(next);
    if (next === 'self') {
      setAddressInput('');
      setAddressStatus('1');
    }
  };
  const channelSupCost = SUP_COST_BY_TIER[1000];
  const channelWalletNeedsSup = !payWallet || walletConsumesSup(payWallet);
  const [name, setName] = useState(existingChannel?.name ?? defaultChannelName);
  const [description, setDescription] = useState(existingChannel?.description ?? '');
  const category = existingChannel?.category ?? DEFAULT_CHANNEL_CATEGORY;
  const isEdit = !!existingChannel;
  // 开通频道（未 isEdit）只收集基本信息，不设会员档位——开通与定价拆成两步，
  // 避免用户在"要不要付钱开通"和"怎么设计收费档位"两件事上同时纠结
  const [tiers, setTiers] = useState<ChannelTier[]>(() =>
    isEdit ? withFreeTier(normalizeTierNames(sanitizeTierPrices(existingChannel?.tiers ?? []))) : [],
  );

  // 档位设置（涨价/降价/新增/下架）30 天内只能改一次；单纯改名称/简介不受此限制
  const TIER_SETTINGS_COOLDOWN_DAYS = 30;
  const tierSettingsCooldownRemainingDays = (() => {
    if (!existingChannel?.tiersChangedAt) return 0;
    const elapsedDays = (Date.now() - existingChannel.tiersChangedAt) / (24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil(TIER_SETTINGS_COOLDOWN_DAYS - elapsedDays));
  })();
  const canEditTierSettings = tierSettingsCooldownRemainingDays <= 0;
  const notifyTierSettingsLocked = () => {
    showToast(t('档位设置 30 天内只能修改一次，请稍后再试'));
  };

  // 免费档不计入档位数量上限。铜／银／金三个付费档始终占用各自名额，
  // 下架仅暂停订阅，不会释放新增名额。
  const activeTierCount = tiers.filter(tr => !tr.free && !tr.archived).length;
  const paidTierCount = tiers.filter(tr => !tr.free).length;

  const addTier = () => {
    if (!canEditTierSettings) { notifyTierSettingsLocked(); return; }
    if (paidTierCount >= MAX_CHANNEL_TIERS) return;
    setTiers(prev => {
      const paidTiers = prev.filter(tr => !tr.free);
      return normalizeTierNames([
        ...prev,
        {
          id: `tier-${Date.now()}`,
          name: '',
          price: defaultTierPrice(paidTiers.length, paidTiers),
        },
      ]);
    });
  };
  const updateTierPrice = (idx: number, price: number) => {
    if (!canEditTierSettings) { notifyTierSettingsLocked(); return; }
    setTiers(prev => prev.map((tr, i) => (i === idx && !tr.free) ? { ...tr, price } : tr));
  };
  // 下架而非删除：已保存过的档位一旦存在，就不能真的从数组里移除，
  // 否则会导致 minTierIndex / 订阅记录里存的下标错位、指向别的档位。
  // 本次编辑中新增、还没保存过的档位（existingChannel 里没有）可以直接移除。免费档不可下架/移除。
  const removeTier = (idx: number) => {
    if (!canEditTierSettings) { notifyTierSettingsLocked(); return; }
    if (tiers[idx]?.free) return;
    setTiers(prev => {
      const tier = prev[idx];
      const wasPersisted = existingChannel?.tiers.some(t => t.id === tier.id) ?? false;
      if (wasPersisted) {
        return prev.map((tr, i) => i === idx ? { ...tr, archived: true } : tr);
      }
      return normalizeTierNames(prev.filter((_, i) => i !== idx));
    });
  };
  const unarchiveTier = (idx: number) => {
    if (!canEditTierSettings) { notifyTierSettingsLocked(); return; }
    if (activeTierCount >= MAX_CHANNEL_TIERS) return;
    setTiers(prev => prev.map((tr, i) => i === idx ? { ...tr, archived: false } : tr));
  };

  const canSubmit = name.trim().length > 0
    && !tiers.some((_, idx) => isChannelTierPriceInvalid(tiers, idx))
    && (beneficiaryMode === 'self' || addressStatus === '3');

  const handleSubmit = () => {
    if (!canSubmit || paying === 'loading') return;
    const normalizedTiers = normalizeTierNames(tiers);
    if (isEdit && existingChannel) {
      updateChannel(existingChannel.id, { name: name.trim(), description: description.trim(), category, tiers: normalizedTiers });
      onClose();
      return;
    }
    if (!payWallet || !payPb({ amount: CHANNEL_OPEN_PB_COST, use: 'channel_open', wallet: payWallet, supCost: channelSupCost })) {
      setFailReason(t('所选钱包余额不足或不适用于此操作'));
      setPaying('failed');
      return;
    }
    // 一步完成：同一屏内直接跑支付动画，成功后立即建号，不再跳到独立的支付弹窗
    setPaying('loading');
    setTimeout(() => {
      createChannel({
        name: name.trim(), description: description.trim(), category, tiers,
        beneficiaryAddress: beneficiaryMode === 'other' ? addressInput.trim() : undefined,
      });
      onClose();
    }, 1300);
  };

  const closeIfIdle = () => { if (paying !== 'loading') onClose(); };

  return (
    <div className="sheet-backdrop" onClick={closeIfIdle}>
      <div className={`edit-profile-sheet${!isEdit ? ' edit-profile-sheet--channel' : ''}`} role="dialog" aria-label={t('开通频道')} onClick={e => e.stopPropagation()}>
        <div className="edit-profile-header">
          <button type="button" className="edit-profile-close" onClick={closeIfIdle} disabled={paying === 'loading'} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
          <span className="edit-profile-title">{isEdit ? t('管理频道') : t('开通频道')}</span>
          {isEdit ? (
            <button
              type="button"
              className="edit-profile-save edit-profile-save--icon"
              disabled={!canSubmit || paying === 'loading'}
              onClick={handleSubmit}
              aria-label={t('保存')}
            >
              <Save size={16} strokeWidth={2.25} aria-hidden />
              {t('保存')}
            </button>
          ) : (
            <div className="edit-profile-header-spacer" aria-hidden />
          )}
        </div>

        <div className="edit-profile-body">
          <div className="edit-profile-field">
            <label className="edit-profile-label" htmlFor="channel-name">{t('频道名称')}</label>
            <input
              id="channel-name" className="edit-profile-input" value={name} maxLength={24}
              onChange={e => setName(e.target.value)}
              placeholder={t('给频道起个名字')}
              autoComplete="off"
            />
          </div>
          <div className="edit-profile-field">
            <label className="edit-profile-label" htmlFor="channel-desc">{t('简介')}</label>
            <input
              id="channel-desc" className="edit-profile-input" value={description} maxLength={60}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('一句话介绍频道内容')}
              autoComplete="off"
            />
          </div>

          {isEdit && (
          <div className="edit-profile-field">
            <span className="edit-profile-label">
              {t('会员档位（另可加最多 {MAX_CHANNEL_TIERS} 个付费档位）', { MAX_CHANNEL_TIERS })}
            </span>
            <p className="channel-tier-section-hint">
              {t('免费档所有人可加入；新增付费档位可为频道内容设置订阅门槛')}
            </p>
            <div className="channel-tier-row channel-tier-row--head" aria-hidden>
              <span className="channel-tier-col-label">{t('档位')}</span>
              <span className="channel-tier-col-label channel-tier-col-label--price">{t('月订阅费')}</span>
              <span className="channel-tier-col-label channel-tier-col-label--action" />
            </div>
            {tiers.map((tier, idx) => {
              if (tier.free) {
                return (
                  <div key={tier.id} className="channel-tier-block channel-tier-block--free">
                    <div className="channel-tier-row">
                      <ChannelTierName name={tier.name} tierIndex={idx} className="channel-tier-name-label" />
                      <span className="channel-tier-archived-price">{t('免费')}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })}
            {tiers.map((tier, idx) => {
              if (tier.free) return null;
              if (tier.archived) {
                return (
                  <div key={tier.id} className="channel-tier-block channel-tier-block--archived">
                    <div className="channel-tier-row">
                      <ChannelTierName name={tier.name} tierIndex={idx} className="channel-tier-name-label" />
                      <span className="channel-tier-archived-price">{tier.price} PB/{t('月')}</span>
                      <span className="channel-tier-archived-badge">{t('已下架')}</span>
                    </div>
                    <div className="channel-tier-archived-footer">
                      <p className="channel-tier-archived-hint">
                        {t('不再接受新订阅，已订阅用户保留原价与权限')}
                      </p>
                      {activeTierCount < MAX_CHANNEL_TIERS && (
                        <button
                          type="button"
                          className="channel-tier-relist-btn"
                          onClick={() => unarchiveTier(idx)}
                        >
                          {t('重新上架')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              const priceError = channelTierPriceError(tiers, idx, t);
              return (
                <div key={tier.id} className="channel-tier-block">
                  <div className="channel-tier-row">
                    <ChannelTierName name={tier.name} tierIndex={idx} className="channel-tier-name-label" />
                    <div className="channel-tier-price-wrap">
                      <input
                        className={`edit-profile-input channel-tier-price-input${priceError ? ' edit-profile-input--error' : ''}${!canEditTierSettings ? ' channel-tier-price-input--locked' : ''}`}
                        type="number" min={1}
                        value={tier.price}
                        readOnly={!canEditTierSettings}
                        onMouseDown={() => { if (!canEditTierSettings) notifyTierSettingsLocked(); }}
                        onChange={e => {
                          const raw = Number(e.target.value);
                          updateTierPrice(idx, Number.isFinite(raw) ? Math.max(0, raw) : 0);
                        }}
                        placeholder={t('月费')}
                        aria-label={t('{name} 月订阅费（PB）', { name: tier.name })}
                        aria-invalid={priceError ? true : undefined}
                      />
                      <span className="channel-tier-price-unit">PB/{t('月')}</span>
                    </div>
                    <button
                      type="button"
                      className={`draft-item-delete channel-tier-delete${!canEditTierSettings ? ' channel-tier-delete--locked' : ''}`}
                      onClick={() => removeTier(idx)}
                      aria-label={t('下架档位')}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                  {priceError && (
                    <p className="channel-tier-error" role="alert">{priceError}</p>
                  )}
                </div>
              );
            })}
            {paidTierCount < MAX_CHANNEL_TIERS && (
              <button
                type="button"
                className={`channel-tier-add-btn${!canEditTierSettings ? ' channel-tier-add-btn--locked' : ''}`}
                onClick={addTier}
              >
                <Plus size={16} strokeWidth={2.5} aria-hidden />
                {t('新增档位')}
              </button>
            )}
          </div>
          )}

          {isEdit && existingChannel && <ChannelCollaboratorsSection channel={existingChannel} />}

          {!isEdit && (
            <div className="edit-profile-field">
              <span className="edit-profile-label">{t('开通对象')}</span>
              <div className="create-scale-toggle">
                <button
                  type="button"
                  className={`create-scale-tab${beneficiaryMode === 'self' ? ' create-scale-tab--active' : ''}`}
                  onClick={() => handleSelectBeneficiaryMode('self')}
                >
                  {t('为自己开通')}
                </button>
                <button
                  type="button"
                  className={`create-scale-tab${beneficiaryMode === 'other' ? ' create-scale-tab--active' : ''}`}
                  onClick={() => handleSelectBeneficiaryMode('other')}
                >
                  {t('为他人代开通')}
                </button>
              </div>
              {beneficiaryMode === 'other' && (
                <div className="stake-code-block">
                  <div className="stake-code-row">
                    <div className="stake-code-input-wrap">
                      <input
                        className="stake-code-input"
                        type="text"
                        value={addressInput}
                        onChange={e => handleAddressChange(e.target.value)}
                        placeholder={t('请输入对方钱包地址')}
                      />
                    </div>
                    <button
                      type="button"
                      className="stake-code-verify-btn"
                      onClick={handleVerifyAddress}
                      disabled={!addressInput.trim() || verifying}
                    >
                      {verifying ? <Loader2 size={14} strokeWidth={2} className="planet-spin" /> : t('校验')}
                    </button>
                  </div>
                  {addressStatus === '3' && beneficiary && (
                    <span className="stake-code-status stake-code-status--ok">
                      <ShieldCheck size={13} strokeWidth={2} />
                      {t('频道将归属于 {name}', { name: beneficiary.name })}
                    </span>
                  )}
                  {addressStatus === '4' && (
                    <span className="stake-code-status stake-code-status--fail">
                      <ShieldX size={13} strokeWidth={2} />
                      {t('该地址未在知识宇宙注册，请确认地址是否正确')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {!isEdit && (
            <div className="edit-profile-field">
              <span className="edit-profile-label">{t('费用明细')}</span>
              <div className="pay-combo-breakdown">
                <div className="pay-combo-row">
                  <span className="pay-combo-label">{t('PB 消耗')}</span>
                  <span className="pay-combo-value">{formatSuperAmount(CHANNEL_OPEN_PB_COST)} PB</span>
                </div>
                {channelWalletNeedsSup && (
                  <div className="pay-combo-row">
                    <span className="pay-combo-label">{t('SUP 消耗')}</span>
                    <span className="pay-combo-value">{formatSupAmount(channelSupCost)} SUP</span>
                  </div>
                )}
                {paying === 'failed' && (
                  <p className="pay-fail-reason">{failReason}</p>
                )}
              </div>
              <PbWalletPicker use="channel_open" amount={CHANNEL_OPEN_PB_COST} value={payWallet} onChange={setPayWallet} />
            </div>
          )}

        </div>

        {!isEdit && (
        <div className="channel-create-footer">
          <button
            type="button"
            className="planet-confirm-btn"
            disabled={!canSubmit || !payWallet || paying === 'loading'}
            onClick={handleSubmit}
          >
            {paying === 'loading'
              ? <span className="spinner" />
              : paying === 'failed'
                ? t('重试')
                : t('开通频道')}
          </button>
          {paying === 'idle' && (
            <p className="channel-create-footer-hint">
              {t('开通后免费产生一个知识宇宙节点')}
            </p>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// App（路由 + 全局状态）
// ═══════════════════════════════════════════════════════════════
