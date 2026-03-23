import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/components/Providers";
import { MainContent } from "@/components/MainContent";

export const metadata: Metadata = {
  title: "Noepinax",
  description: "Autonomous multi-agent art economy on Ethereum",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Sidebar />
          <MainContent>{children}</MainContent>
        </Providers>
      </body>
    </html>
  );
}
