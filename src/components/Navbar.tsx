import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Logo({ size = 34, compactText = false }: { size?: number; compactText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid place-items-center rounded-xl bg-primary text-ink shrink-0" style={{ width: size, height: size }}>
        <Scissors size={Math.round(size * 0.52)} strokeWidth={2.6} />
      </span>
      {!compactText && (
        <span className="font-display font-bold text-white text-[17px] leading-none tracking-tight">
          Campaign<span className="text-primary">Clippers</span>
        </span>
      )}
    </span>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { to: '/#features', label: 'Features' },
    { to: '/#how', label: 'How it works' },
    { to: '/#ai', label: 'AI Suite' },
    { to: '/pricing', label: 'Pricing' },
  ];

  return (
    <header className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${scrolled || open ? 'glass-strong' : 'bg-transparent border-b border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.label} href={l.to} className="text-sm font-semibold text-mut hover:text-white transition-colors">{l.label}</a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link to="/dashboard" className="btn-primary">Open dashboard <ArrowRight size={15} /></Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-bold text-mut hover:text-white transition-colors px-3">Log in</Link>
              <Link to="/signup" className="btn-primary">Get started free</Link>
            </>
          )}
        </div>
        <button className="md:hidden text-white p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden px-5 pb-5 flex flex-col gap-3 border-t border-white/8 pt-4">
          {links.map((l) => (
            <a key={l.label} href={l.to} onClick={() => setOpen(false)} className="text-sm font-semibold text-mut hover:text-white py-1">{l.label}</a>
          ))}
          {user ? (
            <Link to="/dashboard" className="btn-primary mt-2">Open dashboard</Link>
          ) : (
            <div className="flex gap-3 mt-2">
              <Link to="/login" className="btn-ghost flex-1">Log in</Link>
              <Link to="/signup" className="btn-primary flex-1">Get started</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
