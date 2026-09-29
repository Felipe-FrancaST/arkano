"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Campaign = { id: string; name: string; system: string; master_id: string };
type Character = {
  id: string; campaign_id: string; owner_id: string; name: string; level: number; character_class: string; race: string; background: string; alignment: string;
  strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number; proficiency_bonus: number;
  max_hp: number; current_hp: number; armor_class: number; initiative: number; speed: number; inspiration: boolean; hit_dice: string; skills: string[]; saving_throws: string[]; notes: string;
  experience_points?: number; temp_hp?: number; player_name?: string; personality_traits?: string; ideals?: string; bonds?: string; flaws?: string; attacks?: Attack[]; equipment?: string; features?: string; death_save_successes?: number; death_save_failures?: number;
};
type Attack = { name: string; bonus: string; damage: string; type: string };

const ATTRIBUTES = [
  { key: "strength", label: "Força", short: "FOR" }, { key: "dexterity", label: "Destreza", short: "DES" },
  { key: "constitution", label: "Constituição", short: "CON" }, { key: "intelligence", label: "Inteligência", short: "INT" },
  { key: "wisdom", label: "Sabedoria", short: "SAB" }, { key: "charisma", label: "Carisma", short: "CAR" },
] as const;
const SKILLS = [
  ["Acrobacia", "dexterity"], ["Arcanismo", "intelligence"], ["Atletismo", "strength"], ["Atuação", "charisma"], ["Enganação", "charisma"],
  ["Furtividade", "dexterity"], ["História", "intelligence"], ["Intimidação", "charisma"], ["Intuição", "wisdom"], ["Investigação", "intelligence"],
  ["Lidar com Animais", "wisdom"], ["Medicina", "wisdom"], ["Natureza", "intelligence"], ["Percepção", "wisdom"], ["Persuasão", "charisma"],
  ["Prestidigitação", "dexterity"], ["Religião", "intelligence"], ["Sobrevivência", "wisdom"],
] as const;
const SAVES = ATTRIBUTES.map((attribute) => attribute.key);
const modifier = (score: number) => Math.floor((Number(score || 0) - 10) / 2);
const signed = (n: number) => n >= 0 ? `+${n}` : `${n}`;
const proficiencyForLevel = (level: number) => Math.ceil(Math.max(1, Math.min(20, level)) / 4) + 1;
const newCharacter = (campaignId: string, userId: string): Character => ({
  id: "", campaign_id: campaignId, owner_id: userId, name: "", level: 1, character_class: "", race: "", background: "", alignment: "",
  strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, proficiency_bonus: 2,
  max_hp: 10, current_hp: 10, armor_class: 10, initiative: 0, speed: 30, inspiration: false, hit_dice: "1d8", skills: [], saving_throws: [], notes: "",
  experience_points: 0, temp_hp: 0, player_name: "", personality_traits: "", ideals: "", bonds: "", flaws: "", attacks: [], equipment: "", features: "", death_save_successes: 0, death_save_failures: 0,
});

