import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Lenis from 'lenis';
import {
  Warehouse,
  Truck,
  PackageCheck,
  Boxes,
  ArrowRightLeft,
  ClipboardList,
  Phone,
  Mail,
  MapPin,
  Clock,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import ContactForm from '@/components/ContactForm';
import Scene3D from '@/components/Scene3D';

const SERVICES = [
  {
    icon: Warehouse,
    title: 'Warehouse Storage',
    desc: 'Secure, climate-managed storage space for inventory of any scale, from pallets to full container loads.',
  },
  {
    icon: Truck,
    title: 'Freight & Distribution',
    desc: 'Reliable inbound and outbound freight handling with direct connections to regional and national carriers.',
  },
  {
    icon: PackageCheck,
    title: 'Fulfillment Services',
    desc: 'Pick, pack, and ship with accuracy. We get your orders out the door on time, every time.',
  },
  {
    icon: Boxes,
    title: 'Inventory Management',
    desc: 'Real-time tracking and reporting so you always know exactly what you have and where it sits.',
  },
  {
    icon: ArrowRightLeft,
    title: 'Cross-Docking',
    desc: 'Fast-flow transloading that cuts storage time and gets goods moving to their next stop immediately.',
  },
  {
    icon: ClipboardList,
    title: '3PL Logistics',
    desc: 'End-to-end third-party logistics tailored to your operation — flexible, scalable, dependable.',
  },
];

const STATS = [
  { value: '502', label: 'Warehouse designation' },
  { value: '24/7', label: 'Monitoring & security' },
  { value: 'NM', label: 'New Mexico base' },
  { value: '100%', label: 'Inventory accuracy' },
];

const NAV_LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#about', label: 'About' },
  { href: '#stats', label: 'Why Us' },
  { href: '#contact', label: 'Contact' },
];

