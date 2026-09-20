import React, { useState, useEffect } from 'react';
import {
  ExecutionMeetingSession,
  ExecutionMeetingStep,
  SituationClass,
  ProtocolBranch,
  SituationModel,
  PlanningOutputContract,
  CheckpointReview,
} from '../types/execution-protocol.js';
import {
  Clock,
  Zap,
  Target,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronRight,
  HelpCircle,
  FileCheck,
  Send,
  RefreshCw,
  Sliders,
  Award,
} from 'lucide-react';

interface ExecutionMeetingProtocolProps {
  onCommitToBoard?: (taskTitle: string, durationMin: number, proof: string) => void;
  onOpenStuckFeature?: (frictionPoint: string) => void;
}

export const ExecutionMeetingProtocolView: React.FC<ExecutionMeetingProtocolProps> = ({
  onCommitToBoard,
  onOpenStuckFeature,
}) => {
  // Active meeting state
  const [session, setSession] = useState<ExecutionMeetingSession>({
    id: `exec-${Date.now()}`,
    title: 'Execution Meeting #1',
    startedAt: new Date().toISOString(),
    availableMinutes: 5,
    objective: 'Launch landing page test offer to first 10 potential customers',
    constraints: ['Time capped to 15m', 'No new code deployments needed'],
    situationClass: 'Normal',
    branch: 'Execution',
    step: 'setup',
    situationModel: {
      objective: 'Launch landing page test offer to first 10 potential customers',
      known: [
        { id: 'k-1', text: 'Landing page copy & signup form are already live', status: 'Fact' },
        { id: 'k-2', text: 'Zero external feedback has been gathered yet', status: 'Fact' },
      ],
      inferred: [
        { id: 'i-1', text: 'Technical implementation is not the bottleneck', status: 'Inference', confidence: 95 },
        { id: 'i-2', text: 'Hesitation is caused by uncertainty about customer response', status: 'Inference', confidence: 85 },
      ],
      unknown: [
        { id: 'u-1', text: 'Will visitors understand the headline value prop within 5 seconds?', status: 'Hypothesis' },
      ],
      bottomLineProblem: 'Demand and resonance have not been tested in reality.',
      nextRealityTest: 'Send landing link directly to 5 peers in Slack and record immediate first impressions.',
      confirmedByUser: false,
    },
    planningDurationSeconds: 0,
    executionDurationMinutes: 10,
    isPlanningTimerRunning: false,
    historyLog: [],
  });

  // Timers
  const [planningTimerSeconds, setPlanningTimerSeconds] = useState(0);
  const [isPlanningTimerActive, setIsPlanningTimerActive] = useState(false);
  const [executionTimerSecondsLeft, setExecutionTimerSecondsLeft] = useState(10 * 60);
  const [isExecutionTimerActive, setIsExecutionTimerActive] = useState(false);

  // Form Inputs
  const [rawContextInput, setRawContextInput] = useState(
    'We built the landing page and basic checkout, but keep debating the pricing tiers. Need to know if anyone actually wants this.'
  );
  const [userModelCorrection, setUserModelCorrection] = useState('');
  const [rapidIntakeAnswer, setRapidIntakeAnswer] = useState('');
  const [rapidIntakeQuestion, setRapidIntakeQuestion] = useState<string | null>(null);
  const [executionReport, setExecutionReport] = useState(
    'Sent link to 6 founders. 4 responded within 8 minutes: 3 clicked and said the headline is clear, but 1 pointed out the checkout button lacked pricing clarity.'
  );

  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 5-minute planning ceiling timer
  useEffect(() => {
    let interval: any = null;
    if (isPlanningTimerActive) {
      interval = setInterval(() => {
        setPlanningTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlanningTimerActive]);

  // Execution Countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isExecutionTimerActive && executionTimerSecondsLeft > 0) {
      interval = setInterval(() => {
        setExecutionTimerSecondsLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isExecutionTimerActive, executionTimerSecondsLeft]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Step 1: Start Meeting & Compile Situation Model
  const handleStartSessionAndCompile = async () => {
    setIsLoadingAi(true);
    setErrorMsg(null);
    setIsPlanningTimerActive(true);

    try {
      const res = await fetch('/v1/agent/protocol/compile-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableTime: session.availableMinutes,
          objective: session.objective,
          situationClass: session.situationClass,
          userContext: rawContextInput,
          constraints: session.constraints,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to compile model');
      }

      const json = await res.json();
      if (json.data) {
        setSession((prev) => ({
          ...prev,
          situationModel: json.data.situationModel || prev.situationModel,
          branch: (json.data.recommendedBranch as ProtocolBranch) || prev.branch,
          step: json.data.rapidIntakeQuestion ? 'rapid_intake' : 'situation_model',
        }));
        if (json.data.rapidIntakeQuestion) {
          setRapidIntakeQuestion(json.data.rapidIntakeQuestion);
        }
      }
    } catch (err: any) {
      console.warn('AI compilation fallback active:', err);
      // Fallback transition
      setSession((prev) => ({
        ...prev,
        step: 'situation_model',
      }));
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Step 2: Rapid Intake submit (if asked)
  const handleAnswerRapidIntake = () => {
    setSession((prev) => ({
      ...prev,
      step: 'situation_model',
      situationModel: {
        ...prev.situationModel,
        known: [
          ...prev.situationModel.known,
          { id: `k-${Date.now()}`, text: `Operator clarification: ${rapidIntakeAnswer}`, status: 'Fact' },
        ],
      },
    }));
  };

  // Step 3: Model Confirmation & Proceed to 5-Minute Planning Compiler
  const handleConfirmModelAndCompileContract = async (confirmed: boolean) => {
    setIsLoadingAi(true);
    setErrorMsg(null);

    try {
      const updatedModel: SituationModel = {
        ...session.situationModel,
        confirmedByUser: confirmed,
      };

      const res = await fetch('/v1/agent/protocol/compile-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situationModel: updatedModel,
          availableTime: session.availableMinutes,
          userCorrections: userModelCorrection,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setSession((prev) => ({
          ...prev,
          step: 'planning_compiler',
          situationModel: updatedModel,
          outputContract: json.data,
        }));
      }
    } catch (err: any) {
      // Fallback
      setSession((prev) => ({
        ...prev,
        step: 'planning_compiler',
        outputContract: {
          plan: `1. Setup test environment (2m)\n2. Run targeted test: "${prev.situationModel.nextRealityTest}" (10m)\n3. Record observable customer response`,
          schedule: `0:00–2:00 Planning\n2:00–12:00 Execution Window\n12:00–14:00 Checkpoint Review`,
          purpose: `Directly attacks the bottleneck: ${prev.situationModel.bottomLineProblem}`,
          tangibleOutcome: 'Observable real-world response from 5 real prospects',
          measurement: 'Count of replies and specific objections recorded',
          checkpoint: 'In 10 minutes',
          returnTimeDate: 'Immediately upon completing the 10-minute sprint',
          nextStateRule: 'If SUPPORTED: Commit next physical task to PES Board. If WEAKENED: Diagnose in The Stuck Feature.',
        },
      }));
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Step 4: Stop Planning & Release to Execution Window!
  const handleReleaseToExecution = () => {
    setIsPlanningTimerActive(false);
    setExecutionTimerSecondsLeft(session.executionDurationMinutes * 60);
    setIsExecutionTimerActive(true);
    setSession((prev) => ({
      ...prev,
      step: 'execution_window',
      planningDurationSeconds: planningTimerSeconds,
    }));
  };

  // Step 5: Checkpoint Evaluation
  const handleEvaluateCheckpoint = async () => {
    if (!session.outputContract) return;
    setIsLoadingAi(true);

    try {
      const res = await fetch('/v1/agent/protocol/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outputContract: session.outputContract,
          whatActuallyHappened: executionReport,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setSession((prev) => ({
          ...prev,
          step: 'checkpoint',
          checkpointReview: json.data,
        }));
      }
    } catch (err) {
      setSession((prev) => ({
        ...prev,
        step: 'checkpoint',
        checkpointReview: {
          whatHappened: executionReport,
          whatResultObtained: 'Feedback gathered from 4 out of 6 contacts',
          whatDifferedFromExpectation: 'Checkout clarity was the main friction, not headline copy',
          whatLearned: 'Audience understands the value proposition; checkout button needs price tag',
          doesModelStillHold: 'Partially',
          updatedModelNotes: 'Update checkout copy, then run final billing verification',
          completedAt: new Date().toISOString(),
        },
      }));
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Step 6: Commit next action to board
  const handleCommitTestedAction = () => {
    if (onCommitToBoard && session.outputContract) {
      onCommitToBoard(
        `Next Action: ${session.situationModel.nextRealityTest.slice(0, 60)}`,
        25,
        session.outputContract.tangibleOutcome
      );
    }
    setSession((prev) => ({ ...prev, step: 'completed' }));
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner: Protocol Specification Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-white">
                v1.0 PROTOCOL
              </span>
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                Execution Meeting Protocol (Human + AI)
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
              Rapid Compression Layer Between Reality & Action
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-4xl leading-relaxed">
              <strong>Core Directive:</strong> Maximize decision and action quality per unit of your time. Minimize <strong>Δt</strong> from problem recognition to an executed real-world test. Five minutes is the hard ceiling for planning. Once an itinerary is executable: <em>Stop planning, release to execution</em>.
            </p>
          </div>

          {/* Planning Timer Meter */}
          <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">
                Planning Clock (T ≤ 5:00)
              </span>
              <span
                className={`text-lg font-mono font-bold ${
                  planningTimerSeconds > 300 ? 'text-rose-600 animate-pulse' : 'text-slate-900'
                }`}
              >
                {formatTimer(planningTimerSeconds)}
              </span>
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                isPlanningTimerActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'
              }`}
            />
          </div>
        </div>
      </div>

      {/* STAGE TABS / PROGRESS FLOW */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono">
        {[
          { id: 'setup', label: '1. Setup & Time' },
          { id: 'situation_model', label: '2. Situation Model' },
          { id: 'model_confirm', label: '3. Confirmation' },
          { id: 'planning_compiler', label: '4. Output Contract' },
          { id: 'execution_window', label: '5. Real Execution' },
          { id: 'checkpoint', label: '6. Checkpoint & Feedback' },
        ].map((s) => {
          const isCurrent = session.step === s.id;
          const isPassed =
            ['setup', 'rapid_intake', 'situation_model', 'model_confirm', 'planning_compiler', 'execution_window', 'checkpoint', 'completed'].indexOf(
              session.step
            ) >=
            ['setup', 'situation_model', 'model_confirm', 'planning_compiler', 'execution_window', 'checkpoint'].indexOf(
              s.id as any
            );

          return (
            <div
              key={s.id}
              className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                isCurrent
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-1 ring-slate-900'
                  : isPassed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              {s.label}
            </div>
          );
        })}
      </div>

      {/* MAIN STEP PANELS */}

      {/* STEP 1: SETUP & TIME */}
      {session.step === 'setup' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Target className="w-5 h-5 text-slate-900" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Step 1: Session Initiation (Time + Objective)
              </h2>
              <p className="text-xs text-slate-500">
                Rule 5: "How much time do we have? What needs to be accomplished?"
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Available Time */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Available Time Budget (Minutes)
              </label>
              <select
                value={session.availableMinutes}
                onChange={(e) =>
                  setSession((prev) => ({ ...prev, availableMinutes: Number(e.target.value) }))
                }
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 font-mono text-xs"
              >
                <option value={3}>3 Minutes (Rapid Blitz)</option>
                <option value={5}>5 Minutes (Standard Protocol Ceiling)</option>
                <option value={10}>10 Minutes (Complex Problem)</option>
                <option value={15}>15 Minutes (Sprint Review)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Rule 2: "Five minutes is a ceiling, not an assignment."
              </p>
            </div>

            {/* Situation Class */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Situation Classification
              </label>
              <select
                value={session.situationClass}
                onChange={(e) =>
                  setSession((prev) => ({ ...prev, situationClass: e.target.value as SituationClass }))
                }
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 font-mono text-xs"
              >
                <option value="Normal">Normal (Routine execution / problem-solving)</option>
                <option value="Urgent">Urgent (Triage: Immediate preservation & action)</option>
                <option value="Complex">Complex (Multiple variables & dependencies)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Rule 6: AI adapts intake depth based on classification.
              </p>
            </div>

            {/* Operating Branch */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Protocol Router Branch</label>
              <select
                value={session.branch}
                onChange={(e) =>
                  setSession((prev) => ({ ...prev, branch: e.target.value as ProtocolBranch }))
                }
                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 font-mono text-xs"
              >
                <option value="Execution">Execution (Start / Recover stalled task)</option>
                <option value="Planning">Planning (Goal, Project, Capacity)</option>
                <option value="Decision">Decision (Compare options & commit)</option>
                <option value="Problem">Problem (Diagnose bottleneck)</option>
                <option value="Urgent">Urgent (Preserve optionality)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Rule 27: Inherits TIME → OBJECTIVE → MODEL → TEST.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1 text-xs">
              Primary Objective
            </label>
            <input
              type="text"
              value={session.objective}
              onChange={(e) => setSession((prev) => ({ ...prev, objective: e.target.value }))}
              placeholder="What tangible result needs to be produced?"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1 text-xs">
              Current Reality & Context (What exists right now?)
            </label>
            <textarea
              rows={3}
              value={rawContextInput}
              onChange={(e) => setRawContextInput(e.target.value)}
              placeholder="Dump what has been completed, where you are stuck, or what you are trying to test..."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleStartSessionAndCompile}
              disabled={isLoadingAi || !session.objective.trim()}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoadingAi ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compiling Situation Model...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Start Execution Meeting (Start Clock)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* RAPID INTAKE (IF AI DETECTED A HIGH-VALUE QUESTION) */}
      {session.step === 'rapid_intake' && rapidIntakeQuestion && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-amber-800" />
            <div>
              <h3 className="text-xs font-bold text-amber-900 uppercase">
                Rapid Intake: High-Value Question
              </h3>
              <p className="text-[11px] text-amber-700">
                Rule 7: Question Value = Expected Improvement in Decision Quality ÷ Time Cost.
              </p>
            </div>
          </div>

          <div className="p-3 bg-white border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-slate-900 font-mono">
              "{rapidIntakeQuestion}"
            </p>
          </div>

          <div>
            <input
              type="text"
              value={rapidIntakeAnswer}
              onChange={(e) => setRapidIntakeAnswer(e.target.value)}
              placeholder="Type rapid answer here..."
              className="w-full border border-amber-300 rounded-lg p-2.5 text-xs bg-white"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={handleAnswerRapidIntake}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
            >
              Submit Answer & Build Model
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SITUATION MODEL COMPRESSION */}
      {session.step === 'situation_model' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-white font-bold">
                  RULE 8 & 9
                </span>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Compressed Situation Model
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Epistemic Separation: Distinguishing Facts (established), Inferences (derived), and Hypotheses (tested).
              </p>
            </div>

            <div className="text-xs font-mono text-slate-500">
              Planning Elapsed: <strong className="text-slate-900">{formatTimer(planningTimerSeconds)}</strong>
            </div>
          </div>

          {/* Epistemic Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Known Facts */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-700 block flex items-center justify-between">
                <span>KNOWN (Facts)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  Established
                </span>
              </span>
              <ul className="space-y-1.5">
                {session.situationModel.known.map((k) => (
                  <li key={k.id} className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                    {k.text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Inferred Conclusions */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-700 block flex items-center justify-between">
                <span>INFERRED (Evidence)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                  Derived
                </span>
              </span>
              <ul className="space-y-1.5">
                {session.situationModel.inferred.map((i) => (
                  <li key={i.id} className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                    {i.text}
                    {i.confidence && (
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                        Confidence: {i.confidence}%
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Unknown Hypotheses */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-700 block flex items-center justify-between">
                <span>UNKNOWN (Hypothesis)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                  Requires Test
                </span>
              </span>
              <ul className="space-y-1.5">
                {session.situationModel.unknown.map((u) => (
                  <li key={u.id} className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                    {u.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom-Line Problem & Fastest Reality Test */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="text-[10px] font-mono uppercase text-rose-800 font-bold block">
                Rule 11: Bottom-Line Problem (The Real Bottleneck)
              </span>
              <p className="text-xs font-semibold text-rose-950 leading-relaxed">
                {session.situationModel.bottomLineProblem}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <span className="text-[10px] font-mono uppercase text-emerald-800 font-bold block">
                Rule 13: Fastest Useful Reality Test
              </span>
              <p className="text-xs font-semibold text-emerald-950 leading-relaxed">
                {session.situationModel.nextRealityTest}
              </p>
            </div>
          </div>

          {/* Rule 10: Model Confirmation Prompt */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                Rule 10: Model Confirmation ("This is my current model. Correct?")
              </h3>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">
                Corrections or additions (optional):
              </label>
              <input
                type="text"
                value={userModelCorrection}
                onChange={(e) => setUserModelCorrection(e.target.value)}
                placeholder="E.g., Actually, we also have 2 paying beta users who asked for pricing..."
                className="w-full border border-slate-300 rounded p-2 text-xs bg-white"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => handleConfirmModelAndCompileContract(true)}
                disabled={isLoadingAi}
                className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs inline-flex items-center space-x-1.5"
              >
                {isLoadingAi ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Confirm Model & Compile 5-Min Contract</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: 5-MINUTE PLANNING COMPILER & 8-POINT OUTPUT CONTRACT */}
      {session.step === 'planning_compiler' && session.outputContract && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                  RULE 15
                </span>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Planning Output Contract (8-Point Package)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rule 17: Planning ends when you know what you are doing and what is being measured.
              </p>
            </div>

            <div className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
              Planning finished in {formatTimer(planningTimerSeconds)}
            </div>
          </div>

          {/* 8-Point Output Contract Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                1. Plan (What will be done)
              </span>
              <p className="text-slate-800 font-semibold leading-relaxed whitespace-pre-line">
                {session.outputContract.plan}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                2. Schedule (When it will be done)
              </span>
              <p className="text-slate-800 font-semibold leading-relaxed whitespace-pre-line">
                {session.outputContract.schedule}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                3. Purpose (Why this action was selected)
              </span>
              <p className="text-slate-800 font-semibold leading-relaxed">
                {session.outputContract.purpose}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                4. Tangible Outcome (What exists or changes)
              </span>
              <p className="text-slate-800 font-semibold leading-relaxed">
                {session.outputContract.tangibleOutcome}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                5. Measurement (How result is recognized)
              </span>
              <p className="text-slate-800 font-semibold leading-relaxed">
                {session.outputContract.measurement}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                6. Checkpoint & 7. Return Time
              </span>
              <p className="text-slate-800 font-semibold leading-relaxed">
                Checkpoint: {session.outputContract.checkpoint} • Return: {session.outputContract.returnTimeDate}
              </p>
            </div>

            <div className="md:col-span-2 p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-200 space-y-1">
              <span className="text-[10px] font-mono text-emerald-800 uppercase block font-bold">
                8. Next-State Rule (Supported vs. Weakened)
              </span>
              <p className="text-slate-900 font-semibold leading-relaxed">
                {session.outputContract.nextStateRule}
              </p>
            </div>
          </div>

          {/* Core Imperative Release Button */}
          <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block font-bold">
                RULE 17 & 31: TERMINATE PLANNING
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Stop planning. Release user to real-world execution.
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                The planning session is satisfied. Conversational capacity is terminated so you can execute the test in reality.
              </p>
            </div>

            <button
              onClick={handleReleaseToExecution}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center space-x-2 shrink-0 shadow-sm"
            >
              <Play className="w-4 h-4" />
              <span>Launch Execution Window ({session.executionDurationMinutes}m)</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: EXECUTION WINDOW (REAL WORLD ACTION WITH COUNTDOWN) */}
      {session.step === 'execution_window' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                  RULE 18
                </span>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Active Execution Window
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                You are currently in real-world execution. The AI is on standby as the interpreter/checkpoint.
              </p>
            </div>

            {/* Big Countdown Timer */}
            <div className="flex items-center space-x-3 bg-slate-900 text-white px-4 py-2 rounded-xl">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xl font-mono font-bold tracking-wider">
                {formatTimer(executionTimerSecondsLeft)}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
              Active Assignment
            </span>
            <p className="text-sm font-semibold text-slate-900">
              {session.situationModel.nextRealityTest}
            </p>
            <p className="text-xs text-slate-600">
              Target Outcome: <strong>{session.outputContract?.tangibleOutcome}</strong>
            </p>
          </div>

          {/* Quick Checkpoint Input Form */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900 uppercase">
                Execution Observation / Result Log
              </label>
              <span className="text-xs text-slate-400 font-mono">
                Fill as soon as the test finishes
              </span>
            </div>
            <textarea
              rows={3}
              value={executionReport}
              onChange={(e) => setExecutionReport(e.target.value)}
              placeholder="What actually happened? What results did you get? Did anything differ from expectation?"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {onOpenStuckFeature && (
              <button
                onClick={() => onOpenStuckFeature('Encountered unexpected blocker during test')}
                className="text-xs text-rose-700 hover:text-rose-900 font-semibold inline-flex items-center space-x-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Stuck / Blocked? Diagnose Friction</span>
              </button>
            )}

            <button
              onClick={handleEvaluateCheckpoint}
              disabled={isLoadingAi || !executionReport.trim()}
              className="px-6 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs inline-flex items-center space-x-2 disabled:opacity-50 ml-auto"
            >
              {isLoadingAi ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Complete Test & Evaluate Checkpoint (Rule 19)</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: CHECKPOINT REVIEW & FEEDBACK LOOP */}
      {session.step === 'checkpoint' && session.checkpointReview && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                  RULE 19 & 20
                </span>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Checkpoint Evaluation & Model Update
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Reality has spoken. Continuous feedback-control system updates the model.
              </p>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                session.checkpointReview.doesModelStillHold === 'Yes'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              Model Status: {session.checkpointReview.doesModelStillHold}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
                1. What Happened
              </span>
              <p className="text-slate-800 font-semibold">
                {session.checkpointReview.whatHappened}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
                2. Result Obtained
              </span>
              <p className="text-slate-800 font-semibold">
                {session.checkpointReview.whatResultObtained}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
                3. What Differed From Expectation
              </span>
              <p className="text-slate-800 font-semibold">
                {session.checkpointReview.whatDifferedFromExpectation}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
                4. What We Learned
              </span>
              <p className="text-slate-800 font-semibold">
                {session.checkpointReview.whatLearned}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
              Updated Model Notes & Next Action
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">
              {session.checkpointReview.updatedModelNotes}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setSession((prev) => ({ ...prev, step: 'setup' }))}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start Next 5-Minute Cycle</span>
            </button>

            <button
              onClick={handleCommitTestedAction}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center space-x-2 shadow-sm"
            >
              <Award className="w-4 h-4 text-emerald-200" />
              <span>Commit Next Verified Task to PES Board</span>
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED SUCCESS BANNER */}
      {session.step === 'completed' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-emerald-950">
            Execution Cycle Complete!
          </h3>
          <p className="text-xs text-emerald-800 max-w-lg mx-auto leading-relaxed">
            The decision was compressed, tested in the real world, measured, and committed back to the system. Delta t was minimized with zero conversational fluff.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setSession((prev) => ({ ...prev, step: 'setup' }))}
              className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900"
            >
              Begin New Execution Meeting
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
