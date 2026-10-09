import React, { useRef, useState } from 'react';
import {
  QrCode,
  ReceiptText,
  ArrowRight,
  Gift,
  Sparkles,
  Bell,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Image as ImageIcon,
  Cake,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { mondinoApi } from '../services/api.ts';
import { CustomerTab } from '../layouts/CustomerLayout.tsx';
import { SafeImage } from '../components/SafeImage.tsx';
import {
  ImageUploaderField,
  compressImageFileToDataUrl,
} from '../components/ImageUploaderField.tsx';
import {
  formatCurrencyARS,
  formatDateES,
  formatPoints,
  getArgentinaTodayParts,
  isTodayUsersBirthday,
} from '../utils/points.ts';

interface CustomerDashboardPageProps {
  onNavigate: (tab: CustomerTab) => void;
}

export const CustomerDashboardPage: React.FC<CustomerDashboardPageProps> = ({ onNavigate }) => {
  const {
    profile,
    settings,
    promotions,
    benefits,
    news,
    purchases,
    notifications,
    refreshAllData,
  } = useAuth();

  const [editingCover, setEditingCover] = useState(false);
  const [coverUrl, setCoverUrl] = useState(settings.logoUrl);
  const [savingCover, setSavingCover] = useState(false);
  const [uploadingQuickId, setUploadingQuickId] = useState<string | null>(null);
  const [claimingBirthday, setClaimingBirthday] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const quickBenefitFileRef = useRef<HTMLInputElement | null>(null);

  if (!profile) return null;

  const isStaffOrAdmin =
    profile.role === 'ADMINISTRADOR' || profile.role === 'EMPLEADO';

  const currentYear = getArgentinaTodayParts().year;
  const canClaimBirthdayToday =
    Boolean(profile.birthDate?.trim()) &&
    isTodayUsersBirthday(profile.birthDate) &&
    (profile.birthdayBonusClaimedYear || 0) < currentYear;

  const activePromotions = promotions.filter((p) => p.isActive);
  const featuredBenefit =
    benefits.find((b) => b.isActive && b.stockAvailable > 0) || benefits[0] || null;
  const recentNews = news.filter((n) => n.isPublished).slice(0, 2);
  const recentPurchases = purchases.slice(0, 3);
  const unreadNotifications = notifications.filter((n) => !n.isRead).slice(0, 2);

  const handleClaimBirthdayFromHome = async () => {
    setClaimingBirthday(true);
    setBannerMsg(null);
    try {
      const res = await mondinoApi.claimBirthdayBonus();
      await refreshAllData();
      setBannerMsg({
        type: 'ok',
        text: `¡Feliz cumpleaños, ${profile.firstName}! Se acreditaron +${res.bonusPoints} puntos de regalo en tu cuenta.`,
      });
    } catch (err: any) {
      setBannerMsg({
        type: 'err',
        text: err?.message || 'No se pudo reclamar el beneficio de cumpleaños.',
      });
    } finally {
      setClaimingBirthday(false);
    }
  };

  const handleSaveWebCover = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCover(true);
    setBannerMsg(null);
    try {
      await mondinoApi.updateSettingsAdmin({
        ...settings,
        logoUrl: coverUrl,
        appLogoUrl: '/images/mondino_app_logo.jpg',
      });
      await refreshAllData();
      setEditingCover(false);
      setBannerMsg({
        type: 'ok',
        text: 'Imagen de portada actualizada correctamente.',
      });
    } catch (err: any) {
      setBannerMsg({
        type: 'err',
        text: err?.message || 'No se pudo guardar la imagen.',
      });
    } finally {
      setSavingCover(false);
    }
  };

  const handleQuickBenefitPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !featuredBenefit) return;
    setUploadingQuickId(featuredBenefit.id);
    setBannerMsg(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      await mondinoApi.upsertBenefitAdmin({
        ...featuredBenefit,
        imageUrl: dataUrl,
      });
      await refreshAllData();
      setBannerMsg({
        type: 'ok',
        text: `Foto del beneficio "${featuredBenefit.title}" actualizada.`,
      });
    } catch (err: any) {
      setBannerMsg({
        type: 'err',
        text: err?.message || 'Error al subir la foto del beneficio.',
      });
    } finally {
      setUploadingQuickId(null);
      if (quickBenefitFileRef.current) {
        quickBenefitFileRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-8">
      <input
        ref={quickBenefitFileRef}
        type="file"
        accept="image/*"
        onChange={handleQuickBenefitPhoto}
        className="hidden"
      />

      {bannerMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
            bannerMsg.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMsg.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            )}
            <span>{bannerMsg.text}</span>
          </div>
          <button type="button" onClick={() => setBannerMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {canClaimBirthdayToday && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                ¡Feliz cumpleaños, {profile.firstName}! Hoy tenés tu regalo disponible
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Por ser el día de tu cumpleaños, {settings.clubSubtitle} te regala{' '}
                <strong>+{formatPoints(settings.birthdayBonusPoints)} puntos</strong> directos en
                tu cuenta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClaimBirthdayFromHome}
            disabled={claimingBirthday}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold text-xs shrink-0 transition cursor-pointer"
          >
            {claimingBirthday
              ? 'Acreditando...'
              : `Recibir mis +${settings.birthdayBonusPoints} puntos`}
          </button>
        </div>
      )}

      {/* Greeting & Main Points Balance Hero Card */}
      <section className="rounded-2xl bg-emerald-950 text-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-emerald-200 tracking-wide">
              {settings.clubSubtitle}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">
              Hola, {profile.firstName}
            </h1>
            <div className="pt-2">
              <p className="text-xs text-emerald-200/90">Mis puntos disponibles</p>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums font-mono">
                  {formatPoints(profile.pointsBalance)}
                </span>
                <span className="text-base font-medium text-emerald-200">puntos</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-100/90">
              <span>1 punto por cada $100</span>
              {activePromotions.length > 0 && (
                <>
                  <span>·</span>
                  <span className="font-semibold text-emerald-200">
                    Promoción activa: {activePromotions[0].title}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Primary Quick Actions */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('mi-qr')}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-white text-emerald-950 font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-emerald-50 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              <QrCode className="w-5 h-5 text-emerald-900 shrink-0" />
              <span>Mostrar Mi QR en Caja</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('historial')}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-900/80 border border-emerald-700/60 text-emerald-50 font-medium text-xs flex items-center justify-center gap-2 hover:bg-emerald-900 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ReceiptText className="w-4 h-4 shrink-0" />
              <span>Ver historial de compras</span>
            </button>
          </div>
        </div>
      </section>

      {/* Portada Visual de la Web (Editable por Administrador y Empleados) */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="relative h-48 sm:h-60 w-full bg-slate-100">
          <SafeImage
            src={settings.logoUrl}
            alt={`Portada ${settings.clubName}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent flex items-end justify-between p-5 sm:p-6 gap-4">
            <div className="text-white max-w-xl space-y-1">
              <div className="text-xs text-emerald-200 font-medium">
                <span>{settings.clubName}</span>
                <span className="mx-1.5">·</span>
                <span>{settings.address}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-display">
                Cuidado farmacéutico profesional y perfumería selectiva
              </h2>
              <p className="text-xs text-slate-200">
                Atención personalizada {settings.openingHours} · WhatsApp {settings.whatsappContact}
              </p>
            </div>

            {isStaffOrAdmin && (
              <button
                type="button"
                onClick={() => {
                  setCoverUrl(settings.logoUrl);
                  setEditingCover((prev) => !prev);
                }}
                className="min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-sm cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{editingCover ? 'Cerrar editor' : 'Cambiar portada'}</span>
              </button>
            )}
          </div>
        </div>

        {isStaffOrAdmin && editingCover && (
          <form
            onSubmit={handleSaveWebCover}
            className="p-5 bg-slate-50 border-t border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-800" />
                Modificar Imagen Principal de Portada de la Web (Administrador / Empleados)
              </span>
              <button
                type="button"
                onClick={() => setEditingCover(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </button>
            </div>

            <ImageUploaderField
              label="Subir nueva foto de portada para la web"
              value={coverUrl}
              onChange={setCoverUrl}
              helperText="Podés subir cualquier fotografía desde tu celular o computadora. El cambio se aplica al instante para todos los clientes."
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCover(false)}
                className="min-h-[38px] px-4 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingCover}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
              >
                {savingCover ? 'Guardando...' : 'Guardar logotipo y portada'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Unread Notifications / Reminders */}
      {unreadNotifications.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-emerald-800" />
              Avisos y recordatorios recientes ({unreadNotifications.length} nuevos)
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await mondinoApi.markNotificationsRead();
                  await refreshAllData();
                } catch (e) {
                  console.error(e);
                }
              }}
              className="font-semibold text-emerald-800 hover:underline cursor-pointer"
            >
              Marcar como leídos
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {unreadNotifications.map((notif) => (
              <div
                key={notif.id}
                className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900">{notif.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{notif.message}</p>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                  {formatDateES(notif.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Benefit & Active Promotions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Beneficio Destacado */}
        <section className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {featuredBenefit ? (
            <>
              <div>
                <div className="h-48 w-full bg-slate-100 relative">
                  <SafeImage
                    src={featuredBenefit.imageUrl}
                    alt={featuredBenefit.title}
                    className="w-full h-full object-cover"
                  />
                  {isStaffOrAdmin && (
                    <button
                      type="button"
                      disabled={uploadingQuickId === featuredBenefit.id}
                      onClick={() => quickBenefitFileRef.current?.click()}
                      className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-sm cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingQuickId === featuredBenefit.id
                          ? 'Subiendo...'
                          : 'Cambiar foto'}
                      </span>
                    </button>
                  )}
                </div>
                <div className="p-5 space-y-2">
                  <div className="text-xs text-emerald-800 font-medium">
                    <span>Beneficio destacado</span>
                    <span className="mx-1.5">·</span>
                    <span>{featuredBenefit.category}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 font-display">
                    {featuredBenefit.title}
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {featuredBenefit.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-slate-500 block">Puntos requeridos</span>
                  <span className="text-base font-bold text-emerald-950 tabular-nums">
                    {formatPoints(featuredBenefit.pointsRequired)} puntos
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('beneficios')}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-900 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Ver beneficios</span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-sm text-slate-500">
              No hay beneficios destacados en este momento.
            </div>
          )}
        </section>

        {/* Promociones Activas */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Promociones activas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Se aplican automáticamente en caja al escanear tu código QR
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('novedades')}
              className="text-xs font-semibold text-emerald-900 hover:underline whitespace-nowrap cursor-pointer"
            >
              Ver todas →
            </button>
          </div>

          {activePromotions.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Actualmente sumás el 1% base ($100 = 1 punto) en todas tus compras.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {activePromotions.slice(0, 3).map((promo) => (
                <div
                  key={promo.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="text-xs text-emerald-800 font-medium">
                      <span>{promo.category}</span>
                      <span className="mx-1.5">·</span>
                      <span>
                        {promo.promoType === 'MULTIPLICADOR'
                          ? `Multiplicador x${Number(promo.multiplier)}`
                          : `+${formatPoints(promo.extraPoints)} puntos extra`}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{promo.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{promo.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-semibold text-emerald-900 tabular-nums">
                      {promo.promoType === 'MULTIPLICADOR'
                        ? `x${Number(promo.multiplier)}`
                        : `+${promo.extraPoints} pts`}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Hasta {promo.endDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
              Regla base garantizada: $100 = 1 punto (1%)
            </span>
            <button
              type="button"
              onClick={() => onNavigate('mi-qr')}
              className="font-semibold text-emerald-900 hover:underline cursor-pointer"
            >
              Abrir Mi QR
            </button>
          </div>
        </section>
      </div>

      {/* Últimas Compras & Novedades Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Historial reciente de compras */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">Mis últimas compras</h2>
              <p className="text-xs text-slate-500">Operaciones verificadas en mostrador</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('historial')}
              className="text-xs font-semibold text-emerald-900 hover:underline cursor-pointer whitespace-nowrap"
            >
              Historial completo →
            </button>
          </div>

          {recentPurchases.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm text-slate-600">Todavía no registraste compras con tu QR.</p>
              <p className="text-xs text-slate-400">
                Mostrá tu código QR en Farmacia y Perfumería Mondino para sumar tus primeros puntos.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPurchases.map((pur) => (
                <div
                  key={pur.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {pur.notes || `Compra en ${pur.category}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span>{formatDateES(pur.createdAt)}</span>
                      <span className="mx-1.5">·</span>
                      <span>{pur.category}</span>
                      <span className="mx-1.5">·</span>
                      <span className="tabular-nums">{formatCurrencyARS(pur.amount)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-bold tabular-nums font-mono ${
                        pur.status === 'ANULADA' ? 'text-red-600 line-through' : 'text-emerald-900'
                      }`}
                    >
                      +{formatPoints(pur.totalPoints)} pts
                    </span>
                    {pur.promoPoints > 0 && (
                      <span className="block text-[11px] text-emerald-700 tabular-nums">
                        Incluye +{formatPoints(pur.promoPoints)} bonus
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Novedades recientes */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">Novedades</h2>
              <p className="text-xs text-slate-500">Lanzamientos y consejos de Mondino</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('novedades')}
              className="text-xs font-semibold text-emerald-900 hover:underline cursor-pointer whitespace-nowrap"
            >
              Ver todas →
            </button>
          </div>

          <div className="space-y-4">
            {recentNews.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate('novedades')}
                className="group flex items-start gap-4 cursor-pointer"
              >
                <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  <SafeImage
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-slate-500">
                    <span>{item.category}</span>
                    <span className="mx-1.5">·</span>
                    <span>{item.publishedAt}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-900 transition-colors line-clamp-1 mt-0.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1">{item.summary}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-900 shrink-0 mt-2" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
