let _pendingStationId = null;
let _selectedCustomer = null;

function openSessionForm(stationId) {
  if (activeSessions.size >= MAX_STATIONS && !activeSessions.has(stationId)) {
    alert("Todas as estações estão ocupadas. Veículo adicionado à fila de espera.");
    enqueueVehicle(stationId);
    return;
  }
  _pendingStationId = stationId;
  _selectedCustomer = null;
  document.getElementById("session-modal-title").textContent = "Estação " + stationId;
  document.getElementById("session-form-error").textContent = "";
  document.getElementById("sf-vehicle-id").value = "VH-" + stationId + "-" + String(Date.now()).slice(-4);
  document.getElementById("sf-customer-card").selectedIndex = 0;
  renderCustomerResult(null);
  document.getElementById("session-modal").classList.add("open");
}

function closeSessionForm() {
  document.getElementById("session-modal").classList.remove("open");
  _pendingStationId = null;
  _selectedCustomer = null;
}

function enqueueVehicle(stationId) {
  const config = readFormConfig(stationId);
  if (!config) return;
  const queued = Object.assign(config, { status: "queued" });
  waitingQueue.enqueue(queued);
  renderWaitingQueue();
}

// Simula a leitura de um cartão RFID/QR do cliente: no hardware real, o leitor
// da estação captura o cardId e consulta o cadastro do cliente no backend.
// Aqui, o operador seleciona o cartão no dropdown (simulando a aproximação
// física do cartão) e o sistema resolve automaticamente plano e tipo de usuário.
function simulateCardScan() {
  const select = document.getElementById("sf-customer-card");
  const cardId = select.value;
  const customer = MOCK_CUSTOMERS.find(c => c.cardId === cardId);
  _selectedCustomer = customer || null;
  renderCustomerResult(_selectedCustomer);
  document.getElementById("session-form-error").textContent = "";
}

function renderCustomerResult(customer) {
  const el = document.getElementById("sf-customer-result");
  if (!customer) {
    el.innerHTML = `<span class="crr-empty">Nenhum cartão lido ainda — selecione e clique em "Simular Leitura".</span>`;
    return;
  }
  const plan = PLANS.find(p => p.id === customer.planId);
  const userTypeLabel = customer.userType === "premium" ? "Premium" : "Padrão";
  el.innerHTML = `
    <span class="crr-name">${customer.name}</span>
    <span class="crr-tag">${plan ? plan.name : customer.planId}</span>
    <span class="crr-tag">${userTypeLabel}</span>
  `;
}

function readFormConfig(stationId) {
  const vehicleId = document.getElementById("sf-vehicle-id").value.trim();
  const batteryCapacity = parseFloat(document.getElementById("sf-capacity").value);
  const initialPct = parseFloat(document.getElementById("sf-initial").value);

  if (!_selectedCustomer) {
    document.getElementById("session-form-error").textContent = "Simule a leitura do cartão/QR do cliente.";
    return null;
  }
  if (!vehicleId) {
    document.getElementById("session-form-error").textContent = "Informe o ID do veículo.";
    return null;
  }
  if (!Number.isFinite(batteryCapacity) || batteryCapacity <= 0) {
    document.getElementById("session-form-error").textContent = "Capacidade inválida.";
    return null;
  }
  if (!Number.isFinite(initialPct) || initialPct < 0 || initialPct >= 100) {
    document.getElementById("session-form-error").textContent = "Carga inicial inválida (0–99).";
    return null;
  }

  return {
    vehicleId,
    userId: _selectedCustomer.cardId,
    customerName: _selectedCustomer.name,
    userType: _selectedCustomer.userType,
    planId: _selectedCustomer.planId,
    batteryCapacity,
    initialPct,
    stationId,
  };
}

function submitSessionForm() {
  const config = readFormConfig(_pendingStationId);
  if (!config) return;

  startSession(_pendingStationId, config);
  closeSessionForm();
  renderAll();
}

function initSessionForm() {
  const cardOptions = [`<option value="">— selecione o cartão —</option>`].concat(
    MOCK_CUSTOMERS.map(c => `<option value="${c.cardId}">${c.cardId} · ${c.name}</option>`)
  ).join("");
  document.getElementById("sf-customer-card").innerHTML = cardOptions;

  document.getElementById("btn-simulate-scan").addEventListener("click", simulateCardScan);

  const slider = document.getElementById("sf-initial");
  slider.addEventListener("input", () => {
    document.getElementById("sf-initial-value").textContent = slider.value + "%";
  });

  document.getElementById("btn-session-confirm").addEventListener("click", submitSessionForm);
  document.getElementById("btn-session-cancel").addEventListener("click", closeSessionForm);

  document.getElementById("session-modal").addEventListener("click", e => {
    if (e.target === document.getElementById("session-modal")) closeSessionForm();
  });
}
