import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
}

export default function Assistant() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedFor = useRef<string | null>(null);

  const scrollDown = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  };

  const ask = useCallback(async (text: string, silentUser = false) => {
    if (!silentUser) setMessages((m) => [...m, { role: 'user', text }]);
    setTyping(true);
    scrollDown();
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.text }));
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, profile_id: profile?.id || null, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Assistant unavailable');
      setMessages((m) => [...m, { role: 'assistant', text: data.reply, suggestions: data.suggestions || [] }]);
    } catch {
      setMessages((m) => [...m, {
        role: 'assistant',
        text: 'Hmm, I couldn\u2019t reach the server just now. Give it another try in a moment.',
        suggestions: ['How does escrow work?'],
      }]);
    } finally {
      setTyping(false);
      scrollDown();
    }
  }, [messages, profile?.id]);

  // Greet on first open (re-greet if the signed-in profile changes)
  useEffect(() => {
    const key = String(profile?.id ?? 'guest');
    if (open && greetedFor.current !== key) {
      greetedFor.current = key;
      setMessages([]);
      ask('hello', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile?.id]);

  useEffect(scrollDown, [messages, typing]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || typing) return;
    setInput('');
    ask(text);
  };

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setOpen(true)}
            aria-label="Open AI assistant"
            className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-2xl bg-primary text-ink grid place-items-center shadow-[0_10px_40px_-8px_rgba(205,255,77,0.6)] hover:scale-105 transition-transform"
          >
            <Sparkles size={24} strokeWidth={2.4} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan border-2 border-ink animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed z-50 inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[390px] max-h-[calc(100dvh-2rem)] flex flex-col glass-strong rounded-3xl shadow-2xl shadow-black/70 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-gradient-to-r from-primary/10 to-violet/10">
              <span className="relative w-9 h-9 rounded-xl bg-primary text-ink grid place-items-center shrink-0">
                <Bot size={19} strokeWidth={2.4} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-panel" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-white text-sm leading-tight">Clip · AI Assistant</p>
                <p className="text-[11px] text-mut">Answers about campaigns, payments & more</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close assistant" className="w-8 h-8 rounded-lg grid place-items-center text-mut hover:text-white hover:bg-white/8 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[260px] max-h-[420px]">
              {messages.map((m, i) => (
                <div key={i}>
                  <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-primary text-ink font-semibold rounded-br-md'
                        : 'bg-white/6 border border-white/10 text-white/90 rounded-bl-md'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                  {m.role === 'assistant' && i === messages.length - 1 && !typing && (m.suggestions?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 pl-1">
                      {m.suggestions!.map((s) => (
                        <button
                          key={s}
                          onClick={() => ask(s)}
                          className="px-3 py-1.5 rounded-full text-[11px] font-bold text-primary bg-primary/8 border border-primary/25 hover:bg-primary/15 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-white/6 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-mut animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={submit} className="flex items-center gap-2 px-4 py-3.5 border-t border-white/10">
              <input
                className="input flex-1 !py-2.5"
                placeholder="Ask me anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                aria-label="Send"
                className="w-10 h-10 rounded-xl bg-primary text-ink grid place-items-center disabled:opacity-40 hover:brightness-110 transition-all shrink-0"
              >
                <Send size={16} strokeWidth={2.4} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
