import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SignOutButton from "@/components/sign-out-button";
import CharacterSheetEditor from "./character-sheet-editor";

function isDndSystem(system: string | null | undefined) {
  const value = (system ?? "").toLowerCase();
  return value.includes("d&d") || value.includes("dungeons") || value.includes("dnd");
}

export default async function CharacterSheetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Use the server-only admin client for these reads so RLS policies do not
  // accidentally hide a campaign from a player who has a valid membership.
  const admin = createAdminClient();
  const [{ data: profile }, { data: ownCharacters }] = await Promise.all([
    admin.from("profiles").select("display_name, preferred_role").eq("id", user.id).maybeSingle(),
    admin.from("characters").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
  ]);

  const displayName = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Aventureiro";
  const isMaster = (profile?.preferred_role ?? user.user_metadata?.preferred_role) === "master";

  let campaigns: { id: string; name: string; system: string; master_id: string }[] = [];

  if (isMaster) {
    const { data, error } = await admin.from("campaigns")
      .select("id, name, system, master_id")
      .eq("master_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) campaigns = (data ?? []).filter((campaign) => isDndSystem(campaign.system));
  } else {
    const { data: memberships, error: membershipsError } = await admin.from("campaign_members")
      .select("campaign_id")
      .eq("user_id", user.id)
      .eq("access_enabled", true);

    if (!membershipsError && memberships?.length) {
      const campaignIds = [...new Set(memberships.map((membership) => membership.campaign_id))];
      const { data } = await admin.from("campaigns")
        .select("id, name, system, master_id")
        .in("id", campaignIds)
        .order("created_at", { ascending: false });
      campaigns = (data ?? []).filter((campaign) => isDndSystem(campaign.system));
    }
  }

  let characters = ownCharacters ?? [];

  // Provision a blank sheet for each active D&D campaign the player belongs to.
  // This makes the sheet appear immediately after the master links the player.
  if (!isMaster && campaigns.length) {
    const campaignIdsWithCharacters = new Set(characters.map((character) => character.campaign_id));
    const missingCampaigns = campaigns.filter((campaign) => !campaignIdsWithCharacters.has(campaign.id));

    for (const campaign of missingCampaigns) {
      const blankCharacter = {
        campaign_id: campaign.id,
        owner_id: user.id,
        name: "",
        level: 1,
        character_class: "",
        race: "",
        background: "",
        alignment: "",
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        proficiency_bonus: 2,
        max_hp: 10,
        current_hp: 10,
        armor_class: 10,
        initiative: 0,
        speed: 30,
        inspiration: false,
        hit_dice: "1d8",
        skills: [],
        saving_throws: [],
        notes: "",
        experience_points: 0,
        temp_hp: 0,
        player_name: displayName,
        personality_traits: "",
        ideals: "",
        bonds: "",
        flaws: "",
        attacks: [],
        equipment: "",
        features: "",
        death_save_successes: 0,
        death_save_failures: 0,
      };
      const { data: createdCharacter, error } = await admin.from("characters")
        .insert(blankCharacter)
        .select("*")
        .single();
      if (!error && createdCharacter) characters = [createdCharacter, ...characters];
    }
  }

  return <main className="shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">A</span> ARKANO</Link><div className="nav"><span>{displayName}</span><Link href="/painel" className="nav">Painel</Link><SignOutButton /></div></header>
    <div className="page-wrap character-page-wrap">
      <div className="eyebrow">Sistema de ficha · Dungeons & Dragons 5e</div>
      <h1 className="page-title">Ficha de personagem</h1>
      <p className="muted character-intro">Atributos, modificadores e bônus de proficiência são calculados automaticamente. Edite sua ficha e salve as alterações.</p>
      <CharacterSheetEditor campaigns={campaigns} initialCharacters={characters} userId={user.id} isMaster={isMaster} />
    </div>
  </main>;
}
