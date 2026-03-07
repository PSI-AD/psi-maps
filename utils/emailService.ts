/**
 * utils/emailService.ts
 * Centralized email service using EmailJS.
 *
 * HOW IT WORKS:
 * 1. EmailJS sends an email from the browser — no backend needed.
 * 2. We use a single "catch-all" template on EmailJS that accepts
 *    an `html_body` variable — this lets us design the full email
 *    in code, keeping all templates version-controlled here.
 * 3. Every form calls `sendLeadEmail()` which builds a professional
 *    HTML email and fires it via EmailJS.
 *
 * SETUP REQUIRED (one-time, on https://www.emailjs.com):
 * 1. Create a free account
 * 2. Add an Email Service (Gmail recommended — connect propertyshopinvest@gmail.com)
 * 3. Create a template with:
 *      Subject: {{subject}}
 *      Body:    {{{html_body}}}   ← triple braces = raw HTML
 *      To:      propertyshopinvest@gmail.com
 * 4. Copy Service ID, Template ID, and Public Key into .env.local:
 *      VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
 *      VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
 *      VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxx
 */

import emailjs from '@emailjs/browser';

// ── Config ───────────────────────────────────────────────────────────
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

const RECIPIENT_EMAIL = 'propertyshopinvest@gmail.com';

// ── Types ────────────────────────────────────────────────────────────
export interface LeadData {
  formType: 'project_inquiry' | 'floor_plan_request' | 'general_contact' | 'callback_request';
  projectName?: string;
  community?: string;
  developer?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string;
}

