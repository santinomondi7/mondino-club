import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  Scale,
  Lock,
  X,
  Building2,
  HeartPulse,
  CheckCircle2,
} from 'lucide-react';
import { AppSettings } from '../types/index.ts';
import { formatPoints } from '../utils/points.ts';

export type LegalTab = 'terminos' | 'privacidad' | 'aviso-legal';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  settings: AppSettings;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'terminos',
  onClose,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/images/mondino_app_logo.jpg"
              alt={settings.clubName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-contain bg-white border border-emerald-200 shrink-0"
            />
            <div className="min-w-0">
              <h2
                id="legal-modal-title"
                className="text-sm sm:text-base font-bold text-slate-900 font-display truncate"
              >
                Marco Legal, Privacidad y Condiciones — {settings.clubName}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {settings.clubSubtitle} · {settings.address}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
            aria-label="Cerrar ventana legal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-5 pt-3 border-b border-slate-200 bg-white flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('terminos')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'terminos'
                ? 'border-emerald-800 text-emerald-900 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Términos y Condiciones</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacidad')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'privacidad'
                ? 'border-emerald-800 text-emerald-900 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Política de Privacidad</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aviso-legal')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'aviso-legal'
                ? 'border-emerald-800 text-emerald-900 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Aviso Legal y Farmacia</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed flex-1">
          {activeTab === 'terminos' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Reglamento Oficial del Programa de Fidelización "{settings.clubName}"
                  </p>
                  <p className="text-[11px] text-emerald-900/90 mt-0.5">
                    El registro y uso de la aplicación implica el conocimiento y la aceptación plena
                    y sin reservas de los presentes Términos y Condiciones.
                  </p>
                </div>
              </div>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  1. Organizador y Objeto del Programa
                </h3>
                <p>
                  El programa de beneficios y fidelización <strong>{settings.clubName}</strong> es
                  organizado y administrado por <strong>{settings.clubSubtitle}</strong>, con
                  domicilio comercial en <strong>{settings.address}</strong> (en adelante, "el
                  Organizador"). Su objetivo es recompensar la fidelidad de sus clientes mediante la
                  acumulación de puntos por compras presenciales y el acceso a beneficios,
                  descuentos y obsequios promocionales.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  2. Requisitos de Adhesión y Titularidad de la Cuenta
                </h3>
                <p>
                  Podrán participar todas las personas humanas mayores de dieciocho (18) años que se
                  registren gratuitamente a través de la aplicación web oficial mediante su cuenta
                  personal de Google. La membresía, el código QR identificatorio y los puntos
                  acumulados son estrictamente <strong>personales, únicos e intransferibles</strong>,
                  no pudiendo cederse ni negociarse a favor de terceros ni unificarse entre
                  distintas cuentas.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  3. Naturaleza No Monetaria de los Puntos
                </h3>
                <p>
                  Los puntos acumulados en <strong>{settings.clubName}</strong> tienen carácter
                  exclusivamente promocional y demostrativo de fidelidad.{' '}
                  <strong>
                    No constituyen dinero, moneda de curso legal, divisa, título valor, saldo
                    financiero ni medio de pago electrónico
                  </strong>
                  . En ningún caso y bajo ninguna circunstancia los puntos ni los vouchers de
                  beneficios podrán ser canjeados por dinero en efectivo ni darán derecho a vuelto o
                  reintegro en metálico.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  4. Regla de Acumulación de Puntos y Bonificaciones
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Regla Base Oficial:</strong> Por cada{' '}
                    <strong>${formatPoints(settings.basePointsRateLocked)} ARS</strong> (pesos
                    argentinos) efectivamente abonados en compras válidas en mostrador presentando
                    el código QR del titular en el momento de la operación, se acreditará{' '}
                    <strong>1 (un) punto</strong> (calculado como la parte entera de la compra
                    dividida por ${formatPoints(settings.basePointsRateLocked)}).
                  </li>
                  <li>
                    <strong>Exclusiones Legales y Operativas:</strong> El Organizador podrá excluir
                    de la acumulación o de las promociones aquellos productos o especialidades
                    medicinales cuya promoción, bonificación o descuento se encuentre restringido
                    por normativas sanitarias nacionales o provinciales, obras sociales, prepagas o
                    convenios específicos.
                  </li>
                  <li>
                    <strong>Bonificaciones Especiales:</strong> El sistema otorga bonificaciones
                    adicionales sujetas a validación automática: bono anual de cumpleaños (+
                    {settings.birthdayBonusPoints} puntos, disponible únicamente el día del
                    cumpleaños registrado por única vez e inmodificable) y bonificación por
                    referidos (+{settings.referrerBonusPoints} puntos para quien invita y +
                    {settings.referredBonusPoints} puntos para el nuevo socio invitado, aplicable
                    una sola vez por cuenta).
                  </li>
                  <li>
                    <strong>Anulaciones y Devoluciones:</strong> En caso de anulación de factura,
                    devolución de productos o error material de carga en mostrador, el Organizador
                    reversará automáticamente los puntos originados por dicha operación.
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  5. Canje de Beneficios, Stock y Vigencia
                </h3>
                <p>
                  Todos los premios, vouchers y beneficios publicados en el catálogo están sujetos a
                  la <strong>disponibilidad de stock existente en sucursal</strong> y a las fechas
                  de vigencia informadas en cada ítem. Una vez solicitado el canje en la aplicación,
                  se descontarán los puntos correspondientes y se emitirá un código alfanumérico
                  único e irrepetible. Para efectivizar la entrega en mostrador, el titular deberá
                  exhibir dicho código junto con su Documento Nacional de Identidad (DNI) para
                  acreditar su identidad. Los beneficios no son acumulables con otras promociones,
                  descuentos de obras sociales ni liquidaciones salvo indicación expresa.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  6. Prevención de Fraude, Sanciones y Modificaciones
                </h3>
                <p>
                  El Organizador se reserva el derecho de suspender o dar de baja de manera
                  inmediata cualquier cuenta cuando detecte maniobras fraudulentas, creación de
                  cuentas múltiples o ficticias para obtener bonos de referidos o cumpleaños,
                  manipulación de códigos QR o incumplimiento de estos Términos, perdiendo el
                  usuario la totalidad de los puntos acumulados sin derecho a reclamo ni
                  indemnización alguna. Asimismo, el Organizador podrá actualizar el catálogo,
                  modificar las condiciones del programa o disponer su finalización comunicándolo
                  previamente a través de la aplicación, en cumplimiento de la Ley N° 24.240.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  7. Limitación de Responsabilidad y Jurisdicción
                </h3>
                <p>
                  El Organizador no será responsable por fallas en la conectividad del dispositivo
                  del usuario, interrupciones de servicios de internet o de proveedores externos de
                  autenticación o alojamiento en la nube. Para cualquier divergencia derivada de la
                  interpretación o aplicación de este reglamento, serán de aplicación las leyes de
                  la República Argentina y la jurisdicción de los Tribunales Ordinarios competentes
                  con asiento en la Provincia de Córdoba.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'privacidad' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-950 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Política de Privacidad y Protección de Datos Personales (Ley N° 25.326)
                  </p>
                  <p className="text-[11px] text-teal-900/90 mt-0.5">
                    Tratamiento confidencial y seguro de la información personal de los socios de{' '}
                    {settings.clubName}.
                  </p>
                </div>
              </div>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  1. Responsable del Tratamiento de los Datos
                </h3>
                <p>
                  El responsable del archivo y tratamiento de los datos personales recolectados a
                  través de la aplicación es <strong>{settings.clubSubtitle}</strong>, con domicilio
                  en <strong>{settings.address}</strong> y canal de contacto oficial{' '}
                  <strong>{settings.whatsappContact}</strong>. Todos los datos son tratados en
                  estricto cumplimiento de la{' '}
                  <strong>Ley Nacional N° 25.326 de Protección de los Datos Personales</strong> y su
                  Decreto Reglamentario N° 1558/2001.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  2. Datos Recolectados y Autenticación con Google OAuth
                </h3>
                <p>
                  La aplicación recolecta únicamente los datos mínimos e indispensables para la
                  operación del programa de fidelización:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Datos de Identidad Básica (vía Google OAuth 2.0):</strong> Nombre,
                    apellido, dirección de correo electrónico verificada e imagen de avatar de tu
                    perfil de Google. La aplicación nunca accede a tu contraseña de Google ni a
                    otros servicios privados de tu cuenta.
                  </li>
                  <li>
                    <strong>Datos de Perfil de Socio:</strong> Número de teléfono de contacto, fecha
                    de nacimiento (utilizada exclusivamente para acreditar el beneficio anual de
                    cumpleaños) y preferencias de avisos.
                  </li>
                  <li>
                    <strong>Datos Operativos del Programa:</strong> Token QR personal, historial de
                    compras registradas en mostrador, movimientos de puntos y canjes de beneficios.
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  3. Finalidad del Tratamiento y Confidencialidad
                </h3>
                <p>
                  Los datos personales se utilizan exclusivamente para: (a) identificar al socio en
                  mostrador mediante su código QR; (b) calcular, acreditar y auditar puntos y
                  beneficios; (c) prevenir usos fraudulentos; y (d) enviar notificaciones vinculadas
                  a puntos, cumpleaños, beneficios y novedades de la farmacia cuando el socio así lo
                  autorice. <strong>{settings.clubSubtitle}</strong> no vende, alquila ni cede bajo
                  ningún título las bases de datos de sus clientes a terceros. No se almacenan ni
                  publican en esta plataforma historias clínicas, recetas médicas ni diagnósticos de
                  salud.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  4. Seguridad Técnica y Resguardo
                </h3>
                <p>
                  La información se almacena en bases de datos protegidas con cifrado en tránsito
                  (HTTPS/TLS), autenticación mediante tokens firmados (JWT) y políticas de seguridad
                  a nivel de fila (Row Level Security — RLS), garantizando que cada cliente solo
                  pueda visualizar sus propios registros y que las operaciones de puntos solo puedan
                  ejecutarse mediante transacciones verificadas.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  5. Derechos de Acceso, Rectificación y Supresión (Habeas Data)
                </h3>
                <p>
                  El titular de los datos personales tiene la facultad de ejercer el derecho de
                  acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses,
                  salvo que se acredite un interés legítimo al efecto conforme lo establecido en el
                  artículo 14, inciso 3 de la Ley N° 25.326. Asimismo, podrá solicitar en cualquier
                  momento la actualización, rectificación o la baja y supresión de su cuenta
                  comunicándose a través del canal oficial ({settings.whatsappContact}) o
                  presencialmente en {settings.address}.
                </p>
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 mt-2">
                  <strong>Aviso Oficial Ley N° 25.326 (Resolución AAIP):</strong> "LA AGENCIA DE
                  ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N°
                  25.326, tiene la atribución de atender las denuncias y reclamos que interpongan
                  quienes resulten afectados en sus derechos por incumplimiento de las normas
                  vigentes en materia de protección de datos personales."
                </div>
              </section>
            </div>
          )}

          {activeTab === 'aviso-legal' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 flex items-start gap-2.5">
                <HeartPulse className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Aviso Legal Regulatorio de Farmacia y Defensa del Consumidor
                  </p>
                  <p className="text-[11px] text-amber-900/90 mt-0.5">
                    Información sanitaria obligatoria (Ley N° 17.565 / ANMAT) y derechos del
                    consumidor (Ley N° 24.240).
                  </p>
                </div>
              </div>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  1. Aviso Sanitario y Ejercicio Profesional Farmacéutico
                </h3>
                <p>
                  En cumplimiento de la Ley Nacional de Farmacias N° 17.565, las normativas
                  sanitarias de la Provincia de Córdoba y las disposiciones de la{' '}
                  <strong>ANMAT</strong> (Administración Nacional de Medicamentos, Alimentos y
                  Tecnología Médica), se deja expresa constancia de que:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Esta aplicación web corresponde exclusivamente al programa de fidelización
                    comercial, perfumería, dermocosmética, higiene y cuidado personal de{' '}
                    <strong>{settings.clubSubtitle}</strong>.
                  </li>
                  <li>
                    <strong>No se realiza comercio electrónico ni venta online de medicamentos:</strong>{' '}
                    La aplicación no comercializa, no prescribe ni realiza envíos de especialidades
                    medicinales. Toda dispensa farmacéutica se efectúa única y exclusivamente de
                    forma presencial en el mostrador de la farmacia habilitada bajo la supervisión
                    de profesionales farmacéuticos matriculados.
                  </li>
                  <li>
                    <strong>Responsabilidad Médica y No Automedicación:</strong> Los contenidos,
                    novedades, eventos de diagnóstico dermo-facial y descripciones de productos
                    cosméticos o de cuidado personal publicados en la plataforma tienen carácter
                    meramente informativo y en ningún caso sustituyen el consejo, diagnóstico o
                    tratamiento médico o dermatológico profesional. Ante cualquier duda, consulte a
                    su médico y/o farmacéutico.
                  </li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  2. Defensa del Consumidor (Ley N° 24.240)
                </h3>
                <p>
                  Las promociones, multiplicadores de puntos y beneficios exhibidos en la aplicación
                  informan de manera clara sus condiciones de vigencia, categoría alcanzada, monto
                  mínimo requerido y topes o cupos disponibles conforme al artículo 4° de la Ley N°
                  24.240 de Defensa del Consumidor y el artículo 1100 del Código Civil y Comercial
                  de la Nación. Las imágenes de los beneficios son de carácter ilustrativo.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  3. Propiedad Intelectual y Uso de Marca
                </h3>
                <p>
                  La denominación <strong>{settings.clubName}</strong>, el nombre comercial{' '}
                  <strong>{settings.clubSubtitle}</strong>, su logotipo institucional, diseño visual
                  y código fuente se encuentran protegidos por la Ley N° 11.723 de Propiedad
                  Intelectual y la Ley N° 22.362 de Marcas y Designaciones. Queda prohibida su
                  reproducción, modificación o uso no autorizado.
                </p>
              </section>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Building2 className="w-4 h-4 text-emerald-800 shrink-0" />
                  <span>Datos Institucionales de Atención al Socio</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  • <strong>Establecimiento:</strong> {settings.clubSubtitle} ({settings.clubName})
                  <br />• <strong>Dirección:</strong> {settings.address}
                  <br />• <strong>Horarios de atención:</strong> {settings.openingHours}
                  <br />• <strong>Contacto / WhatsApp:</strong> {settings.whatsappContact}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              © {currentYear} {settings.clubSubtitle} — Documentación legal vigente en la República
              Argentina.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold transition cursor-pointer"
          >
            Entendido y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
