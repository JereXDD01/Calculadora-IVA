// ===== State =====
let lastResult = null;
const STORAGE_KEY = 'iva_calc_history_cl_v4';
const IVA_RATE = 0.19;

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  setupInputs();
});

// ===== Input Handlers & Interlocking =====
function setupInputs() {
  const netoInput = document.getElementById('netoInput');
  const brutoInput = document.getElementById('brutoInput');
  const markupInput = document.getElementById('markupInput');

  // Format inputs as user types and handle cross-updates + automatic calculation
  netoInput.addEventListener('input', (e) => {
    let raw = e.target.value.replace(/\D/g, '');
    let num = raw ? parseInt(raw, 10) : 0;
    
    if (num > 0) {
      e.target.value = formatNumberRaw(num);
      let calculatedBruto = Math.round(num * (1 + IVA_RATE));
      brutoInput.value = formatNumberRaw(calculatedBruto);
    } else {
      e.target.value = '';
      brutoInput.value = '';
    }
    calculate(false);
  });

  brutoInput.addEventListener('input', (e) => {
    let raw = e.target.value.replace(/\D/g, '');
    let num = raw ? parseInt(raw, 10) : 0;

    if (num > 0) {
      e.target.value = formatNumberRaw(num);
      let calculatedNeto = Math.round(num / (1 + IVA_RATE));
      netoInput.value = formatNumberRaw(calculatedNeto);
    } else {
      e.target.value = '';
      netoInput.value = '';
    }
    calculate(false);
  });

  markupInput.addEventListener('input', (e) => {
    let raw = e.target.value.replace(/[^0-9.]/g, '');
    e.target.value = raw;
    calculate(false);
  });
}

// ===== Helper Formatters =====
function formatCLP(value) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatNumberRaw(n) {
  return new Intl.NumberFormat('es-CL').format(n);
}

