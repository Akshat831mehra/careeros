"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "./sidebar";

export function MobileSidebar({
  user,
  counts,
}: {
  user: { name: string; email: string; image: string | null };
  counts: {
    applications: number;
    contacts: number;
    companies: number;
    tasks: number;
    tasksToday: number;
    tasksCompletedToday: number;
    followUpsToday: number;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          className="left-0 top-0 h-dvh w-[280px] max-w-[86vw] translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-l-0 border-r p-0"
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <DialogClose asChild>
            <button
              className="absolute right-2.5 top-2.5 z-20 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
          <SidebarContent user={user} counts={counts} onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
