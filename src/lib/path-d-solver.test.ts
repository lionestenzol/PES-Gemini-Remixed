import { describe, it, expect } from 'vitest';
import { PathDSolver } from './path-d-solver.js';
import { CommitmentCard, CapacityRecord, FixedEvent } from '../types.js';

const MONDAY = '2026-01-05'; // a Monday

function makeCard(overrides: Partial<CommitmentCard> & { id: string }): CommitmentCard {
  return {
    level: 'Task',
    name: overrides.id,
    current_state_desc: '',
    desired_state_desc: '',
    proof_of_completion: '',
    next_physical_action: '',
    state: 'Ready',
    schedule_status: 'unscheduled',
    planned_date: null,
    planned_start: null,
    planned_end: null,
    planned_duration: 60,
    actual_start: null,
    actual_end: null,
    result: null,
    proof_location: null,
    what_happened: null,
    review_date: null,
    block_reason: null,
    waiting_for: null,
    fallback_action: null,
    owner: 'user',
    priority: 50,
    risk_level: 'Medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const AMPLE_CAPACITY: CapacityRecord = {
  week_of: MONDAY,
  total_hours: 40,
  fixed_commitments: 0,
  meals_travel_transitions: 0,
  recovery_reserve: 0,
  available_capacity: 40,
  schedule_limit: 40,
};

function fixedEvent(id: string, start: string, end: string): FixedEvent {
  return { id, name: id, event_date: MONDAY, start_time: start, end_time: end, resource: 'calendar' };
}

describe('PathDSolver.findSlot / occupied-interval ordering', () => {
  it('finds the true earliest open gap even when fixed events are nested/out of start order', () => {
    // A long 09:00-11:40 block fully containing a shorter 10:00-10:50 meeting, pushed into
    // the day's fixed events in an order that does not match their start times. The old
    // comparator (a.start - b.end) could leave this unsorted by start, which matters because
    // findSlot's scan relies on strictly ascending start order to jump its cursor correctly.
    const events = [
      fixedEvent('nested', '10:00', '10:50'),
      fixedEvent('outer', '09:00', '11:40'),
    ];

    const card = makeCard({ id: 'C-1', planned_duration: 30 });
    const result = PathDSolver.solve(MONDAY, [card], AMPLE_CAPACITY, [], events);

    expect(result.blocks).toHaveLength(1);
    const block = result.blocks[0];
    // The outer block ends at 11:40, but slots are aligned to the 15-minute grid, so the
    // real earliest open start is 11:45, not 11:40.
    expect(block.planned_start).toBe('11:45');
    expect(block.planned_end).toBe('12:15');
  });

  it('places a card in the real earliest gap between two non-overlapping fixed events listed out of order', () => {
    const events = [
      fixedEvent('afternoon', '14:00', '15:00'),
      fixedEvent('morning', '09:00', '10:00'),
    ];

    const card = makeCard({ id: 'C-2', planned_duration: 60 });
    const result = PathDSolver.solve(MONDAY, [card], AMPLE_CAPACITY, [], events);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].planned_start).toBe('10:00');
    expect(result.blocks[0].planned_end).toBe('11:00');
  });

  it('refuses to schedule past the weekly capacity ceiling', () => {
    const card = makeCard({ id: 'C-3', planned_duration: 60 });
    const tightCapacity: CapacityRecord = { ...AMPLE_CAPACITY, schedule_limit: 0.5 };

    const result = PathDSolver.solve(MONDAY, [card], tightCapacity, [], []);

    expect(result.blocks).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(1);
    expect(result.unscheduled[0].card_id).toBe('C-3');
  });
});
