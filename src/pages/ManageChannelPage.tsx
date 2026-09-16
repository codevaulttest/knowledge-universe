import { useRef, useState } from 'react';
import { Camera, Check, Copy, Plus, X } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { useApp } from '../AppContext';
import { PageHeader, AVATAR_COLORS } from '../components/shared';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { ChannelTierName } from '../components/ChannelTierMedal';
import { withFreeTier } from '../channelTiers';
import {
  ChannelCollaboratorsSection,
  MAX_CHANNEL_TIERS,
  channelTierPriceError,
  defaultTierPrice,
  isChannelTierPriceInvalid,
  normalizeTierNames,
  sanitizeTierPrices,
} from '../components/Overlays';
import type { Channel, ChannelTier, NewChannelData } from '../types';

export function ManageChannelPage({ channelId }: { channelId: string }) {
  const { t, goBack, canGoBack, channels, updateChannel, showToast } = useApp();
  const channel = channels.find(c => c.id === channelId);

  if (!channel) {
    return (
      <div className="page">
        <PageHeader title={t('管理频道')} onBack={canGoBack ? goBack : undefined} />
      </div>
    );
  }

  return <ManageChannelForm channel={channel} onSave={updateChannel} onBack={canGoBack ? goBack : undefined} showToast={showToast} t={t} />;
}

function ManageChannelForm({
  channel,
  onSave,
  onBack,
  showToast,
  t,
}: {
  channel: Channel;
  onSave: (channelId: string, data: NewChannelData) => void;
  onBack?: () => void;
  showToast: (message: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerBackgroundInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(channel.avatarUrl);
  const [headerBackgroundUrl, setHeaderBackgroundUrl] = useState<string | undefined>(channel.headerBackgroundUrl);
  const category = channel.category;
  const channelNodeCode = channel.nodeCode ?? channel.id.slice(-6).toUpperCase();
  const [nodeCodeCopied, setNodeCodeCopied] = useState(false);
  const [tiers, setTiers] = useState<ChannelTier[]>(() =>
    withFreeTier(normalizeTierNames(sanitizeTierPrices(channel.tiers))),
  );

  // 档位设置（涨价/降价/新增/下架）30 天内只能改一次；单纯改名称/简介/头像不受此限制
  const TIER_SETTINGS_COOLDOWN_DAYS = 30;
  const tierSettingsCooldownRemainingDays = (() => {
    if (!channel.tiersChangedAt) return 0;
    const elapsedDays = (Date.now() - channel.tiersChangedAt) / (24 * 60 * 60 * 1000);
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
  // 本次编辑中新增、还没保存过的档位（channel 里没有）可以直接移除。免费档不可下架/移除。
  const removeTier = (idx: number) => {
    if (!canEditTierSettings) { notifyTierSettingsLocked(); return; }
    if (tiers[idx]?.free) return;
    setTiers(prev => {
      const tier = prev[idx];
      const wasPersisted = channel.tiers.some(existing => existing.id === tier.id);
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
    && !tiers.some((_, idx) => isChannelTierPriceInvalid(tiers, idx));

  const copyNodeCode = async () => {
    if (!channelNodeCode) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(channelNodeCode);
      } else {
        const fallback = document.createElement('textarea');
        fallback.value = channelNodeCode;
        document.body.appendChild(fallback);
        fallback.select();
        document.execCommand('copy');
        fallback.remove();
      }
    } catch {
      const fallback = document.createElement('textarea');
      fallback.value = channelNodeCode;
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      fallback.remove();
    }
    setNodeCodeCopied(true);
    window.setTimeout(() => setNodeCodeCopied(false), 1800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleBackgroundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setHeaderBackgroundUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const normalizedTiers = normalizeTierNames(tiers);
    onSave(channel.id, {
      name: name.trim(),
      description: description.trim(),
      avatarUrl,
      headerBackgroundUrl,
      category,
      tiers: normalizedTiers,
    });
    if (onBack) onBack(); else window.history.back();
  };

  return (
    <div className="page">
      <PageHeader
        title={t('管理频道')}
        onBack={onBack}
        action={(
          <button
            type="button"
            className="edit-profile-save edit-profile-save--icon"
            disabled={!canSubmit}
            onClick={handleSubmit}
            aria-label={t('保存')}
          >
            {t('保存')}
          </button>
        )}
      />
      <div className="scroll-area">
        <div className="edit-profile-body">
          <div className="edit-profile-avatar-upload edit-profile-avatar-upload--background">
            {headerBackgroundUrl && (
              <img
                className="edit-profile-background-preview"
                src={headerBackgroundUrl}
                alt=""
                aria-hidden="true"
              />
            )}
            <div
              className="edit-profile-avatar-preview"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label={t('更换头像')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              <ImageWithFallback
                src={avatarUrl}
                alt=""
                className="edit-profile-avatar-img"
                fallback={<BoringAvatar size="100%" name={channel.avatarSeed} variant="beam" colors={AVATAR_COLORS} />}
              />
              <div className="edit-profile-avatar-badge">
                <Camera size={12} strokeWidth={2.5} />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div className="edit-profile-background-actions">
              <button
                type="button"
                className="edit-profile-background-action"
                onClick={() => headerBackgroundInputRef.current?.click()}
                aria-label={t('更换频道背景图')}
              >
                <span className="edit-profile-background-action-label">
                  <Camera size={13} strokeWidth={2.3} aria-hidden="true" />
                  {t('更换背景图')}
                </span>
              </button>
            </div>
            <input
              ref={headerBackgroundInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleBackgroundFileChange}
            />
          </div>

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

          {channelNodeCode && (
            <div className="edit-profile-field channel-node-code-field">
              <span className="edit-profile-label">{t('节点码')}</span>
              <div className="channel-node-code-value">
                <span>{channelNodeCode}</span>
                <button
                  type="button"
                  className={`channel-node-code-copy${nodeCodeCopied ? ' channel-node-code-copy--done' : ''}`}
                  onClick={copyNodeCode}
                  aria-label={t('复制节点编号')}
                  title={t('复制节点编号')}
                >
                  {nodeCodeCopied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2} />}
                </button>
              </div>
            </div>
          )}

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

          <ChannelCollaboratorsSection channel={channel} />
        </div>
      </div>
    </div>
  );
}
