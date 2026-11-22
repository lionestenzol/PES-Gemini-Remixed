import React, { useMemo, useState } from 'react';
import { V2BpmnElement, V2Ticket } from '../types.js';
import {
  GitBranch,
  Play,
  Flag,
  Cpu,
  User,
  Bot,
  Wrench,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowRight,
} from 'lucide-react';

interface VisualBpmnDiagramProps {
  bpmnElements: V2BpmnElement[];
  tickets: V2Ticket[];
  onSelectElement?: (elementId: string) => void;
}

// Longest-path layering via DFS from the Start event, so every element lands one column
// to the right of its furthest predecessor. A derived (acyclic) graph lays out the same
// way Kahn's algorithm would; the seeded demo data additionally has a real back-edge
// (its troubleshooting loop re-enters an earlier task), which plain indegree-based
// layering can't terminate on. The `onStack` guard stops recursion the instant a node
// would revisit one of its own ancestors, so that back-edge is rendered (via the node's
// own "next" label and the inspector footer) but doesn't pull the rest of the graph
// into an unresolved cycle.
function layoutColumns(elements: V2BpmnElement[]): V2BpmnElement[][] {
  if (elements.length === 0) return [];

  const byId = new Map(elements.map((el) => [el.id, el]));
  const level = new Map<string, number>();
  const onStack = new Set<string>();

  const visit = (id: string, depth: number) => {
    const current = level.get(id);
    if (current !== undefined && depth <= current) return;
    if (onStack.has(id)) return; // back-edge into an ancestor: stop here, don't recurse forever
    onStack.add(id);
    level.set(id, depth);
    byId.get(id)?.next.forEach((n) => {
      if (byId.has(n)) visit(n, depth + 1);
    });
    onStack.delete(id);
  };

  const starts = elements.filter((el) => el.type === 'StartEvent');
  const roots = starts.length > 0 ? starts : elements.filter((el) => !elements.some((other) => other.next.includes(el.id)));
  roots.forEach((root) => visit(root.id, 0));

  // Anything never reached (disconnected from every Start) still needs a column.
  elements.forEach((el) => {
    if (!level.has(el.id)) level.set(el.id, 0);
  });

  const maxLevel = Math.max(...Array.from(level.values()));
  const columns: V2BpmnElement[][] = Array.from({ length: maxLevel + 1 }, () => []);
  elements.forEach((el) => columns[level.get(el.id) ?? 0].push(el));
  return columns;
}

const executorBadge = (ticket: V2Ticket) => {
  switch (ticket.executorClass) {
    case 'Human':
      return (
        <span className="flex items-center gap-1 text-amber-400">
          <User className="w-2.5 h-2.5" /> Human
        </span>
      );
    case 'AI':
      return (
        <span className="flex items-center gap-1 text-cyan-400">
          <Bot className="w-2.5 h-2.5" /> AI
        </span>
      );
    case 'System':
      return (
        <span className="flex items-center gap-1 text-purple-400">
          <Cpu className="w-2.5 h-2.5" /> System
        </span>
      );
    case 'Tool':
      return (
        <span className="flex items-center gap-1 text-blue-400">
          <Wrench className="w-2.5 h-2.5" /> Tool
        </span>
      );
  }
};

