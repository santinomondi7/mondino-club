# Mondino Club — Farmacia y Perfumería Mondino

Sistema integral de fidelización, puntos por compras, códigos QR personales, beneficios, promociones y gestión administrativa para **Farmacia y Perfumería Mondino**.

---

## 1. Arquitectura Unificada

* **Frontend**: React 19 + TypeScript + Tailwind CSS + Vite (PWA instalable en dispositivos móviles y escritorio).
* **Autenticación**: **Supabase Auth** con inicio de sesión mediante **Google OAuth**.
* **Base de Datos**: **Supabase PostgreSQL** con políticas **Row Level Security (RLS)**, permisos de columna restringidos y funciones transaccionales atómicas (`SECURITY DEFINER` con `search_path = public`).
* **Backend / API**:
  * En producción (Vercel): Función Serverless en `/api/index.ts` configurada mediante `vercel.json` que expone todas las rutas `/api/*`.
  * En desarrollo local / contenedor: Servidor Express (`server.ts`) montando el mismo router `/src/server/apiApp.ts` junto con Vite en el puerto `3000`.
  * Resiliencia: El cliente `/src/services/api.ts` se comunica con `/api/*` enviando el token `Bearer <access_token>` de Supabase Auth y cuenta con respaldo directo hacia las RPCs/RLS de Supabase PostgreSQL.

---

## 2. Regla Base Permanente de Puntos

La regla base del programa es **permanente, exacta e inmodificable** incluso para los administradores:

$$\text{\$100 ARS gastados} = \text{1 punto Mondino}$$

$$\text{Puntos Base} = \left\lfloor \frac{\text{Monto de Compra en ARS}}{100} \right\rfloor$$

* **$1.000** = 10 puntos base.
* **$10.000** = 100 puntos base.
* **$50.000** = 500 puntos base.
* **$100.000** = 1.000 puntos base.

La función SQL `public.calculate_purchase_points` y el módulo `src/utils/points.ts` aplican esta constante fija (`100`) y suman las promociones activas configuradas (multiplicadores, puntos extra o descuentos) que cumplan con vigencia, categoría, monto mínimo, día de la semana y medio de pago.

---

## 3. Seguridad y Row Level Security (RLS)

Toda la seguridad está implementada en `/supabase/migrations/001_mondino_club_schema_rls_rpc.sql`:

1. **Bloqueo de Escalada de Privilegios y Saldo**:
   * El registro normal (`ensure_my_profile` y el trigger `handle_new_auth_user`) asigna siempre `role = 'CLIENTE'` y `points_balance = welcome_bonus_points`.
   * Se revocó el permiso de `INSERT` y `UPDATE` general sobre `public.profiles` para `authenticated` y `anon`, otorgando `UPDATE` únicamente sobre las columnas de datos personales (`full_name`, `dni`, `phone`, `birth_date`, `pref_categories`, `opt_in_promos`, `opt_in_points_alerts`, `opt_in_birthday`, `updated_at`).
   * Además, el trigger `trg_protect_profile_sensitive_columns` bloquea a nivel de fila cualquier intento de modificar `role`, `status`, `points_balance`, `qr_token`, `referral_code`, `referral_reward_granted` o `last_birthday_bonus_year` fuera de las funciones transaccionales autorizadas.
2. **Operaciones Atómicas e Idempotentes**:
   * **Registro de compras (`register_purchase_atomic`)**: Exclusivo para `EMPLEADO` o `ADMINISTRADOR` con estado `ACTIVO`. Bloquea la fila del cliente (`FOR UPDATE`), verifica `idempotency_key` única, calcula puntos base (`floor(amount / 100)`) y promociones en la base de datos, inserta la compra, registra asientos en `points_transactions`, actualiza `points_balance`, notifica al cliente y guarda auditoría en una sola transacción.
   * **Anulación de compras (`void_purchase_atomic`)**: Exclusiva para `EMPLEADO` o `ADMINISTRADOR`. Revierte exactamente los puntos otorgados y registra el asiento de `ANULACION_COMPRA` y el log de auditoría.
   * **Canje de beneficios (`redeem_benefit_atomic`)**: Bloquea perfil y beneficio (`FOR UPDATE`), verifica vigencia, stock, límite por cliente y saldo suficiente, descuenta stock y puntos, genera un código único `MC-XXXXXX` y crea el movimiento en el libro mayor.
   * **Validación de canjes en mostrador (`validate_redemption_code_atomic`)**: Exclusiva para personal autorizado; impide que un código sea utilizado más de una vez.

---

## 4. Configuración Paso a Paso (Supabase + Google OAuth + Vercel)

### Paso 1: Crear proyecto en Supabase y ejecutar migraciones
1. Creá un proyecto en [Supabase](https://supabase.com).
2. Abrí el **SQL Editor** en el panel de Supabase y ejecutá en orden:
   * `supabase/migrations/001_mondino_club_schema_rls_rpc.sql`
   * `supabase/migrations/002_mondino_club_initial_catalog.sql`

### Paso 2: Habilitar Google OAuth en Supabase Auth
1. En Google Cloud Console, creá un cliente OAuth 2.0 (Aplicación Web) y agregá la URL de callback de tu proyecto Supabase:
   * `https://<tu-proyecto>.supabase.co/auth/v1/callback`
2. En el panel de Supabase → **Authentication → Providers → Google**, activá Google e ingresá el `Client ID` y `Client Secret`.
3. En **Authentication → URL Configuration**:
   * Configurá **Site URL** con la URL de tu aplicación (ej. `https://mondino-club.vercel.app` o `http://localhost:3000`).
   * Agregá en **Redirect URLs**:
     * `http://localhost:3000/**`
     * `https://<tu-dominio-en-vercel>.vercel.app/**`

### Paso 3: Configurar el Primer Administrador (Procedimiento Seguro)
No existen contraseñas universales ni cuentas administrativas públicas. Para promover tu cuenta a `ADMINISTRADOR`:
1. Iniciá sesión normalmente en la aplicación con tu cuenta de Google (se creará tu perfil con rol `CLIENTE`).
2. Abrí el **SQL Editor** de Supabase (con rol `postgres`) y ejecutá:
   ```sql
   SELECT public.bootstrap_promote_admin('tu-correo@dominio.com');
   ```
3. Recargá la aplicación: tendrás acceso inmediato al **Panel Administrativo** y desde allí podrás gestionar empleados, promociones, beneficios, novedades y campañas.

### Paso 4: Variables de Entorno en Local y en Vercel
Copiá `.env.example` a `.env` y configurá las siguientes variables (tanto en local como en **Vercel → Project Settings → Environment Variables**):

* `VITE_SUPABASE_URL`: URL de tu proyecto Supabase (`https://xyz.supabase.co`).
* `VITE_SUPABASE_ANON_KEY`: Clave pública `anon` de tu proyecto Supabase.
* `SUPABASE_URL`: Misma URL de tu proyecto Supabase (para las rutas `/api/*` en Vercel Serverless).
* `SUPABASE_ANON_KEY`: Misma clave `anon` de tu proyecto Supabase.

### Paso 5: Ejecución y Compilación
* **Desarrollo local**:
  ```bash
  npm install
  npm run dev
  ```
* **Verificación de tipos y compilación de producción**:
  ```bash
  npm run lint
  npm run build
  ```
