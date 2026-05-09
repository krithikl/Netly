"use client";

import { usePathname, useRouter } from "next/navigation";
import { getRouteForView, getViewForPathname } from "@/lib/app/routes";
import type { View } from "@/lib/app/types";

export function useRoutedView() {
  const pathname = usePathname();
  const router = useRouter();
  const activeView = getViewForPathname(pathname);

  function setActiveView(view: View) {
    router.push(getRouteForView(view));
  }

  return {
    activeView,
    setActiveView
  };
}
