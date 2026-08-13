import { useState } from 'react';
import { Check, ChevronRight, Circle, CircleCheck, MapPin, Minus, Package, Plus, Sparkles, Store, Trash2, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER } from '../mockData';
import type { ShippingAddress, ShopOrder } from '../types';
import { MediaPlaceholder, PageHeader } from '../components/shared';
import { shopCoverUsesPlaceholder, shopCoverVisibleImgCount } from './ShopPage';
import { formatTokenAmount } from '../stakeConfig';
import { computeShopFee, computeUnitMerit, formatShopFee, MERIT_PER_ADN } from '../shopConfig';
import { Ios26Alert } from '../components/Overlays';
import { RegionPicker } from '../components/RegionPicker';

export function ShopItemPage({ postId, onClose }: { postId: string; onClose: () => void }) {
  const {
    posts, navigate, t, requireWallet,
    shippingAddresses, defaultAddress, addShippingAddress, removeShippingAddress, setDefaultAddress,
    placeShopOrder, showToast, openImageLightbox,
  } = useApp();

  const post = posts.find(p => p.id === postId);
  const [qty, setQty] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(defaultAddress?.id ?? null);
  const [placed, setPlaced] = useState<ShopOrder | null>(null);
  // 新增地址表单
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRegion, setFormRegion] = useState('');
  const [formDetail, setFormDetail] = useState('');
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [pendingDeleteAddrId, setPendingDeleteAddrId] = useState<string | null>(null);

  if (!post || !post.shop) {
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="payment-sheet shop-item-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sheet-header">
            <span className="sheet-title">{t('商品详情')}</span>
            <button type="button" className="sheet-close" onClick={onClose} aria-label={t('关闭')}><X size={18} strokeWidth={2} /></button>
          </div>
          <p style={{ color: 'var(--ku-color-text-meta)', textAlign: 'center', padding: '32px 0' }}>{t('该商品已下架')}</p>
        </div>
      </div>
    );
  }

  const { price, rebatePercent, stock } = post.shop;
  const isOwn = post.author === CURRENT_USER;
  const unitFee = computeShopFee(price);
  const totalPb = price * qty;
  const totalSup = Math.round(unitFee * qty * 10000) / 10000;
  const estMerit = computeUnitMerit(price, rebatePercent) * qty;
  const selectedAddress = shippingAddresses.find(a => a.id === selectedAddressId) ?? defaultAddress ?? null;
  const soldOut = stock <= 0;

  const changeQty = (delta: number) => {
    setQty(q => Math.min(Math.max(1, q + delta), Math.max(1, stock)));
  };

  const formValid = !!(formName.trim() && formPhone.trim() && formRegion && formDetail.trim());

  const submitAddress = () => {
    if (!formValid) return;
    const addr = addShippingAddress({
      name: formName.trim(),
      phone: formPhone.trim(),
      region: formRegion,
      detail: formDetail.trim(),
      isDefault: shippingAddresses.length === 0,
    });
    setSelectedAddressId(addr.id);
    setFormName(''); setFormPhone(''); setFormRegion(''); setFormDetail('');
    setAddOpen(false);
    setPickerOpen(false);
  };

  const buy = () => {
    if (soldOut || isOwn) return;
    if (!selectedAddress) { setPickerOpen(true); return; }
    requireWallet(() => {
      const order = placeShopOrder(post.id, qty, selectedAddress);
      if (order) setPlaced(order);
      else showToast(t('下单失败，请稍后重试'));
    });
  };

  const fullAddr = (a: ShippingAddress) => [a.region, a.detail].filter(Boolean).join(' ');

  const deleteAddress = (addrId: string) => {
    const remaining = shippingAddresses.filter(a => a.id !== addrId);
    removeShippingAddress(addrId);
    if (selectedAddressId === addrId) {
      const fallback = remaining.find(a => a.isDefault) ?? remaining[0];
      setSelectedAddressId(fallback?.id ?? null);
    }
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet shop-item-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        {/* 弹窗头：标题 + 关闭 */}
        <div className="sheet-header">
          <span className="sheet-title">{t('商品详情')}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label={t('关闭')}><X size={18} strokeWidth={2} /></button>
        </div>

        {/* 商品图片：只显示首图，无图 / 全锁时回退为占位图 */}
        <div className="shop-item-cover" aria-hidden={shopCoverUsesPlaceholder(post) ? true : undefined}>
          {shopCoverUsesPlaceholder(post) ? (
            <Package size={54} strokeWidth={1.5} />
          ) : (
            <MediaPlaceholder
              kind={post.kind}
              articleHasCover={post.articleHasCover}
              imageCount={post.kind === 'image' ? 1 : post.imageCount}
              imageAspect={post.imageAspect}
              visibleImgCount={shopCoverVisibleImgCount(post)}
              onImageClick={post.kind === 'image' ? () => openImageLightbox(post, 0, shopCoverVisibleImgCount(post)) : undefined}
            />
          )}
        </div>

        {/* 正文 */}
        <div className="shop-item-body">
          <div className="shop-item-intro">
            <h2 className="shop-item-title">{post.title}</h2>
            <button
              type="button"
              className="shop-item-seller"
              onClick={() => navigate({ page: 'P6', authorName: post.author })}
              aria-label={t('卖家：{name}', { name: post.author })}
            >
              <Store size={14} strokeWidth={2} aria-hidden="true" />
              {post.author}
              <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div className="shop-item-pricebar">
            <span className="shop-item-price">{formatTokenAmount(price)} <span className="shop-item-price-unit">PB</span></span>
          </div>

          {/* 数量 */}
          <div className="shop-item-qty-group">
            <div className="shop-item-row">
              <span className="shop-item-row-label">{t('购买数量')}</span>
              <div className="shop-qty">
                <button type="button" className="shop-qty-btn" onClick={() => changeQty(-1)} disabled={qty <= 1} aria-label={t('减少')}>
                  <Minus size={16} strokeWidth={2.4} />
                </button>
                <input
                  className="shop-qty-value"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={stock}
                  value={qty}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setQty(Math.min(Math.max(1, v), Math.max(1, stock)));
                  }}
                  onBlur={e => {
                    const v = parseInt(e.target.value, 10);
                    setQty(isNaN(v) ? 1 : Math.min(Math.max(1, v), Math.max(1, stock)));
                  }}
                  aria-label={t('购买数量')}
                />
                <button type="button" className="shop-qty-btn" onClick={() => changeQty(1)} disabled={qty >= stock} aria-label={t('增加')}>
                  <Plus size={16} strokeWidth={2.4} />
                </button>
              </div>
            </div>
            <p className="shop-item-stock">{t('库存：{stock} 件', { stock })}</p>
          </div>

          {/* 收货地址 */}
          <button type="button" className="shop-item-addr" onClick={() => setPickerOpen(true)}>
            <MapPin size={17} strokeWidth={2} className="shop-item-addr-icon" />
            {selectedAddress ? (
              <span className="shop-item-addr-text">
                <span className="shop-item-addr-line1">{selectedAddress.name} · {selectedAddress.phone}</span>
                <span className="shop-item-addr-line2">{fullAddr(selectedAddress)}</span>
              </span>
            ) : (
              <span className="shop-item-addr-text shop-item-addr-empty">{t('请选择收货地址')}</span>
            )}
            <ChevronRight size={16} strokeWidth={2} />
          </button>

          {/* 优点返还 */}
          <div className="shop-item-merit">
            <Sparkles size={15} strokeWidth={2} />
            {t('本单预计返 {merit} 优点（满 {per} 优点兑 1 张 ADN 抽奖券）', { merit: estMerit, per: MERIT_PER_ADN })}
          </div>
        </div>

        {/* 合计 + 下单按钮 */}
        <div className="shop-item-buybar shop-item-buybar--sheet">
          <div className="shop-item-total">
            <span className="shop-item-total-label">{t('合计')}</span>
            <span className="shop-item-total-value">{formatTokenAmount(totalPb)} PB</span>
            <span className="shop-item-total-gas">{t('Gas 费')} {formatShopFee(totalSup)} SUP</span>
          </div>
          <button
            type="button"
            className="shop-buy-btn"
            onClick={buy}
            disabled={soldOut || isOwn}
          >
            {isOwn ? t('这是你的商品') : soldOut ? t('已售罄') : t('立即购买')}
          </button>
        </div>
      </div>
    </div>

      {/* 地址选择 / 新增 */}
      {pickerOpen && (
        <div className="sheet-backdrop" onClick={() => { setPickerOpen(false); setAddOpen(false); }}>
          <div className="payment-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">{addOpen ? t('新增收货地址') : t('选择收货地址')}</span>
            </div>
            {addOpen ? (
              <div className="shop-addr-form">
                <input className="compose-shop-input" placeholder={t('收货人姓名')} value={formName} onChange={e => setFormName(e.target.value)} />
                <input className="compose-shop-input" placeholder={t('手机号')} value={formPhone} onChange={e => setFormPhone(e.target.value)} />
                <button
                  type="button"
                  className={`shop-addr-region-btn${formRegion ? ' shop-addr-region-btn--filled' : ''}`}
                  onClick={() => setRegionPickerOpen(true)}
                >
                  <MapPin size={15} strokeWidth={2} aria-hidden="true" />
                  <span className="shop-addr-region-text">{formRegion || t('选择省 / 市 / 区')}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                </button>
                <textarea className="compose-shop-input shop-addr-detail" placeholder={t('详细地址（街道、门牌号）')} value={formDetail} onChange={e => setFormDetail(e.target.value)} />
                <button type="button" className="shop-addr-save-btn" onClick={submitAddress} disabled={!formValid}>
                  {t('保存并使用')}
                </button>
              </div>
            ) : (
              <>
                <div className="shop-addr-list">
                  {shippingAddresses.map(addr => (
                    <div
                      key={addr.id}
                      className={`shop-addr-item${selectedAddressId === addr.id ? ' shop-addr-item--active' : ''}`}
                    >
                      <div className="shop-addr-item-row">
                        <button
                          type="button"
                          className="shop-addr-item-main"
                          onClick={() => { setSelectedAddressId(addr.id); setPickerOpen(false); }}
                        >
                          <span className="shop-item-addr-text">
                            <span className="shop-item-addr-line1">{addr.name} · {addr.phone}</span>
                            <span className="shop-item-addr-line2">{fullAddr(addr)}</span>
                          </span>
                          {selectedAddressId === addr.id && <Check size={16} strokeWidth={2.4} className="shop-addr-check" />}
                        </button>
                        <button
                          type="button"
                          className="shop-addr-delete"
                          onClick={() => setPendingDeleteAddrId(addr.id)}
                          aria-label={t('删除')}
                        >
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                      </div>
                      {addr.isDefault ? (
                        <span className="shop-addr-default-flag">
                          <CircleCheck size={15} strokeWidth={2} />{t('默认地址')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="shop-addr-setdefault"
                          onClick={() => setDefaultAddress(addr.id)}
                        >
                          <Circle size={15} strokeWidth={2} />{t('设为默认')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="shop-addr-add-btn" onClick={() => setAddOpen(true)}>
                  <Plus size={16} strokeWidth={2.2} />{t('新增收货地址')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 省 / 市 / 区级联选择 */}
      {regionPickerOpen && (
        <RegionPicker
          onSelect={(region) => { setFormRegion(region); setRegionPickerOpen(false); }}
          onClose={() => setRegionPickerOpen(false)}
        />
      )}

      {/* 删除地址二次确认 */}
      {pendingDeleteAddrId && (
        <Ios26Alert
          title={t('删除收货地址')}
          message={t('确定要删除该收货地址吗？')}
          cancelLabel={t('取消')}
          confirmLabel={t('删除')}
          onCancel={() => setPendingDeleteAddrId(null)}
          onConfirm={() => {
            deleteAddress(pendingDeleteAddrId);
            setPendingDeleteAddrId(null);
          }}
        />
      )}

      {/* 下单成功 */}
      {placed && (
        <div className="sheet-backdrop">
          <div className="payment-sheet shop-success" role="dialog" aria-modal="true">
            <div className="shop-success-check"><Check size={30} strokeWidth={2.6} /></div>
            <p className="shop-success-title">{t('下单成功')}</p>
            <p className="shop-success-sub">
              {t('已扣商品款 {pb} PB、Gas 费 {sup} SUP，货款将于收货后次月 15 日结算给卖家', {
                pb: formatTokenAmount(placed.unitPrice * placed.quantity),
                sup: formatShopFee(Math.round(placed.unitFee * placed.quantity * 10000) / 10000),
              })}
            </p>
            <div className="shop-success-merit">
              <Sparkles size={14} strokeWidth={2} />
              {t('预计返 {merit} 优点', { merit: placed.estMerit })}
            </div>
            <div className="shop-success-actions">
              <button type="button" className="shop-success-btn shop-success-btn--ghost" onClick={() => { setPlaced(null); onClose(); }}>
                {t('继续逛')}
              </button>
              <button type="button" className="shop-success-btn" onClick={() => { setPlaced(null); navigate({ page: 'P_ORDERS', role: 'buyer' }); }}>
                {t('查看订单')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
