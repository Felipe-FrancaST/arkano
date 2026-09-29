import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getMaster() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: "Faça login para continuar." }, { status: 401 }) };
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("preferred_role").eq("id", user.id).maybeSingle();
  if (profileError || (profile?.preferred_role ?? user.user_metadata?.preferred_role) !== "master") {
    return { error: NextResponse.json({ error: "Somente mestres podem gerenciar jogadores." }, { status: 403 }) };
  }
  return { user, admin };
}

async function ownsCampaign(admin: ReturnType<typeof createAdminClient>, campaignId: string, masterId: string) {
  const { data, error } = await admin.from("campaigns").select("id")
    .eq("id", campaignId).eq("master_id", masterId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) break;
  }
  return null;
}

export async function POST(request: Request) {
  let newlyCreatedUserId: string | null = null;
  try {
    const auth = await getMaster();
    if ("error" in auth) return auth.error;
    const { user: master, admin } = auth;
    const body = await request.json();
    const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!campaignId || !await ownsCampaign(admin, campaignId, master.id)) {
      return NextResponse.json({ error: "Campanha não encontrada ou sem permissão." }, { status: 404 });
    }
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Informe um nome de usuário e um e-mail válido." }, { status: 400 });
    }

    let player = await findUserByEmail(admin, email);
    if (player) {
      const { data: existingProfile } = await admin.from("profiles")
        .select("preferred_role").eq("id", player.id).maybeSingle();
      const existingRole = existingProfile?.preferred_role ?? player.user_metadata?.preferred_role;
      if (existingRole === "master") {
        return NextResponse.json({ error: "Esse e-mail pertence a uma conta de mestre. Use uma conta de jogador." }, { status: 409 });
      }
    }
    if (!player) {
      if (password.length < 8) {
        return NextResponse.json({ error: "Para uma conta nova, a senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: name, preferred_role: "player" },
      });
      if (error) throw error;
      player = data.user;
      newlyCreatedUserId = player.id;
      // Ensure profile exists even if the project's auth trigger has not been installed.
      const { error: profileError } = await admin.from("profiles").upsert({
        id: player.id, display_name: name, preferred_role: "player",
      });
      if (profileError) throw profileError;
    }

    const { data: existing, error: existingError } = await admin.from("campaign_members")
      .select("id").eq("campaign_id", campaignId).eq("user_id", player.id).maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json({ error: "Esse jogador já está vinculado a esta campanha." }, { status: 409 });
    }
    const { error: memberError } = await admin.from("campaign_members").insert({
      campaign_id: campaignId, user_id: player.id, role: "player", access_enabled: true,
    });
    if (memberError) throw memberError;
    return NextResponse.json({ message: "Jogador vinculado à campanha com sucesso." }, { status: 201 });
  } catch (error) {
    if (newlyCreatedUserId) {
      try { await createAdminClient().auth.admin.deleteUser(newlyCreatedUserId); } catch { /* best-effort cleanup */ }
    }
    const message = error instanceof Error ? error.message : "Não foi possível cadastrar o jogador.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getMaster();
    if ("error" in auth) return auth.error;
    const { user: master, admin } = auth;
    const body = await request.json();
    const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (typeof body.accessEnabled === "boolean") {
      if (!campaignId || !userId || !await ownsCampaign(admin, campaignId, master.id)) {
        return NextResponse.json({ error: "Campanha não encontrada ou sem permissão." }, { status: 404 });
      }
      const { error: accessError } = await admin.from("campaign_members")
        .update({ access_enabled: body.accessEnabled })
        .eq("campaign_id", campaignId).eq("user_id", userId);
      if (accessError) throw accessError;
      return NextResponse.json({ message: body.accessEnabled ? "Acesso à campanha reativado." : "Acesso à campanha desativado." });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!campaignId || !userId || !await ownsCampaign(admin, campaignId, master.id)) {
      return NextResponse.json({ error: "Campanha não encontrada ou sem permissão." }, { status: 404 });
    }
    const { data: membership, error: memberError } = await admin.from("campaign_members")
      .select("id").eq("campaign_id", campaignId).eq("user_id", userId).maybeSingle();
    if (memberError) throw memberError;
    if (!membership) return NextResponse.json({ error: "Jogador não vinculado a esta campanha." }, { status: 404 });
    const { data: targetProfile } = await admin.from("profiles").select("preferred_role").eq("id", userId).maybeSingle();
    if (targetProfile?.preferred_role === "master") {
      return NextResponse.json({ error: "Uma conta de mestre não pode ser editada como jogador." }, { status: 409 });
    }
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Informe um nome de usuário e um e-mail válido." }, { status: 400 });
    }
    if (password && password.length < 8) {
      return NextResponse.json({ error: "A nova senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
    }
    const update: { email: string; password?: string; user_metadata: Record<string, string> } = {
      email, user_metadata: { display_name: name, preferred_role: "player" },
    };
    if (password) update.password = password;
    const { error: authError } = await admin.auth.admin.updateUserById(userId, update);
    if (authError) throw authError;
    const { error: profileError } = await admin.from("profiles")
      .update({ display_name: name, preferred_role: "player" }).eq("id", userId);
    if (profileError) throw profileError;
    return NextResponse.json({ message: "Dados do jogador atualizados." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível editar o jogador.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getMaster();
    if ("error" in auth) return auth.error;
    const { user: master, admin } = auth;
    const body = await request.json();
    const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!campaignId || !userId || !await ownsCampaign(admin, campaignId, master.id)) {
      return NextResponse.json({ error: "Campanha não encontrada ou sem permissão." }, { status: 404 });
    }
    const { error } = await admin.from("campaign_members")
      .delete().eq("campaign_id", campaignId).eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ message: "Jogador removido desta campanha. A conta dele continua existindo." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível remover o jogador.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
