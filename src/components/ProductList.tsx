import type { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { useTranslation } from '../i18n/LanguageContext';
import { formatPrice } from '../lib/format';

interface ProductListProps {
  products: Product[];
  currency: string;
}

export function ProductList({ products, currency }: ProductListProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {products.map((product) => (
        <div key={product.id} className="glass-panel" style={{ 
          display: 'flex', 
          padding: 'var(--space-sm)', 
          gap: 'var(--space-md)',
          alignItems: 'center',
          border: '1px solid var(--border-glass)',
          background: 'var(--bg-surface)'
        }}>
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name} 
              style={{ width: 80, height: 80, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-sm)', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🍔
            </div>
          )}
          
          <div style={{ flex: 1, padding: 'var(--space-xs) 0' }}>
            <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: '600', marginBottom: '2px', color: 'var(--text-primary)' }}>{product.name}</h3>
            {product.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>
                {product.description}
              </p>
            )}
            <div style={{ fontWeight: 'bold', color: 'var(--primary-accent)', fontSize: 'var(--font-sm)' }}>
              {formatPrice(product.price, currency)}
            </div>
          </div>

          <button
            onClick={() => addItem(product)}
            className="btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: 'var(--radius-sm)',
              alignSelf: 'flex-end',
              marginBottom: '4px'
            }}
          >
            {t('product.add')}
          </button>
        </div>
      ))}
    </div>
  );
}
