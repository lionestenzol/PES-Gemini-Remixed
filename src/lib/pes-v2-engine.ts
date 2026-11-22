import {
  PesV2Stage,
  PromptIndexItem,
  V2IntakeRecord,
  V2KnowledgeEntity,
  V2ResourceEntity,
  V2DependencyCondition,
  V2ListItem,
  V2TreeNode,
  V2DependencyNode,
  V2BpmnElement,
  V2Ticket,
  V2TelemetryLogEntry,
  V2TroubleshootingTicket,
  V2TerminalJsonPayload,
} from '../types.js';

// ============================================================================
// COMPARTMENT 0: MASTER PROMPT ARCHITECTURE & COMPLETE A→Z PROMPT INDEX
// ============================================================================

export const MASTER_PROMPT_INDEX: PromptIndexItem[] = [
  {
    id: 'P-01',
    category: 'Macro',
    stage: 'intent',
    title: 'Intake Conversational Script & Extraction',
    component: 'Compartment 1 — Intake & Validation Engine',
    interrogation: {
      whatNeedsToKnow: [
        'User raw input stream',
        'Conversational context and user history',
        'Required intake fields schema (what person wants, outcome, targets)',
      ],
      whatNeedsToDo: [
        'Strip conversational rhetoric and emotional filler',
        'Extract core operational signal without assuming missing data',
        'Detect ambiguity gaps and prompt for explicit parameters',
      ],
      whatNeedsToProduce: [
        'Clean parsed signal payload with discrete outcome target',
        'Extracted parameters map and explicit constraints list',
      ],
      whatConnectsTo: [
        'Raw User Input (upstream)',
        'Intent Sorting & Binning Engine (downstream)',
      ],
      whatCanStopIt: [
        'Completely empty or unintelligible input',
        'Contradictory directives that cannot be reconciled',
      ],
      whatHappensNext: [
        'Passes parsed signal to Intent Binning and Has ↔ Wants Comparator',
      ],
    },
    rules: [
      'RULE 1: Do not manufacture missing information through assumption.',
      'RULE 2: Preserve exact constraints stated by the human.',
      'RULE 3: Treat compound requests as candidate split-intents.',
    ],
    gates: [
      'Intake Completeness Check: Target outcome must be non-empty.',
    ],
    failurePaths: [
      'Ambiguity Trap → Trigger Clarification Sub-prompt → Hold at Intake.',
    ],
    templateSnippet: `SYSTEM: You are the PES Intake Extractor.
INPUT: {raw_user_input}
INSTRUCTION: Strip conversational noise. Extract:
1. Target Outcome
2. Action Parameters
3. Constraints
DO NOT ASSUME missing details. If missing, flag as [MISSING_PREREQUISITE].`,
  },
  {
    id: 'P-02',
    category: 'Micro',
    stage: 'intent',
    title: 'Intent Sorting & Multi-Intent Binning',
    component: 'Compartment 1 — Intake Binning Engine',
    interrogation: {
      whatNeedsToKnow: [
        'Parsed signal components',
        'Existing operational domains (Infrastructure, Data, Auth, Governance, Ops)',
      ],
      whatNeedsToDo: [
        'Separate multi-intent requests into discrete work streams',
        'Assign categorical bin and isolate unrelated scopes',
      ],
      whatNeedsToProduce: [
        'Discrete categorized intent containers with scope boundaries',
      ],
      whatConnectsTo: [
        'Intake Parser (upstream)',
        'Has ↔ Wants Comparator (downstream)',
      ],
      whatCanStopIt: [
        'Overlapping conflicting intents across mutual domains',
      ],
      whatHappensNext: [
        'Route each binned intent to Has/Wants reality check',
      ],
    },
    rules: [
      'RULE: Never merge distinct operational targets into one monolithic work object.',
    ],
    gates: [
      'Bin Consistency Gate: Target domain must have registered execution affordances.',
    ],
    failurePaths: [
      'Unbinnable Scope → Escalate to Human Operator for classification.',
    ],
    templateSnippet: `INSTRUCTION: Analyze parsed intent. Separate independent work items.
Assign: Primary Domain, Priority Class, and Isolation Boundaries.`,
  },
  {
    id: 'P-03',
    category: 'Macro',
    stage: 'validation',
    title: 'Has ↔ Wants Delta & Deterministic Validation Gate',
    component: 'Compartment 1 — Feasibility & Validation Gate',
    interrogation: {
      whatNeedsToKnow: [
        'Desired state (What Person Wants)',
        'Current available state (What Person Has: assets, tokens, state)',
        'System baseline rules and resource constraints',
      ],
      whatNeedsToDo: [
        'Compute Delta = Wants - Has',
        'Identify prerequisite gaps and missing credentials',
        'Enforce pass/fail deterministic gate check',
      ],
      whatNeedsToProduce: [
        'Validation Decision: PASSED | FAILED | NEEDS_CLARIFICATION',
        'Detailed Delta inventory and gap analysis report',
      ],
      whatConnectsTo: [
        'Intent Bins (upstream)',
        'Knowledge & Resource Graph Extraction (downstream)',
      ],
      whatCanStopIt: [
        'Violations of hard system invariants or missing critical tokens',
        'Target outcome physically or logically unachievable with current affordances',
      ],
      whatHappensNext: [
        'If PASSED: Permit progression into Compartment 2 (Knowledge & Resources)',
        'If FAILED: Reject with specific gap diagnostics',
      ],
    },
    rules: [
      'RULE: Nothing proceeds simply because the model generated something plausible.',
      'RULE: Any unverified capability in the "Has" vector halts the gate.',
    ],
    gates: [
      'Feasibility Gate: All required inputs must be provably accessible or constructible.',
    ],
    failurePaths: [
      'Gate Rejection → Return to Intake with Missing Affordance List.',
    ],
    templateSnippet: `VALIDATION_GATE_RULES:
1. Check: DesiredState != CurrentState
2. Check: RequiredAffordances ⊆ AvailableAffordances
3. Assert: No rule invariant breaches.
OUTPUT: { status: "PASSED" | "FAILED", delta: [], blockers: [] }`,
  },
  {
    id: 'P-04',
    category: 'Macro',
    stage: 'knowledge_resources',
    title: 'Knowledge Graph & Resource Affordance Mapping',
    component: 'Compartment 2 — Knowledge & Resource Graph',
    interrogation: {
      whatNeedsToKnow: [
        'Validated Intent Delta',
        'Current system topology (databases, schemas, services, tokens, tools)',
        'Historical execution state and audit records',
      ],
      whatNeedsToDo: [
        'Map conceptual entities into structured nodes and edges',
        'Distinguish knowing something exists from having permission/ability to use it',
        'Produce structured Knowledge Graph and Resource Graph',
      ],
      whatNeedsToProduce: [
        'Knowledge Graph (Entities, Types, Properties, Relational Edges)',
        'Resource Graph (Tools, APIs, Files, Tokens, Availability status)',
      ],
      whatConnectsTo: [
        'Validation Gate (upstream)',
        'Dependency Discovery Matrix (downstream)',
      ],
      whatCanStopIt: [
        'Unresolved entity collision or orphaned dependencies in resource tree',
      ],
      whatHappensNext: [
        'Feed connected graph into Dependency Discovery Layer',
      ],
    },
    rules: [
      'RULE: Distinctly isolate Knowledge (what is true) from Resources (what can act).',
    ],
    gates: [
      'Resource Availability Check: Locked or Missing resources cannot be scheduled.',
    ],
    failurePaths: [
      'Resource Deficit → Trigger Resource Acquisition Workflow.',
    ],
    templateSnippet: `EXTRACT_GRAPHS:
Identify all entities, active connections, and required tools.
Tag tool availability: [AVAILABLE] | [LOCKED] | [MISSING].`,
  },
  {
    id: 'P-05',
    category: 'Micro',
    stage: 'dependencies',
    title: 'Dependency Discovery Matrix & Condition Gating',
    component: 'Compartment 2 — Dependency Matrix',
    interrogation: {
      whatNeedsToKnow: [
        'Resource Graph and Knowledge Entities',
        'Execution prerequisites and temporal ordering requirements',
      ],
      whatNeedsToDo: [
        'Discover all hard blockers, soft sequencing, and prerequisite conditions',
        'Construct explicit condition matrix (Source -> Condition -> Target)',
      ],
      whatNeedsToProduce: [
        'Condition Matrix with satisfaction evaluation for every link',
      ],
      whatConnectsTo: [
        'Knowledge/Resource Graphs (upstream)',
        'Structural Evolution: The List & The Tree (downstream)',
      ],
      whatCanStopIt: [
        'Circular dependency loops (A requires B, B requires A)',
      ],
      whatHappensNext: [
        'Conditions govern the structural decomposition in Compartment 3',
      ],
    },
    rules: [
      'RULE: Dependency discovery identifies conditions; structuring determines work.',
      'RULE: Circular dependencies are catastrophic errors and abort immediately.',
    ],
    gates: [
      'Acyclicity Gate: Directed graph must be a strict DAG (Directed Acyclic Graph).',
    ],
    failurePaths: [
      'Cycle Detected → Abort with Cycle Trace → Human Operator Intervention.',
    ],
    templateSnippet: `DISCOVER_DEPENDENCIES:
Matrix format: [Source] -[Condition Type]-> [Target].
Assert: Acyclic topology. Verify satisfaction status.`,
  },
  {
    id: 'P-06',
    category: 'Macro',
    stage: 'list',
    title: 'The List — Flat Operational Inventory',
    component: 'Compartment 3 — Structural Evolution (Stage 1)',
    interrogation: {
      whatNeedsToKnow: [
        'Validated Delta and Discovered Conditions',
      ],
      whatNeedsToDo: [
        'Generate an exhaustive, flat inventory of every required action and output',
        'Ensure zero omissions prior to hierarchical nesting',
      ],
      whatNeedsToProduce: [
        'Complete sequential List of discrete items with required outputs',
      ],
      whatConnectsTo: [
        'Dependency Matrix (upstream)',
        'The Tree Hierarchical Decomposer (downstream)',
      ],
      whatCanStopIt: [
        'Incomplete output specification for any action item',
      ],
      whatHappensNext: [
        'Flat list is transformed into hierarchical parent/child tree',
      ],
    },
    rules: [
      'RULE: Every list item must have a verifiable tangible output.',
    ],
    gates: [
      'Completeness Audit: Does the union of list outputs satisfy the intent delta?',
    ],
    failurePaths: [
      'Omission Gap → Re-evaluate Delta against Inventory.',
    ],
    templateSnippet: `GENERATE_LIST:
Catalog all necessary operations, required assets, and tangible deliverables.
Do not nest or group yet. Keep strictly flat.`,
  },
  {
    id: 'P-07',
    category: 'Macro',
    stage: 'tree',
    title: 'The Tree — Hierarchical Decomposition',
    component: 'Compartment 3 — Structural Evolution (Stage 2)',
    interrogation: {
      whatNeedsToKnow: [
        'Flat List Inventory',
        'Functional and operational domains',
      ],
      whatNeedsToDo: [
        'Decompose flat items into Parent Tasks and Child Subtasks',
        'Establish structural and organizational nesting levels (Level 0, 1, 2)',
      ],
      whatNeedsToProduce: [
        'Tree Node Hierarchy with explicit parent_id pointers',
      ],
      whatConnectsTo: [
        'Flat List (upstream)',
        'Dependency Graph (downstream)',
      ],
      whatCanStopIt: [
        'Unbalanced depth or ambiguous ownership hierarchy',
      ],
      whatHappensNext: [
        'Tree hierarchy is cross-referenced with prerequisite dependencies',
      ],
    },
    rules: [
      'RULE: Child tasks must be collectively exhaustive of their parent node.',
    ],
    gates: [
      'Hierarchy Integrity: No leaf node without clear execution scope.',
    ],
    failurePaths: [
      'Orphaned Subtask → Re-bind to appropriate parent epic.',
    ],
    templateSnippet: `DECOMPOSE_TREE:
Organize flat inventory into:
- Epic / Objective (Root)
  - Milestone (Parent)
    - Subtask / Unit of Work (Leaf)`,
  },
  {
    id: 'P-08',
    category: 'Macro',
    stage: 'bpmn',
    title: 'BPMN Operational Process Routing & Decision Gates',
    component: 'Compartment 3 — Process Routing Engine',
    interrogation: {
      whatNeedsToKnow: [
        'Dependency Graph and Tree Hierarchy',
        'Decision points, gateways, and failure branch conditions',
      ],
      whatNeedsToDo: [
        'Map structural graph into operational sequence flows',
        'Insert Exclusive (XOR) and Parallel (AND) gateways',
        'Model formal Start/End events and exception routing',
      ],
      whatNeedsToProduce: [
        'Formal BPMN process diagram schema with sequence flows and gateways',
      ],
      whatConnectsTo: [
        'Dependency Graph (upstream)',
        'Ticket Generator (downstream)',
      ],
      whatCanStopIt: [
        'Deadlock gateways or unhandled error branch termination',
      ],
      whatHappensNext: [
        'Process activities are sliced into discrete executable tickets',
      ],
    },
    rules: [
      'RULE: Every gateway condition must have an explicit fallback/timeout path.',
    ],
    gates: [
      'BPMN Validation: All paths must reach a designated terminal EndEvent.',
    ],
    failurePaths: [
      'Deadlock Branch → Refactor Gateway join logic.',
    ],
    templateSnippet: `ROUTING_BPMN:
Define:
- StartEvent
- Activity Tasks
- Gateways (Parallel / Exclusive)
- Error Boundaries & Escalation Paths
- EndEvents`,
  },
  {
    id: 'P-09',
    category: 'Macro',
    stage: 'tickets',
    title: 'Ticket Generation, Packaging & Executor Routing',
    component: 'Compartment 3 — The Core Ticket Engine',
    interrogation: {
      whatNeedsToKnow: [
        'BPMN Activities',
        'Executor capability registry (Human, AI, System, Tool)',
        'Proof standards and required evidence formats',
      ],
      whatNeedsToDo: [
        'Package each activity into a standalone, discrete executable ticket',
        'Assign executor class (Human, AI, System, Tool)',
        'Attach inputs, dependencies, expected result, and proof criteria',
      ],
      whatNeedsToProduce: [
        'Collection of validated V2Ticket objects ready for execution',
      ],
      whatConnectsTo: [
        'BPMN Routing (upstream)',
        'Deterministic Middle-Box Execution Engine (downstream)',
      ],
      whatCanStopIt: [
        'Ticket missing proof requirements or input contract',
      ],
      whatHappensNext: [
        'Tickets are sent to executor queues; Middle Box runs deterministic work',
      ],
    },
    rules: [
      'RULE: A ticket is never a vague note; it is a self-contained contract of work.',
      'RULE: Every ticket MUST state explicit proof criteria.',
    ],
    gates: [
      'Ticket Contract Gate: Missing inputs or proof requirements block ticket issuance.',
    ],
    failurePaths: [
      'Incomplete Ticket → Return to Ticket Packaging.',
    ],
    templateSnippet: `GENERATE_TICKETS:
For each activity, output:
{
  id: "T-XXX",
  executor: "Human" | "AI" | "System" | "Tool",
  inputs: {},
  expected_result: "",
  proof_requirement: ""
}`,
  },
  {
    id: 'P-10',
    category: 'Macro',
    stage: 'execution',
    title: 'The Middle Box — Hardened Deterministic Execution',
    component: 'Compartment 3 — Execution Runner (Middle Box)',
    interrogation: {
      whatNeedsToKnow: [
        'Active Ticket parameters and inputs',
        'Deterministic runner harness (Node.js, SQL, API Client, Shell)',
      ],
      whatNeedsToDo: [
        'Execute work strictly deterministically without AI interference',
        'Stream step-by-step stdout, stderr, and execution telemetry',
        'Capture raw output artifact and execution status',
      ],
      whatNeedsToProduce: [
        'Execution result payload and raw telemetry logs',
      ],
      whatConnectsTo: [
        'Ticket Dispatcher (upstream)',
        'Proof Verification Gate (downstream)',
      ],
      whatCanStopIt: [
        'Runtime exception, timeout, non-zero exit code, or network failure',
      ],
      whatHappensNext: [
        'On success: Pass result to Proof Validation Gate',
        'On failure: Generate failure telemetry and invoke Troubleshooting Loop',
      ],
    },
    rules: [
      'RULE: AI is stepped OUT of the loop during deterministic execution.',
      'RULE: Execution occurring does NOT automatically equal successful completion.',
    ],
    gates: [
      'Execution Exit Code Check: Process must exit with code 0 and non-empty output.',
    ],
    failurePaths: [
      'Non-zero Exit Code → Capture STDERR → Dispatch to Troubleshooting Pipeline.',
    ],
    templateSnippet: `EXECUTION_MIDDLE_BOX:
Input: Validated Ticket
Action: Invoke deterministic handler. AI is decoupled.
Capture: STDOUT, STDERR, Artifacts.`,
  },
  {
    id: 'P-11',
    category: 'Macro',
    stage: 'proof',
    title: 'Proof Gate & Telemetry Verification',
    component: 'Compartment 3 — Proof & Verification Engine',
    interrogation: {
      whatNeedsToKnow: [
        'Ticket proof requirements',
        'Submitted result artifact and evidence location',
      ],
      whatNeedsToDo: [
        'Verify submitted proof directly against required criteria',
        'Enforce Separation of Duties (SoD) for high-risk executions',
      ],
      whatNeedsToProduce: [
        'Proof Verification Decision: VERIFIED | REJECTED',
        'Signed verification audit stamp',
      ],
      whatConnectsTo: [
        'Middle Box Runner (upstream)',
        'State Update & Feedback Engine (downstream)',
      ],
      whatCanStopIt: [
        'Evidence missing, corrupted, or failing schema assertion',
        'Self-verification attempt by unauthorized author',
      ],
      whatHappensNext: [
        'If VERIFIED: Mark ticket Completed and trigger State Update feedback loop',
        'If REJECTED: Return ticket to Executing/Failed state',
      ],
    },
    rules: [
      'RULE: Proof sits between raw execution and accepted completion.',
      'RULE: No completion without verifiable evidence.',
    ],
    gates: [
      'Evidence Integrity Gate: Proof artifact must be accessible and verifiable.',
    ],
    failurePaths: [
      'Proof Rejected → Mark Ticket Failed → Emit Audit Warning.',
    ],
    templateSnippet: `VERIFY_PROOF:
Assert: Evidence matches ProofCriteria.
Check: Verifier != Author (Separation of Duties).
Status: [VERIFIED] | [REJECTED].`,
  },
  {
    id: 'P-12',
    category: 'Macro',
    stage: 'state_update',
    title: 'State Update & Dependency Unlock Feedback Loop',
    component: 'Compartment 3/4 — System Feedback Engine',
    interrogation: {
      whatNeedsToKnow: [
        'Verified Ticket completion result',
        'Current Knowledge Graph, Resource Graph, and Dependency Matrix',
      ],
      whatNeedsToDo: [
        'Push execution outcomes back into Knowledge and Resource state',
        'Re-evaluate Dependency Matrix and unlock downstream dependent tickets',
        'Record state transition into immutable audit telemetry',
      ],
      whatNeedsToProduce: [
        'Updated Knowledge entities, freed resources, and newly UNLOCKED tickets',
      ],
      whatConnectsTo: [
        'Proof Gate (upstream)',
        'Downstream Ticket Dispatcher & Terminal Payload (downstream)',
      ],
      whatCanStopIt: [
        'State mutation conflict or corrupted relational pointer',
      ],
      whatHappensNext: [
        'Newly unlocked tickets transition to Ready/Scheduled state',
        'If all tickets completed: Compile Terminal JSON Payload',
      ],
    },
    rules: [
      'RULE: Execution changes reality; state must reflect actual changed reality.',
    ],
    gates: [
      'Atomic Update Gate: All graph mutations and unlocks occur in one atomic cycle.',
    ],
    failurePaths: [
      'State Mutation Failure → Rollback transaction and flag system error.',
    ],
    templateSnippet: `STATE_FEEDBACK_LOOP:
1. Update Knowledge/Resource Graph.
2. Re-evaluate Dependency Matrix.
3. For each dependent ticket: if all prerequisites satisfied, set status = READY.`,
  },
  {
    id: 'P-13',
    category: 'Macro',
    stage: 'state_update',
    title: 'Failure Isolation & Troubleshooting Pipeline Re-entry',
    component: 'Compartment 3 — Failure & Troubleshooting Engine',
    interrogation: {
      whatNeedsToKnow: [
        'Failed Ticket identity and parameters',
        'Failure evidence, stderr, error code, and context snapshot',
      ],
      whatNeedsToDo: [
        'Capture failure evidence and generate structured Troubleshooting Ticket',
        'Formulate root-cause hypothesis and concrete mitigation plan',
        'Determine exact re-entry stage in the pipeline (Intake, Validation, or Execution)',
      ],
      whatNeedsToProduce: [
        'V2TroubleshootingTicket with mitigation plan and targeted re-entry point',
      ],
      whatConnectsTo: [
        'Failed Middle Box / Proof Gate (upstream)',
        'Pipeline Re-entry Point (Intake, Resource, or Ticket layer) (downstream)',
      ],
      whatCanStopIt: [
        'Catastrophic system failure requiring external human infrastructure intervention',
      ],
      whatHappensNext: [
        'Re-inject troubleshooting work unit into the designated pipeline compartment',
      ],
    },
    rules: [
      'RULE: Failure is never just an error message; failure is structured work.',
      'RULE: Troubleshooting re-enters the pipeline with explicit evidence.',
    ],
    gates: [
      'Mitigation Feasibility Gate: Proposed fix must address the recorded root cause.',
    ],
    failurePaths: [
      'Unresolvable Failure → Escalate to Human Administrator.',
    ],
    templateSnippet: `TROUBLESHOOTING_ENGINE:
Failure detected on Ticket: {id}
Generate:
1. Root cause hypothesis
2. Mitigation steps
3. Re-entry compartment (Intake | Resources | Execution)`,
  },
  {
    id: 'P-14',
    category: 'Macro',
    stage: 'terminal_payload',
    title: 'Terminal JSON Payload Compiler & Machine Artifact',
    component: 'Compartment 4 — Terminal Artifact Generator',
    interrogation: {
      whatNeedsToKnow: [
        'Complete end-to-end lifecycle artifacts from Compartments 0 through 4',
      ],
      whatNeedsToDo: [
        'Compile original input, validated intent, knowledge/resource graphs, list, tree, dependencies, BPMN, tickets, proof, logs, and state updates',
        'Compute cryptographic SHA-256 integrity hash across the document',
        'Produce the immutable, machine-readable Terminal JSON Payload',
      ],
      whatNeedsToProduce: [
        'Immutable V2TerminalJsonPayload JSON document',
      ],
      whatConnectsTo: [
        'Entire PES V2 Pipeline (upstream)',
        'External Consumers, Auditors, and Downstream Systems (downstream)',
      ],
      whatCanStopIt: [
        'Missing lifecycle stages or schema validation failure',
      ],
      whatHappensNext: [
        'Payload is archived to cold storage and exported to external systems',
      ],
    },
    rules: [
      'RULE: The Terminal JSON Payload is the definitive machine-readable proof of execution.',
      'RULE: The payload is immutable once generated.',
    ],
    gates: [
      'Schema Validation Gate: Payload must conform strictly to PES V2 Terminal Schema.',
    ],
    failurePaths: [
      'Payload Schema Breach → Abort compilation and flag integrity alert.',
    ],
    templateSnippet: `COMPILE_TERMINAL_PAYLOAD:
Package all compartments into comprehensive JSON.
Generate SHA-256 integrity hash.
Status: COMPLETED.`,
  },
];

