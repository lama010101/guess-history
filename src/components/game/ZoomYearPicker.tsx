import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

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

const computeClampedView = (
  center: number,
  span: number,
  domainMin: number,
  domainMax: number,
  minSpan: number,
  maxSpan: number
) => {
  const domainSpan = Math.max(domainMax - domainMin, minSpan);
  const safeSpan = clamp(span, minSpan, Math.max(maxSpan, minSpan));
  const clampedCenter = clamp(center, domainMin, domainMax);
  const halfSpan = safeSpan / 2;
  const nextMin = clampedCenter - halfSpan;
  const nextMax = clampedCenter + halfSpan;

  const resolvedSpan = Math.max(nextMax - nextMin, Math.max(minSpan, 0));

  return { min: nextMin, max: nextMax, span: resolvedSpan };
};

type ZoomPreset = {
  span: number;
  label: "century" | "decade" | "year";
  majorTick: number;
  minorTick: number | null;
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
  const zoomPresets = useMemo(() => {
    const minAllowed = Math.max(minSpan, 1);
    const maxAllowed = Math.max(minSpan, domainSpan);
    const basePresets: ZoomPreset[] = [
      { span: 1200, label: "century", majorTick: 100, minorTick: 20 },
      { span: 200, label: "decade", majorTick: 10, minorTick: 2 },
      { span: 20, label: "year", majorTick: 1, minorTick: null },
    ];
    const adjusted = basePresets.map((preset) => ({
      ...preset,
      span: clamp(preset.span, minAllowed, maxAllowed),
    }));
    const sorted = adjusted.slice().sort((a, b) => a.span - b.span);
    return sorted;
  }, [domainSpan, minSpan]);

  const getBestZoomIndex = useCallback(
    (targetSpan: number) => {
      if (zoomPresets.length === 0) return 0;
      let bestIndex = 0;
      let bestDiff = Infinity;
      zoomPresets.forEach((preset, index) => {
        const diff = Math.abs(preset.span - targetSpan);
        if (
          diff < bestDiff ||
          (diff === bestDiff && preset.span > (zoomPresets[bestIndex]?.span ?? -Infinity))
        ) {
          bestDiff = diff;
          bestIndex = index;
        }
      });
      return bestIndex;
    },
    [zoomPresets]
  );

  const initialZoomIndex = useMemo(() => {
    if (zoomPresets.length === 0) return 0;
    const defaultIndex = zoomPresets.length - 1;
    if (initialView) {
      const viewSpan = clamp(
        Math.max(Math.abs(initialView.vMax - initialView.vMin), minSpan),
        Math.max(minSpan, 1),
        Math.max(minSpan, domainSpan)
      );
      const spansMatchDomain = Math.abs(viewSpan - domainSpan) < 1;
      if (!spansMatchDomain) {
        return getBestZoomIndex(viewSpan);
      }
    }
    return defaultIndex;
  }, [domainSpan, getBestZoomIndex, initialView, minSpan, zoomPresets.length]);

  const initialPreset = zoomPresets[initialZoomIndex] ?? zoomPresets[zoomPresets.length - 1];
  const initialSpan = initialPreset?.span ?? domainSpan;
  const initialCenter = initialView
    ? (initialView.vMin + initialView.vMax) / 2
    : initialClampedYear;
  const initialViewBounds = computeClampedView(
    initialCenter,
    initialSpan,
    domainMin,
    domainMax,
    minSpan,
    Math.max(maxSpan, minSpan)
  );

  const [measuredWidth, setMeasuredWidth] = useState<number>(() =>
    typeof width === "number" && !Number.isNaN(width) ? width : 640
  );

  const [zoomIndex, setZoomIndex] = useState(initialZoomIndex);
  const [vMin, setVMin] = useState(initialViewBounds.min);
  const [vMax, setVMax] = useState(initialViewBounds.max);

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
  const currentSpan = useMemo(
    () => Math.max(effectiveSpan, Math.max(minSpan, 1)),
    [effectiveSpan, minSpan]
  );

  const PADDING = 12;
  const innerWidth = Math.max(1, displayWidth - 2 * PADDING);
  const CENTER_X = PADDING + innerWidth / 2;
  const railRef = useRef<HTMLDivElement | null>(null);
  const viewCenter = useMemo(() => vMin + span / 2, [span, vMin]);
  const currentPreset = zoomPresets[zoomIndex] ?? zoomPresets[zoomPresets.length - 1] ?? null;
  const applyView = useCallback(
    ({ min: nextMin, max: nextMax, index }: { min: number; max: number; index?: number }) => {
      const resolvedSpan = Math.max(nextMax - nextMin, Math.max(minSpan, 1));
      if (index != null) {
        setZoomIndex((prev) => (prev === index ? prev : index));
      } else if (zoomPresets.length > 0) {
        const nextIndex = getBestZoomIndex(resolvedSpan);
        setZoomIndex((prev) => (prev === nextIndex ? prev : nextIndex));
      }

      if (nextMin !== vMin || nextMax !== vMax) {
        setVMin(nextMin);
        setVMax(nextMax);
        onViewChange?.(nextMin, nextMax);
      }
    },
    [getBestZoomIndex, minSpan, onViewChange, vMax, vMin, zoomPresets.length]
  );

  const setZoomToIndex = useCallback(
    (targetIndex: number, anchorYear?: number) => {
      if (zoomPresets.length === 0) return;
      const clampedIndex = clamp(Math.round(targetIndex), 0, zoomPresets.length - 1);
      const targetSpan = zoomPresets[clampedIndex]?.span ?? currentSpan;
      const anchor =
        typeof anchorYear === "number" && Number.isFinite(anchorYear) ? anchorYear : viewCenter;
      const nextView = computeClampedView(
        anchor,
        targetSpan,
        domainMin,
        domainMax,
        minSpan,
        Math.max(maxSpan, minSpan)
      );
      applyView({ min: nextView.min, max: nextView.max, index: clampedIndex });
    },
    [applyView, currentSpan, domainMax, domainMin, maxSpan, minSpan, viewCenter, zoomPresets]
  );

  const adjustZoom = useCallback(
    (delta: number, anchorYear?: number) => {
      if (!delta) return;
      setZoomToIndex(zoomIndex + delta, anchorYear);
    },
    [setZoomToIndex, zoomIndex]
  );

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

  const domainVisibleMin = useMemo(() => Math.max(vMin, domainMin), [domainMin, vMin]);
  const domainVisibleMax = useMemo(() => Math.min(vMax, domainMax), [domainMax, vMax]);
  const trackStartX = useMemo(() => {
    const start = xAt(domainVisibleMin);
    return Number.isFinite(start)
      ? clamp(start, PADDING, PADDING + innerWidth)
      : PADDING;
  }, [domainVisibleMin, innerWidth, xAt]);
  const trackEndX = useMemo(() => {
    const end = xAt(domainVisibleMax);
    return Number.isFinite(end)
      ? clamp(end, PADDING, PADDING + innerWidth)
      : PADDING + innerWidth;
  }, [domainVisibleMax, innerWidth, xAt]);
  const zeroTickX = useMemo(() => {
    if (domainVisibleMin > 0 || domainVisibleMax < 0) {
      return null;
    }
    const x = xAt(0);
    return Number.isFinite(x) ? x : null;
  }, [domainVisibleMax, domainVisibleMin, xAt]);

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
      const minAllowedSpan = Math.max(minSpan, 1);
      let spanValue = Math.max(maxValue - minValue, minAllowedSpan);
      const center = minValue + spanValue / 2;
      const nextView = computeClampedView(
        center,
        spanValue,
        domainMin,
        domainMax,
        minSpan,
        Math.max(maxSpan, minSpan)
      );
      applyView({ min: nextView.min, max: nextView.max, index: zoomIndex });
    },
    [applyView, domainMax, domainMin, maxSpan, minSpan, zoomIndex]
  );

  const centerOn = useCallback(
    (targetYear: number, targetSpan?: number) => {
      if (!Number.isFinite(targetYear) || targetYear === 0) return;
      const spanTarget = clamp(
        targetSpan ?? currentSpan,
        Math.max(minSpan, 1),
        Math.max(maxSpan, minSpan)
      );
      const nextView = computeClampedView(
        targetYear,
        spanTarget,
        domainMin,
        domainMax,
        minSpan,
        Math.max(maxSpan, minSpan)
      );
      applyView({ min: nextView.min, max: nextView.max });
    },
    [applyView, currentSpan, domainMax, domainMin, maxSpan, minSpan]
  );

  useEffect(() => {
    if (previousValueRef.current === undefined) {
      previousValueRef.current = value;
      return;
    }

    if (value == null || Number.isNaN(value) || value === 0) {
      previousValueRef.current = value;
      return;
    }

    const normalized = clamp(Math.round(value), domainMin, domainMax);
    const prev = previousValueRef.current;
    previousValueRef.current = value;

    if (prev != null && Math.abs(prev - normalized) < 0.5) {
      return;
    }

    if (lastEmittedValueRef.current != null && Math.abs(lastEmittedValueRef.current - normalized) < 0.5) {
      return;
    }

    if (Math.abs(viewCenter - normalized) < 0.5) {
      return;
    }

    pendingExternalValueRef.current = normalized;
    centerOn(normalized);
  }, [centerOn, domainMax, domainMin, lastEmittedValueRef, value, viewCenter]);

  const nudge = useCallback(
    (deltaYears: number) => {
      if (deltaYears === 0) return;
      markInteracted();
      const nm = vMin + deltaYears;
      updateView(nm, nm + span);
    },
    [markInteracted, span, updateView, vMin]
  );

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
            const majorDelta = Math.abs(evt.deltaY) >= Math.abs(evt.deltaX) ? evt.deltaY : evt.deltaX;
            const direction = majorDelta === 0 ? 0 : majorDelta > 0 ? 1 : -1;
            if (direction !== 0) {
              adjustZoom(direction, anchor);
            }
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
  }, [adjustZoom, displayWidth, effectiveSpan, updateView, vMin, yearAt]);

  const dragging = useRef<null | { startX: number; startVMin: number; startVMax: number }>(null);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{
    baseDist: number;
    yAnchor: number;
    span0: number;
    index: number;
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
        baseDist: dist,
        yAnchor: yearAt(midX),
        span0: effectiveSpan,
        index: zoomIndex,
      };
    }
  }, [effectiveSpan, markInteracted, vMax, vMin, yearAt]);

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = useCallback((event) => {
    const prev = pointers.current.get(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [p1, p2] = Array.from(pointers.current.values());
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const start = pinchStart.current;
      if (!start.baseDist || !Number.isFinite(dist)) {
        return;
      }

      const scale = dist / start.baseDist;
      const OUT_THRESHOLD = 0.9;
      const IN_THRESHOLD = 1 / OUT_THRESHOLD;

      if (scale <= OUT_THRESHOLD && zoomIndex < zoomPresets.length - 1) {
        const nextIndex = Math.min(zoomPresets.length - 1, zoomIndex + 1);
        if (nextIndex !== zoomIndex) {
          setZoomToIndex(nextIndex, start.yAnchor);
          const nextSpan = zoomPresets[nextIndex]?.span ?? start.span0;
          pinchStart.current = {
            baseDist: dist,
            yAnchor: start.yAnchor,
            span0: nextSpan,
            index: nextIndex,
          };
        }
        return;
      }

      if (scale >= IN_THRESHOLD && zoomIndex > 0) {
        const nextIndex = Math.max(0, zoomIndex - 1);
        if (nextIndex !== zoomIndex) {
          setZoomToIndex(nextIndex, start.yAnchor);
          const nextSpan = zoomPresets[nextIndex]?.span ?? start.span0;
          pinchStart.current = {
            baseDist: dist,
            yAnchor: start.yAnchor,
            span0: nextSpan,
            index: nextIndex,
          };
        }
        return;
      }

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
      centerOn(domainMin, currentSpan);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      markInteracted();
      centerOn(domainMax, currentSpan);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      markInteracted();
      adjustZoom(1, viewCenter);
      return;
    }
    if (event.key === "=" || event.key === "+") {
      event.preventDefault();
      markInteracted();
      adjustZoom(-1, viewCenter);
    }
  }, [adjustZoom, centerOn, currentSpan, domainMax, domainMin, markInteracted, nudge, viewCenter]);

  const tickStep = useMemo(() => {
    if (currentPreset?.majorTick && currentPreset.majorTick > 0) {
      return currentPreset.majorTick;
    }
    if (span > 600) return 100;
    if (span > 100) return 10;
    return 1;
  }, [currentPreset?.majorTick, span]);

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

  const labeledTicks = useMemo(() => {
    const out: { x: number; year: number }[] = [];
    if (majorTicks.length === 0) return out;

    const patternStep = tickStep > 0 ? tickStep * 2 : tickStep;
    const offset = tickStep;
    const shouldLabel = (tick: number) => {
      if (!patternStep) return true;
      const modVal = ((tick - offset) % patternStep + patternStep) % patternStep;
      return modVal === 0;
    };

    for (const tick of majorTicks) {
      if (!shouldLabel(tick)) continue;
      const x = xAt(tick);
      out.push({ x, year: tick });
    }
    return out;
  }, [majorTicks, tickStep, xAt]);

  const handleZoom = useCallback(
    (delta: number) => {
      markInteracted();
      adjustZoom(delta, viewCenter);
    },
    [adjustZoom, markInteracted, viewCenter]
  );

  const zoomLabelKey = currentPreset?.label ?? "year";
  const zoomLabelText = useMemo(() => {
    const base = zoomLabelKey;
    return base.charAt(0).toUpperCase() + base.slice(1);
  }, [zoomLabelKey]);

  return (
    <div
      className="flex items-center gap-3 select-none"
      style={{ width: typeof width === "number" && !Number.isNaN(width) ? width : "100%" }}
    >
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
          aria-label={`Year timeline (${zoomLabelText} view)`}
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
              x1={Math.min(trackStartX, trackEndX)}
              x2={Math.max(trackStartX, trackEndX)}
              y1={height / 2}
              y2={height / 2}
              stroke="#4b5563"
              strokeWidth={2}
            />
            {zeroTickX != null && (
              <line
                x1={zeroTickX}
                x2={zeroTickX}
                y1={height / 2 - Math.min(9, height * 0.2)}
                y2={height / 2}
                stroke="#9ca3af"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="2 4"
              />
            )}
            {majorTicks.map((tick) => {
              const x = xAt(tick);
              const tickHeight = Math.min(9, height * 0.2);
              return (
                <line
                  key={`major-${tick}`}
                  x1={x}
                  x2={x}
                  y1={height / 2 - tickHeight}
                  y2={height / 2}
                  stroke="#fff"
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
                y1={height / 2 - Math.min(26, height * 0.6) + 8}
                y2={height / 2 + Math.min(14, height * 0.25)}
                stroke="#f97316"
                strokeWidth={4}
                strokeLinecap="round"
              />
              <title>{displayYear(selectedYear)}</title>
            </g>
          </svg>
        </div>
        <div className="mt-[0.14rem] flex items-center justify-center gap-5 text-[11px] font-medium text-[#d1d5db] pointer-events-auto">
          <button
            type="button"
            onClick={() => handleZoom(1)}
            aria-label="Zoom out"
            className="flex items-center justify-center rounded-full h-7 w-7 hover:text-white focus:outline-none focus:ring-1 focus:ring-[#f97316]"
          >
            <ZoomOut width={18} height={18} />
          </button>
          <span>{`Scale: ${zoomLabelText}`}</span>
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            aria-label="Zoom in"
            className="flex items-center justify-center rounded-full h-7 w-7 hover:text-white focus:outline-none focus:ring-1 focus:ring-[#f97316]"
          >
            <ZoomIn width={18} height={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
