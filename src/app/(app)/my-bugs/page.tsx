import type { Metadata } from "next";
import { MyBugsView } from "@/components/tasks/my-bugs-view";

export const metadata: Metadata = { title: "My bugs" };

export default function Page() {
  return <MyBugsView />;
}
