import Link from "next/link";

const features = [
  { icon: "✧", title: "Campanhas organizadas", text: "Cada aventura tem seu próprio espaço, jogadores e fichas. Mantenha suas crônicas separadas e fáceis de administrar." },
  { icon: "⚔", title: "Fichas de personagem", text: "Atributos, perícias, pontos de vida, classe, raça e os principais dados de D&D reunidos em uma ficha." },
  { icon: "♜", title: "Controle do mestre", text: "Uma área para gerenciar participantes e organizar o acesso de cada jogador às campanhas." },
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark">A</span> ARKANO</Link>
        <nav className="nav">
          <a href="#recursos" className="optional">Recursos</a>
          <Link href="/entrar">Entrar</Link>
          <Link className="button" href="/cadastro">Começar</Link>
        </nav>
      </header>
      <section className="hero">
        <div>
          <div className="eyebrow">Seu próximo capítulo começa aqui</div>
          <h1>Grandes histórias.<br /><span>Um só lugar.</span></h1>
          <p className="lead">Arkano é o espaço para mestres criarem campanhas, organizarem seus grupos e manterem as fichas dos aventureiros sempre à mão.</p>
          <div className="actions">
            <Link href="/cadastro" className="button">Criar minha conta <span>↗</span></Link>
            <Link href="/entrar" className="button secondary">Já tenho uma conta</Link>
          </div>
        </div>
        <div className="art-card">
          <div className="eyebrow">Arquivo de aventuras · Nº 001</div>
          <div className="rune">ᚨ</div>
          <div className="art-caption"><h2>O destino está em suas mãos.</h2><p>Campanhas, personagens e histórias compartilhadas.</p></div>
        </div>
      </section>
      <section className="features" id="recursos">
        <div className="section-heading">
          <div><div className="eyebrow">Feito para sua mesa</div><h2>Uma base para cada aventura</h2></div>
          <span className="muted">A fundação do seu mundo</span>
        </div>
        <div className="feature-grid">
          {features.map((feature) => <article className="feature" key={feature.title}><div className="feature-icon">{feature.icon}</div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}
        </div>
      </section>
      <footer className="footer">ARKANO · Organize suas campanhas. Dê vida às suas histórias.</footer>
    </main>
  );
}
