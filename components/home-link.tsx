"use client";

import type { MouseEvent, ReactNode } from "react";

const homeUrl = "https://torquegirl.com/";

export function HomeLink({ children, className, ariaLabel }: { children: ReactNode; className?: string; ariaLabel?: string }) {
  function goHome(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.location.assign(homeUrl);
  }

  return <a className={className} href={homeUrl} aria-label={ariaLabel} onClick={goHome}>{children}</a>;
}
