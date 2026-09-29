import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CampaignManager from "./campaign-manager";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await supabase.from("profiles").select("preferred_role").eq("id", user.id).maybeSingle();
  if ((profile?.preferred_role ?? user.user_metadata?.preferred_role) !== "master") redirect("/painel");
  return <CampaignManager />;
}
