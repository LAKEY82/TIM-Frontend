/**
 * Local mock of the Theiavora Express API, for checking the UI without the
 * real backend. DEVELOPMENT ONLY: it runs as a separate process
 * (`npm run mock-api`) and is never imported by the app, so no mock data ships.
 *
 * State is in memory and resets on restart. Names come from the seed-data list
 * in the frontend brief; all figures are placeholders.
 *
 *   PORT=4000 (default)  FRONTEND_ORIGIN=http://localhost:3000 (default)
 */
import http from "node:http";

const PORT = Number(process.env.PORT ?? 4000);
const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const ago = (hours) => new Date(Date.now() - hours * 36e5).toISOString();

const departments = ["Development", "UI/UX Design", "Marketing", "QA", "Management", "Administration"].map((name, i) => ({
  id: `d${i + 1}`,
  name,
}));

const people = [
  ["Sandika", "CEO", "d5"],
  ["Kaveesha", "MANAGING_DIRECTOR", "d5"],
  ["Lakindu", "PROJECT_MANAGER", "d1"],
  ["Deelaka", "DEPARTMENT_HEAD", "d1"],
  ["Kulakshi", "DEPARTMENT_HEAD", "d2"],
  ["Pabasara", "EMPLOYEE", "d1"],
  ["Chathu", "EMPLOYEE", "d1"],
  ["Sachika", "EMPLOYEE", "d2"],
  ["Upendri", "EMPLOYEE", "d3"],
  ["Divyangima", "EMPLOYEE", "d4"],
  ["Nadeesha", "EMPLOYEE", "d3"],
  ["Lakshitha", "ADMIN", "d6"],
].map(([name, role, departmentId], i) => ({
  id: `u${i + 1}`,
  name,
  email: `${name.toLowerCase()}@example.test`,
  role,
  status: "ACTIVE",
  departmentId,
  department: departments.find((d) => d.id === departmentId),
}));
const person = (id) => people.find((p) => p.id === id);
const brief = (p) => (p ? { id: p.id, name: p.name, role: p.role } : null);
/** "me" in preview mode = an employee, so My Day has content. */
const ME = "u6";

const clients = ["Desha Travels", "Lift", "KOC", "Aylin", "Maths Hub", "Planet Team Services"].map((name, i) => ({
  id: `c${i + 1}`,
  name,
  contactName: null,
  email: null,
  industry: null,
}));

const projectDefs = [
  ["Desha Travels Web", "c1", "ACTIVE"],
  ["Lift Web Site", "c2", "ACTIVE"],
  ["KOC Ecommerce", "c3", "AT_RISK"],
  ["Aylin Clothing Store", "c4", "PLANNING"],
  ["Maths Hub Web", "c5", "ACTIVE"],
  ["Maths Hub LMS", "c5", "ACTIVE"],
  ["POS System", null, "ACTIVE"],
  ["LMS System", null, "ON_HOLD"],
  ["Korean Exam Training Mobile App", null, "PLANNING"],
  ["Payroll", null, "AT_RISK"],
  ["Planet Team Services Web", "c6", "COMPLETED"],
  ["Wedding Invitation Template Web", null, "ACTIVE"],
  ["Theiavora Web", null, "ACTIVE"],
  ["Theiavora Social Media Handling", null, "ACTIVE"],
];
const projects = projectDefs.map(([name, clientId, status], i) => ({
  id: `p${i + 1}`,
  name,
  description: null,
  client: clients.find((c) => c.id === clientId) ?? null,
  type: clientId ? "EXTERNAL" : "INTERNAL",
  status,
  priority: ["MEDIUM", "HIGH", "URGENT", "LOW"][i % 4],
  manager: brief(person("u3")),
  members: [3, 5, 6, 7, 8].map((n) => brief(person(`u${((n + i) % 10) + 1}`))),
  startDate: day(-45 + i * 2),
  deadline: day(-4 + i * 7),
  estimatedHours: 120 + i * 10,
}));
const projectRef = (p) => ({ id: p.id, name: p.name });

