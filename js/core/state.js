const state = {
  sessionHistory: [],
};

function saveState() {
  localStorage.setItem("ss2_history", JSON.stringify(state.sessionHistory));
}

function loadState() {
  const h = localStorage.getItem("ss2_history");
  if (h) state.sessionHistory = JSON.parse(h);
}

loadState();

// Faturamento do posto no dia corrente (soma do custo total das sessões
// concluídas hoje) — indicador financeiro voltado ao franqueado.
function calcTodayRevenue() {
  const today = new Date().toLocaleDateString("pt-BR");
  return state.sessionHistory
    .filter(r => r.date === today)
    .reduce((sum, r) => sum + r.totalCost, 0);
}

let simulatedHour = null;
function getHour() {
  if (simulatedHour !== null) return simulatedHour;
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60; // hora decimal, ex: 7h30 = 7.5
}

let tickMultiplier = 1;
let _tickCount = 0;
let globalTick = null;

function startGlobalTick() {
  if (globalTick) return;
  globalTick = setInterval(() => {
    _tickCount++;
    const hour = getHour();
    const demandRatio = calcTotalActivePower() / GRID_CAPACITY_KW;

    activeSessions.forEach((session, stationId) => {
      session.elapsedMinutes += tickMultiplier;
      session.pricePerKwh = calcPricePerKwh(session.plan, hour, session.userType, demandRatio);

      if (_tickCount % 10 === 0) {
        ocppBus.send("MeterValues", {
          connectorId: stationId,
          transactionId: session.id,
          meterValue: Math.round(calcEnergyDelivered(session) * 1000),
        });
      }

      if (calcCurrentPct(session) >= 100) stopSession(stationId);
    });

    const first = activeSessions.values().next().value;
    if (first) updateModbusFromSession(first);

    if (typeof renderAll === "function") renderAll();
  }, TICK_INTERVAL_MS);
}

startGlobalTick();
