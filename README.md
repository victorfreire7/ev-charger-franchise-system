# ⚡ Thunderbolt — Painel de Gestão do Franqueado (GoodWe)

Prova de Conceito (PoC) para o **painel do franqueado** de um posto de recarga de veículos elétricos. O sistema é uma ferramenta de **Gerenciamento Pelo Lado da Demanda (Demand-Side Management — DSM)**: ajuda o dono do posto a controlar quantos kW são entregues em cada estação e a otimizar a receita através de tarifação dinâmica, sem depender de uma "carteira" pessoal de cliente — o pagamento é liquidado fora do sistema (cartão/PIX no ato), e o app foca em **operação e faturamento do posto**.

> Este é o escopo do franqueador. Não é um app de consumidor: o operador do posto identifica o cliente (via leitura simulada de cartão/QR), monitora as 4 estações simultaneamente, controla a fila de espera e acompanha o faturamento consolidado.

---

## Objetivos do Sistema

1. **Otimização de custo e potência entregue:** o preço por kWh e a potência disponível por estação variam dinamicamente conforme horário e demanda agregada da grade, incentivando o uso fora dos horários de pico.
2. **Sustentabilidade (SERS):** mitigar a sobrecarga do sistema elétrico em horários de pico, reduzindo a dependência de geração termelétrica.
3. **Desempenho (DSA):** estruturas de dados otimizadas para gerenciar múltiplas sessões simultâneas em tempo real.

---

## Regras de Tarifação Dinâmica

O preço efetivo por kWh cobrado do cliente é o resultado de fatores multiplicativos aplicados sobre o preço-base do **plano do cliente**:

| Plano  | Potência | Preço-base /kWh |
|--------|----------|------------------|
| Básico | 3,7 kW   | R$ 1,40          |
| Plus   | 7,4 kW   | R$ 1,10          |
| Ultra  | 22 kW    | R$ 0,80          |

- **Madrugada (00h–06h):** multiplicador **× 0,70** — incentiva o carregamento fora de pico.
- **Horários de pico:**
  - **7h30–9h** (pico da manhã)
  - **17h–19h30** (pico da tarde/noite)
  - Multiplicador **× 1,30** em qualquer um dos dois blocos.
- **Demanda agregada da grade** (soma da potência de todas as estações ativas / capacidade total de 50 kW):
  - < 40%: × 1,00 · 40–70%: × 1,10 · 70–90%: × 1,25 · ≥ 90%: × 1,50
- **Cliente Premium:** desconto adicional de **−15%** sobre o preço já calculado.
- **Plano Ultra em horário de pico:** desconto extra de **−10%** — retém o cliente mais rentável mesmo quando o preço-base já está sobretaxado pelo pico.

O cálculo é aplicado em cascata (multiplicativo), e recalculado a cada segundo enquanto a sessão está ativa, refletindo mudanças na demanda em tempo real.

---

## Identificação do Cliente (simulação de cartão RFID/QR)

Ao iniciar uma sessão em uma estação, o operador **não digita manualmente** o plano ou tipo do cliente. Em vez disso, simula a leitura do cartão/QR do cliente (selecionando o cartão em um dropdown e clicando em "Simular Leitura"), o que resolve automaticamente:
- Nome do cliente
- Plano assinado (Básico/Plus/Ultra)
- Tipo de usuário (Padrão/Premium)

Apenas os dados que dependem do veículo físico (ID do veículo, capacidade da bateria, carga inicial) são informados manualmente, simulando o que um leitor de BMS/OCPP capturaria do carro.

---

## Faturamento do Posto

A antiga "Carteira" (saldo pré-pago pessoal do cliente) foi removida — não faz sentido no contexto do franqueador. Em seu lugar, o painel **Faturamento** consolida:
- Receita do dia
- Nº de sessões do dia
- Energia total entregue no dia
- Histórico detalhado de sessões (cliente, estação, plano, energia, duração, custo)

---

## Arquitetura e Estruturas de Dados (DSA)

Solução construída em JavaScript puro (Vanilla JS).

### Árvore de Arquitetura do Frontend
```text
    second-sprint/
    ├─ css/
    │  └─ base/
    │     ├─ animations.css
    │     ├─ buttons.css
    │     ├─ forms.css
    │     ├─ reset.css
    │     └─ tokens.css
    ├─ components/
    │  ├─ demand-bar/
    │  ├─ explanation/
    │  ├─ modbus-table/
    │  ├─ ocpp-log/
    │  ├─ revenue/            ← painel de faturamento do posto
    │  ├─ session-form/       ← leitura simulada de cartão/QR
    │  ├─ sidebar/
    │  ├─ station-card/
    │  ├─ tariff-breakdown/
    │  └─ waiting-queue/
    ├─ js/
    │  └─ core/
    │     ├─ constants.js     ← planos, janelas de pico, cadastro de clientes
    │     ├─ helpers.js
    │     ├─ modbus.js
    │     ├─ ocpp.js
    │     ├─ queue.js
    │     ├─ session-manager.js
    │     ├─ session-ops.js
    │     ├─ state.js
    │     └─ tariff.js        ← motor de tarifação dinâmica
    ├─ index.html
    └─ README.md
```

### Estruturas Utilizadas e Justificativa de Complexidade

- **Map\<stationId, Session\> (`activeSessions`):** acesso O(1) por estação para throttling e atualização de sessões em cada tick.
- **Queue — FIFO (`waitingQueue`):** clientes aguardando vaga são atendidos na ordem de chegada quando uma estação libera.
- **Array de Histórico Dinâmico (`sessionHistory`):** usa `.unshift()` para manter as sessões mais recentes primeiro, alimentando o painel de Faturamento.
- **Lookup Tables (`PEAK_WINDOWS`, `tariffRules.demand`):** regras de tarifação resolvidas por busca linear O(n) sobre arrays pequenos e estáticos — simples, previsível e fácil de auditar.
- **Cadastro de Clientes (`MOCK_CUSTOMERS`):** simula a base de cartões RFID/QR do posto, evitando qualquer digitação manual de plano/tipo pelo operador.

---

### Instruções de Uso da PoC

1. Clone o repositório e navegue até a pasta do projeto.
2. Por ser frontend puro, basta abrir `index.html` em qualquer navegador moderno.
3. Passo a passo para gerar dados:
   - No painel de **Sessões**, clique em "Iniciar Recarga" em uma estação livre.
   - Simule a leitura do cartão do cliente (selecione um cartão e clique em "Simular Leitura").
   - Informe o ID do veículo, a capacidade da bateria e a carga inicial.
   - Use os botões de demonstração para simular múltiplos veículos, demanda máxima da grade, fila de espera, ou alternar entre os horários de pico.
   - Acompanhe o custo por kWh em tempo real em **Tarifa Efetiva** e o faturamento consolidado em **Faturamento**.