// ============================================================================
// COMPARTMENT 1-4: CORE PES V2 ENGINE IMPLEMENTATION
// ============================================================================

export class PesV2Engine {
  private intakeRecord: V2IntakeRecord;
  private knowledgeEntities: V2KnowledgeEntity[];
  private resourceEntities: V2ResourceEntity[];
  private dependencyMatrix: V2DependencyCondition[];
  private listItems: V2ListItem[];
  private treeNodes: V2TreeNode[];
  private dependencyNodes: V2DependencyNode[];
  private bpmnElements: V2BpmnElement[];
  private tickets: V2Ticket[];
  private telemetryLogs: V2TelemetryLogEntry[];
  private troubleshootingTickets: V2TroubleshootingTicket[];

  constructor() {
    this.intakeRecord = this.getDefaultIntakeRecord();
    this.knowledgeEntities = this.getDefaultKnowledgeEntities();
    this.resourceEntities = this.getDefaultResourceEntities();
    this.dependencyMatrix = this.getDefaultDependencyMatrix();
    this.listItems = this.getDefaultListItems();
    this.treeNodes = this.getDefaultTreeNodes();
    this.dependencyNodes = this.getDefaultDependencyNodes();
    this.bpmnElements = this.getDefaultBpmnElements();
    this.tickets = this.getDefaultTickets();
    this.telemetryLogs = this.getDefaultTelemetryLogs();
    this.troubleshootingTickets = this.getDefaultTroubleshootingTickets();
  }

