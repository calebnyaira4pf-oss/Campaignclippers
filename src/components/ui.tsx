import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff } from 'lucide-react';

export function PasswordInput({ value, onChange, placeholder = '••••••••' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className="input pr-11"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg grid place-items-center text-faint hover:text-white transition-colors"
      >
        {show ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-white/15 border-t-primary"
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-4">
      <Spinner size={32} />
      <p className="text-sm text-mut font-medium tracking-wide">{label}…</p>
    </div>
  );
}

const TONES: Record<string, string> = {
  default: 'bg-white/8 text-white/70 border-white/10',
  lime: 'bg-primary/10 text-primary border-primary/25',
  violet: 'bg-violet/10 text-violet border-violet/25',
  cyan: 'bg-cyan/10 text-cyan border-cyan/25',
  green: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25',
  red: 'bg-rose-400/10 text-rose-300 border-rose-400/25',
  amber: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
};

export function Badge({ children, tone = 'default', className = '' }: { children: ReactNode; tone?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${TONES[tone] || TONES.default} ${className}`}>
      {children}
    </span>
  );
}

const STATUS_MAP: Record<string, { tone: string; label: string }> = {
  active: { tone: 'green', label: 'Active' },
  paused: { tone: 'amber', label: 'Paused' },
  draft: { tone: 'default', label: 'Draft' },
  completed: { tone: 'violet', label: 'Completed' },
  pending: { tone: 'amber', label: 'Pending' },
  approved: { tone: 'green', label: 'Approved' },
  rejected: { tone: 'red', label: 'Rejected' },
  paid: { tone: 'lime', label: 'Paid' },
  processing: { tone: 'cyan', label: 'Processing' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { tone: 'default', label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Stat({ icon, label, value, sub, tone = 'lime' }: { icon?: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  const iconTone: Record<string, string> = {
    lime: 'bg-primary/10 text-primary',
    violet: 'bg-violet/10 text-violet',
    cyan: 'bg-cyan/10 text-cyan',
    amber: 'bg-amber-400/10 text-amber-300',
  };
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-faint">{label}</span>
        {icon && <span className={`w-8 h-8 rounded-lg grid place-items-center ${iconTone[tone] || iconTone.lime}`}>{icon}</span>}
      </div>
      <div className="font-display text-2xl md:text-[28px] font-bold text-white leading-none">{value}</div>
      {sub && <div className="text-xs text-mut">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, tone = 'lime' }: { value: number; max: number; tone?: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const colors: Record<string, string> = {
    lime: 'bg-primary',
    violet: 'bg-violet',
    cyan: 'bg-cyan',
  };
  return (
    <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
      <div className={`h-full rounded-full ${colors[tone] || colors.lime} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({ name, src, size = 36 }: { name?: string; src?: string; size?: number }) {
  const initials = (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  if (src) {
    return <img src={src} alt={name} className="rounded-full object-cover shrink-0 bg-panel border border-white/10" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full shrink-0 grid place-items-center font-bold text-ink bg-gradient-to-br from-primary to-cyan"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export function EmptyState({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="glass rounded-2xl py-14 px-6 flex flex-col items-center text-center gap-3">
      {icon && <div className="w-12 h-12 rounded-xl bg-white/6 grid place-items-center text-mut">{icon}</div>}
      <h3 className="font-display font-bold text-white text-lg">{title}</h3>
      {desc && <p className="text-sm text-mut max-w-sm">{desc}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} bg-panel border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8 sticky top-0 bg-panel z-10">
              <h3 className="font-display font-bold text-white text-lg">{title}</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center text-mut hover:text-white hover:bg-white/8 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-[0.1em] text-faint mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-faint mt-1">{hint}</span>}
    </label>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 text-rose-300 text-sm px-4 py-3">
      {children}
    </div>
  );
}
