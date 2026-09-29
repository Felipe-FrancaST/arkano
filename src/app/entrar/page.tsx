import Link from "next/link";
import AuthForm from "@/components/auth-form";

export default function LoginPage() {
  return <main className="shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">A</span> ARKANO</Link><Link href="/" className="nav">Voltar ao início</Link></header>
    <div className="page-wrap">
      <div className="eyebrow">Bem-vindo de volta</div><h1 className="page-title">Entre na sua conta</h1>
      <p className="muted">Acesse suas campanhas e personagens.</p>
      <div className="panel" style={{maxWidth:560,marginTop:28}}><AuthForm mode="login" /></div>
      <p className="muted">Ainda não tem conta? <Link href="/cadastro" style={{color:"var(--gold)"}}>Cadastre-se</Link></p>
    </div>
  </main>;
}
