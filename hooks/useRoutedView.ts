"use client";

import { usePathname, useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";
import { getRouteForView, getViewForPathname } from "@/lib/app/routes";
import type { View } from "@/lib/app/types";

// Syncs the selected app view with the Next.js route path.
export function useRoutedView() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameView = getViewForPathname(pathname);
  const [activeView, setLocalActiveView] = useState<View>(pathnameView);

  const setActiveView = useCallback((view: View) => {
    setLocalActiveView(view);
    startTransition(() => {
      router.push(getRouteForView(view));
    });
  }, [router]);

  useEffect(() => {
    setLocalActiveView(pathnameView);
  }, [pathnameView]);

  return {
    activeView,
    setActiveView
  };
}