const milestones = projects.flatMap((p, i) => [
  { id: `m${i + 1}a`, projectId: p.id, projectName: p.name, name: "Design & planning", status: "COMPLETED", startDate: day(-40 + i), dueDate: day(-20 + i), progress: 100 },
  { id: `m${i + 1}b`, projectId: p.id, projectName: p.name, name: "Build", status: "IN_PROGRESS", startDate: day(-19 + i), dueDate: day(10 + i), progress: 45 },
]);

const taskTitles = [
  "Checkout API", "Cart UI", "Coupon rules", "Receipt printing", "Landing page", "Quiz engine", "Payslip PDF", "SEO audit",
  "Booking flow", "Login screen", "QA regression", "Campaign brief", "Invitation templates", "Social media calendar",
  "Product catalogue", "Lesson player", "Exam timer", "Tax calculation",
];
const cycle = ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "IN_PROGRESS", "COMPLETED"];
const tasks = taskTitles.map((title, i) => {
  const p = projects[i % projects.length];
  return {
    id: `t${i + 1}`,
    title,
    description: `Work item for ${p.name}.`,
    status: cycle[i % cycle.length],
    priority: ["LOW", "MEDIUM", "HIGH", "URGENT"][(i + 1) % 4],
    type: ["FEATURE", "BUG", "DESIGN", "CONTENT", "TEST"][i % 5],
    project: projectRef(p),
    milestone: { id: milestones[(i % projects.length) * 2 + 1].id, name: "Build" },
    assignee: brief(person(`u${6 + (i % 5)}`)),
    reviewer: brief(person("u3")),
    departmentId: `d${(i % 4) + 1}`,
    startDate: day(i - 8),
    dueDate: day(i - 4),
    estimatedHours: 2 + (i % 6),
    actualHours: i % 4,
    tags: [],
    subtasks: [],
    attachments: [],
    createdAt: ago(200 + i),
  };
});
// Give the preview employee ("me") work due today so My Day isn't empty.
for (const i of [1, 6, 13]) Object.assign(tasks[i], { assignee: brief(person(ME)), dueDate: day(0), startDate: day(-2) });

const reviews = {};
const comments = { t1: [{ id: "cm1", taskId: "t1", body: "Totals look off for discounted carts, @Lakindu can you check?", author: brief(person("u6")), createdAt: ago(3) }] };
const notifications = [
  { id: "n1", type: "REVIEW_REQUESTED", title: "Pabasara submitted Checkout API for review", read: false, entityType: "TASK", entityId: "t1", createdAt: ago(1) },
  { id: "n2", type: "TASK_ASSIGNED", title: "Lakindu assigned Cart UI to you", read: false, entityType: "TASK", entityId: "t2", createdAt: ago(5) },
  { id: "n3", type: "DEADLINE_APPROACHING", title: "KOC Ecommerce is due in 4 days", read: true, entityType: "PROJECT", entityId: "p3", createdAt: ago(26) },
];
const activity = [
  { id: "a1", actor: brief(person("u3")), action: "assigned", entityType: "TASK", entityId: "t1", entityName: "Checkout API", target: { type: "USER", id: "u6", name: "Pabasara" }, createdAt: ago(1) },
  { id: "a2", actor: brief(person("u6")), action: "submitted for review", entityType: "TASK", entityId: "t1", entityName: "Checkout API", createdAt: ago(2) },
  { id: "a3", actor: brief(person("u3")), action: "requested changes on", entityType: "TASK", entityId: "t5", entityName: "Landing page", createdAt: ago(20) },
];
const dailyTasks = [];
let seq = 1000;
const nextId = (prefix) => `${prefix}${++seq}`;

// ---------------------------------------------------------------------------
// Derived views (computed from the in-memory state)
// ---------------------------------------------------------------------------

const DONE = new Set(["COMPLETED", "APPROVED"]);
const today = () => day(0);
const isOverdue = (t) => t.dueDate && t.dueDate < today() && !DONE.has(t.status);

