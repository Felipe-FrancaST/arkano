import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await supabase.from("profiles")
    .select("display_name, preferred_role").eq("id", user.id).maybeSingle();
  const displayName = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Aventureiro";
  const isMaster = (profile?.preferred_role ?? user.user_metadata?.preferred_role) === "master";
  const role = isMaster ? "Mestre" : "Jogador";
  const { count: campaignCount } = isMaster
    ? await supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("master_id", user.id)
    : await supabase.from("campaign_members").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("access_enabled", true);
  const { count: characterCount } = await supabase.from("characters")
    .select("id", { count: "exact", head: true }).eq("owner_id", user.id);

  return <main className="shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">A</span> ARKANO</Link><div className="nav"><span>{displayName}</span><SignOutButton /></div></header>
    <div className="page-wrap">
      <div className="eyebrow">Painel de aventura</div><h1 className="page-title">Bem-vindo, {displayName}.</h1>
      <p className="muted">{isMaster ? "Sua mesa, suas histórias. Prepare a próxima aventura." : "Sua próxima aventura começa com seu grupo."}</p>
      <div className="dashboard-grid">
        <div className="stat"><strong>{role}</strong><span>Tipo de perfil</span></div>
        <div className="stat"><strong>{campaignCount ?? 0}</strong><span>{isMaster ? "Campanhas criadas" : "Campanhas ativas"}</span></div>
        <div className="stat"><strong>{characterCount ?? 0}</strong><span>Personagens</span></div>
      </div>
      {isMaster ? <>
        <div className="section-heading"><div><div className="eyebrow">Ferramentas de mestre</div><h2>Prepare sua mesa</h2></div></div>
        <div className="feature-grid master-tools-grid">
          <article className="feature"><div className="feature-icon">♜</div><h3>Campanhas</h3><p>Crie aventuras, defina o sistema e mantenha a organização de cada grupo.</p><div className="actions"><Link className="button" href="/campanhas">Gerenciar campanhas</Link></div></article>
          <article className="feature"><div className="feature-icon">♙</div><h3>Jogadores</h3><p>Crie contas, vincule jogadores às campanhas, edite dados e controle acessos.</p><div className="actions"><Link className="button secondary" href="/campanhas">Gerenciar jogadores</Link></div></article>
          <article className="feature"><div className="feature-icon">✧</div><h3>Fichas</h3><p>Acesse a área de fichas e prepare os personagens para as próximas sessões.</p><div className="actions"><Link className="button secondary" href="/ficha">Abrir fichas</Link></div></article>
        </div>
      </> : <div className="panel"><h2>Área do jogador</h2><p className="muted">Quando um mestre vincular você a uma campanha, ela ficará disponível na sua conta enquanto seu acesso estiver ativo.</p><div className="actions"><Link className="button secondary" href="/ficha">Ver ficha</Link></div></div>}
    </div>
  </main>;
}
