import type { Metadata } from "next";
import { MyDayView } from "@/components/tasks/my-day-view";

export const metadata: Metadata = { title: "My Day" };

export default function Page() {
  return (
    <MyDayView />
  );
}
