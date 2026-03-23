"use client";

import { useSidebar } from "@/components/Providers";
import clsx from "clsx";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const { collapsed, toggleMobile } = useSidebar();

  return (
    <>
      <div
        className={clsx(
          "fixed top-0 right-0 z-10 bg-canvas/80 backdrop-blur-md px-4 md:px-6 lg:px-8 pb-3 pt-4 md:pt-6 lg:pt-8 border-b border-[rgba(139,148,158,0.06)] transition-[left] duration-200 ease-in-out",
          "left-0",
          collapsed ? "lg:left-[52px]" : "lg:left-[200px]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={toggleMobile}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-2 hover:text-ink hover:bg-[rgba(139,148,158,0.06)] transition-colors lg:hidden shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-[22px] md:text-[28px] font-bold tracking-tight text-ink leading-none truncate">{title}</h1>
              {subtitle && <p className="text-[12px] md:text-[13px] text-ink-3 mt-1 md:mt-2 truncate">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
      <div className="h-[56px] md:h-[72px]" />
    </>
  );
}
