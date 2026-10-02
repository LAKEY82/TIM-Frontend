import type { Metadata } from "next";
import { Suspense } from "react";
import { MyTasksView } from "@/components/tasks/my-tasks-view";

export const metadata: Metadata = { title: "Tasks" };

export default function Page() {
  return (
    <Suspense>
      <MyTasksView />
    </Suspense>
  );
}
