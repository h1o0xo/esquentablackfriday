# 🛒 Projeto Clonado - Loja / Produto (hallowen3)

Este pacote contém o clone exato da sua página anterior de vendas no estilo TikTok Shop / Mobile Commerce, pronto para receber o seu **novo produto**, além da página completa de checkout/compra (`pagamento.html`) que é acionada ao clicar em **"Comprar Agora"** ou **"Adicionar ao carrinho"**.

---

## 📁 Estrutura dos Arquivos

```text
hallowen3/
├── index.html            # Página de vendas do produto (Landing Page completa)
├── pagamento.html        # Página de compra/checkout (acessada ao clicar em Comprar Agora)
├── css/
│   ├── style.css         # Estilização completa e responsiva da página de vendas
│   └── checkout.css      # Estilização da página de compra / checkout
├── js/
│   ├── main.js           # Funções de carrossel, contador regressivo, datas dinâmicas e modais
│   └── checkout.js       # Máscaras de CPF/Telefone/CEP, busca de endereço ViaCEP e PIX
└── images/
    ├── placeholder.svg   # Imagem modelo em SVG para substituir pelas fotos do produto
    └── avatar-default.svg# Ícone padrão de perfil para avaliações
```

---

## 🛠️ Como Personalizar para o seu Novo Produto

### 1. Fotos do Produto
- Coloque as imagens do seu novo produto na pasta `images/` com nomes como `carousel-1.webp`, `carousel-2.webp`, etc. (ou formato `.png`, `.jpg`).
- No arquivo `index.html`, ajuste as tags `<img>` dentro da seção `<section class="car" id="carousel">`.

### 2. Título, Descrição e Preços
- **Título do Produto:** Altere a tag `<h1 class="pi-title">` em `index.html` e a classe `.co-prod-name` em `pagamento.html`.
- **Preço Promocional e Original:**
  - Na página de vendas: procure pela classe `.pb-amount` (`R$ 61,90`) e `.pb-original` (`R$ 548,36`).
  - Na página de checkout: altere `unitPrice = 61.90` no início do arquivo `js/checkout.js`.
- **Detalhes Técnicos:** Atualize a tabela de especificações em `index.html` dentro da seção `<section class="pd">`.

### 3. Integração com Gateway de Pagamento
- Se você utiliza um checkout externo (ex: Appmax, Kiwify, Mercado Pago, Kirvano, PerfectPay, Yampi):
  - Basta alterar os links dos botões em `index.html`:
    ```html
    <a class="bb-buy" href="SEU_LINK_DE_CHECKOUT_AQUI">Comprar Agora</a>
    ```
- Se deseja usar a própria página de pagamento interna inclusa (`pagamento.html`):
  - Ela já vem integrada com busca automática de CEP (ViaCEP), validações de campos e gerador simulado de código PIX Copia e Cola.
