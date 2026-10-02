import type { Metadata } from "next";
import { NotificationSettings } from "@/components/settings/personal-settings";

export const metadata: Metadata = { title: "Notification settings" };

export default function Page() {
  return (
    <NotificationSettings />
  );
}
