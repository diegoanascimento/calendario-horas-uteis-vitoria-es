// A lista de 2026 é o ponto de partida do calendário corporativo da Ocean.
// Carnaval e Quarta-feira de Cinzas são pontos facultativos, porém foram
// mantidos como dias não trabalhados em todos os anos, conforme a regra
// original do calendário fornecido. Outros pontos facultativos não entram.
const DEFAULT_YEAR = 2026;
const YEAR_START = 2024;
const YEAR_END = 2040;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: "Ano Novo" },
  { month: 4, day: 21, name: "Tiradentes" },
  { month: 5, day: 1, name: "Dia do Trabalho" },
  { month: 9, day: 7, name: "Independência do Brasil" },
  { month: 9, day: 8, name: "Nossa Senhora da Vitória" },
  { month: 10, day: 12, name: "Nossa Senhora de Aparecida" },
  { month: 11, day: 2, name: "Finados" },
  { month: 11, day: 15, name: "Proclamação da República" },
  { month: 11, day: 20, name: "Dia Nacional de Zumbi e da Consciência Negra" },
  { month: 12, day: 25, name: "Natal" },
];

// Computus gregoriano (algoritmo de Meeus/Jones/Butcher).
function getEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatISO(date) {
  return date.toISOString().slice(0, 10);
}

function dateFromParts(year, month, day) {
  return formatISO(new Date(Date.UTC(year, month - 1, day)));
}

function offsetDate(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return formatISO(result);
}

