import { useState, type FormEvent } from 'react';
import { Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, type LeadInsert } from '@/lib/supabase';

const SERVICES = [
  'Warehouse Storage',
  'Freight & Distribution',
  'Inventory Management',
  'Fulfillment Services',
  'Cross-Docking',
  'Other / General Inquiry',
];

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload: LeadInsert = {
      name: String(data.get('name') ?? '').trim(),
      company: String(data.get('company') ?? '').trim() || undefined,
      email: String(data.get('email') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim() || undefined,
      service: String(data.get('service') ?? '') || undefined,
      message: String(data.get('message') ?? '').trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setStatus('error');
      setErrorMsg('Please fill in your name, email, and a message.');
      return;
    }

    const { error } = await supabase.from('leads').insert(payload);

    if (error) {
      setStatus('error');
      setErrorMsg('Something went wrong sending your message. Please try again or call us.');
      return;
    }

    setStatus('success');
    form.reset();
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-10 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-400" strokeWidth={1.5} />
        <h3 className="text-2xl font-bold text-white">Message sent</h3>
        <p className="max-w-md text-slate-300">
          Thanks for reaching out to Warehouse 502. Our team will get back to you within one business day.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" required />
        <Field label="Company" name="company" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" required />
        <Field label="Phone" name="phone" type="tel" />
      </div>

      <div>
        <label htmlFor="service" className="mb-1.5 block text-sm font-medium text-slate-300">
          Service of interest
        </label>
        <select
          id="service"
          name="service"
          defaultValue=""
          className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        >
          <option value="" disabled className="bg-slate-900">
            Select a service…
          </option>
          {SERVICES.map((s) => (
            <option key={s} value={s} className="bg-slate-900">
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-slate-300">
          Message <span className="text-amber-400">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Tell us about your storage or logistics needs…"
          className="w-full resize-y rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3.5 text-base font-semibold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-5 w-5" />
            Send message
          </>
        )}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label} {required && <span className="text-amber-400">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      />
    </div>
  );
}
