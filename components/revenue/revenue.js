// Painel de Faturamento — visão financeira do posto para o franqueado.
// Não existe mais "saldo do cliente": o pagamento é liquidado fora do sistema
// (cartão/PIX no ato). Este painel apenas consolida a receita gerada.

function calcTodaySessionsCount() {
  const today = new Date().toLocaleDateString("pt-BR");
  return state.sessionHistory.filter(r => r.date === today).length;
}

function calcTodayEnergyKwh() {
  const today = new Date().toLocaleDateString("pt-BR");
  return state.sessionHistory
    .filter(r => r.date === today)
    .reduce((sum, r) => sum + r.energyKwh, 0);
}

function renderRevenue() {
  const revEl = document.getElementById("revenue-today-value");
  if (revEl) revEl.textContent = formatBRL(calcTodayRevenue());

  const sessEl = document.getElementById("revenue-sessions-value");
  if (sessEl) sessEl.textContent = String(calcTodaySessionsCount());

  const kwhEl = document.getElementById("revenue-kwh-value");
  if (kwhEl) kwhEl.textContent = calcTodayEnergyKwh().toFixed(1) + " kWh";

  renderSidebarRevenue();
  renderRevenueHistory();
}

function renderRevenueHistory() {
  const list = document.getElementById("revenue-history-list");
  if (!list) return;

  if (state.sessionHistory.length === 0) {
    list.innerHTML = `<div class="revenue-empty">Nenhuma sessão registrada ainda.</div>`;
    return;
  }

  const rows = state.sessionHistory.slice(0, 30).map(r => `
    <div class="revenue-row">
      <span>${r.customerName || "—"}</span>
      <span>Estação ${r.stationId} · ${r.plan.name}</span>
      <span>${r.energyKwh.toFixed(1)} kWh</span>
      <span>${formatDuration(r.durationMinutes)}</span>
      <span>${r.date}</span>
      <span class="rv-cost">${formatBRL(r.totalCost)}</span>
    </div>
  `).join("");

  list.innerHTML = `
    <div class="revenue-row header">
      <span>Cliente</span><span>Estação / Plano</span><span>Energia</span><span>Duração</span><span>Data</span><span>Receita</span>
    </div>
    ${rows}
  `;
}
