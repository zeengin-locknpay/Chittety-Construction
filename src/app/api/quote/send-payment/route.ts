import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, paymentUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Quote request ID is required' }, { status: 400 });
    }

    if (!paymentUrl || !paymentUrl.trim()) {
      return NextResponse.json({ error: 'Payment URL is required' }, { status: 400 });
    }

    // 1. Fetch current quote request
    const quote = await db.quoteRequest.findUnique({
      where: { id: Number(id) }
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote request not found' }, { status: 404 });
    }

    // 2. Update status and payment URL in database
    const updatedQuote = await db.quoteRequest.update({
      where: { id: Number(id) },
      data: {
        status: 'url-sent',
        paymentUrl: paymentUrl.trim()
      }
    });

    // 3. Call N8N Webhook if configured
    const n8nSendPaymentUrl = process.env.N8N_SEND_PAYMENT_URL;
    if (n8nSendPaymentUrl) {
      try {
        await fetch(n8nSendPaymentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_request_id: quote.id,
            payment_url: paymentUrl.trim(),
            inquiry: {
              name: quote.name,
              email: quote.email,
              phone: quote.phone,
              company: quote.company,
              project_type: quote.projectType,
              category: quote.category,
              sku: quote.sku,
              quantity: quote.quantity,
              delivery_location: quote.deliveryLocation,
              requirement_type: quote.requirementType,
              message: quote.message,
              status: 'url-sent'
            }
          })
        });
      } catch (n8nError) {
        console.error('Failed to trigger N8N payment URL webhook:', n8nError);
      }
    }

    return NextResponse.json({ success: true, quote: updatedQuote });
  } catch (error) {
    console.error('Send payment error:', error);
    return NextResponse.json({ error: 'Failed to update quote request and send payment URL' }, { status: 500 });
  }
}
