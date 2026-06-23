import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { ProductList } from '../components/ProductList';
import { CartDrawer } from '../components/CartDrawer';
import { OrderStatusBanner } from '../components/OrderStatusBanner';
import { LanguageSelect } from '../components/LanguageSelect';
import { useCartStore } from '../store/cartStore';
import { useTranslation } from '../i18n/LanguageContext';
import { localizeProduct, localizeText } from '../i18n/menuData';
import { fetchEstablishmentMenu } from '../lib/menuApi';
import type { Category, Product } from '../types';

const ALL_CATEGORY = 'all';

export function EstablishmentHome() {
  const { slug } = useParams<{ slug: string }>();
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const { language, t } = useTranslation();
  const { getTotalItems, toggleDrawer } = useCartStore();

  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState('FCFA');
  const [mobileMoneyEnabled, setMobileMoneyEnabled] = useState(false);
  const [name, setName] = useState<string | null>(null);

  const totalItems = getTotalItems();
  const slugName = slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'MoodPass';
  const establishmentName = name || slugName;

  useEffect(() => {
    let active = true;
    fetchEstablishmentMenu(slug).then(({ name, products, categories, currency, mobileMoneyEnabled }) => {
      if (!active) return;
      setName(name);
      setRawProducts(products);
      setCategories(categories);
      setCurrency(currency);
      setMobileMoneyEnabled(mobileMoneyEnabled);
      setActiveCategory(ALL_CATEGORY);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  const products = useMemo(
    () => rawProducts.map((p) => localizeProduct(p, language)),
    [rawProducts, language],
  );

  // Carousel shows the establishment's own dish photos (no generic stock images).
  const carouselProducts = useMemo(
    () => products.filter((p) => p.image_url).slice(0, 6),
    [products],
  );

  // Only show categories that actually have products, plus the "All" tab.
  const tabs = useMemo(() => {
    const usedIds = new Set(rawProducts.map((p) => p.category_id));
    const categoryTabs = categories
      .filter((c) => usedIds.has(c.id))
      .map((c) => ({ id: c.id, label: localizeText(c.name_i18n, language, c.name) }));
    return [{ id: ALL_CATEGORY, label: t('category.all') }, ...categoryTabs];
  }, [categories, rawProducts, language, t]);

  const visibleProducts = useMemo(
    () => (activeCategory === ALL_CATEGORY ? products : products.filter((p) => p.category_id === activeCategory)),
    [products, activeCategory],
  );

  const activeTabLabel = tabs.find((tab) => tab.id === activeCategory)?.label ?? t('menu.title');

  return (
    <div className="animate-fade-in app-container" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>

      {/* Header with Gradient and Language Selector */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-card)' }}>
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=MP&backgroundColor=ef4444" alt="Logo" loading="lazy" decoding="async" width={40} height={40} style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)' }} />
          </div>
          <h1 style={{ lineHeight: 1.1 }}>
            {establishmentName}
            <div style={{ fontSize: '9px', fontWeight: 'normal', opacity: 0.9 }}>{t('header.subtitle')}</div>
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {/* Language Selector */}
          <LanguageSelect />

          {/* Cart Icon */}
          <button 
            onClick={toggleDrawer}
            style={{ position: 'relative', width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: 'white' }}
          >
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <div style={{ position: 'absolute', top: -4, right: -4, background: 'white', color: 'var(--primary-red)', fontSize: 11, fontWeight: 'bold', width: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-card)' }}>
                {totalItems}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-color)', paddingBottom: '80px' }}>
        
        {/* Dish photo carousel — only when the establishment has product photos */}
        {carouselProducts.length > 0 && (
          <div style={{ margin: 'var(--space-md) 0' }}>
            <div className="scroll-container">
              {carouselProducts.map((p, idx) => (
                <div key={p.id} className="scroll-item" style={{ width: '85%', height: '160px', position: 'relative', background: 'var(--bg-surface)' }}>
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: 'var(--space-sm)', left: 'var(--space-md)', color: 'white', fontWeight: 'bold', fontSize: 'var(--font-lg)' }}>
                    {p.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories horizontally scrollable */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', paddingTop: 'var(--space-sm)', paddingBottom: 'var(--space-sm)', borderBottom: 'var(--border-glass)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', overflowX: 'auto', scrollbarWidth: 'none', padding: '0 var(--space-md)' }}>
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: id === activeCategory ? 'var(--gradient-brand)' : 'white',
                  color: id === activeCategory ? 'white' : 'var(--text-secondary)',
                  fontWeight: 600,
                  flexShrink: 0,
                  fontSize: 'var(--font-sm)',
                  cursor: 'pointer',
                  boxShadow: id === activeCategory ? 'var(--shadow-glow)' : 'var(--shadow-card)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Product List */}
        <div style={{ padding: 'var(--space-md)' }}>
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
            {activeCategory === ALL_CATEGORY ? t('menu.title') : activeTabLabel}
          </h2>
          <ProductList products={visibleProducts} currency={currency} />
        </div>
      </main>

      {/* Overlays */}
      <OrderStatusBanner slug={slug} />
      <CartDrawer currency={currency} mobileMoneyEnabled={mobileMoneyEnabled} slug={slug} />
    </div>
  );
}
