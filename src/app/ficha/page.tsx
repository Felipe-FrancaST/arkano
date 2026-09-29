import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const stats = [
  ["Força", "10", "+0"], ["Destreza", "12", "+1"], ["Constituição", "14", "+2"],
  ["Inteligência", "13", "+1"], ["Sabedoria", "10", "+0"], ["Carisma", "15", "+2"],
];

export default async function CharacterSheetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return <main className="shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">A</span> ARKANO</Link><Link href="/painel" className="nav">← Painel</Link></header>
    <div className="page-wrap">
      <div className="sheet-head"><div><div className="eyebrow">Ficha de personagem · Demonstração</div><h1 className="page-title">Aventureiro sem nome</h1><p className="muted">Esta é uma ficha ilustrativa, ainda não salva no banco.</p></div><span className="button secondary">Nível 1</span></div>
      <div className="sheet-grid">
        <div className="sheet-stat"><strong>12</strong><span>Classe de Armadura</span></div>
        <div className="sheet-stat"><strong>10 / 10</strong><span>Pontos de Vida</span></div>
        <div className="sheet-stat"><strong>+1</strong><span>Iniciativa</span></div>
        <div className="sheet-stat"><strong>9 m</strong><span>Deslocamento</span></div>
        <div className="sheet-stat"><strong>+2</strong><span>Bônus de Proficiência</span></div>
        <div className="sheet-stat"><strong>1d8</strong><span>Dado de Vida</span></div>
      </div>
      <div className="two-col">
        <section className="panel"><h2>Atributos</h2><ul className="list">{stats.map(([name, value, mod]) => <li key={name} style={{display:"flex",justifyContent:"space-between"}}><span>{name}</span><strong style={{color:"var(--text)"}}>{value} <span style={{color:"var(--gold)"}}>({mod})</span></strong></li>)}</ul></section>
        <section className="panel"><h2>Informações</h2><ul className="list"><li>Classe: <strong style={{color:"var(--text)"}}>A definir</strong></li><li>Raça: <strong style={{color:"var(--text)"}}>A definir</strong></li><li>Antecedente: <strong style={{color:"var(--text)"}}>A definir</strong></li><li>Alinhamento: <strong style={{color:"var(--text)"}}>A definir</strong></li><li>Inspiração: <strong style={{color:"var(--text)"}}>Não</strong></li></ul></section>
        <section className="panel"><h2>Perícias</h2><p className="muted">Acrobacia, Arcanismo, Atletismo, Atuação, Enganação, Furtividade, História, Intimidação, Intuição, Investigação, Lidar com Animais, Medicina, Natureza, Percepção, Persuasão, Prestidigitação, Religião, Sobrevivência.</p></section>
        <section className="panel"><h2>Identidade</h2><p className="muted">Nome do personagem, classe, nível, raça, antecedente e alinhamento serão campos editáveis na ficha completa.</p></section>
      </div>
    </div>
  </main>;
}
