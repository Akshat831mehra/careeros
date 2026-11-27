import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" className="text-foreground" />
        <path
          d="M10 22V14.5C10 12.567 11.567 11 13.5 11H16"
          stroke="var(--background)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M22 10V17.5C22 19.433 20.433 21 18.5 21H16"
          stroke="#8D8CF7"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="2.2" fill="var(--background)" />
      </svg>
    </span>
  );
}

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <BrandMark className="transition-transform duration-200 group-hover:scale-[1.03]" />
      {!compact && (
        <div className="leading-none">
          <span className="text-[14px] font-semibold tracking-[-0.025em] text-foreground">CareerOS</span>
          <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.12em] text-muted/80">
            Job search CRM
          </span>
        </div>
      )}
    </Link>
  );
}
