# StagePro Design System · Memorizador Teatral

Guia de identidade visual, componentes de interface e sistema de design do Memorizador Teatral. Este documento serve como referência definitiva para a interface moderna com acabamento de produto nativo.

---

## 1. Filosofia de Design: *StagePro Studio*

O aplicativo substitui o visual de "HTML de formulário" e emojis amadores por uma estética de console profissional de estúdio teatral. A atmosfera combina elegância cênica, tipografia teleprompter de alta legibilidade e controles táteis desenhados para interação com um único polegar (*one-thumb navigation*).

### Pilares Fundamentais:
1. **Zero Emojis Informais**: Todos os emojis são substituídos por ícones vetoriais SVG nativos de traço consistente (`stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`), dimensionados precisamente em 16px, 18px e 20px.
2. **Abandono do "HTML de Formulário"**:
   - Checkboxes nativos do navegador são substituídos por **toggles animados estilo iOS**.
   - Dropdowns nativos ganham invólucro customizado com seta SVG e fundo glassmórfico.
   - Sliders de velocidade recebem trilha com preenchimento de cor e handle tátil com sombra suave.
   - Modais comportam-se como **bottom sheets** deslizantes no mobile e caixas de diálogo centradas no desktop.
3. **Teleprompter Cênico**: Apresentação de texto com tipografia generosa, entre-linhas 1.65, contraste calibrado contra fadiga visual e máscara de desfoque translúcido (*frosted glass reveal*) para treinar a memorização.
4. **Dock Flutuante de Um Polegar**: Barra de ação inferior flutuante com *backdrop-filter blur*, priorizando os botões herói ("Conferir Fala", "Já li", "Errei", "Acertei") ao alcance imediato do polegar.

---

## 2. Paleta de Cores e Tokens Semânticos

### StagePro Dark Theme (Padrão de Palco)
- **Fundo da Aplicação (`--bg`)**: `#0b0d11` (Obsidian Velvet profundo)
- **Fundo Elevado (`--surface-elevated`)**: `#12151c`
- **Fundo dos Cards (`--card-bg`)**: `#181c25`
- **Bordas Sutis (`--border-subtle`)**: `rgba(255, 255, 255, 0.08)`
- **Bordas de Foco (`--border-active`)**: `rgba(245, 158, 11, 0.45)`
- **Texto Primário (`--fg`)**: `#f8fafc`
- **Texto Secundário (`--fg-muted`)**: `#94a3b8`
- **Texto Terciário (`--fg-subtle`)**: `#64748b`
- **Destaque Teatral (`--accent`)**: `#f59e0b` (Spotlight Amber / Âmbar Quente)
- **Destaque Velvet (`--accent-velvet`)**: `#e11d48` (Carmim Dramático)
- **Sucesso / Domínio (`--success`)**: `#10b981` (Esmeralda)
- **Erro / Revisão (`--danger`)**: `#f43f5e` (Rose vibrante)
- **Dica Semântica (`--hint`)**: `#f59e0b` (Âmbar suave)
- **Gravação Ativa (`--recording`)**: `#ef4444` (Vermelho rubi pulsante)

### StagePro Light Theme (Modo Diurno / Estudo)
- **Fundo da Aplicação (`--bg`)**: `#f8fafc` (Alabastro limpo)
- **Fundo dos Cards (`--card-bg`)**: `#ffffff`
- **Texto Primário (`--fg`)**: `#0f172a` (Ardósia profunda)
- **Texto Secundário (`--fg-muted`)**: `#64748b`
- **Borda (`--border`)**: `#e2e8f0`
- **Destaque (`--accent`)**: `#b45309` (Âmbar estúdio contrastado)

---

## 3. Catálogo de Ícones SVG (`Icons`)

Todos os ícones são gerados via `Icons.get(nome, options)` em `js/utils.js` e embutidos diretamente no HTML:

| Nome do Ícone | Conceito Anterior (Emoji) | Aplicação |
| :--- | :--- | :--- |
| `masks` | 🎭 | Marca principal, teatro, fim de cena |
| `mic` / `speak` | 🗣️ / 🎙️ | Método oral, gravação de áudio real, escuta |
| `puzzle` | 🧩 | Método de alternativas / quiz |
| `keyboard` | ⌨️ | Método de digitação |
| `target` | 🎯 | Modo só minhas falas, intenção de Stanislavski |
| `book` / `script` | 📖 | Passada de cena, leitura de mesa completa |
| `lightning` | ⚡ | Modo ping-pong, ritmo da cena |
| `headphones` | 🎧 | Ponto eletrônico, escuta imersiva |
| `brain` | 🧠 | Foco nas fraquezas, repetição espaçada |
| `user` | 👤 | Seleção de personagem do elenco |
| `settings` | ⚙️ | Painel de opções e vozes |
| `list` | 📋 | Índice de falas da cena |
| `eye` | 👁️ | Revelar fala, conferir texto |
| `eyeOff` | 🙈 / 🔒 | Fala oculta, modo desafio |
| `bulb` | 💡 | Dica incremental |
| `check` | ✅ / ✓ | Marcar acerto, concluído |
| `x` | ❌ | Marcar erro, fechar |
| `retry` | 🔁 | Tentar de novo agora |
| `sparkles` | 🎉 | Parabéns / bloco dominado |
| `volume` | 🔊 | Ouvir voz sintetizada |
| `stop` | ⏹️ | Parar reprodução de áudio |
| `trash` | 🗑️ | Excluir áudio gravado |
| `download` | 📤 | Exportar backup de segurança |
| `upload` | 📥 | Restaurar backup |
| `waveform` | 〰️ | Ondas sonoras de áudio ativo |
| `sun` | ☀️ | Tema claro / diurno |
| `moon` | 🌙 | Tema escuro / noturno |

---

## 4. Componentes Chave

### 4.1. Toggle Switch iOS (.app-switch)
Substitui o checkbox padrão por um interruptor com trilha suave de 44px × 26px e botão interno esférico de 20px com animação cúbica e indicador de estado ativo.

### 4.2. Seletor de Modo & Método em Chips / Cards Interativos
Cards de seleção no Camarim com ícone vetorial destacado, tipografia em duas camadas (título + descrição rápida) e borda iluminada por brilho quando ativo.

### 4.3. One-Thumb Action Dock (.action-dock)
Elemento flutuante fixado na parte inferior com área de respiro de 12px, cantos arredondados, backdrop glassmorphism (`backdrop-filter: blur(24px)`), e botões principais de no mínimo 48px de altura com feedback tátil de toque.

### 4.4. Teleprompter Speech Card (.speech-card)
Cartão com realce para a deixa conectada do colega (`.cue-card`), identificação clara do locutor, barra de ação/subtexto de Stanislavski (`.intent-bar`), e texto cênico com revelação progressiva e animação frosted glass (`speechRevealFade`).

### 4.5. Gerenciador de Temas (Obsidian Dark & Refined Light)
Alternância de alto contraste com persistência em `localStorage` (`stagepro_theme`), suporte nativo à preferência do sistema operacional (`prefers-color-scheme`) e sincronização dinâmica entre o botão de cabeçalho e o switch de configurações.
