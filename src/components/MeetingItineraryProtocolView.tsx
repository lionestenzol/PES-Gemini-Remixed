import React, { useState } from 'react';
import { MeetingItineraryItem, MeetingPosture, DayPredictionForecast } from '../types/itinerary.js';
import { INITIAL_MEETINGS } from '../lib/firestore-service.js';
import { ExecutionMeetingProtocolView } from './ExecutionMeetingProtocolView.js';
import {
  Calendar,
  Clock,
  LogOut,
  Shield,
  Zap,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Plus,
  Trash2,
  HelpCircle,
  Coffee,
  CheckCircle2,
  Terminal,
  Users,
} from 'lucide-react';

interface MeetingItineraryProps {
  onApplyPostureToInpact?: (mode: 'A' | 'B' | 'C' | 'D') => void;
  onCommitToBoard?: (taskTitle: string, durationMin: number, proof: string) => void;
  onOpenStuckFeature?: (frictionPoint: string) => void;
}

export const MeetingItineraryProtocolView: React.FC<MeetingItineraryProps> = ({
  onApplyPostureToInpact,
  onCommitToBoard,
  onOpenStuckFeature,
}) => {
  // Mode toggle: Execution Protocol (Human + AI v1.0) vs Schedule Postures & Prediction Engine
  const [activeProtocolSubMode, setActiveProtocolSubMode] = useState<
    'execution_protocol' | 'schedule_posture'
  >('execution_protocol');

  const [meetings, setMeetings] = useState<MeetingItineraryItem[]>(INITIAL_MEETINGS);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(meetings[0]?.id || '');
  const [copiedExitScriptId, setCopiedExitScriptId] = useState<string | null>(null);

  // New meeting creation
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('02:00 PM – 02:45 PM');
  const [newOrganizer, setNewOrganizer] = useState('');
  const [newAgenda, setNewAgenda] = useState('');

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId) || meetings[0];

  // Prediction Engine Calculation:
  // Dynamically calculate the day's energy forecast based on meeting postures & drains
  const calculatePrediction = (): DayPredictionForecast => {
    let totalDrain = 0;
    let totalMeetingMinutes = 0;
    let ghostedOrSavedMinutes = 0;
    const frictionPoints: string[] = [];

    meetings.forEach((m) => {
      let activeMinutes = m.durationMinutes;
      if (m.chosenPosture === 'Strategic_Ghost' || m.chosenPosture === 'Async_Decline') {
        ghostedOrSavedMinutes += m.durationMinutes;
        activeMinutes = 0;
      } else if (m.chosenPosture === 'Show_Face_Early') {
        const exitMin = m.tacticalExitMinute || 20;
        ghostedOrSavedMinutes += Math.max(0, m.durationMinutes - exitMin);
        activeMinutes = exitMin;
        totalDrain += m.energyDrainScore * 0.4;
      } else if (m.chosenPosture === 'Passive_Listener') {
        totalDrain += m.energyDrainScore * 0.5;
      } else {
        totalDrain += m.energyDrainScore;
      }

      totalMeetingMinutes += activeMinutes;

      if (m.energyDrainScore >= 7 && m.chosenPosture === 'Full_Presence') {
        frictionPoints.push(`High cognitive drain in "${m.title}" (${m.durationMinutes} min full presence).`);
      }
    });

    if (totalMeetingMinutes > 180) {
      frictionPoints.push('Over 3 hours in active calls creates task fragmentation and wipes single-active focus.');
    }

    // Energy Surplus Score (0 - 100)
    const baseEnergy = 100;
    const computedEnergy = Math.max(15, Math.min(95, Math.round(baseEnergy - totalDrain * 3.5 + ghostedOrSavedMinutes * 0.25)));

    let risk: 'Low' | 'Moderate' | 'High' | 'Critical' = 'Low';
    let recommendedMode: 'A' | 'B' | 'C' | 'D' = 'B';

    if (computedEnergy < 40) {
      risk = 'Critical';
      recommendedMode = 'D';
    } else if (computedEnergy < 60) {
      risk = 'High';
      recommendedMode = 'C';
    } else if (computedEnergy < 80) {
      risk = 'Moderate';
      recommendedMode = 'B';
    } else {
      risk = 'Low';
      recommendedMode = 'A';
    }

    // Battery Drain Curve throughout the day
    const batteryDrainForecast = [
      { hour: '08:00 AM', batteryLevel: 100, primaryDrain: 'Morning Calm' },
      { hour: '10:00 AM', batteryLevel: Math.max(20, Math.round(100 - totalDrain * 1.0)), primaryDrain: 'Morning Sync' },
      { hour: '12:00 PM', batteryLevel: Math.max(15, Math.round(90 - totalDrain * 1.8)), primaryDrain: 'Architecture Review' },
      { hour: '02:00 PM', batteryLevel: Math.max(25, Math.round(80 - totalDrain * 2.5 + (ghostedOrSavedMinutes > 30 ? 15 : 0))), primaryDrain: 'Post-Lunch Rest' },
      { hour: '05:00 PM', batteryLevel: computedEnergy, primaryDrain: 'Final Shutdown' },
    ];

    let strategicAdvice = 'Your schedule is protected. Focus on high-leverage deliverables in uninterrupted blocks.';
    if (recommendedMode === 'C') {
      strategicAdvice = 'Downshift to Mode C: Pick only 1 core physical task this afternoon. Keep tactical exit scripts ready.';
    } else if (recommendedMode === 'D') {
      strategicAdvice = 'Meeting overload detected. Execute strategic ghosts on non-essential calls and take a 90-minute restorative lunch.';
    }

    return {
      energySurplusScore: computedEnergy,
      riskOfBurnout: risk,
      recommendedInpactMode: recommendedMode,
      frictionPoints,
      batteryDrainForecast,
      strategicAdvice,
    };
  };

  const prediction = calculatePrediction();

  const handleUpdatePosture = (meetingId: string, posture: MeetingPosture) => {
    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id !== meetingId) return m;
        let script = m.tacticalExitScript;
        let exitMin = m.tacticalExitMinute;

        if (posture === 'Show_Face_Early' && !script) {
          exitMin = 20;
          script = `"Hey team, great seeing everyone. I have a hard stop at the 20-minute mark to push our deployment live. My notes are linked in the agenda."`;
        } else if (posture === 'Strategic_Ghost' && !script) {
          exitMin = 0;
          script = `"Declined: Deep execution sprint locked. Please share the document summary and action items asynchronously."`;
        } else if (posture === 'Extended_Lunch_Opt' && !script) {
          exitMin = 0;
          script = `"Unavailable during this block (prior scheduled recovery window). I will review the meeting notes by 3 PM."`;
        }

        return {
          ...m,
          chosenPosture: posture,
          tacticalExitMinute: exitMin,
          tacticalExitScript: script,
        };
      })
    );
  };

  const copyScriptToClipboard = (meetingId: string, script: string) => {
    if (!script) return;
    navigator.clipboard.writeText(script);
    setCopiedExitScriptId(meetingId);
    setTimeout(() => setCopiedExitScriptId(null), 2500);
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newM: MeetingItineraryItem = {
      id: `meet-${Date.now()}`,
      title: newTitle.trim(),
      calendarTime: newTime.trim() || '02:00 PM – 03:00 PM',
      startMinutes: 14 * 60,
      durationMinutes: 45,
      organizer: newOrganizer.trim() || 'Colleague',
      agendaSummary: newAgenda.trim() || 'Discussion',
      suggestedPosture: 'Show_Face_Early',
      chosenPosture: 'Show_Face_Early',
      tacticalExitMinute: 20,
      tacticalExitScript: '"I have a hard stop in 20 minutes to maintain client deliverable timelines. Feel free to ping me asynchronously."',
      energyDrainScore: 6,
    };

    setMeetings((prev) => [...prev, newM]);
    setSelectedMeetingId(newM.id);
    setIsAddingMeeting(false);
    setNewTitle('');
    setNewOrganizer('');
    setNewAgenda('');
  };

  const handleDeleteMeeting = (meetingId: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Sub-navigation Switcher */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveProtocolSubMode('execution_protocol')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs font-semibold transition-all ${
            activeProtocolSubMode === 'execution_protocol'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-600" />
          <span>Execution Meeting Protocol (Human + AI v1.0)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
            Active Engine
          </span>
        </button>

        <button
          onClick={() => setActiveProtocolSubMode('schedule_posture')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs font-semibold transition-all ${
            activeProtocolSubMode === 'schedule_posture'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>Daily Meeting Itinerary & Prediction Engine</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
            Postures & Drain
          </span>
        </button>
      </div>

      {activeProtocolSubMode === 'execution_protocol' ? (
        <ExecutionMeetingProtocolView
          onCommitToBoard={onCommitToBoard}
          onOpenStuckFeature={onOpenStuckFeature}
        />
      ) : (
        <>
          {/* Top Banner: Meeting Itinerary Protocol & Prediction Engine */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-white">
                PROTOCOL
              </span>
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase">
                Meeting Itinerary Protocol & Real-time Prediction Engine
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
              Pre-Planned Postures, Tactical Exits & Energy Forecasting
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Meetings are the #1 source of energy depletion. The <strong>Meeting Itinerary Protocol</strong> turns passive attendance into a deliberate game: assign a posture before entering, arm yourself with pre-scripted exit excuses, and let the <strong>Prediction Engine</strong> calculate your exact biological drain.
            </p>
          </div>

          {/* Quick Stat Highlights */}
          <div className="flex items-center space-x-3 self-start lg:self-center shrink-0">
            <button
              onClick={() => setIsAddingMeeting(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Meeting</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: THE REAL-TIME PREDICTION ENGINE FORECAST */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-xs border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-400/20 text-amber-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Autonomous Predictive Model
              </span>
              <h2 className="text-sm font-bold text-white">
                Today's Biological Energy & Focus Forecast
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-300">Recommended INPACT Gear:</span>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                prediction.recommendedInpactMode === 'A'
                  ? 'bg-amber-400 text-slate-900'
                  : prediction.recommendedInpactMode === 'B'
                  ? 'bg-blue-400 text-slate-900'
                  : prediction.recommendedInpactMode === 'C'
                  ? 'bg-emerald-400 text-slate-900'
                  : 'bg-purple-400 text-slate-900'
              }`}
            >
              Mode {prediction.recommendedInpactMode}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Energy Surplus Score Gauge */}
          <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px] uppercase">Net Energy Score</span>
              <span className="font-mono font-bold text-sm text-emerald-400">
                {prediction.energySurplusScore} / 100
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  prediction.energySurplusScore > 70
                    ? 'bg-emerald-400'
                    : prediction.energySurplusScore > 45
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
                style={{ width: `${prediction.energySurplusScore}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-300">
              Burnout Risk: <strong className="text-white font-mono">{prediction.riskOfBurnout}</strong>
            </p>
          </div>

          {/* Battery Drain Curve */}
          <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2">
            <span className="text-slate-400 font-mono text-[11px] uppercase block">Predicted Drain Curve</span>
            <div className="flex items-end justify-between h-9 pt-1 font-mono text-[10px]">
              {prediction.batteryDrainForecast.map((point) => (
                <div key={point.hour} className="flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-4 bg-emerald-400/80 rounded-t transition-all group-hover:bg-emerald-300"
                    style={{ height: `${Math.max(8, (point.batteryLevel / 100) * 28)}px` }}
                  />
                  <span className="text-slate-400 text-[9px]">{point.hour.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Advice */}
          <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700 space-y-1">
            <span className="text-slate-400 font-mono text-[11px] uppercase block">Engine Recommendation</span>
            <p className="text-[11px] text-slate-200 leading-relaxed italic">
              "{prediction.strategicAdvice}"
            </p>
          </div>
        </div>
      </div>

      {/* Add Meeting Modal / Inline Form */}
      {isAddingMeeting && (
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Add Meeting to Itinerary</h3>
            <button
              onClick={() => setIsAddingMeeting(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleAddMeeting} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Meeting Name</label>
              <input
                type="text"
                placeholder="e.g., Client Retrospective / Architecture Alignment"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Time Window</label>
              <input
                type="text"
                placeholder="e.g., 01:30 PM – 02:15 PM"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Organizer / Lead</label>
              <input
                type="text"
                placeholder="e.g., Jane (Engineering VP)"
                value={newOrganizer}
                onChange={(e) => setNewOrganizer(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Agenda Summary</label>
              <input
                type="text"
                placeholder="Brief summary of what they want"
                value={newAgenda}
                onChange={(e) => setNewAgenda(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 text-xs"
              />
            </div>
            <div className="sm:col-span-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
              >
                Save to Itinerary Protocol
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 2: THE ITINERARY PROTOCOL & TACTICAL POSTURE ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Scheduled Meetings List with Posture Controls */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-700" />
              <span>Today's Meeting Itinerary ({meetings.length})</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Select meeting to arm exit script</span>
          </div>

          <div className="space-y-3">
            {meetings.map((m) => {
              const isSelected = selectedMeeting.id === m.id;
              const isGhosted = m.chosenPosture === 'Strategic_Ghost' || m.chosenPosture === 'Async_Decline';

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMeetingId(m.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-slate-900 ring-2 ring-slate-900 shadow-xs'
                      : isGhosted
                      ? 'bg-slate-50 border-dashed border-slate-300 opacity-75'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className={`text-xs font-bold ${isGhosted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                          {m.title}
                        </h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {m.calendarTime}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Organizer: <strong className="text-slate-700">{m.organizer}</strong> • {m.agendaSummary}
                      </p>
                    </div>

                    {/* Posture Badge */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          m.chosenPosture === 'Full_Presence'
                            ? 'bg-blue-100 text-blue-800'
                            : m.chosenPosture === 'Show_Face_Early'
                            ? 'bg-amber-100 text-amber-900'
                            : m.chosenPosture === 'Strategic_Ghost'
                            ? 'bg-purple-100 text-purple-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {m.chosenPosture.replace(/_/g, ' ')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeeting(m.id);
                        }}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded"
                        title="Delete meeting"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Posture Selector Radio Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[11px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdatePosture(m.id, 'Full_Presence');
                      }}
                      className={`p-1.5 rounded text-center transition-colors ${
                        m.chosenPosture === 'Full_Presence'
                          ? 'bg-slate-900 text-white font-bold'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Full Presence
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdatePosture(m.id, 'Show_Face_Early');
                      }}
                      className={`p-1.5 rounded text-center transition-colors ${
                        m.chosenPosture === 'Show_Face_Early'
                          ? 'bg-amber-500 text-white font-bold'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Show Face ({m.tacticalExitMinute || 20}m)
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdatePosture(m.id, 'Passive_Listener');
                      }}
                      className={`p-1.5 rounded text-center transition-colors ${
                        m.chosenPosture === 'Passive_Listener'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Passive Listen
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdatePosture(m.id, 'Strategic_Ghost');
                      }}
                      className={`p-1.5 rounded text-center transition-colors ${
                        m.chosenPosture === 'Strategic_Ghost'
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Strategic Ghost
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Tactical Exit Script & Excuse Copier */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Shield className="w-4 h-4 text-slate-800" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Tactical Exit Protocol
              </h3>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Selected Meeting
              </span>
              <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                {selectedMeeting.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Current Posture:{' '}
                <strong className="text-slate-800 font-mono">
                  {selectedMeeting.chosenPosture.replace(/_/g, ' ')}
                </strong>
              </p>
            </div>

            {/* Tactical Script Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">
                  Pre-Scripted Exit Chat Note
                </span>
                <button
                  onClick={() =>
                    copyScriptToClipboard(
                      selectedMeeting.id,
                      selectedMeeting.tacticalExitScript || ''
                    )
                  }
                  className="inline-flex items-center space-x-1 text-[11px] font-mono text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs"
                >
                  {copiedExitScriptId === selectedMeeting.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Script</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed font-sans">
                {selectedMeeting.tacticalExitScript ||
                  '"I have a hard stop right now for a critical deliverable milestone. Catch you all on Slack."'}
              </p>

              <p className="text-[10px] text-slate-400 leading-normal">
                Drop this in the chat right at minute {selectedMeeting.tacticalExitMinute || 20}, wave, and exit. Zero friction, zero guilt.
              </p>
            </div>

            {/* Posture Playbook Reference */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                Posture Playbook
              </span>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-start space-x-1.5">
                  <span className="font-bold text-amber-800">Show Face:</span>
                  <span>Say hello, confirm current status in 15m, and leave before debates start.</span>
                </div>
                <div className="flex items-start space-x-1.5">
                  <span className="font-bold text-purple-800">Strategic Ghost:</span>
                  <span>Decline politely ahead of time. Use block for protected single-active work.</span>
                </div>
                <div className="flex items-start space-x-1.5">
                  <span className="font-bold text-blue-800">Passive Listener:</span>
                  <span>Audio in background while writing code or doing mechanical admin.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
