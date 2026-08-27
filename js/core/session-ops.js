function startSession(stationId, config) {
  const { vehicleId, userId, customerName, userType, planId, batteryCapacity, initialPct } = config;

  if (!Number.isFinite(batteryCapacity) || !Number.isFinite(initialPct)) return null;

  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return null;

  const hour = getHour();
  const demandRatio = calcTotalActivePower() / GRID_CAPACITY_KW;
  const pricePerKwh = calcPricePerKwh(plan, hour, userType, demandRatio);
  const totalMinutes = (batteryCapacity * (100 - initialPct) / 100 / plan.power) * 60;

  const session = {
    id: "sess_" + Date.now(),
    stationId,
    vehicleId,
    userId,
    customerName,
    userType,
    plan,
    power: plan.power,
    powerMax: plan.power,
    pricePerKwh,
    startTime: new Date(),
    elapsedMinutes: 0,
    totalMinutes,
    initialPct,
    batteryCapacity,
    status: "charging",
  };

  activeSessions.set(stationId, session);
  applyThrottling();

  ocppBus.send("BootNotification", { chargePointVendor: "GoodWe", chargePointModel: "EVCS-" + stationId });
  setTimeout(() => {
    ocppBus.send("Authorize", { idTag: userId });
    setTimeout(() => {
      ocppBus.send("StartTransaction", { connectorId: stationId, idTag: userId, meterStart: 0 });
    }, 300);
  }, 300);

  return session;
}

function stopSession(stationId) {
  const session = activeSessions.get(stationId);
  if (!session) return null;

  const energyDelivered = calcEnergyDelivered(session);
  const totalCost = energyDelivered * session.pricePerKwh;

  const record = {
    id: session.id,
    stationId,
    vehicleId: session.vehicleId,
    customerName: session.customerName || session.userId,
    date: session.startTime.toLocaleDateString("pt-BR"),
    plan: session.plan,
    userType: session.userType,
    power: session.powerMax,
    pricePerKwh: session.pricePerKwh,
    durationMinutes: session.elapsedMinutes,
    energyKwh: energyDelivered,
    totalCost,
    initialPct: session.initialPct,
    finalPct: Math.round(calcCurrentPct(session)),
    batteryCapacity: session.batteryCapacity,
  };

  ocppBus.send("StopTransaction", { transactionId: session.id, meterStop: Math.round(energyDelivered * 1000) });

  activeSessions.delete(stationId);
  applyThrottling();

  // Não há mais dedução de "saldo do cliente": o pagamento é liquidado fora do
  // app (cartão/PIX na hora). O sistema apenas registra a receita gerada pelo
  // posto para fins de faturamento e relatórios do franqueado.
  state.sessionHistory.unshift(record);
  saveState();

  if (!waitingQueue.isEmpty) {
    const next = waitingQueue.dequeue();
    startSession(stationId, Object.assign(next, { stationId }));
  }

  return record;
}
