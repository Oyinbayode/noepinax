"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useWebSocket } from "@/lib/ws";
import { useSidebar } from "@/components/Providers";

const NAV = [
  { href: "/", label: "Observatory", icon: EyeIcon },
  { href: "/gallery", label: "Gallery", icon: GridIcon },
  { href: "/marketplace", label: "Market", icon: ShopIcon },
  { href: "/chat", label: "Chat", icon: ChatIcon },
  { href: "/agents", label: "Agents", icon: UsersIcon },
  { href: "/economy", label: "Economy", icon: ChartIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { connected } = useWebSocket();
  const { collapsed, mobileOpen, toggle, closeMobile } = useSidebar();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={clsx(
          "fixed left-0 top-0 bottom-0 bg-canvas border-r border-[rgba(139,148,158,0.06)] flex flex-col z-50 transition-all duration-200 ease-in-out",
          // Mobile: off-screen by default, slides in when open
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          // Desktop: collapsible width
          collapsed ? "w-[56px]" : "w-[210px]"
        )}
      >
        <div className={clsx("h-14 flex items-center gap-2.5", collapsed ? "px-0 justify-center" : "px-4")}>
          <div className="relative">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#0d1117" />
              <path d="M10 22V10l12 12V10" stroke="#39ff85" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={clsx(
              "absolute -bottom-0.5 -right-0.5 w-[5px] h-[5px] rounded-full",
              connected ? "bg-glow animate-breathe" : "bg-[#2d333b]"
            )} />
          </div>
          {!collapsed && (
            <>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-[15px] font-bold text-[#e6edf3] tracking-tight flex-1">
                Noepinax
              </span>
              <button
                onClick={() => { toggle(); closeMobile(); }}
                className="w-6 h-6 flex items-center justify-center rounded text-ink-3 hover:text-ink-2 transition-colors hidden lg:flex"
                title="Collapse"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11 19l-7-7 7-7" /><path d="M18 19l-7-7 7-7" />
                </svg>
              </button>
              {/* Mobile close */}
              <button
                onClick={closeMobile}
                className="w-6 h-6 flex items-center justify-center rounded text-ink-3 hover:text-ink-2 transition-colors lg:hidden"
                title="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
          {collapsed && (
            <button
              onClick={toggle}
              className="absolute top-14 -right-3 w-5 h-5 rounded-full bg-surface border border-[rgba(139,148,158,0.12)] flex items-center justify-center text-ink-3 hover:text-ink-2 transition-colors z-10 hidden lg:flex"
              title="Expand"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        <nav className={clsx("flex-1 py-3 space-y-0.5", collapsed ? "px-1.5" : "px-2.5")}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                title={collapsed ? label : undefined}
                className={clsx(
                  "flex items-center gap-3 py-2 rounded-lg text-[14px] transition-all duration-150",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "bg-[rgba(139,148,158,0.06)] text-ink font-medium"
                    : "text-ink-2 hover:text-ink hover:bg-[rgba(139,148,158,0.03)]"
                )}
              >
                <span className="shrink-0"><Icon active={active} /></span>
                {!collapsed && <span style={{ fontFamily: "'Source Sans 3', sans-serif" }}>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={clsx(
          "border-t border-[rgba(139,148,158,0.06)]",
          collapsed ? "px-0 py-3 flex justify-center" : "px-4 py-3"
        )}>
          <div className={clsx("flex items-center", collapsed ? "justify-center" : "gap-2")}>
            <span className={clsx(
              "w-[5px] h-[5px] rounded-full shrink-0",
              connected ? "bg-glow animate-breathe" : "bg-coral"
            )} />
            {!collapsed && (
              <span className="text-[11px] text-ink-3 font-mono">
                {connected ? "live" : "offline"}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function EyeIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#39ff85" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#39ff85" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ShopIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#39ff85" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#39ff85" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UsersIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#39ff85" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? "#39ff85" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}
