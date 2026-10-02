import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectsView } from "@/components/projects/projects-view";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <Suspense>
      <ProjectsView />
    </Suspense>
  );
}
