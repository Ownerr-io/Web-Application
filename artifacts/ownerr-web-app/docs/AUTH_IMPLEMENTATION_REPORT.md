# Auth implementation report (Ownerr web app)

Last updated after **removal of email OTP (6-digit code) flows**. Email delivery remains **Supabase Auth → Resend SMTP**. The frontend calls Supabase Auth only (`signUp`, `signInWithPassword`, `signInWithOtp` with `emailRedirectTo` for magic links, `signInWithOAuth`, `resetPasswordForEmail`, `updateUser`, `resend`).

## Supported authentication methods

| Method                     | API / flow                                                          |
| -------------------------- | ------------------------------------------------------------------- |
| Email + password sign-up   | `signUp` → confirm email link                                       |
| Email + password sign-in   | `signInWithPassword`                                                |
| Google OAuth               | `signInWithOAuth` → product callback                                |
| Email magic link (sign-in) | `signInWithOtp` + **required** `emailRedirectTo` → product callback |
| Password reset             | `resetPasswordForEmail` → `/auth/reset-password`                    |
| Resend signup confirmation | `resend({ type: 'signup' })` → `/auth/confirm`                      |
| Reauthentication (OTP)     | `reauthenticate()` → email code → `updateUser({ password, nonce })` |

## Removed (login)

| Item                          | Notes                                                 |
| ----------------------------- | ----------------------------------------------------- |
| 6-digit email OTP **sign-in** | No login “Email code” tab; magic link + password only |

## Reauthentication (OTP)

Used for **step-up** while logged in (e.g. change password when Supabase requires it).

- **UI:** `ReauthOtpPanel`, `AccountChangePasswordSection` on product profiles, `/auth/reauthenticate?returnTo=`
- **API:** `lib/auth/reauthenticate.ts` (`POST /auth/v1/reauthenticate` fallback if client has no `reauthenticate()`)
- **Dashboard:** Authentication → Email Templates → **Reauthentication** (paste `docs/supabase-email-templates/reauthentication.html`); enable **Email OTP** for token delivery if required by your project

## Removed (legacy login OTP)

| Item                | Notes                |
| ------------------- | -------------------- |
| `EmailOtpAuthPanel` | Deleted              |
| Login OTP tab       | Not used for sign-in |

## Key routes

- `/auth/reauthenticate` — OTP step-up (`?returnTo=` optional)

- Product OAuth / magic link callback: per-product `…/auth/callback` (see `buildProductAuthCallbackUrl`)
- `/auth/confirm` — signup confirmation links
- `/auth/verify-email` — post-signup “check your inbox”
- `/auth/reset-password` — password reset from email link

## Key files

- `src/context/AuthContext.tsx` — `signInWithMagicLink`, password, Google, reset, resend
- `src/components/auth/ProductAuthScreen.tsx` — password form, Google, magic link button
- `src/lib/auth/productAuthCallbackUrl.ts` — callback URL for OAuth and magic links
- `src/lib/auth/validation.ts` — email and password rules
- `src/lib/auth/authErrors.ts` — user-facing Supabase error mapping
- `src/lib/auth/completeProductAuth.ts` — post-session navigation

## Supabase Dashboard settings

**Enable**

- Email provider, **Confirm email**, **Magic Links**, **Google OAuth**
- Resend SMTP (or configured SMTP)
- Redirect URLs: all product auth callbacks, `/auth/confirm`, `/auth/reset-password`, local dev origins

**Disable**

- Email OTP for **sign-in** (no login code tab in the app)

**Enable for reauth**

- **Reauthentication** email template with `{{ .Token }}`
- If codes are not sent, turn on **Email OTP** in Providers (reauth uses token emails; login UI still does not use OTP)

**Templates**

- Branded HTML copies: `docs/supabase-email-templates/` (paste into Dashboard → **Authentication** → **Email Templates**; see that folder’s `README.md`).
- Confirm signup: `{{ .ConfirmationURL }}`
- Magic link: link with redirect to allowlisted callback
- Reset password: recovery link to `/auth/reset-password`
- Email OTP (`{{ .Token }}`): customize in Dashboard if needed; keep **Email OTP** provider **OFF** unless you re-enable code sign-in in the app

## Manual test checklist

1. Marketplace sign-in: password → app entry.
2. Sign-in → **Send email magic link** → email link → callback → app entry.
3. Sign-up → confirm link → `/auth/confirm` → sign in with password.
4. Forgot password → reset email → set new password on `/auth/reset-password`.
5. Google sign-in → callback → app entry (or `/admin` for platform admins).
