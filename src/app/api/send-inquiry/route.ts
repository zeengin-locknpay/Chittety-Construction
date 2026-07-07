import { NextResponse } from 'next/server';
import path from 'path';

interface InquiryPayload {
  name?: string;
  phone?: string;
  source?: string;
  email?: string;
  company_name?: string;
  product_sku?: string;
  product_name?: string;
  category?: string;
  brand?: string;
  price_reference?: string;
  quantity?: string;
  delivery_location?: string;
  project_type?: string;
  requirement_type?: string;
  message?: string;
  page_url?: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] || character);
}

function requestId(date: Date) {
  const value = date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `CCQ-${value.slice(0, 8)}-${value.slice(8)}`;
}

function subjectFor(inquiry: InquiryPayload, id: string) {
  const type = inquiry.requirement_type?.toLowerCase() || '';
  const source = inquiry.source?.toLowerCase() || '';
  if (type.includes('bulk')) return `New Bulk Supply Inquiry — ${id}`;
  if (source.includes('support')) return `New Support Request — ${inquiry.requirement_type || 'General Support'} — ${id}`;
  if (source.includes('contact')) return `New Contact Request — Chittety Construction — ${id}`;
  if (inquiry.product_name) return `New Product Inquiry — ${inquiry.product_name} — ${id}`;
  return `New Quote Request — Chittety Construction — ${id}`;
}

function buildMessage(inquiry: InquiryPayload, id: string, submittedAt: string) {
  const sections = [
    ['Request Details', [
      ['Request ID', id], ['Submitted At', submittedAt], ['Source', inquiry.source],
      ['Requirement Type', inquiry.requirement_type], ['Page URL', inquiry.page_url],
    ]],
    ['Customer Details', [
      ['Name', inquiry.name], ['Phone', inquiry.phone], ['Email', inquiry.email], ['Company Name', inquiry.company_name],
    ]],
    ['Product Details', [
      ['SKU', inquiry.product_sku], ['Product Name', inquiry.product_name], ['Category', inquiry.category],
      ['Brand', inquiry.brand], ['Price Reference', inquiry.price_reference], ['Quantity', inquiry.quantity],
    ]],
    ['Project Details', [
      ['Project Type', inquiry.project_type], ['Delivery Location', inquiry.delivery_location], ['Message', inquiry.message],
    ]],
  ] as const;

  const html = sections.map(([title, rows]) => {
    const visibleRows = rows.filter(([, value]) => value);
    if (!visibleRows.length) return '';
    return `<h2 style="font-size:16px;margin:24px 0 8px;color:#111827">${title}</h2><table style="border-collapse:collapse;width:100%">${visibleRows.map(([label, value]) => `<tr><td style="padding:7px 10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;width:180px">${label}</td><td style="padding:7px 10px;border:1px solid #e5e7eb">${escapeHtml(String(value))}</td></tr>`).join('')}</table>`;
  }).join('');

  const text = sections.flatMap(([title, rows]) => {
    const visibleRows = rows.filter(([, value]) => value);
    return visibleRows.length ? [`\n${title}`, ...visibleRows.map(([label, value]) => `${label}: ${value}`)] : [];
  }).join('\n');

  return {
    html: `<div style="font-family:Arial,sans-serif;color:#374151;max-width:720px"><h1 style="color:#111827">New Chittety Construction Inquiry</h1>${html}<p style="margin-top:24px;color:#6b7280;font-size:13px">This inquiry was submitted from the Chittety Construction website.</p></div>`,
    text: `New Chittety Construction Inquiry\n${text}\n\nThis inquiry was submitted from the Chittety Construction website.`,
  };
}

function buildCustomerDetailsTable(inquiry: InquiryPayload) {
  const rows = [
    ['Product / Service', inquiry.product_name],
    ['Quantity', inquiry.quantity],
    ['Delivery Location', inquiry.delivery_location],
    ['Requirement Type', inquiry.requirement_type],
  ].filter(([, val]) => val);

  if (rows.length === 0) return '';

  const tableRows = rows.map(([label, val]) => `
    <tr>
      <td style="padding: 10px 12px; font-size: 14px; font-weight: 600; color: #374151; background-color: #F9FAFB; border: 1px solid #E5E7EB; width: 160px;">${label}</td>
      <td style="padding: 10px 12px; font-size: 14px; color: #4B5563; border: 1px solid #E5E7EB;">${escapeHtml(String(val))}</td>
    </tr>
  `).join('');

  return `
    <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 14px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">Inquiry Details</h3>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px; width: 100%;">
      ${tableRows}
    </table>
  `;
}

