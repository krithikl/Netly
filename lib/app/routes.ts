import type { View } from "@/lib/app/types";

export const viewRoutes: Record<View, string> = {
  home: "/",
  transactions: "/transactions",
  budgets: "/budgets",
  cards: "/card-fit",
  connect: "/connect",
  settings: "/settings"
};

export const routeViews: Record<string, View> = Object.fromEntries(
  Object.entries(viewRoutes).map(([view, route]) => [route, view])
) as Record<string, View>;

export function getRouteForView(view: View) {
  return viewRoutes[view];
}

export function getViewForPathname(pathname: string): View {
  return routeViews[pathname] || "home";
}

// Only allow URL segments that match known app pages
export function getViewForRouteSegment(segment: string): View | null {
  const route = `/${segment}`;
  return routeViews[route] || null;
}

export function getRoutedViewSegments() {
  return Object.values(viewRoutes)
    .filter((route) => route !== "/")
    .map((route) => route.slice(1));
}
