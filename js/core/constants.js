// Planos de assinatura dos CLIENTES do posto (não do franqueado).
// Preço/kWh já reflete a política comercial: quanto maior o plano, menor o custo por kWh.
const PLANS = [
  {
    id: "basic",
    name: "Básico",
    power: 3.7,
    monthlyPrice: 49,
    pricePerKwh: 1.40,
  },
  {
    id: "plus",
    name: "Plus",
    power: 7.4,
    monthlyPrice: 89,
    pricePerKwh: 1.10,
  },
  {
    id: "ultra",
    name: "Ultra",
    power: 22,
    monthlyPrice: 139,
    pricePerKwh: 0.80,
  },
];

const GRID_CAPACITY_KW = 50;
const MAX_STATIONS = 4;
const STATION_IDS = ["A", "B", "C", "D"];
const TICK_INTERVAL_MS = 1000;

// Janelas de horário de pico (hora decimal: 7.5 = 7h30). Fora dessas janelas e
// fora do horário noturno (0h-6h), aplica-se a tarifa padrão (multiplicador 1.00).
const PEAK_WINDOWS = [
  { start: 7.5,  end: 9,    label: "Pico Manhã" },
  { start: 17,   end: 19.5, label: "Pico Tarde/Noite" },
];
const PEAK_MULTIPLIER = 1.30;
const NIGHT_WINDOW = { start: 0, end: 6, multiplier: 0.70 };

// Desconto adicional para assinantes do plano Ultra durante o horário de pico.
// Incentiva o posto a atrair/reter o plano mais rentável mesmo nos horários mais caros.
const ULTRA_PEAK_EXTRA_DISCOUNT = 0.90; // -10% adicional sobre o preço já calculado

// Cadastro de clientes do posto (cartão RFID / QR code) usado para simular a
// leitura de identificação do cliente ao iniciar uma sessão, sem digitação manual.
const MOCK_CUSTOMERS = [
  { cardId: "CARD-0091", name: "Marina Souza",   userType: "premium", planId: "ultra" },
  { cardId: "CARD-0142", name: "Rafael Torres",  userType: "standard", planId: "plus" },
  { cardId: "CARD-0207", name: "Beatriz Lima",   userType: "standard", planId: "basic" },
  { cardId: "CARD-0318", name: "João Nakamura",  userType: "premium", planId: "plus" },
  { cardId: "CARD-0455", name: "Camila Freitas", userType: "standard", planId: "ultra" },
  { cardId: "CARD-0509", name: "Diego Almeida",  userType: "premium", planId: "basic" },
];
