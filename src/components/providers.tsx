"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={250}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className:
              "!rounded-xl !border !border-border !bg-surface-elevated !text-foreground !shadow-float !text-[13px]",
          }}
        />
      </TooltipProvider>
    </ThemeProvider>
  );
}
