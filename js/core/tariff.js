const tariffRules = {
  demand: [
    { threshold: 0.0, multiplier: 1.00 },
    { threshold: 0.4, multiplier: 1.10 },
    { threshold: 0.7, multiplier: 1.25 },
    { threshold: 0.9, multiplier: 1.50 },
  ],
};

function isInPeakWindow(hour) {
  return PEAK_WINDOWS.some(w => hour >= w.start && hour < w.end);
}

function getActivePeakWindow(hour) {
  return PEAK_WINDOWS.find(w => hour >= w.start && hour < w.end) || null;
}

// `plan` é o objeto do plano do cliente (PLANS.find(...)), não apenas o preço,
// pois o desconto extra de horário de pico depende do plano (Ultra).
function calcPricePerKwh(plan, hour, userType, demandRatio) {
  let price = plan.pricePerKwh;
  const inPeak = isInPeakWindow(hour);

  if (hour >= NIGHT_WINDOW.start && hour < NIGHT_WINDOW.end) price *= NIGHT_WINDOW.multiplier;
  if (inPeak) price *= PEAK_MULTIPLIER;

  const demandRule = [...tariffRules.demand]
    .reverse()
    .find(r => demandRatio >= r.threshold);
  price *= demandRule.multiplier;

  if (userType === "premium") price *= 0.85;

  // Desconto adicional do plano Ultra durante o pico: mantém o incentivo para o
  // cliente permanecer no plano mais rentável mesmo com a sobretaxa de demanda.
  if (inPeak && plan.id === "ultra") price *= ULTRA_PEAK_EXTRA_DISCOUNT;

  return price;
}

function getTariffBreakdown(plan, hour, userType, demandRatio) {
  const inPeak = isInPeakWindow(hour);
  const peakWindow = getActivePeakWindow(hour);

  let timeMultiplier = 1.00;
  let timeName = "Diurno";
  if (hour >= NIGHT_WINDOW.start && hour < NIGHT_WINDOW.end) {
    timeMultiplier = NIGHT_WINDOW.multiplier;
    timeName = "Madrugada";
  }
  if (inPeak) {
    timeMultiplier = PEAK_MULTIPLIER;
    timeName = peakWindow ? peakWindow.label : "Pico";
  }

  const demandRule = [...tariffRules.demand]
    .reverse()
    .find(r => demandRatio >= r.threshold);

  const premiumMultiplier = userType === "premium" ? 0.85 : 1.00;
  const ultraPeakMultiplier = (inPeak && plan.id === "ultra") ? ULTRA_PEAK_EXTRA_DISCOUNT : 1.00;
  const effective = calcPricePerKwh(plan, hour, userType, demandRatio);

  return {
    base: plan.pricePerKwh,
    timeMultiplier,
    timeName,
    demandMultiplier: demandRule.multiplier,
    demandRatio,
    premiumMultiplier,
    ultraPeakMultiplier,
    effective,
  };
}
