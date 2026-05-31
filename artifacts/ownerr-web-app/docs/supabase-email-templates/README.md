# Supabase auth email templates (Ownerr)

Branded HTML for **Supabase Auth → Email**. Copy each file’s HTML into the matching template in the Dashboard. Emails are sent by **Supabase** through your **Resend SMTP** settings—not by the Vite app.

## Where to configure everything

| What                           | Where in Supabase                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Email templates (HTML)**     | [Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Email Templates**                                  |
| **SMTP (Resend)**              | **Project Settings** → **Authentication** → **SMTP Settings** (or **Authentication** → **Emails** depending on UI version)             |
| **Sender name / from address** | Same SMTP / email section (e.g. `Ownerr Intelligence`, `Intelligence@ownerr.live`)                                                     |
| **Confirm email, magic links** | **Authentication** → **Providers** → **Email**                                                                                         |
| **Email OTP (6-digit codes)**  | **Authentication** → **Providers** → **Email** → **Email OTP** — **leave OFF** for Ownerr (app uses password, Google, magic link only) |
| **Redirect allow list**        | **Authentication** → **URL Configuration** → **Redirect URLs**                                                                         |

Project URL (this repo): `https://bnzvpkgffeappfxatuyu.supabase.co`

### Template name → file in this folder

| Supabase template (UI label)                      | File                    | Variables                                   |
| ------------------------------------------------- | ----------------------- | ------------------------------------------- |
| Confirm signup                                    | `confirm-signup.html`   | `{{ .ConfirmationURL }}`                    |
| Invite user                                       | `invite-user.html`      | `{{ .ConfirmationURL }}`                    |
| Magic link                                        | `magic-link.html`       | `{{ .ConfirmationURL }}`                    |
| Change email address                              | `change-email.html`     | `{{ .NewEmail }}`, `{{ .ConfirmationURL }}` |
| Reset password                                    | `reset-password.html`   | `{{ .ConfirmationURL }}`                    |
| Reauthentication                                  | `reauthentication.html` | `{{ .Token }}`                              |
| Email OTP / One-time password / Verification code | `email-otp.html`        | `{{ .Token }}`                              |

If you do not see **Email OTP** in Providers, the **email-otp.html** template may still appear under Email Templates for customization; it is only used when **Email OTP** is enabled and something in Auth requests a code. The Ownerr web app does **not** collect codes in the UI.

### Logo URL for emails

Many clients block SVG. Templates use a JPG served from production:

`https://ownerr.live/opengraph.jpg`

After deploy, open that URL in a browser to confirm it loads. To use another asset, upload PNG/JPG to **Storage** (public bucket) or your CDN and replace the `src` in each HTML file.

### Redirect URLs to allow (production + local)

Add every origin/path your app uses, for example:

- `https://ownerr.live/auth/confirm`
- `https://ownerr.live/auth/reset-password`
- Product OAuth / magic link callbacks (e.g. `https://ownerr.live/products/marketplace/auth/callback`, marketplace portal callback, etc.)
- `http://localhost:5173/...` equivalents for local dev

See `docs/AUTH_IMPLEMENTATION_REPORT.md` for app auth flows.

### Suggested subject lines

| Template         | Subject                         |
| ---------------- | ------------------------------- |
| Confirm signup   | Confirm your email — Ownerr     |
| Invite user      | You're invited to Ownerr        |
| Magic link       | Your sign-in link — Ownerr      |
| Change email     | Confirm your new email — Ownerr |
| Reset password   | Reset your password — Ownerr    |
| Reauthentication | Your verification code — Ownerr |
| Email OTP        | Your verification code — Ownerr |
