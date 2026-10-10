import express, { Request, Response, NextFunction } from 'express';
import {
  VerifiedAuthContext,
  verifySupabaseBearerToken,
  getServerSupabaseConfig,
} from '../middleware/auth.ts';
import {
  adjustPointsAdminInSupabase,
  applyReferralCodeInSupabase,
  claimBirthdayBonusInSupabase,
  createCampaignAdminInSupabase,
  getBootstrapStateFromSupabase,
  getPublicCatalogFromSupabase,
  markNotificationsReadInSupabase,
  previewPointsForStaffInSupabase,
  redeemBenefitInSupabase,
  registerPurchaseForStaffInSupabase,
  updateMyProfileInSupabase,
  updateSettingsAdminInSupabase,
  updateUserRoleStatusAdminInSupabase,
  upsertBenefitAdminInSupabase,
  upsertNewsAdminInSupabase,
  upsertPromotionAdminInSupabase,
  validateQrForStaffInSupabase,
  validateRedemptionForStaffInSupabase,
  voidPurchaseAdminInSupabase,
} from '../db/repository.ts';
import {
  previewAdjustPointsAdmin,
  previewApplyReferralCode,
  previewCalculatePoints,
  previewClaimBirthdayBonus,
  previewCreateCampaignAdmin,
  previewGetBootstrapState,
  previewGetPublicCatalog,
  previewMarkNotificationsRead,
  previewRedeemBenefit,
  previewRegisterPurchase,
  previewSignInWithGoogle,
  previewUpdateMyProfile,
  previewUpdateSettingsAdmin,
  previewUpdateUserRoleStatusAdmin,
  previewUpsertBenefitAdmin,
  previewUpsertNewsAdmin,
  previewUpsertPromotionAdmin,
  previewValidateQrForStaff,
  previewValidateRedemptionForStaff,
  previewVoidPurchaseAdmin,
  verifyPreviewSessionToken,
} from '../db/previewEngine.ts';
import { BASE_PESOS_PER_POINT } from '../constants/index.ts';
import { UserProfile } from '../types/index.ts';

export const apiApp = express();
apiApp.use(express.json({ limit: '10mb' }));

interface AuthenticatedRequest extends Request {
  auth?: VerifiedAuthContext;
  previewActor?: UserProfile;
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const cfg = getServerSupabaseConfig();
  const authHeader = req.headers.authorization || '';
  const isPreviewToken = !process.env.VERCEL && authHeader.startsWith('Bearer mnd_prev_');

  try {
    if (isPreviewToken) {
      req.previewActor = verifyPreviewSessionToken(authHeader);
    } else if (cfg.isConfigured) {
      req.auth = await verifySupabaseBearerToken(authHeader);
    } else {
      req.previewActor = verifyPreviewSessionToken(authHeader);
    }
    next();
  } catch (err: any) {
    res.status(401).json({
      error: err?.message || 'No autorizado. Iniciá sesión con Google.',
    });
  }
}

