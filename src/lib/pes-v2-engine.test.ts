import { describe, it, expect } from 'vitest';
import { PesV2Engine } from './pes-v2-engine.js';

const BRANCHING_INTENT =
  'Need Postgres credentials, then run the migration script, then confirm with the on-call engineer. ' +
  'Deliver the signed cutover report, done when prod shows zero 5xx.';

// Two different structural groups (Prerequisite, then Output) in sequence, so there's
// exactly one dependency edge and no fan-out/fan-in for a gateway to exist for.
const LINEAR_INTENT = 'Need the signed access approval, then write the final report';

describe('deriveListItems (via processRawIntent)', () => {
  it('splits a multi-step intent into distinct, ordered items', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const items = engine.getListItems();

    expect(items.map((i) => i.item)).toEqual([
      'Need Postgres credentials',
      'run the migration script',
      'confirm with the on-call engineer',
      'Deliver the signed cutover report',
    ]);
    expect(items.map((i) => i.id)).toEqual(['L-01', 'L-02', 'L-03', 'L-04']);
  });

  it('classifies each item by the verbs/nouns actually present in its text', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const items = engine.getListItems();

    expect(items.find((i) => i.item === 'Need Postgres credentials')?.type).toBe('Prerequisite');
    expect(items.find((i) => i.item === 'run the migration script')?.type).toBe('Action');
    expect(items.find((i) => i.item === 'confirm with the on-call engineer')?.type).toBe('Action');
    expect(items.find((i) => i.item === 'Deliver the signed cutover report')?.type).toBe('Output');
  });

  it('pulls a trailing "done when" clause into requiredOutput instead of inventing one', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const items = engine.getListItems();

    const output = items.find((i) => i.item === 'Deliver the signed cutover report');
    expect(output?.requiredOutput).toBe('prod shows zero 5xx');

    const noProofStated = items.find((i) => i.item === 'run the migration script');
    expect(noProofStated?.requiredOutput).toBe('Undefined — state what proves this is done');
  });

  it('dedupes repeated items instead of listing them twice', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent('Write the report. Write the report again. Write the report.');
    const items = engine.getListItems();
    expect(items).toHaveLength(2);
  });
});

describe('deriveTreeNodes (via processRawIntent)', () => {
  it('groups list items under Prerequisite -> Resource -> Action -> Output, omitting empty groups', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const [root] = engine.getTreeNodes();

    expect(root.id).toBe('TR-ROOT');
    const groupTitles = root.children?.map((g) => g.title);
    expect(groupTitles).toEqual(['Prerequisites', 'Actions', 'Outputs']); // no Resource items present
  });

  it('reuses the list item id as the leaf id, so tickets can link back to the same node', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const [root] = engine.getTreeNodes();
    const leafIds = root.children?.flatMap((g) => g.children?.map((leaf) => leaf.id) ?? []);
    expect(leafIds).toEqual(expect.arrayContaining(['L-01', 'L-02', 'L-03', 'L-04']));
  });
});

describe('deriveTickets (via processRawIntent)', () => {
  it('reuses the list item id as the ticket id', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const ticketIds = engine.getTickets().map((t) => t.id);
    expect(ticketIds).toEqual(['L-01', 'L-02', 'L-03', 'L-04']);
  });

  it('classifies executor class from verbs in the item text', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const tickets = engine.getTickets();

    expect(tickets.find((t) => t.id === 'L-01')?.executorClass).toBe('Human'); // "Need" - no verb, type default
    expect(tickets.find((t) => t.id === 'L-02')?.executorClass).toBe('Tool'); // "run the migration script"
    expect(tickets.find((t) => t.id === 'L-03')?.executorClass).toBe('Human'); // "confirm with ..."
  });

  it('wires dependencies from every earlier structural group, not just the immediate one', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const tickets = engine.getTickets();

    expect(tickets.find((t) => t.id === 'L-01')?.dependencies).toEqual([]);
    expect(tickets.find((t) => t.id === 'L-02')?.dependencies).toEqual(['L-01']);
    expect(tickets.find((t) => t.id === 'L-04')?.dependencies).toEqual(['L-01', 'L-02', 'L-03']);
  });

  it('carries the required output through as the proof requirement instead of inventing one', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const output = engine.getTickets().find((t) => t.id === 'L-04');
    expect(output?.proofRequirements).toBe('prod shows zero 5xx');
  });
});

describe('deriveDependencyNodes (via processRawIntent)', () => {
  it('mirrors each ticket\'s own dependencies as prerequisites, and the exact inverse as unlocks', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const nodes = engine.getDependencyNodes();

    const n1 = nodes.find((n) => n.id === 'L-01')!;
    expect(n1.prerequisites).toEqual([]);
    expect(n1.unlocks.sort()).toEqual(['L-02', 'L-03', 'L-04']);

    const n4 = nodes.find((n) => n.id === 'L-04')!;
    expect(n4.prerequisites).toEqual(['L-01', 'L-02', 'L-03']);
    expect(n4.unlocks).toEqual([]);
  });

  it('is blocked until every prerequisite ticket is Completed, and only those', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);

    const before = engine.getDependencyNodes();
    expect(before.find((n) => n.id === 'L-01')?.isBlocked).toBe(false);
    expect(before.find((n) => n.id === 'L-02')?.isBlocked).toBe(true);
    expect(before.find((n) => n.id === 'L-04')?.isBlocked).toBe(true);
  });

  it('unblocks only the direct dependents once a prerequisite ticket completes', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);

    engine.executeTicket('L-01');
    engine.verifyTicketProof('L-01', true);

    const after = engine.getDependencyNodes();
    expect(after.find((n) => n.id === 'L-02')?.isBlocked).toBe(false);
    expect(after.find((n) => n.id === 'L-03')?.isBlocked).toBe(false);
    // L-04 still needs L-02 and L-03, neither of which is complete yet
    expect(after.find((n) => n.id === 'L-04')?.isBlocked).toBe(true);
  });
});

describe('deriveBpmnElements (via processRawIntent)', () => {
  it('produces exactly one Start and one End event, regardless of graph shape', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const elements = engine.getBpmnElements();

    expect(elements.filter((e) => e.type === 'StartEvent')).toHaveLength(1);
    expect(elements.filter((e) => e.type === 'EndEvent')).toHaveLength(1);
  });

  it('inserts a split gateway only where a node really has more than one unlock', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const elements = engine.getBpmnElements();

    const split = elements.find((e) => e.id === 'BG-SPLIT-L-01');
    expect(split).toBeDefined();
    expect(split?.gatewayType).toBe('Parallel');
    // L-01 unlocks L-02, L-03, and (transitively, since it's listed directly) L-04's join gate
    expect(split?.next).toEqual(expect.arrayContaining(['L-02', 'L-03', 'BG-JOIN-L-04']));
  });

  it('inserts a join gateway only where a node really has more than one prerequisite', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(BRANCHING_INTENT);
    const elements = engine.getBpmnElements();

    const join = elements.find((e) => e.id === 'BG-JOIN-L-04');
    expect(join).toBeDefined();
    expect(join?.next).toEqual(['L-04']);
  });

  it('produces no gateways at all for a plain linear two-step intent', () => {
    const engine = new PesV2Engine();
    engine.processRawIntent(LINEAR_INTENT);
    const elements = engine.getBpmnElements();

    expect(elements.filter((e) => e.type === 'Gateway')).toHaveLength(0);
    const start = elements.find((e) => e.type === 'StartEvent')!;
    expect(start.next).toEqual(['L-01']);
  });
});
