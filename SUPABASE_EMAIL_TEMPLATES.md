# Supabase Email Templates

Go to: **Supabase Dashboard → Authentication → Email Templates**

- Templates 1 & 2 use `{{ .Token }}` for OTP codes.
- Template 3 uses `{{ .ConfirmationURL }}` — Supabase's built-in password reset link.

---

## 1. Confirm signup (OTP)

**Subject:** `Your Society Helper verification code`

```html
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="400" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#7c3aed;padding:32px;text-align:center;">
            <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 16px;line-height:48px;">
              <span style="color:#fff;font-weight:900;font-size:18px;">SH</span>
            </div>
            <p style="margin:0;color:rgba(255,255,255,0.8);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Society Helper</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:900;">Verify your email</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">Use the code below to complete sign up. Expires in 10 minutes.</p>
            <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;">Your code</p>
              <p style="margin:0;font-size:36px;font-weight:900;letter-spacing:.3em;color:#4f46e5;">{{ .Token }}</p>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px;">If you didn't request this, ignore this email.</p>
          </td>
        </tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;"><p style="margin:0;color:#cbd5e1;font-size:11px;">Society Helper · Connecting residents and helpers</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 2. Magic link / Sign in with OTP

**Subject:** `Your Society Helper sign-in code`

```html
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="400" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#7c3aed;padding:32px;text-align:center;">
            <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 16px;line-height:48px;">
              <span style="color:#fff;font-weight:900;font-size:18px;">SH</span>
            </div>
            <p style="margin:0;color:rgba(255,255,255,0.8);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Society Helper</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:900;">Sign-in code</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">Use this code to sign in. Expires in 10 minutes.</p>
            <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;">Sign-in code</p>
              <p style="margin:0;font-size:36px;font-weight:900;letter-spacing:.3em;color:#4f46e5;">{{ .Token }}</p>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px;">Didn't try to sign in? Ignore this — your account is safe.</p>
          </td>
        </tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;"><p style="margin:0;color:#cbd5e1;font-size:11px;">Society Helper · Connecting residents and helpers</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 3. Reset Password

> Uses Supabase's **Reset Password** template slot.
> The `{{ .ConfirmationURL }}` variable is a one-click secure link — no code to copy.

**Subject:** `Reset your Society Helper password`

```html
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="400" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:32px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Society Helper · Security</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:900;">Reset your password</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
              We received a request to reset the password for your account. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
            </p>

            <div style="text-align:center;margin-bottom:24px;">
              <a href="{{ .ConfirmationURL }}"
                style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;letter-spacing:-0.2px;">
                Reset password →
              </a>
            </div>

            <p style="margin:0 0 12px;color:#94a3b8;font-size:12px;line-height:1.6;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 16px;font-size:11px;color:#94a3b8;word-break:break-all;">
              {{ .ConfirmationURL }}
            </p>

            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;">
              <p style="margin:0;color:#991b1b;font-size:12px;line-height:1.5;">
                ⚠️ If you didn't request a password reset, ignore this email — your account is safe.
              </p>
            </div>
          </td>
        </tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;"><p style="margin:0;color:#cbd5e1;font-size:11px;">Society Helper · Connecting residents and helpers</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```
