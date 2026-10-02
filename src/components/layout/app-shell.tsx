"use client";

import type { ReactNode } from "react";
import { BreadcrumbProvider } from "./breadcrumbs";
import { CommandSearchProvider } from "./command-search";
import { Header } from "./header";
import { MobileBottomNav } from "./mobile-nav";
import { PreviewBanner } from "./preview-banner";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <BreadcrumbProvider>
      <CommandSearchProvider>
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <div className="flex min-h-svh w-full">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <PreviewBanner />
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-1 px-4 pt-5 pb-24 outline-none sm:px-6 md:pb-10">
              <div className="mx-auto w-full max-w-[1400px]">{children}</div>
            </main>
          </div>
        </div>
        <MobileBottomNav />
      </CommandSearchProvider>
    </BreadcrumbProvider>
  );
}
