import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { mondinoApi } from '../../services/api.ts';
import {
  CAMPAIGN_SEGMENTS,
  GENERATED_IMAGES,
  PRODUCT_CATEGORIES,
} from '../../constants/index.ts';
import { BenefitItem, NewsItem, PromotionItem } from '../../types/index.ts';
import { formatCurrencyARS, formatPoints } from '../../utils/points.ts';
import { SafeImage } from '../SafeImage.tsx';
import {
  ImageUploaderField,
  compressImageFileToDataUrl,
} from '../ImageUploaderField.tsx';

interface AdminCatalogMarketingViewProps {
  section: 'beneficios' | 'promociones' | 'novedades' | 'campanas';
}

export const AdminCatalogMarketingView: React.FC<AdminCatalogMarketingViewProps> = ({
  section,
}) => {
  const { adminData, settings, promotions, benefits, news, refreshAllData } = useAuth();
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [editingWebBanner, setEditingWebBanner] = useState(false);
  const [webBannerUrl, setWebBannerUrl] = useState(settings.logoUrl);
  const [savingWebBanner, setSavingWebBanner] = useState(false);

  useEffect(() => {
    setWebBannerUrl(settings.logoUrl);
  }, [settings.logoUrl]);

  // Quick file input refs for 1-click photo replacement on cards
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);
  const [quickUploadTarget, setQuickUploadTarget] = useState<{
    kind: 'benefit' | 'news' | 'promo';
    item: any;
  } | null>(null);

  // Promotion form state
  const [editingPromo, setEditingPromo] = useState<Partial<PromotionItem> | null>(null);
  // Benefit form state
  const [editingBenefit, setEditingBenefit] = useState<Partial<BenefitItem> | null>(null);
  // News form state
  const [editingNews, setEditingNews] = useState<Partial<NewsItem> | null>(null);
  // Campaign form state
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignSegment, setCampaignSegment] = useState('TODOS');
  const [campaignDate, setCampaignDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [campaignStatus, setCampaignStatus] = useState('ENVIADA');

  const triggerQuickPhotoUpload = (kind: 'benefit' | 'news' | 'promo', item: any) => {
    setQuickUploadTarget({ kind, item });
    setTimeout(() => {
      quickFileInputRef.current?.click();
    }, 20);
  };

  const handleQuickPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickUploadTarget) return;

    const target = quickUploadTarget;
    setUploadingCardId(target.item.id);
    setBanner(null);

    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      if (target.kind === 'benefit') {
        await mondinoApi.upsertBenefitAdmin({
          ...target.item,
          imageUrl: dataUrl,
        });
        setBanner({
          type: 'ok',
          text: `Foto del beneficio "${target.item.title}" actualizada correctamente.`,
        });
      } else if (target.kind === 'news') {
        await mondinoApi.upsertNewsAdmin({
          ...target.item,
          imageUrl: dataUrl,
        });
        setBanner({
          type: 'ok',
          text: `Foto de la novedad "${target.item.title}" actualizada correctamente.`,
        });
      } else if (target.kind === 'promo') {
        await mondinoApi.upsertPromotionAdmin({
          ...target.item,
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
      setQuickUploadTarget(null);
      if (quickFileInputRef.current) {
        quickFileInputRef.current.value = '';
      }
    }
  };

  const handleSaveWebBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWebBanner(true);
    setBanner(null);
    try {
      await mondinoApi.updateSettingsAdmin({
        ...settings,
        logoUrl: webBannerUrl,
        appLogoUrl: '/images/mondino_app_logo.jpg',
      });
      await refreshAllData();
      setEditingWebBanner(false);
      setBanner({
        type: 'ok',
        text: 'Imagen principal de la web actualizada correctamente.',
      });
    } catch (err: any) {
      setBanner({
        type: 'err',
        text: err?.message || 'No se pudo actualizar la imagen de la web.',
      });
    } finally {
      setSavingWebBanner(false);
    }
  };

  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo?.title || !editingPromo?.description) return;
    setBanner(null);
    try {
      await mondinoApi.upsertPromotionAdmin(
        editingPromo as Partial<PromotionItem> & { title: string; description: string }
      );
      await refreshAllData();
      setEditingPromo(null);
      setBanner({ type: 'ok', text: 'Promoción e imagen guardadas correctamente.' });
    } catch (err: any) {
      setBanner({ type: 'err', text: err.message });
    }
  };

  const handleSaveBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBenefit?.title || !editingBenefit?.description) return;
    setBanner(null);
    try {
      await mondinoApi.upsertBenefitAdmin(
        editingBenefit as Partial<BenefitItem> & { title: string; description: string }
      );
      await refreshAllData();
      setEditingBenefit(null);
      setBanner({ type: 'ok', text: 'Beneficio y su fotografía guardados correctamente.' });
    } catch (err: any) {
      setBanner({ type: 'err', text: err.message });
    }
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews?.title || !editingNews?.description) return;
    setBanner(null);
    try {
      await mondinoApi.upsertNewsAdmin(
        editingNews as Partial<NewsItem> & { title: string; description: string }
      );
      await refreshAllData();
      setEditingNews(null);
      setBanner({ type: 'ok', text: 'Novedad y su fotografía actualizadas correctamente.' });
    } catch (err: any) {
      setBanner({ type: 'err', text: err.message });
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    try {
      await mondinoApi.createCampaignAdmin({
        title: campaignTitle,
        message: campaignMessage,
        segment: campaignSegment,
        scheduledAt: campaignDate,
        status: campaignStatus,
      });
      await refreshAllData();
      setCampaignTitle('');
      setCampaignMessage('');
      setBanner({
        type: 'ok',
        text: 'Campaña segmentada creada y notificaciones despachadas al segmento.',
      });
    } catch (err: any) {
      setBanner({ type: 'err', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden input for 1-click photo replacement directly on cards */}
      <input
        ref={quickFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickPhotoChange}
        className="hidden"
      />

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

      {/* Tarjeta de Logotipo de la App e Imagen Principal de la Web (Editable por Administrador y Empleados) */}
      {(section === 'beneficios' || section === 'novedades' || section === 'promociones') && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/images/mondino_app_logo.jpg"
                alt={settings.clubName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-contain bg-white border border-emerald-200 shrink-0"
              />
              <div className="w-20 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 hidden sm:block">
                <SafeImage
                  src={settings.logoUrl}
                  alt="Imagen de Portada de Mondino Club"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                  PORTADA PRINCIPAL DE LA WEB (LOGOTIPO OFICIAL PROGRAMADO)
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Identidad Visual — {settings.clubName}
                </h2>
                <p className="text-xs text-slate-500">
                  El logotipo oficial de Farmacia Mondino está programado de forma permanente. Aquí podés cambiar la foto de portada.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setWebBannerUrl(settings.logoUrl);
                setEditingWebBanner((prev) => !prev);
              }}
              className="min-h-[38px] px-3.5 py-2 rounded-xl border border-emerald-800 text-emerald-900 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{editingWebBanner ? 'Cerrar editor' : 'Cambiar portada'}</span>
            </button>
          </div>

          {editingWebBanner && (
            <form
              onSubmit={handleSaveWebBanner}
              className="pt-3 border-t border-slate-100 space-y-4"
            >
              <ImageUploaderField
                label="Imagen Principal de Portada de la Web"
                value={webBannerUrl}
                onChange={setWebBannerUrl}
                helperText="Esta imagen se muestra en el banner principal de los socios al iniciar sesión."
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingWebBanner(false)}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingWebBanner}
                  className="min-h-[38px] px-4 py-1.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                >
                  {savingWebBanner ? 'Guardando...' : 'Guardar portada'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* SECTION: PROMOCIONES */}
      {section === 'promociones' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display">
                Promociones Especiales de Puntos
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                La regla base de $1.000 = 1 punto es permanente. Aquí podés configurar
                multiplicadores (x2, x3), puntos extra y subir la foto de cada promoción.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingPromo({
                  title: '',
                  description: '',
                  category: 'Perfumería',
                  promoType: 'MULTIPLICADOR',
                  multiplier: 2,
                  extraPoints: 0,
                  minPurchaseAmount: 10000,
                  startDate: '2026-01-01',
                  endDate: '2027-12-31',
                  usageLimit: 200,
                  isActive: true,
                  imageUrl: GENERATED_IMAGES.heroPerfumery,
                })
              }
              className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-800 cursor-pointer self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Promoción de Puntos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {promotions.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 w-full bg-slate-100 relative group">
                    <SafeImage
                      src={p.imageUrl}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      disabled={uploadingCardId === p.id}
                      onClick={() => triggerQuickPhotoUpload('promo', p)}
                      className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-sm cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingCardId === p.id ? 'Subiendo...' : 'Cambiar foto'}
                      </span>
                    </button>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-900">{p.category}</span>
                      <span
                        className={
                          p.isActive ? 'text-emerald-800 font-semibold' : 'text-slate-400'
                        }
                      >
                        {p.isActive ? 'ACTIVA' : 'INACTIVA'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
                    <p className="text-xs text-slate-600">{p.description}</p>
                    <div className="pt-2 text-xs text-slate-500 space-y-1 font-mono">
                      <p>
                        Regla:{' '}
                        {p.promoType === 'MULTIPLICADOR'
                          ? `Multiplicador x${Number(p.multiplier)}`
                          : `+${p.extraPoints} puntos extra`}
                      </p>
                      <p>Mínimo compra: {formatCurrencyARS(p.minPurchaseAmount)}</p>
                      <p>
                        Vigencia: {p.startDate} al {p.endDate}
                      </p>
                      <p>
                        Usos: {p.currentUsages} / {p.usageLimit || 'Sin límite'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setEditingPromo(p)}
                    className="text-xs font-semibold text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar promoción / foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await mondinoApi.upsertPromotionAdmin({ ...p, isActive: !p.isActive });
                      await refreshAllData();
                    }}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    {p.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Crear/Editar Promoción con Previsualización de Regla e Imagen */}
          {editingPromo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <form
                onSubmit={handleSavePromotion}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {editingPromo.id ? 'Editar Promoción de Puntos' : 'Crear Promoción de Puntos'}
                  </h3>
                  <button type="button" onClick={() => setEditingPromo(null)}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <ImageUploaderField
                  label="Foto de la promoción"
                  value={editingPromo.imageUrl || GENERATED_IMAGES.heroPerfumery}
                  onChange={(url) => setEditingPromo({ ...editingPromo, imageUrl: url })}
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre de la promoción
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPromo.title || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, title: e.target.value })}
                    className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={editingPromo.description || ''}
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, description: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Categoría aplicable
                    </label>
                    <select
                      value={editingPromo.category || 'Todos'}
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, category: e.target.value })
                      }
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white"
                    >
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tipo de beneficio en puntos
                    </label>
                    <select
                      value={editingPromo.promoType || 'MULTIPLICADOR'}
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, promoType: e.target.value })
                      }
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white"
                    >
                      <option value="MULTIPLICADOR">Multiplicador (ej. x2, x3)</option>
                      <option value="PUNTOS_EXTRA">Puntos extra fijos (ej. +500 pts)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {editingPromo.promoType === 'MULTIPLICADOR' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Multiplicador (ej: 2 = Puntos x2)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1.5"
                        max="10"
                        value={editingPromo.multiplier || 2}
                        onChange={(e) =>
                          setEditingPromo({ ...editingPromo, multiplier: Number(e.target.value) })
                        }
                        className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Puntos extra fijos
                      </label>
                      <input
                        type="number"
                        min="10"
                        value={editingPromo.extraPoints || 500}
                        onChange={(e) =>
                          setEditingPromo({
                            ...editingPromo,
                            extraPoints: Number(e.target.value),
                          })
                        }
                        className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Compra mínima ($ ARS)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingPromo.minPurchaseAmount || 0}
                      onChange={(e) =>
                        setEditingPromo({
                          ...editingPromo,
                          minPurchaseAmount: Number(e.target.value),
                        })
                      }
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Inicio
                    </label>
                    <input
                      type="date"
                      value={editingPromo.startDate || '2026-01-01'}
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, startDate: e.target.value })
                      }
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fin
                    </label>
                    <input
                      type="date"
                      value={editingPromo.endDate || '2027-12-31'}
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, endDate: e.target.value })
                      }
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Límite usos
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingPromo.usageLimit || 0}
                      onChange={(e) =>
                        setEditingPromo({
                          ...editingPromo,
                          usageLimit: Number(e.target.value),
                        })
                      }
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Previsualización clara de la regla antes de confirmar */}
                {(() => {
                  const sampleAmount = 100000;
                  const sampleBase = Math.floor(
                    sampleAmount / (settings.basePointsRateLocked || 1000)
                  );
                  const samplePromo =
                    editingPromo.promoType === 'MULTIPLICADOR'
                      ? Math.max(
                          0,
                          Math.round(sampleBase * (Number(editingPromo.multiplier || 2) - 1))
                        )
                      : Math.max(0, Number(editingPromo.extraPoints || 0));
                  return (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-1.5 text-xs text-emerald-950">
                      <p className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-800" />
                        Previsualización de regla aplicada (sobre una compra ejemplo de $100.000):
                      </p>
                      <p className="font-mono">
                        • Puntos base (${formatPoints(settings.basePointsRateLocked)} = 1 punto):{' '}
                        {formatPoints(sampleBase)} puntos
                        <br />• Bonificación promoción:{' '}
                        {editingPromo.promoType === 'MULTIPLICADOR'
                          ? `+${formatPoints(samplePromo)} puntos (Multiplicador x${editingPromo.multiplier || 2})`
                          : `+${formatPoints(samplePromo)} puntos extra`}
                        <br />• <strong>Total a acreditar al cliente:</strong>{' '}
                        {formatPoints(sampleBase + samplePromo)} puntos
                      </p>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPromo(null)}
                    className="flex-1 min-h-[42px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 min-h-[42px] rounded-xl bg-emerald-900 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
                  >
                    Confirmar y Guardar Promoción
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SECTION: BENEFICIOS */}
      {section === 'beneficios' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display">
                Gestión de Beneficios, Fotos y Stock de Canjes
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Tanto el Administrador como los Empleados pueden crear beneficios, subir su foto
                desde el celular o PC y administrar el stock disponible.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingBenefit({
                  title: '',
                  description: '',
                  category: 'Perfumería',
                  pointsRequired: 1000,
                  stockAvailable: 30,
                  startDate: '2026-01-01',
                  endDate: '2027-12-31',
                  isActive: true,
                  imageUrl: GENERATED_IMAGES.benefitFragrance,
                  termsConditions:
                    'Presentar el código de canje en mostrador junto con tu QR personal.',
                })
              }
              className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-800 cursor-pointer self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Beneficio con Foto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 w-full bg-slate-100 relative group">
                    <SafeImage
                      src={b.imageUrl}
                      alt={b.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      disabled={uploadingCardId === b.id}
                      onClick={() => triggerQuickPhotoUpload('benefit', b)}
                      className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-sm cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingCardId === b.id ? 'Subiendo...' : 'Cambiar foto'}
                      </span>
                    </button>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-900">{b.category}</span>
                      <span
                        className={
                          b.isActive ? 'text-emerald-800 font-semibold' : 'text-slate-400'
                        }
                      >
                        {b.isActive ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{b.title}</h3>
                    <p className="text-xs text-slate-600">{b.description}</p>
                    <div className="pt-2 text-xs font-mono text-slate-600 space-y-1">
                      <p className="font-bold text-emerald-950">
                        Costo: {formatPoints(b.pointsRequired)} puntos
                      </p>
                      <p>Stock disponible: {b.stockAvailable} unidades</p>
                      <p>Vencimiento: {b.endDate}</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setEditingBenefit(b)}
                    className="text-xs font-semibold text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar beneficio / foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await mondinoApi.upsertBenefitAdmin({ ...b, isActive: !b.isActive });
                      await refreshAllData();
                    }}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    {b.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Historial de Canjes de Clientes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Canjes emitidos recientemente ({(adminData?.redemptions || []).length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Beneficio</th>
                    <th className="py-2.5 px-3">Puntos</th>
                    <th className="py-2.5 px-3">Vencimiento</th>
                    <th className="py-2.5 px-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(adminData?.redemptions || []).map((r) => {
                    const bObj = benefits.find((b) => b.id === r.benefitId);
                    return (
                      <tr key={r.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-950">
                          {r.redemptionCode}
                        </td>
                        <td className="py-2.5 px-3">{bObj?.title || r.benefitId}</td>
                        <td className="py-2.5 px-3 font-mono tabular-nums">
                          {formatPoints(r.pointsSpent)} pts
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">{r.expiresAt}</td>
                        <td className="py-2.5 px-3 font-semibold">{r.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {editingBenefit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <form
                onSubmit={handleSaveBenefit}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {editingBenefit.id ? 'Editar Beneficio y Foto' : 'Nuevo Beneficio'}
                  </h3>
                  <button type="button" onClick={() => setEditingBenefit(null)}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <ImageUploaderField
                  label="Fotografía del beneficio publicado"
                  value={editingBenefit.imageUrl || GENERATED_IMAGES.benefitSkincare}
                  onChange={(url) => setEditingBenefit({ ...editingBenefit, imageUrl: url })}
                  helperText="Subí la foto real del producto o voucher desde tu celular o computadora."
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
                  <input
                    type="text"
                    required
                    value={editingBenefit.title || ''}
                    onChange={(e) =>
                      setEditingBenefit({ ...editingBenefit, title: e.target.value })
                    }
                    className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={editingBenefit.description || ''}
                    onChange={(e) =>
                      setEditingBenefit({ ...editingBenefit, description: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Puntos requeridos
                    </label>
                    <input
                      type="number"
                      min="10"
                      required
                      value={editingBenefit.pointsRequired || 1000}
                      onChange={(e) =>
                        setEditingBenefit({
                          ...editingBenefit,
                          pointsRequired: Number(e.target.value),
                        })
                      }
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Stock disponible
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editingBenefit.stockAvailable ?? 20}
                      onChange={(e) =>
                        setEditingBenefit({
                          ...editingBenefit,
                          stockAvailable: Number(e.target.value),
                        })
                      }
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Categoría
                    </label>
                    <select
                      value={editingBenefit.category || 'Perfumería'}
                      onChange={(e) =>
                        setEditingBenefit({ ...editingBenefit, category: e.target.value })
                      }
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white"
                    >
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fecha vencimiento
                    </label>
                    <input
                      type="date"
                      value={editingBenefit.endDate || '2027-12-31'}
                      onChange={(e) =>
                        setEditingBenefit({ ...editingBenefit, endDate: e.target.value })
                      }
                      className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Condiciones de canje (opcional)
                  </label>
                  <input
                    type="text"
                    value={editingBenefit.termsConditions || ''}
                    onChange={(e) =>
                      setEditingBenefit({ ...editingBenefit, termsConditions: e.target.value })
                    }
                    className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingBenefit(null)}
                    className="flex-1 min-h-[42px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 min-h-[42px] rounded-xl bg-emerald-900 text-white text-xs font-semibold cursor-pointer"
                  >
                    Guardar Beneficio
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SECTION: NOVEDADES */}
      {section === 'novedades' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-display">
                Publicación de Novedades y Fotografías
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Tanto el Administrador como los Empleados pueden publicar novedades, editar su
                contenido y subir o cambiar sus fotos.
              </p>
            </div>
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
              className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Publicación con Foto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {news.map((n) => (
              <div
                key={n.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-48 w-full bg-slate-100 relative group">
                    <SafeImage
                      src={n.imageUrl}
                      alt={n.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      disabled={uploadingCardId === n.id}
                      onClick={() => triggerQuickPhotoUpload('news', n)}
                      className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-sm cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingCardId === n.id ? 'Subiendo...' : 'Cambiar foto'}
                      </span>
                    </button>
                  </div>

                  <div className="p-5 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="font-semibold text-emerald-900">{n.category}</span>
                      <span>
                        {n.publishedAt} · {n.isPublished ? 'PUBLICADA' : 'BORRADOR'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{n.title}</h3>
                    {n.summary && (
                      <p className="text-xs font-medium text-slate-700">{n.summary}</p>
                    )}
                    <p className="text-xs text-slate-600">{n.description}</p>
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-slate-100 flex justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setEditingNews(n)}
                    className="font-semibold text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar novedad / foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await mondinoApi.upsertNewsAdmin({ ...n, isPublished: !n.isPublished });
                      await refreshAllData();
                    }}
                    className="text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    {n.isPublished ? 'Despublicar' : 'Publicar'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingNews && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <form
                onSubmit={handleSaveNews}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {editingNews.id ? 'Editar Novedad y Foto' : 'Nueva Novedad'}
                  </h3>
                  <button type="button" onClick={() => setEditingNews(null)}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <ImageUploaderField
                  label="Fotografía de la novedad"
                  value={editingNews.imageUrl || GENERATED_IMAGES.newsDermocosmetics}
                  onChange={(url) => setEditingNews({ ...editingNews, imageUrl: url })}
                  helperText="Subí una foto del lanzamiento, evento o promoción desde tu celular o PC."
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Categoría
                    </label>
                    <select
                      value={editingNews.category || 'Lanzamientos'}
                      onChange={(e) =>
                        setEditingNews({ ...editingNews, category: e.target.value })
                      }
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
                      value={
                        editingNews.publishedAt || new Date().toISOString().slice(0, 10)
                      }
                      onChange={(e) =>
                        setEditingNews({ ...editingNews, publishedAt: e.target.value })
                      }
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
                    onChange={(e) =>
                      setEditingNews({ ...editingNews, description: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingNews(null)}
                    className="flex-1 min-h-[42px] rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 min-h-[42px] rounded-xl bg-emerald-900 text-white text-xs font-semibold cursor-pointer"
                  >
                    Guardar Novedad
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SECTION: CAMPAÑAS SEGMENTADAS */}
      {section === 'campanas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateCampaign}
            className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-4 self-start"
          >
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Crear Campaña Segmentada
            </h2>
            <p className="text-xs text-slate-500">
              Seleccioná un segmento de clientes para enviar avisos dirigidos a su cuenta y
              preparar notificaciones Web Push.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Segmento objetivo
              </label>
              <select
                value={campaignSegment}
                onChange={(e) => setCampaignSegment(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                {CAMPAIGN_SEGMENTS.map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título de la campaña
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Puntos x3 en Dermocosmética este fin de semana"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mensaje para el cliente
              </label>
              <textarea
                required
                rows={3}
                placeholder="Escribí el mensaje que recibirán los clientes del segmento..."
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={campaignDate}
                  onChange={(e) => setCampaignDate(e.target.value)}
                  className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Acción</label>
                <select
                  value={campaignStatus}
                  onChange={(e) => setCampaignStatus(e.target.value)}
                  className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white"
                >
                  <option value="ENVIADA">Enviar ahora a notificaciones</option>
                  <option value="PROGRAMADA">Dejar programada</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
            >
              Crear y Procesar Campaña
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Campañas Registradas ({(adminData?.campaigns || []).length})
            </h2>
            <div className="divide-y divide-slate-100">
              {(adminData?.campaigns || []).map((c) => (
                <div key={c.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-emerald-900">
                      Segmento: {c.segment} · Alcance: {c.estimatedReach} socios
                    </span>
                    <span className="tabular-nums">
                      {c.scheduledAt} · {c.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                  <p className="text-xs text-slate-600">{c.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
