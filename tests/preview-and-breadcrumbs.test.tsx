import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { BreadcrumbProvider, Breadcrumbs, useBreadcrumbLabel } from "@/components/layout/breadcrumbs";
import { navigationState, routerMock } from "@/test/setup";
import { mockApi, renderWithProviders } from "@/test/utils";

// Simulate `NEXT_PUBLIC_AUTH_DISABLED=true` under `next dev`.
vi.mock("@/lib/env", () => ({ env: { apiUrl: "http://api.test", appName: "Theiavora", authDisabled: true } }));

describe("preview mode (auth disabled)", () => {
  it("renders protected pages as the preview user without calling auth endpoints", async () => {
    const { calls } = mockApi({});
    renderWithProviders(
      <ProtectedRoute>
        <p>inside the app</p>
      </ProtectedRoute>,
    );
    expect(await screen.findByText("inside the app")).toBeInTheDocument();
    expect(calls.filter((c) => c.path.startsWith("/api/auth"))).toHaveLength(0);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});

function ProjectCrumb() {
  useBreadcrumbLabel("p1", "KOC Ecommerce");
  return <Breadcrumbs />;
}

describe("breadcrumbs", () => {
  it("replaces an id segment with a readable label without re-render loops", () => {
    navigationState.pathname = "/projects/p1/board";
    const error = vi.spyOn(console, "error");
    renderWithProviders(
      <BreadcrumbProvider>
        <ProjectCrumb />
      </BreadcrumbProvider>,
      { user: null },
    );
    expect(screen.getByRole("link", { name: "KOC Ecommerce" })).toHaveAttribute("href", "/projects/p1");
    expect(error).not.toHaveBeenCalled();
  });
});
