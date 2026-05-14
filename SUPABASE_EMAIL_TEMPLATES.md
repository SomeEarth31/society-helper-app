# Supabase Email Templates

Copy each template into **Supabase Dashboard → Authentication → Email Templates**.

Supabase variables used:
- `{{ .Token }}` — the OTP / magic-link token
- `{{ .ConfirmationURL }}` — full URL for magic-link flow
- `{{ .Email }}` — recipient's email address
- `{{ .SiteURL }}` — your site's base URL (set in Auth settings)

---

## 1. Confirm signup / OTP (paste into "Confirm signup" AND "Magic link")

Subject: `Your Society Helper verification code`

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Society Helper — Verify Your Email</title>
</head>
<body style="margin:0;padding:0;background:#F5F3FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6D28D9,#7C3AED);padding:32px 32px 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.2);border-radius:14px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                    <span style="color:#ffffff;font-weight:700;font-size:14px;letter-spacing:-0.5px;">SH</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="color:rgba(255,255,255,0.85);font-size:14px;font-weight:500;">Society Helper</span>
                  </td>
                </tr>
              </table>
              <p style="color:#ffffff;font-size:22px;font-weight:700;margin:20px 0 4px;">Verify Your Email</p>
              <p style="color:rgba(221,214,254,0.9);font-size:14px;margin:0;">Use the code below to continue</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6;">
                Hi there! Here's your one-time verification code for
                <strong style="color:#1E293B;">{{ .Email }}</strong>:
              </p>

              <!-- OTP block -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#F5F3FF;border-radius:16px;padding:24px;">
                    <p style="color:#6D28D9;font-size:40px;font-weight:800;letter-spacing:0.25em;margin:0;line-height:1;">
                      {{ .Token }}
                    </p>
                    <p style="color:#94A3B8;font-size:12px;margin:10px 0 0;">
                      Valid for 10 minutes · Do not share this code
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color:#94A3B8;font-size:12px;margin:28px 0 0;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.
                Your account will not be affected.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 32px;">
              <p style="color:#CBD5E1;font-size:11px;margin:0;text-align:center;">
                Society Helper · Helping societies manage domestic help
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>

---

## 2. Magic link (paste into "Magic link" template if you keep it separate)

Subject: `Sign in to Society Helper`


<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Society Helper — Sign in</title>
</head>
<body style="margin:0;padding:0;background:#F5F3FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6D28D9,#7C3AED);padding:32px 32px 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.2);border-radius:14px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                    <span style="color:#ffffff;font-weight:700;font-size:14px;letter-spacing:-0.5px;">SH</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="color:rgba(255,255,255,0.85);font-size:14px;font-weight:500;">Society Helper</span>
                  </td>
                </tr>
              </table>
              <p style="color:#ffffff;font-size:22px;font-weight:700;margin:20px 0 4px;">Sign In to Your Account</p>
              <p style="color:rgba(221,214,254,0.9);font-size:14px;margin:0;">Use the code below to continue</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#475569;font-size:14px;margin:0 0 24px;line-height:1.6;">
                Hi there! Here's your one-time verification code for
                <strong style="color:#1E293B;">{{ .Email }}</strong>:
              </p>

              <!-- OTP block -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#F5F3FF;border-radius:16px;padding:24px;">
                    <p style="color:#6D28D9;font-size:40px;font-weight:800;letter-spacing:0.25em;margin:0;line-height:1;">
                      {{ .Token }}
                    </p>
                    <p style="color:#94A3B8;font-size:12px;margin:10px 0 0;">
                      Valid for 10 minutes · Do not share this code
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color:#94A3B8;font-size:12px;margin:28px 0 0;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.
                Your account will not be affected.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 32px;">
              <p style="color:#CBD5E1;font-size:11px;margin:0;text-align:center;">
                Society Helper · Helping societies manage domestic help
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>

---
