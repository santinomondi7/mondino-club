import React, { useEffect, useState } from 'react';
import {
  Home,
  QrCode,
  Gift,
  Sparkles,
  ReceiptText,
  User,
  Bell,
  LogOut,
  ShieldAlert,
  ScanLine,
  Lock,
  Cake,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { UserRole } from '../types/index.ts';
import { formatPoints, formatDateTimeES } from '../utils/points.ts';
import { mondinoApi } from '../services/api.ts';
import { PWAInstallButton } from '../components/PWAInstallButton.tsx';

export type CustomerTab =
  | 'inicio'
  | 'mi-qr'
  | 'beneficios'
  | 'novedades'
  | 'historial'
  | 'perfil';

interface CustomerLayoutProps {
  activeTab: CustomerTab;
  onSelectTab: (tab: CustomerTab) => void;
  children: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({
  activeTab,
  onSelectTab,
  children,
}) => {
  const {
    profile,
    settings,
    notifications,
    logout,
    setWorkspaceMode,
    refreshAllData,
  } = useAuth();
  const [showNotifOpen, setShowNotifOpen] = useState(false);
  const [browserPerm, setBrowserPerm] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  // Estado del modal obligatorio de completar datos al iniciar sesión por primera vez
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName && profile.firstName !== 'Cliente' ? profile.firstName : '');
    setLastName(profile.lastName || '');
    setPhone(profile.phone || '');
    setBirthDate(profile.birthDate || '');
  }, [profile?.id, profile?.updatedAt]);

  if (!profile) return null;

  const needsOnboardingData =
    !profile.birthDate?.trim() ||
    !profile.phone?.trim() ||
    !profile.firstName?.trim() ||
    profile.firstName.trim() === 'Cliente' ||
    !profile.lastName?.trim();

  const existingBirthDateLocked = Boolean(profile.birthDate?.trim());

  const myNotifications = notifications.filter((n) => n.customerId === profile.id);
  const unreadCount = myNotifications.filter((n) => !n.isRead).length;

  const handleOpenNotifications = async () => {
    const nextState = !showNotifOpen;
    setShowNotifOpen(nextState);
    if (nextState && unreadCount > 0) {
      try {
        await mondinoApi.markNotificationsRead();
        await refreshAllData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEnableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setBrowserPerm(perm);
      if (perm === 'granted') {
        new Notification(`Notificaciones activadas — ${settings.clubName}`, {
          body: 'Te avisaremos cuando sumes puntos, en tu cumpleaños y ante nuevas promociones de la farmacia.',
          icon: '/icon.svg',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError('');

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanPhone = phone.trim();
    const cleanBirth = existingBirthDateLocked ? profile.birthDate : birthDate.trim();

    if (!cleanFirst || !cleanLast) {
      setOnboardingError('Por favor ingresá tu nombre y apellido completos.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 6) {
      setOnboardingError('Por favor ingresá tu número de teléfono o WhatsApp.');
      return;
    }
    if (!cleanBirth) {
      setOnboardingError('Por favor ingresá tu fecha de cumpleaños.');
      return;
    }

    setSavingOnboarding(true);
    try {
      await mondinoApi.updateMyProfile({
        firstName: cleanFirst,
        lastName: cleanLast,
        phone: cleanPhone,
        birthDate: cleanBirth,
        notificationPreferences: profile.notificationPreferences || {
          promotions: true,
          benefits: true,
          expiring: true,
          birthday: true,
          news: true,
        },
      });
      await refreshAllData();
    } catch (err: any) {
      setOnboardingError(err?.message || 'No se pudieron guardar tus datos.');
    } finally {
      setSavingOnboarding(false);
    }
  };

  const navItems: { id: CustomerTab; label: string; icon: React.ElementType }[] = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'mi-qr', label: 'Mi QR', icon: QrCode },
    { id: 'beneficios', label: 'Beneficios', icon: Gift },
    { id: 'novedades', label: 'Novedades', icon: Sparkles },
    { id: 'historial', label: 'Historial', icon: ReceiptText },
    { id: 'perfil', label: 'Mi Perfil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col pb-20 md:pb-8">
      {/* Modal obligatorio para completar datos al iniciar sesión */}
      {needsOnboardingData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                <Cake className="w-3.5 h-3.5 text-emerald-700" />
                Registro Oficial de Socio · {settings.clubName}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                Completá tus datos para continuar
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tus datos quedarán guardados en tu ficha de socio de{' '}
                <strong>{settings.clubSubtitle}</strong> para acreditar puntos, validar canjes y
                otorgarte tu beneficio de cumpleaños.
              </p>
            </div>

            {onboardingError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{onboardingError}</span>
              </div>
            )}

            <form onSubmit={handleSaveOnboarding} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Valeria"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Gómez"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +54 9 3541 59-0624"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Fecha de Cumpleaños *
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                    <Lock className="w-3 h-3" />
                    No se podrá modificar luego
                  </span>
                </div>
                <input
                  type="date"
                  required
                  disabled={existingBirthDateLocked}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${
                    existingBirthDateLocked
                      ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                      : 'border-slate-300 bg-white focus:border-emerald-700'
                  }`}
                />
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 mt-2 leading-relaxed">
                  <strong>Importante:</strong> Verificá bien tu fecha de cumpleaños antes de
                  guardar. Una vez registrada quedará fija de forma permanente y recibirás{' '}
                  <strong>+{settings.birthdayBonusPoints} puntos de regalo</strong> únicamente el
                  día de tu cumpleaños.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingOnboarding}
                className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-sm transition cursor-pointer"
              >
                {savingOnboarding
                  ? 'Guardando tus datos...'
                  : 'Guardar mis datos y continuar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Role Switcher Banner if Staff or Admin is viewing Customer UI */}
      {(profile.role === UserRole.ADMINISTRADOR || profile.role === UserRole.EMPLEADO) && (
        <div className="bg-emerald-950 text-emerald-100 px-4 py-2 text-xs border-b border-emerald-900">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-medium">
              {profile.role === UserRole.ADMINISTRADOR ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Estás viendo la interfaz de Cliente con tu cuenta de Administrador.</span>
                </>
              ) : (
                <>
                  <ScanLine className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Estás viendo la interfaz de Cliente con tu cuenta de Empleado.</span>
                </>
              )}
            </span>
            <button
              onClick={() =>
                setWorkspaceMode(
                  profile.role === UserRole.ADMINISTRADOR ? 'ADMINISTRADOR' : 'EMPLEADO'
                )
              }
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
            >
              Ir al Panel de{' '}
              {profile.role === UserRole.ADMINISTRADOR
                ? 'Administración'
                : 'Mostrador / Fotos'}{' '}
              →
            </button>
          </div>
        </div>
      )}

      {/* Top Header (3-Zone Contract) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Identity */}
          <button
            onClick={() => onSelectTab('inicio')}
            className="text-left cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="font-bold text-slate-900 text-base tracking-tight block leading-tight font-display">
              {settings.clubName}
            </span>
            <span className="text-[11px] text-slate-500 block">{settings.clubSubtitle}</span>
          </button>

          {/* Zone 2: Desktop Primary Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Points Readout, Notifications & Logout */}
          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton />

            <button
              onClick={() => onSelectTab('mi-qr')}
              className="flex items-center gap-1.5 text-sm font-mono font-bold text-emerald-950 hover:text-emerald-800 transition cursor-pointer whitespace-nowrap"
              title="Tu saldo de puntos Mondino"
            >
              <span>{formatPoints(profile.pointsBalance)}</span>
              <span className="text-xs font-sans font-semibold text-emerald-700">pts</span>
            </button>

            <span className="text-slate-200 select-none" aria-hidden="true">
              |
            </span>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Notificaciones"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifOpen && (
                <div className="fixed inset-x-3 top-[4.25rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-slate-900">
                      Notificaciones de tu cuenta
                    </span>
                    <button
                      onClick={() => setShowNotifOpen(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>

                  {/* Estado de Notificaciones del Dispositivo */}
                  {browserPerm !== 'unsupported' && (
                    <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2">
                      {browserPerm === 'granted' ? (
                        <span className="text-[11px] text-emerald-900 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          Avisos activos en este dispositivo
                        </span>
                      ) : (
                        <>
                          <span className="text-[11px] text-slate-700">
                            Recibí avisos de puntos y promos en tu celular
                          </span>
                          <button
                            type="button"
                            onClick={handleEnableBrowserNotifications}
                            className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                          >
                            Activar avisos
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className="max-h-[65vh] sm:max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {myNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No tenés notificaciones pendientes.
                      </div>
                    ) : (
                      myNotifications.slice(0, 12).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setShowNotifOpen(false);
                            if (n.actionUrl === '/perfil') onSelectTab('perfil');
                            else if (n.actionUrl === '/historial') onSelectTab('historial');
                            else if (n.actionUrl === '/beneficios') onSelectTab('beneficios');
                            else if (n.actionUrl === '/mi-qr') onSelectTab('mi-qr');
                            else if (n.actionUrl === '/novedades') onSelectTab('novedades');
                          }}
                          className="p-3.5 hover:bg-slate-50 transition cursor-pointer"
                        >
                          <div className="font-semibold text-xs text-slate-900">{n.title}</div>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {formatDateTimeES(n.createdAt)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30">
        <div className="grid grid-cols-6 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition cursor-pointer ${
                  isActive ? 'text-emerald-800 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-800' : ''}`} />
                <span className="truncate max-w-full px-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
