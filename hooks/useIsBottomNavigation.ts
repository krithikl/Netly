"use client";

import { useEffect, useState } from "react";

const bottomNavigationMediaQuery = "(max-width: 1180px)";

export function useIsBottomNavigation() {
  const [isBottomNavigation, setIsBottomNavigation] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(bottomNavigationMediaQuery);
    const handleChange = () => setIsBottomNavigation(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isBottomNavigation;
}
