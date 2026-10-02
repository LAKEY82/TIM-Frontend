import type { Metadata } from "next";
import { ClientDetailView } from "@/components/clients/clients-views";

export const metadata: Metadata = { title: "Client" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientDetailView clientId={id} />;
}