async function sendCustomerConfirmationEmail(
  inquiry: InquiryPayload,
  id: string,
  type: 'immediate' | 'delayed'
) {
  if (!inquiry.email?.trim()) return;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || process.env.INQUIRY_FROM_EMAIL;

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    console.error('[Email Notification] SMTP is not configured. Customer email not sent.');
    return;
  }

  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const subject = type === 'immediate'
    ? `We are reviewing your order — ${id}`
    : `Your order is successfully placed — ${id}`;

  const title = type === 'immediate'
    ? 'We are reviewing your order'
    : 'Your order is successfully placed';

  const message = type === 'immediate'
    ? 'Thank you for choosing Chittety Construction. This is to confirm that we are reviewing your order. Our team of specialists is currently assessing your requirements and we will contact you shortly.'
    : 'We are pleased to inform you that your order has been successfully placed. You will be updated as soon as it is dispatched or when our team contacts you with further details.';

  const statusNote = type === 'immediate'
    ? '<strong>Status:</strong> Under Review<br>Our team is actively reviewing your order specifications. You will receive another notification once the order is successfully placed in our system (usually in 10 minutes).'
    : '<strong>Status:</strong> Successfully Placed / Processing<br>Your order is now officially placed and in progress. Our logistics and customer service teams will coordinate the dispatch process.';

  const detailsTable = buildCustomerDetailsTable(inquiry);
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAFAFA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-top: 4px solid #C8A44D; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); overflow: hidden;">
          <!-- Header (Logo) -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #FAFAFA;">
              <img src="cid:logo" alt="Chittety Construction" style="max-height: 40px; width: auto; display: inline-block;" />
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 700; color: #111827; letter-spacing: -0.02em;">
                ${title}
              </h1>
              <p style="margin-top: 0; margin-bottom: 24px; font-size: 15px; line-height: 1.6; color: #4B5563;">
                Dear ${escapeHtml(inquiry.name || 'Customer')},
              </p>
              <p style="margin-top: 0; margin-bottom: 24px; font-size: 15px; line-height: 1.6; color: #4B5563;">
                ${message}
              </p>
              
              <!-- Details Table -->
              ${detailsTable}

              <!-- Status Banner -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 28px; background-color: #FAFAFA; border: 1px solid #E5E7EB; border-left: 3px solid #C8A44D; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px; font-size: 14px; line-height: 1.5; color: #4B5563;">
                    <strong>Reference ID:</strong> ${id}<br>
                    <strong>Time of Request:</strong> ${timestamp}<br>
                    ${statusNote}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #FAFAFA; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #111827;">Chittety Construction</p>
              <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 1.5; color: #9CA3AF;">
                Quality Construction, Building Materials & Construction Services
              </p>
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                This is an automated notification. Please do not reply directly to this email unless you have questions regarding this request.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await transporter.sendMail({
    from: smtpFrom,
    to: inquiry.email.trim(),
    subject,
    html,
    attachments: [
      {
        filename: 'chittety-logo-v2.png',
        path: path.join(process.cwd(), 'public/brand/chittety-logo-v2.png'),
        cid: 'logo',
      },
    ],
  });
}

export async function POST(request: Request) {
  try {
    const inquiry = await request.json() as InquiryPayload;
    if (!inquiry.name?.trim() || !inquiry.phone?.trim() || (!inquiry.source?.trim() && !inquiry.requirement_type?.trim())) {
      return NextResponse.json({ success: false, message: 'Please provide name, phone number, and requirement type.' }, { status: 400 });
    }

    const now = new Date();
    const id = requestId(now);
    const to = process.env.INQUIRY_TO_EMAIL;
    const resendKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.INQUIRY_FROM_EMAIL;
    const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && (process.env.SMTP_FROM || resendFrom);

    if (!to || (!resendKey && !smtpConfigured)) {
      return NextResponse.json({ success: false, message: 'Email service is not configured. Please add RESEND_API_KEY or SMTP credentials.' }, { status: 503 });
    }

    const subject = subjectFor(inquiry, id);
    const content = buildMessage(inquiry, id, now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));

    if (resendKey) {
      if (!resendFrom) {
        return NextResponse.json({ success: false, message: 'INQUIRY_FROM_EMAIL is required when using Resend.' }, { status: 503 });
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: resendFrom, to: [to], subject, html: content.html, text: content.text, reply_to: inquiry.email || undefined }),
      });
      console.log("resss-", response);
      if (!response.ok) throw new Error(`Resend rejected the message (${response.status}).`);
    } else {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || resendFrom,
        to,
        replyTo: inquiry.email || undefined,
        subject,
        html: content.html,
        text: content.text,
      });
    }

    if (inquiry.email?.trim()) {
      sendCustomerConfirmationEmail(inquiry, id, 'immediate').catch((err) => {
        console.error('Failed to send immediate customer email:', err);
      });

      setTimeout(() => {
        sendCustomerConfirmationEmail(inquiry, id, 'delayed').catch((err) => {
          console.error('Failed to send delayed customer email:', err);
        });
      }, 10 * 60 * 1000);
    }

    return NextResponse.json({ success: true, request_id: id, message: 'Your inquiry has been sent successfully. Our team will contact you soon.' });
  } catch (error) {
    console.error('Inquiry email error:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unable to send inquiry. Please try again.' }, { status: 500 });
  }
}
