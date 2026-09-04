import React from 'react';
import { JournalEntry } from '../types';
import { TrendingUp } from 'lucide-react';

interface MoodInsightsProps {
  entries: JournalEntry[];
}

const MOOD_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  joyful:     { emoji: '😊', color: '#F59E0B', label: 'Joyful' },
  calm:       { emoji: '😌', color: '#3B82F6', label: 'Calm' },
  reflective: { emoji: '🤔', color: '#8B5CF6', label: 'Reflective' },
  anxious:    { emoji: '😰', color: '#EF4444', label: 'Anxious' },
  sad:        { emoji: '😢', color: '#6B7280', label: 'Sad' },
  energized:  { emoji: '⚡', color: '#10B981', label: 'Energized' },
};

export function getMoodConfig(mood?: string) {
  return mood && MOOD_CONFIG[mood] ? MOOD_CONFIG[mood] : null;
}

export function getMoodEmoji(mood?: string) {
  return getMoodConfig(mood)?.emoji || '';
}

export default function MoodInsights({ entries }: MoodInsightsProps) {
  const entriesWithMood = entries.filter(e => e.mood && MOOD_CONFIG[e.mood]);

  if (entriesWithMood.length === 0) {
    return null;
  }

  // Count mood distribution
  const moodCounts: Record<string, number> = {};
  for (const entry of entriesWithMood) {
    const mood = entry.mood!;
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;
  }

  const totalMoods = entriesWithMood.length;

  // Sort moods by count descending
  const sortedMoods = Object.entries(moodCounts)
    .sort(([, a], [, b]) => b - a);

  // Determine dominant mood
  const dominantMood = sortedMoods[0]?.[0];
  const dominantConfig = dominantMood ? MOOD_CONFIG[dominantMood] : null;

  // Recent mood timeline (last 10 entries)
  const recentEntries = entriesWithMood.slice(0, 10);

  // Calculate streak
  let streakMood = recentEntries[0]?.mood;
  let streakCount = 0;
  for (const entry of recentEntries) {
    if (entry.mood === streakMood) {
      streakCount++;
    } else {
      break;
    }
  }

  return (
    <div className="mx-4 mb-4 bg-[#161616] border border-[#262626] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-3.5 h-3.5 text-[#C5A059]" />
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-medium">
          Mood Insights
        </h3>
      </div>

      {/* Recent mood timeline */}
      <div className="flex items-center gap-1.5 mb-3">
        {recentEntries.map((entry, i) => {
          const config = getMoodConfig(entry.mood);
          if (!config) return null;
          return (
            <div
              key={entry.id}
              className="group relative"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] cursor-default transition-transform hover:scale-125"
                style={{ backgroundColor: config.color + '20', border: `1.5px solid ${config.color}40` }}
                title={`${config.label} — ${entry.title}`}
              >
                {config.emoji}
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#222] border border-[#333] rounded text-[9px] text-[#A1A1A1] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {config.label}
              </div>
            </div>
          );
        })}
        {entriesWithMood.length > 10 && (
          <span className="text-[9px] text-[#555] ml-1">+{entriesWithMood.length - 10}</span>
        )}
      </div>

      {/* Distribution bars */}
      <div className="space-y-1.5 mb-3">
        {sortedMoods.slice(0, 4).map(([mood, count]) => {
          const config = MOOD_CONFIG[mood];
          const pct = Math.round((count / totalMoods) * 100);
          return (
            <div key={mood} className="flex items-center gap-2">
              <span className="text-[10px] w-4 text-center">{config.emoji}</span>
              <div className="flex-1 h-1.5 bg-[#222] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: config.color + '80' }}
                />
              </div>
              <span className="text-[9px] text-[#666] w-7 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Streak */}
      {streakCount >= 2 && dominantConfig && streakMood && (
        <div className="text-[10px] text-[#555] border-t border-[#262626] pt-2">
          <span className="text-[#888]">Current streak:</span>{' '}
          <span style={{ color: MOOD_CONFIG[streakMood].color }}>
            {streakCount} entries mostly {MOOD_CONFIG[streakMood].label.toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}
