# Entrada Show

Aplicação web para organizar músicas e controlar entradas durante cerimônias de formatura.

## Tecnologias
- Vite + React + JavaScript (`.jsx`)
- Tailwind CSS v4 com `@tailwindcss/vite` e tokens `@theme`
- Web Audio API para reprodução e fades
- Dexie / IndexedDB para armazenamento local dos registros e blobs de áudio
- PWA com service worker para cache dos arquivos da aplicação
- Supabase opcional (cliente e esquema SQL incluídos; sincronização ainda não implementada nesta primeira etapa)

## Como executar
Requer Node.js 20.19+ ou 22.12+ recomendado para a versão atual do Vite.

```bash
npm install
npm run dev
```
Abra o endereço local mostrado pelo Vite. Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

## Funcionalidades incluídas
- Criar, editar, excluir e reordenar entradas
- Salvar áudio e dados localmente no navegador (IndexedDB)
- Ajustar início e fim do trecho, fade in, fade out e volume
- Pré-escutar áudio
- Modo palco com PLAY, PRÓXIMO, repetir, STOP, próxima entrada, acesso rápido e autoavanço opcional
- Barra de progresso, tempo e tentativa de manter a tela ativa (Wake Lock)
- Exportar e importar backup JSON incluindo os arquivos de áudio
- PWA: a interface pode ser instalada e os arquivos da aplicação ficam em cache

## Supabase (opcional, integração preparada)
1. Crie um projeto no Supabase.
2. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Execute `supabase/schema.sql` no SQL Editor do Supabase.
4. A sincronização real de registros e upload de áudio é uma próxima etapa; esta versão continua usando o banco local mesmo com as credenciais preenchidas.

## Atenção para o evento ao vivo
- Teste os áudios e a saída de som no mesmo computador e navegador usados na cerimônia.
- Mantenha uma cópia de backup em outro dispositivo.
- Faça um ensaio completo antes do evento. A reprodução em segundo plano depende das políticas do navegador e do sistema operacional.
