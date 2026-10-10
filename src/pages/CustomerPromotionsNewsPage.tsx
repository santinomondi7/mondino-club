import React, { useRef, useState } from 'react';
import {
  Sparkles,
  Newspaper,
  Plus,
  Upload,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { mondinoApi } from '../services/api.ts';
import { SafeImage } from '../components/SafeImage.tsx';
import {
  ImageUploaderField,
  compressImageFileToDataUrl,
} from '../components/ImageUploaderField.tsx';
import { GENERATED_IMAGES } from '../constants/index.ts';
import { NewsItem, PromotionItem } from '../types/index.ts';
import { formatCurrencyARS, formatPoints } from '../utils/points.ts';

export const CustomerPromotionsNewsPage: React.FC = () => {
  const { profile, promotions, news, refreshAllData } = useAuth();
  const [view, setView] = useState<'todas' | 'promociones' | 'novedades'>('todas');

  // Staff / Admin direct news & photo editor state
  const [editingNews, setEditingNews] = useState<Partial<NewsItem> | null>(null);
  const [savingNews, setSavingNews] = useState(false);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const quickFileInputRef = useRef<HTMLInputElement | null>(null);
  const [quickTarget, setQuickTarget] = useState<{
    kind: 'news' | 'promo';
    item: NewsItem | PromotionItem;
  } | null>(null);

  const isStaffOrAdmin =
    profile?.role === 'ADMINISTRADOR' || profile?.role === 'EMPLEADO';

  const activePromotions = promotions.filter((p) => p.isActive || isStaffOrAdmin);
  const publishedNews = news.filter((n) => n.isPublished || isStaffOrAdmin);

  const triggerQuickPhoto = (kind: 'news' | 'promo', item: NewsItem | PromotionItem) => {
    setQuickTarget({ kind, item });
    setTimeout(() => {
      quickFileInputRef.current?.click();
    }, 20);
  };

  const handleQuickPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickTarget) return;
    const target = quickTarget;
    setUploadingCardId(target.item.id);
    setBanner(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      if (target.kind === 'news') {
        await mondinoApi.upsertNewsAdmin({
          ...(target.item as NewsItem),
          imageUrl: dataUrl,
        });
        setBanner({
          type: 'ok',
          text: `Foto de la novedad "${target.item.title}" actualizada correctamente.`,
        });
      } else {
        await mondinoApi.upsertPromotionAdmin({
          ...(target.item as PromotionItem),
          imageUrl: dataUrl,
        });
        setBanner({
          type: 'ok',
          text: `Foto de la promoción "${target.item.title}" actualizada correctamente.`,
        });
      }
      await refreshAllData();
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err?.message || 'No se pudo actualizar la foto.',
      });
    } finally {
      setUploadingCardId(null);
      setQuickTarget(null);
      if (quickFileInputRef.current) {
        quickFileInputRef.current.value = '';
      }
    }
  };

  const handleSaveNewsForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews?.title || !editingNews?.description) return;
    setSavingNews(true);
    setBanner(null);
    try {
      await mondinoApi.upsertNewsAdmin(
        editingNews as Partial<NewsItem> & { title: string; description: string }
      );
      await refreshAllData();
      setEditingNews(null);
      setBanner({
        type: 'ok',
        text: 'Novedad y su fotografía guardadas correctamente.',
      });
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err?.message || 'Error al guardar la novedad.',
      });
    } finally {
      setSavingNews(false);
    }
  };

  return (
    <div className="space-y-8">
      <input
        ref={quickFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickPhotoChange}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
            Promociones y Novedades
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Multiplicadores de puntos vigentes y lanzamientos de Farmacia y Perfumería Mondino.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start">
          {isStaffOrAdmin && (
            <button
              type="button"
              onClick={() =>
                setEditingNews({
                  title: '',
                  summary: '',
                  description: '',
                  category: 'Lanzamientos',
                  isPublished: true,
                  publishedAt: new Date().toISOString().slice(0, 10),
                  imageUrl: GENERATED_IMAGES.newsDermocosmetics,
                })
              }
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publicar Novedad con Foto</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setView('todas')}
              className={`min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                view === 'todas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Todo
            </button>
            <button
              type="button"
              onClick={() => setView('promociones')}
              className={`min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                view === 'promociones' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Promociones ({activePromotions.length})
            </button>
            <button
              type="button"
              onClick={() => setView('novedades')}
              className={`min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                view === 'novedades' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Novedades ({publishedNews.length})
            </button>
          </div>
        </div>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
            banner.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button type="button" onClick={() => setBanner(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Promociones Section */}
      {(view === 'todas' || view === 'promociones') && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-800" />
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Promociones activas de puntos
            </h2>
          </div>

          {activePromotions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No hay promociones especiales activas en este momento. Seguís sumando 1 punto base por
              cada $1.000 ($1.000 = 1 punto) en todas tus compras.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activePromotions.map((promo) => (
                <article
                  key={promo.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                      <SafeImage
                        src={promo.imageUrl}
                        alt={promo.title}
                        className="w-full h-full object-cover"
                      />
                      {isStaffOrAdmin && (
                        <button
                          type="button"
                          disabled={uploadingCardId === promo.id}
                          onClick={() => triggerQuickPhoto('promo', promo)}
                          className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-xs shadow-sm cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>
                            {uploadingCardId === promo.id ? 'Subiendo...' : 'Cambiar foto'}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="text-xs text-emerald-800 font-medium">
                        <span>{promo.category}</span>
                        <span className="mx-1.5">·</span>
                        <span>
                          {promo.promoType === 'MULTIPLICADOR'
                            ? `Puntos x${Number(promo.multiplier)}`
                            : `+${formatPoints(promo.extraPoints)} puntos extra`}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{promo.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{promo.description}</p>
                      {promo.termsConditions && (
                        <p className="text-[11px] text-slate-400 pt-1">{promo.termsConditions}</p>
                      )}
                    </div>
                  </div>
                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Mínimo: {formatCurrencyARS(promo.minPurchaseAmount)}</span>
                    <span className="tabular-nums">Vigencia: {promo.endDate}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Novedades Feed Section */}
      {(view === 'todas' || view === 'novedades') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-emerald-800" />
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Feed de novedades de Mondino
              </h2>
            </div>
          </div>

          {publishedNews.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Próximamente publicaremos nuevas noticias y lanzamientos.
            </div>
          ) : (
            <div className="space-y-5">
              {publishedNews.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden grid grid-cols-1 md:grid-cols-12"
                >
                  <div className="md:col-span-4 h-52 md:h-auto bg-slate-100 relative">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {isStaffOrAdmin && (
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={uploadingCardId === item.id}
                          onClick={() => triggerQuickPhoto('news', item)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-xs shadow-sm cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>
                            {uploadingCardId === item.id ? 'Subiendo...' : 'Cambiar foto'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNews(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-900 text-[11px] font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-8 p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs text-slate-500">
                        <span className="font-medium text-emerald-900">{item.category}</span>
                        <span className="mx-1.5">·</span>
                        <span>Publicado el {item.publishedAt}</span>
                        {item.createdBy && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span>{item.createdBy}</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 font-display">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="text-xs font-semibold text-slate-700">{item.summary}</p>
                      )}
                      <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal: Crear o Editar Novedad y su Foto (Administrador / Empleados) */}
      {isStaffOrAdmin && editingNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveNewsForm}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800">
                  Gestión de Novedades (Administrador y Empleados)
                </p>
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  {editingNews.id ? 'Editar Novedad y Fotografía' : 'Publicar Nueva Novedad'}
                </h3>
              </div>
              <button type="button" onClick={() => setEditingNews(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <ImageUploaderField
              label="Fotografía de la novedad"
              value={editingNews.imageUrl || GENERATED_IMAGES.newsDermocosmetics}
              onChange={(url) => setEditingNews({ ...editingNews, imageUrl: url })}
              helperText="Subí una foto desde tu celular o computadora para acompañar la novedad."
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                <select
                  value={editingNews.category || 'Lanzamientos'}
                  onChange={(e) => setEditingNews({ ...editingNews, category: e.target.value })}
                  className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white"
                >
                  <option value="Lanzamientos">Lanzamientos</option>
                  <option value="Eventos">Eventos</option>
                  <option value="Dermocosmética">Dermocosmética</option>
                  <option value="Perfumería">Perfumería</option>
                  <option value="Consejos Farmacéuticos">Consejos Farmacéuticos</option>
                  <option value="Novedades">Novedades</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha de publicación
                </label>
                <input
                  type="date"
                  value={editingNews.publishedAt || new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setEditingNews({ ...editingNews, publishedAt: e.target.value })}
                  className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
              <input
                type="text"
                required
                value={editingNews.title || ''}
                onChange={(e) => setEditingNews({ ...editingNews, title: e.target.value })}
                className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resumen corto
              </label>
              <input
                type="text"
                required
                value={editingNews.summary || ''}
                onChange={(e) => setEditingNews({ ...editingNews, summary: e.target.value })}
                className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contenido completo
              </label>
              <textarea
                required
                rows={4}
                value={editingNews.description || ''}
                onChange={(e) => setEditingNews({ ...editingNews, description: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingNews(null)}
                className="flex-1 min-h-[42px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingNews}
                className="flex-1 min-h-[42px] rounded-xl bg-emerald-900 text-white text-xs font-semibold cursor-pointer"
              >
                {savingNews ? 'Guardando...' : 'Guardar Novedad'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