export const VisualBpmnDiagram: React.FC<VisualBpmnDiagramProps> = ({
  bpmnElements,
  tickets,
  onSelectElement,
}) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const columns = useMemo(() => layoutColumns(bpmnElements), [bpmnElements]);

  // Derived elements reuse the ticket id directly; older seed data embeds it in the label
  // instead (e.g. "T-101: Apply Partition Tables" on an element whose own id is "B-02").
  const getTicketForElement = (el: V2BpmnElement): V2Ticket | undefined => {
    const direct = tickets.find((t) => t.id === el.id);
    if (direct) return direct;
    const match = el.label.match(/[A-Z]+-\d+/);
    return match ? tickets.find((t) => t.id === match[0]) : undefined;
  };

  const selectedElement = bpmnElements.find((b) => b.id === selectedElementId);

  const handleSelect = (id: string) => {
    setSelectedElementId(id);
    onSelectElement?.(id);
  };

  return (
    <div className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-md">
      {/* BPMN Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800 font-semibold text-[11px]">
            <GitBranch className="w-3.5 h-3.5" /> BPMN 2.0 PROCESS FLOW
          </span>
          <span className="text-slate-400 text-[11px]">
            Derived Operational Routing & Decision Gateways
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* BPMN Node Layout Canvas */}
      <div className="p-8 overflow-x-auto min-h-[440px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        {bpmnElements.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[360px] text-xs text-slate-500">
            No BPMN routing derived yet.
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
            className="transition-transform duration-200 flex flex-col select-none"
          >
            {/* Legend Banner */}
            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 mb-6 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-800 self-start">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Start Event
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2 rounded-xs bg-indigo-500 inline-block" /> Activity Task
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rotate-45 bg-amber-500 inline-block" /> Gateway (AND/XOR)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-purple-400 inline-block" /> End Event
              </span>
            </div>

            <div className="flex items-start gap-8">
              {columns.map((column, colIdx) => (
                <React.Fragment key={colIdx}>
                  <div className="flex flex-col gap-5 items-center">
                    {column.map((el) => {
                      const ticket = getTicketForElement(el);
                      const isSelected = selectedElementId === el.id;

                      if (el.type === 'StartEvent') {
                        return (
                          <div key={el.id} className="flex flex-col items-center">
                            <div
                              onClick={() => handleSelect(el.id)}
                              className={`w-14 h-14 rounded-full border-2 border-emerald-400 bg-emerald-950/60 flex items-center justify-center cursor-pointer transition-all shadow-md ${
                                isSelected ? 'ring-4 ring-emerald-400/40 scale-105' : 'hover:scale-105'
                              }`}
                              title={el.label}
                            >
                              <Play className="w-5 h-5 text-emerald-400 fill-emerald-400 ml-0.5" />
                            </div>
                            <span className="text-[10px] font-mono text-emerald-300 font-semibold mt-2 text-center w-28">
                              {el.label}
                            </span>
                          </div>
                        );
                      }

                      if (el.type === 'EndEvent') {
                        return (
                          <div key={el.id} className="flex flex-col items-center">
                            <div
                              onClick={() => handleSelect(el.id)}
                              className={`w-14 h-14 rounded-full border-4 border-purple-400 bg-purple-950/80 flex items-center justify-center cursor-pointer transition-all shadow-lg ${
                                isSelected ? 'ring-4 ring-purple-400/40 scale-105' : 'hover:scale-105'
                              }`}
                              title={el.label}
                            >
                              <Flag className="w-5 h-5 text-purple-300 fill-purple-300" />
                            </div>
                            <span className="text-[10px] font-mono text-purple-300 font-semibold mt-2 text-center w-28">
                              {el.label}
                            </span>
                          </div>
                        );
                      }

                      if (el.type === 'Gateway') {
                        const isExclusive = el.gatewayType === 'Exclusive';
                        return (
                          <div key={el.id} className="flex flex-col items-center w-40">
                            <div
                              onClick={() => handleSelect(el.id)}
                              className={`w-12 h-12 rotate-45 border-2 flex items-center justify-center cursor-pointer transition-all shadow-md shrink-0 ${
                                isExclusive
                                  ? 'border-amber-400 bg-amber-950/70'
                                  : 'border-indigo-400 bg-indigo-950/70'
                              } ${isSelected ? 'ring-4 ring-amber-400/40 scale-105' : 'hover:scale-105'}`}
                              title={el.condition ? `${el.label} [${el.condition}]` : el.label}
                            >
                              <span
                                className={`-rotate-45 text-sm font-bold font-mono ${
                                  isExclusive ? 'text-amber-300' : 'text-indigo-300'
                                }`}
                              >
                                {isExclusive ? '✕' : '+'}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-300 font-semibold mt-2 text-center leading-snug">
                              {el.label}
                            </span>
                            {el.condition && (
                              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1 py-0.5 rounded mt-1">
                                [{el.condition}]
                              </span>
                            )}
                          </div>
                        );
                      }

                      // Task
                      return (
                        <div
                          key={el.id}
                          onClick={() => handleSelect(el.id)}
                          className={`w-48 p-3 rounded-lg border-2 transition-all cursor-pointer shadow-md bg-slate-800/90 ${
                            isSelected
                              ? 'border-indigo-400 ring-2 ring-indigo-500/40'
                              : 'border-indigo-500/50 hover:border-indigo-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-[9px] font-mono text-indigo-400 font-bold truncate">{el.id}</span>
                            {ticket && (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[8px] font-bold shrink-0 ${
                                  ticket.lifecycleState === 'Completed'
                                    ? 'bg-emerald-900/60 text-emerald-300'
                                    : ticket.lifecycleState === 'Failed'
                                    ? 'bg-rose-900/60 text-rose-300'
                                    : ticket.lifecycleState === 'Created'
                                    ? 'bg-slate-700 text-slate-300'
                                    : 'bg-amber-900/60 text-amber-300'
                                }`}
                              >
                                {ticket.lifecycleState === 'Created' ? 'READY' : ticket.lifecycleState.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white leading-snug">{el.label}</div>
                          {ticket && (
                            <div className="mt-1 flex items-center gap-1 text-[9px] font-mono">
                              {executorBadge(ticket)}
                            </div>
                          )}
                          <div className="mt-2 pt-1.5 border-t border-slate-700/60 text-[9px] font-mono text-slate-500">
                            → {el.next.length > 0 ? el.next.join(', ') : 'TERMINAL'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {colIdx < columns.length - 1 && (
                    <div className="flex items-center self-center text-slate-500 pt-2">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Element Inspector Footer */}
      {selectedElement && (
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Selected BPMN Element:</span>
            <span className="font-mono font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
              {selectedElement.id}
            </span>
            <span className="text-slate-300">{selectedElement.label}</span>
            {selectedElement.condition && (
              <span className="text-emerald-400 font-mono text-[11px]">
                Condition: {selectedElement.condition}
              </span>
            )}
          </div>
          <span className="text-slate-500 text-[11px]">BPMN 2.0 Compliant Sequence Flow</span>
        </div>
      )}
    </div>
  );
};
