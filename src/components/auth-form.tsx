"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"master" | "player">("master");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name, preferred_role: role } },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/painel");
          router.refresh();
        } else {
          setMessage("Conta criada! Confira seu e-mail para confirmar o cadastro antes de entrar.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/painel");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="form" onSubmit={handleSubmit}>
    {mode === "signup" && <>
      <label className="field">Nome de exibição<input value={name} onChange={e => setName(e.target.value)} placeholder="Como quer ser chamado?" required minLength={2} /></label>
      <label className="field">Tipo de conta<select value={role} onChange={e => setRole(e.target.value as "master" | "player")}><option value="master">Mestre</option><option value="player">Jogador</option></select></label>
    </>}
    <label className="field">E-mail<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" required /></label>
    <label className="field">Senha<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" required minLength={8} /></label>
    {message && <div className="notice" role="status">{message}</div>}
    <button className="button" type="submit" disabled={busy}>{busy ? "Aguarde..." : mode === "login" ? "Entrar na conta" : "Criar conta"}</button>
    <p className="muted" style={{fontSize:12,lineHeight:1.6}}>A seleção de tipo é uma preferência inicial. O acesso real a campanhas e permissões será validado no banco de dados.</p>
  </form>;
}
