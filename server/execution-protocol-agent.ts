import { GoogleGenAI } from '@google/genai';
import { getAiClient } from './gemini-agent.js';
import {
  ExecutionMeetingSession,
  SituationModel,
  PlanningOutputContract,
  CheckpointReview,
} from '../src/types/execution-protocol.js';

const PROTOCOL_SYSTEM_INSTRUCTION = `You are the AI Execution-Meeting Engine, enforcing Version 1.0 of the AI Interaction & Execution Protocol.
YOUR PRIME DIRECTIVE:
1. "Maximize decision and action quality per unit of the user's time."
2. "Minimize Δt: The time between recognizing a situation and obtaining meaningful information from an executed response."
3. You are a compression layer between reality and action, NOT an open-ended conversationalist.
4. Planning ceiling is 5 MINUTES (or fewer). As soon as sufficient information exists to act, TERMINATE PLANNING and release the user to execution.
5. ANTI-DRIFT MANDATE:
   - No conversational drift.
   - No redundant questioning.
   - No unnecessary clarification.
   - Only ask questions where (Expected Improvement in Decision Quality / Time Cost) is high.
   - No artificial task inflation.
6. Epistemic Rigor: Clearly distinguish FACT (established), INFERENCE (derived from evidence), and HYPOTHESIS (requires testing).
7. Reality-Test Principle: "What is the fastest useful test that could confirm or disprove our current model?"
8. Output Contract: Every completed planning cycle must produce:
   - Plan
   - Schedule
   - Purpose
   - Tangible Outcome
   - Measurement
   - Checkpoint
   - Return Time/Date
   - Next-State Rule`;

// 1. Rapid Intake & Situation Model Compiler
export async function compileSituationModel(params: {
  availableTime: number;
  objective: string;
  situationClass: string;
  userContext: string;
  constraints?: string[];
}): Promise<{
  situationModel: SituationModel;
  recommendedBranch: string;
  rapidIntakeQuestion?: string;
}> {
  const ai = getAiClient();

  if (!ai) {
    // Fallback deterministic protocol compiler
    return {
      situationModel: {
        objective: params.objective,
        known: [
          { id: 'k-1', text: params.objective, status: 'Fact' },
          { id: 'k-2', text: `Available time: ${params.availableTime} minutes`, status: 'Fact' },
          { id: 'k-3', text: params.userContext || 'Initial situation described by operator', status: 'Fact' },
        ],
        inferred: [
          { id: 'i-1', text: 'Operator needs an immediate, testable real-world action', status: 'Inference', confidence: 90 },
          { id: 'i-2', text: 'Cognitive overhead can be eliminated with a 5-minute action window', status: 'Inference', confidence: 85 },
        ],
        unknown: [
          { id: 'u-1', text: 'Will the test produce the expected proof without external blockers?', status: 'Hypothesis' },
        ],
        bottomLineProblem: `Action bottleneck: Moving from concept "${params.objective.slice(0, 40)}" to the first physical test.`,
        nextRealityTest: `Execute a focused 10-minute sprint to generate the initial tangible artifact.`,
        confirmedByUser: false,
      },
      recommendedBranch: 'Execution',
      rapidIntakeQuestion: 'What is the immediate single physical action that proves progress?',
    };
  }

  const prompt = `Analyze this execution meeting input and return JSON obeying the AI Interaction & Execution Protocol:
Input:
- Available Time: ${params.availableTime} minutes
- Objective: ${params.objective}
- Situation Class: ${params.situationClass}
- Context/Details: ${params.userContext}
- Constraints: ${params.constraints?.join(', ') || 'Standard time/energy bounds'}

Generate a JSON object matching this schema:
{
  "situationModel": {
    "objective": string,
    "known": [{"id": string, "text": string, "status": "Fact"}],
    "inferred": [{"id": string, "text": string, "status": "Inference", "confidence": number}],
    "unknown": [{"id": string, "text": string, "status": "Hypothesis"}],
    "bottomLineProblem": string (concise, bottleneck-focused),
    "nextRealityTest": string (fastest useful test to confirm/disprove),
    "confirmedByUser": false
  },
  "recommendedBranch": "Planning" | "Decision" | "Problem" | "Execution" | "Urgent" | "Exploration",
  "rapidIntakeQuestion": string (OPTIONAL: ask ONLY ONE question if critical for the immediate decision; otherwise omit or leave empty)
}

Return ONLY valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: PROTOCOL_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      situationModel: parsed.situationModel,
      recommendedBranch: parsed.recommendedBranch || 'Execution',
      rapidIntakeQuestion: parsed.rapidIntakeQuestion || undefined,
    };
  } catch (err) {
    console.error('Failed to compile situation model via Gemini, using deterministic fallback:', err);
    return {
      situationModel: {
        objective: params.objective,
        known: [
          { id: 'k-1', text: params.objective, status: 'Fact' },
          { id: 'k-2', text: `Time budget: ${params.availableTime} minutes`, status: 'Fact' },
          { id: 'k-3', text: params.userContext || 'Core situation context provided by operator', status: 'Fact' },
        ],
        inferred: [
          { id: 'i-1', text: 'Operator requires an immediate single-active physical test', status: 'Inference', confidence: 90 },
          { id: 'i-2', text: 'Over-planning must be terminated to eliminate cognitive friction', status: 'Inference', confidence: 85 },
        ],
        unknown: [
          { id: 'u-1', text: 'Will reality confirm the expected test outcome within the allocated sprint?', status: 'Hypothesis' },
        ],
        bottomLineProblem: `Core bottleneck: Translating "${params.objective.slice(0, 50)}" into the fastest observable real-world test.`,
        nextRealityTest: `Execute a focused 10-minute sprint to produce and inspect the primary proof artifact.`,
        confirmedByUser: false,
      },
      recommendedBranch: 'Execution',
      rapidIntakeQuestion: undefined,
    };
  }
}

// 2. Compile 5-Minute Planning Output Contract
export async function compilePlanningContract(params: {
  situationModel: SituationModel;
  availableTime: number;
  userCorrections?: string;
}): Promise<PlanningOutputContract> {
  const ai = getAiClient();

  if (!ai) {
    return {
      plan: `1. Setup test environment (2m)\n2. Run targeted execution of "${params.situationModel.nextRealityTest}" (10m)\n3. Verify tangible output artifact`,
      schedule: `0:00-2:00 Planning (Complete)\n2:00-12:00 Real-world Test Execution\n12:00-14:00 Checkpoint Review`,
      purpose: `Directly attacks the bottleneck: ${params.situationModel.bottomLineProblem}`,
      tangibleOutcome: `Physical evidence or verification log produced and validated`,
      measurement: `Binary result: Test either produced the expected outcome or uncovered specific blocker`,
      checkpoint: `12 minutes from execution launch`,
      returnTimeDate: `Immediately following test completion for 2-minute checkpoint`,
      nextStateRule: `If SUPPORTED: Commit directly to PES Lifecycle Board (Scheduled/Ready). If WEAKENED: Re-route via The Stuck Feature.`,
    };
  }

  const prompt = `Produce the strict 8-point Planning Output Contract for this confirmed situation model:
Model:
- Objective: ${params.situationModel.objective}
- Bottom-Line Problem: ${params.situationModel.bottomLineProblem}
- Next Reality Test: ${params.situationModel.nextRealityTest}
- Known Facts: ${params.situationModel.known.map((k) => k.text).join('; ')}
- Inferences: ${params.situationModel.inferred.map((i) => i.text).join('; ')}
- User Corrections / Input: ${params.userCorrections || 'None, model accepted'}
- Available Time: ${params.availableTime} minutes

Output JSON with EXACTLY these 8 fields:
{
  "plan": string,
  "schedule": string,
  "purpose": string,
  "tangibleOutcome": string,
  "measurement": string,
  "checkpoint": string,
  "returnTimeDate": string,
  "nextStateRule": string
}

Ensure the plan is concise, non-fluff, and directly executable. Return ONLY valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: PROTOCOL_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (err) {
    console.error('Failed to compile planning contract via Gemini, using deterministic fallback:', err);
    return {
      plan: `1. Setup test environment (2m)\n2. Run targeted execution: "${params.situationModel.nextRealityTest}" (10m)\n3. Verify tangible proof artifact and inspect results`,
      schedule: `0:00–2:00 Planning (Completed)\n2:00–12:00 Real-world Execution Window\n12:00–14:00 Checkpoint Review & Update`,
      purpose: `Directly isolates and attacks the bottleneck: ${params.situationModel.bottomLineProblem}`,
      tangibleOutcome: `Observable proof artifact or external reaction produced`,
      measurement: `Binary outcome: Reality either validated the hypothesis or surfaced an exact friction point`,
      checkpoint: `12 minutes from execution launch`,
      returnTimeDate: `Immediately upon sprint completion for 2-minute checkpoint`,
      nextStateRule: `If SUPPORTED: Commit directly to PES Lifecycle Board. If WEAKENED: Diagnose in The Stuck Feature.`,
    };
  }
}

