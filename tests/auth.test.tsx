import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { LoginForm } from "@/components/auth/login-form";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { tokenStore } from "@/lib/api";
import { navigationState, routerMock } from "@/test/setup";
import { mockApi, renderWithProviders, userWithRole } from "@/test/utils";

beforeEach(() => {
  tokenStore.clear();
  routerMock.replace.mockReset();
  navigationState.pathname = "/dashboard";
  navigationState.searchParams = new URLSearchParams();
});

describe("login", () => {
  it("validates fields before calling the API", async () => {
    const { calls } = mockApi({ "GET /api/auth/me": () => ({ status: 401, body: {} }), "POST /api/auth/refresh": () => ({ status: 401 }) });
    renderWithProviders(<LoginForm />, { user: null });
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(calls.filter((c) => c.path === "/api/auth/login")).toHaveLength(0);
  });

  it("signs in, keeps the token in memory, and redirects employees to My Day", async () => {
    const { calls } = mockApi({
      "POST /api/auth/login": () => ({
        body: { data: { accessToken: "tok", user: { id: "u9", name: "Pabasara", email: "p@x.test", role: "EMPLOYEE" } } },
      }),
    });
    renderWithProviders(<LoginForm />, { user: null });
    await userEvent.type(screen.getByLabelText("Email"), "p@x.test");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/my-day"));
    expect(calls.find((c) => c.path === "/api/auth/login")?.body).toEqual({ email: "p@x.test", password: "secret123" });
    expect(tokenStore.get()).toBe("tok");
    expect(window.localStorage.length).toBe(0);
  });

  it("redirects management roles to the dashboard and honours ?next=", async () => {
    navigationState.searchParams = new URLSearchParams("next=/projects/p1");
    mockApi({ "POST /api/auth/login": () => ({ body: { user: { id: "u1", name: "Sandika", email: "s@x.test", role: "CEO" } } }) });
    renderWithProviders(<LoginForm />, { user: null });
    await userEvent.type(screen.getByLabelText("Email"), "s@x.test");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/projects/p1"));
  });

  it("shows a clear message for wrong credentials", async () => {
    mockApi({ "POST /api/auth/login": () => ({ status: 401, body: { message: "Invalid credentials" } }) });
    renderWithProviders(<LoginForm />, { user: null });
    await userEvent.type(screen.getByLabelText("Email"), "p@x.test");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });
});

describe("route protection", () => {
  it("redirects to /login when the session can't be restored", async () => {
    navigationState.pathname = "/projects";
    mockApi({ "GET /api/auth/me": () => ({ status: 401, body: {} }), "POST /api/auth/refresh": () => ({ status: 401, body: {} }) });
    renderWithProviders(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>,
    );
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/login?next=%2Fprojects"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("restores the session via refresh and renders children", async () => {
    let refreshed = false;
    mockApi({
      "GET /api/auth/me": () => (refreshed ? { body: { id: "u1", name: "Kaveesha", email: "k@x.test", role: "PROJECT_MANAGER" } } : { status: 401, body: {} }),
      "POST /api/auth/refresh": () => {
        refreshed = true;
        return { body: { accessToken: "t2" } };
      },
    });
    renderWithProviders(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>,
    );
    expect(await screen.findByText("secret")).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("PermissionGuard hides UI without the permission and shows a 403 panel in page mode", () => {
    mockApi({});
    renderWithProviders(
      <>
        <PermissionGuard permission="users:manage">
          <button>Manage users</button>
        </PermissionGuard>
        <PermissionGuard permission="users:manage" page>
          <p>admin page</p>
        </PermissionGuard>
      </>,
      { user: userWithRole("EMPLOYEE") },
    );
    expect(screen.queryByRole("button", { name: "Manage users" })).not.toBeInTheDocument();
    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });
});
