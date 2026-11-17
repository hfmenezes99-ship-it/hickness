# Protocolo 28

PWA pessoal (HTML/CSS/JS puro, sem build e sem dependências) para acompanhar 28 dias de dieta, treino e metas. Dados ficam no `localStorage` do aparelho.

## Rodar
```
npm start        # ou: node server.js
```
Abre em http://localhost:5173 e mostra o endereço para o celular na mesma rede Wi-Fi.

Para testar outra data/hora: `?now=2026-11-21T20:30`.

## Publicar na Vercel
Projeto estático: importe o repositório na Vercel com "Framework: Other", sem comando de build e diretório de saída `.`.
