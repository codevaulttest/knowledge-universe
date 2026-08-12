import { ClipboardList, ShoppingCart } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader } from '../components/shared';
import { formatTokenAmount } from '../stakeConfig';

export function ShopPage() {
  const { posts, goBack, canGoBack, navigate, t } = useApp();
  const products = posts.filter(p => p.shop);

  return (
    <div className="page">
      <PageHeader
        title={t('小黄车商城')}
        onBack={canGoBack ? goBack : undefined}
        action={(
          <button
            type="button"
            className="shop-orders-entry"
            onClick={() => navigate({ page: 'P_ORDERS' })}
            aria-label={t('我的订单')}
          >
            <ClipboardList size={20} strokeWidth={2} />
          </button>
        )}
      />
      <div className="scroll-area">
        <p className="shop-mall-hint">{t('这里是全部上架商品，点商品即可下单购买')}</p>
        {products.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <p>{t('暂无上架商品')}</p>
          </div>
        ) : (
          <div className="shop-grid">
            {products.map(p => (
              <button
                key={p.id}
                type="button"
                className="shop-card"
                onClick={() => navigate({ page: 'P_SHOP_ITEM', postId: p.id })}
              >
                <div className="shop-card-cover" aria-hidden="true">
                  <ShoppingCart size={30} strokeWidth={1.5} />
                </div>
                <div className="shop-card-body">
                  <p className="shop-card-title">{p.title.split('\n')[0]}</p>
                  <div className="shop-card-foot">
                    <span className="shop-card-price">{formatTokenAmount(p.shop!.price)} <span className="shop-card-price-unit">PB</span></span>
                    <span className="shop-card-seller">{p.author}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
