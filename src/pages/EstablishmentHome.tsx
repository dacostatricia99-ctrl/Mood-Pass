import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { ProductList } from '../components/ProductList';
import { CartDrawer } from '../components/CartDrawer';
import { LanguageSelect } from '../components/LanguageSelect';
import { useCartStore } from '../store/cartStore';
import { useTranslation } from '../i18n/LanguageContext';
import { localizeProduct, localizeText } from '../i18n/menuData';
import { fetchEstablishmentMenu } from '../lib/menuApi';
import type { Category, Product } from '../types';
import type { TranslationKey } from '../i18n/translations';

const ALL_CATEGORY = 'all';

const CAROUSEL_LABELS: TranslationKey[] = ['carousel.specials', 'carousel.new', 'carousel.deals'];

const carouselImages = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600&h=300',
  'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&q=80&w=600&h=300',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&q=80&w=600&h=300',
];

export function EstablishmentHome() {
  const { slug } = useParams<{ slug: string }>();
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const { language, t } = useTranslation();
  const { getTotalItems, toggleDrawer } = useCartStore();

  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState('FCFA');

  const totalItems = getTotalItems();
  const establishmentName = slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'MoodPass';

  useEffect(() => {
    let active = true;
    fetchEstablishmentMenu(slug).then(({ products, categories, currency }) => {
      if (!active) return;
      setRawProducts(products);
      setCategories(categories);
      setCurrency(currency);
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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      
      {/* Header with Gradient and Language Selector */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-card)' }}>
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=MP&backgroundColor=ef4444" alt="Logo" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)' }} />
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
        
        {/* Animated Image Carousel */}
        <div style={{ margin: 'var(--space-md) 0' }}>
          <div className="scroll-container">
            {carouselImages.map((src, idx) => (
              <div key={idx} className="scroll-item" style={{ width: '85%', height: '160px', position: 'relative' }}>
                <img 
                  src={src} 
                  alt="Delicious food" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: 'var(--space-sm)', left: 'var(--space-md)', color: 'white', fontWeight: 'bold', fontSize: 'var(--font-lg)' }}>
                  {t(CAROUSEL_LABELS[idx])}
                </div>
              </div>
            ))}
          </div>
        </div>

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
      <CartDrawer currency={currency} />
    </div>
  );
}
