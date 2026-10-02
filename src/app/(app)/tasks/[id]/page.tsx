import type { Metadata } from "next";
import { TaskDetails } from "@/components/tasks/task-details";

export const metadata: Metadata = { title: "Task" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TaskDetails taskId={id} />;
}
