'use client';

import { apiPost } from '@/lib/api';
import { Bot, MessageCircle, Minimize2, Send, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, open]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    const res = await apiPost<{ reply: string; sessionId: string; mode: string }>('/api/chatbot/chat', {
      message: msg,
      sessionId: sessionId || undefined,
    });
    setLoading(false);
    if (res.success && res.data) {
      if (res.data.sessionId) setSessionId(res.data.sessionId);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data!.reply }]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.message || 'Xin lỗi, đã có lỗi.' },
      ]);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          aria-label="Mở chatbot"
          title="Trợ lý AI X-Tech"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:w-[380px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 bg-emerald-600 px-4 py-3 dark:border-zinc-700 dark:bg-emerald-700">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-white" />
              <span className="text-sm font-semibold text-white">Trợ lý AI X-Tech</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-emerald-100 hover:bg-emerald-700 hover:text-white dark:hover:bg-emerald-800"
                title="Thu nhỏ"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-emerald-100 hover:bg-emerald-700 hover:text-white dark:hover:bg-emerald-800"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <Bot className="mb-2 h-10 w-10 text-emerald-400" />
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Xin chào! 👋
                </p>
                <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                  Hỏi gì đó để bắt đầu
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {['Khóa học nào hay?', 'Bài tập chưa làm?', 'Hướng dẫn thanh toán'].map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:border-emerald-300 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                      >
                        {s}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`mb-2 flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    m.role === 'user'
                      ? 'bg-emerald-600 dark:bg-emerald-500'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                >
                  {m.role === 'user' ? (
                    <User className="h-3 w-3 text-white" />
                  ) : (
                    <Bot className="h-3 w-3 text-zinc-600 dark:text-zinc-300" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                      : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="mb-2 flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <Bot className="h-3 w-3 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div className="rounded-xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2 border-t border-zinc-200 p-2.5 dark:border-zinc-700"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi..."
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 dark:bg-emerald-500"
              aria-label="Gửi"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
