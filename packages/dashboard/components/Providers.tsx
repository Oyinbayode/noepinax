"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";

const SidebarContext = createContext({
  collapsed: false,
  mobileOpen: false,
  toggle: () => {},
  toggleMobile: () => {},
  closeMobile: () => {},
});
export const useSidebar = () => useContext(SidebarContext);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchInterval: 10_000,
        staleTime: 5_000,
      },
    },
  }));

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = () => setCollapsed(prev => !prev);
  const toggleMobile = () => setMobileOpen(prev => !prev);
  const closeMobile = () => setMobileOpen(false);

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarContext.Provider value={{ collapsed, mobileOpen, toggle, toggleMobile, closeMobile }}>
        {children}
      </SidebarContext.Provider>
    </QueryClientProvider>
  );
}
