import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DayMeetings } from "@/components/meetings/day-meetings";
import { MeetingDetails } from "@/components/meetings/meeting-details";
import { MyMeetingsView } from "@/components/meetings/my-meetings-view";
import { platformFromLink } from "@/components/meetings/platform-logo";
import { routerMock } from "@/test/setup";
import { mockApi, renderWithProviders, userWithRole } from "@/test/utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const meeting = {
  id: "m1",
  title: "Sprint planning",
  platform: "TEAMS",
  link: "https://teams.microsoft.com/l/meetup-join/abc",
  startAt: inHours(24),
  endAt: inHours(25),
  organizer: { id: "pm", name: "Pam Manager" },
  participants: [{ id: "dev", name: "Lakindu Perera" }],
};

const people = [
  { id: "pm", name: "Pam Manager", email: "pm@t.test", role: "PROJECT_MANAGER" },
  { id: "dev", name: "Lakindu Perera", email: "dev@t.test", role: "EMPLOYEE" },
  { id: "qa", name: "New QA", email: "qa@t.test", role: "EMPLOYEE" },
];

describe("meetings", () => {
  it("recognises the platform from a link", () => {
    expect(platformFromLink("https://us02web.zoom.us/j/123")).toBe("ZOOM");
    expect(platformFromLink("https://meet.google.com/abc-defg-hij")).toBe("GOOGLE_MEET");
    expect(platformFromLink("https://teams.microsoft.com/l/meetup-join/x")).toBe("TEAMS");
    expect(platformFromLink("https://whereby.com/team")).toBe("OTHER");
    expect(platformFromLink("not a link")).toBeNull();
  });

  it("lists meetings with their platform and a join link", async () => {
    mockApi({ "GET /api/meetings": () => ({ body: { data: [meeting], meta: { total: 1 } } }) });
    renderWithProviders(<MyMeetingsView />, { user: userWithRole("EMPLOYEE", { id: "dev" }) });
    expect(await screen.findByRole("link", { name: "Sprint planning" })).toHaveAttribute("href", "/meetings/m1");
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Microsoft Teams" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Join/ })).toHaveAttribute("href", meeting.link);
  });

  it("Join meeting opens the meeting link in a new tab, and says when there's no link yet", async () => {
    mockApi({ "GET /api/meetings": () => ({ body: { data: [meeting, { ...meeting, id: "m2", title: "Retro", link: null }], meta: { total: 2 } } }) });
    renderWithProviders(<MyMeetingsView />, { user: userWithRole("EMPLOYEE", { id: "dev" }) });
    const join = await screen.findByRole("link", { name: "Join Sprint planning on Microsoft Teams" });
    expect(join).toHaveAttribute("href", meeting.link);
    expect(join).toHaveAttribute("target", "_blank");
    expect(join).toHaveTextContent("Join meeting");
    expect(screen.getByRole("button", { name: /No link yet/ })).toBeDisabled();
  });

  it("creates a meeting: the pasted link picks the platform and people are invited", async () => {
    const { calls } = mockApi({
      "GET /api/meetings": () => ({ body: { data: [], meta: { total: 0 } } }),
      "GET /api/users": () => ({ body: { data: people, meta: { total: 3 } } }),
      "POST /api/meetings": (req) => ({ status: 201, body: { data: { ...meeting, ...(req.body as object), id: "m9" } } }),
    });
    renderWithProviders(<MyMeetingsView />, { user: userWithRole("PROJECT_MANAGER", { id: "pm" }) });

    await userEvent.click((await screen.findAllByRole("button", { name: /New meeting/ }))[0]!);
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/Title/), "Design review");
    await userEvent.type(within(dialog).getByLabelText("Meeting link"), "https://meet.google.com/abc-defg-hij");
    expect(within(dialog).getByRole("radio", { name: /Google Meet/ })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(within(dialog).getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: /New QA/ }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create meeting" }));

    await waitFor(() => expect(calls.find((c) => c.method === "POST")).toBeTruthy());
    const body = calls.find((c) => c.method === "POST")!.body as Record<string, unknown>;
    expect(body).toMatchObject({ title: "Design review", platform: "GOOGLE_MEET", link: "https://meet.google.com/abc-defg-hij", participantIds: ["qa"] });
    expect(new Date(body.endAt as string).getTime() - new Date(body.startAt as string).getTime()).toBe(30 * 60_000);
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/meetings/m9"));
  }, 20000);

  it("the organizer adds people after the meeting is created", async () => {
    const { calls } = mockApi({
      "GET /api/meetings/m1": () => ({ body: { data: meeting } }),
      "GET /api/users": () => ({ body: { data: people, meta: { total: 3 } } }),
      "POST /api/meetings/m1/participants": () => ({ body: { data: { ...meeting, participants: [...meeting.participants, { id: "qa", name: "New QA" }] } } }),
    });
    renderWithProviders(<MeetingDetails meetingId="m1" />, { user: userWithRole("PROJECT_MANAGER", { id: "pm" }) });

    expect(await screen.findByText("Organizer")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox"));
    // People already in the meeting aren't offered again.
    expect(screen.queryByRole("option", { name: /Lakindu Perera/ })).toBeNull();
    await userEvent.click(await screen.findByRole("option", { name: /New QA/ }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: /Add 1 participant/ }));
    await waitFor(() => expect(calls.find((c) => c.path === "/api/meetings/m1/participants")?.body).toEqual({ userIds: ["qa"] }));
  }, 20000);

  it("a participant can't manage the meeting but can leave", async () => {
    mockApi({ "GET /api/meetings/m1": () => ({ body: { data: meeting } }) });
    renderWithProviders(<MeetingDetails meetingId="m1" />, { user: userWithRole("EMPLOYEE", { id: "dev" }) });
    expect(await screen.findByRole("button", { name: "Leave meeting" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Add .*participant/ })).toBeNull();
  });

  it("shows the chosen day's meetings on My Day", async () => {
    const { calls } = mockApi({ "GET /api/meetings": () => ({ body: { data: [meeting], meta: { total: 1 } } }) });
    const day = new Date(2026, 9, 12, 9, 0);
    renderWithProviders(<DayMeetings date={day} />, { user: userWithRole("EMPLOYEE", { id: "dev" }) });
    expect(await screen.findByRole("link", { name: "Sprint planning" })).toBeInTheDocument();
    const req = calls.find((c) => c.path === "/api/meetings")!;
    expect(req.search.get("scope")).toBe("all");
    expect(new Date(req.search.get("from")!).getTime()).toBe(new Date(2026, 9, 12).getTime());
    expect(new Date(req.search.get("to")!).getTime()).toBe(new Date(2026, 9, 12, 23, 59, 59, 999).getTime());
  });

  it("says when the day has no meetings", async () => {
    mockApi({ "GET /api/meetings": () => ({ body: { data: [], meta: { total: 0 } } }) });
    renderWithProviders(<DayMeetings date={new Date()} />, { user: userWithRole("EMPLOYEE") });
    expect(await screen.findByText(/No meetings this day/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Schedule one" })).toHaveAttribute("href", "/meetings");
  });
});
