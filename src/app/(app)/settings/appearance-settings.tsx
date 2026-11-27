"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

const options = [
  { value: "light", label: "Light", description: "Bright and crisp", icon: Sun },
  { value: "dark", label: "Dark", description: "Easy on the eyes", icon: Moon },
  { value: "system", label: "System", description: "Match your device", icon: Monitor },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {options.map((option) => {
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "relative flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
              active
                ? "border-brand/40 bg-brand-soft/60"
                : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md border",
                active ? "border-brand/20 bg-surface text-brand" : "border-border bg-surface-muted text-muted",
              )}
            >
              <option.icon className="h-3.5 w-3.5" />
            </span>
            <span>
              <span className="block text-[11.5px] font-medium text-foreground">{option.label}</span>
              <span className="mt-0.5 block text-[10px] text-muted">{option.description}</span>
            </span>
            {active && (
              <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <Check className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