export default function CharacterSheetEditor({ campaigns, initialCharacters, userId, isMaster }: { campaigns: Campaign[]; initialCharacters: Character[]; userId: string; isMaster: boolean }) {
  const [characters, setCharacters] = useState<Character[]>(initialCharacters.map((c) => ({ ...c, skills: Array.isArray(c.skills) ? c.skills : [], saving_throws: Array.isArray(c.saving_throws) ? c.saving_throws : [], attacks: Array.isArray(c.attacks) ? c.attacks : [] })));
  const [selectedId, setSelectedId] = useState(initialCharacters[0]?.id ?? "");
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [draft, setDraft] = useState<Character | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = useMemo(() => createClient(), []);
  const selected = characters.find((character) => character.id === selectedId) ?? null;
  const active = draft ?? selected;
  const prof = active ? proficiencyForLevel(active.level) : 2;

  function startNew() {
    if (!campaignId) { setError("Você precisa estar vinculado a uma campanha de D&D 5e antes de criar uma ficha."); return; }
    setError(""); setMessage(""); setSelectedId(""); setDraft(newCharacter(campaignId, userId));
  }
  function update<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((current) => ({ ...(current ?? selected ?? newCharacter(campaignId, userId)), [key]: value, proficiency_bonus: key === "level" ? proficiencyForLevel(Number(value)) : (current ?? selected)?.proficiency_bonus ?? 2 }));
    setMessage(""); setError("");
  }
  function toggleArray(key: "skills" | "saving_throws", value: string) {
    const current = active?.[key] ?? [];
    update(key, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) as Character[typeof key]);
  }
  async function save() {
    if (!active) return;
    if (!active.name.trim()) { setError("Dê um nome ao personagem antes de salvar."); return; }
    if (!active.campaign_id) { setError("Selecione uma campanha para esta ficha."); return; }
    setBusy(true); setError(""); setMessage("");
    const { id: characterId, ...characterFields } = active;
    const payload = { ...characterFields, proficiency_bonus: proficiencyForLevel(active.level), updated_at: new Date().toISOString() };
    const { data, error: saveError } = characterId
      ? await supabase.from("characters").update(payload).eq("id", characterId).select("*").single()
      : await supabase.from("characters").insert(payload).select("*").single();
    setBusy(false);
    if (saveError) { setError(`Não foi possível salvar a ficha: ${saveError.message}`); return; }
    const saved = { ...data, skills: Array.isArray(data.skills) ? data.skills : [], saving_throws: Array.isArray(data.saving_throws) ? data.saving_throws : [], attacks: Array.isArray(data.attacks) ? data.attacks : [] } as Character;
    setCharacters((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    setSelectedId(saved.id); setDraft(null); setMessage("Ficha salva com sucesso.");
  }
  function cancelEdit() { setDraft(null); if (!selectedId) setSelectedId(characters[0]?.id ?? ""); setError(""); setMessage(""); }
  function updateAttack(index: number, key: keyof Attack, value: string) {
    const attacks = [...(active?.attacks ?? [])]; attacks[index] = { name: "", bonus: "", damage: "", type: "", ...attacks[index], [key]: value }; update("attacks", attacks);
  }

  if (!campaigns.length) return <section className="panel empty-state"><div className="empty-icon">♜</div><h2>Nenhuma campanha de D&amp;D disponível</h2><p className="muted">Para criar sua ficha, primeiro entre em uma campanha de D&amp;D 5e. {isMaster ? "Crie uma campanha com o sistema D&D 5e na área de campanhas." : "Peça ao Mestre para vincular sua conta a uma campanha de D&D 5e."}</p>{isMaster && <a className="button" href="/campanhas">Gerenciar campanhas</a>}</section>;

  return <div className="dnd-sheet-editor">
    <div className="sheet-toolbar panel">
      <div className="sheet-toolbar-title"><span className="sheet-emblem">✦</span><div><strong>Livro do Aventureiro</strong><span>Ficha de D&amp;D 5ª edição</span></div></div>
      <div className="sheet-toolbar-actions">
        <label className="field compact-field"><span>Campanha</span><select value={campaignId} onChange={(event) => { const nextId = event.target.value; setCampaignId(nextId); if (draft && !draft.id) setDraft({ ...draft, campaign_id: nextId }); }}>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>
        <button className="button secondary" type="button" onClick={startNew}>＋ Nova ficha</button>
      </div>
    </div>
    {message && <div className="notice status-message" role="status">{message}</div>}{error && <div className="notice error-message" role="alert">{error}</div>}
    {characters.length > 0 && <div className="character-picker">{characters.map((character) => <button type="button" key={character.id} className={`character-tab ${selectedId === character.id && !draft ? "active" : ""}`} onClick={() => { setSelectedId(character.id); setDraft(null); setError(""); setMessage(""); }}><span>{character.name || "Sem nome"}</span><small>Nível {character.level} · {character.character_class || "Classe a definir"}</small></button>)}</div>}
    {!active ? <section className="panel empty-state"><div className="empty-icon">✧</div><h2>Sua aventura começa aqui</h2><p className="muted">Crie uma ficha para registrar os atributos, a classe, os pontos de vida e os detalhes do seu personagem.</p><button className="button" onClick={startNew}>Criar minha ficha</button></section> : <>
      <section className="dnd-identity panel">
        <div className="dnd-title-mark"><span>ARKANO · D&amp;D 5e</span><strong>FICHA DE PERSONAGEM</strong></div>
        <div className="identity-grid">
          <Field label="Nome do personagem" value={active.name} onChange={(v) => update("name", v)} placeholder="Nome do herói" />
          <Field label="Nome do jogador" value={active.player_name ?? ""} onChange={(v) => update("player_name", v)} placeholder="Seu nome" />
          <Field label="Classe e nível" value={active.character_class} onChange={(v) => update("character_class", v)} placeholder="Guerreiro, Mago..." />
          <Field label="Antecedente" value={active.background} onChange={(v) => update("background", v)} placeholder="Soldado, sábio..." />
          <Field label="Raça" value={active.race} onChange={(v) => update("race", v)} placeholder="Humano, elfo..." />
          <Field label="Alinhamento" value={active.alignment} onChange={(v) => update("alignment", v)} placeholder="Neutro e bom..." />
          <NumberField label="Nível" value={active.level} min={1} max={20} onChange={(v) => update("level", Math.max(1, Math.min(20, v)))} />
          <NumberField label="Pontos de experiência" value={active.experience_points ?? 0} min={0} onChange={(v) => update("experience_points", v)} />
        </div>
      </section>

      <div className="dnd-main-grid">
        <section className="dnd-column dnd-attributes-column">
          <div className="dnd-section-heading"><span>01</span><h2>Atributos</h2></div>
          <div className="ability-stack">{ATTRIBUTES.map((attribute) => {
            const score = Number(active[attribute.key] ?? 10); const saveBonus = modifier(score) + (active.saving_throws.includes(attribute.key) ? prof : 0);
            return <article className="ability-card" key={attribute.key}>
              <div className="ability-name">{attribute.label}<small>{attribute.short}</small></div>
              <label className="ability-score"><span>Valor</span><input aria-label={`${attribute.label}: valor`} type="number" min={1} max={30} value={score} onChange={(e) => update(attribute.key, Math.max(1, Math.min(30, Number(e.target.value) || 1)))} /></label>
              <div className="ability-modifier"><span>Modificador</span><strong>{signed(modifier(score))}</strong></div>
              <label className="proficiency-check"><input type="checkbox" checked={active.saving_throws.includes(attribute.key)} onChange={() => toggleArray("saving_throws", attribute.key)} /><span>Salvaguarda {signed(saveBonus)}</span></label>
            </article>;
          })}</div>
          <section className="dnd-card"><h3>Perícias</h3><p className="muted tiny">Marque as perícias em que possui proficiência.</p><div className="skill-list">{SKILLS.map(([skill, key]) => { const bonus = modifier(Number(active[key as keyof Character] ?? 10)) + (active.skills.includes(skill) ? prof : 0); return <label className="skill-row" key={skill}><input type="checkbox" checked={active.skills.includes(skill)} onChange={() => toggleArray("skills", skill)} /><span>{skill}<small>{ATTRIBUTES.find((a) => a.key === key)?.short}</small></span><strong>{signed(bonus)}</strong></label>; })}</div></section>
        </section>

        <section className="dnd-column dnd-combat-column">
          <div className="dnd-section-heading"><span>02</span><h2>Combate</h2></div>
          <div className="combat-stat-grid">
            <NumberField label="Classe de armadura" value={active.armor_class} min={0} onChange={(v) => update("armor_class", v)} />
            <div className="combat-stat proficiency-stat"><span>Bônus de proficiência</span><strong>{signed(prof)}</strong><small>Automático pelo nível</small></div>
            <NumberField label="Iniciativa" value={active.initiative} min={-10} onChange={(v) => update("initiative", v)} />
            <NumberField label="Deslocamento (pés)" value={active.speed} min={0} onChange={(v) => update("speed", v)} />
            <NumberField label="PV máximos" value={active.max_hp} min={0} onChange={(v) => update("max_hp", v)} />
            <NumberField label="PV atuais" value={active.current_hp} min={0} onChange={(v) => update("current_hp", v)} />
            <NumberField label="PV temporários" value={active.temp_hp ?? 0} min={0} onChange={(v) => update("temp_hp", v)} />
            <Field label="Dado de vida" value={active.hit_dice} onChange={(v) => update("hit_dice", v)} placeholder="1d8" />
          </div>
          <label className="inspiration-toggle"><input type="checkbox" checked={active.inspiration} onChange={(e) => update("inspiration", e.target.checked)} /><span><strong>Inspiração</strong><small>Marque quando estiver com inspiração disponível.</small></span></label>
          <section className="dnd-card death-saves-card"><h3>Testes contra a morte</h3><div className="death-save-columns"><div><strong>Sucessos</strong><div>{[1,2,3].map((n) => <label key={`success-${n}`}><input type="checkbox" checked={(active.death_save_successes ?? 0) >= n} onChange={() => update("death_save_successes", (active.death_save_successes ?? 0) >= n ? n - 1 : n)} aria-label={`Sucesso ${n}`} /></label>)}</div></div><div><strong>Falhas</strong><div>{[1,2,3].map((n) => <label key={`failure-${n}`}><input type="checkbox" checked={(active.death_save_failures ?? 0) >= n} onChange={() => update("death_save_failures", (active.death_save_failures ?? 0) >= n ? n - 1 : n)} aria-label={`Falha ${n}`} /></label>)}</div></div></div></section>
          <section className="dnd-card"><h3>Ataques e conjuração</h3><p className="muted tiny">Registre armas, bônus de ataque e dano.</p><div className="attack-table"><div className="attack-table-head"><span>Nome</span><span>Bônus</span><span>Dano/tipo</span><span></span></div>{(active.attacks ?? []).map((attack, index) => <div className="attack-row" key={index}><input aria-label="Nome do ataque" value={attack.name} placeholder="Espada longa" onChange={(e) => updateAttack(index, "name", e.target.value)} /><input aria-label="Bônus de ataque" value={attack.bonus} placeholder="+5" onChange={(e) => updateAttack(index, "bonus", e.target.value)} /><input aria-label="Dano e tipo" value={attack.damage} placeholder="1d8 cortante" onChange={(e) => updateAttack(index, "damage", e.target.value)} /><button className="text-action danger-action" type="button" aria-label="Excluir ataque" onClick={() => update("attacks", (active.attacks ?? []).filter((_, i) => i !== index))}>×</button></div>)}</div><button type="button" className="button secondary small-button" onClick={() => update("attacks", [...(active.attacks ?? []), { name: "", bonus: "", damage: "", type: "" }])}>＋ Adicionar ataque</button></section>
          <section className="dnd-card"><h3>Equipamento</h3><textarea className="dnd-textarea" rows={4} value={active.equipment ?? ""} onChange={(e) => update("equipment", e.target.value)} placeholder="Armas, armaduras, mochila, moedas..." /></section>
        </section>

        <section className="dnd-column dnd-notes-column">
          <div className="dnd-section-heading"><span>03</span><h2>Personalidade</h2></div>
          <TextAreaField label="Traços de personalidade" value={active.personality_traits ?? ""} onChange={(v) => update("personality_traits", v)} placeholder="Como seu personagem costuma agir..." />
          <TextAreaField label="Ideais" value={active.ideals ?? ""} onChange={(v) => update("ideals", v)} placeholder="Aquilo em que acredita..." />
          <TextAreaField label="Vínculos" value={active.bonds ?? ""} onChange={(v) => update("bonds", v)} placeholder="Pessoas, lugares ou promessas importantes..." />
          <TextAreaField label="Defeitos" value={active.flaws ?? ""} onChange={(v) => update("flaws", v)} placeholder="Fraquezas e tentações..." />
          <TextAreaField label="Características e habilidades" value={active.features ?? ""} onChange={(v) => update("features", v)} placeholder="Características raciais, talentos e habilidades de classe..." />
          <TextAreaField label="Anotações da aventura" value={active.notes} onChange={(v) => update("notes", v)} placeholder="História, objetivos, pistas e anotações..." />
        </section>
      </div>
      <div className="sheet-save-bar"><div><strong>{active.name || "Personagem sem nome"}</strong><span>Modificadores e proficiência calculados automaticamente.</span></div><div className="inline-actions">{draft && <button className="button secondary" type="button" onClick={cancelEdit}>Cancelar</button>}<button className="button" type="button" disabled={busy} onClick={save}>{busy ? "Salvando..." : "Salvar ficha"}</button></div></div>
    </>}
  </div>;
}

function Field({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="field"><span>{label}</span><input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}
function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (value: number) => void }) {
  return <label className="field"><span>{label}</span><input type="number" value={value ?? 0} min={min} max={max} onChange={(e) => onChange(Number(e.target.value) || 0)} /></label>;
}
function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="dnd-card dnd-notes-card"><span className="dnd-card-label">{label}</span><textarea className="dnd-textarea" rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}
