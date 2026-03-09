'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircleQuestion,
  X,
  Send,
  Sparkles,
  Plus,
  Maximize2,
  Minimize2,
  History,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getPageContext, getSuggestedQuestions, getJourneyStage, type UserStats } from '@/lib/help-context';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionSummary {
  id: string;
  title: string | null;
  lastPageContext: string | null;
  createdAt: string;
  updatedAt: string;
}

type View = 'chat' | 'history';

export function HelpChat() {
  const pathname = usePathname();
  const pageContext = useMemo(() => getPageContext(pathname), [pathname]);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load previous session when chat is first opened
  const loadSession = useCallback(async () => {
    if (sessionLoaded) return;
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      if (data.userStats) {
        setUserStats(data.userStats);
      }
      if (data.recentSessions) {
        setRecentSessions(data.recentSessions);
      }
      if (data.session && data.messages.length > 0) {
        setSessionId(data.session.id);
        setMessages(
          data.messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load chat session:', err);
    } finally {
      setSessionLoaded(true);
    }
  }, [sessionLoaded]);

  useEffect(() => {
    if (isOpen && !sessionLoaded) {
      loadSession();
    }
  }, [isOpen, sessionLoaded, loadSession]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened or when switching to chat view
  useEffect(() => {
    if (isOpen && view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, view]);

  const startNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setView('chat');
  };

  const loadSpecificSession = async (id: string) => {
    setLoadingSession(true);
    try {
      const res = await fetch(`/api/chat/sessions?id=${id}`);
      const data = await res.json();
      if (data.session && data.messages.length > 0) {
        setSessionId(data.session.id);
        setMessages(
          data.messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
        );
      }
      setView('chat');
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setLoadingSession(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10),
          pageContext: {
            pageName: pageContext.pageName,
            description: pageContext.description,
            pathname,
          },
          sessionId,
        }),
      });

      const data = await res.json();

      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        if (data.sessionId) {
          setSessionId(data.sessionId);
          // Update recent sessions list with the new/updated session
          setRecentSessions(prev => {
            const exists = prev.find(s => s.id === data.sessionId);
            if (exists) return prev;
            return [
              {
                id: data.sessionId,
                title: userMessage.slice(0, 100),
                lastPageContext: pageContext.pageName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 5);
          });
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I had trouble responding. Please try again.'
        }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const journeyStage = userStats ? getJourneyStage(userStats) : undefined;
  const suggestedQuestions = getSuggestedQuestions(pathname, journeyStage);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Panel size classes
  const panelClasses = isExpanded
    ? 'fixed inset-4 md:inset-8 z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200'
    : 'fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 w-full md:w-96 h-[80vh] md:h-[500px] md:max-h-[80vh] bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200';

  return (
    <>
      {/* Floating Help Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-teal-500 text-white shadow-lg hover:bg-teal-600 transition-colors flex items-center justify-center"
            title="Help"
          >
            <MessageCircleQuestion className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            layout
            className={panelClasses}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white shrink-0">
              <div className="flex items-center gap-2">
                {view === 'history' ? (
                  <button
                    onClick={() => setView('chat')}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    title="Back to chat"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                <span className="font-semibold">
                  {view === 'history' ? 'Recent Conversations' : 'CircleDays Help'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {view === 'chat' && (
                  <>
                    <button
                      onClick={() => setView('history')}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                      title="Recent conversations"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={startNewSession}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                      title="New conversation"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors hidden md:block"
                  title={isExpanded ? 'Minimize' : 'Expand'}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => { setIsOpen(false); setIsExpanded(false); }}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {view === 'history' ? (
              /* Session History View */
              <div className="flex-1 overflow-y-auto p-4">
                <button
                  onClick={startNewSession}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors mb-4"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium text-sm">New conversation</span>
                </button>

                {recentSessions.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">
                    No previous conversations
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => loadSpecificSession(session.id)}
                        disabled={loadingSession}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                          session.id === sessionId
                            ? 'bg-teal-50 border border-teal-200'
                            : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {session.title || 'Untitled conversation'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {formatDate(session.updatedAt)}
                          </span>
                          {session.lastPageContext && (
                            <span className="text-xs text-gray-400">
                              · {session.lastPageContext}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Chat View */
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-4">
                      <p className={`text-gray-600 mb-4 ${isExpanded ? 'text-lg' : ''}`}>
                        Hi! I&apos;m here to help you with CircleDays.
                      </p>
                      {sessionLoaded ? (
                        <>
                          <p className={`text-gray-500 mb-4 ${isExpanded ? 'text-base' : 'text-sm'}`}>
                            Try asking:
                          </p>
                          <div className={`space-y-2 ${isExpanded ? 'max-w-xl mx-auto' : ''}`}>
                            {suggestedQuestions.map((q, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setInput(q);
                                  inputRef.current?.focus();
                                }}
                                className={`block w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors ${isExpanded ? 'text-base px-4 py-3' : 'text-sm'}`}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-center py-4">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`${isExpanded ? 'max-w-[70%]' : 'max-w-[85%]'} px-4 py-2 rounded-2xl ${
                            msg.role === 'user'
                              ? 'bg-teal-500 text-white rounded-br-md'
                              : 'bg-gray-100 text-gray-800 rounded-bl-md'
                          }`}
                        >
                          <p className={`whitespace-pre-wrap ${isExpanded ? 'text-base' : 'text-sm'}`}>{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-100 shrink-0">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything..."
                      className={`flex-1 px-4 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${isExpanded ? 'py-3 text-base' : 'py-2 text-sm'}`}
                      disabled={loading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!input.trim() || loading}
                      className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className={`text-gray-400 text-center mt-2 ${isExpanded ? 'text-sm' : 'text-xs'}`}>
                    Powered by AI · May not always be accurate
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
