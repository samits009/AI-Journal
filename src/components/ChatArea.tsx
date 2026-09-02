import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, ChatMessage } from '../types';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isTyping]);

  useEffect(() => {
    // Instantly focus the text area when the chat window opens
    inputRef.current?.focus();
    setSaveError(null);
  }, [entry.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !auth.currentUser) return;
    setSaveError(null);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: Date.now(),
    };

    const newMessages = [...entry.messages, userMessage];
    const previewText = newMessages.filter(m => m.role === 'user').pop()?.content.substring(0, 50) + '...' || 'New reflection';
    const isFirstMessage = entry.messages.length === 0;
    const titleText = isFirstMessage ? userMessage.content.substring(0, 30) + '...' : entry.title;
    
    const entryRef = doc(db, 'users', auth.currentUser.uid, 'entries', entry.id);

    setIsTyping(true);
    const originalInput = input;

    try {
      // Save user message immediately
      await updateDoc(entryRef, {
        messages: newMessages,
        preview: previewText,
        title: titleText,
        updatedAt: serverTimestamp()
      });
      
      // ONLY clear input after successful database write
      setInput('');

      const idToken = await auth.currentUser.getIdToken();
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          history: entry.messages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.text,
        createdAt: Date.now(),
      };

      const finalMessages = [...newMessages, aiMessage];
      
      // Update with AI response
      await updateDoc(entryRef, {
        messages: finalMessages,
        updatedAt: serverTimestamp()
      });

    } catch (error: any) {
      console.error('Chat error:', error);
      setSaveError(error.message || 'Failed to save reflection or get AI response. Please try again.');
      if (!input) setInput(originalInput); // restore input if it was cleared
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0A] relative">
      {saveError && (
        <div className="absolute top-4 left-4 right-4 z-10 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center justify-between backdrop-blur-sm">
          <span className="text-sm font-medium">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-300 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 pb-40">
        {entry.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4 opacity-50">
            <Sparkles className="w-12 h-12 text-[#444]" />
            <h3 className="text-xl font-serif text-[#C5A059] italic">Blank Page</h3>
            <p className="text-sm text-[#555]">
              Start your reflection here. Gemini is ready to listen, summarize, and offer thoughtful prompts when you need them.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-12">
            {entry.messages.map((msg) => (
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
                  handleSubmit(e);
                }
              }}
              placeholder="Deepen the reflection..."
              className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl p-4 pr-32 text-sm text-[#E5E5E5] focus:outline-none focus:border-[#C5A059] resize-none h-24 placeholder:text-[#444] scrollbar-thin transition-colors"
              disabled={isTyping}
            />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
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