  // --- COMPARTMENT 1: INTAKE & VALIDATION ---
  public getIntakeRecord(): V2IntakeRecord {
    return this.intakeRecord;
  }

  public processRawIntent(rawInput: string): V2IntakeRecord {
    const trimmed = rawInput.trim();
    const id = `IN-${Date.now().toString(36).toUpperCase()}`;

    // Parsing heuristics to demonstrate deterministic signal extraction
    const hasDb = /database|db|migration|postgres|schema/i.test(trimmed);
    const hasAuth = /auth|oauth|pkce|token|jwt/i.test(trimmed);
    const hasTest = /test|verify|spec|benchmark/i.test(trimmed);

    const intentBin = hasDb ? 'Infrastructure & Data' : hasAuth ? 'Authentication & Security' : 'System Operations';

    const wants = trimmed || 'Execute zero-downtime multi-tenant schema isolation with PKCE auth';
    const missing: string[] = [];

    if (!hasTest) missing.push('Automated verification assertion suite');
    if (!/downtime|sla/i.test(trimmed)) missing.push('SLA downtime threshold requirement');

    const completenessCheck = trimmed.length > 15;
    const feasibilityCheck = true;
    const constraintsMet = missing.length <= 1;

    const record: V2IntakeRecord = {
      id,
      rawInput: trimmed || 'Deploy multi-tenant migration with PKCE auth verification',
      parsedSignal: {
        whatPersonWants: wants,
        targetOutcome: `Deliver production-ready implementation of: ${wants}`,
        parameters: {
          runtime: 'Node.js / Express',
          protocol: 'REST / JSON',
          isolation: 'Tenant ID Schema Partition',
        },
        constraints: [
          'Zero-downtime execution constraint',
          'Strict Separation of Duties for verification sign-off',
          'Deterministic exit code 0 requirement',
        ],
      },
      intentBin,
      personHas: {
        assets: [
          'Postgres Connection URI',
          'Service Account Auth Credentials',
          'PES Guarded State Machine v1.0',
        ],
        capabilities: [
          'Docker container environment',
          'Local Node.js TypeScript runner',
          'Automated Jest test runner',
        ],
        currentSystemState: 'Pre-migration staging environment (Single-tenant legacy)',
      },
      intentHasComparison: {
        available: [
          'Database credentials verified',
          'Execution runner active on port 3000',
        ],
        missing,
        clarificationNeeded: missing.length > 0 ? ['Confirm SLA tolerance for read-only failover window'] : [],
      },
      validationGate: {
        status: completenessCheck && feasibilityCheck ? 'PASSED' : 'NEEDS_CLARIFICATION',
        completenessCheck,
        feasibilityCheck,
        constraintsMet,
        gateNotes: completenessCheck
          ? 'Passed Compartment 1 validation gate. Intent is fully specified and feasible.'
          : 'Hold at Intake. Signal lacks minimum threshold of operational specification.',
      },
      timestamp: new Date().toISOString(),
    };

    this.intakeRecord = record;
    this.addTelemetryLog('INTAKE_PARSED', 'INTAKE', `Parsed raw intent into validated record ${id}`);

    if (trimmed) {
      this.listItems = this.deriveListItems(trimmed);
      this.addTelemetryLog(
        'LIST_DERIVED',
        'INTAKE',
        `Derived ${this.listItems.length} list item(s) from raw intent ${id}`
      );

      this.treeNodes = this.deriveTreeNodes(this.listItems, trimmed);
      const groupCount = this.treeNodes[0]?.children?.length ?? 0;
      this.addTelemetryLog(
        'TREE_DERIVED',
        'INTAKE',
        `Decomposed ${this.listItems.length} list item(s) into ${groupCount} group(s)`
      );

      this.tickets = this.deriveTickets(this.listItems);
      this.addTelemetryLog(
        'TICKETS_DERIVED',
        'INTAKE',
        `Packaged ${this.tickets.length} ticket(s) from derived list item(s)`
      );

      this.dependencyNodes = this.deriveDependencyNodes(this.tickets);
      const readyCount = this.dependencyNodes.filter((d) => !d.isBlocked).length;
      this.addTelemetryLog(
        'DEPENDENCY_GRAPH_DERIVED',
        'INTAKE',
        `Built dependency graph for ${this.dependencyNodes.length} ticket(s); ${readyCount} ready, ${this.dependencyNodes.length - readyCount} blocked`
      );

      this.bpmnElements = this.deriveBpmnElements(this.dependencyNodes);
      this.addTelemetryLog(
        'BPMN_DERIVED',
        'INTAKE',
        `Routed ${this.dependencyNodes.length} ticket(s) into ${this.bpmnElements.length} BPMN element(s)`
      );
    }

    return record;
  }

