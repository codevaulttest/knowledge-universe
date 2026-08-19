import { useState, useRef, useEffect, useCallback, type ChangeEvent, type CSSProperties } from 'react';
import { Camera, Check, ChevronRight, Eye, FileText, Info, Plus, Radio, Save, Search, Send, ShoppingCart, Trash2, X, Bold, Italic, Underline, List, ListOrdered, Quote } from 'lucide-react';
import { useApp } from '../AppContext';
import { KnowledgePlanetIcon } from '../components/KnowledgePlanetIcon';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useChannelListSearch } from '../components/channelSearch';
import { CURRENT_USER } from '../mockData';
import type { Draft, Post, ShopInfo, StakeTier } from '../types';
import { STAKE_TIERS, stakeTierDescription, stakeTierLabel, SUP_COST_BY_TIER } from '../stakeConfig';
import { SHOP_MAX_REBATE_PERCENT, MERIT_PB_PER_POINT, MERIT_PER_ADN, computeShopFee } from '../shopConfig';
import { isChinese } from '../i18n';

const MAX_POST_CHARS = 500;

export function ComposePage({
  onClose,
  editPost,
  draft,
  onRegisterCloseHandler,
}: {
  onClose: () => void;
  editPost?: Post;
  draft?: Draft | null;
  onRegisterCloseHandler?: (handler: () => void) => void;
}) {
  const { openPay, showToast, updatePost, saveDraft, updateDraft, stagePendingPost, publishPost, t, language, channels, userProfile, openEditProfileContacts } = useApp();
  const isEditMode = !!editPost;
  const myChannels = channels.filter(c => c.ownerName === CURRENT_USER);
  // 编辑已发布的频道帖子时，可见档位允许调整，但只能单向放宽（降低门槛/改成不限档位），
  // 不能收紧（提高门槛）——已经被看过的内容不能再收回去锁上，参考 YouTube 只支持
  // "会员专属 → 公开"、不支持反向操作的惯例
  const editPostChannel = isEditMode && editPost?.channelId ? myChannels.find(c => c.id === editPost.channelId) : undefined;
  const originalMinTierIndex = editPost?.minTierIndex;
  const canLoosenTierTo = (candidateIdx: number | undefined) => {
    if (candidateIdx === undefined) return true;
    if (originalMinTierIndex === undefined) return false;
    return candidateIdx <= originalMinTierIndex;
  };
  const [editMinTierIndex, setEditMinTierIndex] = useState<number | undefined>(editPost?.minTierIndex);

  const initialStakeTier = (): StakeTier => {
    if (draft?.stakeTier !== undefined) return draft.stakeTier;
    if (draft?.joinGemini) return 100;
    return 0;
  };

  const [text, setText] = useState(editPost?.title ?? draft?.title ?? '');
  const [stakeTier, setStakeTier] = useState<StakeTier>(initialStakeTier);
  const [visibility, setVisibility] = useState(draft?.visibility ?? 30);
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>(undefined);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const channelPicker = useChannelListSearch(myChannels);
  const selectedChannel = myChannels.find(c => c.id === selectedChannelId);
  const [minTierIndex, setMinTierIndex] = useState<number | undefined>(undefined);
  // 小黄车（仅 1000 PB 节点帖可挂载）
  const [shopEnabled, setShopEnabled] = useState(false);
  const [shopPrice, setShopPrice] = useState('');
  const [shopRebate, setShopRebate] = useState(40);
  const [shopStock, setShopStock] = useState('');
  const [rebateInfoOpen, setRebateInfoOpen] = useState(false);
  const [imgCount, setImgCount] = useState(draft?.imgCount ?? 0);
  // 用户通过系统相册/拍照选中的图片，生成本地预览用的 object URL（草稿里已有的旧图没有真实文件，仅按数量占位展示）
  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasVideo, setHasVideo] = useState(draft?.hasVideo ?? false);
  const [articleMode, setArticleMode] = useState(draft?.kind === 'article');
  const [articleTitle, setArticleTitle] = useState(draft?.articleTitle ?? '');
  const [hasCover, setHasCover] = useState(draft?.articleHasCover ?? editPost?.articleHasCover !== false);

  // Rich text editor state
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [currentBlock, setCurrentBlock] = useState('p');
  const [articleBodyHasContent, setArticleBodyHasContent] = useState(false);

  const kind: Post['kind'] = articleMode ? 'article'
    : hasVideo ? 'video'
    : imgCount > 0 ? 'image'
    : 'text';

  const isOverLimit = !articleMode && text.length > MAX_POST_CHARS;

  // 小黄车仅在 1000 PB 节点档位可用；档位变化后自动收起，避免带着无效配置提交
  const shopEligible = stakeTier === 1000;
  useEffect(() => {
    if (!shopEligible && shopEnabled) setShopEnabled(false);
  }, [shopEligible, shopEnabled]);
  // 选中 1000 PB 时把小黄车开关滚入可视区域：2x2 网格已经省出不少高度，
  // 但更长的机型/字号下仍可能差一点，滚动兜底确保用户一定能看到
  const shopSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (shopEligible) shopSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [shopEligible]);
  const hasContacts = !!userProfile.contacts && Object.values(userProfile.contacts).some(v => v && v.trim());
  const shopPriceNum = Number(shopPrice);
  const shopStockNum = Number(shopStock);
  const shopValid = !shopEnabled || (
    hasContacts
    && shopPriceNum > 0
    && Number.isFinite(shopPriceNum)
    && shopStockNum >= 1
    && Number.isInteger(shopStockNum)
    && shopRebate >= 0
    && shopRebate <= SHOP_MAX_REBATE_PERCENT
  );

  const canPublish = (articleMode
    ? articleTitle.trim().length > 0 && articleBodyHasContent
    : (text.trim().length > 0 || imgCount > 0 || hasVideo) && !isOverLimit) && shopValid;

  const canSaveDraft = !isEditMode && (
    articleMode
      ? articleTitle.trim().length > 0
      : text.trim().length > 0 && !isOverLimit
  );

  const updateActiveFormats = () => {
    const fmts = new Set<string>();
    try {
      if (document.queryCommandState('bold')) fmts.add('bold');
      if (document.queryCommandState('italic')) fmts.add('italic');
      if (document.queryCommandState('underline')) fmts.add('underline');
      if (document.queryCommandState('insertUnorderedList')) fmts.add('ul');
      if (document.queryCommandState('insertOrderedList')) fmts.add('ol');
      const block = document.queryCommandValue('formatBlock').toLowerCase();
      setCurrentBlock(['h1', 'h2', 'h3', 'blockquote'].includes(block) ? block : 'p');
    } catch { /* ignore */ }
    setActiveFormats(fmts);
  };

  // 卸载时释放所有本地图片预览的 object URL，避免内存泄漏（用 ref 拿最新值，避免每次 imgUrls 变化都误触发清理）
  const imgUrlsRef = useRef<string[]>([]);
  useEffect(() => { imgUrlsRef.current = imgUrls; }, [imgUrls]);
  useEffect(() => () => { imgUrlsRef.current.forEach(url => URL.revokeObjectURL(url)); }, []);

  useEffect(() => {
    if (!articleMode) return;
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, [articleMode]);

  const execFormat = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    setTimeout(updateActiveFormats, 0);
  };

  const handleBlock = (tag: string) => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, currentBlock === tag ? 'p' : tag);
    setTimeout(updateActiveFormats, 0);
  };

  const [publishing, setPublishing] = useState(false);
  const [exitMenuOpen, setExitMenuOpen] = useState(false);

  const hasContent = articleMode
    ? articleTitle.trim().length > 0 || articleBodyHasContent || hasCover
    : text.trim().length > 0 || imgCount > 0 || hasVideo;

  const hasEditChanges = isEditMode && (
    text.trim() !== (editPost?.title ?? '')
    || (!!editPostChannel && editMinTierIndex !== editPost?.minTierIndex)
  );

  const handleCloseAttempt = useCallback(() => {
    if (exitMenuOpen) {
      setExitMenuOpen(false);
      return;
    }
    if (isEditMode) {
      if (hasEditChanges) setExitMenuOpen(true);
      else onClose();
      return;
    }
    if (hasContent) setExitMenuOpen(true);
    else onClose();
  }, [exitMenuOpen, isEditMode, hasEditChanges, hasContent, onClose]);

  useEffect(() => {
    onRegisterCloseHandler?.(handleCloseAttempt);
  }, [handleCloseAttempt, onRegisterCloseHandler]);

  const handlePublish = () => {
    if (!canPublish || publishing) return;
    if (isEditMode) {
      const tierChanged = editPostChannel && editMinTierIndex !== editPost.minTierIndex;
      updatePost(editPost.id, text.trim(), tierChanged ? { minTierIndex: editMinTierIndex } : undefined);
      return;
    }
    const joinNode = stakeTier > 0;
    const shop: ShopInfo | undefined = shopEligible && shopEnabled
      ? { price: shopPriceNum, rebatePercent: shopRebate, stock: shopStockNum }
      : undefined;
    const postData = {
      title: (articleMode ? articleTitle : text).trim(),
      kind,
      // 参与小黄车的帖子对所有人公开，让买家下单前能看清商品
      visiblePercent: shop ? 100 : joinNode ? visibility : 100,
      isNode: joinNode,
      stakeTier,
      articleHasCover: articleMode ? hasCover : undefined,
      imageCount: imgCount > 0 ? imgCount : undefined,
      channelId: selectedChannel ? selectedChannel.id : undefined,
      minTierIndex: selectedChannel ? minTierIndex : undefined,
      shop,
    };
    if (joinNode) {
      stagePendingPost(postData);
      openPay({ ctx: 'post', stakeTier });
    } else {
      setPublishing(true);
      publishPost(postData);
    }
  };

  const handleSaveDraft = () => {
    if (!canSaveDraft) return;
    const draftData = {
      kind,
      title: text.trim(),
      articleTitle: articleTitle.trim(),
      articleHasCover: articleMode ? hasCover : undefined,
      imgCount: articleMode ? undefined : imgCount,
      hasVideo: articleMode ? undefined : hasVideo,
      joinGemini: stakeTier > 0,
      stakeTier,
      visibility,
    };
    if (draft) {
      updateDraft(draft.id, draftData);
    } else {
      saveDraft(draftData);
    }
    showToast(t('草稿已保存'));
    onClose();
  };

  const handleAddImage = () => {
    if (hasVideo || articleMode || imgCount >= 9) return;
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // 允许连续选中同一张图也能重新触发 change
    if (!files.length) return;
    const picked = files.slice(0, Math.max(0, 9 - imgCount));
    if (!picked.length) return;
    setImgUrls(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))]);
    setImgCount(c => Math.min(c + picked.length, 9));
  };

  const handleRemoveImage = (idx: number) => {
    setImgUrls(prev => {
      const url = prev[idx];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== idx);
    });
    setImgCount(c => Math.max(0, c - 1));
  };

  const handleToggleVideo = () => {
    if (imgCount > 0 || articleMode) return;
    setHasVideo(v => !v);
  };

  const handleToggleArticle = () => {
    if (imgCount > 0 || hasVideo) return;
    setArticleMode(v => !v);
  };

  const blockDefs = [
    { tag: 'p',  label: t('正文') },
    { tag: 'h1', label: 'H1' },
    { tag: 'h2', label: 'H2' },
    { tag: 'h3', label: 'H3' },
  ];

  return (
    <>
      <div className="page-header compose-modal-header">
        <div className="more-menu-wrap more-menu-wrap--compose-close">
          <button
            className="back-btn"
            type="button"
            onClick={(e) => { e.stopPropagation(); handleCloseAttempt(); }}
            aria-label={t('关闭')}
            aria-expanded={exitMenuOpen}
            aria-haspopup="menu"
          >
            <X size={22} strokeWidth={2} />
          </button>
          {exitMenuOpen && (
            <div className="more-dropdown" role="menu" onClick={e => e.stopPropagation()}>
              {canSaveDraft && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setExitMenuOpen(false); handleSaveDraft(); }}
                >
                  <Save size={14} strokeWidth={2.2} />
                  {t('保存草稿')}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className="more-dropdown__danger"
                onClick={() => { setExitMenuOpen(false); onClose(); }}
              >
                <Trash2 size={14} strokeWidth={2.2} />
                {isEditMode ? t('放弃修改') : t('放弃')}
              </button>
            </div>
          )}
        </div>
        <span className="page-title">
          {isEditMode ? t('编辑帖子') : draft ? t('编辑草稿') : t('发帖')}
        </span>
        <div className="compose-header-actions">
          {canSaveDraft && (
            <button
              className="draft-save-btn"
              type="button"
              onClick={handleSaveDraft}
              aria-label={t('保存草稿')}
            >
              <Save size={14} strokeWidth={2} />
              {t('保存草稿2')}
            </button>
          )}
          <button
            className={`publish-btn${canPublish && !publishing ? '' : ' publish-btn--disabled'}`}
            type="button"
            onClick={handlePublish}
            disabled={!canPublish || publishing}
          >
            {isEditMode ? <Save size={14} strokeWidth={2.2} /> : <Send size={14} strokeWidth={2.2} />}
            {publishing ? t('发布中…') : isEditMode ? t('保存') : t('发布')}
          </button>
        </div>
      </div>

      <div className="compose-modal-body compose-body">
        {/* —— 长文模式 —— */}
        {articleMode && !isEditMode && (
          <>
            <input
              className="compose-title-input"
              type="text"
              placeholder={t('文章标题…')}
              value={articleTitle}
              onChange={e => setArticleTitle(e.target.value)}
            />

            <div className="compose-cover-meta">
              <span className="compose-cover-label">{t('封面')}</span>
              <span className="compose-cover-optional">{t('（选填）')}</span>
            </div>

            {hasCover ? (
              <div className="compose-cover-thumb">
                <button
                  className="compose-img-remove"
                  type="button"
                  onClick={() => setHasCover(false)}
                  aria-label={t('移除封面')}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="compose-cover-add"
                onClick={() => setHasCover(true)}
              >
                <Plus size={16} strokeWidth={2} />
                {t('添加封面图片')}
              </button>
            )}

            {/* 格式工具栏 */}
            <div className="article-fmt-bar" role="toolbar" aria-label={t('格式工具栏')}>
              <button
                type="button"
                className={`afmt-btn afmt-btn--bold${activeFormats.has('bold') ? ' afmt-btn--active' : ''}`}
                onClick={() => execFormat('bold')}
                aria-label={t('加粗')}
                aria-pressed={activeFormats.has('bold')}
              >
                <Bold size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className={`afmt-btn afmt-btn--ital${activeFormats.has('italic') ? ' afmt-btn--active' : ''}`}
                onClick={() => execFormat('italic')}
                aria-label={t('斜体')}
                aria-pressed={activeFormats.has('italic')}
              >
                <Italic size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className={`afmt-btn${activeFormats.has('underline') ? ' afmt-btn--active' : ''}`}
                onClick={() => execFormat('underline')}
                aria-label={t('下划线')}
                aria-pressed={activeFormats.has('underline')}
              >
                <Underline size={14} strokeWidth={2.2} />
              </button>
              <div className="afmt-sep" />
              <button
                type="button"
                className={`afmt-btn afmt-btn--text${currentBlock === 'h1' ? ' afmt-btn--active' : ''}`}
                onClick={() => handleBlock('h1')}
                aria-label={t('标题 1')}
              >
                H1
              </button>
              <button
                type="button"
                className={`afmt-btn afmt-btn--text${currentBlock === 'h2' ? ' afmt-btn--active' : ''}`}
                onClick={() => handleBlock('h2')}
                aria-label={t('标题 2')}
              >
                H2
              </button>
              <button
                type="button"
                className={`afmt-btn afmt-btn--text${currentBlock === 'h3' ? ' afmt-btn--active' : ''}`}
                onClick={() => handleBlock('h3')}
                aria-label={t('标题 3')}
              >
                H3
              </button>
              <div className="afmt-sep" />
              <button
                type="button"
                className={`afmt-btn${activeFormats.has('ul') ? ' afmt-btn--active' : ''}`}
                onClick={() => execFormat('insertUnorderedList')}
                aria-label={t('无序列表')}
                aria-pressed={activeFormats.has('ul')}
              >
                <List size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className={`afmt-btn${activeFormats.has('ol') ? ' afmt-btn--active' : ''}`}
                onClick={() => execFormat('insertOrderedList')}
                aria-label={t('有序列表')}
                aria-pressed={activeFormats.has('ol')}
              >
                <ListOrdered size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className={`afmt-btn${currentBlock === 'blockquote' ? ' afmt-btn--active' : ''}`}
                onClick={() => handleBlock('blockquote')}
                aria-label={t('引用')}
              >
                <Quote size={14} strokeWidth={2.2} />
              </button>
            </div>

            <div
              ref={editorRef}
              className="rte-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder={t('开始写文章…')}
              role="textbox"
              aria-multiline="true"
              aria-label={t('文章内容编辑器')}
              onInput={() => setArticleBodyHasContent(!!editorRef.current?.textContent?.trim())}
              onKeyDown={e => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  document.execCommand('insertHTML', false, '  ');
                }
              }}
            />
          </>
        )}

        {/* —— 非长文模式 —— */}
        {!articleMode && (
          <>
            {/* 主编辑框 */}
            <div className="compose-input-wrap">
              <textarea
                className={`compose-input${isOverLimit ? ' compose-input--error' : ''}${isEditMode ? ' compose-input--readonly' : ''}`}
                placeholder={t('分享你的知识…')}
                value={text}
                onChange={e => { if (!isEditMode) setText(e.target.value); }}
                readOnly={isEditMode}
                aria-label={t('帖子内容')}
              />
              {isEditMode ? (
                <p className="compose-readonly-hint">
                  {t('已发布内容不可修改，仅支持调整可见档位')}
                </p>
              ) : (
                <>
                  <div className={`compose-char-count${isOverLimit ? ' compose-char-count--error' : ''}`}>
                    <span>{text.length}</span>
                    <span className="compose-char-sep">/</span>
                    <span>{MAX_POST_CHARS}</span>
                  </div>
                  {isOverLimit && (
                    <p className="compose-char-error">
                      {t('超出字数限制 {MAX_POST_CHARS} 字', { MAX_POST_CHARS: text.length - MAX_POST_CHARS })}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* 图片添加 & 已选图片（编辑模式隐藏）*/}
            {!isEditMode && !hasVideo && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelected}
                  style={{ display: 'none' }}
                />
                <div className="compose-img-grid">
                  {Array.from({ length: imgCount }, (_, i) => (
                    <div
                      key={i}
                      className="compose-img-thumb"
                      style={imgUrls[i] ? { backgroundImage: `url(${imgUrls[i]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    >
                      <button
                        className="compose-img-remove"
                        onClick={() => handleRemoveImage(i)}
                        aria-label={t('移除图片')}
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                  {imgCount < 9 && (
                    <button
                      type="button"
                      className="compose-img-add"
                      onClick={handleAddImage}
                      aria-label={t('拍照或从相册选择图片')}
                    >
                      <Camera size={18} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 已添加的视频（编辑模式隐藏）*/}
            {!isEditMode && hasVideo && (
              <div className="compose-video-thumb">
                {draft?.thumbnailUrl ? (
                  <div className="compose-video-cover">
                    <ImageWithFallback src={draft.thumbnailUrl} alt="" className="compose-video-cover-img" />
                    <div className="compose-video-cover-play"><span /></div>
                  </div>
                ) : (
                  <div className="compose-video-play"><span /></div>
                )}
                <span className="compose-video-label">{t('已添加视频')}</span>
                <button
                  className="compose-video-remove"
                  type="button"
                  onClick={() => setHasVideo(false)}
                  aria-label={t('移除视频')}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            )}
          </>
        )}

        {/* 同步至频道（仅拥有频道时可见）—— 频道门槛优先于知识宇宙单条付费生效，所以放在前面。
            一个人可拥有多个频道，用可搜索的单选选择器代替原来的单频道开关 */}
        {!isEditMode && myChannels.length > 0 && (
          <div className="compose-section compose-stake-section compose-stake-section--channel">
            <div className="compose-stake-heading">
              <Radio size={16} strokeWidth={2} />
              <span>{t('同步至频道')}</span>
            </div>
            <button
              type="button"
              className="compose-channel-picker-trigger"
              onClick={() => setChannelPickerOpen(true)}
            >
              <span className="compose-channel-picker-trigger-label">
                {selectedChannel ? selectedChannel.name : t('不同步到任何频道')}
              </span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden />
            </button>
            {selectedChannel && selectedChannel.tiers.length > 0 && (
              <>
                <p className="compose-stake-hint">
                  {t('选择可见的最低会员档位')}
                </p>
                <div className="stake-tier-list" role="radiogroup" aria-label={t('可见档位')}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={minTierIndex === undefined}
                    className={`stake-tier-option stake-tier-option--channel${minTierIndex === undefined ? ' stake-tier-option--active' : ''}`}
                    onClick={() => setMinTierIndex(undefined)}
                  >
                    <span className="stake-tier-option__amount">{t('不限档位')}</span>
                    <span className="stake-tier-option__desc">{t('无需订阅频道即可看到该帖子')}</span>
                  </button>
                  {selectedChannel.tiers.map((tier, idx) => {
                    // 已下架档位不再作为新内容的门槛可选项——新访客买不到这一档，
                    // 拿它做门槛会导致内容永远没人能解锁
                    if (tier.archived) return null;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        role="radio"
                        aria-checked={minTierIndex === idx}
                        className={`stake-tier-option stake-tier-option--channel${minTierIndex === idx ? ' stake-tier-option--active' : ''}`}
                        onClick={() => setMinTierIndex(idx)}
                      >
                        <span className="stake-tier-option__amount">{tier.name} · {tier.price} PB/{t('月')}</span>
                        <span className="stake-tier-option__desc">{t('需订阅达到 {name} 及以上2', { name: tier.name })}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* 编辑已发布的频道帖子：可调整可见档位，但只能单向放宽（降低门槛/改成不限档位），
            不能收紧（提高门槛）——已经被看过的内容不能再收回去锁上 */}
        {isEditMode && editPostChannel && (
          <div className="compose-section compose-stake-section compose-stake-section--channel">
            <div className="compose-stake-heading">
              <Radio size={16} strokeWidth={2} />
              <span>{t('可见档位《{name}》', { name: editPostChannel.name })}</span>
            </div>
            <p className="compose-stake-hint">
              {originalMinTierIndex === undefined
                ? t('该帖已不限档位，无需订阅即可查看')
                : t('只能调整为更宽松的档位，不能提高门槛')}
            </p>
            <div className="stake-tier-list" role="radiogroup" aria-label={t('可见档位')}>
              <button
                type="button"
                role="radio"
                aria-checked={editMinTierIndex === undefined}
                className={`stake-tier-option stake-tier-option--channel${editMinTierIndex === undefined ? ' stake-tier-option--active' : ''}`}
                onClick={() => setEditMinTierIndex(undefined)}
              >
                <span className="stake-tier-option__amount">{t('不限档位')}</span>
                <span className="stake-tier-option__desc">{t('无需订阅频道即可看到该帖子')}</span>
              </button>
              {editPostChannel.tiers.map((tier, idx) => {
                if (tier.archived && editMinTierIndex !== idx) return null;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    role="radio"
                    disabled={!canLoosenTierTo(idx)}
                    aria-checked={editMinTierIndex === idx}
                    className={`stake-tier-option stake-tier-option--channel${editMinTierIndex === idx ? ' stake-tier-option--active' : ''}`}
                    onClick={() => setEditMinTierIndex(idx)}
                  >
                    <span className="stake-tier-option__amount">{tier.name} · {tier.price} PB/{t('月')}</span>
                    <span className="stake-tier-option__desc">{t('需订阅达到 {name} 及以上2', { name: tier.name })}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 参与知识宇宙面额（编辑模式隐藏；长文 / 普通帖均可选择，非强制）*/}
        {!isEditMode && (
          <div className="compose-section compose-stake-section">
            <div className="compose-stake-heading">
              <KnowledgePlanetIcon width={16} height={16} />
              <span>{t('参与知识宇宙')}</span>
            </div>
            <p className="compose-stake-hint">
              {t('选择质押面额，创建可链接的知识宇宙节点；可选择不加入')}
            </p>
            <div className="stake-tier-list stake-tier-list--grid2" role="radiogroup" aria-label={t('知识宇宙面额')}>
              {STAKE_TIERS.map(tier => {
                const active = stakeTier === tier;
                const zh = isChinese(language);
                return (
                  <button
                    key={tier}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`stake-tier-option${active ? ' stake-tier-option--active' : ''}`}
                    onClick={() => setStakeTier(tier)}
                  >
                    <span className="stake-tier-option__amount">
                      {stakeTierLabel(tier, zh)}
                    </span>
                    {tier === 0 && (
                      <span className="stake-tier-option__desc">
                        {stakeTierDescription(tier, zh)}
                      </span>
                    )}
                    {tier === 1000 && (
                      <span className="stake-tier-option__desc">
                        {t('可参与小黄车')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {stakeTier > 0 && (
              <div className="compose-stake-gas">
                <span className="compose-stake-gas-label">{t('Gas 费')}</span>
                <span className="compose-stake-gas-value">{SUP_COST_BY_TIER[stakeTier as Exclude<typeof stakeTier, 0>]} SUP</span>
              </div>
            )}

            {/* 小黄车：仅 1000 PB 节点帖可挂载。内联在同一张卡片里而非独立 section，
                这样选中 1000 PB 后开关就在原地展开，不会被推到折叠线以下 */}
            {shopEligible && (
              <div className="compose-shop-section" ref={shopSectionRef}>
                <button
                  type="button"
                  className="compose-shop-toggle"
                  role="switch"
                  aria-checked={shopEnabled}
                  onClick={() => setShopEnabled(v => !v)}
                >
                  <span className="compose-shop-toggle__label">
                    <ShoppingCart size={16} strokeWidth={2} />
                    {t('参与小黄车')}
                  </span>
                  <span className={`compose-shop-switch${shopEnabled ? ' compose-shop-switch--on' : ''}`} aria-hidden="true">
                    <span className="compose-shop-switch__dot" />
                  </span>
                </button>
                <p className="compose-stake-hint">
                  {t('开启后，读者能直接下单买走你的商品')}
                </p>

                {shopEnabled && !hasContacts && (
                  <div className="compose-shop-contacts-nudge">
                    <span>{t('联系方式是小黄车必填项，方便买家下单后找到你')}</span>
                    <button type="button" className="compose-shop-contacts-nudge__btn" onClick={() => { openEditProfileContacts(); handleCloseAttempt(); }}>
                      {t('去设置')}
                    </button>
                  </div>
                )}

                {shopEnabled && (
                  <div className="compose-shop-fields">
                    <label className="compose-shop-field">
                      <span className="compose-shop-field__label">{t('商品价格（PB）')}</span>
                      <input
                        type="number" inputMode="numeric" min={1}
                        className="compose-shop-input"
                        placeholder={t('如 2000')}
                        value={shopPrice}
                        onChange={e => setShopPrice(e.target.value)}
                      />
                      {shopPriceNum > 0 && (
                        <span className="compose-shop-field__hint">
                          {t('下单另收 {fee} SUP/件手续费', { fee: computeShopFee(shopPriceNum) })}
                        </span>
                      )}
                    </label>

                    <label className="compose-shop-field">
                      <span className="compose-shop-field__label">{t('库存')}</span>
                      <input
                        type="number" inputMode="numeric" min={1} step={1}
                        className="compose-shop-input"
                        placeholder={t('如 50')}
                        value={shopStock}
                        onChange={e => setShopStock(e.target.value)}
                      />
                    </label>

                    <div className="compose-shop-field">
                      <span className="compose-shop-field__label compose-shop-field__label--row">
                        <span>{t('优点返还比例')} · {shopRebate}%</span>
                        <button
                          type="button"
                          className="compose-shop-info-btn"
                          onClick={() => setRebateInfoOpen(true)}
                          aria-label={t('什么是优点返还')}
                        >
                          <Info size={13} strokeWidth={2} />
                        </button>
                      </span>
                      <input
                        type="range" min={0} max={SHOP_MAX_REBATE_PERCENT} step={5}
                        className="compose-shop-range"
                        value={shopRebate}
                        style={{ '--shop-range-pct': `${(shopRebate / SHOP_MAX_REBATE_PERCENT) * 100}%` } as CSSProperties}
                        onChange={e => setShopRebate(Number(e.target.value))}
                      />
                      <span className="compose-shop-field__hint">
                        {t('买家按此比例获得优点返还')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 付费可见度设置；参与小黄车时锁定为公开，让买家下单前能看清商品 */}
        {!isEditMode && stakeTier > 0 && (
          <div className="compose-section compose-section--divider">
            <div className="visibility-row">
              <span className="visibility-label">
                <Eye size={16} strokeWidth={2} aria-hidden="true" />
                {t('免费可见比例')}
              </span>
              {shopEnabled ? (
                <span className="visibility-locked">{t('公开')}</span>
              ) : (
                <div className="visibility-opts">
                  {[
                    { v: 0, label: t('完全隐藏') },
                    { v: 10, label: '10%' as const },
                    { v: 30, label: '30%' as const },
                    { v: 50, label: '50%' as const },
                    { v: 100, label: t('公开') },
                  ].map(({ v, label }) => (
                    <button
                      key={v}
                      type="button"
                      className={`vis-btn${visibility === v ? ' vis-btn--active' : ''}`}
                      onClick={() => setVisibility(v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {shopEnabled ? (
              <p className="compose-stake-hint">
                {t('参与小黄车的帖子对所有人公开')}
              </p>
            ) : selectedChannel && stakeTier > 0 ? (
              <p className="compose-stake-hint">
                {t('建议单条解锁价为该档月费的 2–10 倍')}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* 选择同步频道：支持搜索，避免频道数量达到千级时一次性渲染全部选项 */}
      {rebateInfoOpen && (
        <div className="sheet-backdrop" onClick={() => setRebateInfoOpen(false)}>
          <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{t('优点返还比例')}</span>
              <button type="button" className="modal-close" onClick={() => setRebateInfoOpen(false)} aria-label={t('关闭')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="pb-info-sheet-body">
              <p className="pb-info-sheet-para">
                {t('买家下单后，按成交额乘以这个比例获得「优点」积分奖励。')}
              </p>
              <p className="pb-info-sheet-para">
                {t('每 {pb} PB 成交额可返 1 优点，买家满 {per} 优点兑 1 张 ADN 抽奖券。', { pb: MERIT_PB_PER_POINT, per: MERIT_PER_ADN })}
              </p>
              <p className="pb-info-sheet-para">
                {t('比例可设 0–{max}%，设得越高，商品对买家越有吸引力。', { max: SHOP_MAX_REBATE_PERCENT })}
              </p>
            </div>
          </div>
        </div>
      )}

      {channelPickerOpen && (
        <div className="sheet-backdrop" onClick={() => setChannelPickerOpen(false)}>
          <div className="payment-sheet channel-picker-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{t('选择同步频道')}</span>
              <button type="button" className="modal-close" onClick={() => setChannelPickerOpen(false)} aria-label={t('关闭')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            {myChannels.length > 1 && (
              <div className="channel-directory-search-wrap channel-picker-search-wrap">
                <Search size={15} strokeWidth={2} className="channel-directory-search-icon" aria-hidden />
                <input
                  className="channel-directory-search-input"
                  type="text"
                  value={channelPicker.search}
                  onChange={e => channelPicker.setSearch(e.target.value)}
                  placeholder={t('搜索频道名称或简介')}
                  aria-label={t('搜索频道名称或简介')}
                />
              </div>
            )}
            <div className="channel-picker-list">
              <button
                type="button"
                className={`channel-picker-item${!selectedChannelId ? ' channel-picker-item--active' : ''}`}
                onClick={() => { setSelectedChannelId(undefined); setChannelPickerOpen(false); }}
              >
                <span className="channel-picker-item-info">
                  <span className="channel-picker-item-name">{t('不同步到任何频道')}</span>
                </span>
                {!selectedChannelId && <Check size={16} strokeWidth={2.5} aria-hidden />}
              </button>
              {channelPicker.visible.length === 0 ? (
                <div className="channel-directory-empty">{t('没有找到匹配的频道')}</div>
              ) : channelPicker.visible.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`channel-picker-item${selectedChannelId === c.id ? ' channel-picker-item--active' : ''}`}
                  onClick={() => {
                    setSelectedChannelId(c.id);
                    setMinTierIndex(undefined);
                    setChannelPickerOpen(false);
                  }}
                >
                  <Radio size={16} strokeWidth={2.2} className="channel-picker-item-radio" aria-hidden />
                  <span className="channel-picker-item-info">
                    <span className="channel-picker-item-name">{c.name}</span>
                    <span className="channel-picker-item-desc">
                      {t('{subscriberCount} 人已订阅', { subscriberCount: c.subscriberCount })}
                    </span>
                  </span>
                  {selectedChannelId === c.id && <Check size={16} strokeWidth={2.5} aria-hidden />}
                </button>
              ))}
              {channelPicker.hasMore && (
                <button type="button" className="channel-directory-more-btn" onClick={channelPicker.loadMore}>
                  {t('加载更多（剩余 {length}）', { length: channelPicker.filteredCount - channelPicker.visible.length })}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}