# Protocolo 28

PWA pessoal (HTML/CSS/JS puro, sem build e sem dependências) para acompanhar 28 dias de dieta, treino e metas. Dados ficam no `localStorage` do aparelho.

## O que tem
- **Hoje:** refeição da vez pelo horário, treino do dia, calorias/proteína, água, passos, creatina.
- **Dieta:** cardápio do dia (treino/descanso), trocas, docinho, extras, refeição livre de sábado.
- **Treino:** séries com carga/reps, última vez, descanso automático, regras da semana, "ombro doeu", cronômetros de aeróbico.
- **Metas:** peso com média de 7 dias × meta semanal, cintura, fotos dia 1/28, painel de cumprimento, avisos de ajuste, fechamento.
- **Mais:** diário, anotações, lembretes, backup JSON, configurações.

## Rodar
```
npm start        # ou: node server.js
```
Abre em http://localhost:5173 e mostra o endereço para o celular na mesma rede Wi-Fi.

Para testar outra data/hora: `?now=2026-11-21T20:30`.

## Publicar na Vercel
Projeto estático: importe o repositório na Vercel com "Framework: Other", sem comando de build e diretório de saída `.`.