// 3. Checkpoint Review Evaluator
export async function evaluateCheckpoint(params: {
  outputContract: PlanningOutputContract;
  whatActuallyHappened: string;
}): Promise<CheckpointReview> {
  const ai = getAiClient();

  if (!ai) {
    return {
      whatHappened: params.whatActuallyHappened,
      whatResultObtained: 'Execution completed by operator',
      whatDifferedFromExpectation: 'No severe variance detected',
      whatLearned: 'Validated the hypothesis against real-world test',
      doesModelStillHold: 'Yes',
      updatedModelNotes: 'Proceed to next scheduled commitment',
      completedAt: new Date().toISOString(),
    };
  }

  const prompt = `Evaluate the execution checkpoint based on the Planning Output Contract and the real-world observation:
Output Contract:
- Plan: ${params.outputContract.plan}
- Expected Outcome: ${params.outputContract.tangibleOutcome}
- Measurement: ${params.outputContract.measurement}
- Next-State Rule: ${params.outputContract.nextStateRule}

Operator Real-World Report:
"${params.whatActuallyHappened}"

Output JSON with EXACTLY these fields:
{
  "whatHappened": string,
  "whatResultObtained": string,
  "whatDifferedFromExpectation": string,
  "whatLearned": string,
  "doesModelStillHold": "Yes" | "Partially" | "No",
  "updatedModelNotes": string
}

Return ONLY valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: PROTOCOL_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      ...parsed,
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Failed to evaluate checkpoint via Gemini, using fallback:', err);
    return {
      whatHappened: params.whatActuallyHappened,
      whatResultObtained: 'Observed real-world execution results logged by operator',
      whatDifferedFromExpectation: 'Model tested against real-world operational friction',
      whatLearned: 'Direct observation provides concrete ground truth over speculative planning',
      doesModelStillHold: 'Yes',
      updatedModelNotes: 'Ready to promote tested action to Scheduled on the Lifecycle Board',
      completedAt: new Date().toISOString(),
    };
  }
}
