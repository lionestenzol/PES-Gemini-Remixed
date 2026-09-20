import React, { useState } from 'react';
import { CapacityRecord, CommitmentCard, InpactBatteryState } from '../types.js';
import {
  Calendar as CalendarIcon,
  Clock,
  Coffee,
  Zap,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  LogOut,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface CapacityViewProps {
  capacity: CapacityRecord;
  cards: CommitmentCard[];
  onSaveCapacity: (data: Partial<CapacityRecord> & { week_of: string }) => void;
}

export type ParticipationStatus =
  | 'participate_full'
  | 'participate_partial' // show face, leave at 15-30m
  | 'skip_opt_out'
  | 'extended_recharge';

export interface TimelineBlock {
  id: string;
  startTime: string; // "08:30"
  endTime: string;   // "09:30"
  startMinutes: number; // minutes from midnight
  durationMinutes: number;
  title: string;
  category: 'meeting' | 'lunch' | 'focus' | 'buffer' | 'personal' | 'shutdown';
  modeAdaptations: Record<
    InpactBatteryState,
    {
      title: string;
      durationMinutes: number;
      participation: ParticipationStatus;
      participationNote: string;
      color: string;
    }
  >;
  userParticipationOverride?: ParticipationStatus;
  note?: string;
}

// Initial realistic full-day schedule baseline
const INITIAL_TIMELINE: TimelineBlock[] = [
  {
    id: 'block-1',
    startTime: '08:00',
    endTime: '08:45',
    startMinutes: 8 * 60,
    durationMinutes: 45,
    title: 'Morning Calibration & Physical Paper Ritual',
    category: 'personal',
    modeAdaptations: {
      A: {
        title: 'Full Day Tactical Priming',
        durationMinutes: 45,
        participation: 'participate_full',
        participationNote: 'Primed for 3 high-leverage outputs',
        color: 'bg-amber-100/70 border-amber-300 text-amber-900',
      },
      B: {
        title: 'Paper Ritual & Day Setup',
        durationMinutes: 45,
        participation: 'participate_full',
        participationNote: 'Standard calibration',
        color: 'bg-blue-100/70 border-blue-300 text-blue-900',
      },
      C: {
        title: 'Gentle Coffee & Survival Plan',
        durationMinutes: 30,
        participation: 'participate_full',
        participationNote: 'Pick 1 single task only',
        color: 'bg-emerald-100/70 border-emerald-300 text-emerald-900',
      },
      D: {
        title: 'Protected Quiet Rest & Coffee',
        durationMinutes: 60,
        participation: 'extended_recharge',
        participationNote: 'Zero expectations. Walk or sit outside.',
        color: 'bg-purple-100/70 border-purple-300 text-purple-900',
      },
    },
  },
  {
    id: 'block-2',
    startTime: '09:00',
    endTime: '10:15',
    startMinutes: 9 * 60,
    durationMinutes: 75,
    title: 'Core Priority Execution Window',
    category: 'focus',
    modeAdaptations: {
      A: {
        title: 'Heavy Sprint: Core Task #1',
        durationMinutes: 75,
        participation: 'participate_full',
        participationNote: 'Deep uninterrupted work',
        color: 'bg-amber-100/80 border-amber-400 text-amber-950 font-semibold',
      },
      B: {
        title: 'Standard Work: Core Task #1',
        durationMinutes: 60,
        participation: 'participate_full',
        participationNote: 'Steady progress with 15m buffer',
        color: 'bg-blue-100/80 border-blue-300 text-blue-950',
      },
      C: {
        title: 'Micro-Step: Just start 15 mins',
        durationMinutes: 30,
        participation: 'participate_partial',
        participationNote: 'Stop the moment friction spikes',
        color: 'bg-emerald-100/80 border-emerald-300 text-emerald-950',
      },
      D: {
        title: 'Passive Inbox Glance (No commitments)',
        durationMinutes: 20,
        participation: 'skip_opt_out',
        participationNote: 'Offload to The Line for tomorrow',
        color: 'bg-purple-100/60 border-purple-300 text-purple-900',
      },
    },
  },
  {
    id: 'block-3',
    startTime: '10:30',
    endTime: '11:45',
    startMinutes: 10 * 60 + 30,
    durationMinutes: 75,
    title: 'Department Sync & Corporate Headlight Meeting',
    category: 'meeting',
    modeAdaptations: {
      A: {
        title: 'Active Meeting Participation',
        durationMinutes: 75,
        participation: 'participate_full',
        participationNote: 'Full presence, take action items',
        color: 'bg-amber-100/70 border-amber-300 text-amber-900',
      },
      B: {
        title: 'Attend Meeting Normally',
        durationMinutes: 75,
        participation: 'participate_full',
        participationNote: 'Listen for direct dependencies',
        color: 'bg-blue-100/70 border-blue-300 text-blue-900',
      },
      C: {
        title: 'Show Face & Ghost at 30m',
        durationMinutes: 30,
        participation: 'participate_partial',
        participationNote: 'Say hello, confirm status, bow out early to preserve energy',
        color: 'bg-emerald-100/80 border-emerald-300 text-emerald-950 font-medium',
      },
      D: {
        title: 'Decline / Async Notes Only',
        durationMinutes: 0,
        participation: 'skip_opt_out',
        participationNote: 'Do not attend. Read summary doc later.',
        color: 'bg-slate-100 border-dashed border-slate-300 text-slate-400 line-through',
      },
    },
  },
  {
    id: 'block-4',
    startTime: '12:00',
    endTime: '13:30',
    startMinutes: 12 * 60,
    durationMinutes: 90,
    title: 'Lunch & Cognitive Reset Window',
    category: 'lunch',
    modeAdaptations: {
      A: {
        title: 'Standard Fuel & Quick Walk (45m)',
        durationMinutes: 45,
        participation: 'participate_full',
        participationNote: 'Eat, brief walk, back in zone',
        color: 'bg-amber-50 border-amber-200 text-amber-900',
      },
      B: {
        title: 'Balanced Lunch & Break (60m)',
        durationMinutes: 60,
        participation: 'participate_full',
        participationNote: 'Proper break away from screen',
        color: 'bg-blue-50 border-blue-200 text-blue-900',
      },
      C: {
        title: 'Extended Restorative Lunch (90m)',
        durationMinutes: 90,
        participation: 'extended_recharge',
        participationNote: 'Planned extended lunch: get in the right mental space',
        color: 'bg-purple-100/90 border-purple-300 text-purple-950 font-bold',
      },
      D: {
        title: 'Deep Recharging Lunch & Nap / Walk (90m+)',
        durationMinutes: 90,
        participation: 'extended_recharge',
        participationNote: 'Complete biological recharge. No guilt.',
        color: 'bg-purple-200/80 border-purple-400 text-purple-950 font-bold',
      },
    },
  },
  {
    id: 'block-5',
    startTime: '14:00',
    endTime: '15:30',
    startMinutes: 14 * 60,
    durationMinutes: 90,
    title: 'Afternoon Operational Window',
    category: 'focus',
    modeAdaptations: {
      A: {
        title: 'Output Sprint #2: Critical Deliverable',
        durationMinutes: 90,
        participation: 'participate_full',
        participationNote: 'High momentum carry-through',
        color: 'bg-amber-100/80 border-amber-300 text-amber-950 font-semibold',
      },
      B: {
        title: 'Core Task #2 / Code & Review',
        durationMinutes: 75,
        participation: 'participate_full',
        participationNote: 'Solid execution block',
        color: 'bg-blue-100/80 border-blue-300 text-blue-950',
      },
      C: {
        title: 'Low-Effort Admin / Email Cleanup',
        durationMinutes: 45,
        participation: 'participate_partial',
        participationNote: 'Easy mechanical work only',
        color: 'bg-emerald-100/70 border-emerald-300 text-emerald-900',
      },
      D: {
        title: 'Reading / Casual Research / Passive Rest',
        durationMinutes: 30,
        participation: 'extended_recharge',
        participationNote: 'Zero deliverables pressure',
        color: 'bg-purple-100/70 border-purple-300 text-purple-900',
      },
    },
  },
  {
    id: 'block-6',
    startTime: '16:00',
    endTime: '17:00',
    startMinutes: 16 * 60,
    durationMinutes: 60,
    title: 'Cross-Team Review & Check-ins',
    category: 'meeting',
    modeAdaptations: {
      A: {
        title: 'Team Sync & Alignment',
        durationMinutes: 60,
        participation: 'participate_full',
        participationNote: 'Unblock dependencies',
        color: 'bg-amber-100/70 border-amber-300 text-amber-900',
      },
      B: {
        title: 'Quick 30m Check-in',
        durationMinutes: 30,
        participation: 'participate_partial',
        participationNote: 'Share brief update',
        color: 'bg-blue-100/70 border-blue-300 text-blue-900',
      },
      C: {
        title: 'Send Slack Update & Skip',
        durationMinutes: 10,
        participation: 'skip_opt_out',
        participationNote: 'Post bullet points, skip the voice call',
        color: 'bg-emerald-100/70 border-emerald-300 text-emerald-900',
      },
      D: {
        title: 'Offline / Completely Opt Out',
        durationMinutes: 0,
        participation: 'skip_opt_out',
        participationNote: 'Rest day active. No meetings.',
        color: 'bg-slate-100 border-dashed border-slate-300 text-slate-400 line-through',
      },
    },
  },
  {
    id: 'block-7',
    startTime: '17:30',
    endTime: '18:15',
    startMinutes: 17 * 60 + 30,
    durationMinutes: 45,
    title: 'Day Close, Proof Ledger & System Shutdown',
    category: 'shutdown',
    modeAdaptations: {
      A: {
        title: 'Verify Proof & Lock Ledger for Tomorrow',
        durationMinutes: 45,
        participation: 'participate_full',
        participationNote: 'Log completed proof, clear queue',
        color: 'bg-slate-900 text-white border-slate-900 font-bold',
      },
      B: {
        title: 'Standard Shutdown & Paper Check',
        durationMinutes: 30,
        participation: 'participate_full',
        participationNote: 'Cross off finished tasks',
        color: 'bg-slate-800 text-white border-slate-800',
      },
      C: {
        title: 'Instant 5-Minute Shutdown',
        durationMinutes: 10,
        participation: 'participate_partial',
        participationNote: 'Drop remaining thoughts into DropList, close laptop',
        color: 'bg-emerald-800 text-white border-emerald-800',
      },
      D: {
        title: 'Evening Free / Complete Disconnect',
        durationMinutes: 0,
        participation: 'extended_recharge',
        participationNote: 'Already off the grid. Enjoy your evening.',
        color: 'bg-purple-900 text-white border-purple-900',
      },
    },
  },
];

export const CapacityView: React.FC<CapacityViewProps> = ({
  capacity,
  cards,
  onSaveCapacity,
}) => {
  // Current active calendar track
  const [activeMode, setActiveMode] = useState<InpactBatteryState>('B');
  const [timeline, setTimeline] = useState<TimelineBlock[]>(INITIAL_TIMELINE);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Current time scrubber simulation
  const [currentHour] = useState<string>('11:15');

  // Toggle user participation on a specific block
  const setBlockParticipation = (blockId: string, status: ParticipationStatus) => {
    setTimeline((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, userParticipationOverride: status } : b))
    );
  };

  const selectedBlock = timeline.find((b) => b.id === selectedBlockId);

  // Compute stats for current mode
  const totalModeMinutes = timeline.reduce((acc, b) => {
    const override = b.userParticipationOverride;
    if (override === 'skip_opt_out') return acc;
    if (override === 'participate_partial') return acc + Math.round(b.durationMinutes * 0.4);
    if (override === 'extended_recharge') return acc + 90;
    const adapt = b.modeAdaptations[activeMode];
    return acc + adapt.durationMinutes;
  }, 0);

  const totalModeHours = (totalModeMinutes / 60).toFixed(1);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] text-slate-900 py-6 px-3 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Control Bar: The 4 Calendar Modes Toggle (A / B / C / D) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-900 text-white tracking-wide">
                  INPACT 4-TRACK CALENDAR
                </span>
                <span className="text-xs text-slate-500 font-mono">Reality-Constrained Day Orchestrator</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
                Your Whole Day Scheduled in Reality
              </h1>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                Toggle between the 4 calendar tracks. Watch the whole day reshape automatically.
                Tap any block to decide whether to <strong>fully attend</strong>, <strong>leave early (show face)</strong>,{' '}
                <strong>take a 90m long lunch</strong>, or <strong>opt out completely</strong>.
              </p>
            </div>

            {/* The 4 Calendar Track Switcher */}
            <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex items-center space-x-1 self-start md:self-center">
              {(
                [
                  { mode: 'A', label: 'Mode A', sub: 'High Output', color: 'text-amber-700 bg-amber-50 border-amber-300' },
                  { mode: 'B', label: 'Mode B', sub: 'Solid Steady', color: 'text-blue-700 bg-blue-50 border-blue-300' },
                  { mode: 'C', label: 'Mode C', sub: 'Low Friction', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                  { mode: 'D', label: 'Mode D', sub: 'Recovery', color: 'text-purple-700 bg-purple-50 border-purple-300' },
                ] as const
              ).map(({ mode, label, sub, color }) => {
                const isActive = activeMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setActiveMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-300 ring-1 ring-slate-900/10'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          mode === 'A'
                            ? 'bg-amber-500'
                            : mode === 'B'
                            ? 'bg-blue-500'
                            : mode === 'C'
                            ? 'bg-emerald-500'
                            : 'bg-purple-500'
                        }`}
                      />
                      <span className="font-bold">{label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-sans font-normal">{sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Context Summary Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 font-mono text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Active Track: <strong className="text-slate-900">Mode {activeMode} Calendar</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Total Day Demand: <strong className="text-slate-900">{totalModeHours} hours</strong>
              </span>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Full
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Show Face (Early Exit)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> 90m Lunch / Recharge
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" /> Opt Out
              </span>
            </div>
          </div>
        </div>

        {/* The Google Calendar-Style Day Timeline View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Calendar Timeline (2 Columns on Large) */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900">Today's Chronological Day Stream</h2>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                Current Time: ~{currentHour} AM
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {timeline.map((block) => {
                const adaptation = block.modeAdaptations[activeMode];
                const activeParticipation = block.userParticipationOverride || adaptation.participation;
                const isSelected = selectedBlockId === block.id;

                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'ring-2 ring-slate-900 border-slate-400 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start space-x-3">
                        {/* Time Column */}
                        <div className="w-24 shrink-0 font-mono text-xs">
                          <span className="font-bold text-slate-800">{block.startTime}</span>
                          <span className="text-slate-400"> – {block.endTime}</span>
                          <span className="block text-[10px] text-slate-400 uppercase">{block.category}</span>
                        </div>

                        {/* Event Content */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-xs font-bold text-slate-900">{adaptation.title}</h3>
                            {activeParticipation === 'skip_opt_out' && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 line-through">
                                Opted Out
                              </span>
                            )}
                            {activeParticipation === 'participate_partial' && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                                Show Face (Early Exit)
                              </span>
                            )}
                            {activeParticipation === 'extended_recharge' && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                                90m Rest Window
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {adaptation.participationNote}
                          </p>
                        </div>
                      </div>

                      {/* Quick Participation Action Badges */}
                      <div className="flex items-center space-x-1 shrink-0 self-end sm:self-center font-mono text-[11px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlockParticipation(block.id, 'participate_full');
                          }}
                          className={`px-2 py-0.5 rounded transition-colors ${
                            activeParticipation === 'participate_full'
                              ? 'bg-slate-900 text-white font-bold'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Full presence"
                        >
                          Full
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlockParticipation(block.id, 'participate_partial');
                          }}
                          className={`px-2 py-0.5 rounded transition-colors ${
                            activeParticipation === 'participate_partial'
                              ? 'bg-amber-500 text-white font-bold'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Show face and leave early"
                        >
                          Show Face
                        </button>
                        {block.category === 'lunch' || block.category === 'personal' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBlockParticipation(block.id, 'extended_recharge');
                            }}
                            className={`px-2 py-0.5 rounded transition-colors ${
                              activeParticipation === 'extended_recharge'
                                ? 'bg-purple-600 text-white font-bold'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Take long 90m lunch/break to get in mental space"
                          >
                            90m Lunch
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBlockParticipation(block.id, 'skip_opt_out');
                            }}
                            className={`px-2 py-0.5 rounded transition-colors ${
                              activeParticipation === 'skip_opt_out'
                                ? 'bg-rose-600 text-white font-bold'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Opt out / skip / decline"
                          >
                            Skip
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Tactical Participation Inspector & "Where You Participate" Controller */}
          <div className="space-y-4">
            {selectedBlock ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">Selected Event</span>
                    <h3 className="text-sm font-bold text-slate-900">{selectedBlock.title}</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedBlock.startTime} – {selectedBlock.endTime}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                    Choose Your Participation Level:
                  </label>
                  <p className="text-xs text-slate-500">
                    You don't have to suffer through corporate rituals. Decide where you show up and where you protect your peace:
                  </p>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => setBlockParticipation(selectedBlock.id, 'participate_full')}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        (selectedBlock.userParticipationOverride || selectedBlock.modeAdaptations[activeMode].participation) ===
                        'participate_full'
                          ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">1. Fully Participate</span>
                        <span className="text-[10px] font-mono text-slate-500">Standard</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Attend for the entire duration with active engagement.
                      </p>
                    </button>

                    <button
                      onClick={() => setBlockParticipation(selectedBlock.id, 'participate_partial')}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        (selectedBlock.userParticipationOverride || selectedBlock.modeAdaptations[activeMode].participation) ===
                        'participate_partial'
                          ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950">2. Show Face & Ghost (Leave Early)</span>
                        <span className="text-[10px] font-mono text-amber-800 font-semibold">Tactical</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Log in for 15–20 minutes, say hello, confirm your status, and bow out before circular debates start.
                      </p>
                    </button>

                    <button
                      onClick={() => setBlockParticipation(selectedBlock.id, 'extended_recharge')}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        (selectedBlock.userParticipationOverride || selectedBlock.modeAdaptations[activeMode].participation) ===
                        'extended_recharge'
                          ? 'border-purple-500 bg-purple-50/60 ring-1 ring-purple-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-950">3. Planned 90m Rest / Lunch</span>
                        <span className="text-[10px] font-mono text-purple-800 font-semibold">Recovery</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Take a generous 90-minute break. Step into environmental space to get in the right mental headspace.
                      </p>
                    </button>

                    <button
                      onClick={() => setBlockParticipation(selectedBlock.id, 'skip_opt_out')}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        (selectedBlock.userParticipationOverride || selectedBlock.modeAdaptations[activeMode].participation) ===
                        'skip_opt_out'
                          ? 'border-rose-500 bg-rose-50/60 ring-1 ring-rose-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-950">4. Completely Opt Out (Decline)</span>
                        <span className="text-[10px] font-mono text-rose-800 font-semibold">Zero Guilt</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Protect your cognitive battery. Read meeting minutes asynchronously or skip altogether.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2 text-slate-500">
                <Coffee className="w-8 h-8 mx-auto text-slate-400" />
                <h4 className="text-xs font-bold text-slate-800">Tap Any Event to Control Participation</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click on any meeting or time block in your day stream to decide if you want to attend fully, show face and leave early, or take a long lunch.
                </p>
              </div>
            )}

            {/* Tactical Wisdom & Unasked Check-in Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  Autonomous Guardian
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If you haven't opened the app by <strong>1:30 PM</strong>, INPACT won't lecture you or send guilty notifications. It will gently ask:
              </p>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-xs text-slate-200 font-mono italic">
                "Did morning meetings drain your battery? Downshifting afternoon to Mode C. Take a breath."
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
