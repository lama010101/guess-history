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
  `${year >= 0 ? '+' : '\u2212'}${Math.abs(year)}`;

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
  const domainSpan = Math.max(domainMax - domainMin, minSpan);
  const maxSpan = domainMax - domainMin || domainSpan;
  const initialClampedYear = initialYear === 0 ? 1 : clamp(initialYear, domainMin, domainMax);

  const initialSpanRaw = initialView
    ? Math.max(Math.abs(initialView.vMax - initialView.vMin), minSpan)
    : domainSpan;
  const initialSpan = clamp(initialSpanRaw || minSpan, minSpan, Math.max(maxSpan, minSpan));
  const initialCenter = initialView
    ? (initialView.vMin + initialView.vMax) / 2
    : initialClampedYear;
  const initialVMin = clamp(initialCenter - initialSpan / 2, domainMin, domainMax - initialSpan);
  const initialVMax = initialVMin + initialSpan;

  const [measuredWidth, setMeasuredWidth] = useState<number>(() =>
    typeof width === "number" && !Number.isNaN(width) ? width : 640
  );

  const [vMin, setVMin] = useState(initialVMin);
  const [vMax, setVMax] = useState(initialVMax);

  const [railElement, setRailElement] = useState<HTMLDivElement | null>(null);
  const displayWidth = Math.max(1, typeof width === "number" && !Number.isNaN(width) ? width : measuredWidth);

  useEffect(() => {
    if (typeof width === "number" && !Number.isNaN(width)) {
      setMeasuredWidth(width);
      return;
    }
    if (!railElement) return;
    const updateWidth = () => {
      setMeasuredWidth(Math.max(1, Math.round(railElement.getBoundingClientRect().width)));
    };
    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => {
        window.removeEventListener("resize", updateWidth);
      };
    }
    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(railElement);
    return () => {
      observer.disconnect();
    };
  }, [railElement, width]);

  const span = vMax - vMin;
  const effectiveSpan = span === 0 ? 1 : span;

  const PADDING = 12;
  const innerWidth = Math.max(1, displayWidth - 2 * PADDING);
  const CENTER_X = PADDING + innerWidth / 2;
  const railRef = useRef<HTMLDivElement | null>(null);
  const viewCenter = useMemo(() => vMin + span / 2, [span, vMin]);

  const xAt = useCallback(
    (yearValue: number) => ((yearValue - vMin) / effectiveSpan) * innerWidth + PADDING,
    [effectiveSpan, innerWidth, vMin]
  );

  const yearAt = useCallback(
    (x: number) => {
      const u = clamp((x - PADDING) / innerWidth, 0, 1);
      return vMin + u * effectiveSpan;
    },
    [effectiveSpan, innerWidth, vMin]
  );

  const selectedYearRaw = yearAt(CENTER_X);
  const selectedYear = useMemo(() => {
    if (!Number.isFinite(selectedYearRaw)) {
      return domainMin;
    }
    const rounded = snapYear(selectedYearRaw);
    const clamped = clamp(rounded, domainMin, domainMax);
    if (clamped === 0) {
      return selectedYearRaw < 0 ? -1 : 1;
    }
    return clamped;
  }, [domainMax, domainMin, selectedYearRaw]);

  const hasInteractedRef = useRef(false);
  const lastSelectedYearRef = useRef<number | null>(null);
  const lastEmittedValueRef = useRef<number | null>(null);
  const pendingExternalValueRef = useRef<number | null>(null);
  const previousValueRef = useRef<number | null | undefined>(undefined);
  const markInteracted = useCallback(() => {
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (value != null && !Number.isNaN(value) && value !== 0) {
      hasInteractedRef.current = true;
    }
  }, [value]);

  useEffect(() => {
    if (!Number.isFinite(selectedYear)) return;
    if (pendingExternalValueRef.current !== null) {
      if (Math.abs(selectedYear - pendingExternalValueRef.current) < 0.5) {
        pendingExternalValueRef.current = null;
        lastEmittedValueRef.current = null;
      }
      return;
    }
    if (!hasInteractedRef.current && (value == null || Number.isNaN(value) || value === 0)) {
      return;
    }
    if (selectedYear === lastSelectedYearRef.current) return;
    lastSelectedYearRef.current = selectedYear;
    lastEmittedValueRef.current = selectedYear;
    onChange?.(selectedYear);
  }, [onChange, selectedYear, value]);

  const updateView = useCallback(
    (minValue: number, maxValue: number) => {
      let spanValue = maxValue - minValue;
      const minAllowedSpan = Math.max(minSpan, 1);
      if (spanValue < minAllowedSpan) {
        spanValue = minAllowedSpan;
      }
      const halfSpan = spanValue / 2;
      const minBound = domainMin - halfSpan;
      const maxBound = domainMax - halfSpan;
      let nextMin = clamp(minValue, minBound, maxBound);
      let nextMax = nextMin + spanValue;
      if (nextMax - nextMin !== spanValue) {
        nextMax = nextMin + spanValue;
      }
      if (nextMin !== vMin || nextMax !== vMax) {
        setVMin(nextMin);
        setVMax(nextMax);
        onViewChange?.(nextMin, nextMax);
      }
    },
    [domainMax, domainMin, minSpan, onViewChange, vMax, vMin]
  );

  const centerOn = useCallback(
    (targetYear: number, targetSpan: number = Math.max(50, span)) => {
      if (targetYear === 0) return;
      const clampedSpan = clamp(targetSpan, minSpan, maxSpan);
      const nm = targetYear - clampedSpan / 2;
      updateView(nm, nm + clampedSpan);
    },
    [maxSpan, minSpan, span, updateView]
  );

  useEffect(() => {
    if (previousValueRef.current === value && pendingExternalValueRef.current === null) {
      return;
    }
    previousValueRef.current = value;

    if (value == null || Number.isNaN(value) || value === 0) return;
    const clampedValue = clamp(value, domainMin, domainMax);
    pendingExternalValueRef.current = clampedValue;
    if (selectedYear === clampedValue) {
      lastEmittedValueRef.current = null;
      pendingExternalValueRef.current = null;
      return;
    }
    const lastEmitted = lastEmittedValueRef.current;
    if (lastEmitted != null && Math.abs(clampedValue - lastEmitted) < 0.5) {
      lastEmittedValueRef.current = null;
      pendingExternalValueRef.current = null;
      return;
    }
    const targetSpan = clamp(span || minSpan, minSpan, maxSpan);
    const nextMin = clampedValue - targetSpan / 2;
    updateView(nextMin, nextMin + targetSpan);
  }, [domainMax, domainMin, maxSpan, minSpan, selectedYear, span, updateView, value]);

  const nudge = useCallback(
    (deltaYears: number) => {
      if (deltaYears === 0) return;
      markInteracted();
      const nm = vMin + deltaYears;
      updateView(nm, nm + span);
    },
    [markInteracted, span, updateView, vMin]
  );

  const zoomAround = useCallback((anchorYear: number, factor: number) => {
    const targetSpan = clamp(effectiveSpan * factor, minSpan, maxSpan);
    const currentCenter = vMin + effectiveSpan / 2;
    let ratio = clamp((anchorYear - vMin) / effectiveSpan, 0, 1);
    if (!Number.isFinite(ratio)) {
      ratio = 0.5;
    }
    if (Math.abs(anchorYear - currentCenter) < 0.5) {
      ratio = 0.5;
    }
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
            const delta = (evt.deltaY + evt.deltaX) * (effectiveSpan / displayWidth);
            markInteracted();
            const nextMin = vMin + delta;
            updateView(nextMin, nextMin + effectiveSpan);
          } else {
            markInteracted();
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
  }, [displayWidth, domainMax, domainMin, effectiveSpan, updateView, vMin, yearAt, zoomAround]);

  const dragging = useRef<null | { startX: number; startVMin: number; startVMax: number }>(null);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{
    dist: number;
    yAnchor: number;
    span0: number;
  } | null>(null);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragging.current = {
      startX: event.clientX,
      startVMin: vMin,
      startVMax: vMax,
    };
    markInteracted();

    if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const rect = event.currentTarget.getBoundingClientRect();
      const midX = (p1.x + p2.x) / 2 - rect.left;
      pinchStart.current = {
        dist,
        yAnchor: yearAt(midX),
        span0: effectiveSpan,
      };
    }
  }, [effectiveSpan, markInteracted, vMax, vMin, yearAt]);

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    const prev = pointers.current.get(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [p1, p2] = Array.from(pointers.current.values());
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const scale = dist / pinchStart.current.dist;
      const targetSpan = clamp(pinchStart.current.span0 / scale, minSpan, maxSpan);
      const ratio = clamp((pinchStart.current.yAnchor - vMin) / effectiveSpan, 0, 1);
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

    if (!dragging.current || !prev) return;
    const dxPx = event.clientX - dragging.current.startX;
    const dxYears = (dxPx / innerWidth) * effectiveSpan;
    markInteracted();
    const nextMin = dragging.current.startVMin - dxYears;
    updateView(nextMin, nextMin + effectiveSpan);
  }, [effectiveSpan, innerWidth, markInteracted, updateView]);

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      pinchStart.current = null;
    }
    dragging.current = null;
  }, []);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = useCallback((event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      markInteracted();
      nudge(-(event.metaKey || event.ctrlKey ? 10 : 1));
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      markInteracted();
      nudge(event.metaKey || event.ctrlKey ? 10 : 1);
      return;
    }
    if (event.key === "PageDown" || ((event.metaKey || event.ctrlKey) && event.key === "ArrowLeft")) {
      event.preventDefault();
      markInteracted();
      nudge(-10);
      return;
    }
    if (event.key === "PageUp" || ((event.metaKey || event.ctrlKey) && event.key === "ArrowRight")) {
      event.preventDefault();
      markInteracted();
      nudge(10);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      markInteracted();
      centerOn(domainMin, effectiveSpan);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      markInteracted();
      centerOn(domainMax, effectiveSpan);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      markInteracted();
      zoomAround(viewCenter, 1.15);
      return;
    }
    if (event.key === "=" || event.key === "+") {
      event.preventDefault();
      markInteracted();
      zoomAround(viewCenter, 1 / 1.15);
    }
  }, [centerOn, domainMax, domainMin, effectiveSpan, markInteracted, nudge, viewCenter, zoomAround]);

  const tickStep = useMemo(() => {
    if (span > 600) return 100;
    if (span > 100) return 10;
    return 1;
  }, [span]);

  const majorTicks = useMemo(() => {
    const visibleMin = Math.max(vMin, domainMin);
    const visibleMax = Math.min(vMax, domainMax);
    const start = Math.ceil(visibleMin / tickStep) * tickStep;
    const values: number[] = [];
    for (let t = start; t <= visibleMax; t += tickStep) {
      if (t === 0) continue;
      values.push(t);
    }
    return values;
  }, [domainMin, domainMax, tickStep, vMin, vMax]);

  const minorTickStep = useMemo(() => {
    if (tickStep <= 1) return null;
    const approx = Math.max(1, Math.round(tickStep / 5));
    return approx >= tickStep ? null : approx;
  }, [tickStep]);

  const minorTicks = useMemo(() => {
    if (!minorTickStep) return [] as number[];
    const visibleMin = Math.max(vMin, domainMin);
    const visibleMax = Math.min(vMax, domainMax);
    const start = Math.floor(visibleMin / minorTickStep) * minorTickStep;
    const values: number[] = [];
    for (let t = start; t <= visibleMax; t += minorTickStep) {
      if (t === 0 || (t % tickStep === 0)) continue;
      if (t < domainMin || t > domainMax) continue;
      values.push(t);
    }
    return values;
  }, [domainMax, domainMin, minorTickStep, tickStep, vMax, vMin]);

  const labeledTicks = useMemo(() => {
    const out: { x: number; year: number }[] = [];
    let lastX = -Infinity;
    for (const tick of majorTicks) {
      const x = xAt(tick);
      if (x - lastX >= 48) {
        out.push({ x, year: tick });
        lastX = x;
      }
    }
    return out;
  }, [majorTicks, xAt]);

  const handleZoom = useCallback(
    (factor: number) => {
      markInteracted();
      zoomAround(viewCenter, factor);
    },
    [markInteracted, viewCenter, zoomAround]
  );

  return (
    <div
      className="flex items-center gap-3 select-none"
      style={{ width: typeof width === "number" && !Number.isNaN(width) ? width : "100%" }}
    >
      <button
        type="button"
        onClick={() => handleZoom(1.15)}
        aria-label="Zoom out"
        className="px-2 py-1 border border-[#555] rounded bg-[#222] text-white"
      >
        −
      </button>
      <div className="flex-1">
        <div
          ref={(node) => {
            setRailElement(node);
            railRef.current = node;
          }}
          role="slider"
          aria-orientation="horizontal"
          aria-valuemin={domainMin}
          aria-valuemax={domainMax}
          aria-valuenow={selectedYear}
          aria-valuetext={displayYear(selectedYear)}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative"
          style={{
            height,
            touchAction: "none",
            background: "#333",
            color: "#fff",
          }}
        >
          <svg width={displayWidth} height={height} className="absolute left-0 top-0">
            <line
              x1={PADDING}
              x2={displayWidth - PADDING}
              y1={height / 2}
              y2={height / 2}
              stroke="#4b5563"
              strokeWidth={2}
            />
            {minorTicks.map((tick) => {
              const x = xAt(tick);
              const tickHeight = Math.min(12, height * 0.28);
              return (
                <line
                  key={`minor-${tick}`}
                  x1={x}
                  x2={x}
                  y1={height / 2 - tickHeight}
                  y2={height / 2}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeLinecap="round"
                />
              );
            })}
            {majorTicks.map((tick) => {
              const x = xAt(tick);
              const tickHeight = Math.min(18, height * 0.4);
              return (
                <line
                  key={`major-${tick}`}
                  x1={x}
                  x2={x}
                  y1={height / 2 - tickHeight}
                  y2={height / 2}
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}
            {labeledTicks.map(({ x, year: tickYear }) => (
              <text
                key={`label-${tickYear}`}
                x={x}
                y={height / 2 + 18}
                textAnchor="middle"
                fontSize="10"
                fill="#f3f4f6"
              >
                {displayYear(tickYear)}
              </text>
            ))}
            <g transform={`translate(${CENTER_X}, 0)`}>
              <line
                x1={0}
                x2={0}
                y1={height / 2 - Math.min(26, height * 0.6)}
                y2={height / 2 + Math.min(14, height * 0.25)}
                stroke="#f97316"
                strokeWidth={4}
                strokeLinecap="round"
              />
              <title>{displayYear(selectedYear)}</title>
            </g>
          </svg>
        </div>
      </div>
      <button
        type="button"
        onClick={() => handleZoom(1 / 1.15)}
        aria-label="Zoom in"
        className="px-2 py-1 border border-[#555] rounded bg-[#222] text-white"
      >
        +
      </button>
    </div>
  );
}
