'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  Loader2,
  Calendar,
  User,
  Phone,
  Mail,
  Building,
  FileText,
  MapPin,
  Tag,
  Hash,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuoteRequest {
  id: number;
  name: string;
  phone: string;
  email: string;
  company: string;
  projectType: string;
  category: string;
  sku: string;
  quantity: number;
  deliveryLocation: string;
  requirementType: string;
  message: string;
  status: string;
  paymentUrl: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'New', color: 'border-blue-200 text-blue-700 bg-blue-50' },
  { value: 'In Review', color: 'border-amber-200 text-amber-700 bg-amber-50' },
  { value: 'Quoted', color: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
  { value: 'url-sent', color: 'border-purple-200 text-purple-700 bg-purple-50' },
  { value: 'Closed', color: 'border-gray-200 text-gray-600 bg-gray-50' },
];

function getStatusColor(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || 'border-gray-200 text-gray-600 bg-gray-50';
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function QuoteRequestDetail({ params }: PageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { id: routeId } = use(params);

  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [sendingPayment, setSendingPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quote?id=${routeId}`);
      if (!res.ok) throw new Error('Failed to fetch quote request');
      const data = await res.json();
      setQuote(data.quote);
      setPaymentUrl(data.quote?.paymentUrl || '');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [routeId, toast]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleStatusChange = async (newStatus: string) => {
    if (!quote) return;
    setSubmittingStatus(true);
    try {
      const res = await fetch('/api/quote', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quote.id, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setQuote((prev) => prev ? { ...prev, status: newStatus } : null);
      toast({
        title: 'Status Updated',
        description: `Quote request is now marked as "${newStatus}".`,
      });
    } catch (error) {
      toast({
        title: 'Error updating status',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    if (!paymentUrl.trim()) {
      toast({
        title: 'Required Field',
        description: 'Please input a valid payment URL.',
        variant: 'destructive',
      });
      return;
    }

    setSendingPayment(true);
    try {
      const res = await fetch('/api/quote/send-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quote.id, paymentUrl: paymentUrl.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send payment URL');
      }

      const data = await res.json();
      setQuote(data.quote);
      setPaymentUrl(data.quote?.paymentUrl || '');

      toast({
        title: 'Payment URL Sent',
        description: 'Status has been updated to "url-sent" and the N8N webhook was triggered successfully.',
      });
    } catch (error) {
      toast({
        title: 'Sending failed',
        description: error instanceof Error ? error.message : 'An error occurred while sending the payment URL.',
        variant: 'destructive',
      });
    } finally {
      setSendingPayment(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="size-8 animate-spin text-[#111827]" />
        <p className="text-sm text-[#6B7280]">Loading quote request details...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-bold text-gray-900">Quote request not found</h2>
        <p className="text-gray-500 mt-2">The request with ID QR-{routeId} could not be located.</p>
        <Link href="/admin/quote-requests" className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
          <ArrowLeft className="size-4 mr-2" /> Back to Quote Requests
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div className="space-y-1">
          <Link
            href="/admin/quote-requests"
            className="inline-flex items-center text-xs text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="size-3.5 mr-1" /> Back to Quote Requests
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[#111827]">
              Quote Request QR-{String(quote.id).padStart(4, '0')}
            </h1>
            <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-0.5 ${getStatusColor(quote.status)}`}>
              {quote.status}
            </Badge>
          </div>
          <p className="text-xs text-[#6B7280] flex items-center">
            <Calendar className="size-3.5 mr-1" /> Submitted on {formatDate(quote.createdAt)}
          </p>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <span className="text-xs text-[#6B7280] font-medium">Update Status:</span>
          <Select value={quote.status} onValueChange={handleStatusChange} disabled={submittingStatus}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main layout grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Inquiry details */}
        <div className="md:col-span-2 space-y-6">
          {/* Customer Card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <h2 className="text-sm font-semibold text-[#111827] flex items-center gap-2">
                <User className="size-4 text-[#6B7280]" /> Customer Profile
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[#9CA3AF] block font-medium uppercase tracking-wider">Contact Name</span>
                <span className="text-[#111827] font-semibold text-sm">{quote.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[#9CA3AF] block font-medium uppercase tracking-wider">Company</span>
                <span className="text-[#111827] font-semibold text-sm flex items-center gap-1.5">
                  <Building className="size-3.5 text-[#9CA3AF]" /> {quote.company || '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[#9CA3AF] block font-medium uppercase tracking-wider">Email Address</span>
                <a
                  href={`mailto:${quote.email}`}
                  className="text-blue-600 hover:underline font-semibold text-sm flex items-center gap-1.5"
                >
                  <Mail className="size-3.5 text-[#9CA3AF]" /> {quote.email}
                </a>
              </div>
              <div className="space-y-1">
                <span className="text-[#9CA3AF] block font-medium uppercase tracking-wider">Phone Number</span>
                <a
                  href={`tel:${quote.phone}`}
                  className="text-[#111827] hover:text-blue-600 font-semibold text-sm flex items-center gap-1.5"
                >
                  <Phone className="size-3.5 text-[#9CA3AF]" /> {quote.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Product & Req Details */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <h2 className="text-sm font-semibold text-[#111827] flex items-center gap-2">
                <FileText className="size-4 text-[#6B7280]" /> Inquiry Details
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[#9CA3AF] block font-medium uppercase tracking-wider">Requirement Type</span>
                <Badge variant="secondary" className="font-semibold text-xs py-0.5">
                  {quote.requirementType || '—'}
                </Badge>
              </div>
              <div className="space-y-1">
                <span className="text-[#9CA3AF] block font-medium uppercase tracking-wider">Project Type</span>
                <span className="text-[#111827] font-semibold text-sm">{quote.projectType || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[#9CA3AF] block font-medium uppercase tracking-wider">Product SKU / Code</span>
                <span className="text-mono text-[#111827] font-semibold text-sm flex items-center gap-1.5">
                  <Hash className="size-3.5 text-[#9CA3AF]" /> {quote.sku || '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[#9CA3AF] block font-medium uppercase tracking-wider">Product Category</span>
                <span className="text-[#111827] font-semibold text-sm flex items-center gap-1.5">
                  <Tag className="size-3.5 text-[#9CA3AF]" /> {quote.category || '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[#9CA3AF] block font-medium uppercase tracking-wider">Quantity Requested</span>
                <span className="text-[#111827] font-semibold text-sm">{quote.quantity}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[#9CA3AF] block font-medium uppercase tracking-wider">Delivery Location</span>
                <span className="text-[#111827] font-semibold text-sm flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-[#9CA3AF]" /> {quote.deliveryLocation || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Message section */}
          {quote.message && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <h2 className="text-sm font-semibold text-[#111827]">Customer Message</h2>
              </div>
              <div className="p-5">
                <p className="text-xs text-[#374151] leading-relaxed bg-[#F9FAFB] rounded-lg p-4 border border-[#E5E7EB] whitespace-pre-wrap">
                  {quote.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Actions (Payment URL input and send triggers) */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <h2 className="text-sm font-semibold text-[#111827] flex items-center gap-2">
                <DollarSign className="size-4 text-[#6B7280]" /> Send Payment Link
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[11px] text-[#6B7280] leading-relaxed">
                Add a checkout or payment link below. Clicking <strong>Send</strong> will update status to <strong>url-sent</strong>, and trigger N8N payment dispatch automation.
              </p>

              <form onSubmit={handleSendPayment} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#374151]" htmlFor="payment-url-input">
                    Payment URL
                  </label>
                  <Input
                    id="payment-url-input"
                    type="url"
                    placeholder="https://checkout.stripe.com/..."
                    value={paymentUrl}
                    onChange={(e) => setPaymentUrl(e.target.value)}
                    disabled={sendingPayment}
                    className="text-xs h-9"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={sendingPayment}
                  className="w-full text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center justify-center gap-2"
                >
                  {sendingPayment ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  {sendingPayment ? 'Sending Link...' : 'Send Link'}
                </Button>
              </form>

              {quote.paymentUrl && (
                <div className="border-t border-[#E5E7EB] pt-4 space-y-2">
                  <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase block">Sent Payment URL</span>
                  <a
                    href={quote.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-700 hover:underline flex items-center gap-1.5 break-all bg-purple-50/50 p-2.5 rounded-lg border border-purple-100"
                  >
                    <ExternalLink className="size-3 flex-shrink-0" />
                    <span>{quote.paymentUrl}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
