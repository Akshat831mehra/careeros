export type RouterTransitionType = "push" | "replace" | "traverse";

let lastTransition: RouterTransitionType | null = null;

export function setLastRouterTransition(type: RouterTransitionType) {
  lastTransition = type;
}

export function consumeRouterTransition(): RouterTransitionType | null {
  const transition = lastTransition;
  lastTransition = null;
  return transition;
}
