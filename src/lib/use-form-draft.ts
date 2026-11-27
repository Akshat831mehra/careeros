"use client";

import * as React from "react";

type FormValues = Record<string, string | string[] | boolean>;

type DraftPayload = { draft?: { data?: unknown } | null };

const SKIP_NAMES = /(password|secret|token|api[-_]?key|authorization|cookie)/i;
const RESTORE_EVENT = "__careerosDraftRestore";
const restoringControls = new WeakSet<Element>();

function serializableControls(form: HTMLFormElement) {
  return Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input[name],textarea[name],select[name]",
    ),
  ).filter((control) => {
    if (control instanceof HTMLInputElement) {
      if (control.type === "password" || control.type === "file" || control.type === "hidden") {
        return false;
      }
    }
    return !SKIP_NAMES.test(control.name);
  });
}

function serializeForm(form: HTMLFormElement): FormValues {
  const controls = serializableControls(form);
  const values: FormValues = {};
  const checkboxCounts = new Map<string, number>();

  for (const control of controls) {
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      checkboxCounts.set(control.name, (checkboxCounts.get(control.name) ?? 0) + 1);
    }
  }

  for (const control of controls) {
    const name = control.name;
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      if ((checkboxCounts.get(name) ?? 0) > 1) {
        const group = Array.isArray(values[name]) ? (values[name] as string[]) : [];
        if (control.checked) group.push(control.value);
        values[name] = group;
      } else {
        values[name] = control.checked;
      }
      continue;
    }

    if (control instanceof HTMLInputElement && control.type === "radio") {
      if (control.checked) values[name] = control.value;
      continue;
    }

    if (control instanceof HTMLSelectElement && control.multiple) {
      values[name] = Array.from(control.selectedOptions).map((option) => option.value);
      continue;
    }

    values[name] = control.value;
  }

  return values;
}

function setNativeValue(
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const prototype =
    control instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : control instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(control, value);
}

function notifyChange(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  for (const type of ["input", "change"]) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, RESTORE_EVENT, { value: true });
    control.dispatchEvent(event);
  }
}

function applyFormValues(form: HTMLFormElement, data: FormValues) {
  for (const control of serializableControls(form)) {
    const value = data[control.name];
    if (typeof value === "undefined") continue;

    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      const desired = Array.isArray(value) ? value.includes(control.value) : Boolean(value);
      restoringControls.add(control);
      try {
        if (control.checked !== desired) control.click();
        notifyChange(control);
      } finally {
        restoringControls.delete(control);
      }
      continue;
    }

    if (control instanceof HTMLInputElement && control.type === "radio") {
      restoringControls.add(control);
      try {
        if (value === control.value && !control.checked) control.click();
      } finally {
        restoringControls.delete(control);
      }
      continue;
    }

    if (control instanceof HTMLSelectElement && control.multiple && Array.isArray(value)) {
      for (const option of Array.from(control.options)) {
        option.selected = value.includes(option.value);
      }
      notifyChange(control);
      continue;
    }

    setNativeValue(control, Array.isArray(value) ? value.join(",") : String(value));
    notifyChange(control);
  }
}

async function saveDraft(key: string, values: FormValues) {
  try {
    await fetch(`/api/drafts?key=${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, data: values }),
      keepalive: true,
    });
  } catch {
    // Draft persistence is best-effort.
  }
}

async function deleteDraft(key: string) {
  try {
    await fetch(`/api/drafts?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  } catch {
    // Draft persistence is best-effort.
  }
}

export function useFormDraft(
  draftKey: string,
  formRef: React.RefObject<HTMLFormElement | null>,
  options: { debounceMs?: number } = {},
) {
  const [revision, setRevision] = React.useState(0);
  const dirtyRef = React.useRef(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let active = true;
    const activeKey = draftKey;
    dirtyRef.current = false;

    fetch(`/api/drafts?key=${encodeURIComponent(activeKey)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: DraftPayload | null) => {
        if (!active || dirtyRef.current) return;
        const data = payload?.draft?.data;
        const form = formRef.current;
        if (!form || !data || typeof data !== "object" || Array.isArray(data)) return;
        applyFormValues(form, data as FormValues);
      })
      .catch(() => {
        // Drafts are best-effort.
      });

    const handleChange = (event: Event) => {
      // Events dispatched while applying a restored draft must not mark it dirty.
      const marker = (event as unknown as Record<string, unknown>)[RESTORE_EVENT];
      const target = event.target;
      if (
        marker === true ||
        (target instanceof Element && restoringControls.has(target))
      ) {
        return;
      }
      dirtyRef.current = true;
      setRevision((value) => value + 1);
    };

    const handleReset = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      dirtyRef.current = false;
    };

    const handlePageHide = () => {
      if (dirtyRef.current && formRef.current) {
        void saveDraft(activeKey, serializeForm(formRef.current));
      }
    };

    const form = formRef.current;
    form?.addEventListener("input", handleChange, true);
    form?.addEventListener("change", handleChange, true);
    form?.addEventListener("reset", handleReset, true);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      active = false;
      form?.removeEventListener("input", handleChange, true);
      form?.removeEventListener("change", handleChange, true);
      form?.removeEventListener("reset", handleReset, true);
      window.removeEventListener("pagehide", handlePageHide);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (dirtyRef.current && form) void saveDraft(activeKey, serializeForm(form));
    };
  }, [draftKey, formRef]);

  React.useEffect(() => {
    if (!dirtyRef.current) return;
    const form = formRef.current;
    if (!form) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void saveDraft(draftKey, serializeForm(form));
    }, options.debounceMs ?? 300);

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [revision, draftKey, formRef, options.debounceMs]);

  const clearDraft = React.useCallback(async () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    dirtyRef.current = false;
    await deleteDraft(draftKey);
  }, [draftKey]);

  return { clearDraft };
}
