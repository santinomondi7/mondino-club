import React, { useEffect, useState } from 'react';
import {
  Cake,
  Share2,
  Bell,
  UserCheck,
  LogOut,
  Copy,
  Check,
  Lock,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { mondinoApi } from '../services/api.ts';
import {
  formatPoints,
  getArgentinaTodayParts,
  isTodayUsersBirthday,
  parseBirthDateParts,
} from '../utils/points.ts';

export const CustomerProfilePage: React.FC = () => {
  const { profile, settings, referrals, refreshAllData, logout } = useAuth();

  const [firstName, setFirstName] = useState(profile?.firstName || '');
  const [lastName, setLastName] = useState(profile?.lastName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [birthDate, setBirthDate] = useState(profile?.birthDate || '');
  const [prefs, setPrefs] = useState(
    profile?.notificationPreferences || {
      promotions: true,
      benefits: true,
      expiring: true,
      birthday: true,
      news: true,
    }
  );

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setPhone(profile.phone || '');
    setBirthDate(profile.birthDate || '');
    setPrefs(
      profile.notificationPreferences || {
        promotions: true,
        benefits: true,
        expiring: true,
        birthday: true,
        news: true,
      }
    );
  }, [profile?.id, profile?.updatedAt]);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [claimingBirthday, setClaimingBirthday] = useState(false);
  const [birthdayMsg, setBirthdayMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [friendCode, setFriendCode] = useState('');
  const [applyingRef, setApplyingRef] = useState(false);
  const [refMsg, setRefMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedMyCode, setCopiedMyCode] = useState(false);

  const [browserPerm, setBrowserPerm] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  if (!profile) return null;

  const currentYear = getArgentinaTodayParts().year;
  const claimedBirthdayThisYear = (profile.birthdayBonusClaimedYear || 0) >= currentYear;
  const isBirthDateLocked = Boolean(profile.birthDate?.trim());
  const isBirthdayToday = isTodayUsersBirthday(profile.birthDate);
  const parsedBirthDate = parseBirthDateParts(profile.birthDate);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await mondinoApi.updateMyProfile({
        firstName,
        lastName,
        phone,
        birthDate: isBirthDateLocked ? profile.birthDate : birthDate,
        notificationPreferences: prefs,
      });
      await refreshAllData();
      setProfileMsg({ ok: true, text: 'Tus datos personales fueron guardados correctamente.' });
    } catch (err: any) {
      setProfileMsg({ ok: false, text: err?.message || 'Error al guardar cambios.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleClaimBirthday = async () => {
    setClaimingBirthday(true);
    setBirthdayMsg(null);
    try {
      const res = await mondinoApi.claimBirthdayBonus();
      await refreshAllData();
      setBirthdayMsg({
        ok: true,
        text: `¡Feliz cumpleaños! Se acreditaron +${res.bonusPoints} puntos en tu cuenta.`,
      });
    } catch (err: any) {
      setBirthdayMsg({
        ok: false,
        text: err?.message || 'No se pudo reclamar el bonus de cumpleaños.',
      });
    } finally {
      setClaimingBirthday(false);
    }
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCode.trim()) return;
    setApplyingRef(true);
    setRefMsg(null);
    try {
      const res = await mondinoApi.applyReferralCode(friendCode);
      await refreshAllData();
      setFriendCode('');
      setRefMsg({
        ok: true,
        text: `¡Código aplicado! Sumaste +${res.referredBonus} puntos y tu amigo/a ${res.referrerName} sumó +${res.referrerBonus} puntos.`,
      });
    } catch (err: any) {
      setRefMsg({
        ok: false,
        text: err?.message || 'No se pudo aplicar el código.',
      });
    } finally {
      setApplyingRef(false);
    }
  };

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(profile.referralCode);
      setCopiedMyCode(true);
      setTimeout(() => setCopiedMyCode(false), 2000);
    } catch {
      setCopiedMyCode(false);
    }
  };

  const handleEnableDeviceNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setBrowserPerm(perm);
      if (perm === 'granted') {
        new Notification(`Notificaciones activas en ${settings.clubName}`, {
          body: 'Recibirás avisos cuando sumes puntos, en tu cumpleaños y ante nuevas promociones.',
          icon: '/icon.svg',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
          Mi Perfil y Beneficios Especiales
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Administrá tus datos personales, recibí tu regalo el día de tu cumpleaños e invitá amigos
          a {settings.clubName}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Personal Info & Notification Preferences */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Datos Personales</h2>
                <p className="text-xs text-slate-500">Cuenta vinculada a {profile.email}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-800">Rol: {profile.role}</span>
          </div>

          {profileMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium border ${
                profileMsg.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {profileMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Apellido *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 9 3541 59-0624"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-700"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Fecha de Cumpleaños
                </label>
                {isBirthDateLocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Lock className="w-3 h-3 text-slate-400" />
                    No modificable
                  </span>
                )}
              </div>
              <input
                type="date"
                disabled={isBirthDateLocked}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${
                  isBirthDateLocked
                    ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                    : 'border-slate-300 bg-white focus:border-emerald-700'
                }`}
              />
              {isBirthDateLocked ? (
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Registrada el {parsedBirthDate?.formattedFull || profile.birthDate} (fija por
                  seguridad).
                </span>
              ) : (
                <span className="text-[11px] text-amber-700 mt-1 block">
                  Una vez guardada no se podrá modificar.
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Bell className="w-4 h-4 text-emerald-700" />
                Preferencias de Notificaciones de la App
              </div>
              {browserPerm !== 'unsupported' && (
                <button
                  type="button"
                  onClick={handleEnableDeviceNotifications}
                  disabled={browserPerm === 'granted'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    browserPerm === 'granted'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 cursor-pointer'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  {browserPerm === 'granted'
                    ? 'Avisos activos en este dispositivo ✓'
                    : 'Activar avisos en este dispositivo'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {[
                { key: 'promotions', label: 'Promociones y multiplicadores de puntos' },
                { key: 'benefits', label: 'Nuevos beneficios y catálogo de canje' },
                { key: 'birthday', label: 'Beneficio anual de cumpleaños' },
                { key: 'news', label: 'Novedades y eventos de la farmacia' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean((prefs as any)[item.key])}
                    onChange={(e) =>
                      setPrefs((prev) => ({ ...prev, [item.key]: e.target.checked }))
                    }
                    className="rounded text-emerald-700 focus:ring-emerald-600"
                  />
                  <span className="text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
            </button>

            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </button>
          </div>
        </form>

        {/* Right Column: Birthday Bonus & Referral Program */}
        <div className="lg:col-span-5 space-y-6">
          {/* Birthday Bonus Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Beneficio Anual de Cumpleaños
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  El día de tu cumpleaños te regalamos{' '}
                  <strong>+{formatPoints(settings.birthdayBonusPoints)} puntos</strong> directos en
                  tu cuenta de {settings.clubName}.
                </p>
              </div>
            </div>

            {birthdayMsg && (
              <div
                className={`p-3 rounded-xl text-xs border ${
                  birthdayMsg.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {birthdayMsg.text}
              </div>
            )}

            <button
              type="button"
              onClick={handleClaimBirthday}
              disabled={
                claimingBirthday ||
                claimedBirthdayThisYear ||
                !profile.birthDate ||
                !isBirthdayToday
              }
              className={`w-full py-3 px-4 rounded-xl text-xs font-semibold transition ${
                claimedBirthdayThisYear || !profile.birthDate || !isBirthdayToday
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer'
              }`}
            >
              {claimedBirthdayThisYear
                ? `Beneficio de cumpleaños ${currentYear} ya acreditado ✓`
                : !profile.birthDate
                ? 'Guardá tu fecha de cumpleaños para habilitar este beneficio'
                : isBirthdayToday
                ? claimingBirthday
                  ? 'Acreditando puntos...'
                  : `¡Feliz cumpleaños! Recibir mis +${settings.birthdayBonusPoints} puntos`
                : `Disponible únicamente el día de tu cumpleaños (${
                    parsedBirthDate?.formattedDayMonth || profile.birthDate
                  })`}
            </button>

            {!claimedBirthdayThisYear && profile.birthDate && !isBirthdayToday && (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                El botón se activará automáticamente el{' '}
                <strong>{parsedBirthDate?.formattedDayMonth}</strong> para que puedas recibir tus{' '}
                <strong>+{settings.birthdayBonusPoints} puntos</strong> de regalo.
              </p>
            )}
          </div>

          {/* Referral Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Programa de Referidos</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Compartí tu código personal. Cuando un amigo lo ingresa, vos sumás{' '}
                  <strong>+{settings.referrerBonusPoints} pts</strong> y tu amigo recibe{' '}
                  <strong>+{settings.referredBonusPoints} pts</strong> de bienvenida.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Tu código para compartir
                </span>
                <span className="font-mono font-bold text-base text-slate-900">
                  {profile.referralCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyReferral}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedMyCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>

            {!profile.referredById ? (
              <form onSubmit={handleApplyReferral} className="space-y-2.5 pt-2">
                <label className="block text-xs font-semibold text-slate-700">
                  ¿Te invitó un amigo? Ingresá su código:
                </label>
                {refMsg && (
                  <div
                    className={`p-2.5 rounded-xl text-xs border ${
                      refMsg.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {refMsg.text}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={friendCode}
                    onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                    placeholder="Ej. VALE-7482"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase focus:outline-none focus:border-emerald-700"
                  />
                  <button
                    type="submit"
                    disabled={applyingRef || !friendCode.trim()}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    {applyingRef ? '...' : 'Aplicar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 font-medium">
                Ya aplicaste un código de invitación en tu cuenta ✓
              </div>
            )}

            {referrals.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Amigos vinculados ({referrals.length}):
                </span>
                <div className="space-y-1">
                  {referrals.slice(0, 4).map((r) => (
                    <div
                      key={r.id}
                      className="text-xs flex items-center justify-between text-slate-600"
                    >
                      <span>Código {r.referralCodeUsed}</span>
                      <span className="font-mono font-semibold text-emerald-800">
                        +{r.referrerPointsAwarded} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