function projectView(p) {
  const own = tasks.filter((t) => t.project.id === p.id);
  const done = own.filter((t) => DONE.has(t.status)).length;
  return { ...p, taskCount: own.length, completedTaskCount: done, progress: own.length ? Math.round((done / own.length) * 100) : p.status === "COMPLETED" ? 100 : 0 };
}
function taskView(t) {
  return { ...t, commentCount: (comments[t.id] ?? []).length, subtaskCount: t.subtasks.length };
}
function countBy(list, key) {
  const out = {};
  for (const item of list) out[item[key]] = (out[item[key]] ?? 0) + 1;
  return Object.entries(out).map(([k, count]) => ({ key: k, count }));
}
function workloadFor(users) {
  return users.map((u) => {
    const own = tasks.filter((t) => t.assignee?.id === u.id);
    return {
      userId: u.id,
      name: u.name,
      departmentName: u.department?.name,
      assigned: own.filter((t) => !DONE.has(t.status)).length,
      estimatedHours: own.filter((t) => !DONE.has(t.status)).reduce((s, t) => s + (t.estimatedHours ?? 0), 0),
      completed: own.filter((t) => DONE.has(t.status)).length,
      inReview: own.filter((t) => t.status === "IN_REVIEW").length,
      blocked: own.filter((t) => t.status === "BLOCKED").length,
      overdue: own.filter(isOverdue).length,
    };
  });
}
const weeks = (n) => Array.from({ length: n }, (_, i) => ({ date: day(-7 * (n - 1 - i)), created: 6 + ((i * 3) % 7), completed: 4 + ((i * 5) % 6) }));

function companyAnalytics() {
  const pv = projects.map(projectView);
  return {
    summary: {
      activeProjects: pv.filter((p) => p.status === "ACTIVE").length,
      completedProjects: pv.filter((p) => p.status === "COMPLETED").length,
      atRiskProjects: pv.filter((p) => p.status === "AT_RISK").length,
      overdueTasks: tasks.filter(isOverdue).length,
      completedTasks: tasks.filter((t) => DONE.has(t.status)).length,
      inReviewTasks: tasks.filter((t) => t.status === "IN_REVIEW").length,
      blockedTasks: tasks.filter((t) => t.status === "BLOCKED").length,
      openTasks: tasks.filter((t) => !DONE.has(t.status)).length,
    },
    projectStatus: countBy(pv, "status"),
    taskStatus: countBy(tasks, "status"),
    departmentWorkload: departments.map((d) => {
      const own = tasks.filter((t) => t.departmentId === d.id);
      return { departmentId: d.id, departmentName: d.name, assigned: own.filter((t) => !DONE.has(t.status)).length, completed: own.filter((t) => DONE.has(t.status)).length, overdue: own.filter(isOverdue).length };
    }),
    weeklyActivity: weeks(8),
    projectProgress: pv.map((p) => ({ projectId: p.id, name: p.name, progress: p.progress, status: p.status })),
    upcomingDeadlines: tasks
      .filter((t) => !DONE.has(t.status))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 8)
      .map((t) => ({ id: t.id, kind: "TASK", title: t.title, dueDate: t.dueDate, projectId: t.project.id, projectName: t.project.name, assignee: t.assignee })),
    projectsRequiringAttention: pv
      .filter((p) => p.status === "AT_RISK")
      .map((p) => ({ project: p, reasons: [`${tasks.filter((t) => t.project.id === p.id && isOverdue(t)).length} overdue tasks`, `Due ${p.deadline}`] })),
    recentActivity: activity.slice(0, 10),
    reviewCycle: weeks(6).map((w, i) => ({ date: w.date, averageHours: 8 + i * 2, reviews: 3 + i })),
  };
}

// ---------------------------------------------------------------------------
// Routing helpers
// ---------------------------------------------------------------------------

