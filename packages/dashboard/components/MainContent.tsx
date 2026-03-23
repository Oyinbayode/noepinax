"use client";

import { useSidebar } from "@/components/Providers";
import clsx from "clsx";
import type { ReactNode } from "react";

export function MainContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main className={clsx(
      "h-screen overflow-y-auto p-4 md:p-6 lg:p-8 transition-[margin-left] duration-200 ease-in-out",
      "ml-0 lg:ml-[200px]",
      collapsed && "lg:ml-[52px]"
    )}>
      {children}
    </main>
  );
}
