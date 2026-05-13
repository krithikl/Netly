"use client";

import { useEffect, useState } from "react";

const bottomNavigationMediaQuery = "(max-width: 1180px)";

export function useIsBottomNavigation() {
  const [isBottomNavigation, setIsBottomNavigation] = useState(() => getIsBottomNavigation());

  useEffect(() => {
    const mediaQuery = window.matchMedia(bottomNavigationMediaQuery);
    const handleChange = () => setIsBottomNavigation(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isBottomNavigation;
}

export function getIsBottomNavigation() {
  return typeof window === "undefined" ? false : window.matchMedia(bottomNavigationMediaQuery).matches;
}