function paginate(list, q) {
  const pageSize = Number(q.get("pageSize") ?? 20);
  const page = Number(q.get("page") ?? 1);
  return { data: list.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total: list.length, totalPages: Math.max(1, Math.ceil(list.length / pageSize)) } };
}
function sortList(list, q) {
  const by = q.get("sortBy");
  if (!by) return list;
  const dir = q.get("sortOrder") === "desc" ? -1 : 1;
  const rank = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };
  return [...list].sort((a, b) => {
    const av = by === "priority" ? rank[a.priority] : a[by] ?? "";
    const bv = by === "priority" ? rank[b.priority] : b[by] ?? "";
    return av > bv ? dir : av < bv ? -dir : 0;
  });
}
const resolveMe = (v) => (v === "me" ? ME : v);

function filterTasks(q) {
  let list = tasks.map(taskView);
  const statuses = q.getAll("status");
  const search = q.get("search")?.toLowerCase();
  if (q.get("projectId")) list = list.filter((t) => t.project.id === q.get("projectId"));
  if (q.get("assigneeId")) list = list.filter((t) => t.assignee?.id === resolveMe(q.get("assigneeId")));
  if (q.get("reviewerId")) list = list.filter((t) => t.reviewer?.id === resolveMe(q.get("reviewerId")) || q.get("reviewerId") === "me");
  if (q.get("departmentId")) list = list.filter((t) => t.departmentId === q.get("departmentId"));
  if (statuses.length) list = list.filter((t) => statuses.includes(t.status));
  if (q.get("priority")) list = list.filter((t) => t.priority === q.get("priority"));
  if (q.get("overdue") === "true") list = list.filter(isOverdue);
  if (q.get("dueFrom")) list = list.filter((t) => t.dueDate >= q.get("dueFrom"));
  if (q.get("dueTo")) list = list.filter((t) => t.dueDate <= q.get("dueTo"));
  if (search) list = list.filter((t) => t.title.toLowerCase().includes(search));
  return sortList(list, q);
}

