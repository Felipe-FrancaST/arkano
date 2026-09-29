# Arkano

Base inicial de um site para mestres e jogadores de RPG, com Next.js, TypeScript e Supabase.

## Requisitos

- Node.js 20.9+ (recomendado Node 22 LTS)
- Conta no Supabase
- Git e VS Code

## 1. Instalar e executar

```bash
npm install
cp .env.example .env.local
npm run dev
```

No Windows PowerShell, se `cp` não funcionar:

```powershell
Copy-Item .env.example .env.local
```

Abra `http://localhost:3000`.

## 2. Configurar o Supabase

1. Crie um projeto em https://supabase.com/.
2. No painel, abra **Project Settings → API**.
3. Copie a Project URL e a chave pública `anon`/publishable para `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Abra **SQL Editor**, crie uma consulta e execute o conteúdo de `supabase/schema.sql`.
5. Em **Authentication → URL Configuration**, configure a URL local `http://localhost:3000` e, depois, a URL de produção da Vercel.
6. Para testar o cadastro sem e-mail, ajuste a confirmação de e-mail apenas no ambiente de desenvolvimento. Em produção, mantenha um fluxo de confirmação adequado.

Nunca coloque a `service_role` key no navegador, no Git ou em variáveis `NEXT_PUBLIC_*`.

## 3. GitHub

```bash
git init
git add .
git commit -m "chore: iniciar projeto Arkano"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/arkano.git
git push -u origin main
```

Crie o repositório no GitHub antes de executar o `git push`.

## 4. Vercel

1. Importe o repositório GitHub na Vercel.
2. Em **Settings → Environment Variables**, cadastre as duas variáveis do Supabase.
3. Faça o deploy.
4. Cadastre o domínio da Vercel nas URLs autorizadas do Supabase Auth.

## O que já existe nesta base

- Landing page inicial com identidade visual Arkano.
- Cadastro e login por e-mail e senha via Supabase Auth.
- Seleção inicial de perfil Mestre/Jogador no cadastro.
- Painel privado básico e botão de sair.
- Páginas-base de campanhas e ficha demonstrativa.
- SQL inicial para perfis, campanhas, membros de campanha e fichas.
- RLS (Row Level Security) inicial para limitar acesso por usuário/mestre.

## Importante: estágio do projeto

Esta é a fundação, não o sistema completo. As telas de campanha e ficha ainda são demonstrativas e não gravam/consultam os dados reais. O controle de participantes, convite de jogadores, edição de ficha e validação rigorosa de permissões será implementado nas próximas etapas.

O tipo de conta escolhido no cadastro é armazenado como metadado e também copiado para `profiles` pelo gatilho SQL. Em uma próxima etapa, o papel deverá ser validado sempre no banco e não confiado apenas nos metadados enviados pelo cliente. O esquema é uma primeira versão e deve passar por testes de segurança antes de produção.

## Estrutura

```text
arkano/
├── src/
│   ├── app/
│   │   ├── cadastro/page.tsx
│   │   ├── campanhas/page.tsx
│   │   ├── entrar/page.tsx
│   │   ├── ficha/page.tsx
│   │   ├── painel/page.tsx
│   │   ├── globals.css
│   │   └── page.tsx
│   ├── components/
│   ├── lib/supabase/
│   └── middleware.ts
└── supabase/schema.sql
```

## Painel do mestre e gerenciamento de campanhas

O painel `/campanhas` permite que mestres criem campanhas, cadastrem jogadores, vinculem contas existentes, editem nome/e-mail/senha, desativem o acesso à campanha e removam um jogador do grupo.

### Variáveis de ambiente adicionais

Além de `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, configure na Vercel a variável secreta **`SUPABASE_SERVICE_ROLE_KEY`** com a chave `service_role` do mesmo projeto Supabase. Ela é usada exclusivamente nas rotas do servidor para criar contas e administrar membros; nunca coloque essa chave em variáveis `NEXT_PUBLIC_*` nem a exponha no navegador.

### Atualização do banco

No Supabase, abra **SQL Editor** e execute `supabase/migrations/20260929_campaign_access_control.sql`. Essa migração atualiza as políticas RLS para que desativar o acesso também bloqueie a leitura e a alteração das fichas daquela campanha.
