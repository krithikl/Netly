"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { getRouteForView, getViewForPathname } from "@/lib/app/routes";
import type { View } from "@/lib/app/types";

// Syncs the selected app view with the Next.js route path.
export function useRoutedView() {
  const pathname = usePathname();
  const router = useRouter();
  const activeView = getViewForPathname(pathname);

  const setActiveView = useCallback((view: View) => {
    router.push(getRouteForView(view));
  }, [router]);

  return {
    activeView,
    setActiveView
  };
}