function setStatus(task, status, actorId, feedback) {
  task.status = status;
  const actor = brief(person(actorId));
  const decision = status === "IN_REVIEW" ? "SUBMITTED" : status === "APPROVED" ? "APPROVED" : status === "CHANGES_REQUESTED" ? "CHANGES_REQUESTED" : null;
  if (decision) (reviews[task.id] ??= []).push({ id: nextId("r"), decision, feedback: feedback ?? null, actor, createdAt: new Date().toISOString() });
  activity.unshift({ id: nextId("a"), actor, action: `moved to ${status.toLowerCase().replace(/_/g, " ")}`, entityType: "TASK", entityId: task.id, entityName: task.title, createdAt: new Date().toISOString() });
  return taskView(task);
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const need = (value, what = "Resource") => {
  if (!value) throw new HttpError(404, `${what} not found`);
  return value;
};

// [method, pattern, handler(params, query, body)]
const routes = [
  ["GET", "/api/auth/me", () => ({ ...person(ME) })],
  ["POST", "/api/auth/refresh", () => ({ ok: true })],
  ["POST", "/api/auth/logout", () => null],

  ["GET", "/api/analytics/company", () => companyAnalytics()],
  ["GET", "/api/analytics/workload", (_p, q) => workloadFor(people.filter((u) => !q.get("departmentId") || u.departmentId === q.get("departmentId")).filter((u) => u.role === "EMPLOYEE" || u.role === "DEPARTMENT_HEAD"))],
  ["GET", "/api/analytics/tasks", () => ({ taskStatus: countBy(tasks, "status"), byPriority: countBy(tasks, "priority"), byType: countBy(tasks, "type"), completion: weeks(8), overdueTrend: weeks(8).map((w, i) => ({ date: w.date, count: 2 + (i % 4) })), blockedTrend: weeks(8).map((w, i) => ({ date: w.date, count: 1 + (i % 3) })), reviewCycle: weeks(6).map((w, i) => ({ date: w.date, averageHours: 8 + i, reviews: 4 })) })],
  ["GET", "/api/analytics/projects/:id", ({ id }) => {
    const own = tasks.filter((t) => t.project.id === id);
    const p = projectView(need(projects.find((x) => x.id === id), "Project"));
    const members = [...new Set(own.map((t) => t.assignee?.id).filter(Boolean))].map(person);
    return {
      progress: p.progress, totalTasks: own.length, completedTasks: p.completedTaskCount, overdueTasks: own.filter(isOverdue).length,
      blockedTasks: own.filter((t) => t.status === "BLOCKED").length, inReviewTasks: own.filter((t) => t.status === "IN_REVIEW").length,
      milestones: { total: 2, completed: 1 }, taskStatus: countBy(own, "status"),
      hoursByMember: members.map((m) => ({ userId: m.id, name: m.name, estimatedHours: own.filter((t) => t.assignee?.id === m.id).reduce((s, t) => s + t.estimatedHours, 0), actualHours: own.filter((t) => t.assignee?.id === m.id).reduce((s, t) => s + t.actualHours, 0) })),
      estimatedHours: own.reduce((s, t) => s + t.estimatedHours, 0), actualHours: own.reduce((s, t) => s + t.actualHours, 0),
      workload: workloadFor(members), activity: weeks(6),
    };
  }],
  ["GET", "/api/analytics/departments/:id", ({ id }) => {
    const d = need(departments.find((x) => x.id === id), "Department");
    const own = tasks.filter((t) => t.departmentId === id);
    const metrics = { activeTasks: own.filter((t) => !DONE.has(t.status)).length, completed: own.filter((t) => DONE.has(t.status)).length, blocked: own.filter((t) => t.status === "BLOCKED").length, inReview: own.filter((t) => t.status === "IN_REVIEW").length };
    if (d.name === "Development" || d.name === "QA") metrics.bugs = own.filter((t) => t.type === "BUG").length;
    return { departmentName: d.name, metrics, taskStatus: countBy(own, "status"), workload: workloadFor(people.filter((u) => u.departmentId === id)), activity: weeks(6), breakdowns: d.name === "QA" ? { severity: { HIGH: 2, MEDIUM: 3, LOW: 1 } } : {} };
  }],

  ["GET", "/api/notifications/unread-count", () => ({ count: notifications.filter((n) => !n.read).length })],
  ["GET", "/api/notifications", (_p, q) => paginate(notifications.filter((n) => q.get("unreadOnly") !== "true" || !n.read), q)],
  ["PATCH", "/api/notifications/read-all", () => notifications.forEach((n) => (n.read = true)) ?? null],
  ["PATCH", "/api/notifications/:id/read", ({ id }) => {
    need(notifications.find((n) => n.id === id)).read = true;
    return null;
  }],

  ["GET", "/api/projects", (_p, q) => {
    let list = projects.map(projectView);
    const search = q.get("search")?.toLowerCase();
    if (q.get("status")) list = list.filter((p) => p.status === q.get("status"));
    if (q.get("clientId")) list = list.filter((p) => p.client?.id === q.get("clientId"));
    if (q.get("memberId")) list = list.filter((p) => p.members.some((m) => m.id === q.get("memberId")));
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search));
    return paginate(sortList(list, q), q);
  }],
  ["POST", "/api/projects", (_p, _q, b) => {
    const p = { id: nextId("p"), members: (b.memberIds ?? []).map((id) => brief(person(id))), manager: brief(person(b.managerId)), client: clients.find((c) => c.id === b.clientId) ?? null, ...b };
    projects.push(p);
    return projectView(p);
  }],
  ["GET", "/api/projects/:id", ({ id }) => projectView(need(projects.find((p) => p.id === id), "Project"))],
  ["PATCH", "/api/projects/:id", ({ id }, _q, b) => {
    const p = need(projects.find((x) => x.id === id), "Project");
    Object.assign(p, b, b.managerId !== undefined ? { manager: brief(person(b.managerId)) } : {});
    return projectView(p);
  }],
  ["GET", "/api/projects/:id/members", ({ id }) => need(projects.find((p) => p.id === id), "Project").members],
  ["POST", "/api/projects/:id/members", ({ id }, _q, b) => {
    need(projects.find((p) => p.id === id), "Project").members.push(brief(person(b.userId)));
    return null;
  }],
  ["DELETE", "/api/projects/:id/members/:userId", ({ id, userId }) => {
    const p = need(projects.find((x) => x.id === id), "Project");
    p.members = p.members.filter((m) => m.id !== userId);
    return null;
  }],
  ["GET", "/api/projects/:id/files", () => []],

  ["GET", "/api/milestones", (_p, q) => milestones.filter((m) => (!q.get("projectId") || m.projectId === q.get("projectId")) && (!q.get("from") || m.dueDate >= q.get("from")) && (!q.get("to") || m.dueDate <= q.get("to"))).map((m) => ({ ...m, taskCount: tasks.filter((t) => t.milestone?.id === m.id).length }))],
  ["POST", "/api/milestones", (_p, _q, b) => {
    const m = { id: nextId("m"), status: "PENDING", progress: 0, projectName: projects.find((p) => p.id === b.projectId)?.name, ...b };
    milestones.push(m);
    return m;
  }],
  ["PATCH", "/api/milestones/:id", ({ id }, _q, b) => Object.assign(need(milestones.find((m) => m.id === id), "Milestone"), b)],

  ["GET", "/api/tasks/my-day", () => {
    const mine = tasks.filter((t) => t.assignee?.id === ME).map(taskView);
    return {
      today: mine.filter((t) => t.dueDate === today() || (!DONE.has(t.status) && t.status !== "IN_REVIEW" && t.status !== "BLOCKED" && t.startDate <= today() && t.dueDate >= today())),
      overdue: mine.filter(isOverdue),
      upcoming: mine.filter((t) => t.dueDate > today() && !DONE.has(t.status)),
      inReview: mine.filter((t) => t.status === "IN_REVIEW"),
      blocked: mine.filter((t) => t.status === "BLOCKED"),
    };
  }],
  ["GET", "/api/tasks", (_p, q) => paginate(filterTasks(q), q)],
  ["POST", "/api/tasks", (_p, _q, b) => {
    if (tasks.some((t) => t.title.toLowerCase() === String(b.title).toLowerCase())) {
      throw Object.assign(new HttpError(422, "Validation failed"), { errors: [{ path: "title", message: "A task with this title already exists." }] });
    }
    const p = need(projects.find((x) => x.id === b.projectId), "Project");
    const t = { id: nextId("t"), status: "TODO", project: projectRef(p), milestone: null, assignee: brief(person(b.assigneeId)), reviewer: brief(person(b.reviewerId)), subtasks: [], attachments: [], actualHours: 0, createdAt: new Date().toISOString(), ...b, tags: b.tags ?? [] };
    tasks.push(t);
    if (b.parentId) need(tasks.find((x) => x.id === b.parentId)).subtasks.push({ id: t.id, title: t.title, status: t.status, assignee: t.assignee });
    return taskView(t);
  }],
  ["GET", "/api/tasks/:id", ({ id }) => taskView(need(tasks.find((t) => t.id === id), "Task"))],
  ["PATCH", "/api/tasks/:id", ({ id }, _q, b) => {
    const t = need(tasks.find((x) => x.id === id), "Task");
    Object.assign(t, b);
    if (b.assigneeId !== undefined) t.assignee = brief(person(b.assigneeId));
    if (b.reviewerId !== undefined) t.reviewer = brief(person(b.reviewerId));
    return taskView(t);
  }],
  ["PATCH", "/api/tasks/:id/status", ({ id }, _q, b) => setStatus(need(tasks.find((t) => t.id === id), "Task"), b.status, ME)],
  ["POST", "/api/tasks/:id/submit", ({ id }) => setStatus(need(tasks.find((t) => t.id === id), "Task"), "IN_REVIEW", ME)],
  ["POST", "/api/tasks/:id/approve", ({ id }) => setStatus(need(tasks.find((t) => t.id === id), "Task"), "APPROVED", "u3")],
  ["POST", "/api/tasks/:id/request-changes", ({ id }, _q, b) => setStatus(need(tasks.find((t) => t.id === id), "Task"), "CHANGES_REQUESTED", "u3", b.feedback)],
  ["GET", "/api/tasks/:id/reviews", ({ id }) => reviews[id] ?? []],
  ["GET", "/api/tasks/:id/comments", ({ id }) => comments[id] ?? []],
  ["POST", "/api/tasks/:id/comments", ({ id }, _q, b) => {
    const c = { id: nextId("cm"), taskId: id, body: b.body, author: brief(person(ME)), createdAt: new Date().toISOString() };
    (comments[id] ??= []).push(c);
    return c;
  }],
  ["PATCH", "/api/tasks/:id/comments/:cid", ({ id, cid }, _q, b) => Object.assign(need((comments[id] ?? []).find((c) => c.id === cid), "Comment"), { body: b.body, updatedAt: new Date().toISOString() })],
  ["DELETE", "/api/tasks/:id/comments/:cid", ({ id, cid }) => {
    comments[id] = (comments[id] ?? []).filter((c) => c.id !== cid);
    return null;
  }],

  ["GET", "/api/users", (_p, q) => {
    let list = people;
    const search = q.get("search")?.toLowerCase();
    if (search) list = list.filter((u) => u.name.toLowerCase().includes(search) || u.email.includes(search));
    if (q.get("role")) list = list.filter((u) => u.role === q.get("role"));
    if (q.get("departmentId")) list = list.filter((u) => u.departmentId === q.get("departmentId"));
    if (q.get("status")) list = list.filter((u) => u.status === q.get("status"));
    return paginate(list, q);
  }],
  ["POST", "/api/users", (_p, _q, b) => {
    const u = { id: nextId("u"), status: "ACTIVE", ...b, department: departments.find((d) => d.id === b.departmentId) };
    people.push(u);
    return u;
  }],
  ["GET", "/api/users/:id", ({ id }) => need(person(id), "User")],
  ["PATCH", "/api/users/:id", ({ id }, _q, b) => {
    const u = need(person(id), "User");
    Object.assign(u, b);
    if (b.departmentId !== undefined) u.department = departments.find((d) => d.id === b.departmentId) ?? null;
    return u;
  }],
  ["GET", "/api/users/:id/workload", ({ id }) => workloadFor([need(person(id), "User")])[0]],

  ["GET", "/api/departments", () => departments.map((d) => ({ ...d, head: brief(people.find((u) => u.departmentId === d.id && u.role === "DEPARTMENT_HEAD")), memberCount: people.filter((u) => u.departmentId === d.id).length, activeTaskCount: tasks.filter((t) => t.departmentId === d.id && !DONE.has(t.status)).length, projectCount: 2 }))],
  ["GET", "/api/departments/:id", ({ id }) => ({ ...need(departments.find((d) => d.id === id), "Department"), head: brief(people.find((u) => u.departmentId === id && u.role === "DEPARTMENT_HEAD")), members: people.filter((u) => u.departmentId === id) })],
  ["POST", "/api/departments", (_p, _q, b) => {
    const d = { id: nextId("d"), ...b };
    departments.push(d);
    return d;
  }],
  ["PATCH", "/api/departments/:id", ({ id }, _q, b) => Object.assign(need(departments.find((d) => d.id === id), "Department"), b)],
  ["DELETE", "/api/departments/:id", () => {
    throw new HttpError(409, "Departments with members can't be deleted.");
  }],

  ["GET", "/api/activity", (_p, q) => activity.filter((a) => !q.get("entityId") || a.entityId === q.get("entityId")).slice(0, Number(q.get("limit") ?? 20))],

  ["GET", "/api/clients", (_p, q) => paginate(clients.map((c) => ({ ...c, projectCount: projects.filter((p) => p.client?.id === c.id).length, activeProjectCount: projects.filter((p) => p.client?.id === c.id && p.status === "ACTIVE").length })), q)],
  ["GET", "/api/clients/:id", ({ id }) => ({ ...need(clients.find((c) => c.id === id), "Client"), projects: projects.filter((p) => p.client?.id === id).map(projectView), retainers: [] })],
  ["POST", "/api/clients", (_p, _q, b) => {
    const c = { id: nextId("c"), ...b };
    clients.push(c);
    return c;
  }],
  ["PATCH", "/api/clients/:id", ({ id }, _q, b) => Object.assign(need(clients.find((c) => c.id === id), "Client"), b)],

  ["GET", "/api/search", (_p, q) => {
    const s = (q.get("q") ?? "").toLowerCase();
    const hit = (v) => v.toLowerCase().includes(s);
    return {
      projects: projects.filter((p) => hit(p.name)).slice(0, 5).map((p) => ({ id: p.id, name: p.name, status: p.status, clientName: p.client?.name })),
      tasks: tasks.filter((t) => hit(t.title)).slice(0, 5).map((t) => ({ id: t.id, title: t.title, status: t.status, projectName: t.project.name })),
      people: people.filter((u) => hit(u.name)).slice(0, 5).map((u) => ({ id: u.id, name: u.name, role: u.role, departmentName: u.department?.name })),
      clients: clients.filter((c) => hit(c.name)).slice(0, 5),
    };
  }],

  ["GET", "/api/daily-tasks", (_p, q) => dailyTasks.filter((d) => d.date === q.get("date"))],
  ["GET", "/api/daily-tasks/workload", (_p, q) => {
    const planned = dailyTasks.filter((d) => d.date === q.get("date"));
    return [...new Set(planned.map((d) => d.assignee.id))].map((uid) => {
      const mine = planned.filter((d) => d.assignee.id === uid);
      return { userId: uid, name: person(uid)?.name, assigned: mine.length, estimatedHours: mine.reduce((s, d) => s + (d.estimatedHours ?? 0), 0), completed: mine.filter((d) => DONE.has(d.task.status)).length, inReview: mine.filter((d) => d.task.status === "IN_REVIEW").length, blocked: mine.filter((d) => d.task.status === "BLOCKED").length, overdue: 0 };
    });
  }],
  ["POST", "/api/daily-tasks", (_p, _q, b) => {
    const d = { id: nextId("dt"), date: b.date, task: taskView(need(tasks.find((t) => t.id === b.taskId), "Task")), assignee: brief(need(person(b.assigneeId), "User")), priority: b.priority, estimatedHours: b.estimatedHours, dueTime: b.dueTime, note: b.note };
    dailyTasks.push(d);
    return d;
  }],
  ["DELETE", "/api/daily-tasks/:id", ({ id }) => {
    dailyTasks.splice(dailyTasks.findIndex((d) => d.id === id), 1);
    return null;
  }],

  ["GET", "/api/settings/company", () => ({ name: "Theiavora", timezone: "Asia/Colombo", workingHoursPerDay: 8, weekStartsOn: 1 })],
  ["PATCH", "/api/settings/company", (_p, _q, b) => b],
  ["GET", "/api/settings/notifications", () => ({ email: {}, inApp: {} })],
  ["PUT", "/api/settings/notifications", (_p, _q, b) => b],
];