function getHolidays(year) {
  const easter = getEaster(year);
  const holidays = FIXED_HOLIDAYS.map(({ month, day, name }) => ({
    date: dateFromParts(year, month, day), name,
  }));

  const mobile = [
    [-48, "Carnaval"],
    [-47, "Carnaval"],
    [-46, "Carnaval"], // Quarta-feira de Cinzas: afastamento integral usado no calendário original.
    [-2, "Sexta-feira da Paixão"],
    [0, "Páscoa"], // Domingo: apenas referência na lista, sem desconto de dias úteis.
    [8, "Nossa Senhora da Penha"],
    [60, "Corpus Christi"],
  ];
  for (const [days, name] of mobile) {
    holidays.push({ date: offsetDate(easter, days), name });
  }
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

const tableBody = document.querySelector("#monthly-table");
const tableFooter = document.querySelector("#monthly-footer");
const monthsGrid = document.querySelector("#months-grid");
const barChart = document.querySelector("#bar-chart");
const chartInsights = document.querySelector("#chart-insights");
const totalBusinessDays = document.querySelector("#total-business-days");
const totalHours = document.querySelector("#total-hours");
const totalWeekdayHolidays = document.querySelector("#total-weekday-holidays");
const calculationNote = document.querySelector("#calculation-note");
const hoursInput = document.querySelector("#hours-per-day");
const holidayToggle = document.querySelector("#count-holidays");
const themeToggle = document.querySelector("#theme-toggle");
const calculatorMonth = document.querySelector("#calculator-month");
const calculatorDays = document.querySelector("#calculator-days");
const calculatorHours = document.querySelector("#calculator-hours");
const hourlyRateInput = document.querySelector("#hourly-rate");
const calculatorResult = document.querySelector("#calculator-result");
const calculatorContext = document.querySelector("#calculator-context");
const paymentResult = document.querySelector("#payment-result");
const paymentContext = document.querySelector("#payment-context");
const summaryGrid = document.querySelector(".summary-grid");
const annualPaymentCard = document.querySelector("#annual-payment-card");
const annualPaymentResult = document.querySelector("#annual-payment-result");
const annualPaymentContext = document.querySelector("#annual-payment-context");

const yearSelector = document.querySelector("#year-selector");
const yearOptions = [];
for (let year = YEAR_START; year <= YEAR_END; year += 1) {
  yearOptions.push(`<option value="${year}">${year}</option>`);
}
yearSelector.innerHTML = yearOptions.join("");
yearSelector.value = String(DEFAULT_YEAR);

function getSelectedYear() {
  return Number(yearSelector.value) || DEFAULT_YEAR;
}
let calculatorHasSelectedInitialMonth = false;

function toISODate(year, monthIndex, day) {
  return dateFromParts(year, monthIndex + 1, day);
}

function getUTCWeekday(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

function isWeekday(isoDate) {
  const day = getUTCWeekday(isoDate);
  return day >= 1 && day <= 5;
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

function formatHours(hours) {
  return `${formatNumber(hours)}h`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateLabel(isoDate) {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

function readNumberInput(input) {
  return Number(String(input.value).replace(",", ".")) || 0;
}

function getHoursPerDay() {
  return readNumberInput(hoursInput) || 8;
}

function shouldDiscountHolidays() {
  return holidayToggle.checked;
}

function getMonthData(year, monthIndex, hoursPerDay, discountHolidays, holidays, holidayMap) {
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const monthHolidays = holidays.filter((holiday) => Number(holiday.date.slice(5, 7)) === monthIndex + 1);

  let weekdays = 0;
  let weekdayHolidays = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isoDate = toISODate(year, monthIndex, day);

    if (!isWeekday(isoDate)) {
      continue;
    }

    weekdays += 1;

    if (holidayMap.has(isoDate)) {
      weekdayHolidays += 1;
    }
  }

  const discountedHolidays = discountHolidays ? weekdayHolidays : 0;
  const businessDays = weekdays - discountedHolidays;

  return {
    name: MONTHS[monthIndex],
    weekdays,
    weekdayHolidays,
    discountedHolidays,
    businessDays,
    hours: businessDays * hoursPerDay,
    holidays: monthHolidays,
  };
}

function getCurrentMonths() {
  const year = getSelectedYear();
  const holidays = getHolidays(year);
  const holidayMap = new Set(holidays.map((holiday) => holiday.date));
  return MONTHS.map((_, index) => getMonthData(
    year, index, getHoursPerDay(), shouldDiscountHolidays(), holidays, holidayMap,
  ));
}

function getDefaultCalculatorMonth() {
  const today = new Date();
  return today.getFullYear() === getSelectedYear() ? String(today.getMonth()) : "custom";
}

function syncCalculatorMonthOptions(months) {
  const currentValue = calculatorHasSelectedInitialMonth ? calculatorMonth.value || "custom" : getDefaultCalculatorMonth();

  calculatorMonth.innerHTML = `
    <option value="custom">Personalizado</option>
    ${months
      .map((month, index) => `<option value="${index}">${month.name} (${month.businessDays} dias)</option>`)
      .join("")}
  `;

  calculatorMonth.value = [...calculatorMonth.options].some((option) => option.value === currentValue)
    ? currentValue
    : "custom";
  calculatorHasSelectedInitialMonth = true;
}

function syncCalculatorFromSelectedMonth(months) {
  if (calculatorMonth.value === "custom") {
    return;
  }

  const selectedMonth = months[Number(calculatorMonth.value)];

  if (!selectedMonth) {
    return;
  }

  calculatorDays.value = selectedMonth.businessDays;
  calculatorHours.value = getHoursPerDay();
}

// Ajusta a fonte do valor para impedir que quantias maiores saiam do cartão.
function fitPaymentResult() {
  if (!paymentResult.clientWidth) return;

  paymentResult.style.fontSize = "";
  paymentResult.style.whiteSpace = "nowrap";
  paymentResult.style.overflowWrap = "normal";

  let fontSize = parseFloat(window.getComputedStyle(paymentResult).fontSize);
  const minimumFontSize = 14;

  while (paymentResult.scrollWidth > paymentResult.clientWidth + 1 && fontSize > minimumFontSize) {
    fontSize = Math.max(minimumFontSize, fontSize - 1);
    paymentResult.style.fontSize = `${fontSize}px`;
  }

  // Valores muito extensos continuam inteiros e visíveis, em mais de uma linha.
  if (paymentResult.scrollWidth > paymentResult.clientWidth + 1) {
    paymentResult.style.whiteSpace = "normal";
    paymentResult.style.overflowWrap = "anywhere";
  }
}

// O valor anual segue os parâmetros gerais do calendário (ano, horas/dia e feriados).
// Dias/horas alterados manualmente na calculadora afetam apenas o cálculo mensal.
function renderAnnualPayment() {
  const rate = readNumberInput(hourlyRateInput);
  const visible = Number.isFinite(rate) && rate > 0;
  annualPaymentCard.hidden = !visible;
  summaryGrid.classList.toggle("has-annual", visible);
  if (!visible) return;

  const yearHours = getCurrentMonths().reduce((sum, month) => sum + month.hours, 0);
  const amount = yearHours * rate;
  annualPaymentResult.textContent = formatCurrency(amount);
  annualPaymentResult.title = formatCurrency(amount);
  annualPaymentContext.textContent = `${formatHours(yearHours)} × ${formatCurrency(rate)}/h`;
}

function renderCalculator() {
  const days = readNumberInput(calculatorDays);
  const hours = readNumberInput(calculatorHours);
  const hourlyRate = readNumberInput(hourlyRateInput);
  const result = days * hours;
  const payment = result * hourlyRate;

  calculatorResult.textContent = formatHours(result);
  calculatorContext.textContent = `${formatNumber(days)} dias úteis x ${formatNumber(hours)}h por dia`;
  paymentResult.textContent = formatCurrency(payment);
  paymentResult.title = formatCurrency(payment);
  window.requestAnimationFrame(fitPaymentResult);
  paymentContext.textContent = hourlyRate > 0
    ? `${formatHours(result)} x ${formatCurrency(hourlyRate)} por hora`
    : "Informe a taxa hora para calcular.";
  renderAnnualPayment();
}

function readStoredTheme() {
  try {
    return localStorage.getItem("ocean-theme");
  } catch {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem("ocean-theme", theme);
  } catch {
    // Local file previews can block storage in a few browser settings.
  }
}

function applyTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  const isDark = normalizedTheme === "dark";

  document.body.dataset.theme = normalizedTheme;
  themeToggle.setAttribute("aria-checked", String(isDark));
  themeToggle.title = isDark ? "Ativar modo claro" : "Ativar modo escuro";
  saveTheme(normalizedTheme);
}

function render() {
  const selectedYear = getSelectedYear();
  document.title = `Horas Úteis ${selectedYear} | Diego Alves do Nascimento`;
  const hoursPerDay = getHoursPerDay();
  const discountHolidays = shouldDiscountHolidays();
  const months = getCurrentMonths();
  const annualDays = months.reduce((sum, month) => sum + month.businessDays, 0);
  const annualHours = months.reduce((sum, month) => sum + month.hours, 0);
  const annualWeekdayHolidays = months.reduce((sum, month) => sum + month.weekdayHolidays, 0);
  const annualWeekdays = months.reduce((sum, month) => sum + month.weekdays, 0);
  const maxHours = Math.max(...months.map((month) => month.hours));
  const minHours = Math.min(...months.map((month) => month.hours));
  const averageHours = annualHours / months.length;
  const averagePosition = maxHours ? (averageHours / maxHours) * 100 : 0;

  totalBusinessDays.textContent = annualDays;
  totalHours.textContent = formatHours(annualHours);
  totalWeekdayHolidays.textContent = annualWeekdayHolidays;
  calculationNote.textContent = !discountHolidays
    ? "Feriados não estão sendo descontados neste cenário."
    : selectedYear === DEFAULT_YEAR
      ? "Feriados em sábado ou domingo aparecem na lista, mas não reduzem dias úteis."
      : "Datas móveis estimadas para o ano. Confirme o calendário corporativo de feriados e pontos facultativos.";

  syncCalculatorMonthOptions(months);
  syncCalculatorFromSelectedMonth(months);
  renderCalculator();

  tableBody.innerHTML = months
    .map(
      (month) => `
        <tr>
          <td class="month-name"><span class="month-badge">${month.name}</span></td>
          <td><span class="value-pill">${month.weekdays}</span></td>
          <td><span class="holiday-pill">${month.weekdayHolidays}</span></td>
          <td><span class="value-pill">${month.businessDays}</span></td>
          <td><span class="hours-pill">${formatHours(month.hours)}</span></td>
        </tr>
      `,
    )
    .join("");

  tableFooter.innerHTML = `
    <tr>
      <td>Total</td>
      <td>${annualWeekdays}</td>
      <td>${annualWeekdayHolidays}</td>
      <td>${annualDays}</td>
      <td>${formatHours(annualHours)}</td>
    </tr>
  `;

  barChart.innerHTML = months
    .map((month) => {
      const width = maxHours ? (month.hours / maxHours) * 100 : 0;
      const isMax = month.hours === maxHours;

      return `
        <div class="bar-row${isMax ? " bar-row--max" : ""}"
             title="${month.name}: ${formatHours(month.hours)} (${month.businessDays} dias úteis)">
          <span class="bar-label">${month.name.slice(0, 3)}</span>
          <span class="bar-track" aria-hidden="true">
            <span class="bar-fill" style="width: ${width}%"></span>
            <span class="bar-average-mark" style="left: ${averagePosition}%"></span>
          </span>
          <span class="bar-value">${formatHours(month.hours)}</span>
        </div>
      `;
    })
    .join("");

  const busiestMonths = months.filter((month) => month.hours === maxHours).map((month) => month.name).join(", ");
  const quietestMonths = months.filter((month) => month.hours === minHours).map((month) => month.name).join(", ");

  chartInsights.innerHTML = `
    <div class="chart-insight"><span>Média mensal</span><strong>${formatHours(averageHours)}</strong></div>
    <div class="chart-insight"><span>Mais horas</span><strong>${busiestMonths}: ${formatHours(maxHours)}</strong></div>
    <div class="chart-insight"><span>Menos horas</span><strong>${quietestMonths}: ${formatHours(minHours)}</strong></div>
  `;

  monthsGrid.innerHTML = months
    .map((month) => {
      const holidayItems = month.holidays
        .map((holiday) => {
          const weekdayLabel = isWeekday(holiday.date) ? "" : " (fim de semana)";
          return `
            <li>
              <span class="holiday-date">${formatDateLabel(holiday.date)}</span>
              <span>${holiday.name}${weekdayLabel}</span>
            </li>
          `;
        })
        .join("");

      return `
        <article class="month-card">
          <header>
            <h3>${month.name}</h3>
            <strong>${formatHours(month.hours)}</strong>
          </header>

          <div class="card-stats">
            <div class="card-stat">
              <span>Dias úteis</span>
              <b>${month.businessDays}</b>
            </div>
            <div class="card-stat">
              <span>Feriados úteis</span>
              <b>${month.weekdayHolidays}</b>
            </div>
          </div>

          ${
            month.holidays.length
              ? `<ul class="holiday-list">${holidayItems}</ul>`
              : `<p class="no-holidays">Sem feriados no calendário.</p>`
          }
        </article>
      `;
    })
    .join("");
}

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

hoursInput.addEventListener("input", render);
yearSelector.addEventListener("change", render);
holidayToggle.addEventListener("change", render);
calculatorMonth.addEventListener("change", () => {
  syncCalculatorFromSelectedMonth(getCurrentMonths());
  renderCalculator();
});
calculatorDays.addEventListener("input", () => {
  calculatorMonth.value = "custom";
  renderCalculator();
});
calculatorHours.addEventListener("input", () => {
  calculatorMonth.value = "custom";
  renderCalculator();
});
hourlyRateInput.addEventListener("input", renderCalculator);
window.addEventListener("resize", () => window.requestAnimationFrame(fitPaymentResult));

applyTheme(readStoredTheme() || "light");
render();
