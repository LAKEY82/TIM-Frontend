import type { Metadata } from "next";
import { GlobalCalendar } from "@/components/schedule/global-schedule";

export const metadata: Metadata = { title: "Calendar" };

export default function Page() {
  return (
    <GlobalCalendar />
  );
}