const compiled = routes.map(([method, pattern, handler]) => {
  const keys = [];
  const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, (_m, k) => (keys.push(k), "([^/]+)"))}$`);
  return { method, regex, keys, handler };
});

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.writeHead(204).end();

    const url = new URL(req.url ?? "/", "http://localhost");
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let body = {};
    if (raw && String(req.headers["content-type"]).includes("json")) body = JSON.parse(raw);

    const send = (status, payload) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(payload === undefined ? "" : JSON.stringify(payload));
    };

    for (const route of compiled) {
      if (route.method !== req.method) continue;
      const match = route.regex.exec(url.pathname);
      if (!match) continue;
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
      try {
        const result = route.handler(params, url.searchParams, body);
        if (result === null) return send(204);
        if (result && result.data !== undefined && result.meta) return send(200, { success: true, ...result });
        return send(200, { success: true, data: result });
      } catch (error) {
        const status = error instanceof HttpError ? error.status : 500;
        return send(status, { message: error.message, errors: error.errors });
      }
    }
    // Unmocked endpoints (e.g. file uploads) answer 501 so the UI shows its error state.
    send(501, { message: `Mock API: ${req.method} ${url.pathname} is not mocked.` });
  })
  .listen(PORT, () => console.log(`Mock API listening on http://localhost:${PORT} (CORS origin ${ORIGIN})`));
