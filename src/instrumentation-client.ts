import { setLastRouterTransition } from "@/lib/router-navigation";

export function onRouterTransitionStart(
  _url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  setLastRouterTransition(navigationType);
}
