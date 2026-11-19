"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "step"> {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Single-thumb slider built on a native range input: keyboard and screen-reader support come from
 * the browser, and nothing is measured during hydration (keeps page start-up cheap). Keeps the
 * array-valued API of the Radix slider it replaces. Styles: `.slider-native` in globals.css.
 */
function Slider({ className, style, value, defaultValue, onValueChange, min = 0, max = 100, step = 1, ...props }: SliderProps) {
  const current = value?.[0] ?? defaultValue?.[0] ?? min;
  const pct = ((current - min) / Math.max(1e-9, max - min)) * 100;
  return (
    <input
      type="range"
      data-slot="slider"
      min={min}
      max={max}
      step={step}
      {...(value ? { value: value[0] } : { defaultValue: defaultValue?.[0] })}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={cn("slider-native block h-5 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50", className)}
      style={{ "--slider-pct": `${pct}%`, ...style } as React.CSSProperties}
      {...props}
    />
  );
}

export { Slider };
