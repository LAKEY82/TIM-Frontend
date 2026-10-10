import type { Metadata } from "next";
import { Suspense } from "react";
import { MyMeetingsView } from "@/components/meetings/my-meetings-view";

export const metadata: Metadata = { title: "My Meetings" };

export default function Page() {
  return (
    <Suspense>
      <MyMeetingsView />
    </Suspense>
  );
}
