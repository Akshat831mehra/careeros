"use client";

import * as React from "react";
import { QuickAddDialog, type QuickAddTab } from "./quick-add-dialog";

export type QuickAddCompany = { id: string; name: string };
export type QuickAddContact = { id: string; fullName: string; companyId: string | null; designation: string | null };

type QuickAddContextValue = {
  openQuickAdd: (tab?: QuickAddTab, companyId?: string, contactId?: string) => void;
};

const QuickAddContext = React.createContext<QuickAddContextValue | null>(null);

export function useQuickAdd() {
  const context = React.useContext(QuickAddContext);
  if (!context) throw new Error("useQuickAdd must be used inside QuickAddProvider");
  return context;
}

export function QuickAddProvider({
  children,
  companies,
  contacts,
}: {
  children: React.ReactNode;
  companies: QuickAddCompany[];
  contacts: QuickAddContact[];
}) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<QuickAddTab>("company");
  const [defaultCompanyId, setDefaultCompanyId] = React.useState<string | undefined>();
  const [defaultContactId, setDefaultContactId] = React.useState<string | undefined>();

  const openQuickAdd = React.useCallback(
    (nextTab: QuickAddTab = "company", companyId?: string, contactId?: string) => {
      setTab(nextTab);
      setDefaultCompanyId(companyId);
      setDefaultContactId(contactId);
      setOpen(true);
    },
    [],
  );

  return (
    <QuickAddContext.Provider value={{ openQuickAdd }}>
      {children}
      <QuickAddDialog
        key={`${open ? "open" : "closed"}-${tab}-${defaultCompanyId ?? ""}-${defaultContactId ?? ""}`}
        open={open}
        onOpenChange={setOpen}
        tab={tab}
        onTabChange={setTab}
        companies={companies}
        contacts={contacts}
        defaultCompanyId={defaultCompanyId}
        defaultContactId={defaultContactId}
      />
    </QuickAddContext.Provider>
  );
}
