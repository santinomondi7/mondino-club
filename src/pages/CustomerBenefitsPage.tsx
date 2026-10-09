import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Gift,
  Ticket,
  AlertCircle,
  X,
  Plus,
  Upload,
  Edit3,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { mondinoApi } from '../services/api.ts';
import { SafeImage } from '../components/SafeImage.tsx';
import {
  ImageUploaderField,
  compressImageFileToDataUrl,
} from '../components/ImageUploaderField.tsx';
import { GENERATED_IMAGES, PRODUCT_CATEGORIES } from '../constants/index.ts';
import { BenefitItem } from '../types/index.ts';
import { formatDateES, formatPoints, generateIdempotencyKey } from '../utils/points.ts';

export const CustomerBenefitsPage: React.FC = () => {
  const { profile, benefits, redemptions, refreshAllData } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [activeSubTab, setActiveSubTab] = useState<'catalogo' | 'mis-canjes'>('catalogo');
  const [confirmBenefit, setConfirmBenefit] = useState<BenefitItem | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  // Staff / Admin direct benefit & photo editor state
  const [editingBenefit, setEditingBenefit] = useState<Partial<BenefitItem> | null>(null);
  const [savingBenefit, setSavingBenefit] = useState(false);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);
  const [quickTargetBenefit, setQuickTargetBenefit] = useState<BenefitItem | null>(null);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    code?: string;
  } | null>(null);

  if (!profile) return null;

  const isStaffOrAdmin =
    profile.role === 'ADMINISTRADOR' || profile.role === 'EMPLEADO';

  const activeBenefits = benefits.filter((b) => {
    if (!b.isActive && !isStaffOrAdmin) return false;
    if (selectedCategory !== 'Todos' && b.category !== selectedCategory) return false;
    return true;
  });

  const handleConfirmRedeem = async () => {
    if (!confirmBenefit || redeeming) return;
    setRedeeming(true);
    setFeedback(null);

    try {
      const idemKey = generateIdempotencyKey('redeem');
      const result = await mondinoApi.redeemBenefit(confirmBenefit.id, idemKey);
      await refreshAllData();
      setConfirmBenefit(null);
      setActiveSubTab('mis-canjes');
      setFeedback({
        type: 'success',
        title: 'Canje confirmado con éxito',
        message: `Descontamos ${formatPoints(result.pointsSpent)} puntos de tu cuenta. Presentá este código en mostrador antes del ${result.expiresAt}.`,
        code: result.redemptionCode,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'No se pudo completar el canje',
        message: err.message || 'No pudimos procesar el canje del beneficio.',
      });
      setConfirmBenefit(null);
    } finally {
      setRedeeming(false);
    }
  };

  const triggerQuickPhoto = (benefit: BenefitItem) => {
    setQuickTargetBenefit(benefit);
    setTimeout(() => {
      quickFileInputRef.current?.click();
    }, 20);
  };

  const handleQuickPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickTargetBenefit) return;
    const target = quickTargetBenefit;
    setUploadingCardId(target.id);
    setFeedback(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      await mondinoApi.upsertBenefitAdmin({
        ...target,
        imageUrl: dataUrl,
      });
      await refreshAllData();
      setFeedback({
        type: 'success',
        title: 'Foto del beneficio actualizada',
        message: `La fotografía de "${target.title}" fue reemplazada correctamente.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'No se pudo actualizar la foto',
        message: err?.message || 'Error al subir la fotografía del beneficio.',
      });
    } finally {
      setUploadingCardId(null);
      setQuickTargetBenefit(null);
      if (quickFileInputRef.current) {
        quickFileInputRef.current.value = '';
      }
    }
  };

  const handleSaveBenefitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBenefit?.title || !editingBenefit?.description) return;
    setSavingBenefit(true);
    setFeedback(null);
    try {
      await mondinoApi.upsertBenefitAdmin(
        editingBenefit as Partial<BenefitItem> & { title: string; description: string }
      );
      await refreshAllData();
      setEditingBenefit(null);
      setFeedback({
        type: 'success',
        title: 'Beneficio publicado con éxito',
        message: 'El beneficio y su fotografía ya están actualizados en el catálogo.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'Error al guardar beneficio',
        message: err?.message || 'No se pudo guardar el beneficio.',
      });
    } finally {
      setSavingBenefit(false);
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={quickFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickPhotoChange}
        className="hidden"
      />

      {/* Header & Points Summary */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
            Beneficios y Recompensas
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Canjeá tus puntos acumulados por descuentos y productos exclusivos en Farmacia y
            Perfumería Mondino.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isStaffOrAdmin && (
            <button
              type="button"
              onClick={() =>
                setEditingBenefit({
                  title: '',
                  description: '',
                  category: 'Perfumería',
                  pointsRequired: 500,
                  stockAvailable: 25,
                  startDate: '2026-01-01',
                  endDate: '2027-12-31',
                  isActive: true,
                  imageUrl: GENERATED_IMAGES.benefitFragrance,
                  termsConditions:
                    'Presentar el código de canje en mostrador junto con tu QR personal.',
                })
              }
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar Beneficio con Foto</span>
            </button>
          )}

          <div className="rounded-xl bg-emerald-950 text-white px-4 py-3 shrink-0">
            <span className="text-[11px] text-emerald-200 block">Mis puntos disponibles</span>
            <span className="text-xl font-bold font-mono tabular-nums">
              {formatPoints(profile.pointsBalance)} pts
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-2xl border p-4 flex items-start justify-between gap-4 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-semibold">{feedback.title}</p>
              <p className="text-xs leading-relaxed">{feedback.message}</p>
              {feedback.code && (
                <div className="pt-1">
                  <span className="text-xs font-mono font-bold bg-white border border-emerald-300 px-3 py-1 rounded-lg inline-block">
                    Código: {feedback.code}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Segmented Control: Catálogo vs Mis Canjes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveSubTab('catalogo')}
            className={`min-h-[38px] px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'catalogo'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Catálogo de Beneficios ({benefits.filter((b) => b.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('mis-canjes')}
            className={`min-h-[38px] px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'mis-canjes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mis Canjes ({redemptions.length})
          </button>
        </div>

        {activeSubTab === 'catalogo' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-900 text-white font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Catálogo View */}
      {activeSubTab === 'catalogo' && (
        <>
          {activeBenefits.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-2">
              <Gift className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-base font-semibold text-slate-800">
                No hay beneficios en esta categoría
              </p>
              <p className="text-xs text-slate-500">
                Seleccioná otra categoría para ver todas las recompensas disponibles.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBenefits.map((benefit) => {
                const canAfford = profile.pointsBalance >= benefit.pointsRequired;
                const hasStock = benefit.stockAvailable > 0;
                const pointsMissing = Math.max(0, benefit.pointsRequired - profile.pointsBalance);

                return (
                  <div
                    key={benefit.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                        <SafeImage
                          src={benefit.imageUrl}
                          alt={benefit.title}
                          className="w-full h-full object-cover"
                        />
                        {isStaffOrAdmin && (
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={uploadingCardId === benefit.id}
                              onClick={() => triggerQuickPhoto(benefit)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-xs shadow-sm cursor-pointer"
                            >
                              <Upload className="w-3 h-3" />
                              <span>
                                {uploadingCardId === benefit.id ? 'Subiendo...' : 'Cambiar foto'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBenefit(benefit)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-900 text-[11px] font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-5 space-y-2.5">
                        <div className="text-xs text-slate-500">
                          <span>{benefit.category}</span>
                          <span className="mx-1.5">·</span>
                          <span>Stock: {benefit.stockAvailable} disp.</span>
                          <span className="mx-1.5">·</span>
                          <span>Vence {benefit.endDate}</span>
                        </div>
                        <h2 className="text-base font-bold text-slate-900">{benefit.title}</h2>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {benefit.description}
                        </p>
                        {benefit.termsConditions && (
                          <p className="text-[11px] text-slate-400 pt-1">
                            Condiciones: {benefit.termsConditions}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-5 pt-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Valor de canje</span>
                        <span className="text-base font-bold text-emerald-950 font-mono tabular-nums">
                          {formatPoints(benefit.pointsRequired)} puntos
                        </span>
                      </div>

                      {canAfford && hasStock ? (
                        <button
                          type="button"
                          onClick={() => setConfirmBenefit(benefit)}
                          className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Canjear ahora
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-slate-500 text-right">
                          {!hasStock
                            ? 'Sin stock'
                            : `Te faltan ${formatPoints(pointsMissing)} pts`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Mis Canjes View */}
      {activeSubTab === 'mis-canjes' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {redemptions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Ticket className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-base font-semibold text-slate-800">
                Todavía no realizaste canjes de beneficios
              </p>
              <p className="text-xs text-slate-500">
                Tus códigos de canje aparecerán aquí para que los presentes en Farmacia y
                Perfumería Mondino.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {redemptions.map((red) => {
                const benefitObj = benefits.find((b) => b.id === red.benefitId);
                return (
                  <div
                    key={red.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">
                        <span>Canjeado el {formatDateES(red.createdAt)}</span>
                        <span className="mx-1.5">·</span>
                        <span>Válido hasta {red.expiresAt}</span>
                        <span className="mx-1.5">·</span>
                        <span className="font-semibold text-slate-800">Estado: {red.status}</span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {benefitObj?.title || 'Beneficio Mondino Club'}
                      </h3>
                      <p className="text-xs text-slate-500 tabular-nums">
                        Puntos utilizados: -{formatPoints(red.pointsSpent)} puntos
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-right">
                        <span className="text-[10px] text-slate-400 block">
                          Código único de mostrador
                        </span>
                        <span className="text-sm font-mono font-bold text-emerald-950 tracking-wider select-all">
                          {red.redemptionCode}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Crear o Editar Beneficio y su Foto (Administrador / Empleados) */}
      {isStaffOrAdmin && editingBenefit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveBenefitForm}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800">
                  Gestión de Catálogo (Administrador y Empleados)
                </p>
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  {editingBenefit.id ? 'Editar Beneficio y Fotografía' : 'Publicar Nuevo Beneficio'}
                </h3>
              </div>
              <button type="button" onClick={() => setEditingBenefit(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <ImageUploaderField
              label="Fotografía del beneficio"
              value={editingBenefit.imageUrl || GENERATED_IMAGES.benefitSkincare}
              onChange={(url) => setEditingBenefit({ ...editingBenefit, imageUrl: url })}
              helperText="Subí la foto del producto o beneficio desde tu celular o computadora."
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
              <input
                type="text"
                required
                value={editingBenefit.title || ''}
                onChange={(e) => setEditingBenefit({ ...editingBenefit, title: e.target.value })}
                className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
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
                  value={editingBenefit.pointsRequired || 500}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                <select
                  value={editingBenefit.category || 'Perfumería'}
                  onChange={(e) =>
                    setEditingBenefit({ ...editingBenefit, category: e.target.value })
                  }
                  className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white"
                >
                  {PRODUCT_CATEGORIES.filter((c) => c !== 'Todos').map((c) => (
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
                disabled={savingBenefit}
                className="flex-1 min-h-[42px] rounded-xl bg-emerald-900 text-white text-xs font-semibold cursor-pointer"
              >
                {savingBenefit ? 'Guardando...' : 'Guardar Beneficio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmBenefit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-emerald-800">Confirmación de canje</p>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5 font-display">
                  {confirmBenefit.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmBenefit(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{confirmBenefit.description}</p>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Tu saldo actual</span>
                <span className="font-semibold text-slate-900 font-mono tabular-nums">
                  {formatPoints(profile.pointsBalance)} puntos
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Puntos a descontar</span>
                <span className="font-semibold text-emerald-900 font-mono tabular-nums">
                  -{formatPoints(confirmBenefit.pointsRequired)} puntos
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
                <span className="font-semibold text-slate-900">Saldo luego del canje</span>
                <span className="font-bold text-emerald-950 font-mono tabular-nums">
                  {formatPoints(profile.pointsBalance - confirmBenefit.pointsRequired)} puntos
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmBenefit(null)}
                disabled={redeeming}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={redeeming}
                className="flex-1 min-h-[44px] rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {redeeming ? 'Procesando canje...' : 'Confirmar canje'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
