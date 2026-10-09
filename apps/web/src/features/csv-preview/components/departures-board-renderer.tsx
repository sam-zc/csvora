"use client";

import type { CsvDocument } from "@csvora/csv-core";
import {
  type PresentationConfig,
  type SemanticIntent,
  isDeparturesConfigured,
  resetDeparturesMapping,
  resolveConditionalIntent,
  resolveDepartureStatus,
} from "@csvora/table-engine";
import { Button, cn } from "@csvora/ui";

/**
 * Maps semantic intents to split-flap authentic text accent colors.
 */
function getFlapIntentColorClass(intent: SemanticIntent | undefined, defaultClass: string): string {
  switch (intent) {
    case "success":
      return "text-emerald-400";
    case "warning":
      return "text-amber-400";
    case "danger":
      return "text-rose-400";
    case "info":
      return "text-sky-400";
    case "muted":
      return "text-zinc-500";
    default:
      return defaultClass;
  }
}

export interface DeparturesBoardRendererProps {
  readonly document: CsvDocument;
  readonly presentation: PresentationConfig;
  readonly onUpdatePresentation?: ((presentation: PresentationConfig) => void) | undefined;
  readonly selectedColumnId?: string | null | undefined;
  readonly onSelectColumn?: ((columnId: string | null) => void) | undefined;
}

/**
 * Maximum number of departures visible on the board at one time.
 * Keeps dense row rhythm consistent and fits 1440x900 viewport without overflow.
 */
const MAX_VISIBLE_DEPARTURES = 12;

/**
 * Character slot allocation for standard airport display columns.
 */
const SLOT_COUNTS = {
  time: 5,
  flight: 7,
  destination: 12,
  gate: 3,
  status: 12,
} as const;

/**
 * Single mechanical split-flap character slot with subtle split line and styling.
 */
function FlapSlot({
  char,
  colorClass,
  isDimmed = false,
}: {
  readonly char: string;
  readonly colorClass: string;
  readonly isDimmed?: boolean;
}) {
  const displayChar = char.trim() === "" ? "\u00A0" : char;

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        "w-[17px] sm:w-[20px] md:w-[22px] h-[28px] sm:h-[32px] md:h-[36px]",
        "bg-[#15171e] rounded-[3px] border border-[#232733] select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.4)]",
        "before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-[#090a0d] before:z-10",
        "after:absolute after:inset-x-0 after:top-[calc(50%+1px)] after:h-px after:bg-white/5 after:z-10",
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "font-mono font-bold text-sm sm:text-base leading-none relative z-0 tracking-normal",
          isDimmed ? "text-[#3f4350]" : colorClass,
        )}
      >
        {displayChar}
      </span>
    </span>
  );
}

/**
 * Padded slot block representing a complete field in the split-flap row.
 */
function FlapField({
  text,
  slotCount,
  colorClass,
  isDimmed = false,
}: {
  readonly text: string;
  readonly slotCount: number;
  readonly colorClass: string;
  readonly isDimmed?: boolean;
}) {
  const chars = text.padEnd(slotCount, " ").slice(0, slotCount).split("");

  return (
    <div className="inline-flex items-center gap-[2px]">
      {chars.map((ch, idx) => (
        <FlapSlot
          // biome-ignore lint/suspicious/noArrayIndexKey: slot indices are static and positional
          key={idx}
          char={ch}
          colorClass={colorClass}
          isDimmed={isDimmed}
        />
      ))}
    </div>
  );
}

/**
 * DeparturesBoardRenderer renders ordinary CSV flight data as an authentic,
 * high-contrast physical airport departures board with split-flap styling.
 */
