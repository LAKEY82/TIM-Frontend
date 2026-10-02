import type { Metadata } from "next";
import { ProfileSettings } from "@/components/settings/personal-settings";

export const metadata: Metadata = { title: "Profile settings" };

export default function Page() {
  return (
    <ProfileSettings />
  );
}
