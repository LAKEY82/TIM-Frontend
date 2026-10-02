import type { Metadata } from "next";
import { DepartmentView } from "@/components/teams/teams-views";

export const metadata: Metadata = { title: "Department" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DepartmentView departmentId={id} />;
}
