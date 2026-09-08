import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Bug, Lightbulb, HelpCircle, Flag, Camera, type LucideIcon } from 'lucide-react';
import { useApp } from '../AppContext';

const MAX_DESC = 500;
const MAX_SHOTS = 3;

type FeedbackKind = 'bug' | 'idea' | 'question' | 'report';

/** 反馈类型：图标 + 标题 + 对应的描述框占位提示，四类共用同一套提交流程。 */
const FEEDBACK_KINDS: { kind: FeedbackKind; icon: LucideIcon; label: string; placeholder: string }[] = [
  { kind: 'bug', icon: Bug, label: '功能异常', placeholder: '说说你当时在做什么、期待看到什么、实际出现了什么' },
  { kind: 'idea', icon: Lightbulb, label: '产品建议', placeholder: '说说你希望增加或改进的地方，以及它能帮你解决什么' },
  { kind: 'question', icon: HelpCircle, label: '使用疑问', placeholder: '说说你想完成的事，以及卡在了哪一步' },
  { kind: 'report', icon: Flag, label: '内容举报', placeholder: '说说是哪条内容、哪位作者，以及你认为的问题所在' },
];

/** 站内意见反馈提交浮层。演示原型，提交为本地模拟，不发送网络请求。 */
export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const { t, showToast } = useApp();
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [desc, setDesc] = useState('');
  const [contact, setContact] = useState('');
  const [shotUrls, setShotUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 关闭时释放尚未提交的预览 URL，避免这些 blob 一直占着内存
  const shotUrlsRef = useRef(shotUrls);
  shotUrlsRef.current = shotUrls;
  useEffect(() => () => { shotUrlsRef.current.forEach(url => URL.revokeObjectURL(url)); }, []);

  const active = FEEDBACK_KINDS.find(item => item.kind === kind)!;
  const canSubmit = desc.trim().length > 0;

  const handleFilesSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // 允许连续选中同一张图也能重新触发 change
    const picked = files.slice(0, Math.max(0, MAX_SHOTS - shotUrls.length));
    if (!picked.length) return;
    setShotUrls(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))]);
  };

  const handleRemoveShot = (idx: number) => {
    setShotUrls(prev => {
      const url = prev[idx];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = () => {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      showToast(t('反馈已收到，我们会尽快处理'));
      onClose();
    }, 900);
  };

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet feedback-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('意见反馈')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="sup-deposit-body">
          <div className="stake-code-block">
            <div className="stake-code-label-row">
              <span className="stake-code-label">{t('反馈类型')}</span>
            </div>
            <div className="stake-tier-list stake-tier-list--grid2">
              {FEEDBACK_KINDS.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.kind}
                    type="button"
                    className={`stake-tier-option feedback-kind-option${kind === item.kind ? ' stake-tier-option--active' : ''}`}
                    onClick={() => setKind(item.kind)}
                    aria-pressed={kind === item.kind}
                    disabled={submitting}
                  >
                    <Icon size={16} strokeWidth={2} className="feedback-kind-icon" aria-hidden="true" />
                    <span className="stake-tier-option__amount">{t(item.label)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="stake-code-block">
            <div className="stake-code-label-row">
              <span className="stake-code-label">{t('详细描述')}</span>
            </div>
            <textarea
              className="stake-code-input stake-code-textarea feedback-desc-input"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder={t(active.placeholder)}
              maxLength={MAX_DESC}
              rows={4}
              disabled={submitting}
            />
            <span className="edit-profile-charcount">{desc.length}/{MAX_DESC}</span>
          </div>

          <div className="stake-code-block">
            <div className="stake-code-label-row">
              <span className="stake-code-label">{t('截图')}</span>
              <span className="stake-code-optional-tag">{t('选填')}</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              style={{ display: 'none' }}
            />
            <div className="compose-img-grid">
              {shotUrls.map((url, i) => (
                <div
                  key={url}
                  className="compose-img-thumb"
                  style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <button
                    className="compose-img-remove"
                    onClick={() => handleRemoveShot(i)}
                    aria-label={t('移除图片')}
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
              {shotUrls.length < MAX_SHOTS && (
                <button
                  type="button"
                  className="compose-img-add"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t('添加截图')}
                  disabled={submitting}
                >
                  <Camera size={18} strokeWidth={2} />
                </button>
              )}
            </div>
            <span className="stake-code-caption">{t('最多 {count} 张，截图能帮我们更快定位', { count: MAX_SHOTS })}</span>
          </div>

          <div className="stake-code-block">
            <div className="stake-code-label-row">
              <span className="stake-code-label">{t('联系方式')}</span>
              <span className="stake-code-optional-tag">{t('选填')}</span>
            </div>
            <input
              className="stake-code-input feedback-contact-input"
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder={t('微信、WhatsApp 或邮箱，方便我们回访')}
              disabled={submitting}
            />
          </div>

          <button type="button" className="planet-confirm-btn" disabled={submitting || !canSubmit} onClick={handleSubmit}>
            {submitting ? <span className="spinner" /> : t('提交反馈')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
