import React from 'react';
import { JournalEntry, User } from '../types';
import { format } from 'date-fns';
import { Plus, LogOut, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { getMoodEmoji } from './MoodInsights';

const MOOD_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'joyful', label: '😊', title: 'Joyful' },
  { value: 'calm', label: '😌', title: 'Calm' },
  { value: 'reflective', label: '🤔', title: 'Reflective' },
  { value: 'anxious', label: '😰', title: 'Anxious' },
  { value: 'sad', label: '😢', title: 'Sad' },
  { value: 'energized', label: '⚡', title: 'Energized' },
];

interface SidebarProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onCreateNew: () => void;
  user: User;
  onLogout: () => void;
  moodFilter: string;
  onMoodFilterChange: (mood: string) => void;
}

export default function Sidebar({ entries, activeEntryId, onSelectEntry, onDeleteEntry, onCreateNew, user, onLogout, moodFilter, onMoodFilterChange }: SidebarProps) {
  const filteredEntries = moodFilter === 'all'
    ? entries
    : entries.filter(e => e.mood === moodFilter);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-[#262626] shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#C5A059] to-[#8E6F3E] flex items-center justify-center shadow-lg">
            <span className="text-black font-bold text-xs">A</span>
          </div>
          <h1 className="text-lg font-serif italic tracking-wide text-[#C5A059]">Aurelius</h1>
        </div>
        <button
          onClick={onCreateNew}
          className="w-full py-3 bg-[#1A1A1A] border border-[#333] rounded text-sm font-medium text-[#E5E5E5] hover:bg-[#222] transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Reflection</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#666] mb-3 px-2 mt-2">Recent History</h2>
        
        {/* Mood Filter Chips */}
        <div className="flex flex-wrap gap-1 px-2 mb-4">
          {MOOD_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => onMoodFilterChange(f.value)}
              title={f.title || f.label}
              className={cn(
                "px-2 py-1 rounded-full text-[10px] transition-all border",
                moodFilter === f.value
                  ? "bg-[#C5A059]/20 border-[#C5A059]/50 text-[#C5A059]"
                  : "bg-[#1A1A1A] border-[#262626] text-[#666] hover:border-[#444] hover:text-[#999]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-[#555]">
            {moodFilter === 'all' 
              ? 'No entries yet. Start writing your first reflection!' 
              : `No ${moodFilter} entries found.`}
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div
              key={entry.id}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors group flex items-start justify-between gap-2",
                activeEntryId === entry.id 
                  ? "bg-[#1C1C1C] border-l-2 border-[#C5A059]" 
                  : "hover:bg-[#1A1A1A] border-l-2 border-transparent"
              )}
            >
              <button
                onClick={() => onSelectEntry(entry.id)}
                className="flex-1 text-left min-w-0"
              >
                <div className="flex items-center gap-1.5">
                  {entry.mood && (
                    <span className="text-xs shrink-0" title={entry.mood}>
                      {getMoodEmoji(entry.mood)}
                    </span>
                  )}
                  <p className={cn(
                    "text-sm font-serif truncate",
                    activeEntryId === entry.id ? "text-[#E5E5E5]" : "text-[#A1A1A1] group-hover:text-[#E5E5E5]"
                  )}>{entry.title}</p>
                </div>
                <p className="text-[10px] text-[#666] mt-1">
                  {format(entry.updatedAt, 'MMM d • h:mm a')}
                </p>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEntry(entry.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-[#666] hover:text-red-400 hover:bg-red-400/10 rounded transition-all shrink-0"
                title="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-6 border-t border-[#262626] bg-[#0F0F0F] shrink-0">
        <div className="flex items-center gap-3 mb-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-[#444]" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#333] border border-[#444] flex items-center justify-center text-xs font-bold text-[#E5E5E5]">
              {user.email?.[0].toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#E5E5E5] truncate">{user.displayName || 'User'}</p>
            <p className="text-[10px] text-[#666] truncate">Free Tier Account</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-2 text-xs text-[#888] hover:text-[#C5A059] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