function parseInputValue(str) {
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

// ===== Calculation Logic =====
function calculate(showFeedback = true) {
  const netoVal = parseInputValue(document.getElementById('netoInput').value);
  const brutoVal = parseInputValue(document.getElementById('brutoInput').value);
  const markupPct = parseFloat(document.getElementById('markupInput').value) || 0;
  const productName = document.getElementById('productNameInput').value.trim() || 'Sin Nombre';

  if (!netoVal && !brutoVal) {
    clearResultsPanel();
    return;
  }

  let neto = 0;
  let bruto = 0;
  let iva = 0;

  if (netoVal > 0) {
    neto = netoVal;
    iva = Math.round(neto * IVA_RATE);
    bruto = neto + iva;
  } else if (brutoVal > 0) {
    bruto = brutoVal;
    neto = Math.round(bruto / (1 + IVA_RATE));
    iva = bruto - neto;
  }

  // Calculate Selling Price (Precio Venta)
  let netoConMarkup = Math.round(neto * (1 + markupPct / 100));
  let precioVentaFinal = Math.round(netoConMarkup * (1 + IVA_RATE));

  lastResult = {
    productName,
    neto: Math.round(neto),
    iva: Math.round(iva),
    bruto: Math.round(bruto),
    markup: markupPct,
    netoConMarkup,
    precioVentaFinal
  };

  displayResults(lastResult);
}

function clearResultsPanel() {
  document.getElementById('resultsPanel').classList.remove('visible');
  lastResult = null;
}

// ===== Display =====
function displayResults(r) {
  document.getElementById('resNetoVal').textContent = formatCLP(r.neto);
  document.getElementById('resIvaVal').textContent = formatCLP(r.iva);
  document.getElementById('resBrutoVal').textContent = formatCLP(r.bruto);

  // Update Selling Price Display
  const ventaValEl = document.getElementById('resPrecioVentaVal');
  const ventaCardEl = document.getElementById('sellingPriceCard');
  const markupAlertEl = document.getElementById('markupAlert');

  if (r.markup > 0) {
    ventaValEl.textContent = formatCLP(r.precioVentaFinal);
    ventaCardEl.style.display = 'block';
    markupAlertEl.style.display = 'none';
  } else {
    ventaCardEl.style.display = 'none';
    markupAlertEl.style.display = 'flex';
  }

  document.getElementById('resultsPanel').classList.add('visible');
}

function clearCalculator() {
  document.getElementById('productNameInput').value = '';
  document.getElementById('netoInput').value = '';
  document.getElementById('brutoInput').value = '';
  document.getElementById('markupInput').value = '';
  clearResultsPanel();
  showToast('🧹 Campos limpiados');
}

// ===== History System =====
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function saveToHistory() {
  if (!lastResult) {
    showToast('⚠️ Primero realiza un cálculo');
    return;
  }

  // Pick up updated product name in case user changed it after typing numbers
  const productName = document.getElementById('productNameInput').value.trim() || 'Sin Nombre';
  lastResult.productName = productName;

  const history = loadHistory();
  const now = new Date();

  const entry = {
    id: Date.now(),
    dateStr: now.toLocaleDateString('es-CL'),
    timeStr: now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    ...lastResult,
  };

  history.unshift(entry);
  if (history.length > 50) history.pop();

  saveHistory(history);
  renderHistory();
  showToast('💾 Guardado en el historial');
}

function deleteHistoryEntry(id) {
  const history = loadHistory().filter(e => e.id !== id);
  saveHistory(history);
  renderHistory();
}

function clearHistory() {
  if (loadHistory().length === 0) return;
  if (confirm('¿Limpiar todo el historial?')) {
    saveHistory([]);
    renderHistory();
    showToast('🗑️ Historial eliminado');
  }
}

function renderHistory() {
  const history = loadHistory();
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');

  list.querySelectorAll('.history-item').forEach(el => el.remove());

  if (history.length === 0) {
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  history.forEach(entry => {
    const item = createHistoryItem(entry);
    list.appendChild(item);
  });
}

function createHistoryItem(entry) {
  const div = document.createElement('div');
  div.className = 'history-item';

  const hasMarkup = entry.markup > 0;
  
  div.innerHTML = `
    <div class="history-item-header">
      <span class="history-product-name" title="${entry.productName}">${entry.productName}</span>
      <span class="history-datetime">${entry.dateStr} · ${entry.timeStr}</span>
    </div>
    
    <div class="history-minimal-row">
      <div class="history-min-col">
        <span class="lbl">Neto:</span>
        <span class="val">${formatCLP(entry.neto)}</span>
      </div>
      <div class="history-min-col">
        <span class="lbl">Bruto:</span>
        <span class="val">${formatCLP(entry.bruto)}</span>
      </div>
      ${hasMarkup ? `
        <div class="history-min-col accent-col">
          <span class="lbl">Venta (+${entry.markup}%):</span>
          <span class="val accent-txt">${formatCLP(entry.precioVentaFinal)}</span>
        </div>
      ` : `
        <div class="history-min-col">
          <span class="lbl">Venta (Base):</span>
          <span class="val">${formatCLP(entry.precioVentaFinal)}</span>
        </div>
      `}
    </div>

    <button class="history-delete-btn" onclick="deleteHistoryEntry(${entry.id})" title="Eliminar">×</button>
  `;
  return div;
}

// ===== Copy =====
function copyResults() {
  if (!lastResult) return;
  const r = lastResult;
  let text = `=== Cálculo: ${r.productName} ===\nNeto Base: ${formatCLP(r.neto)}\nIVA (19%): ${formatCLP(r.iva)}\nBruto Base: ${formatCLP(r.bruto)}\n`;
  if (r.markup > 0) {
    text += `Markup: ${r.markup}%\nNeto con Markup: ${formatCLP(r.netoConMarkup)}\n`;
  }
  text += `Precio Venta Final: ${formatCLP(r.precioVentaFinal)}`;
  
  navigator.clipboard.writeText(text).then(() => showToast('📋 Copiado al portapapeles'));
}

// ===== Toast =====
let toastTimeout;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 2000);
}