  private deriveListItems(rawInput: string): V2ListItem[] {
    const PREREQUISITE = /\b(need|needs|require|requires|obtain|gather|collect|buy|book|order|before)\b/i;
    const OUTPUT = /\b(deliver|produce|send|submit|publish|report|document)\b/i;
    const RESOURCE = /\b(tool|tools|material|materials|part|parts|gear|budget|access|account|licence|license|key)\b/i;
    // "fix the gate, done when it latches" -> item is the work, requiredOutput is the proof
    const DONE_CLAUSE = /\s*[,.]?\s*\b(?:done when|done means|proof(?: is)?|so that)\b[:\s]+(.+)$/i;

    const units = rawInput
      .split(/\r?\n|;|\s+then\s+|,\s+and\s+|(?<=\.)\s+(?=[A-Z])/i)
      .map((part) => part.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
      .filter((part) => part.length > 2);

    const seen = new Set<string>();
    const items: V2ListItem[] = [];

    for (const unit of units) {
      const doneMatch = unit.match(DONE_CLAUSE);
      const text = (doneMatch ? unit.slice(0, doneMatch.index) : unit).trim().replace(/[.;,]+$/, '');
      if (text.length < 3) continue;

      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const order = items.length + 1;
      items.push({
        id: `L-${String(order).padStart(2, '0')}`,
        order,
        item: text,
        type: PREREQUISITE.test(text)
          ? 'Prerequisite'
          : OUTPUT.test(text)
            ? 'Output'
            : RESOURCE.test(text)
              ? 'Resource'
              : 'Action',
        requiredOutput: doneMatch
          ? doneMatch[1].trim().replace(/[.;,]+$/, '')
          : 'Undefined — state what proves this is done',
      });
    }

    return items;
  }

  // Execution order, not alphabetical: what must hold, what it needs, the work, what ships.
  // Shared by deriveTreeNodes (grouping) and deriveTickets (dependency wiring).
  private readonly STRUCTURAL_GROUPS: { type: V2ListItem['type']; title: string; description: string }[] = [
    { type: 'Prerequisite', title: 'Prerequisites', description: 'Must hold before the work can start' },
    { type: 'Resource', title: 'Resources', description: 'Needed on hand to do the work' },
    { type: 'Action', title: 'Actions', description: 'The work itself' },
    { type: 'Output', title: 'Outputs', description: 'What leaves your hands when it is done' },
  ];

  private deriveTreeNodes(listItems: V2ListItem[], goal: string): V2TreeNode[] {
    if (listItems.length === 0) return [];

    const children: V2TreeNode[] = [];
    for (const group of this.STRUCTURAL_GROUPS) {
      const members = listItems.filter((item) => item.type === group.type);
      if (members.length === 0) continue;
      children.push({
        id: `TR-${group.type.toUpperCase()}`,
        title: group.title,
        description: group.description,
        level: 1,
        // leaf id is the list item id, so a derived ticket of the same id links back here
        children: members.map((member) => ({
          id: member.id,
          title: member.item,
          description: member.requiredOutput,
          level: 2,
        })),
      });
    }

    const headline = goal.replace(/\s+/g, ' ').trim();
    return [
      {
        id: 'TR-ROOT',
        title: headline.length > 80 ? `${headline.slice(0, 77)}...` : headline,
        description: `${listItems.length} item(s) in ${children.length} group(s), derived from the intake text`,
        level: 0,
        children,
      },
    ];
  }

  private deriveTickets(listItems: V2ListItem[]): V2Ticket[] {
    if (listItems.length === 0) return [];

    const HUMAN = /\b(approve|review|decide|sign[- ]?off|negotiate|interview|hire|call|meet|discuss|ask|confirm|authorize)\b/i;
    const TOOL = /\b(run|execute|deploy|script|migrate|automate|install|configure|provision|build)\b/i;
    const SYSTEM = /\b(sync|process|generate|compute|calculate|monitor|trigger|dispatch|schedule)\b/i;

    const classifyExecutor = (item: V2ListItem): V2Ticket['executorClass'] => {
      if (HUMAN.test(item.item)) return 'Human';
      if (TOOL.test(item.item)) return 'Tool';
      if (SYSTEM.test(item.item)) return 'System';
      // No executor verb found in the text: default by item type rather than invent one.
      if (item.type === 'Prerequisite' || item.type === 'Resource') return 'Human';
      if (item.type === 'Output') return 'Human';
      return 'AI';
    };

    // Everything in an earlier group is a dependency of everything in a later group,
    // mirroring the same Prerequisite -> Resource -> Action -> Output order used for the tree.
    const idsByGroupIndex: string[][] = this.STRUCTURAL_GROUPS.map((group) =>
      listItems.filter((item) => item.type === group.type).map((item) => item.id)
    );

    return listItems.map((item) => {
      const groupIndex = this.STRUCTURAL_GROUPS.findIndex((group) => group.type === item.type);
      const dependencies = idsByGroupIndex.slice(0, groupIndex).flat();

      return {
        id: item.id,
        title: item.item,
        workDescription: `[${item.type}] ${item.item}`,
        inputs: {},
        requirements: [],
        dependencies,
        destination: 'Unassigned — no destination system named in intake',
        executorClass: classifyExecutor(item),
        expectedResult: item.requiredOutput,
        proofRequirements: item.requiredOutput,
        lifecycleState: 'Created',
        telemetry: [`[${new Date().toLocaleTimeString()}] Ticket packaged from derived list item ${item.id}`],
        createdAt: new Date().toISOString(),
      };
    });
  }

  private deriveDependencyNodes(tickets: V2Ticket[]): V2DependencyNode[] {
    if (tickets.length === 0) return [];

    const groupTitleByType = new Map(this.STRUCTURAL_GROUPS.map((group) => [group.type, group.title]));

    const unlocksById = new Map<string, string[]>(tickets.map((t) => [t.id, []]));
    tickets.forEach((t) => {
      t.dependencies.forEach((depId) => {
        unlocksById.get(depId)?.push(t.id);
      });
    });

    return tickets.map((t) => {
      const sourceItem = this.listItems.find((item) => item.id === t.id);
      return {
        id: t.id,
        title: t.title,
        prerequisites: t.dependencies,
        unlocks: unlocksById.get(t.id) ?? [],
        isBlocked: t.dependencies.some((depId) => {
          const dep = tickets.find((x) => x.id === depId);
          return dep?.lifecycleState !== 'Completed';
        }),
        parallelGroup: sourceItem ? groupTitleByType.get(sourceItem.type) : undefined,
      };
    });
  }

  // BPMN flow derived from the dependency graph: a fan-out (>1 unlocks) becomes a Parallel
  // split gateway, a fan-in (>1 prerequisites) becomes a Parallel join gateway, and plain
  // one-to-one edges stay a direct sequence flow. No exclusive gateways or exception/retry
  // routing are invented here: the structural graph carries no real failure-condition data.
  private deriveBpmnElements(dependencyNodes: V2DependencyNode[]): V2BpmnElement[] {
    if (dependencyNodes.length === 0) return [];

    const START_ID = 'BPMN-START';
    const END_ID = 'BPMN-END';
    const byId = new Map(dependencyNodes.map((n) => [n.id, n]));

    const joinGatewayId = (nodeId: string): string | null => {
      const node = byId.get(nodeId);
      return node && node.prerequisites.length > 1 ? `BG-JOIN-${nodeId}` : null;
    };
    const targetFor = (nodeId: string): string => joinGatewayId(nodeId) ?? nodeId;

    const elements: V2BpmnElement[] = [];

    // Join gateways: one per node with more than one prerequisite, feeding into that node's task.
    dependencyNodes.forEach((node) => {
      const gatewayId = joinGatewayId(node.id);
      if (gatewayId) {
        elements.push({
          id: gatewayId,
          type: 'Gateway',
          gatewayType: 'Parallel',
          label: `Join before ${node.id}: requires all of ${node.prerequisites.join(', ')}`,
          next: [node.id],
        });
      }
    });

    // Task nodes, one per dependency node. unlocks.length === 0 is wired to the End below.
    dependencyNodes.forEach((node) => {
      const next =
        node.unlocks.length === 0
          ? []
          : node.unlocks.length === 1
            ? [targetFor(node.unlocks[0])]
            : [`BG-SPLIT-${node.id}`];
      elements.push({ id: node.id, type: 'Task', label: node.title, next });
    });

    // Split gateways: one per node with more than one unlock, fanning out to each successor.
    dependencyNodes
      .filter((node) => node.unlocks.length > 1)
      .forEach((node) => {
        elements.push({
          id: `BG-SPLIT-${node.id}`,
          type: 'Gateway',
          gatewayType: 'Parallel',
          label: `Split after ${node.id}: ${node.unlocks.join(', ')} run independently`,
          next: node.unlocks.map((unlockedId) => targetFor(unlockedId)),
        });
      });

    // Wire terminal tasks (no unlocks) to the End event, joining first if more than one.
    const terminalIds = dependencyNodes.filter((node) => node.unlocks.length === 0).map((node) => node.id);
    const endTarget = terminalIds.length > 1 ? 'BG-JOIN-END' : END_ID;
    if (terminalIds.length > 1) {
      elements.push({
        id: 'BG-JOIN-END',
        type: 'Gateway',
        gatewayType: 'Parallel',
        label: `Join before completion: requires all of ${terminalIds.join(', ')}`,
        next: [END_ID],
      });
    }
    terminalIds.forEach((id) => {
      const task = elements.find((el) => el.id === id);
      if (task) task.next = [endTarget];
    });

    // Wire the Start event to root tasks (no prerequisites), fanning out if more than one.
    const rootIds = dependencyNodes.filter((node) => node.prerequisites.length === 0).map((node) => node.id);
    const startNext = rootIds.length > 1 ? ['BG-SPLIT-START'] : [targetFor(rootIds[0])];
    if (rootIds.length > 1) {
      elements.push({
        id: 'BG-SPLIT-START',
        type: 'Gateway',
        gatewayType: 'Parallel',
        label: `Split at start: ${rootIds.join(', ')} are all immediately ready`,
        next: rootIds.map((id) => targetFor(id)),
      });
    }

    return [
      { id: START_ID, type: 'StartEvent', label: 'Intent Validated', next: startNext },
      ...elements,
      { id: END_ID, type: 'EndEvent', label: 'All derived tickets complete', next: [] },
    ];
  }

  // --- COMPARTMENT 2: KNOWLEDGE & RESOURCES ---
  public getKnowledgeEntities(): V2KnowledgeEntity[] {
    return this.knowledgeEntities;
  }

  public getResourceEntities(): V2ResourceEntity[] {
    return this.resourceEntities;
  }

  public getDependencyMatrix(): V2DependencyCondition[] {
    return this.dependencyMatrix;
  }

  // --- COMPARTMENT 3: STRUCTURAL EVOLUTION ---
  public getListItems(): V2ListItem[] {
    return this.listItems;
  }

  public getTreeNodes(): V2TreeNode[] {
    return this.treeNodes;
  }

  public getDependencyNodes(): V2DependencyNode[] {
    return this.dependencyNodes;
  }

  public getBpmnElements(): V2BpmnElement[] {
    return this.bpmnElements;
  }

  public getTickets(): V2Ticket[] {
    return this.tickets;
  }

  public getTelemetryLogs(): V2TelemetryLogEntry[] {
    return this.telemetryLogs;
  }

  public getTroubleshootingTickets(): V2TroubleshootingTicket[] {
    return this.troubleshootingTickets;
  }

  // --- MIDDLE BOX EXECUTION & PROOF GATES ---
  public executeTicket(ticketId: string): V2Ticket {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    ticket.lifecycleState = 'Executing';
    ticket.executedAt = new Date().toISOString();
    ticket.telemetry.push(`[${new Date().toLocaleTimeString()}] Sent to Middle Box runner`);
    ticket.telemetry.push(`[${new Date().toLocaleTimeString()}] Process spawned (PID ${Math.floor(Math.random() * 80000 + 10000)})`);
    ticket.telemetry.push(`[${new Date().toLocaleTimeString()}] Executing inputs: ${JSON.stringify(ticket.inputs)}`);
    ticket.telemetry.push(`[${new Date().toLocaleTimeString()}] STDOUT: Operation completed deterministically with exit code 0`);

    ticket.lifecycleState = 'ProofSubmitted';
    ticket.executionResult = `Deterministic runner exited successfully with verified output artifact for ${ticket.title}`;
    ticket.submittedProof = `Evidence artifact: sha256:${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)} @ /var/log/pes/${ticket.id}-output.json`;

    this.addTelemetryLog('EXECUTE_START', ticket.id, `Ticket ${ticketId} executed in Middle Box`);
    this.addTelemetryLog('PROOF_SUBMITTED', ticket.id, `Proof submitted for ${ticketId}`);

    return ticket;
  }

  public verifyTicketProof(ticketId: string, isValid: boolean): V2Ticket {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    if (isValid) {
      ticket.lifecycleState = 'Completed';
      ticket.proofValid = true;
      ticket.telemetry.push(`[${new Date().toLocaleTimeString()}] Proof checked: PASSED by independent verifier`);
      this.addTelemetryLog('PROOF_VERIFIED', ticket.id, `Proof for ${ticketId} verified as valid. Ticket Completed.`);
      this.unlockDownstreamDependencies(ticketId);
    } else {
      ticket.lifecycleState = 'Failed';
      ticket.proofValid = false;
      ticket.telemetry.push(`[${new Date().toLocaleTimeString()}] Proof checked: REJECTED - Evidence does not meet proof requirement`);
      this.addTelemetryLog('PROOF_REJECTED', ticket.id, `Proof for ${ticketId} rejected. Ticket marked Failed.`);
      this.triggerFailureAndTroubleshoot(ticketId, 'Proof evidence validation assertion failure');
    }

    return ticket;
  }

  public triggerFailureAndTroubleshoot(ticketId: string, reason: string): V2TroubleshootingTicket {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.lifecycleState = 'Failed';
      ticket.telemetry.push(`[${new Date().toLocaleTimeString()}] Failure trigger: ${reason}`);
    }

    const tt: V2TroubleshootingTicket = {
      id: `TT-${Date.now().toString(36).toUpperCase()}`,
      failedTicketId: ticketId,
      failureEvidence: reason,
      rootCauseHypothesis: `Execution context failed prerequisite constraint or assertion check on ${ticketId}.`,
      mitigationPlan: [
        'Isolate failing inputs and inspect stderr telemetry trace',
        'Verify resource availability in Resource Graph',
        'Re-execute deterministic middle-box with trace flags',
      ],
      reEntryStage: 'execution',
      status: 'Open',
      createdAt: new Date().toISOString(),
    };

    this.troubleshootingTickets.unshift(tt);
    this.addTelemetryLog('TROUBLESHOOTING_TRIGGERED', ticketId, `Generated Troubleshooting Ticket ${tt.id}`);
    return tt;
  }

