import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  QrCode,
  Gift,
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  LogIn,
  HeartHandshake,
} from 'lucide-react';
import { PWAInstallButton } from '../components/PWAInstallButton.tsx';

const PHARMACY_QUOTES = [
  {
    id: 'vocacion',
    kicker: 'Vocación Farmacéutica · Atención Profesional',
    quote:
      '“Donde la ciencia farmacéutica se une con la calidez humana: cuidar tu salud y acompañar tu bienestar cada día es nuestra mayor vocación.”',
    author: 'Farmacia y Perfumería Mondino',
    detail: 'Consejo profesional, dispensación responsable y cercanía familiar.',
  },
  {
    id: 'confianza',
    kicker: 'Salud y Confianza · Tradición de Cuidado',
    quote:
      '“Detrás de cada receta y cada recomendación hay un equipo farmacéutico que te escucha, te conoce y cuida lo más valioso: la salud de tu familia.”',
    author: 'Equipo Profesional Mondino',
    detail: 'Atención personalizada en farmacia clínica, dermocosmética y perfumería.',
  },
  {
    id: 'bienestar',
    kicker: 'Bienestar Integral · Compromiso Diario',
    quote:
      '“La verdadera salud se construye en la confianza de todos los días: estamos siempre cerca para brindarte alivio, prevención y cuidado.”',
    author: 'Mondino Club · Comunidad de Socios',
    detail: 'Tu fidelidad y tu confianza premiadas en cada visita.',
  },
] as const;

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, settings, loadingAuth, authError, isSupabaseReady } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const isIframePreview =
    typeof window !== 'undefined' &&
    (window.self !== window.top || window.location.hostname.startsWith('ais-dev-'));

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setIsSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (!res.ok) {
        setErrorMsg(res.message);
      } else if (isIframePreview && isSupabaseReady && res.message) {
        setInfoMsg(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = errorMsg || authError;
  const activeQuote = PHARMACY_QUOTES[quoteIdx] || PHARMACY_QUOTES[0];

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-between">
      {/* Top Navbar (Strict 3-Zone Contract) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Logo & Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src={settings.appLogoUrl || '/images/mondino_app_logo.jpg'}
              alt={settings.clubName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover border border-emerald-200 shadow-2xs shrink-0"
            />
            <div>
              <span className="font-bold text-emerald-950 tracking-tight text-lg font-display whitespace-nowrap block leading-tight">
                {settings.clubName}
              </span>
              <span className="text-[11px] text-slate-500 block leading-tight">
                {settings.clubSubtitle}
              </span>
            </div>
          </div>

          {/* Zone 2: Clean Inline Contact Metadata */}
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-800" />
              {settings.address}
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <Clock className="w-3.5 h-3.5 text-emerald-800" />
              {settings.openingHours}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-900 whitespace-nowrap shrink-0">
              <Phone className="w-3.5 h-3.5 text-emerald-800" />
              {settings.whatsappContact}
            </span>
          </div>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Main Content Split */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Editorial Hero, Pharmacy Quote Card & Value Prop */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <span>{settings.clubSubtitle}</span>
            <span aria-hidden="true">·</span>
            <span>Programa Oficial de Fidelización</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-[1.12] font-display">
            Cuidar tu salud y elegir tu bienestar cada día te premia siempre.
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Sumate gratis a <strong>{settings.clubName}</strong>. Presentá tu código QR personal en
            cada atención de farmacia, dermocosmética o perfumería y acumulá puntos reales al
            instante.
          </p>

          {/* Editorial Pharmacy Quote Card (Replaces the old photo on logged-out screen) */}
          <div className="relative rounded-2xl overflow-hidden border border-emerald-900/15 bg-gradient-to-br from-[#063F30] via-[#0B5340] to-[#0F3D3E] text-white p-6 sm:p-8 shadow-md">
            {/* Subtle Apothecary & Botanical Vector Watermark Illustration */}
            <svg
              aria-hidden="true"
              viewBox="0 0 200 200"
              className="w-44 h-44 text-emerald-200/10 absolute -right-6 -bottom-6 pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              {/* Pharmacy Cross + Botanical Leaf Motif */}
              <path d="M85 35h30v35h35v30h-35v35H85v-35H50V70h35V35z" />
              <path d="M40 160c35-8 65-28 95-65 15 28 5 55-25 65-25 8-50 5-70 0z" />
              <circle cx="100" cy="100" r="82" strokeDasharray="4 6" />
            </svg>

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-emerald-200 font-medium">
                  <HeartHandshake className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>{activeQuote.kicker}</span>
                </div>

                {/* Interactive Quote Selector */}
                <div className="flex items-center gap-1.5">
                  {PHARMACY_QUOTES.map((q, idx) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setQuoteIdx(idx)}
                      aria-label={`Ver frase farmacéutica ${idx + 1}`}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                        quoteIdx === idx
                          ? 'bg-amber-300 text-emerald-950 font-bold'
                          : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                      }`}
                    >
                      0{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <blockquote className="text-lg sm:text-2xl font-display italic text-white leading-relaxed tracking-tight">
                {activeQuote.quote}
              </blockquote>

              <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-amber-300">{activeQuote.author}</span>
                <span className="text-emerald-100/85">{activeQuote.detail}</span>
              </div>
            </div>
          </div>

          {/* Permanent Rule Banner */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-emerald-900 mb-1">
                  <span>Regla transparente y permanente</span>
                  <span className="mx-1.5">·</span>
                  <span>1% en puntos base</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
                  Cada <span className="text-emerald-800">$100</span> de compra ={' '}
                  <span className="text-emerald-800">1 Punto</span> Mondino
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Equivalente exacto al 1% en puntos base más multiplicadores por promociones activas.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 shrink-0 font-mono tabular-nums">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Compra $1.000</span>
                  <span className="font-bold text-slate-900">= 10 pts</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Compra $10.000</span>
                  <span className="font-bold text-slate-900">= 100 pts</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Compra $50.000</span>
                  <span className="font-bold text-emerald-900">= 500 pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">QR Personal Único</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Mostralo desde tu celular en mostrador para acreditar tus compras en segundos.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <Gift className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Catálogo de Premios</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Canjeá tus puntos por vouchers de descuento, kits de cuidado facial y perfumería.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Beneficios Anuales</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Recibí <strong>+{settings.birthdayBonusPoints} puntos</strong> en tu cumpleaños,{' '}
                <strong>+{settings.referrerBonusPoints} puntos</strong> por invitar a un amigo y{' '}
                <strong>+{settings.referredBonusPoints} puntos</strong> por ser invitado.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Auth Card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3.5">
              <img
                src={settings.appLogoUrl || '/images/mondino_app_logo.jpg'}
                alt={settings.clubName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border border-emerald-200 shadow-xs shrink-0"
              />
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  Ingresar a {settings.clubName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Iniciá sesión de forma segura con tu cuenta de Google. Si es tu primera vez, tu
                  tarjeta digital y tu QR se crean automáticamente.
                </p>
              </div>
            </div>

            {activeError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{activeError}</span>
              </div>
            )}

            {infoMsg && !activeError && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleGoogleSignIn()}
                disabled={isSubmitting || loadingAuth}
                className="w-full py-3.5 px-4 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white font-semibold rounded-xl shadow-sm transition flex items-center justify-center gap-3 text-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {isSubmitting || loadingAuth
                  ? 'Conectando con Google...'
                  : 'Continuar con Google'}
              </button>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  Autenticación Oficial con Google
                </div>
                <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                  Tus puntos, código QR personal, canjes y compras están respaldados de forma
                  segura y sincronizados en tiempo real.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 text-[11px] text-slate-400 text-center space-y-1">
              <p>
                Al ingresar aceptás los Términos y Condiciones del programa de fidelización de{' '}
                {settings.clubSubtitle}.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} <strong>{settings.clubSubtitle}</strong> —{' '}
            {settings.clubName}.
          </span>
          <span className="text-slate-400">
            Regla oficial inmutable: $100 de compra = 1 punto Mondino.
          </span>
        </div>
      </footer>
    </div>
  );
};
