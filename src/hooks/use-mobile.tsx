
"use client";

import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Initialize state to false (desktop-first).
  // This ensures the server and initial client render match.
  // The useEffect will then update to the correct client-side value.
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    // This effect runs only on the client.
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkDevice(); // Call on mount to set the correct initial client-side value.
    
    // Add resize listener
    window.addEventListener("resize", checkDevice);

    // Cleanup listener on component unmount
    return () => window.removeEventListener("resize", checkDevice);
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount.

  return isMobile;
}