const CHAPTERS = [
  'Arrival',
  'Inside',
  ...SERVICES.map((s) => s.title),
  'About',
  'Why 502',
  'New Mexico',
  'Contact',
];

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => el.classList.toggle('is-in', entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-amber-400 [text-shadow:0_1px_12px_rgba(0,0,0,0.9)]">
      {children}
    </p>
  );
}

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chapter, setChapter] = useState<number | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.85 });
    lenisRef.current = lenis;
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Nav links fly through the scene instead of jumping.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      const lenis = lenisRef.current;
      if (!link || !lenis) return;
      e.preventDefault();
      const hash = link.getAttribute('href')!;
      lenis.scrollTo(hash === '#top' ? 0 : hash, { duration: 2.6 });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const handleChapter = useCallback((index: number) => setChapter(index), []);

  return (
    <div className="min-h-screen font-sans text-slate-200 antialiased">
      <Scene3D onChapter={handleChapter} />

      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled || menuOpen ? 'bg-[#090b12]/80 shadow-lg backdrop-blur-md' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4 lg:px-10">
          <a href="#top" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500">
              <Warehouse className="h-6 w-6 text-slate-900" strokeWidth={2} />
            </div>
            <div className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight text-white">
                Warehouse 502
              </span>
              <span className="block text-xs font-medium text-amber-300">LLC · New Mexico</span>
            </div>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-slate-200 transition hover:text-amber-400"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contact"
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
            >
              Get a Quote
            </a>
          </nav>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-white md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-white/10 md:hidden">
            <nav className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-slate-200 transition hover:bg-white/5 hover:text-amber-400"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#contact"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-lg bg-amber-500 px-3 py-3 text-center text-base font-semibold text-slate-900"
              >
                Get a Quote
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* Chapter rail */}
      {chapter !== null && (
        <aside
          aria-hidden="true"
          className="pointer-events-none fixed right-8 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-2 xl:flex"
        >
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/80">
            {String(chapter + 1).padStart(2, '0')} — {CHAPTERS[chapter]}
          </p>
          {CHAPTERS.map((name, i) => (
            <span
              key={name}
              className={`h-[2px] transition-all duration-500 ${
                i === chapter ? 'w-9 bg-amber-400' : i < chapter ? 'w-4 bg-amber-400/50' : 'w-4 bg-white/25'
              }`}
            />
          ))}
        </aside>
      )}

      <main className="relative z-10">
        {/* Hero */}
        <section id="top" data-chapter className="relative flex h-[170vh] flex-col">
          <div className="sticky top-0 flex h-screen flex-col justify-between overflow-hidden">
            <div className="hero-scrim absolute inset-0" />
            <div className="relative mx-auto w-full max-w-[1500px] px-6 pt-24 lg:px-10">
              <span className="fade-up inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-300 backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4" />
                Trusted New Mexico warehousing &amp; logistics
              </span>
              <h1 className="font-display mt-5 text-[clamp(3.4rem,8.6vw,9rem)] font-black uppercase leading-[0.88] tracking-tight text-white">
                <span className="line"><span>Space that</span></span>
                <span className="line"><span>works as hard</span></span>
                <span className="line"><span className="text-amber-400">as you do.</span></span>
              </h1>
            </div>

            <div className="fade-up relative mx-auto flex w-full max-w-[1500px] flex-col items-start justify-between gap-6 px-6 pb-24 lg:flex-row lg:items-end lg:px-10">
              <div className="max-w-md rounded-2xl bg-[#090b12]/45 p-4 backdrop-blur-sm lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                <p className="text-base leading-relaxed text-slate-100 sm:text-lg">
                  Warehouse 502 LLC delivers secure storage, freight handling, and fulfillment
                  services across New Mexico — built for businesses that need reliability without
                  the runaround.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-7 py-3.5 text-base font-semibold text-slate-900 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400"
                >
                  Request a Quote
                  <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href="tel:9044345359"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
                >
                  <Phone className="h-5 w-5" />
                  (904) 434-5359
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" data-chapter className="flex min-h-[120vh] items-center">
          <div className="mx-auto w-full max-w-[1500px] px-6 lg:px-10">
            <Reveal className="max-w-3xl">
              <Eyebrow>What we do</Eyebrow>
              <h2 className="font-display mt-4 text-[clamp(3rem,7.5vw,7.5rem)] font-black uppercase leading-[0.9] tracking-tight text-white [text-shadow:0_4px_40px_rgba(0,0,0,0.65)]">
                Full-service warehousing under one roof
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-100 [text-shadow:0_2px_18px_rgba(0,0,0,0.9)]">
                From a single pallet to a full distribution program, we scale our services to fit
                your operation — not the other way around.
              </p>
            </Reveal>
          </div>
        </section>

        {SERVICES.map((s, i) => {
          const Icon = s.icon;
          return (
            <section key={s.title} data-chapter className="flex min-h-[135vh] items-center">
              <div
                className={`mx-auto flex w-full max-w-[1500px] px-6 lg:px-10 ${
                  i % 2 ? 'justify-end xl:pr-72' : 'justify-start'
                }`}
              >
                <Reveal className="glass w-full max-w-md p-8 sm:p-10">
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500 text-slate-900">
                      <Icon className="h-7 w-7" strokeWidth={1.75} />
                    </div>
                    <span className="outline-num font-display text-7xl font-black leading-none">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="font-display mt-8 text-5xl font-black uppercase leading-[0.95] tracking-tight text-white">
                    {s.title}
                  </h3>
                  <p className="mt-4 text-lg leading-relaxed text-slate-300">{s.desc}</p>
                </Reveal>
              </div>
            </section>
          );
        })}

        {/* About */}
        <section id="about" data-chapter className="flex min-h-[140vh] items-center">
          <div className="mx-auto flex w-full max-w-[1500px] px-6 lg:px-10">
            <Reveal className="glass w-full max-w-xl p-8 sm:p-10">
              <Eyebrow>About us</Eyebrow>
              <h2 className="font-display mt-4 text-5xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
                Built on dependability, run on precision.
              </h2>
              <p className="mt-6 leading-relaxed text-slate-300">
                Warehouse 502 LLC is a New Mexico-based warehousing and logistics company serving
                businesses that need secure, flexible space and hands-on service. Led by CEO
                Patrick Blanks, our team treats every shipment like it's our own — because a smooth
                supply chain is the quiet backbone of every growing business.
              </p>
              <p className="mt-4 leading-relaxed text-slate-300">
                Whether you're storing seasonal inventory, fulfilling daily orders, or rerouting
                freight, we build the workflow around you.
              </p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  'Locally owned & operated',
                  'Secure, monitored facility',
                  'Flexible short & long-term space',
                  'Direct carrier relationships',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-200">
                    <ShieldCheck className="h-5 w-5 flex-shrink-0 text-amber-400" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Why us: the boxes leave the racks and form the 502 */}
        <section id="stats" data-chapter className="relative min-h-[160vh]">
          <div className="absolute inset-x-0 bottom-[38vh] mx-auto w-full max-w-[1500px] px-6 text-center lg:px-10">
            <Reveal>
              <Eyebrow>Why Warehouse 502</Eyebrow>
              <h2 className="font-display mt-3 text-[clamp(2.6rem,5.5vw,5.5rem)] font-black uppercase leading-[0.92] tracking-tight text-white [text-shadow:0_4px_40px_rgba(0,0,0,0.7)]">
                Numbers that keep your business moving
              </h2>
            </Reveal>
          </div>
        </section>

        {/* Stats over the voxel map of New Mexico */}
        <section data-chapter className="relative min-h-[140vh]">
          <div className="absolute inset-x-0 bottom-[23vh] mx-auto w-full max-w-[1500px] px-6 lg:px-10">
            <Reveal className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="glass p-6 text-center transition hover:border-amber-400/40 sm:p-8">
                  <p className="font-display text-6xl font-black text-amber-400">{s.value}</p>
                  <p className="mt-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
                    {s.label}
                  </p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" data-chapter className="flex min-h-screen items-center py-28">
          <div className="mx-auto w-full max-w-[1500px] px-6 lg:px-10">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <Reveal>
                  <Eyebrow>Get in touch</Eyebrow>
                  <h2 className="font-display mt-4 text-[clamp(3.5rem,7.5vw,7.5rem)] font-black uppercase leading-[0.88] tracking-tight text-white [text-shadow:0_4px_40px_rgba(0,0,0,0.65)]">
                    Let's talk space.
                  </h2>
                  <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-100 [text-shadow:0_2px_18px_rgba(0,0,0,0.9)]">
                    Tell us what you need to store, ship, or move. We'll follow up within one
                    business day with a plan and a quote.
                  </p>
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <ContactInfo icon={Phone} label="Phone" value="(904) 434-5359" href="tel:9044345359" />
                    <ContactInfo icon={Mail} label="CEO" value="Patrick Blanks" />
                    <ContactInfo icon={MapPin} label="Location" value="New Mexico, USA" />
                    <ContactInfo icon={Clock} label="Response time" value="Within 1 business day" />
                  </div>
                </Reveal>
              </div>

              <div className="lg:col-span-6 lg:col-start-7 xl:pr-20">
                <Reveal className="glass p-7 sm:p-9">
                  <h3 className="font-display text-4xl font-black uppercase tracking-tight text-white">
                    Request a quote
                  </h3>
                  <p className="mt-1 text-slate-400">
                    Fields marked with <span className="text-amber-400">*</span> are required.
                  </p>
                  <div className="mt-6">
                    <ContactForm />
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#090b12] py-14">
        <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
            <div className="max-w-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500">
                  <Warehouse className="h-6 w-6 text-slate-900" strokeWidth={2} />
                </div>
                <div>
                  <span className="block text-lg font-extrabold text-white">Warehouse 502</span>
                  <span className="block text-xs font-medium text-amber-400">LLC · New Mexico</span>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-slate-400">
                Secure, scalable warehousing and logistics services for businesses across New Mexico
                and the Southwest.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="text-slate-300 transition hover:text-amber-400">
                  {l.label}
                </a>
              ))}
            </div>

            <div className="text-sm">
              <p className="font-semibold text-white">Contact</p>
              <p className="mt-3 text-slate-400">Patrick Blanks, CEO</p>
              <a href="tel:9044345359" className="mt-1 block text-slate-300 transition hover:text-amber-400">
                (904) 434-5359
              </a>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Warehouse 502 LLC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactInfo({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="glass flex items-center gap-3 !rounded-xl p-4 transition hover:border-amber-400/40">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }
  return content;
}
