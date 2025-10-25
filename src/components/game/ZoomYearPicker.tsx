import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  width?: number;
  height?: number;
  domainMin?: number;
  domainMax?: number;
  initialYear?: number;
  initialView?: { vMin: number; vMax: number };
  minSpan?: number;
  value?: number | null;
  onChange?: (year: number) => void;
  onViewChange?: (vMin: number, vMax: number) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const displayYear = (year: number) =>
  year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;

const snapYear = (value: number, prev?: number) => {
  let rounded = Math.round(value);
  if (rounded === 0) {
    rounded = (prev ?? value) < 0 ? -1 : 1;
  }
  return rounded;
};

export default function ZoomYearPicker({
  width,
  height = 80,
  domainMin = -500,
  domainMax = 2025,
  initialYear = 1900,
  initialView,
  minSpan = 1,
  value = null,
  onChange,
  onViewChange,
}: Props) {
  const maxSpan = domainMax - domainMin;
  const initialClampedYear = initialYear === 0 ? 1 : clamp(initialYear, domainMin, domainMax);

  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(() =>
    typeof width === "number" && !Number.isNaN(width) ? width : 640
  );

  const [vMin, setVMin] = useState(
    initialView ? initialView.vMin : domainMin
  );
  const [vMax, setVMax] = useState(
    initialView ? initialView.vMax : domainMax
  );
  const [year, setYear] = useState(initialClampedYear);

  const displayWidth = Math.max(1, typeof width === "number" && !Number.isNaN(width) ? width : measuredWidth);

  useEffect(() => {
    if (typeof width === "number" && !Number.isNaN(width)) {
      setMeasuredWidth(width);
      return;
    }
    const node = containerRef.current;
    if (!node) return;
    const updateWidth = () => {
      setMeasuredWidth(Math.max(1, Math.round(node.getBoundingClientRect().width)));
    };
    updateWidth();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [width]);

  const isControlled = typeof value === "number" && !Number.isNaN(value);

  useEffect(() => {
    if (!isControlled) return;
    const next = clamp(value === 0 ? (value < 0 ? -1 : 1) : value, domainMin, domainMax);
    setYear((prev) => (prev !== next ? next : prev));
  }, [domainMax, domainMin, isControlled, value]);

  useEffect(() => {
    setYear((curr) => {
      const next = clamp(curr === 0 ? 1 : curr, domainMin, domainMax);
      return next === 0 ? 1 : next;
    });
  }, [domainMin, domainMax]);

  const span = vMax - vMin;

  const PADDING = 12;
  const innerWidth = Math.max(1, displayWidth - 2 * PADDING);
  const railRef = useRef<HTMLDivElement>(null);

  const xAt = useCallback(
    (yVal: number) => ((yVal - vMin) / span) * innerWidth + PADDING,
    [innerWidth, span, vMin]
  );

  const yearAt = useCallback(
    (x: number) => {
      const u = clamp((x - PADDING) / innerWidth, 0, 1);
      return vMin + u * span;
    },
    [innerWidth, span, vMin]
  );

  const setYearRounded = useCallback((value: number) => {
    const rounded = clamp(snapYear(value, year), domainMin, domainMax);
    if (!isControlled) {
      setYear(rounded);
    }
    if (rounded !== year || isControlled) {
      onChange?.(rounded);
    }
  }, [domainMax, domainMin, isControlled, onChange, year]);

  const updateView = useCallback((minValue: number, maxValue: number) => {
    const clampedMin = clamp(minValue, domainMin, domainMax - Math.max(minSpan, 1));
    const clampedMax = clamp(maxValue, clampedMin + Math.max(minSpan, 1), domainMax);
    if (clampedMin !== vMin || clampedMax !== vMax) {
      setVMin(clampedMin);
      setVMax(clampedMax);
      onViewChange?.(clampedMin, clampedMax);
    }
  }, [domainMax, domainMin, minSpan, onViewChange, vMax, vMin]);

  const zoomAround = useCallback((anchorYear: number, factor: number) => {
    const targetSpan = clamp(span * factor, minSpan, maxSpan);
    const ratio = (anchorYear - vMin) / span;
    let nextMin = anchorYear - ratio * targetSpan;
    let nextMax = nextMin + targetSpan;

    if (nextMin < domainMin) {
      nextMin = domainMin;
      nextMax = nextMin + targetSpan;
    }
    if (nextMax > domainMax) {
      nextMax = domainMax;
      nextMin = nextMax - targetSpan;
    }

    updateView(nextMin, nextMax);
  }, [domainMax, domainMin, maxSpan, minSpan, span, updateView, vMin]);

  const wheelRAF = useRef<number | null>(null);
  const wheelEventRef = useRef<WheelEvent | null>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      wheelEventRef.current = event;
      if (wheelRAF.current == null) {
        wheelRAF.current = window.requestAnimationFrame(() => {
          const evt = wheelEventRef.current;
          if (!evt) {
            wheelRAF.current = null;
            return;
          }

          wheelRAF.current = null;

          const rect = rail.getBoundingClientRect();
          const x = evt.clientX - rect.left;

          if (evt.shiftKey) {
            const delta = (evt.deltaY + evt.deltaX) * (span / displayWidth);
            const nextMin = clamp(vMin + delta, domainMin, domainMax - span);
            updateView(nextMin, nextMin + span);
          } else {
            const anchor = yearAt(x);
            const factor = Math.pow(1.0015, evt.deltaY);
            zoomAround(anchor, factor);
          }
        });
      }
    };

    rail.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      rail.removeEventListener("wheel", onWheel);
      if (wheelRAF.current) {
        window.cancelAnimationFrame(wheelRAF.current);
        wheelRAF.current = null;
      }
    };
  }, [displayWidth, domainMax, domainMin, span, updateView, vMin, yearAt, zoomAround]);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{
    dist: number;
    yAnchor: number;
    span0: number;
  } | null>(null);
  const dragging = useRef<"thumb" | "rail" | "pan" | null>(null);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const thumbX = xAt(year);

    if (event.altKey) {
      dragging.current = "pan";
    } else {
      dragging.current = Math.abs(x - thumbX) < 12 ? "thumb" : "rail";
      if (dragging.current === "rail") {
        setYearRounded(yearAt(x));
      }
    }

    if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const midX = (p1.x + p2.x) / 2 - rect.left;
      pinchStart.current = {
        dist,
        yAnchor: yearAt(midX),
        span0: span,
      };
    }
  }, [setYearRounded, span, xAt, year, yearAt]);

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    const prev = pointers.current.get(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [p1, p2] = Array.from(pointers.current.values());
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const scale = dist / pinchStart.current.dist;
      const targetSpan = clamp(pinchStart.current.span0 / scale, minSpan, maxSpan);
      const ratio = (pinchStart.current.yAnchor - vMin) / span;
      let nextMin = pinchStart.current.yAnchor - ratio * targetSpan;
      let nextMax = nextMin + targetSpan;

      if (nextMin < domainMin) {
        nextMin = domainMin;
        nextMax = nextMin + targetSpan;
      }
      if (nextMax > domainMax) {
        nextMax = domainMax;
        nextMin = nextMax - targetSpan;
      }

      updateView(nextMin, nextMax);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;

    if (dragging.current === "thumb" || dragging.current === "rail") {
      setYearRounded(yearAt(x));
    } else if (dragging.current === "pan" && prev) {
      const dxPx = event.clientX - prev.x;
      const dxYears = (dxPx / innerWidth) * span;
      const nextMin = clamp(vMin - dxYears, domainMin, domainMax - span);
      updateView(nextMin, nextMin + span);
    }
  }, [domainMax, domainMin, innerWidth, span, updateView, yearAt, setYearRounded, vMin]);

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      pinchStart.current = null;
    }
    dragging.current = null;
  }, []);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = useCallback((event) => {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        setYearRounded(year - (event.metaKey || event.ctrlKey ? 10 : 1));
        break;
      case "ArrowRight":
        event.preventDefault();
        setYearRounded(year + (event.metaKey || event.ctrlKey ? 10 : 1));
        break;
      case "PageUp":
        event.preventDefault();
        setYearRounded(year + 10);
        break;
      case "PageDown":
        event.preventDefault();
        setYearRounded(year - 10);
        break;
      case "Home":
        event.preventDefault();
        setYearRounded(domainMin < 0 ? -1 : domainMin);
        break;
      case "End":
        event.preventDefault();
        setYearRounded(domainMax);
        break;
      case "-":
      case "_":
        event.preventDefault();
        zoomAround(year, 1.15);
        break;
      case "=":
      case "+":
        event.preventDefault();
        zoomAround(year, 1 / 1.15);
        break;
      default:
        break;
    }
  }, [domainMax, domainMin, setYearRounded, year, zoomAround]);

  const tickStep = useMemo(() => {
    if (span > 600) return 100;
    if (span > 100) return 10;
    return 1;
  }, [span]);

  const ticks = useMemo(() => {
    const start = Math.ceil(vMin / tickStep) * tickStep;
    const values: number[] = [];
    for (let t = start; t <= vMax; t += tickStep) {
      if (t === 0) continue;
      values.push(t);
    }
    return values;
  }, [tickStep, vMin, vMax]);

  const onNumericChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.target.value, 10);
    if (!Number.isFinite(parsed)) return;
    const next = parsed === 0 ? (year < 0 ? -1 : 1) : parsed;
    const clamped = clamp(next, domainMin, domainMax);
    setYearRounded(clamped);
    if (clamped < vMin || clamped > vMax) {
      const targetSpan = Math.max(50, span);
      const nextMin = clamp(clamped - targetSpan / 2, domainMin, domainMax - targetSpan);
      updateView(nextMin, nextMin + targetSpan);
    }
  }, [domainMax, domainMin, setYearRounded, span, updateView, vMax, vMin, year]);

  const labeledTicks = useMemo(() => {
    const out: { x: number; year: number }[] = [];
    let lastX = -Infinity;
    for (const tick of ticks) {
      const x = xAt(tick);
      const isMajor = tickStep === 1 || tick % (tickStep * 10) === 0;
      if (isMajor && x - lastX >= 48) {
        out.push({ x, year: tick });
        lastX = x;
      }
    }
    return out;
  }, [tickStep, ticks, vMin, vMax, innerWidth, span]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-2 select-none"
      style={{ width: typeof width === "number" && !Number.isNaN(width) ? width : "100%" }}
    >
      <div className="flex items-center justify-between text-sm">
        <span>{displayYear(Math.round(vMin))}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => zoomAround(year, 1.15)}
            aria-label="Zoom out"
            className="px-2 py-1 border rounded"
          >
            −
          </button>
          <div aria-live="polite" aria-atomic="true">
            <b>{displayYear(year)}</b>
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={year}
            onChange={onNumericChange}
            className="w-24 px-1 py-1 border rounded"
            aria-label="Enter exact year"
            aria-describedby="year-input-hint"
            min={domainMin}
            max={domainMax}
          />
          <span id="year-input-hint" className="sr-only">
            Type exact year. Use negative for BCE. Year zero is not valid.
          </span>
          <button
            type="button"
            onClick={() => zoomAround(year, 1 / 1.15)}
            aria-label="Zoom in"
            className="px-2 py-1 border rounded"
          >
            +
          </button>
        </div>
        <span>{displayYear(Math.round(vMax))}</span>
      </div>

      <div
        ref={railRef}
        role="slider"
        aria-orientation="horizontal"
        aria-valuemin={domainMin}
        aria-valuemax={domainMax}
        aria-valuenow={year}
        aria-valuetext={displayYear(year)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative border rounded bg-white"
        style={{ height, touchAction: "none" }}
      >
        <svg width={displayWidth} height={height} className="absolute left-0 top-0">
          <line
            x1={PADDING}
            x2={displayWidth - PADDING}
            y1={height / 2}
            y2={height / 2}
            stroke="currentColor"
            strokeWidth={2}
          />
          {ticks.map((tick) => {
            const x = xAt(tick);
            return (
              <line
                key={`tick-${tick}`}
                x1={x}
                x2={x}
                y1={height / 2 - 10}
                y2={height / 2 + 10}
                stroke="currentColor"
                strokeWidth={1}
              />
            );
          })}
          {labeledTicks.map(({ x, year: tickYear }) => (
            <text
              key={`label-${tickYear}`}
              x={x}
              y={height / 2 - 24}
              textAnchor="middle"
              fontSize="10"
            >
              {displayYear(tickYear)}
            </text>
          ))}
          <g transform={`translate(${xAt(year)}, 0)`}>
            <circle cy={height / 2} r={10} fill="black">
              <title>{displayYear(year)}</title>
            </circle>
          </g>
        </svg>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          className="px-2 py-1 border rounded"
          onClick={() => updateView(domainMin, domainMax)}
        >
          Reset view
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded"
          onClick={() => {
            const targetSpan = Math.max(50, Math.min(span, maxSpan));
            let nextMin = clamp(year - targetSpan / 2, domainMin, domainMax - targetSpan);
            updateView(nextMin, nextMin + targetSpan);
          }}
        >
          Center on {displayYear(year)}
        </button>
        <span className="opacity-70">Shift+Wheel = pan, Alt+Drag = pan</span>
      </div>
    </div>
  );
}
