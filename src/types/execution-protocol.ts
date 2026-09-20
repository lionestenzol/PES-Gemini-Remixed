// Version 1.0 — Execution Meeting Protocol Types (Human + AI)

export type SituationClass = 'Normal' | 'Urgent' | 'Complex';

export type ProtocolBranch =
  | 'Planning'
  | 'Decision'
  | 'Problem'
  | 'Execution'
  | 'Urgent'
  | 'Exploration';

export type EpistemicStatus = 'Fact' | 'Inference' | 'Hypothesis';

export interface EpistemicItem {
  id: string;
  text: string;
  status: EpistemicStatus;
  confidence?: number; // 0-100%
}

export interface SituationModel {
  objective: string;
  known: EpistemicItem[];
  inferred: EpistemicItem[];
  unknown: EpistemicItem[];
  bottomLineProblem: string;
  nextRealityTest: string;
  confirmedByUser: boolean;
}

export interface PlanningOutputContract {
  plan: string; // What will be done
  schedule: string; // When it will be done (e.g. 5:00-10:00)
  purpose: string; // Why this action was selected
  tangibleOutcome: string; // What should exist or change
  measurement: string; // How the result will be recognized
  checkpoint: string; // When the result will be evaluated
  returnTimeDate: string; // When human + AI return to the problem
  nextStateRule: string; // What happens depending on the result (supported vs weakened)
}

export interface CheckpointReview {
  whatHappened: string;
  whatResultObtained: string;
  whatDifferedFromExpectation: string;
  whatLearned: string;
  doesModelStillHold: 'Yes' | 'Partially' | 'No';
  updatedModelNotes: string;
  completedAt: string;
}

export type ExecutionMeetingStep =
  | 'setup' // Time + Objective + Constraints + Class
  | 'rapid_intake' // High-value questions only
  | 'situation_model' // Known, Inferred, Unknown, Bottleneck, Test
  | 'model_confirm' // "This is my current model: [model]. Correct?"
  | 'planning_compiler' // The 5-minute planning compiler & output contract
  | 'execution_window' // Released to execution (countdown timer)
  | 'checkpoint' // Post-test review & model update
  | 'completed'; // Next action committed or card generated

export interface ExecutionMeetingSession {
  id: string;
  title: string;
  startedAt: string;
  availableMinutes: number; // e.g. 5, 10, 15, 30
  objective: string;
  constraints: string[];
  situationClass: SituationClass;
  branch: ProtocolBranch;
  step: ExecutionMeetingStep;
  situationModel: SituationModel;
  outputContract?: PlanningOutputContract;
  checkpointReview?: CheckpointReview;
  planningDurationSeconds: number;
  executionDurationMinutes: number;
  isPlanningTimerRunning: boolean;
  historyLog: {
    timestamp: string;
    stage: string;
    summary: string;
  }[];
}
