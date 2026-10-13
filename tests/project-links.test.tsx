import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { linkKindFromUrl } from "@/components/projects/link-logo";
import { ProjectLinks } from "@/components/projects/project-links";
import { mockApi, renderWithProviders, userWithRole } from "@/test/utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const links = [
  { id: "l1", title: "Checkout flow", url: "https://www.figma.com/design/AbC/Checkout-flow", kind: "FIGMA", addedBy: { id: "dev", name: "Lakindu Perera" } },
  { id: "l2", title: "theiavora/tim-backend", url: "https://github.com/theiavora/tim-backend", kind: "GITHUB", addedBy: { id: "pm", name: "Pam" } },
  { id: "l3", title: "API docs", url: "https://docs.example.com/api", kind: "OTHER", addedBy: { id: "pm", name: "Pam" } },
];

describe("project links", () => {
  it("recognises Figma and GitHub links", () => {
    expect(linkKindFromUrl("https://www.figma.com/design/x")).toBe("FIGMA");
    expect(linkKindFromUrl("https://github.com/a/b")).toBe("GITHUB");
    expect(linkKindFromUrl("https://notion.so/page")).toBe("OTHER");
    expect(linkKindFromUrl("not a link")).toBeNull();
  });

  it("groups links into Design (Figma), Code (GitHub) and Other, with their logos", async () => {
    mockApi({ "GET /api/projects/p1/links": () => ({ body: { data: links } }) });
    renderWithProviders(<ProjectLinks projectId="p1" />, { user: userWithRole("EMPLOYEE", { id: "dev" }) });

    const design = await screen.findByRole("region", { name: "Design" });
    expect(within(design).getAllByRole("img", { name: "Figma" }).length).toBeGreaterThan(0);
    expect(within(design).getByRole("link", { name: "Checkout flow" })).toHaveAttribute("href", links[0]!.url);
    const code = screen.getByRole("region", { name: "Code" });
    expect(within(code).getAllByRole("img", { name: "GitHub" }).length).toBeGreaterThan(0);
    expect(within(code).getByText("github.com/theiavora/tim-backend")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Other links" })).toBeInTheDocument();

    // Only links you added (or a PM) can be removed.
    expect(screen.getByRole("button", { name: "Remove Checkout flow" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove API docs" })).toBeNull();
  });

  it("adds a link; the logo follows what's pasted", async () => {
    const { calls } = mockApi({
      "GET /api/projects/p1/links": () => ({ body: { data: [] } }),
      "POST /api/projects/p1/links": () => ({ status: 201, body: { data: links[1] } }),
    });
    renderWithProviders(<ProjectLinks projectId="p1" />, { user: userWithRole("EMPLOYEE", { id: "dev" }) });

    expect(await screen.findByText("No links yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "GitHub" })).toBeNull();
    await userEvent.type(screen.getByRole("textbox", { name: "Link" }), "https://github.com/theiavora/tim-backend");
    expect(screen.getByRole("img", { name: "GitHub" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Add link/ }));
    await waitFor(() => expect(calls.find((c) => c.method === "POST")?.body).toEqual({ url: "https://github.com/theiavora/tim-backend" }));
  });
});
