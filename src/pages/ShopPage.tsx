import { ClipboardList, Package, ScanLine, Search } from 'lucide-react';
import { useApp } from '../AppContext';
import { CURRENT_USER } from '../mockData';
import { MediaPlaceholder, PageHeader } from '../components/shared';
import { formatTokenAmount } from '../stakeConfig';
import { getShopMinPrice } from '../shopUtils';
import type { Post } from '../types';

/** 商城封面：无图或图片全部锁定时显示默认占位 */
export function shopCoverUsesPlaceholder(post: Post): boolean {
  if (post.kind === 'text') return true;
  if (post.kind === 'article' && post.articleHasCover === false) return true;
  if (post.kind === 'image') {
    const total = post.imageCount ?? 1;
    return Math.floor(post.visiblePercent / 100 * total) <= 0;
  }
  if (post.kind === 'video' && post.visiblePercent === 0) return true;
  return false;
}

export function shopCoverVisibleImgCount(post: Post): number {
  if (post.kind !== 'image') return 1;
  const total = post.imageCount ?? 1;
  return Math.max(1, Math.floor(post.visiblePercent / 100 * total));
}

/** 商品两列网格——供商城首页与「小黄车」搜索结果复用 */
export function ShopProductGrid({ products }: { products: Post[] }) {
  const { navigate, t } = useApp();
  if (products.length === 0) {
    return (
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <p>{t('暂无上架商品')}</p>
      </div>
    );
  }
  return (
    <div className="shop-grid">
      {products.map(p => (
        <button
          key={p.id}
          type="button"
          className="shop-card"
          onClick={() => navigate({ page: 'P_SHOP_ITEM', postId: p.id })}
        >
          <div className="shop-card-cover" aria-hidden="true">
            {shopCoverUsesPlaceholder(p) ? (
              <Package size={30} strokeWidth={1.5} />
            ) : (
              <MediaPlaceholder
                kind={p.kind}
                articleHasCover={p.articleHasCover}
                imageCount={p.kind === 'image' ? 1 : p.imageCount}
                imageAspect={p.imageAspect}
                visibleImgCount={shopCoverVisibleImgCount(p)}
              />
            )}
          </div>
          <div className="shop-card-body">
            <p className="shop-card-title">{p.title.split('\n')[0]}</p>
            <div className="shop-card-foot">
              <span className="shop-card-price">
                {formatTokenAmount(getShopMinPrice(p.shop!))} <span className="shop-card-price-unit">PB</span>
              </span>
              <span className="shop-card-seller">{p.author}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/** 商城内容（商品网格 + 我的订单入口）——供「商城」tab 与独立商城页复用 */
export function ShopFeed() {
  const { posts, shopOrders, navigate, openSearch, openScan, t } = useApp();
  const products = posts.filter(p => p.shop);
  // 待处理：作为买家已发货待收货 + 作为卖家待发货
  const pendingOrderCount = shopOrders.filter(o =>
    (o.buyerName === CURRENT_USER && o.status === 'shipped')
    || (o.sellerName === CURRENT_USER && o.status === 'to_ship')
  ).length;

  return (
    <>
      <div className="shop-mall-bar">
        <div className="shop-mall-search">
          <button
            type="button"
            className="shop-mall-search-field"
            onClick={() => openSearch({ shopOnly: true })}
          >
            <Search size={16} strokeWidth={2} className="shop-mall-search-icon" />
            <span className="shop-mall-search-placeholder">{t('搜索商品')}</span>
          </button>
          <button
            type="button"
            className="shop-mall-scan-btn"
            onClick={() => openScan()}
            aria-label={t('扫一扫')}
          >
            <ScanLine size={16} strokeWidth={2} />
          </button>
        </div>
        <button
          type="button"
          className="shop-orders-link"
          onClick={() => navigate({ page: 'P_ORDERS' })}
        >
          <ClipboardList size={16} strokeWidth={2} />
          {t('订单')}
          {pendingOrderCount > 0 && (
            <span className="shop-orders-link-badge" aria-label={t('{count} 笔待处理', { count: pendingOrderCount })}>
              {pendingOrderCount}
            </span>
          )}
        </button>
      </div>
      <ShopProductGrid products={products} />
    </>
  );
}

/** 独立商城页（保留：供直接跳转 P_SHOP 时使用）*/
export function ShopPage() {
  const { goBack, canGoBack, t } = useApp();
  return (
    <div className="page">
      <PageHeader title={t('小黄车商城')} onBack={canGoBack ? goBack : undefined} />
      <div className="scroll-area">
        <ShopFeed />
      </div>
    </div>
  );
}