// OAuth Popup Callback Handler for iframe environments (Google AI Studio preview)
const oauthPopupCallbackHandler = (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Autenticando con Google — Mondino Club</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #f8faf9; color: #0f172a; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px 32px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); max-width: 380px; }
      .title { font-weight: 700; font-size: 16px; color: #065f46; margin-bottom: 8px; }
      .sub { font-size: 13px; color: #475569; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title">Conectando con Mondino Club...</div>
      <div class="sub">Esta ventana se cerrará automáticamente en un instante.</div>
    </div>
    <script>
      (function() {
        try {
          if (window.opener && window.opener !== window) {
            window.opener.postMessage({
              type: 'MONDINO_OAUTH_CALLBACK',
              hash: window.location.hash || '',
              search: window.location.search || ''
            }, '*');
            setTimeout(function() { window.close(); }, 150);
          } else {
            window.location.replace('/' + (window.location.search || '') + (window.location.hash || ''));
          }
        } catch (e) {
          window.location.replace('/');
        }
      })();
    </script>
  </body>
</html>`);
};

apiApp.get(['/auth/callback', '/auth/callback/', '/api/auth/callback'], oauthPopupCallbackHandler);

// Health & rule verification endpoint
apiApp.get('/api/health', (_req, res) => {
  const cfg = getServerSupabaseConfig();
  res.json({
    ok: true,
    service: 'Mondino Club API',
    baseRuleLocked: `$${BASE_PESOS_PER_POINT} ARS = 1 punto`,
    supabaseConfigured: cfg.isConfigured,
  });
});

// Google session endpoint for AI Studio Preview environment (when testing inside iframe)
apiApp.post('/api/auth/google-session', (req, res) => {
  try {
    const email = req.body?.email ? String(req.body.email) : undefined;
    const session = previewSignInWithGoogle(email);
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Error al iniciar sesión.' });
  }
});

// Public catalog (no auth required)
apiApp.get('/api/public/catalog', async (_req, res) => {
  const cfg = getServerSupabaseConfig();
  try {
    if (cfg.isConfigured) {
      const catalog = await getPublicCatalogFromSupabase();
      res.json(catalog);
    } else {
      res.json(previewGetPublicCatalog());
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al cargar catálogo público.' });
  }
});

// Authenticated bootstrap state
apiApp.get('/api/bootstrap', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.auth) {
      const state = await getBootstrapStateFromSupabase(req.auth);
      res.json(state);
    } else {
      res.json(previewGetBootstrapState(req.previewActor!));
    }
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Error al sincronizar el estado de la cuenta.' });
  }
});

// Update own customer profile (only allowed fields)
apiApp.put('/api/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = req.auth
      ? await updateMyProfileInSupabase(req.auth, req.body || {})
      : previewUpdateMyProfile(req.previewActor!, req.body || {});
    res.json({ profile });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Error al actualizar el perfil.' });
  }
});

// Claim annual birthday bonus
apiApp.post(
  '/api/profile/birthday-bonus',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = req.auth
        ? await claimBirthdayBonusInSupabase(req.auth)
        : previewClaimBirthdayBonus(req.previewActor!);
      res.json(result);
    } catch (err: any) {
      res
        .status(400)
        .json({ error: err?.message || 'No se pudo acreditar el bonus de cumpleaños.' });
    }
  }
);

// Apply friend referral code
apiApp.post('/api/profile/referral', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const code = String(req.body?.code || '');
    const result = req.auth
      ? await applyReferralCodeInSupabase(req.auth, code)
      : previewApplyReferralCode(req.previewActor!, code);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'No se pudo aplicar el código de referido.' });
  }
});

// Mark own notifications as read
apiApp.post('/api/notifications/read', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.auth) {
      await markNotificationsReadInSupabase(req.auth);
    } else {
      previewMarkNotificationsRead(req.previewActor!);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Error al actualizar notificaciones.' });
  }
});

// Atomic benefit redemption
apiApp.post('/api/redemptions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const benefitId = String(req.body?.benefitId || '');
    const idempotencyKey = String(req.body?.idempotencyKey || '');
    const result = req.auth
      ? await redeemBenefitInSupabase(req.auth, benefitId, idempotencyKey)
      : previewRedeemBenefit(req.previewActor!, benefitId, idempotencyKey);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'No se pudo realizar el canje.' });
  }
});

// Staff: Validate customer QR or email at pharmacy counter
apiApp.post('/api/staff/validate-qr', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const qrToken = String(req.body?.qrToken || '');
    const result = req.auth
      ? await validateQrForStaffInSupabase(req.auth, qrToken)
      : previewValidateQrForStaff(req.previewActor!, qrToken);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Error al validar el código QR.' });
  }
});

// Staff: Preview points calculation on backend ($1.000 = 1 point + active promo)
apiApp.post(
  '/api/staff/preview-points',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const payload = {
        amount: Number(req.body?.amount),
        category: String(req.body?.category || 'Perfumería'),
        promotionId: req.body?.promotionId ? String(req.body.promotionId) : undefined,
      };
      const preview = req.auth
        ? await previewPointsForStaffInSupabase(req.auth, payload)
        : previewCalculatePoints(payload);
      res.json(preview);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Error al calcular puntos.' });
    }
  }
);

// Staff: Register verified purchase atomically with idempotency key
apiApp.post(
  '/api/staff/register-purchase',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const payload = {
        idempotencyKey: String(req.body?.idempotencyKey || ''),
        customerId: String(req.body?.customerId || ''),
        amount: Number(req.body?.amount),
        category: String(req.body?.category || 'Perfumería'),
        promotionId: req.body?.promotionId ? String(req.body.promotionId) : undefined,
        notes: req.body?.notes ? String(req.body.notes) : '',
      };
      const result = req.auth
        ? await registerPurchaseForStaffInSupabase(req.auth, payload)
        : previewRegisterPurchase(req.previewActor!, payload);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'No se pudo registrar la compra.' });
    }
  }
);

// Staff: Validate redemption code at counter (prevents double use)
apiApp.post(
  '/api/staff/validate-redemption',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const code = String(req.body?.redemptionCode || '');
      const redemption = req.auth
        ? await validateRedemptionForStaffInSupabase(req.auth, code)
        : previewValidateRedemptionForStaff(req.previewActor!, code);
      res.json({ redemption });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'No se pudo validar el código de canje.' });
    }
  }
);

// Admin: Manual points adjustment with mandatory audit reason
apiApp.post(
  '/api/admin/adjust-points',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const payload = {
        customerId: String(req.body?.customerId || ''),
        pointsDelta: Number(req.body?.pointsDelta),
        reason: String(req.body?.reason || ''),
      };
      const result = req.auth
        ? await adjustPointsAdminInSupabase(req.auth, payload)
        : previewAdjustPointsAdmin(req.previewActor!, payload);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'No se pudo realizar el ajuste de puntos.' });
    }
  }
);

// Admin: Void purchase and revert points atomically
apiApp.post(
  '/api/admin/void-purchase',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const payload = {
        purchaseId: String(req.body?.purchaseId || ''),
        reason: String(req.body?.reason || ''),
      };
      const result = req.auth
        ? await voidPurchaseAdminInSupabase(req.auth, payload)
        : previewVoidPurchaseAdmin(req.previewActor!, payload);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'No se pudo anular la compra.' });
    }
  }
);

// Admin: Update user role / status / employee authorization
apiApp.post(
  '/api/admin/user-role-status',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const profile = req.auth
        ? await updateUserRoleStatusAdminInSupabase(req.auth, req.body || {})
        : previewUpdateUserRoleStatusAdmin(req.previewActor!, req.body || {});
      res.json({ profile });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'No se pudo actualizar el usuario.' });
    }
  }
);

// Admin: Upsert promotion
apiApp.post('/api/admin/promotions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const promotion = req.auth
      ? await upsertPromotionAdminInSupabase(req.auth, req.body || {})
      : previewUpsertPromotionAdmin(req.previewActor!, req.body || {});
    res.json({ promotion });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'No se pudo guardar la promoción.' });
  }
});

// Admin: Upsert benefit
apiApp.post('/api/admin/benefits', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const benefit = req.auth
      ? await upsertBenefitAdminInSupabase(req.auth, req.body || {})
      : previewUpsertBenefitAdmin(req.previewActor!, req.body || {});
    res.json({ benefit });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'No se pudo guardar el beneficio.' });
  }
});

// Admin: Upsert news
apiApp.post('/api/admin/news', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const news = req.auth
      ? await upsertNewsAdminInSupabase(req.auth, req.body || {})
      : previewUpsertNewsAdmin(req.previewActor!, req.body || {});
    res.json({ news });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'No se pudo guardar la novedad.' });
  }
});

// Admin: Create segmented campaign
apiApp.post('/api/admin/campaigns', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const campaign = req.auth
      ? await createCampaignAdminInSupabase(req.auth, req.body || {})
      : previewCreateCampaignAdmin(req.previewActor!, req.body || {});
    res.json({ campaign });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'No se pudo crear la campaña.' });
  }
});

// Admin: Update global settings (base rate $1.000 = 1 point remains locked)
apiApp.put('/api/admin/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const settings = req.auth
      ? await updateSettingsAdminInSupabase(req.auth, req.body || {})
      : previewUpdateSettingsAdmin(req.previewActor!, req.body || {});
    res.json({ settings });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'No se pudo actualizar la configuración.' });
  }
});
