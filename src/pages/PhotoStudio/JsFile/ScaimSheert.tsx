import React, { useMemo, useState, useEffect, useRef } from "react";
import "./LaborSheet.css";

type Row = {
  idx: number;
  laborRates: string;
  cat: string;
  sel: string;
  desc: string;
  qty: string;
  unit: string;
  acv: string;
  days: string[]; // Day 1..Day 10
  subtotal: string;
  acv2: string;            // second ACV column
  itemAmount: string;
  reportedCost: string;
  workersWage: string;
  laborBurden: string;
  laborOverhead: string;
  salesTax: string;
  material: string;
  equipment: string;
  marketConditions: string;
  coverage: string;
  activity: string;
  laborMinimum: string;
  tax: string;
  Replace: string;
};

const HEADERS = [
  "#",
  "Labor Rates",
  "Cat",
  "Sel",
  "Desc",
  "Qty",
  "Unit",
  "ACV",
  "Day 1",
  "Day 2",
  "Day 3",
  "Day 4",
  "Day 5",
  "Day 6",
  "Day 7",
  "Day 8",
  "Day 9",
  "Day 10",
  "Subtotal",
  "",
  "ACV",
  "Item Amount",
  "Reported Cost",
  "Worker's Wage",
  "Labor burden",
  "Labor Overhead",
  "Sales Tax",
  "Material",
  "Equipment",
  "Market Conditions",
  "Coverage",
  "Activity",
  "Labor Minimum",
  "Tax",
  "Replace",
] as const;

// Fixed column widths (px) – tuned for iPad browser
const COL_W = [
  56,   // #
  120,  // Labor Rates
  80,   // Cat
  90,   // Sel
  420,  // Desc
  90,   // Qty
  90,   // Unit
  120,  // ACV
  120,  // Day 1
  120,  // Day 2
  120,  // Day 3
  120,  // Day 4
  120,  // Day 5
  120,  // Day 6
  120,  // Day 7
  120,  // Day 8
  120,  // Day 9
  120,  // Day 10
  140,  // Subtotal
  80,   // Empty column
  120,  // ACV (2)
  160,  // Item Amount
  160,  // Reported Cost
  160,  // Worker's Wage
  150,  // Labor burden
  160,  // Labor Overhead
  130,  // Sales Tax
  140,  // Material
  140,  // Equipment
  180,  // Market Conditions
  130,  // Coverage
  140,  // Activity
  160,  // Labor Minimum
  110,  // Tax
  120,  // Replace
];

const makeEmptyRow = (idx: number): Row => ({
  idx,
  laborRates: "LAB",
  cat: "LAB",
  sel: "ADMIN",
  desc: "",
  qty: "1",
  unit: "HR",
  acv: "0",
  days: Array(10).fill("0"),
  subtotal: "0",
  acv2: "0",
  itemAmount: "0",
  reportedCost: "0",
  workersWage: "0",
  laborBurden: "0",
  laborOverhead: "0",
  salesTax: "0",
  material: "0",
  equipment: "0",
  marketConditions: "0",
  coverage: "0",
  activity: "0",
  laborMinimum: "0",
  tax: "0",
  Replace: "",
});

