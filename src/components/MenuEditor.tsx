import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Check, X, Pencil, Eye, EyeOff, Package, ImagePlus, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { formatPrice } from '../lib/format';
import type { Category, Product } from '../types';
import {
  fetchMenu,
  createCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  setProductAvailability,
  deleteProduct,
  uploadProductImage,
} from '../lib/managerApi';

interface MenuEditorProps {
  establishmentId: string | null;
  currency: string;
  isConfigured: boolean;
}

interface DraftProduct {
  name: string;
  price: string;
  description: string;
}

const emptyDraft: DraftProduct = { name: '', price: '', description: '' };

export function MenuEditor({ establishmentId, currency, isConfigured }: MenuEditorProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCategory, setNewCategory] = useState('');
  // categoryId currently showing its "add product" form, with the draft.
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftProduct>(emptyDraft);
  // product being edited inline.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftProduct>(emptyDraft);
  // product photo upload.
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingProductRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isConfigured || !establishmentId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchMenu(establishmentId).then((menu) => {
      if (!active) return;
      setCategories(menu.categories);
      setProducts(menu.products);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [establishmentId, isConfigured]);

  if (!isConfigured || !establishmentId) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {t('menu.demoNotice')}
      </div>
    );
  }

  if (loading) {
    return <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--space-lg)' }}>{t('menu.loading')}</div>;
  }

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const cat = await createCategory(establishmentId, name, categories.length);
    setCategories((prev) => [...prev, cat]);
    setNewCategory('');
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm(t('menu.confirmDeleteCategory'))) return;
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setProducts((prev) => prev.filter((p) => p.category_id !== id));
  };

  const handleAddProduct = async (categoryId: string) => {
    const name = draft.name.trim();
    const price = parseFloat(draft.price);
    if (!name || Number.isNaN(price)) return;
    const product = await createProduct({ establishmentId, categoryId, name, price, description: draft.description });
    setProducts((prev) => [...prev, product]);
    setDraft(emptyDraft);
    setAddingTo(null);
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditDraft({ name: p.name, price: String(p.price), description: p.description ?? '' });
  };

  const handleSaveEdit = async (id: string) => {
    const name = editDraft.name.trim();
    const price = parseFloat(editDraft.price);
    if (!name || Number.isNaN(price)) return;
    await updateProduct(id, { name, price, description: editDraft.description });
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, name, price, description: editDraft.description } : p)));
    setEditingId(null);
  };

  const handleToggle = async (p: Product) => {
    const next = !p.is_available;
    await setProductAvailability(p.id, next);
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_available: next } : x)));
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const openImagePicker = (productId: string) => {
    pendingProductRef.current = productId;
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = pendingProductRef.current;
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || !productId || !establishmentId) return;
    setUploadingId(productId);
    try {
      const url = await uploadProductImage(establishmentId, productId, file);
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, image_url: url } : p)));
    } catch {
      /* upload failed — ignore, keep current image */
    } finally {
      setUploadingId(null);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-glass)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', fontSize: 'var(--font-sm)',
    transition: 'border var(--transition-fast)'
  };
  const iconBtn: React.CSSProperties = {
    background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', cursor: 'pointer',
    width: 32, height: 32, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform var(--transition-fast), color var(--transition-fast)'
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Shared hidden file input for product photo uploads. */}
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageSelected} />
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

      {/* Header section inside the menu editor */}
      <div className="glass-panel" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>{t('nav.menu')}</h2>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder={t('menu.newCategory')}
            style={{ ...fieldStyle, flex: 1 }}
          />
          <button onClick={handleAddCategory} className="btn-primary" style={{ flexShrink: 0, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> <span>{t('menu.addCategory')}</span>
          </button>
        </div>
      </div>

      {categories.length === 0 && (
        <div className="glass-panel" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--space-xl) var(--space-md)' }}>
          <Package size={48} style={{ opacity: 0.2, marginBottom: 'var(--space-sm)' }} />
          <p>{t('menu.empty')}</p>
        </div>
      )}

      {categories.map((cat) => {
        const catProducts = products.filter((p) => p.category_id === cat.id);
        return (
          <div key={cat.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Category Header */}
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
              <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{cat.name}</h3>
              <button onClick={() => handleDeleteCategory(cat.id)} title={t('menu.delete')} style={{ ...iconBtn, color: 'var(--primary-red)' }}>
                <Trash2 size={16} />
              </button>
            </div>

            <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {catProducts.map((p) => (
                <div key={p.id} style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-glass)'
                }}>
                  {editingId === p.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} placeholder={t('menu.productName')} style={fieldStyle} />
                      <input value={editDraft.price} onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })} placeholder={t('menu.productPrice')} inputMode="decimal" style={fieldStyle} />
                      <textarea value={editDraft.description} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} placeholder={t('menu.productDescription')} style={{ ...fieldStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button onClick={() => setEditingId(null)} style={iconBtn}><X size={16} /></button>
                        <button onClick={() => handleSaveEdit(p.id)} className="btn-primary" style={{ padding: '0 12px', height: 32 }}><Check size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)', opacity: p.is_available ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                      <button
                        onClick={() => openImagePicker(p.id)}
                        title={t('menu.changePhoto')}
                        disabled={uploadingId === p.id}
                        style={{ position: 'relative', width: 60, height: 60, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, padding: 0, border: '1px solid var(--border-glass)', cursor: 'pointer', background: p.image_url ? '#eee' : 'rgba(0,0,0,0.05)' }}
                      >
                        {p.image_url ? (
                          <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--text-secondary)' }}>
                            <ImagePlus size={22} />
                          </span>
                        )}
                        {uploadingId === p.id && (
                          <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                          </span>
                        )}
                      </button>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 'var(--font-sm)', color: 'var(--primary-accent)', fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: 8 }}>{formatPrice(p.price, currency)}</div>
                        </div>
                        {p.description && (
                          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {p.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <button onClick={() => handleToggle(p)} title={p.is_available ? t('menu.available') : t('menu.unavailable')} style={{ ...iconBtn, width: 28, height: 28, background: p.is_available ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface)', color: p.is_available ? '#10b981' : 'var(--text-secondary)', border: 'none' }}>
                            {p.is_available ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button onClick={() => startEdit(p)} title={t('menu.edit')} style={{ ...iconBtn, width: 28, height: 28, border: 'none' }}><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteProduct(p.id)} title={t('menu.delete')} style={{ ...iconBtn, width: 28, height: 28, color: 'var(--primary-red)', border: 'none' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add product form inside category */}
              {addingTo === cat.id ? (
                <div style={{ 
                  display: 'flex', flexDirection: 'column', gap: 8, 
                  padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', 
                  background: 'rgba(239, 68, 68, 0.03)', border: '1px dashed rgba(239, 68, 68, 0.3)'
                }}>
                  <div style={{ fontSize: 'var(--font-xs)', fontWeight: 'bold', color: 'var(--primary-accent)', marginBottom: 4 }}>{t('menu.addProduct')}</div>
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t('menu.productName')} style={fieldStyle} autoFocus />
                  <input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder={t('menu.productPrice')} inputMode="decimal" style={fieldStyle} />
                  <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={t('menu.productDescription')} style={{ ...fieldStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={() => { setAddingTo(null); setDraft(emptyDraft); }} style={iconBtn}><X size={16} /></button>
                    <button onClick={() => handleAddProduct(cat.id)} className="btn-primary" style={{ padding: '0 16px', height: 32 }}>{t('menu.save')}</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingTo(cat.id); setDraft(emptyDraft); }}
                  style={{ 
                    ...iconBtn, width: '100%', justifyContent: 'center', gap: 8, 
                    color: 'var(--primary-accent)', background: 'transparent', border: '1px dashed var(--border-glass)', height: 40 
                  }}
                >
                  <Plus size={16} /> <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>{t('menu.addProduct')}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