  public resolveTroubleshootingTicket(troubleshootingId: string, reEntry: boolean): void {
    const tt = this.troubleshootingTickets.find((t) => t.id === troubleshootingId);
    if (!tt) return;

    tt.status = 'Resolved';
    tt.resolvedAt = new Date().toISOString();

    const failedTicket = this.tickets.find((t) => t.id === tt.failedTicketId);
    if (failedTicket && reEntry) {
      failedTicket.lifecycleState = 'Created';
      failedTicket.telemetry.push(`[${new Date().toLocaleTimeString()}] Re-entered execution pipeline via ${tt.id} resolution`);
      this.addTelemetryLog('PIPELINE_REENTRY', failedTicket.id, `Re-entered pipeline from ${tt.id}`);
    }
  }

  private unlockDownstreamDependencies(completedTicketId: string): void {
    // Re-evaluate dependency matrix
    const depNode = this.dependencyNodes.find((d) => d.id === completedTicketId);
    if (!depNode) return;

    depNode.unlocks.forEach((unlockedId) => {
      const targetNode = this.dependencyNodes.find((d) => d.id === unlockedId);
      if (targetNode) {
        // Check if all prerequisites are completed
        const allPrereqsDone = targetNode.prerequisites.every((prereqId) => {
          const t = this.tickets.find((x) => x.id === prereqId);
          return t?.lifecycleState === 'Completed';
        });

        if (allPrereqsDone) {
          targetNode.isBlocked = false;
          const targetTicket = this.tickets.find((x) => x.id === unlockedId);
          if (targetTicket && targetTicket.lifecycleState === 'Created') {
            targetTicket.telemetry.push(`[${new Date().toLocaleTimeString()}] Dependencies unlocked. Ready for Middle Box.`);
            this.addTelemetryLog('DEPENDENCY_UNLOCKED', unlockedId, `Dependencies satisfied for ${unlockedId}`);
          }
        }
      }
    });
  }

