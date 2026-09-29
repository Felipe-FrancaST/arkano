import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return <main className="shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">A</span> ARKANO</Link><Link href="/painel" className="nav">← Painel</Link></header>
    <div className="page-wrap">
      <div className="eyebrow">Central do mestre</div><h1 className="page-title">Minhas campanhas</h1>
      <p className="muted">Cada campanha terá seus próprios jogadores e personagens.</p>
      <div className="panel" style={{marginTop:26}}>
        <h2>Nenhuma campanha conectada ainda</h2>
        <p className="muted">A tela está preparada para a próxima etapa de desenvolvimento. O próximo passo é implementar a criação, edição e exclusão de campanhas usando as tabelas do Supabase e políticas de segurança RLS.</p>
        <Link className="button secondary" href="/painel">Voltar ao painel</Link>
      </div>
    </div>
  </main>;
}
