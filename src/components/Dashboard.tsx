import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { JournalEntry, ChatMessage } from '../types';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import MoodInsights from './MoodInsights';
import { Menu, PanelLeft } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [moodFilter, setMoodFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const q = query(entriesRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: user.uid,
          title: data.title || 'Untitled',
          preview: data.preview || '',
          messages: data.messages || [],
          mood: data.mood || undefined,
          moodSummary: data.moodSummary || undefined,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          updatedAt: data.updatedAt?.toMillis() || Date.now(),
        } as JournalEntry;
      });
      setEntries(fetched);
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleCreateNew = async () => {
    if (!user) return;
    const newEntryRef = doc(collection(db, 'users', user.uid, 'entries'));
    const newEntry = {
      title: 'New Reflection',
      preview: '',
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Optimistically update the UI instantly without waiting for the network
    setEntries(prev => [{
      id: newEntryRef.id,
      userId: user.uid,
      title: newEntry.title,
      preview: newEntry.preview,
      messages: newEntry.messages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }, ...prev]);
    
    setActiveEntryId(newEntryRef.id);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    
    // Perform the actual network write in the background
    await setDoc(newEntryRef, newEntry);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!user) return;
    
    // Optimistic delete
    setEntries(prev => prev.filter(e => e.id !== id));
    if (activeEntryId === id) {
      setActiveEntryId(null);
    }
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'entries', id));
    } catch(err) {
      console.error('Failed to delete:', err);
    }
  };

  const activeEntry = entries.find(e => e.id === activeEntryId) || null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex overflow-hidden text-[#E5E5E5]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 bg-[#121212] border-[#262626] transition-all duration-300 z-30 flex flex-col shrink-0 overflow-hidden ${
        sidebarOpen 
          ? 'translate-x-0 w-72 border-r' 
          : '-translate-x-full w-72 md:w-0 md:translate-x-0 md:border-r-0'
      }`}>
        <div className="w-72 flex-1 flex flex-col h-full overflow-hidden">
          <Sidebar 
            entries={entries} 
            activeEntryId={activeEntryId} 
            onSelectEntry={(id) => { 
              setActiveEntryId(id); 
              if (window.innerWidth < 768) setSidebarOpen(false); 
            }} 
            onDeleteEntry={handleDeleteEntry}
            onCreateNew={handleCreateNew}
            user={user!}
            onLogout={logout}
            moodFilter={moodFilter}
            onMoodFilterChange={setMoodFilter}
          />
          {/* Mood Insights Panel - collapsible at bottom of sidebar */}
          <MoodInsights entries={entries} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-16 border-b border-[#262626] bg-[#0D0D0D] flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 text-[#666] hover:text-[#C5A059] rounded-lg"
            >
              <PanelLeft className="w-5 h-5 hidden md:block" />
              <Menu className="w-5 h-5 md:hidden" />
            </button>
            <span className="hidden md:inline text-[10px] uppercase tracking-widest text-[#666]">Current Session</span>
            <span className="hidden md:inline text-[#C5A059]">•</span>
            <h3 className="text-sm font-serif italic truncate">{activeEntry ? activeEntry.title : 'Aurelius'}</h3>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative flex flex-col">
          {activeEntry ? (
            <ChatArea key={activeEntry.id} entry={activeEntry} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 bg-[#161616] border border-[#262626] rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                <span className="text-2xl">🏛️</span>
              </div>
              <h2 className="text-2xl font-serif text-[#C5A059] italic">Welcome to your space</h2>
              <p className="text-[#666] text-sm max-w-sm">
                Select a past reflection from the sidebar, or start a new one to begin journaling with Gemini.
              </p>
              <button 
                onClick={handleCreateNew}
                className="mt-4 px-6 py-2.5 bg-[#C5A059] text-black text-xs font-bold rounded-lg shadow-lg hover:bg-[#D5B069] transition-colors"
              >
                + New Reflection
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
