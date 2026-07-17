import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { Camera, FileText, Image, Plus, Radio, Save, Send, Trash2, Video, X, Bold, Italic, Underline, List, ListOrdered, Quote } from 'lucide-react';
import { useApp } from '../AppContext';
import { KnowledgePlanetIcon } from '../components/KnowledgePlanetIcon';
import { CURRENT_USER } from '../mockData';
import type { Draft, Post, StakeTier } from '../types';
import { STAKE_TIERS, stakeTierDescription, stakeTierLabel } from '../stakeConfig';

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
  const { openPay, showToast, updatePost, saveDraft, updateDraft, stagePendingPost, publishPost, t, language, channels } = useApp();
  const isEditMode = !!editPost;
  const myChannel = channels.find(c => c.ownerName === CURRENT_USER);
  // 编辑已发布的频道帖子时，可见档位允许调整，但只能单向放宽（降低门槛/改成不限档位），
  // 不能收紧（提高门槛）——已经被看过的内容不能再收回去锁上，参考 YouTube 只支持
  // "会员专属 → 公开"、不支持反向操作的惯例
  const editPostChannel = isEditMode && editPost?.channelId === myChannel?.id ? myChannel : undefined;
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
  const [publishToChannel, setPublishToChannel] = useState(false);
  const [minTierIndex, setMinTierIndex] = useState<number | undefined>(undefined);
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

  const canPublish = articleMode
    ? articleTitle.trim().length > 0 && articleBodyHasContent
    : text.trim().length > 0 && !isOverLimit;

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
    const postData = {
      title: (articleMode ? articleTitle : text).trim(),
      kind,
      visiblePercent: joinNode ? visibility : 100,
      isNode: joinNode,
      stakeTier,
      articleHasCover: articleMode ? hasCover : undefined,
      imageCount: imgCount > 0 ? imgCount : undefined,
      channelId: publishToChannel && myChannel ? myChannel.id : undefined,
      minTierIndex: publishToChannel && myChannel ? minTierIndex : undefined,
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
    showToast(t('草稿已保存', 'Draft saved'));
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

  const isTyped = kind !== 'text';
  const kindLabel: Record<Post['kind'], string> = {
    text: t('纯文字', 'Text'), image: t('图文', 'Photo'), video: t('视频', 'Video'), article: t('文章', 'Article'),
  };

  const blockDefs = [
    { tag: 'p',  label: t('正文', 'Body') },
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
            aria-label={t('关闭', 'Close')}
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
                  {t('保存草稿', 'Save draft')}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className="more-dropdown__danger"
                onClick={() => { setExitMenuOpen(false); onClose(); }}
              >
                <Trash2 size={14} strokeWidth={2.2} />
                {isEditMode ? t('放弃修改', 'Discard changes') : t('放弃', 'Discard')}
              </button>
            </div>
          )}
        </div>
        <span className="page-title">
          {isEditMode ? t('编辑帖子', 'Edit post') : draft ? t('编辑草稿', 'Edit draft') : t('发帖', 'Create post')}
        </span>
        <div className="compose-header-actions">
          {canSaveDraft && (
            <button
              className="draft-save-btn"
              type="button"
              onClick={handleSaveDraft}
              aria-label={t('保存草稿', 'Save draft')}
            >
              <Save size={14} strokeWidth={2} />
              {t('保存草稿', 'Save Draft')}
            </button>
          )}
          <button
            className={`publish-btn${canPublish && !publishing ? '' : ' publish-btn--disabled'}`}
            type="button"
            onClick={handlePublish}
            disabled={!canPublish || publishing}
          >
            {isEditMode ? <Save size={14} strokeWidth={2.2} /> : <Send size={14} strokeWidth={2.2} />}
            {publishing ? t('发布中…', 'Publishing…') : isEditMode ? t('保存', 'Save') : t('发布', 'Publish')}
          </button>
        </div>
      </div>

      <div className="compose-modal-body compose-body">
        {/* 类型标签行：编辑模式隐藏 */}
          {!isEditMode && (!draft || articleMode) && (
            <div className="compose-type-row">
              {!articleMode && isTyped && (
              <span className="compose-type-chip compose-type-chip--active">
                {kind === 'image' && <Image size={11} strokeWidth={2} aria-hidden />}
                {kind === 'video' && <Video size={11} strokeWidth={2} aria-hidden />}
                {kindLabel[kind]}
              </span>
            )}
            {/* 长文类型暂未开放 */}
          </div>
        )}

        {/* —— 长文模式 —— */}
        {articleMode && !isEditMode && (
          <>
            <input
              className="compose-title-input"
              type="text"
              placeholder={t('文章标题…', 'Article title…')}
              value={articleTitle}
              onChange={e => setArticleTitle(e.target.value)}
            />

            <div className="compose-cover-meta">
              <span className="compose-cover-label">{t('封面', 'Cover')}</span>
              <span className="compose-cover-optional">{t('（选填）', '(optional)')}</span>
            </div>

            {hasCover ? (
              <div className="compose-cover-thumb">
                <button
                  className="compose-img-remove"
                  type="button"
                  onClick={() => setHasCover(false)}
                  aria-label={t('移除封面', 'Remove cover')}
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
                {t('添加封面图片', 'Add cover image')}
              </button>
            )}

            {/* 格式工具栏 */}
            <div className="article-fmt-bar" role="toolbar" aria-label={t('格式工具栏', 'Formatting tools')}>
              <button
                type="button"
                className={`afmt-btn afmt-btn--bold${activeFormats.has('bold') ? ' afmt-btn--active' : ''}`}
                onClick={() => execFormat('bold')}
                aria-label={t('加粗', 'Bold')}
                aria-pressed={activeFormats.has('bold')}
              >
                <Bold size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className={`afmt-btn afmt-btn--ital${activeFormats.has('italic') ? ' afmt-btn--active' : ''}`}
                onClick={() => execFormat('italic')}
                aria-label={t('斜体', 'Italic')}
                aria-pressed={activeFormats.has('italic')}
              >
                <Italic size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className={`afmt-btn${activeFormats.has('underline') ? ' afmt-btn--active' : ''}`}
                onClick={() => execFormat('underline')}
                aria-label={t('下划线', 'Underline')}
                aria-pressed={activeFormats.has('underline')}
              >
                <Underline size={14} strokeWidth={2.2} />
              </button>
              <div className="afmt-sep" />
              <button
                type="button"
                className={`afmt-btn afmt-btn--text${currentBlock === 'h1' ? ' afmt-btn--active' : ''}`}
                onClick={() => handleBlock('h1')}
                aria-label={t('标题 1', 'Heading 1')}
              >
                H1
              </button>
              <button
                type="button"
                className={`afmt-btn afmt-btn--text${currentBlock === 'h2' ? ' afmt-btn--active' : ''}`}
                onClick={() => handleBlock('h2')}
                aria-label={t('标题 2', 'Heading 2')}
              >
                H2
              </button>
              <button
                type="button"
                className={`afmt-btn afmt-btn--text${currentBlock === 'h3' ? ' afmt-btn--active' : ''}`}
                onClick={() => handleBlock('h3')}
                aria-label={t('标题 3', 'Heading 3')}
              >
                H3
              </button>
              <div className="afmt-sep" />
              <button
                type="button"
                className={`afmt-btn${activeFormats.has('ul') ? ' afmt-btn--active' : ''}`}
                onClick={() => execFormat('insertUnorderedList')}
                aria-label={t('无序列表', 'Bullet list')}
                aria-pressed={activeFormats.has('ul')}
              >
                <List size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className={`afmt-btn${activeFormats.has('ol') ? ' afmt-btn--active' : ''}`}
                onClick={() => execFormat('insertOrderedList')}
                aria-label={t('有序列表', 'Numbered list')}
                aria-pressed={activeFormats.has('ol')}
              >
                <ListOrdered size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className={`afmt-btn${currentBlock === 'blockquote' ? ' afmt-btn--active' : ''}`}
                onClick={() => handleBlock('blockquote')}
                aria-label={t('引用', 'Blockquote')}
              >
                <Quote size={14} strokeWidth={2.2} />
              </button>
            </div>

            <div
              ref={editorRef}
              className="rte-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder={t('开始写文章…', 'Start writing your article…')}
              role="textbox"
              aria-multiline="true"
              aria-label={t('文章内容编辑器', 'Article content editor')}
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
                placeholder={t('分享你的知识…', 'Share your knowledge…')}
                value={text}
                onChange={e => { if (!isEditMode) setText(e.target.value); }}
                readOnly={isEditMode}
                aria-label={t('帖子内容', 'Post content')}
              />
              {isEditMode ? (
                <p className="compose-readonly-hint">
                  {t('已发布内容不可修改，仅支持调整可见档位', 'Published content can’t be edited — only the visible tier can be adjusted')}
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
                      {t(`超出字数限制 ${text.length - MAX_POST_CHARS} 字`, `${text.length - MAX_POST_CHARS} characters over limit`)}
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
                        aria-label={t('移除图片', 'Remove image')}
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
                      aria-label={t('拍照或从相册选择图片', 'Take a photo or choose from your library')}
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
                    <img src={draft.thumbnailUrl} alt="" className="compose-video-cover-img" />
                    <div className="compose-video-cover-play"><span /></div>
                  </div>
                ) : (
                  <div className="compose-video-play"><span /></div>
                )}
                <span className="compose-video-label">{t('已添加视频', 'Video added')}</span>
                <button
                  className="compose-video-remove"
                  type="button"
                  onClick={() => setHasVideo(false)}
                  aria-label={t('移除视频', 'Remove video')}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            )}
          </>
        )}

        {/* 同步至我的频道（仅频道主可见）—— 频道门槛优先于知识星球单条付费生效，所以放在前面 */}
        {!isEditMode && myChannel && (
          <div className="compose-section compose-stake-section compose-stake-section--channel">
            <div className="compose-stake-heading">
              <Radio size={16} strokeWidth={2} />
              <span>{t(`同步至我的频道《${myChannel.name}》`, `Sync to my channel "${myChannel.name}"`)}</span>
              <button
                type="button"
                className={`toggle-switch${publishToChannel ? ' toggle-switch--on' : ''}`}
                onClick={() => setPublishToChannel(v => !v)}
                role="switch"
                aria-checked={publishToChannel}
                style={{ marginLeft: 'auto' }}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
            {publishToChannel && myChannel.tiers.length > 0 && (
              <>
                <p className="compose-stake-hint">
                  {t('选择可见的最低会员档位', 'Choose the minimum tier required to view')}
                </p>
                <div className="stake-tier-list" role="radiogroup" aria-label={t('可见档位', 'Visible tier')}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={minTierIndex === undefined}
                    className={`stake-tier-option stake-tier-option--channel${minTierIndex === undefined ? ' stake-tier-option--active' : ''}`}
                    onClick={() => setMinTierIndex(undefined)}
                  >
                    <span className="stake-tier-option__amount">{t('不限档位', 'No tier restriction')}</span>
                    <span className="stake-tier-option__desc">{t('无需订阅频道即可看到该帖子', 'No channel subscription needed to see this post')}</span>
                  </button>
                  {myChannel.tiers.map((tier, idx) => {
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
                        <span className="stake-tier-option__amount">{tier.name} · {tier.price} PB/{t('月', 'mo')}</span>
                        <span className="stake-tier-option__desc">{t(`需订阅达到 ${tier.name} 及以上`, `Requires ${tier.name} subscription or above`)}</span>
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
              <span>{t(`可见档位《${editPostChannel.name}》`, `Visible tier — "${editPostChannel.name}"`)}</span>
            </div>
            <p className="compose-stake-hint">
              {originalMinTierIndex === undefined
                ? t('该帖已不限档位，无需订阅即可查看', 'This post already has no tier restriction')
                : t('只能调整为更宽松的档位，不能提高门槛', 'You can only loosen the tier requirement, not raise it')}
            </p>
            <div className="stake-tier-list" role="radiogroup" aria-label={t('可见档位', 'Visible tier')}>
              <button
                type="button"
                role="radio"
                aria-checked={editMinTierIndex === undefined}
                className={`stake-tier-option stake-tier-option--channel${editMinTierIndex === undefined ? ' stake-tier-option--active' : ''}`}
                onClick={() => setEditMinTierIndex(undefined)}
              >
                <span className="stake-tier-option__amount">{t('不限档位', 'No tier restriction')}</span>
                <span className="stake-tier-option__desc">{t('无需订阅频道即可看到该帖子', 'No channel subscription needed to see this post')}</span>
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
                    <span className="stake-tier-option__amount">{tier.name} · {tier.price} PB/{t('月', 'mo')}</span>
                    <span className="stake-tier-option__desc">{t(`需订阅达到 ${tier.name} 及以上`, `Requires ${tier.name} subscription or above`)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 参与知识星球面额（编辑模式隐藏；长文 / 普通帖均可选择，非强制）*/}
        {!isEditMode && (
          <div className="compose-section compose-stake-section">
            <div className="compose-stake-heading">
              <KnowledgePlanetIcon width={16} height={16} />
              <span>{t('参与知识星球', 'Join Gemini')}</span>
            </div>
            <p className="compose-stake-hint">
              {t('选择质押面额，创建可链接的知识星球节点；可选择不加入', 'Pick a stake tier to create a linkable node; opting out is allowed')}
            </p>
            <div className="stake-tier-list" role="radiogroup" aria-label={t('知识星球面额', 'Gemini stake tier')}>
              {STAKE_TIERS.map(tier => {
                const active = stakeTier === tier;
                const zh = language === 'zh-CN';
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
                      {stakeTierLabel(tier, language === 'zh-CN')}
                    </span>
                    <span className="stake-tier-option__desc">
                      {stakeTierDescription(tier, language === 'zh-CN')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 付费可见度设置 */}
        {!isEditMode && stakeTier > 0 && (
          <div className="compose-section">
            <div className="visibility-row">
              <span className="visibility-label">
                {t('免费可见比例', 'Free preview')}
              </span>
              <div className="visibility-opts">
                {[
                  { v: 0, label: t('完全隐藏', 'Hidden') },
                  { v: 10, label: '10%' as const },
                  { v: 30, label: '30%' as const },
                  { v: 50, label: '50%' as const },
                  { v: 100, label: t('公开', 'Public') },
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
            </div>
            {publishToChannel && stakeTier > 0 && (
              <p className="compose-stake-hint">
                {t('建议单条解锁价为该档月费的 2–10 倍', 'Suggested unlock price: 2–10× the tier’s monthly fee')}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}