import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type CircularProgressProps = {
  ariaLabel: string;
  className?: string;
  value: number;
};

const circleSize = 44;
const circleStrokeWidth = 5;
const circleRadius = (circleSize - circleStrokeWidth) / 2;
const circleCircumference = 2 * Math.PI * circleRadius;
const progressStrokeColor = "var(--selected-chip-text)";
const completedLapOpacity = 0.42;

// Compact circular progress indicator for dense summary cards.
function CircularProgress({ ariaLabel, className, value }: CircularProgressProps) {
  const progress = Math.max(0, value);
  const progressRemainder = progress % 100;
  const hasCompletedLap = progress >= 100;
  const progressLabel = `${Math.round(progress)}%`;
  const hasCurrentLap = progress > 0 && progressRemainder > 0;
  const progressValue = progressRemainder;
  const strokeDashoffset = circleCircumference * (1 - progressValue / 100);

  return (
    <span
      aria-label={ariaLabel}
      aria-valuemax={Math.max(100, Math.round(progress))}
      aria-valuemin={0}
      aria-valuenow={Math.round(progress)}
      aria-valuetext={`${progressLabel} of budget used`}
      className={cn("circular-progress", className)}
      role="progressbar"
      style={{
        "--circular-progress-size": "clamp(50px, 4.8vw, 64px)",
        alignSelf: "center",
        display: "grid",
        flex: "0 0 var(--circular-progress-size, clamp(50px, 4.8vw, 64px))",
        height: "var(--circular-progress-size, clamp(50px, 4.8vw, 64px))",
        justifySelf: "center",
        placeItems: "center",
        position: "relative",
        width: "var(--circular-progress-size, clamp(50px, 4.8vw, 64px))"
      } as CSSProperties}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        height="100%"
        style={{ display: "block", height: "100%", overflow: "visible", transform: "rotate(-90deg)", width: "100%" }}
        viewBox={`0 0 ${circleSize} ${circleSize}`}
        width="100%"
      >
        <circle
          className="circular-progress-track"
          cx={circleSize / 2}
          cy={circleSize / 2}
          fill="none"
          r={circleRadius}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={circleStrokeWidth}
        />
        {hasCompletedLap && (
          <circle
            className="circular-progress-lap"
            cx={circleSize / 2}
            cy={circleSize / 2}
            fill="none"
            r={circleRadius}
            stroke={progressStrokeColor}
            strokeOpacity={completedLapOpacity}
            strokeWidth={circleStrokeWidth}
          />
        )}
        {hasCurrentLap && (
          <circle
            className="circular-progress-value"
            cx={circleSize / 2}
            cy={circleSize / 2}
            fill="none"
            r={circleRadius}
            stroke={progressStrokeColor}
            strokeDasharray={circleCircumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth={circleStrokeWidth}
          />
        )}
      </svg>
      <span aria-hidden="true" className="circular-progress-label" style={{ fontSize: "clamp(0.76rem, 1.2vw, 0.92rem)" }}>
        {progressLabel}
      </span>
    </span>
  );
}

export { CircularProgress };
