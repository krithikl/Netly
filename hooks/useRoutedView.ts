"use client";

import { usePathname, useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";
import { getRouteForView, getViewForPathname } from "@/lib/app/routes";
import type { View } from "@/lib/app/types";

// Syncs the selected app view with the Next.js route path.
export function useRoutedView() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeView, setLocalActiveView] = useState(() => getViewForPathname(pathname));

  const setActiveView = useCallback((view: View) => {
    setLocalActiveView(view);
    startTransition(() => {
      router.push(getRouteForView(view));
    });
  }, [router]);

  useEffect(() => {
    setLocalActiveView(getViewForPathname(pathname));
  }, [pathname]);

  return {
    activeView,
    setActiveView
  };
}
