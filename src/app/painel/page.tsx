import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Aventureiro";
  const role = user.user_metadata?.preferred_role === "player" ? "Jogador" : "Mestre";

  return <main className="shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">A</span> ARKANO</Link><div className="nav"><span>{displayName}</span><SignOutButton /></div></header>
    <div className="page-wrap">
      <div className="eyebrow">Painel de aventura</div><h1 className="page-title">Bem-vindo, {displayName}.</h1>
      <p className="muted">Sua jornada começa com uma boa organização.</p>
      <div className="dashboard-grid">
        <div className="stat"><strong>01</strong><span>Perfil · {role}</span></div>
        <div className="stat"><strong>—</strong><span>Campanhas vinculadas</span></div>
        <div className="stat"><strong>—</strong><span>Personagens</span></div>
      </div>
      <div className="panel">
        <h2>{role === "Mestre" ? "Área do mestre" : "Área do jogador"}</h2>
        {role === "Mestre" ? <>
          <p className="muted">A estrutura visual está pronta. A próxima etapa é conectar a criação de campanhas, os convites e o gerenciamento de jogadores ao banco.</p>
          <div className="actions"><Link className="button" href="/campanhas">Minhas campanhas</Link></div>
        </> : <>
          <p className="muted">Quando um mestre vincular você a uma campanha, suas campanhas e fichas aparecerão aqui.</p>
          <div className="actions"><Link className="button secondary" href="/ficha">Ver ficha de exemplo</Link></div>
        </>}
      </div>
      <div className="notice" style={{marginTop:18}}>Protótipo inicial: campanhas, fichas e permissões ainda precisam ser conectadas às tabelas do Supabase. Não use dados reais sensíveis nesta fase.</div>
    </div>
  </main>;
}