export function DeparturesBoardRenderer({
  document,
  presentation,
  onUpdatePresentation,
  selectedColumnId,
  onSelectColumn,
}: DeparturesBoardRendererProps) {
  const departuresConfig = presentation.rendererConfigs.departures;
  const isConfigured = isDeparturesConfigured(departuresConfig, presentation.columns);

  // Column lookups
  const timeCol = presentation.columns.find((c) => c.id === departuresConfig?.timeColumnId);
  const flightCol = presentation.columns.find((c) => c.id === departuresConfig?.flightColumnId);
  const destCol = presentation.columns.find((c) => c.id === departuresConfig?.destinationColumnId);
  const gateCol = presentation.columns.find((c) => c.id === departuresConfig?.gateColumnId);
  const statusCol = presentation.columns.find((c) => c.id === departuresConfig?.statusColumnId);

  // --- Missing / Incomplete Configuration State ---
  if (!isConfigured) {
    const handleAutoMap = () => {
      if (onUpdatePresentation) {
        onUpdatePresentation(resetDeparturesMapping(presentation));
      }
    };

    return (
      <div className="w-full max-w-xl mx-auto p-6 sm:p-8 bg-[#0e1015] border border-[#242733] rounded-2xl shadow-xl text-[#f4f4f5] space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            {/* Plane icon */}
            <svg
              className="size-5 rotate-45"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Configure Departures Board
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Map your CSV columns to the required board fields using the inspector sidebar.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#14161d] border border-[#1f222d] space-y-3 text-xs">
          <div className="text-[10px] font-mono uppercase font-semibold text-zinc-400 tracking-wider">
            Required Field Mappings
          </div>

          <div className="space-y-2">
            {[
              { label: "Time", col: timeCol },
              { label: "Flight", col: flightCol },
              { label: "Destination", col: destCol },
              { label: "Gate", col: gateCol },
            ].map(({ label, col }) => {
              const mapped = col !== undefined;
              return (
                <div key={label} className="flex items-center justify-between font-mono">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                        mapped
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700",
                      )}
                    >
                      {mapped ? "✓" : "○"}
                    </span>
                    <span className={mapped ? "text-white" : "text-zinc-400"}>{label}</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {col ? col.header || `Column ${col.sourceIndex + 1}` : "Unmapped"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#1f222d] flex items-center justify-between font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="size-4 rounded-full flex items-center justify-center text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                {statusCol ? "✓" : "○"}
              </span>
              <span>Status / Delay (optional)</span>
            </div>
            <span className="text-[11px]">
              {statusCol ? statusCol.header || `Column ${statusCol.sourceIndex + 1}` : "Unmapped"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500">Select fields in the left inspector to assign.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoMap}
            className="cursor-pointer text-xs h-8 bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          >
            Auto-detect mappings
          </Button>
        </div>
      </div>
    );
  }

  // Slice rows to limit
  const visibleRows = document.rows.slice(0, MAX_VISIBLE_DEPARTURES);
  const totalRows = document.rowCount;

  return (
    <div
      className={cn(
        "departures-board relative w-full max-w-5xl mx-auto rounded-3xl p-5 sm:p-7 md:p-9",
        "bg-[#0c0d10] border border-[#222530] text-[#f4f4f5]",
        "shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]",
      )}
      style={
        {
          "--board-bg": "#0c0d10",
          "--board-panel": "#14161d",
          "--board-cell": "#15171e",
          "--board-cell-divider": "#090a0d",
          "--board-border": "#222530",
          "--board-text": "#f4f4f5",
          "--board-muted": "#71717a",
          "--board-amber": "#fbbf24",
          "--board-success": "#34d399",
          "--board-danger": "#f87171",
          "--board-info": "#38bdf8",
        } as React.CSSProperties
      }
      role="region"
      aria-label="Airport Departures Display"
    >
      {/* 4 Corner Screws / Rivets (Mechanical Hardware Accent) */}
      <div
        className="absolute top-3.5 left-3.5 size-2.5 rounded-full bg-[#1c1f27] border border-[#303542] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
        aria-hidden="true"
      />
      <div
        className="absolute top-3.5 right-3.5 size-2.5 rounded-full bg-[#1c1f27] border border-[#303542] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-3.5 left-3.5 size-2.5 rounded-full bg-[#1c1f27] border border-[#303542] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-3.5 right-3.5 size-2.5 rounded-full bg-[#1c1f27] border border-[#303542] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
        aria-hidden="true"
      />

      {/* Board Header */}
      <div className="flex items-center justify-between pb-5 sm:pb-6 border-b border-[#1b1e27] select-none">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Airplane departure icon */}
          <svg
            className="size-5 sm:size-6 text-amber-400 rotate-45 shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          <span className="font-mono font-black text-xl sm:text-2xl text-amber-400 tracking-wider">
            DEPARTURES
          </span>
        </div>

        {/* Multilingual microcopy */}
        <div className="text-[10px] sm:text-xs font-mono tracking-widest text-[#5c6170] uppercase">
          PARTIDAS · DÉPARTS · ABFLUG
        </div>
      </div>

      {/* Overflow container for mobile/tablet horizontal scroll without collapsing board */}
      <div className="overflow-x-auto pt-4 pb-2">
        <div className="min-w-[680px]">
          {/* Column Headers */}
          <div className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-x-3 sm:gap-x-4 px-1 pb-2.5 text-[11px] font-mono font-semibold tracking-wider text-[#636875] uppercase select-none">
            <button
              type="button"
              onClick={() => timeCol && onSelectColumn?.(timeCol.id)}
              className={cn(
                "text-left hover:text-zinc-200 transition-colors cursor-pointer",
                selectedColumnId === timeCol?.id && "text-amber-400",
              )}
            >
              TIME
            </button>
            <button
              type="button"
              onClick={() => flightCol && onSelectColumn?.(flightCol.id)}
              className={cn(
                "text-left hover:text-zinc-200 transition-colors cursor-pointer",
                selectedColumnId === flightCol?.id && "text-amber-400",
              )}
            >
              FLIGHT
            </button>
            <button
              type="button"
              onClick={() => destCol && onSelectColumn?.(destCol.id)}
              className={cn(
                "text-left hover:text-zinc-200 transition-colors cursor-pointer",
                selectedColumnId === destCol?.id && "text-amber-400",
              )}
            >
              DESTINATION
            </button>
            <button
              type="button"
              onClick={() => gateCol && onSelectColumn?.(gateCol.id)}
              className={cn(
                "text-left hover:text-zinc-200 transition-colors cursor-pointer",
                selectedColumnId === gateCol?.id && "text-amber-400",
              )}
            >
              GATE
            </button>
            <button
              type="button"
              onClick={() => statusCol && onSelectColumn?.(statusCol.id)}
              className={cn(
                "text-left hover:text-zinc-200 transition-colors cursor-pointer",
                selectedColumnId === statusCol?.id && "text-amber-400",
              )}
            >
              STATUS
            </button>
          </div>

          {/* Departure Rows */}
          <div className="space-y-2" role="feed" aria-label="Flight departures list">
            {visibleRows.map((row) => {
              const timeRaw = timeCol ? row.fields[timeCol.sourceIndex] : undefined;
              const timeVal = timeRaw ?? "";
              const timeIntent = timeCol
                ? resolveConditionalIntent({ rawValue: timeRaw, column: timeCol })
                : undefined;
              const timeColorClass = getFlapIntentColorClass(timeIntent, "text-amber-400");

              const flightRaw = flightCol ? row.fields[flightCol.sourceIndex] : undefined;
              const flightVal = (flightRaw ?? "").toUpperCase();
              const flightIntent = flightCol
                ? resolveConditionalIntent({ rawValue: flightRaw, column: flightCol })
                : undefined;
              const flightColorClass = getFlapIntentColorClass(flightIntent, "text-zinc-100");

              const destRaw = destCol ? row.fields[destCol.sourceIndex] : undefined;
              const destVal = (destRaw ?? "").toUpperCase();
              const destIntent = destCol
                ? resolveConditionalIntent({ rawValue: destRaw, column: destCol })
                : undefined;
              const destColorClass = getFlapIntentColorClass(destIntent, "text-zinc-100");

              const gateRaw = gateCol ? row.fields[gateCol.sourceIndex] : undefined;
              const gateVal = (gateRaw ?? "").toUpperCase();
              const gateIntent = gateCol
                ? resolveConditionalIntent({ rawValue: gateRaw, column: gateCol })
                : undefined;
              const gateColorClass = getFlapIntentColorClass(gateIntent, "text-zinc-100");

              const rawStatus = statusCol ? row.fields[statusCol.sourceIndex] : undefined;

              // Precedence rule: specialized airport departure status resolver takes priority over generic conditional rules
              const statusResult = resolveDepartureStatus(rawStatus);
              const isDimmed = statusResult.isDimmedRow;

              let statusColorClass = "text-zinc-400";
              switch (statusResult.intent) {
                case "success":
                  statusColorClass = "text-emerald-400";
                  break;
                case "warning":
                  statusColorClass = "text-amber-400";
                  break;
                case "danger":
                  statusColorClass = "text-rose-400";
                  break;
                case "info":
                  statusColorClass = "text-sky-400";
                  break;
                case "muted":
                  statusColorClass = "text-zinc-500";
                  break;
              }

              return (
                <div
                  key={row.index}
                  role="article"
                  aria-label={`${timeVal} ${flightVal} to ${destVal}, Gate ${gateVal}, Status: ${statusResult.text}`}
                  className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-x-3 sm:gap-x-4 items-center px-1 py-0.5 rounded transition-colors hover:bg-white/[0.02]"
                >
                  {/* TIME */}
                  <div>
                    <FlapField
                      text={timeVal}
                      slotCount={SLOT_COUNTS.time}
                      colorClass={timeColorClass}
                      isDimmed={isDimmed}
                    />
                  </div>

                  {/* FLIGHT */}
                  <div>
                    <FlapField
                      text={flightVal}
                      slotCount={SLOT_COUNTS.flight}
                      colorClass={flightColorClass}
                      isDimmed={isDimmed}
                    />
                  </div>

                  {/* DESTINATION */}
                  <div>
                    <FlapField
                      text={destVal}
                      slotCount={SLOT_COUNTS.destination}
                      colorClass={destColorClass}
                      isDimmed={isDimmed}
                    />
                  </div>

                  {/* GATE */}
                  <div>
                    <FlapField
                      text={gateVal}
                      slotCount={SLOT_COUNTS.gate}
                      colorClass={gateColorClass}
                      isDimmed={isDimmed}
                    />
                  </div>

                  {/* STATUS / DELAY */}
                  <div>
                    <FlapField
                      text={statusResult.text}
                      slotCount={SLOT_COUNTS.status}
                      colorClass={statusColorClass}
                      isDimmed={false}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Board Footer Telemetry */}
      <div className="pt-4 border-t border-[#1b1e27] flex items-center justify-between text-xs font-mono text-[#5c6170] select-none">
        <div>
          Showing {visibleRows.length} of {totalRows.toLocaleString()} departures
        </div>
        <div className="text-[11px] text-[#424652] hidden sm:block">
          CSVora Visual Departures Renderer
        </div>
      </div>
    </div>
  );
}