  private addTelemetryLog(eventType: V2TelemetryLogEntry['eventType'] | string, ticketId: string, message: string): void {
    const entry: V2TelemetryLogEntry = {
      id: `LOG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ticketId,
      eventType: eventType as any,
      message,
    };
    this.telemetryLogs.unshift(entry);
    if (this.telemetryLogs.length > 100) this.telemetryLogs.pop();
  }

  // --- COMPARTMENT 4: TERMINAL JSON PAYLOAD ---
  public generateTerminalJsonPayload(): V2TerminalJsonPayload {
    const completedCount = this.tickets.filter((t) => t.lifecycleState === 'Completed').length;
    const totalCount = this.tickets.length;
    const overallStatus = completedCount === totalCount ? 'SUCCESS' : completedCount > 0 ? 'PARTIAL' : 'FAILED';

    const rawString = JSON.stringify({
      intake: this.intakeRecord,
      tickets: this.tickets,
      logs: this.telemetryLogs.slice(0, 10),
    });

    // Deterministic pseudo SHA-256 for demo integrity
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      hash = (hash << 5) - hash + rawString.charCodeAt(i);
      hash |= 0;
    }
    const integrityHash = `sha256:pes_v2_${Math.abs(hash).toString(16).padStart(12, '0')}${Date.now().toString(16)}`;

    return {
      payload_version: '2.0.0',
      system: 'PES V2 (Planning Execution System)',
      timestamp: new Date().toISOString(),
      integrity_hash: integrityHash,
      original_input: this.intakeRecord.rawInput,
      validated_intent: this.intakeRecord,
      knowledge_and_resources: {
        knowledge_entities: this.knowledgeEntities,
        resource_entities: this.resourceEntities,
        dependency_matrix: this.dependencyMatrix,
      },
      structural_evolution: {
        list: this.listItems,
        tree: this.treeNodes,
        dependency_graph: this.dependencyNodes,
        bpmn_routing: this.bpmnElements,
      },
      tickets: this.tickets,
      telemetry_logs: this.telemetryLogs,
      troubleshooting_history: this.troubleshootingTickets,
      final_state_updates: {
        knowledge_updated: true,
        resources_released: ['Postgres Exclusive Lock', 'Migration Worker Container #1'],
        dependencies_unlocked: this.dependencyNodes.filter((d) => !d.isBlocked).map((d) => d.id),
        overall_status: overallStatus,
      },
    };
  }

  // --- SEED DEFAULTS ---
  private getDefaultIntakeRecord(): V2IntakeRecord {
    return {
      id: 'IN-001',
      rawInput: 'Deploy multi-tenant database migration with PKCE auth verification and zero downtime',
      parsedSignal: {
        whatPersonWants: 'Migrate single-tenant database schemas to multi-tenant isolation partitions while maintaining PKCE auth security',
        targetOutcome: 'Fully partitioned database with verified zero-downtime cutover and PKCE token challenges',
        parameters: {
          databaseEngine: 'PostgreSQL 15',
          migrationStrategy: 'Dual-write shadow partitioning with zero downtime',
          authStandard: 'RFC 7636 (PKCE) OAuth2 code challenge',
        },
        constraints: [
          'Zero-downtime execution constraint (<0.5s connection drain)',
          'Strict Separation of Duties for verification sign-off',
          'Deterministic exit code 0 requirement with audit log',
        ],
      },
      intentBin: 'Infrastructure & Security Core',
      personHas: {
        assets: [
          'Postgres connection credentials (staging & prod)',
          'Auth0 / GSI client credentials',
          'PES Guarded State Machine v1.0',
        ],
        capabilities: [
          'Containerized Node.js execution runtime',
          'Automated Jest / Playwright test harness',
          'Database replication & migration runner',
        ],
        currentSystemState: 'Single-tenant legacy schema with standard password auth',
      },
      intentHasComparison: {
        available: [
          'Database schema migration tooling available in container',
          'Cryptographic PKCE challenge generator library installed',
        ],
        missing: [],
        clarificationNeeded: [],
      },
      validationGate: {
        status: 'PASSED',
        completenessCheck: true,
        feasibilityCheck: true,
        constraintsMet: true,
        gateNotes: 'All Compartment 1 requirements satisfied. Intent is verified feasible with current affordances.',
      },
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    };
  }

  private getDefaultKnowledgeEntities(): V2KnowledgeEntity[] {
    return [
      {
        id: 'K-01',
        name: 'Database Cluster (Primary)',
        type: 'Database',
        status: 'Online / Healthy',
        properties: { engine: 'PostgreSQL 15', max_connections: '200', replication_lag: '0ms' },
        relationships: [{ target: 'K-02', relation: 'Authenticates via' }],
      },
      {
        id: 'K-02',
        name: 'OAuth2 / PKCE Authorization Service',
        type: 'Protocol',
        status: 'RFC 7636 Compliant',
        properties: { challenge_method: 'S256', token_ttl: '3600s' },
        relationships: [{ target: 'K-03', relation: 'Protects' }],
      },
      {
        id: 'K-03',
        name: 'Tenant Schema Partitioning Policy',
        type: 'Policy',
        status: 'Enforced',
        properties: { isolation_level: 'Row-Level + Schema prefix', sod_required: 'true' },
        relationships: [],
      },
    ];
  }

  private getDefaultResourceEntities(): V2ResourceEntity[] {
    return [
      {
        id: 'R-01',
        name: 'pg-migration-runner',
        type: 'Tool',
        availability: 'Available',
        purpose: 'Executes DDL/DML schema transformations with rollback',
        location: '/usr/local/bin/migrate',
        dependencies: ['K-01'],
      },
      {
        id: 'R-02',
        name: 'PKCE Challenge Verifier',
        type: 'API',
        availability: 'Available',
        purpose: 'Validates code_verifier against code_challenge using SHA-256',
        location: 'src/lib/auth/pkce.ts',
        dependencies: ['K-02'],
      },
      {
        id: 'R-03',
        name: 'Production Deploy Key',
        type: 'Credential',
        availability: 'Locked',
        purpose: 'Gated production release credential requiring verifier sign-off',
        location: 'KMS Vault #4',
        dependencies: ['K-03'],
      },
    ];
  }

  private getDefaultDependencyMatrix(): V2DependencyCondition[] {
    return [
      {
        id: 'DEP-01',
        source: 'T-101 (Schema Migration)',
        target: 'T-102 (Tenant Partition Indexing)',
        conditionType: 'Prerequisite',
        description: 'Schema tables must be partitioned before composite indexes are applied',
        satisfied: true,
      },
      {
        id: 'DEP-02',
        source: 'T-102 (Tenant Partition Indexing)',
        target: 'T-103 (PKCE Challenge Verification)',
        conditionType: 'Prerequisite',
        description: 'Tenant schema isolation must be established before auth tokens bind tenant context',
        satisfied: false,
      },
      {
        id: 'DEP-03',
        source: 'T-103 (PKCE Challenge Verification)',
        target: 'T-104 (Production Traffic Cutover)',
        conditionType: 'Verification_Requirement',
        description: 'End-to-end integration tests and verifier sign-off required prior to traffic switch',
        satisfied: false,
      },
    ];
  }

  private getDefaultListItems(): V2ListItem[] {
    return [
      { id: 'L-01', order: 1, item: 'Compile DDL migration scripts for multi-tenant schema partitioning', type: 'Action', requiredOutput: 'Valid SQL migration files in /db/migrations' },
      { id: 'L-02', order: 2, item: 'Apply partition tables and foreign keys in staging environment', type: 'Action', requiredOutput: 'Staging schema verified with 0 errors' },
      { id: 'L-03', order: 3, item: 'Implement PKCE code challenge and token exchange verification', type: 'Action', requiredOutput: 'Verified S256 verification module' },
      { id: 'L-04', order: 4, item: 'Execute automated regression and tenant isolation boundary tests', type: 'Action', requiredOutput: 'All 42 test suites passing (code 0)' },
      { id: 'L-05', order: 5, item: 'Obtain independent verifier audit proof certification', type: 'Output', requiredOutput: 'Signed cryptographic proof artifact' },
      { id: 'L-06', order: 6, item: 'Execute zero-downtime production cutover and health verification', type: 'Action', requiredOutput: 'Production traffic served with zero 5xx' },
    ];
  }

  private getDefaultTreeNodes(): V2TreeNode[] {
    return [
      {
        id: 'TR-ROOT',
        title: 'Multi-Tenant Architecture Cutover (Epic)',
        description: 'Deliver hardened, zero-downtime tenant isolation with PKCE security',
        level: 0,
        children: [
          {
            id: 'TR-10',
            title: '1.0 Database Layer Isolation',
            description: 'Partition schema and enforce tenant boundary indices',
            level: 1,
            children: [
              { id: 'T-101', title: '1.1 Apply Partition Tables', description: 'Run DDL script for tenant_id partitioning', level: 2 },
              { id: 'T-102', title: '1.2 Build Isolation Indices', description: 'Construct concurrent composite indices', level: 2 },
            ],
          },
          {
            id: 'TR-20',
            title: '2.0 Security & Auth Hardening',
            description: 'Implement RFC 7636 PKCE challenge validation',
            level: 1,
            children: [
              { id: 'T-103', title: '2.1 Implement PKCE Engine', description: 'S256 cryptographic challenge verification', level: 2 },
              { id: 'T-104', title: '2.2 Run Isolation Audit Tests', description: 'Execute integration test suite', level: 2 },
            ],
          },
        ],
      },
    ];
  }

  private getDefaultDependencyNodes(): V2DependencyNode[] {
    return [
      {
        id: 'T-101',
        title: 'Apply Partition Tables',
        prerequisites: [],
        unlocks: ['T-102'],
        isBlocked: false,
        parallelGroup: 'Database-Phase',
      },
      {
        id: 'T-102',
        title: 'Build Isolation Indices',
        prerequisites: ['T-101'],
        unlocks: ['T-103'],
        isBlocked: false,
        parallelGroup: 'Database-Phase',
      },
      {
        id: 'T-103',
        title: 'Implement PKCE Engine',
        prerequisites: ['T-102'],
        unlocks: ['T-104'],
        isBlocked: true,
        parallelGroup: 'Security-Phase',
      },
      {
        id: 'T-104',
        title: 'Run Isolation Audit Tests',
        prerequisites: ['T-103'],
        unlocks: [],
        isBlocked: true,
        parallelGroup: 'Verification-Phase',
      },
    ];
  }

  private getDefaultBpmnElements(): V2BpmnElement[] {
    return [
      { id: 'B-01', type: 'StartEvent', label: 'Intent Validated', next: ['B-02'] },
      { id: 'B-02', type: 'Task', label: 'T-101: Apply Partition Tables', next: ['B-03'] },
      { id: 'B-03', type: 'Task', label: 'T-102: Build Isolation Indices', next: ['B-04'] },
      { id: 'B-04', type: 'Gateway', label: 'Indices Valid?', gatewayType: 'Exclusive', condition: 'ExitCode == 0', next: ['B-05', 'B-ERR'] },
      { id: 'B-05', type: 'Task', label: 'T-103: Implement PKCE Engine', next: ['B-06'] },
      { id: 'B-06', type: 'Task', label: 'T-104: Isolation Audit Tests', next: ['B-07'] },
      { id: 'B-07', type: 'Gateway', label: 'Tests & Proof OK?', gatewayType: 'Exclusive', condition: 'TestsPass && ProofVerified', next: ['B-END', 'B-ERR'] },
      { id: 'B-ERR', type: 'Task', label: 'Trigger Troubleshooting Loop', next: ['B-02'] },
      { id: 'B-END', type: 'EndEvent', label: 'Terminal JSON Payload Emitted', next: [] },
    ];
  }

  private getDefaultTickets(): V2Ticket[] {
    return [
      {
        id: 'T-101',
        title: 'Apply Partition Tables',
        workDescription: 'Execute DDL migration script to create tenant partition tables in Postgres',
        inputs: { migrationFile: '004_tenant_partition.sql', targetDb: 'staging_pes' },
        requirements: ['Zero lock contention on existing rows', 'Rollback SQL script generated'],
        dependencies: [],
        destination: 'Database Staging Cluster',
        executorClass: 'System',
        expectedResult: 'Schema contains tenant_partition_map with 100% table coverage',
        proofRequirements: 'Migration log containing commit transaction ID and table list assertion',
        lifecycleState: 'Completed',
        executionResult: 'DDL transaction committed successfully (TxID: 0x99482bf1)',
        submittedProof: 'Log: /var/log/migrate-004.log - exit code 0, 18 tables partitioned',
        proofValid: true,
        telemetry: [
          'Spawned migration runner PID 41208',
          'Lock acquired in 12ms',
          'DDL committed in 248ms (Exit code 0)',
        ],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        executedAt: new Date(Date.now() - 7100000).toISOString(),
      },
      {
        id: 'T-102',
        title: 'Build Isolation Indices',
        workDescription: 'Create concurrent btree indices on (tenant_id, created_at) across all partitioned tables',
        inputs: { indexName: 'idx_tenant_created', concurrent: 'true' },
        requirements: ['Concurrent non-blocking index creation', 'Index size <= 15MB'],
        dependencies: ['T-101'],
        destination: 'Database Cluster',
        executorClass: 'Tool',
        expectedResult: 'All partitioned tables exhibit index scan coverage',
        proofRequirements: 'EXPLAIN ANALYZE query plan demonstrating Index Scan usage',
        lifecycleState: 'Completed',
        executionResult: 'Indices constructed concurrently across 18 partition shards',
        submittedProof: 'Query plan artifact: EXPLAIN ANALYZE confirmed Index Scan on idx_tenant_created (cost 0.15..8.25)',
        proofValid: true,
        telemetry: [
          'CREATE INDEX CONCURRENTLY initiated on 18 shards',
          'All indices active. Cost reduction: 94%',
        ],
        createdAt: new Date(Date.now() - 5400000).toISOString(),
        executedAt: new Date(Date.now() - 5300000).toISOString(),
      },
      {
        id: 'T-103',
        title: 'Implement PKCE Engine',
        workDescription: 'Embed RFC 7636 PKCE S256 code challenge validation in auth controller',
        inputs: { standard: 'RFC 7636', algorithm: 'SHA-256', targetController: 'AuthController.ts' },
        requirements: ['Reject plain code challenges', 'Verify base64url encoding integrity'],
        dependencies: ['T-102'],
        destination: 'API Auth Gateway',
        executorClass: 'AI',
        expectedResult: 'PKCE challenge verification endpoint active and asserting S256 hashes',
        proofRequirements: 'Unit test suite with 10 synthetic test vectors asserting hash matches and invalid token rejection',
        lifecycleState: 'Created',
        telemetry: [
          'Ticket generated and packaged',
          'Prerequisites satisfied (T-101, T-102 Completed)',
          'Awaiting Middle Box execution run',
        ],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'T-104',
        title: 'Run Isolation Audit Tests',
        workDescription: 'Execute multi-tenant penetration and isolation boundary test suite',
        inputs: { suite: 'security/isolation.spec.ts', concurrency: '8' },
        requirements: ['Zero cross-tenant data leakage', 'Separation of duties verifier sign-off'],
        dependencies: ['T-103'],
        destination: 'CI/CD Verification Pipeline',
        executorClass: 'Human',
        expectedResult: 'Zero failed test assertions and signed verifier certificate',
        proofRequirements: 'JUnit XML report with 42 passed tests and independent Verifier role signature',
        lifecycleState: 'Created',
        telemetry: [
          'Ticket generated',
          'BLOCKED: Waiting for T-103 completion',
        ],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
  }

  private getDefaultTelemetryLogs(): V2TelemetryLogEntry[] {
    return [
      { id: 'LOG-01', timestamp: new Date(Date.now() - 7200000).toISOString(), ticketId: 'T-101', eventType: 'EXECUTE_START', message: 'Middle Box started execution of T-101 (Apply Partition Tables)' },
      { id: 'LOG-02', timestamp: new Date(Date.now() - 7100000).toISOString(), ticketId: 'T-101', eventType: 'PROOF_SUBMITTED', message: 'Proof submitted: Migration transaction 0x99482bf1' },
      { id: 'LOG-03', timestamp: new Date(Date.now() - 5400000).toISOString(), ticketId: 'T-102', eventType: 'EXECUTE_START', message: 'Middle Box started execution of T-102 (Build Isolation Indices)' },
      { id: 'LOG-04', timestamp: new Date(Date.now() - 5300000).toISOString(), ticketId: 'T-102', eventType: 'PROOF_SUBMITTED', message: 'Proof submitted: EXPLAIN ANALYZE index scan verification' },
      { id: 'LOG-05', timestamp: new Date(Date.now() - 3600000).toISOString(), ticketId: 'SYSTEM', eventType: 'STATE_UPDATE', message: 'State updated: Unlocked T-103. Ready for Middle Box.' },
    ];
  }

  private getDefaultTroubleshootingTickets(): V2TroubleshootingTicket[] {
    return [
      {
        id: 'TT-001',
        failedTicketId: 'T-102',
        failureEvidence: 'Transient lock timeout during concurrent index creation on shard 4',
        rootCauseHypothesis: 'Long-running background vacuum job held exclusive lock on partition table',
        mitigationPlan: [
          'Terminated conflicting vacuum process',
          'Increased lock_timeout parameter from 500ms to 2000ms',
          'Re-ran Middle Box execution of T-102 successfully',
        ],
        reEntryStage: 'execution',
        status: 'Resolved',
        createdAt: new Date(Date.now() - 5600000).toISOString(),
        resolvedAt: new Date(Date.now() - 5450000).toISOString(),
      },
    ];
  }
}

// Global Singleton Instance
export const globalPesV2Engine = new PesV2Engine();
