'use client';

import { apiPost } from '@/lib/api';
import { Bot, MessageCircle, Send, Sparkles, Trash2, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Tôi đang học những khóa nào?',
  'Bài tập nào chưa làm?',
  'Hướng dẫn đăng ký khóa học',
  'React Virtual DOM là gì?',
  'Cách thanh toán khóa học?',
  'Xem tiến độ học ở đâu?',
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
      if (res.data.mode) setMode(res.data.mode);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data!.reply }]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.message || 'Xin lỗi, đã có lỗi. Bạn thử lại nhé.' },
      ]);
    }
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setMode('');
  };

  return (
    <div className="flex w-full flex-col px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
                Trợ lý AI X-Tech
              </h1>
              {mode && (
                <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {mode === 'ai' ? (
                    <>
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      Gemini AI
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-3 w-3" />
                      Trả lời tự động
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Hỏi về khóa học, bài tập, tiến độ, kiến thức CNTT... Tôi sẽ hỗ trợ bạn!
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="Cuộc trò chuyện mới"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Mới
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex max-h-[55vh] min-h-[360px] flex-1 flex-col overflow-y-auto p-4">
          {/* Welcome + suggestions */}
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                <Bot className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="mb-1 text-center font-medium text-zinc-700 dark:text-zinc-300">
                Xin chào! Tôi có thể giúp gì cho bạn?
              </p>
              <p className="mb-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Chọn gợi ý bên dưới hoặc gõ câu hỏi
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  m.role === 'user'
                    ? 'bg-emerald-600 dark:bg-emerald-500'
                    : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              >
                {m.role === 'user' ? (
                  <User className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="mb-3 flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                <Bot className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
              </div>
              <div className="rounded-2xl bg-zinc-100 px-4 py-2.5 dark:bg-zinc-800">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
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
          className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-700 sm:p-4"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi..."
            className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 dark:bg-emerald-500 sm:h-10 sm:w-auto sm:px-4"
            aria-label="Gửi"
            title="Gửi"
          >
            <Send className="h-4 w-4 shrink-0" />
            <span className="ml-1.5 hidden sm:inline text-sm">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
}
