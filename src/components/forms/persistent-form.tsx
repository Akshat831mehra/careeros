"use client";

import * as React from "react";
import { useFormDraft } from "@/lib/use-form-draft";

type SubmitResult = boolean | void | Promise<boolean | void>;

type PersistentFormProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  draftKey: string;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => SubmitResult;
  ref?: React.Ref<HTMLFormElement>;
};

/**
 * Wraps a native form with per-user draft persistence. Submit handlers return
 * `true` once the workflow succeeds; failed submissions keep the draft.
 */
export function PersistentForm({ draftKey, onSubmit, onReset, ref, ...props }: PersistentFormProps) {
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const { clearDraft } = useFormDraft(draftKey, formRef);

  const assignRef = React.useCallback(
    (node: HTMLFormElement | null) => {
      formRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLFormElement | null>).current = node;
    },
    [ref],
  );

  const handleSubmit: NonNullable<PersistentFormProps["onSubmit"]> = (event) => {
    const result = onSubmit?.(event);
    if (!result || typeof (result as Promise<boolean | void>).then !== "function") {
      if (result === true) void clearDraft();
      return;
    }
    void (result as Promise<boolean | void>).then((success) => {
      if (success === true) void clearDraft();
    });
  };

  const handleReset: React.FormEventHandler<HTMLFormElement> = (event) => {
    onReset?.(event);
    void clearDraft();
  };

  return <form ref={assignRef} onSubmit={handleSubmit} onReset={handleReset} {...props} />;
}
