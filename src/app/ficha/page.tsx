import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";
import CharacterSheetEditor from "./character-sheet-editor";

export default async function CharacterSheetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: profile }, { data: campaigns }, { data: characters }] = await Promise.all([
    supabase.from("profiles").select("display_name, preferred_role").eq("id", user.id).maybeSingle(),
    supabase.from("campaigns").select("id, name, system, master_id").order("created_at", { ascending: false }),
    supabase.from("characters").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
  ]);

  const displayName = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Aventureiro";
  const isMaster = (profile?.preferred_role ?? user.user_metadata?.preferred_role) === "master";
  const usableCampaigns = (campaigns ?? []).filter((campaign) => campaign.system?.toLowerCase().includes("d&d") || campaign.system?.toLowerCase().includes("dungeons"));

  return <main className="shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">A</span> ARKANO</Link><div className="nav"><span>{displayName}</span><Link href="/painel" className="nav">Painel</Link><SignOutButton /></div></header>
    <div className="page-wrap character-page-wrap">
      <div className="eyebrow">Sistema de ficha · Dungeons & Dragons 5e</div>
      <h1 className="page-title">Ficha de personagem</h1>
      <p className="muted character-intro">Atributos, modificadores e bônus de proficiência são calculados automaticamente. Edite sua ficha e salve as alterações.</p>
      <CharacterSheetEditor campaigns={usableCampaigns ?? []} initialCharacters={characters ?? []} userId={user.id} isMaster={isMaster} />
    </div>
  </main>;
}