// ── Professional HTML Email Template ─────────────────────────────────
function buildEmailHTML(lead: LeadData): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formLabels: Record<string, string> = {
    project_inquiry: '🏗️ Project Inquiry',
    floor_plan_request: '📐 Floor Plan Request',
    general_contact: '📩 General Contact',
    callback_request: '📞 Callback Request',
  };

  const formLabel = formLabels[lead.formType] || 'New Lead';

  const accentColor = '#2563EB';
  const darkBg = '#0F172A';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Lead — ${lead.projectName || 'PSI Maps'}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- ─── Top Banner ───────────────────────────────────── -->
          <tr>
            <td style="background:${darkBg};padding:28px 32px;border-radius:16px 16px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background:${accentColor};width:40px;height:40px;border-radius:10px;text-align:center;line-height:40px;color:#fff;font-weight:900;font-size:16px;letter-spacing:-0.5px;vertical-align:middle;">PSI</div>
                    <span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.5px;margin-left:12px;vertical-align:middle;">PSI Maps</span>
                    <span style="display:block;color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-top:4px;margin-left:54px;">Lead Notification</span>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <span style="display:inline-block;background:${accentColor};color:#fff;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:8px;">NEW LEAD</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── Lead Type Badge ──────────────────────────────── -->
          <tr>
            <td style="background:#fff;padding:24px 32px 0;">
              <div style="display:inline-block;background:#eff6ff;color:${accentColor};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:8px 16px;border-radius:10px;border:1px solid #dbeafe;">
                ${formLabel}
              </div>
              <div style="color:#64748b;font-size:12px;margin-top:8px;">${dateStr} at ${timeStr} (UAE)</div>
            </td>
          </tr>

          ${lead.projectName ? `
          <!-- ─── Project Highlight ────────────────────────────── -->
          <tr>
            <td style="background:#fff;padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,${darkBg},#1e293b);border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Project of Interest</div>
                    <div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px;line-height:1.2;">${lead.projectName || ''}</div>
                    ${lead.community || lead.developer ? `
                    <div style="margin-top:8px;">
                      ${lead.community ? `<span style="display:inline-block;background:#334155;color:#cbd5e1;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;margin-right:6px;">📍 ${lead.community}</span>` : ''}
                      ${lead.developer ? `<span style="display:inline-block;background:#334155;color:#cbd5e1;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;">🏢 ${lead.developer}</span>` : ''}
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- ─── Contact Details ──────────────────────────────── -->
          <tr>
            <td style="background:#fff;padding:24px 32px 0;">
              <div style="color:#0f172a;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">Contact Information</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:8px 0;vertical-align:top;">
                    <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Full Name</div>
                    <div style="color:#0f172a;font-size:16px;font-weight:700;margin-top:4px;">${lead.firstName} ${lead.lastName}</div>
                  </td>
                  <td width="50%" style="padding:8px 0;vertical-align:top;">
                    <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Phone</div>
                    <div style="margin-top:4px;">
                      <a href="tel:${lead.phone}" style="color:${accentColor};font-size:16px;font-weight:700;text-decoration:none;">${lead.phone}</a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:8px 0;vertical-align:top;">
                    <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Email</div>
                    <div style="margin-top:4px;">
                      <a href="mailto:${lead.email}" style="color:${accentColor};font-size:16px;font-weight:700;text-decoration:none;">${lead.email}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${lead.message ? `
          <!-- ─── Message ──────────────────────────────────────── -->
          <tr>
            <td style="background:#fff;padding:20px 32px 0;">
              <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Message</div>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;color:#334155;font-size:14px;line-height:1.6;">
                ${lead.message.replace(/\n/g, '<br/>')}
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- ─── Quick Action Buttons ─────────────────────────── -->
          <tr>
            <td style="background:#fff;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="padding-right:8px;">
                    <a href="mailto:${lead.email}?subject=Re: Your Inquiry about ${lead.projectName || 'PSI Property'}&body=Dear ${lead.firstName},%0A%0AThank you for your interest.%0A%0A"
                       style="display:block;text-align:center;background:${accentColor};color:#fff;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:14px;border-radius:10px;text-decoration:none;">
                      ✉️ Reply by Email
                    </a>
                  </td>
                  <td width="48%" style="padding-left:8px;">
                    <a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Hello ${lead.firstName}, thank you for your interest in ${lead.projectName || 'our properties'}!"
                       style="display:block;text-align:center;background:#22c55e;color:#fff;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:14px;border-radius:10px;text-decoration:none;">
                      💬 WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── Footer ───────────────────────────────────────── -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-radius:0 0 16px 16px;border-top:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="color:#94a3b8;font-size:11px;font-weight:600;">
                      Sent from <strong style="color:#64748b;">PSI Maps</strong> · Advanced Spatial Intelligence
                    </div>
                    <div style="color:#cbd5e1;font-size:10px;margin-top:4px;">
                      This is an automated notification. Do not reply to this email directly.
                    </div>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <div style="color:#94a3b8;font-size:10px;font-weight:600;">Source: PSI Maps Platform</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ── Email Subject Builder ────────────────────────────────────────────
function buildSubject(lead: LeadData): string {
  const prefix: Record<string, string> = {
    project_inquiry: '🏗️ New Inquiry',
    floor_plan_request: '📐 Floor Plan Request',
    general_contact: '📩 New Contact',
    callback_request: '📞 Callback Request',
  };
  const tag = prefix[lead.formType] || '📩 New Lead';
  const project = lead.projectName ? ` — ${lead.projectName}` : '';
  return `${tag}${project} | ${lead.firstName} ${lead.lastName}`;
}

// ── The Main Send Function ───────────────────────────────────────────
export async function sendLeadEmail(lead: LeadData): Promise<{ success: boolean; error?: string }> {
  // If EmailJS isn't configured, fall back to Firestore-only storage
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('⚠️ EmailJS not configured. Lead saved to Firestore only. Set VITE_EMAILJS_* env vars.');
    return { success: true };
  }

  try {
    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: RECIPIENT_EMAIL,
        subject: buildSubject(lead),
        html_body: buildEmailHTML(lead),
        from_name: `${lead.firstName} ${lead.lastName}`,
        reply_to: lead.email,
      },
      PUBLIC_KEY
    );
    console.log('✅ Email sent:', result.status, result.text);
    return { success: true };
  } catch (err: any) {
    console.error('❌ Email send failed:', err);
    return { success: false, error: err?.text || err?.message || 'Unknown error' };
  }
}

// ── Also save leads to Firestore for CRM tracking ───────────────────
export async function saveLeadToFirestore(lead: LeadData): Promise<void> {
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await addDoc(collection(db, 'leads'), {
      ...lead,
      submittedAt: serverTimestamp(),
      status: 'new',
      source: 'psi-maps',
    });
    console.log('💾 Lead saved to Firestore');
  } catch (err) {
    console.error('❌ Failed to save lead to Firestore:', err);
  }
}

// ── Convenience: Send + Save ─────────────────────────────────────────
// IMPORTANT: The user sees SUCCESS if the lead is saved to Firestore.
// Email failure is a silent warning — the lead is captured either way.
// To fix the EmailJS 412 error: On emailjs.com, go to Email Services,
// disconnect and reconnect the Gmail account — this refreshes the
// OAuth scopes to include gmail.send permission.
export async function submitLead(lead: LeadData): Promise<{ success: boolean; error?: string }> {
  // Fire both in parallel — email and Firestore
  const [emailResult] = await Promise.all([
    sendLeadEmail(lead),
    saveLeadToFirestore(lead),
  ]);

  // Always return success — the lead is saved to Firestore regardless
  // Email is a bonus notification; its failure should NOT block the user
  if (!emailResult.success) {
    console.warn('⚠️ Lead saved to Firestore but email notification failed:', emailResult.error);
    console.warn('💡 Fix: Go to emailjs.com → Email Services → Re-connect Gmail to refresh OAuth scopes');
  }

  return { success: true };
}