export default function Sheet() {
  const [rows, setRows] = useState<Row[]>([makeEmptyRow(1)]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const minZoom = 0.25; // 25%
  const maxZoom = 2;    // 200%
  const zoomStep = 0.1;
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{x: number; y: number}>({ x: 0, y: 0 });
  const scrollStartRef = useRef<{left: number; top: number}>({ left: 0, top: 0 });

  const gridTemplate = useMemo(
    () => COL_W.map(w => `${w}px`).join(" "),
    []
  );

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    // Zoom when Ctrl (or trackpad pinch) is detected; otherwise allow normal scrolling
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = -e.deltaY; // up = zoom in, down = zoom out
    const next = delta > 0 ? zoom + zoomStep : zoom - zoomStep;
    setZoom(Math.max(minZoom, Math.min(maxZoom, Number(next.toFixed(2)))));
  };

  const distanceBetweenTouches = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const d = distanceBetweenTouches(e.touches[0], e.touches[1]);
      pinchStartDistanceRef.current = d;
      pinchStartZoomRef.current = zoom;
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistanceRef.current) {
      e.preventDefault();
      const d = distanceBetweenTouches(e.touches[0], e.touches[1]);
      const scale = d / pinchStartDistanceRef.current;
      const next = pinchStartZoomRef.current * scale;
      setZoom(Math.max(minZoom, Math.min(maxZoom, Number(next.toFixed(2)))));
    }
  };

  const onTouchEnd = () => {
    if (pinchStartDistanceRef.current) {
      pinchStartDistanceRef.current = null;
    }
  };

  // iPad viewport optimization and scroll handling
  useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    const handleOrientationChange = () => {
      setViewportHeight();
      // Delay to ensure proper viewport calculation after orientation change
      setTimeout(() => {
        setViewportHeight();
        if (scrollRef.current) {
          // Reset scroll position after orientation change
          scrollRef.current.scrollTop = 0;
          scrollRef.current.scrollLeft = 0;
        }
      }, 100);
    };

    const handleResize = () => {
      setViewportHeight();
    };

    setViewportHeight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const addRow = () =>
    setRows(prev => [...prev, makeEmptyRow(prev.length + 1)]);

  const setCell = (r: number, key: keyof Row, value: string) => {
    setRows(prev => {
      const next = [...prev];
      const row = { ...next[r] };
      (row as any)[key] = value;

      // recompute subtotal from days
      const subtotal = row.days.reduce((a, b) => a + Number(b || 0), 0);
      row.subtotal = String(subtotal);

      next[r] = row;
      return next;
    });
  };

  const setDay = (r: number, dIndex: number, value: string) => {
    setRows(prev => {
      const next = [...prev];
      const row = { ...next[r] };
      const days = [...row.days];
      days[dIndex] = value;
      row.days = days;
      row.subtotal = String(days.reduce((a, b) => a + Number(b || 0), 0));
      next[r] = row;
      return next;
    });
  };

  return (
    <div className="sheet-outer-container">
      <div className="sheet-root">
        {/* Sheet content with outer scroll */}
        <div
          className="sheet-scroll"
          ref={scrollRef}
          onWheel={handleWheelZoom}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={(e) => {
            if (!scrollRef.current) return;
            setIsPanning(true);
            panStartRef.current = { x: e.clientX, y: e.clientY };
            scrollStartRef.current = {
              left: scrollRef.current.scrollLeft,
              top: scrollRef.current.scrollTop,
            };
          }}
          onMouseMove={(e) => {
            if (!isPanning || !scrollRef.current) return;
            e.preventDefault();
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            scrollRef.current.scrollLeft = scrollStartRef.current.left - dx;
            scrollRef.current.scrollTop = scrollStartRef.current.top - dy;
          }}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          {/* Sticky header */}
          <div className="sheet-row sheet-head" style={{ gridTemplateColumns: gridTemplate }}>
            {HEADERS.map((h, i) => (
              <div className="cell head" key={i} style={{ width: COL_W[i] }}>
                {h}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="sheet-body">
            {rows.map((row, rIdx) => {
              let col = 0;
              return (
                <div className="sheet-row" key={row.idx} style={{ gridTemplateColumns: gridTemplate }}>
                  {/* # */}
                  <div className="cell ro" style={{ width: COL_W[col++] }}>{row.idx}</div>

                  {/* Labor Rates */}
                  <Cell w={COL_W[col++]} value={row.laborRates} onChange={v => setCell(rIdx, "laborRates", v)} />

                  {/* Cat */}
                  <Cell w={COL_W[col++]} value={row.cat} onChange={v => setCell(rIdx, "cat", v)} />

                  {/* Sel */}
                  <Cell w={COL_W[col++]} value={row.sel} onChange={v => setCell(rIdx, "sel", v)} />

                  {/* Desc */}
                  <Cell w={COL_W[col++]} value={row.desc} onChange={v => setCell(rIdx, "desc", v)} align="left" />

                  {/* Qty */}
                  <Cell w={COL_W[col++]} value={row.qty} onChange={v => setCell(rIdx, "qty", v)} align="right" type="number" />

                  {/* Unit */}
                  <Cell w={COL_W[col++]} value={row.unit} onChange={v => setCell(rIdx, "unit", v)} />

                  {/* ACV */}
                  <Cell w={COL_W[col++]} value={row.acv} onChange={v => setCell(rIdx, "acv", v)} align="right" type="number" />

                  {/* Day 1..10 */}
                  {row.days.map((d, i) => (
                    <Cell
                      key={i}
                      w={COL_W[col++]}
                      value={d}
                      onChange={v => setDay(rIdx, i, v)}
                      align="right"
                      type="number"
                    />
                  ))}

                  {/* Subtotal (read-only) */}
                  <div className="cell money ro" style={{ width: COL_W[col++] }}>
                    <b style={{ float: "right" }}>{row.subtotal}</b>
                  </div>

                  {/* Empty column */}
                  <div className="cell ro" style={{ width: COL_W[col++] }}></div>

                  {/* Second ACV + all finance cols */}
                  <Cell w={COL_W[col++]} value={row.acv2} onChange={v => setCell(rIdx, "acv2", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.itemAmount} onChange={v => setCell(rIdx, "itemAmount", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.reportedCost} onChange={v => setCell(rIdx, "reportedCost", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.workersWage} onChange={v => setCell(rIdx, "workersWage", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.laborBurden} onChange={v => setCell(rIdx, "laborBurden", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.laborOverhead} onChange={v => setCell(rIdx, "laborOverhead", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.salesTax} onChange={v => setCell(rIdx, "salesTax", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.material} onChange={v => setCell(rIdx, "material", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.equipment} onChange={v => setCell(rIdx, "equipment", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.marketConditions} onChange={v => setCell(rIdx, "marketConditions", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.coverage} onChange={v => setCell(rIdx, "coverage", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.activity} onChange={v => setCell(rIdx, "activity", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.laborMinimum} onChange={v => setCell(rIdx, "laborMinimum", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.tax} onChange={v => setCell(rIdx, "tax", v)} align="right" type="number" />
                  <Cell w={COL_W[col++]} value={row.Replace} onChange={v => setCell(rIdx, "Replace", v)} align="right" type="text" />
                </div>
              );
            })}
          </div>
        </div>
        </div>

        <div className="sheet-actions">
          <button className="btn" onClick={addRow}>+ Add Row</button>
        </div>
      </div>
    </div>
  );
}

function Cell({
  w,
  value,
  onChange,
  type = "text",
  align = "center",
}: {
  w: number;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  align?: "left" | "center" | "right";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // iPad input focus optimization
  const handleFocus = () => {
    if (inputRef.current && type === "number") {
      // Prevent zoom on iOS by ensuring font size is 16px
      inputRef.current.style.fontSize = "16px";
    }
  };

  return (
    <div className="cell" style={{ width: w }}>
      <input
        ref={inputRef}
        className={`in ${align}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        // iPad specific attributes
        inputMode={type === "number" ? "numeric" : "text"}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
    </div>
  );
}
