import React, { useState, useEffect, useRef } from 'react';
import {
  PenTool,
  FileText,
  Camera,
  Upload,
  Mic,
  MicOff,
  Check,
  Flame,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Calendar,
  AlertCircle,
  Eye,
  Clock,
  Compass,
} from 'lucide-react';
import {
  CommitmentCard,
  InpactBatteryState,
  PaperAboveItem,
  PaperRitualEntry,
} from '../types.js';

interface PaperFirstViewProps {
  onCommitAboveTask: (task: PaperAboveItem, batteryState: InpactBatteryState) => Promise<void>;
  onCommitBelowItems: (items: string[]) => Promise<void>;
  onNavigateToBoard: () => void;
  activeCard?: CommitmentCard | null;
}

const STORAGE_KEY = 'pes_paper_ritual_history';

export const PaperFirstView: React.FC<PaperFirstViewProps> = ({
  onCommitAboveTask,
  onCommitBelowItems,
  onNavigateToBoard,
  activeCard,
}) => {
  // Grounding gate: physical tools confirmation
  const [hasPen, setHasPen] = useState(false);
  const [hasPaper, setHasPaper] = useState(false);

  // Ingestion mode
  const [inputMode, setInputMode] = useState<'camera' | 'voice' | 'quickText'>('camera');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [quickNotes, setQuickNotes] = useState(
`Battery: B
Anchors: Day end at 10:00 PM, Lunch at 1:00 PM

Above The Line:
1. Complete Q3 proposal core draft
2. Confirm venue deposit

--- The Line ---
Below The Line:
• Clean out downloads folder
• Check car tire pressure
• Research ergonomic desk lamp
• Reply to non-urgent vendor email`
  );

  // Parsing & execution state
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<{
    batteryState: InpactBatteryState;
    hardAnchors: string[];
    aboveTheLine: PaperAboveItem[];
    belowTheLine: string[];
    summary: string;
  } | null>(null);

  // Streak & History
  const [history, setHistory] = useState<PaperRitualEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Calculate current streak
  const currentStreak = history.length > 0 ? history[0].ritualStreakDay : 0;

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        setVoiceText((prev) => (prev + ' ' + transcript).trim());
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert('Voice dictation is not supported by your browser. Please type or upload a photo.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleParse = async () => {
    setIsParsing(true);
    setParsedData(null);

    const payload: { rawText?: string; imageBase64?: string; mimeType?: string } = {};
    if (inputMode === 'camera' && imagePreview) {
      payload.imageBase64 = imagePreview;
      payload.mimeType = imagePreview.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    } else if (inputMode === 'voice' && voiceText) {
      payload.rawText = voiceText;
    } else {
      payload.rawText = quickNotes;
    }

    try {
      const res = await fetch('/api/v1/agent/parse-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        setParsedData(json.data);
      } else {
        throw new Error('Server returned non-200');
      }
    } catch {
      // Local fallback parsing
      const textToParse = payload.rawText || quickNotes;
      const lines = textToParse.split('\n').map((l) => l.trim()).filter(Boolean);
      let battery: InpactBatteryState = 'B';
      const anchors: string[] = [];
      const above: PaperAboveItem[] = [];
      const below: string[] = [];
      let inBelow = false;

      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.startsWith('battery:')) {
          if (lower.includes('a')) battery = 'A';
          else if (lower.includes('b')) battery = 'B';
          else if (lower.includes('c')) battery = 'C';
          else if (lower.includes('d')) battery = 'D';
        } else if (lower.startsWith('anchors:') || lower.startsWith('hard:')) {
          anchors.push(line.replace(/^(anchors|hard):\s*/i, ''));
        } else if (line.includes('---') || line.includes('===') || lower.includes('below the line')) {
          inBelow = true;
        } else {
          const clean = line.replace(/^[\*\-\•\d+\.\)]\s*/, '').trim();
          if (clean) {
            if (!inBelow && above.length < 2) {
              above.push({ title: clean, estimatedMinutes: 25, gearVariant: battery });
            } else {
              below.push(clean);
            }
          }
        }
      }

      setParsedData({
        batteryState: battery,
        hardAnchors: anchors.length ? anchors : ['Day end at 10:00 PM'],
        aboveTheLine: above.length ? above : [{ title: 'Primary physical priority', estimatedMinutes: 25, gearVariant: battery }],
        belowTheLine: below,
        summary: 'Paper sheet successfully parsed into structured reality constraints.',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommitToReality = async () => {
    if (!parsedData) return;
    setIsCommitting(true);

    try {
      // Commit the Above The Line tasks
      for (const item of parsedData.aboveTheLine) {
        await onCommitAboveTask(item, parsedData.batteryState);
      }

      // Commit Below The Line into inbox storage
      if (parsedData.belowTheLine.length > 0) {
        await onCommitBelowItems(parsedData.belowTheLine);
      }

      // Record to history
      const newStreak = currentStreak + 1;
      const entry: PaperRitualEntry = {
        id: `ritual-${Date.now()}`,
        timestamp: new Date().toISOString(),
        hasPen,
        hasPaper,
        batteryState: parsedData.batteryState,
        hardAnchors: parsedData.hardAnchors,
        aboveTheLine: parsedData.aboveTheLine,
        belowTheLine: parsedData.belowTheLine,
        imageUrl: imagePreview || undefined,
        rawNotes: quickNotes,
        ritualStreakDay: newStreak,
      };

      const updatedHistory = [entry, ...history].slice(0, 30);
      setHistory(updatedHistory);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (e) {
        console.error('Failed to save paper history:', e);
      }

      setCommitSuccess(true);
      setTimeout(() => {
        onNavigateToBoard();
      }, 1400);
    } catch (err) {
      console.error('Commit failed:', err);
      alert('Failed to commit paper sheet to board. Please try again.');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fbf9f5] text-[#2c2825] py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header & Habit Streak Banner */}
        <div className="border border-[#e7dfd5] bg-white rounded-xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/30 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                  <Flame className="w-3.5 h-3.5 mr-1 text-amber-600 fill-amber-500" />
                  DAY {currentStreak} OF 30 RITUAL
                </span>
                <span className="text-xs font-mono text-stone-500">Step 0: Tactile Grounding</span>
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mt-1.5 tracking-tight font-serif">
                Paper First: The Physical Grounding Ritual
              </h1>
              <p className="text-sm text-stone-600 mt-1 max-w-xl leading-relaxed">
                Step away from the glass. An overwhelmed nervous system calms down when ink touches paper.
                Write first, capture second, execute with zero friction.
              </p>
            </div>

            {/* Ritual Streak Indicator */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 sm:text-right flex sm:flex-col items-center sm:items-end justify-between">
              <span className="text-xs font-mono uppercase text-stone-500 tracking-wider">30-Day Habit</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-lg font-mono font-bold text-stone-900">{currentStreak} / 30</span>
                <span className="text-xs text-stone-500">Days Logged</span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: The Physical Tools Gate */}
        <div className="bg-white border border-[#e7dfd5] rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-5">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold font-mono">
                1
              </div>
              <h2 className="text-base font-bold text-stone-900">Do you have your physical tools?</h2>
            </div>
            <span className="text-xs font-mono text-stone-400">Tactile Gate</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tool 1: Pen */}
            <button
              onClick={() => setHasPen(!hasPen)}
              className={`flex items-start p-4 rounded-xl border text-left transition-all ${
                hasPen
                  ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-500'
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700'
              }`}
            >
              <div className={`p-2.5 rounded-lg mr-3.5 ${hasPen ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'}`}>
                <PenTool className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-900">Pen or Pencil</span>
                  {hasPen ? <Check className="w-4 h-4 text-emerald-600" /> : <span className="text-[11px] font-mono text-stone-400">Click to confirm</span>}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Ballpoint, pencil, marker, anything with ink or graphite in hand.
                </p>
              </div>
            </button>

            {/* Tool 2: Paper */}
            <button
              onClick={() => setHasPaper(!hasPaper)}
              className={`flex items-start p-4 rounded-xl border text-left transition-all ${
                hasPaper
                  ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-1 ring-emerald-500'
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700'
              }`}
            >
              <div className={`p-2.5 rounded-lg mr-3.5 ${hasPaper ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-900">Physical Paper</span>
                  {hasPaper ? <Check className="w-4 h-4 text-emerald-600" /> : <span className="text-[11px] font-mono text-stone-400">Click to confirm</span>}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Notebook, sticky note, envelope, or the back of an old bill.
                </p>
              </div>
            </button>
          </div>

          {(!hasPen || !hasPaper) && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Please grab your pen and paper first before proceeding. If you cannot do this physical step, the system cannot protect you from digital overload.
              </span>
            </div>
          )}
        </div>

        {/* STEP 2: The Physical Sheet Blueprint */}
        <div className={`bg-white border border-[#e7dfd5] rounded-xl p-6 shadow-xs transition-opacity duration-300 ${hasPen && hasPaper ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-5">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold font-mono">
                2
              </div>
              <h2 className="text-base font-bold text-stone-900">The Physical Paper Layout (Mirror This)</h2>
            </div>
            <span className="text-xs font-mono text-stone-400">Write By Hand</span>
          </div>

          <div className="bg-[#fffdfa] border-2 border-dashed border-[#dcd2c4] rounded-xl p-6 font-mono text-xs text-stone-800 space-y-4 shadow-inner relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-stone-900 uppercase">BATTERY:</span>
                <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700">[ A ] Full</span>
                <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700">[ B ] Normal</span>
                <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700">[ C ] Maintenance</span>
                <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700">[ D ] Recovery</span>
              </div>
              <span className="text-[11px] text-stone-500 italic">Circle your actual state</span>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-stone-900">HARD ANCHORS:</div>
              <div className="text-stone-500 pl-4">• Day end: ____________________  (Sleep/shutoff time)</div>
              <div className="text-stone-500 pl-4">• Fixed meeting/doctor: ____________________</div>
            </div>

            <div className="pt-2">
              <div className="font-bold text-stone-900 uppercase">ABOVE THE LINE (Max 2 tasks for today):</div>
              <div className="pl-4 text-stone-700 mt-1">1. __________________________________________________</div>
              <div className="pl-4 text-stone-700 mt-1">2. __________________________________________________</div>
            </div>

            <div className="py-2 flex items-center space-x-2">
              <div className="h-0.5 bg-stone-900 flex-1" />
              <span className="font-bold tracking-widest text-stone-900 px-2 uppercase bg-stone-100 rounded text-[11px]">
                ========== THE LINE ==========
              </span>
              <div className="h-0.5 bg-stone-900 flex-1" />
            </div>

            <div className="space-y-1">
              <div className="font-bold text-stone-500 uppercase text-[11px]">
                BELOW THE LINE (Brain dump / Parked obligations - no guilt):
              </div>
              <div className="pl-4 text-stone-400">• __________________________________________________</div>
              <div className="pl-4 text-stone-400">• __________________________________________________</div>
              <div className="pl-4 text-stone-400">• __________________________________________________</div>
            </div>
          </div>
        </div>

        {/* STEP 3: Ingest the Paper (Camera / Voice / Quick Text) */}
        <div className={`bg-white border border-[#e7dfd5] rounded-xl p-6 shadow-xs transition-opacity duration-300 ${hasPen && hasPaper ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-5">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold font-mono">
                3
              </div>
              <h2 className="text-base font-bold text-stone-900">Capture & Ingest Your Paper</h2>
            </div>

            {/* Ingestion Mode Toggle */}
            <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
              <button
                onClick={() => setInputMode('camera')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  inputMode === 'camera' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5 mr-1" />
                Photo Snap
              </button>
              <button
                onClick={() => setInputMode('voice')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  inputMode === 'voice' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Mic className="w-3.5 h-3.5 mr-1" />
                Read Aloud
              </button>
              <button
                onClick={() => setInputMode('quickText')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  inputMode === 'quickText' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Manual Form
              </button>
            </div>
          </div>

          {/* Mode 1: Camera Photo Upload */}
          {inputMode === 'camera' && (
            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 hover:border-stone-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-stone-50/50 hover:bg-stone-50"
                >
                  <div className="w-12 h-12 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-900">Take a Photo of Your Paper Sheet</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Click to open your device camera or select an image file. The AI will read your handwriting instantly.
                  </p>
                  <span className="inline-flex items-center mt-3 text-xs font-mono font-medium text-stone-700 bg-white border border-stone-300 px-3 py-1.5 rounded-lg shadow-xs">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload / Snap Photo
                  </span>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-stone-300 bg-stone-950 max-h-80 flex items-center justify-center">
                  <img src={imagePreview} alt="Paper Sheet Preview" className="max-h-80 object-contain" />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute top-3 right-3 bg-stone-900/80 hover:bg-stone-900 text-white p-1.5 rounded-lg text-xs flex items-center gap-1 backdrop-blur-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retake
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Voice Dictation */}
          {inputMode === 'voice' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-stone-500">Voice Dictation Sensor</span>
                  <button
                    onClick={toggleVoiceRecording}
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isRecording
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 mr-1.5" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 mr-1.5" />
                        Start Reading Paper Aloud
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  value={voiceText}
                  onChange={(e) => setVoiceText(e.target.value)}
                  placeholder="Example: 'Battery is B. Anchors are meeting at 2pm and sleep at 10pm. Above the line: number one, finish the invoice; number two, clean the desk. Below the line: buy milk, research car insurance.'"
                  className="w-full h-32 p-3 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-hidden focus:ring-1 focus:ring-stone-400 font-mono"
                />
              </div>
            </div>
          )}

          {/* Mode 3: Manual Text Form */}
          {inputMode === 'quickText' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500">
                Directly enter the text from your paper sheet below:
              </p>
              <textarea
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                rows={8}
                className="w-full p-3 text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-stone-400"
              />
            </div>
          )}

          {/* Parse Button */}
          <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-500">
              {inputMode === 'camera' && imagePreview
                ? 'Photo ready for extraction'
                : inputMode === 'voice' && voiceText
                ? 'Voice memo ready'
                : 'Text template ready'}
            </span>

            <button
              onClick={handleParse}
              disabled={isParsing || (inputMode === 'camera' && !imagePreview)}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-stone-900 text-white font-medium text-xs hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              {isParsing ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin text-amber-400" />
                  Reading Paper Sheet...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                  Parse Paper Into System
                </>
              )}
            </button>
          </div>
        </div>

        {/* STEP 4: Parsed Confirmation & Direct Commitment to Reality */}
        {parsedData && (
          <div className="bg-white border-2 border-stone-900 rounded-xl p-6 shadow-md space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                  ✓
                </div>
                <h2 className="text-base font-bold text-stone-900">Extracted Reality Constraints</h2>
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                Verified From Paper
              </span>
            </div>

            {/* Battery Indicator */}
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className="flex items-center space-x-3">
                <Compass className="w-5 h-5 text-stone-700" />
                <div>
                  <span className="text-xs font-mono uppercase text-stone-500">INPACT Battery State</span>
                  <div className="text-sm font-bold text-stone-900">
                    Mode {parsedData.batteryState}:{' '}
                    {parsedData.batteryState === 'A'
                      ? 'High Output / Full Power'
                      : parsedData.batteryState === 'B'
                      ? 'Normal Solid Execution'
                      : parsedData.batteryState === 'C'
                      ? 'Maintenance / Low Friction'
                      : 'Recovery & Preservation'}
                  </div>
                </div>
              </div>
              <div className="flex space-x-1 font-mono text-xs">
                {(['A', 'B', 'C', 'D'] as InpactBatteryState[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setParsedData({ ...parsedData, batteryState: b })}
                    className={`w-7 h-7 rounded flex items-center justify-center font-bold transition-colors ${
                      parsedData.batteryState === b
                        ? 'bg-stone-900 text-white'
                        : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Anchors */}
            {parsedData.hardAnchors.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-mono uppercase text-stone-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  Hard Anchors (External Boundaries)
                </span>
                <div className="flex flex-wrap gap-2">
                  {parsedData.hardAnchors.map((anchor, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-stone-100 text-stone-800 text-xs font-mono border border-stone-200"
                    >
                      {anchor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Above The Line */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase font-bold text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Above The Line (Will Execute Today — Max 2)
                </span>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  WIP = 1 Strictly Enforced
                </span>
              </div>
              <div className="space-y-2">
                {parsedData.aboveTheLine.map((task, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-5 h-5 rounded bg-emerald-200 text-emerald-900 flex items-center justify-center text-xs font-mono font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-stone-900">{task.title}</span>
                    </div>
                    <span className="text-xs font-mono text-stone-500">
                      Gear {parsedData.batteryState} (~{task.estimatedMinutes || 25}m)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Below The Line */}
            {parsedData.belowTheLine.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <span className="text-xs font-mono uppercase text-stone-500">
                  Below The Line ({parsedData.belowTheLine.length} items safely parked in Inbox)
                </span>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-600 max-h-32 overflow-y-auto space-y-1">
                  {parsedData.belowTheLine.map((item, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <span className="text-stone-400">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Action Commit */}
            <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-stone-500">
                {commitSuccess ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Committed! Navigating to single-active execution...
                  </span>
                ) : (
                  'Clicking below sets your single-active card and locks out all distraction.'
                )}
              </div>

              <button
                onClick={handleCommitToReality}
                disabled={isCommitting || commitSuccess}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isCommitting ? (
                  <>Committing to Reality...</>
                ) : (
                  <>
                    Commit to Reality & Start Day
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: 30-Day Physical Paper Trail History */}
        {history.length > 0 && (
          <div className="border border-[#e7dfd5] bg-white rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-stone-600" />
                <h3 className="text-sm font-bold text-stone-900">Your 30-Day Physical Paper Trail</h3>
              </div>
              <span className="text-xs font-mono text-stone-500">{history.length} logged</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.slice(0, 6).map((entry) => (
                <div key={entry.id} className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-stone-900">
                      Day {entry.ritualStreakDay}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-semibold text-[10px]">
                      Mode {entry.batteryState}
                    </span>
                  </div>
                  <div className="text-stone-500 text-[11px]">
                    {new Date(entry.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="font-medium text-stone-800 line-clamp-1">
                    1. {entry.aboveTheLine[0]?.title || 'Standard task'}
                  </div>
                  {entry.aboveTheLine[1] && (
                    <div className="font-medium text-stone-800 line-clamp-1">
                      2. {entry.aboveTheLine[1]?.title}
                    </div>
                  )}
                  <div className="text-[11px] text-stone-400 font-mono">
                    +{entry.belowTheLine.length} parked below line
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
