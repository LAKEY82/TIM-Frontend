import type { Metadata } from "next";
import { EmployeeProfile } from "@/components/teams/employee-profile";

export const metadata: Metadata = { title: "Profile" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeProfile userId={id} />;
}
