import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, ChatMessage } from '../types';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

interface ChatAreaProps {
  entry: JournalEntry;
}

export default function ChatArea({ entry }: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(entry.messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Keep local messages in sync with entry prop without rolling back newer optimistic messages
  useEffect(() => {
    if (entry.messages) {
      setMessages(prev => {
        if (entry.messages.length >= prev.length) {
          return entry.messages;
        }
        return prev;
      });
    }
  }, [entry.id, entry.messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
    setSaveError(null);
  }, [entry.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isTyping) return;
    if (!input.trim() || !auth.currentUser) return;

    isSubmittingRef.current = true;
    setSaveError(null);

    const userText = input.trim();
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      createdAt: Date.now(),
    };

    // Capture history BEFORE adding new user message (avoids duplicate in server call)
    const historyBeforeThisTurn = [...messages];

    // Optimistically show user message, clear input box, and show typing indicator
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    const previewText = updatedMessages.filter(m => m.role === 'user').pop()?.content.substring(0, 50) + '...' || 'New reflection';
    const isFirstMessage = messages.length === 0;
    const titleText = isFirstMessage ? userText.substring(0, 30) + '...' : entry.title;
    
    const entryRef = doc(db, 'users', auth.currentUser.uid, 'entries', entry.id);

    try {
      // 1. Save user message to Firestore with merge (non-blocking fallback)
      setDoc(entryRef, {
        messages: updatedMessages,
        preview: previewText,
        title: titleText,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch((err) => {
        console.warn('Background Firestore write error:', err);
        if (err?.code === 'permission-denied' && isMountedRef.current) {
          setSaveError('Firestore permission denied: Please ensure your Firestore Security Rules allow authenticated users.');
        }
      });

      // 2. Fetch fresh auth token
      const idToken = await auth.currentUser.getIdToken(true);

      // 3. Request Gemini response with a 40s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          prompt: userText,
          history: historyBeforeThisTurn
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errMessage = `Server returned ${response.status}`;
        try {
          const errData = await response.json();
          errMessage = errData.details || errData.error || errMessage;
        } catch {
          // Response body was not JSON
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      const aiText = data.text;
      if (!aiText) {
        throw new Error('Gemini returned an empty response. Please check your API key and quota.');
      }
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiText,
        createdAt: Date.now(),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      if (isMountedRef.current) {
        setMessages(finalMessages);
        // CRITICAL FIX: Turn off typing/buffering immediately as the response is displayed
        setIsTyping(false);
        isSubmittingRef.current = false;
        // Refocus textarea so user can immediately type the next message
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
      
      // Update Firestore with AI response in the background (non-blocking)
      setDoc(entryRef, {
        messages: finalMessages,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(err => {
        console.warn('Error saving AI response to Firestore:', err);
      });

    } catch (error: any) {
      console.error('Chat error:', error);
      if (isMountedRef.current) {
        const isAbort = error?.name === 'AbortError';
        const msg = isAbort 
          ? 'AI request timed out. Please check your network or try a shorter prompt.' 
          : (error.message || 'Failed to get AI response. Please try again.');
        setSaveError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        isSubmittingRef.current = false;
        setIsTyping(false);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0A] relative">
      {saveError && (
        <div className="absolute top-4 left-4 right-4 z-10 bg-red-900/60 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center justify-between backdrop-blur-sm shadow-xl">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-red-100">Error:</span>
            <span className="text-xs">{saveError}</span>
          </div>
          <button onClick={() => setSaveError(null)} className="text-red-300 hover:text-white font-bold ml-4 p-1">✕</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 pb-40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4 opacity-50">
            <Sparkles className="w-12 h-12 text-[#444]" />
            <h3 className="text-xl font-serif text-[#C5A059] italic">Blank Page</h3>
            <p className="text-sm text-[#555]">
              Start your reflection here. Gemini is ready to listen, summarize, and offer thoughtful prompts when you need them.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-12">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className="w-full"
              >
                {msg.role === 'user' ? (
                  <div className="mb-10">
                    <p className="text-[10px] uppercase tracking-widest text-[#555] mb-4 text-center">User Input</p>
                    <div className="font-serif text-lg leading-relaxed text-[#D1D1D1] italic border-l border-[#333] pl-6 whitespace-pre-wrap">
                      "{msg.content}"
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#161616] border border-[#262626] rounded-2xl p-8 relative">
                    <div className="absolute -top-3 left-8 px-3 bg-[#161616] border border-[#262626] text-[10px] uppercase tracking-[0.2em] text-[#C5A059]">
                      Gemini Insights
                    </div>
                    <div className="markdown-body max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="w-full">
                <div className="bg-[#161616] border border-[#262626] rounded-2xl p-8 relative">
                  <div className="absolute -top-3 left-8 px-3 bg-[#161616] border border-[#262626] text-[10px] uppercase tracking-[0.2em] text-[#C5A059]">
                    Gemini Insights
                  </div>
                  <div className="flex items-center gap-2 h-6">
                    <div className="w-1.5 h-1.5 bg-[#444] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-[#444] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-[#444] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 inset-x-0 p-4 md:p-8 bg-gradient-to-t from-[#0A0A0A] to-transparent pt-16 pointer-events-none">
        <div className="max-w-2xl mx-auto relative pointer-events-auto">
          <form 
            onSubmit={handleSubmit}
            className="relative"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!e.nativeEvent.isComposing && !isTyping && !isSubmittingRef.current && input.trim()) {
                    (e.currentTarget.form as HTMLFormElement)?.requestSubmit();
                  }
                }
              }}
              placeholder="Deepen the reflection..."
              className={`w-full bg-[#1A1A1A] border rounded-xl p-4 pr-32 text-sm text-[#E5E5E5] focus:outline-none resize-none h-24 placeholder:text-[#444] scrollbar-thin transition-colors ${isTyping ? 'border-[#C5A059]/30 opacity-60 cursor-not-allowed' : 'border-[#333] focus:border-[#C5A059]'}`}
              disabled={isTyping}
            />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <button
                type="submit"
                disabled={!input.trim() || isTyping || isSubmittingRef.current}
                className="px-4 py-2 bg-[#C5A059] text-black text-xs font-bold rounded-lg shadow-lg hover:bg-[#D5B069] disabled:opacity-50 disabled:hover:bg-[#C5A059] transition-colors"
              >
                Reflect
              </button>
            </div>
          </form>
          <div className="text-center mt-4">
            <p className="text-[10px] text-[#444] tracking-tight">
              Secured by Firebase Auth & Encrypted in Firestore
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
