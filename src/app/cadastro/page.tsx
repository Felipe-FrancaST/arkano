import Link from "next/link";
import AuthForm from "@/components/auth-form";

export default function SignupPage() {
  return <main className="shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">A</span> ARKANO</Link><Link href="/" className="nav">Voltar ao início</Link></header>
    <div className="page-wrap">
      <div className="eyebrow">Sua aventura começa agora</div><h1 className="page-title">Criar conta</h1>
      <p className="muted">Escolha como você participa das aventuras.</p>
      <div className="panel" style={{maxWidth:560,marginTop:28}}><AuthForm mode="signup" /></div>
      <p className="muted">Já tem uma conta? <Link href="/entrar" style={{color:"var(--gold)"}}>Entrar</Link></p>
    </div>
  </main>;
}
