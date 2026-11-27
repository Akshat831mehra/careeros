import type { ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, Circle, Command, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-white text-[#17181c] ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <path d="M10 22V14.5C10 12.567 11.567 11 13.5 11H16" stroke="#17181C" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M22 10V17.5C22 19.433 20.433 21 18.5 21H16" stroke="#8D8CF7" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2.2" fill="#17181C" />
      </svg>
    </span>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[1.08fr_1fr]">
      {/* Product panel */}
      <section className="relative hidden overflow-hidden bg-[#101014] text-white lg:flex lg:flex-col lg:justify-between">
        <div className="dotted-grid absolute inset-0 opacity-[0.12]" />
        <div className="relative z-10 flex items-center justify-between px-10 pt-9">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[14px] font-semibold tracking-[-0.02em]">CareerOS</span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
            Personal CRM
          </span>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[520px] px-10">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-medium text-white/55">
            <Sparkles className="h-3 w-3 text-[#a5a4ff]" />
            Built for focused job searches
          </div>
          <h1 className="text-balance text-[40px] font-semibold leading-[1.06] tracking-[-0.045em]">
            Your job search,
            <br />
            finally under control.
          </h1>
          <p className="mt-4 max-w-[420px] text-[13.5px] leading-relaxed text-white/50">
            Companies, applications, recruiters and follow-ups — one calm workspace instead of five
            scattered spreadsheets.
          </p>

          <div className="relative mt-9">
            <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 shadow-2xl backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-white/45">Application pipeline</p>
                  <p className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em]">12 active opportunities</p>
                </div>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[9.5px] text-white/45">
                  This week
                </span>
              </div>

              <div className="flex h-1.5 gap-1 overflow-hidden rounded-full">
                <div className="h-full w-[18%] rounded-full bg-white/25" />
                <div className="h-full w-[10%] rounded-full bg-[#6f8cff]" />
                <div className="h-full w-[26%] rounded-full bg-[#8d8cf7]" />
                <div className="h-full w-[22%] rounded-full bg-[#e5b35c]" />
                <div className="h-full w-[9%] rounded-full bg-[#4ecb95]" />
                <div className="h-full w-[15%] rounded-full bg-white/12" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: "To apply", value: "2", color: "bg-white/30" },
                  { label: "Interviewing", value: "3", color: "bg-[#e5b35c]" },
                  { label: "Offers", value: "1", color: "bg-[#4ecb95]" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
                      <span className="text-[9.5px] text-white/40">{item.label}</span>
                    </div>
                    <p className="mt-1 text-[17px] font-semibold tracking-[-0.02em]">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-1.5">
                {[
                  { company: "Stripe", role: "Infrastructure Engineer", status: "Final interview", tone: "text-[#e5b35c]" },
                  { company: "Linear", role: "Platform Engineer", status: "Recruiter screen", tone: "text-[#a5a4ff]" },
                  { company: "Railway", role: "DevOps Engineer", status: "Offer", tone: "text-[#4ecb95]" },
                ].map((row) => (
                  <div
                    key={row.company}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.07] text-[9px] font-semibold text-white/70">
                        {row.company.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-[10.5px] font-medium text-white/80">{row.company}</p>
                        <p className="text-[9px] text-white/35">{row.role}</p>
                      </div>
                    </div>
                    <span className={`text-[9.5px] font-medium ${row.tone}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-9 -right-3 w-[190px] rounded-xl border border-white/[0.1] bg-[#17171d] p-3.5 shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium text-white/50">Today&apos;s focus</p>
                <span className="text-[9px] text-[#a5a4ff]">2 / 5</span>
              </div>
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-[#4ecb95]" />
                  <span className="text-[10px] text-white/35 line-through">Follow up with Daniel</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-white/20" />
                  <span className="text-[10px] text-white/65">Stripe final interview</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-white/20" />
                  <span className="text-[10px] text-white/65">Send thank-you note</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between px-10 pb-8 pt-16">
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-1.5">
              {["AS", "PN", "RM"].map((initials, index) => (
                <span
                  key={initials}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-[#101014] bg-white/15 text-[7px] font-semibold text-white/70"
                  style={{ zIndex: 3 - index }}
                >
                  {initials}
                </span>
              ))}
            </div>
            <p className="text-[10.5px] text-white/35">Built for candidates who take their search seriously.</p>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-white/30">
            <Command className="h-3 w-3" />
            Press K anywhere
          </span>
        </div>
      </section>

      {/* Auth panel */}
      <section className="relative flex min-h-dvh flex-col bg-background">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
          <div className="flex items-center gap-2.5 lg:invisible">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
              <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden="true">
                <rect width="32" height="32" rx="9" fill="currentColor" />
                <path d="M10 22V14.5C10 12.567 11.567 11 13.5 11H16" stroke="var(--background)" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M22 10V17.5C22 19.433 20.433 21 18.5 21H16" stroke="#8D8CF7" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="16" cy="16" r="2.2" fill="var(--background)" />
              </svg>
            </span>
            <span className="text-[13px] font-semibold tracking-[-0.02em]">CareerOS</span>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-muted transition-colors hover:text-foreground sm:flex"
            >
              Help
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          {children}
        </div>

        <div className="px-5 pb-6 text-center sm:px-8">
          <p className="text-[10px] text-muted/70">
            CareerOS MVP · Your data stays private and scoped to your account.
          </p>
        </div>
      </section>
    </main>
  );
}
