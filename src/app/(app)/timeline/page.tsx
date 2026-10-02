import type { Metadata } from "next";
import { GlobalTimeline } from "@/components/schedule/global-schedule";

export const metadata: Metadata = { title: "Timeline" };

export default function Page() {
  return (
    <GlobalTimeline />
  );
}
