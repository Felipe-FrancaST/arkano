"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Player = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  accessEnabled: boolean;
  joinedAt: string;
};
type Campaign = {
  id: string;
  name: string;
  description: string;
  system: string;
  created_at: string;
  players: Player[];
};
type PlayerDraft = { name: string; email: string; password: string };

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [campaignSystem, setCampaignSystem] = useState("D&D 5e");
  const [playerCampaignId, setPlayerCampaignId] = useState("");
  const [playerDraft, setPlayerDraft] = useState<PlayerDraft>({ name: "", email: "", password: "" });
  const [editing, setEditing] = useState<{ campaignId: string; userId: string } | null>(null);
  const [editDraft, setEditDraft] = useState<PlayerDraft>({ name: "", email: "", password: "" });

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/master/campaigns", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar as campanhas.");
      setCampaigns(data.campaigns ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar as campanhas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCampaigns(); }, [loadCampaigns]);

  async function send(url: string, method: string, body: unknown) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
    return data;
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      await send("/api/master/campaigns", "POST", {
        name: campaignName, description: campaignDescription, system: campaignSystem,
      });
      setCampaignName(""); setCampaignDescription(""); setCampaignSystem("D&D 5e");
      setMessage("Campanha criada com sucesso."); await loadCampaigns();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao criar campanha."); }
    finally { setBusy(false); }
  }

  async function createPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!playerCampaignId) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const data = await send("/api/master/players", "POST", { campaignId: playerCampaignId, ...playerDraft });
      setPlayerDraft({ name: "", email: "", password: "" });
      setMessage(data.message || "Jogador vinculado à campanha."); await loadCampaigns();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao cadastrar jogador."); }
    finally { setBusy(false); }
  }

  function beginEdit(campaignId: string, player: Player) {
    setEditing({ campaignId, userId: player.userId });
    setEditDraft({ name: player.name, email: player.email, password: "" });
    setMessage(""); setError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const data = await send("/api/master/players", "PATCH", { ...editing, ...editDraft });
      setMessage(data.message || "Dados atualizados."); setEditing(null); await loadCampaigns();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao editar jogador."); }
    finally { setBusy(false); }
  }

  async function toggleAccess(campaignId: string, player: Player) {
    setBusy(true); setMessage(""); setError("");
    try {
      const data = await send("/api/master/players", "PATCH", {
        campaignId, userId: player.userId, accessEnabled: !player.accessEnabled,
      });
      setMessage(data.message); await loadCampaigns();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao alterar acesso."); }
    finally { setBusy(false); }
  }

  async function removePlayer(campaignId: string, player: Player) {
    if (!window.confirm(`Remover ${player.name} desta campanha? A conta continuará existindo.`)) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const data = await send("/api/master/players", "DELETE", { campaignId, userId: player.userId });
      setMessage(data.message); await loadCampaigns();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao remover jogador."); }
    finally { setBusy(false); }
  }

  return <main className="shell">
    <header className="topbar">
      <Link href="/" className="brand"><span className="brand-mark">A</span> ARKANO</Link>
      <nav className="nav"><Link href="/painel">← Painel do mestre</Link></nav>
    </header>
    <div className="page-wrap">
      <div className="eyebrow">Central de comando</div>
      <h1 className="page-title">Suas campanhas</h1>
      <p className="muted">Crie aventuras, organize seu grupo e controle o acesso de cada jogador.</p>

      {message && <div className="notice status-message" role="status">{message}</div>}
      {error && <div className="notice error-message" role="alert">{error}</div>}

      <section className="panel campaign-create-panel">
        <div className="section-heading"><div><div className="eyebrow">Nova aventura</div><h2>Criar campanha</h2></div><span className="section-symbol">✦</span></div>
        <form className="form campaign-form" onSubmit={createCampaign}>
          <label className="field">Nome da campanha<input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ex.: As Cinzas de Valdoria" minLength={2} maxLength={100} required /></label>
          <label className="field">Sistema de RPG<select value={campaignSystem} onChange={e => setCampaignSystem(e.target.value)}><option>D&D 5e</option><option>Ordem Paranormal</option><option>Tormenta 20</option><option>Pokémon RPG</option><option>Outro sistema</option></select></label>
          <label className="field full-field">Descrição (opcional)<textarea value={campaignDescription} onChange={e => setCampaignDescription(e.target.value)} placeholder="Resumo da aventura, cenário e objetivos do grupo..." rows={3} /></label>
          <div><button className="button" type="submit" disabled={busy}>{busy ? "Salvando..." : "+ Criar campanha"}</button></div>
        </form>
      </section>

      <section className="campaign-list-section">
        <div className="section-heading"><div><div className="eyebrow">Seu universo</div><h2>Campanhas criadas <span className="count-badge">{campaigns.length}</span></h2></div></div>
        {loading ? <div className="panel muted">Carregando campanhas...</div> : campaigns.length === 0 ? <div className="panel empty-state"><div className="empty-icon">✧</div><h3>Sua próxima aventura começa aqui</h3><p className="muted">Crie uma campanha acima. Depois, cadastre os jogadores e eles serão vinculados automaticamente ao grupo.</p></div> : <div className="campaign-stack">
          {campaigns.map(campaign => <article className="campaign-card" key={campaign.id}>
            <div className="campaign-card-head"><div><div className="campaign-system">{campaign.system}</div><h3>{campaign.name}</h3><p className="muted">{campaign.description || "Nenhuma descrição adicionada."}</p></div><div className="member-count"><strong>{campaign.players.length}</strong><span>jogadores</span></div></div>
            <div className="campaign-divider" />
            <div className="players-heading"><h4>Jogadores vinculados</h4><button className="button secondary small-button" type="button" onClick={() => setPlayerCampaignId(playerCampaignId === campaign.id ? "" : campaign.id)}>{playerCampaignId === campaign.id ? "Fechar cadastro" : "+ Adicionar jogador"}</button></div>
            {playerCampaignId === campaign.id && <form className="player-create-form" onSubmit={createPlayer}>
              <div className="form-intro"><strong>Novo jogador</strong><span>Se o e-mail já possuir uma conta Arkano, ela será vinculada sem alterar a senha.</span></div>
              <label className="field">Nome de usuário<input value={playerDraft.name} onChange={e => setPlayerDraft({ ...playerDraft, name: e.target.value })} placeholder="Nome que aparecerá no jogo" minLength={2} required /></label>
              <label className="field">E-mail<input type="email" value={playerDraft.email} onChange={e => setPlayerDraft({ ...playerDraft, email: e.target.value })} placeholder="jogador@exemplo.com" required /></label>
              <label className="field">Senha inicial <span className="optional-label">Obrigatória apenas para conta nova</span><input type="password" value={playerDraft.password} onChange={e => setPlayerDraft({ ...playerDraft, password: e.target.value })} placeholder="Mínimo de 8 caracteres" minLength={8} autoComplete="new-password" /></label>
              <button className="button" type="submit" disabled={busy}>{busy ? "Salvando..." : "Criar / vincular jogador"}</button>
            </form>}
            {campaign.players.length === 0 ? <p className="muted no-players">Ainda não há jogadores nesta campanha.</p> : <div className="player-list">{campaign.players.map(player => <div className="player-row" key={player.userId}>
              <div className="player-avatar">{player.name.slice(0, 1).toUpperCase()}</div>
              <div className="player-details"><strong>{player.name}</strong><span>{player.email}</span><span className={player.accessEnabled ? "access-state active" : "access-state inactive"}>{player.accessEnabled ? "Acesso ativo" : "Acesso desativado"}</span></div>
              <div className="player-actions"><button className="text-action" type="button" disabled={busy} onClick={() => beginEdit(campaign.id, player)}>Editar</button><button className="text-action" type="button" disabled={busy} onClick={() => void toggleAccess(campaign.id, player)}>{player.accessEnabled ? "Desativar" : "Reativar"}</button><button className="text-action danger-action" type="button" disabled={busy} onClick={() => void removePlayer(campaign.id, player)}>Remover</button></div>
              {editing?.campaignId === campaign.id && editing.userId === player.userId && <form className="player-edit-form" onSubmit={saveEdit}>
                <div className="form-intro"><strong>Editar conta de {player.name}</strong><span>Deixe a senha em branco para mantê-la como está. O e-mail e nome serão atualizados na conta.</span></div>
                <label className="field">Nome de usuário<input value={editDraft.name} onChange={e => setEditDraft({ ...editDraft, name: e.target.value })} minLength={2} required /></label>
                <label className="field">E-mail<input type="email" value={editDraft.email} onChange={e => setEditDraft({ ...editDraft, email: e.target.value })} required /></label>
                <label className="field">Nova senha (opcional)<input type="password" value={editDraft.password} onChange={e => setEditDraft({ ...editDraft, password: e.target.value })} minLength={8} placeholder="Deixe em branco para não alterar" autoComplete="new-password" /></label>
                <div className="inline-actions"><button className="button small-button" type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar alterações"}</button><button className="button secondary small-button" type="button" onClick={() => setEditing(null)}>Cancelar</button></div>
              </form>}
            </div>)}</div>}
          </article>)}
        </div>}
      </section>
      <div className="notice security-note"><strong>Controle de acesso:</strong> desativar impede o jogador de acessar os dados da campanha. Remover tira o vínculo com esta campanha, mas não apaga a conta dele nem seus vínculos com outros grupos.</div>
    </div>
  </main>;
}
