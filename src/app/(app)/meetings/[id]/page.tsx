import type { Metadata } from "next";
import { MeetingDetails } from "@/components/meetings/meeting-details";

export const metadata: Metadata = { title: "Meeting" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingDetails meetingId={id} />;
}
