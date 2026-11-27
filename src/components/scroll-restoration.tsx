"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { consumeRouterTransition } from "@/lib/router-navigation";

type NavigationWindow = Window & {
  navigation?: { activation?: { navigationType?: string } };
};

function initialNavigationType(): string | null {
  try {
    const navigationType = (window as NavigationWindow).navigation?.activation?.navigationType;
    if (navigationType) return navigationType;

    const entry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (entry?.type) return entry.type;

    const legacyType = performance.navigation?.type;
    if (legacyType === 1) return "reload";
    if (legacyType === 2) return "back_forward";
    if (legacyType === 0) return "navigate";
  } catch {
    // Navigation timing is an enhancement; a top scroll remains the safe default.
  }
  return null;
}

function isTraversal(type: string | null): boolean {
  return type === "traverse" || type === "back_forward" || type === "restore";
}

function scrollToTop() {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    root.scrollTop = 0;
    document.body.scrollTop = 0;
  } finally {
    root.style.scrollBehavior = previous;
  }
}

export function ScrollRestoration() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const popstateRef = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      popstateRef.current = true;
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || isTraversal(initialNavigationType())) return;
      requestAnimationFrame(scrollToTop);
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);

    if (!isTraversal(initialNavigationType())) {
      scrollToTop();
      requestAnimationFrame(scrollToTop);
      requestAnimationFrame(() => scrollToTop());
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    const transition = consumeRouterTransition();
    const isTraversal = popstateRef.current || transition === "traverse";
    popstateRef.current = false;
    if (isTraversal && transition !== "push" && transition !== "replace") return;

    scrollToTop();
  }, [pathname]);

  return null;
}
