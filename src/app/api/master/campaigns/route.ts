import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getMaster() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: "Faça login para continuar." }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles").select("preferred_role").eq("id", user.id).maybeSingle();
  const role = profile?.preferred_role ?? user.user_metadata?.preferred_role;
  if (profileError || role !== "master") {
    return { error: NextResponse.json({ error: "Somente mestres podem gerenciar campanhas." }, { status: 403 }) };
  }
  return { user, admin };
}

export async function GET() {
  try {
    const auth = await getMaster();
    if ("error" in auth) return auth.error;
    const { user, admin } = auth;
    const { data: campaigns, error } = await admin.from("campaigns")
      .select("id, name, description, system, created_at")
      .eq("master_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;

    const result = await Promise.all((campaigns ?? []).map(async (campaign) => {
      const { data: memberships, error: membersError } = await admin.from("campaign_members")
        .select("id, user_id, access_enabled, joined_at")
        .eq("campaign_id", campaign.id).order("joined_at", { ascending: true });
      if (membersError) throw membersError;
      const players = await Promise.all((memberships ?? []).map(async (membership) => {
        const [{ data: profile }, { data: authData }] = await Promise.all([
          admin.from("profiles").select("display_name").eq("id", membership.user_id).maybeSingle(),
          admin.auth.admin.getUserById(membership.user_id),
        ]);
        return {
          membershipId: membership.id,
          userId: membership.user_id,
          name: profile?.display_name ?? "Jogador",
          email: authData.user?.email ?? "",
          accessEnabled: membership.access_enabled,
          joinedAt: membership.joined_at,
        };
      }));
      return { ...campaign, players };
    }));
    return NextResponse.json({ campaigns: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar as campanhas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getMaster();
    if ("error" in auth) return auth.error;
    const { user, admin } = auth;
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const system = typeof body.system === "string" ? body.system.trim() : "D&D 5e";
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "O nome da campanha deve ter entre 2 e 100 caracteres." }, { status: 400 });
    }
    const { data, error } = await admin.from("campaigns")
      .insert({ master_id: user.id, name, description, system: system || "D&D 5e" })
      .select("id, name, description, system, created_at").single();
    if (error) throw error;
    return NextResponse.json({ campaign: { ...data, players: [] } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar a campanha.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
