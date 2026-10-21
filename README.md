# Radar de Onboarding CS

Painel de acompanhamento das matrículas da Pós-graduação e dos MBAs do **Instituto NTA**. Mostra quem está travado no onboarding, há quanto tempo, qual curso concentra os gargalos e qual é a próxima ação para cada aluno, com nome, telefone, forma de pagamento e WhatsApp em um clique.

**[Abrir o painel](https://institutonta.github.io/radar-onboarding-cs/)**: acesso com e-mail e senha, restrito ao time de CS.

---

## Como funciona

```
Planilha Matriculas_Pós.xlsx  →  Supabase (base protegida)  →  Painel (login)
```

- Os dados reais dos alunos ficam no **Supabase**, projeto `cs-analise-matriculas`.
- O painel só mostra dados para **e-mails autorizados** e depois do login. Quem não está autorizado não vê nada, mesmo que consiga entrar.
- **Este repositório não guarda nenhum dado de aluno**: só o código do painel.
- As marcações de acompanhamento (Contatado, Sem resposta, Resolvido, Revertido) ficam salvas na base e aparecem para todas as pessoas autorizadas, em qualquer computador.

## O que o painel entrega

| Aba | Para que serve |
|---|---|
| **Visão geral** | Indicadores do onboarding, situação por curso e vendas mês a mês |
| **Fila de ação** | Alunos pendentes por prioridade (Crítica, Alta, Média, Baixa), com WhatsApp, mensagem pronta e acompanhamento |
| **Reversão** | Cancelados com janela de reversão, motivo e bônus para oferecer |
| **Gargalos** | Tempo parado por etapa e cursos com maior pendência |
| **Pagamentos** | Pendência por forma de pagamento |
| **Comercial** | Volume e pendência por vendedor |
| **Cancelamentos** | Motivos, tempo até cancelar e cursos afetados |
| **Qualidade** | Campos vazios ou fora do padrão para corrigir na planilha |

---

## Acesso

### Liberar uma pessoa nova
1. **Criar o login:** no Supabase, em *Authentication → Users → Add user → Create new user*, informe o e-mail e uma senha provisória e marque **Auto Confirm User**.
2. **Autorizar a ver os dados:** em *Table Editor → acesso_painel → Insert row*, informe o e-mail (em minúsculas) e o nome.

As duas etapas são necessárias. Para **retirar o acesso**, apague a linha da pessoa em `acesso_painel`.

### Esqueci a senha
Na tela de login, digite o e-mail e clique em **Esqueci minha senha**. Chega um link para criar uma senha nova.
Para esse link funcionar, o endereço do painel precisa estar em *Authentication → URL Configuration*: `https://institutonta.github.io/radar-onboarding-cs/` como **Site URL** e também em **Redirect URLs**.

---

## Atualizar os dados

Quando entrarem alunos novos na planilha, importe a versão nova para as tabelas `matriculas` e `cancelamentos` do Supabase (Table Editor → Import data from CSV). Depois, no painel, clique em **Atualizar dados**.

A data da última importação aparece na barra de status do painel.

---

## Regras de negócio

| Regra | Como é calculada |
|---|---|
| **Pendente** | Status `Em matrícula` ou `Em contrato` |
| **Prioridade, Em matrícula** | até 15 dias: Baixa · até 30: Média · até 90: Alta · acima: Crítica |
| **Prioridade, Em contrato** | até 15 dias: Baixa · até 60: Alta · acima: Crítica |
| **Exceção** | Observação citando colação de grau: Média |
| **Janela de reversão** | até 120 dias: Recente · até 240: Intermediária · acima: Antiga |

Tudo isso pode ser ajustado em [`assets/js/config.js`](assets/js/config.js): cursos, faixas de prioridade, mensagens de WhatsApp (`{nome}` e `{curso}` são preenchidos automaticamente), bônus e motivos. Pelo GitHub, abra o arquivo, clique no lápis, altere e salve. O site se atualiza em cerca de 1 minuto.

---

## Estrutura

```
index.html              página do painel (login + abas)
assets/
  css/app.css           visual (tema claro e escuro)
  js/config.js          ← regras e textos ajustáveis
  js/nuvem.js           login e leitura da base no Supabase
  js/dados.js           padronização e cálculos
  js/app.js             telas, gráficos e interações
  vendor/               bibliotecas (D3 e Supabase)
```

Feito pelo time de **CS Pós-venda · Instituto NTA**.
