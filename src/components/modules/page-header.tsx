import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && (
            <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {eyebrow}
            </div>
          )}
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-foreground sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 max-w-[640px] text-[12.5px] text-muted">{description}</p>}
        </div>
        {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
