// Monday BI Agent Client Engine

// Resolve the API URL to be the same origin the HTML is loaded from
const API_URL = localStorage.getItem("MONDAY_BI_BACKEND_URL") || window.location.origin;

// State Variables
let chatHistory = [];
let boardDiagnostics = null;
let compiledReport = null;
let sectorChartInstance = null;
let stageChartInstance = null;

// Initial Setup on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  lucide.createIcons();
  
  // Load diagnostic details and dashboard KPIs
  syncData();
  
  // Configure Marked.js options
  marked.setOptions({
    gfm: true,
    breaks: true
  });
});

// 1. VIEW TAB NAVIGATION CONTROLLER
function switchTab(tabName) {
  const views = ["dashboard", "chat", "leadership"];
  
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const btn = document.getElementById(`btn-tab-${v}`);
    
    if (v === tabName) {
      el.classList.remove("hidden");
      btn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium transition-all duration-200 bg-violet-600/15 text-violet-400 border-l-2 border-violet-500 shadow-inner";
    } else {
      el.classList.add("hidden");
      btn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium transition-all duration-200 text-zinc-400 hover:bg-white/5 hover:text-zinc-200";
    }
  });

  // Re-sync layout sizes if dashboard is selected
  if (tabName === "dashboard") {
    syncData();
  }
}

// 2. DIAGNOSTICS & DASHBOARD SYNC ENGINE
async function syncData() {
  const syncBtn = document.getElementById("sync-button");
  syncBtn.disabled = true;
  syncBtn.innerText = "Syncing...";
  
  document.getElementById("diag-loading").classList.remove("hidden");
  document.getElementById("diag-content").classList.add("hidden");
  hideError();

  try {
    // 1. Fetch Board Diagnostics
    const boardRes = await fetch(`${API_URL}/api/boards`);
    if (!boardRes.ok) {
      const errData = await boardRes.json();
      throw new Error(errData.detail || "Failed to fetch Monday board diagnostics");
    }
    const boardData = await boardRes.json();
    boardDiagnostics = boardData;
    
    // Render Diagnostics panel
    document.getElementById("deals-board-name").innerText = boardData.deals_board.name;
    document.getElementById("deals-board-id").innerText = `ID: ${boardData.deals_board.id}`;
    document.getElementById("deals-item-count").innerText = `${boardData.deals_board.item_count} items`;

    document.getElementById("wos-board-name").innerText = boardData.work_orders_board.name;
    document.getElementById("wos-board-id").innerText = `ID: ${boardData.work_orders_board.id}`;
    document.getElementById("wos-item-count").innerText = `${boardData.work_orders_board.item_count} items`;

    renderHealthStatus(boardData.warnings);

    // Show Diagnostics content
    document.getElementById("diag-loading").classList.add("hidden");
    document.getElementById("diag-content").classList.remove("hidden");

    // 2. Fetch KPI Metrics for Dashboard & Charts
    const kpiRes = await fetch(`${API_URL}/api/kpis`);
    if (!kpiRes.ok) {
      const errData = await kpiRes.json();
      throw new Error(errData.detail || "Failed to compile dashboard metrics");
    }
    const kpiData = await kpiRes.json();
    
    renderKPIs(kpiData.metrics);
    renderCharts(kpiData.metrics.deals);

  } catch (err) {
    console.error("Sync Error:", err);
    showError(err.message || "Failed to connect to the FastAPI backend. Check your API URL.");
    
    document.getElementById("diag-loading").innerText = "Connection failed";
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerText = "Sync";
    lucide.createIcons();
  }
}

// Render health diagnostic warnings panel
function renderHealthStatus(warnings) {
  const container = document.getElementById("health-alert-container");
  container.innerHTML = "";

  if (warnings && warnings.length > 0) {
    container.innerHTML = `
      <div class="flex gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 mt-2">
        <i data-lucide="alert-circle" class="h-4 w-4 shrink-0 text-amber-500 mt-0.5"></i>
        <div>
          <p class="font-bold text-[9px]">Data warnings (${warnings.length})</p>
          <p class="text-[8px] text-amber-400/80 leading-normal mt-0.5">
            Data cleanliness anomalies found (missing dates/stages).
          </p>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="flex gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-2">
        <i data-lucide="check-circle-2" class="h-4 w-4 shrink-0 text-emerald-500 mt-0.5"></i>
        <div>
          <p class="font-bold text-[9px]">Clean database state</p>
          <p class="text-[8px] text-emerald-400/80 leading-normal mt-0.5">
            No dynamic formatting warnings found.
          </p>
        </div>
      </div>
    `;
  }
}

// 3. DASHBOARD KPI VIEWER
function renderKPIs(metrics) {
  // Format numbers
  const revFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  
  document.getElementById("kpi-revenue").innerText = revFormatter.format(metrics.deals.closed_won_value);
  document.getElementById("kpi-pipeline").innerText = revFormatter.format(metrics.deals.open_value);
  document.getElementById("kpi-winrate").innerText = `${metrics.deals.win_rate_value.toFixed(1)}%`;
  document.getElementById("kpi-completion").innerText = `${metrics.work_orders.completion_rate.toFixed(1)}%`;
}

// 4. CHART.JS VISUALIZER
function renderCharts(dealsMetrics) {
  // --- Sector Revenue Chart ---
  const sectorCtx = document.getElementById('chart-sectors').getContext('2d');
  
  // Sort sectors by revenue
  const sortedSectors = Object.entries(dealsMetrics.sector_performance)
    .sort((a, b) => b[1] - a[1]);
    
  const sectorLabels = sortedSectors.map(s => s[0]);
  const sectorData = sortedSectors.map(s => s[1]);

  if (sectorChartInstance) {
    sectorChartInstance.destroy();
  }

  sectorChartInstance = new Chart(sectorCtx, {
    type: 'bar',
    data: {
      labels: sectorLabels,
      datasets: [{
        label: 'Revenue ($)',
        data: sectorData,
        backgroundColor: 'rgba(139, 92, 246, 0.4)',
        borderColor: 'rgba(139, 92, 246, 0.8)',
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#a1a1aa', font: { size: 9 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#a1a1aa', font: { size: 9 } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // --- Stage Distribution Chart ---
  const stageCtx = document.getElementById('chart-stages').getContext('2d');
  
  const stageLabels = Object.keys(dealsMetrics.stage_distribution);
  const stageData = Object.values(dealsMetrics.stage_distribution);

  if (stageChartInstance) {
    stageChartInstance.destroy();
  }

  stageChartInstance = new Chart(stageCtx, {
    type: 'doughnut',
    data: {
      labels: stageLabels,
      datasets: [{
        data: stageData,
        backgroundColor: [
          'rgba(139, 92, 246, 0.6)',
          'rgba(99, 102, 241, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(113, 113, 122, 0.6)'
        ],
        borderColor: 'rgba(9, 9, 11, 0.8)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#e4e4e7', font: { size: 10 } }
        }
      }
    }
  });
}

// 5. FOUNDER CHAT TERMINAL ENGINE
function handleTextKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    document.getElementById("chat-form").requestSubmit();
  }
}

async function sendChat(e) {
  e.preventDefault();
  const inputEl = document.getElementById("chat-input");
  const query = inputEl.value.trim();
  if (!query) return;

  // Clear welcome placeholder on first message
  const welcome = document.getElementById("chat-welcome");
  if (welcome) welcome.remove();

  // 1. Render User Message
  appendMessage("user", query);
  inputEl.value = "";
  
  // Disable input during generation
  const sendBtn = document.getElementById("send-button");
  sendBtn.disabled = true;
  inputEl.disabled = true;

  // 2. Render Typing Indicator
  const typingId = appendTypingIndicator();

  try {
    hideError();
    
    // Call Chat Endpoint
    const res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        history: chatHistory
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Failed to get response");
    }

    const data = await res.json();
    
    // Remove typing indicator
    document.getElementById(typingId).remove();

    // 3. Render Assistant Response
    appendMessage("assistant", data.response, data.warnings);

    // Save in context memory
    chatHistory.push({ role: "user", content: query });
    chatHistory.push({ role: "assistant", content: data.response });

  } catch (err) {
    console.error("Chat Error:", err);
    document.getElementById(typingId).remove();
    appendMessage("assistant", `### Error\n${err.message || "Failed to retrieve AI insights. Please check backend connection."}`);
    showError(err.message || "Communication failed.");
  } finally {
    sendBtn.disabled = false;
    inputEl.disabled = false;
    inputEl.focus();
    lucide.createIcons();
  }
}

// Trigger query directly from sidebar presets
function askPreset(question) {
  switchTab("chat");
  document.getElementById("chat-input").value = question;
  document.getElementById("chat-form").requestSubmit();
}

// Append message card to feed
function appendMessage(role, text, warnings = []) {
  const container = document.getElementById("chat-messages");
  const isUser = role === "user";
  
  const msgWrapper = document.createElement("div");
  msgWrapper.className = `flex flex-col ${isUser ? "items-end" : "items-start"} animate-fade-in mb-4`;
  
  let htmlContent = "";
  if (isUser) {
    htmlContent = `<div class="max-w-2xl rounded-xl px-5 py-4 text-sm leading-relaxed border border-white/10 bg-zinc-900 text-zinc-200 whitespace-pre-wrap">${text}</div>`;
  } else {
    // Render Markdown response using Marked.js
    const parsedText = marked.parse(text);
    htmlContent = `
      <div class="max-w-3xl rounded-xl px-5 py-4 text-sm leading-relaxed border border-white/[0.06] glass-card text-zinc-300 shadow-md prose-custom">
        ${parsedText}
      </div>
    `;
    
    // If warnings exist, render collapsible diagnostic details box
    if (warnings && warnings.length > 0) {
      htmlContent += `
        <div class="max-w-3xl mt-2 w-full">
          <details class="text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 cursor-pointer outline-none select-none transition-all duration-200">
            <summary class="font-semibold flex items-center gap-1.5 text-amber-400">
              <i data-lucide="alert-circle" class="h-3.5 w-3.5"></i>
              Data quality warnings during extraction (${warnings.length} alerts)
            </summary>
            <ul class="list-disc list-inside mt-2 space-y-1.5 pl-1 leading-normal border-t border-amber-500/10 pt-2 font-mono">
              ${warnings.map(w => `<li>${w}</li>`).join("")}
            </ul>
          </details>
        </div>
      `;
    }
  }
  
  msgWrapper.innerHTML = htmlContent;
  container.appendChild(msgWrapper);
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// Append loading animation
function appendTypingIndicator() {
  const container = document.getElementById("chat-messages");
  const indicatorId = `typing-${Date.now()}`;
  
  const msgWrapper = document.createElement("div");
  msgWrapper.id = indicatorId;
  msgWrapper.className = "flex flex-col items-start animate-fade-in mb-4";
  msgWrapper.innerHTML = `
    <div class="glass-card border-white/[0.06] rounded-xl px-5 py-4 flex items-center gap-1.5 shadow-md">
      <span class="h-2 w-2 rounded-full bg-violet-500 typing-dot"></span>
      <span class="h-2 w-2 rounded-full bg-violet-500 typing-dot"></span>
      <span class="h-2 w-2 rounded-full bg-violet-500 typing-dot"></span>
    </div>
  `;
  
  container.appendChild(msgWrapper);
  container.scrollTop = container.scrollHeight;
  return indicatorId;
}

// 6. EXECUTIVE LEADERSHIP REPORT ENGINE
async function generateReport() {
  document.getElementById("report-empty").classList.add("hidden");
  document.getElementById("report-content").classList.add("hidden");
  document.getElementById("report-generating").classList.remove("hidden");
  document.getElementById("btn-download-report").classList.add("hidden");
  hideError();

  try {
    const res = await fetch(`${API_URL}/api/leadership-summary`, { method: "POST" });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Failed to generate report");
    }
    const data = await res.json();
    compiledReport = data.report;
    
    // Render markdown report body
    document.getElementById("report-markdown-body").innerHTML = marked.parse(data.report);
    
    // Render diagnostics banner inside report view
    const banner = document.getElementById("report-health-summary");
    if (data.warnings && data.warnings.length > 0) {
      banner.className = "flex gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs";
      banner.innerHTML = `
        <i data-lucide="alert-triangle" class="h-5 w-5 shrink-0 text-amber-500"></i>
        <div class="space-y-1">
          <p class="font-semibold">Data Quality Warning</p>
          <p class="text-amber-400/80 leading-relaxed text-[11px]">
            This report contains active warnings about missing metrics or malformed data formats. Details can be inspected in the final section of the report.
          </p>
        </div>
      `;
    } else {
      banner.className = "flex gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs";
      banner.innerHTML = `
        <i data-lucide="check-circle" class="h-5 w-5 shrink-0 text-emerald-500"></i>
        <div class="space-y-1">
          <p class="font-semibold">Clean Data Report</p>
          <p class="text-emerald-400/80 leading-relaxed text-[11px]">
            Monday.com Deals and Work Orders boards have 100% data completion. No errors occurred.
          </p>
        </div>
      `;
    }

    document.getElementById("report-generating").classList.add("hidden");
    document.getElementById("report-content").classList.remove("hidden");
    document.getElementById("btn-download-report").classList.remove("hidden");

  } catch (err) {
    console.error("Report Generation Error:", err);
    document.getElementById("report-generating").classList.add("hidden");
    document.getElementById("report-empty").classList.remove("hidden");
    showError(err.message || "Failed to compile the leadership update.");
  } finally {
    lucide.createIcons();
  }
}

// Download markdown file client-side
function downloadReport() {
  if (!compiledReport) return;
  
  const blob = new Blob([compiledReport], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  
  a.href = url;
  a.download = `leadership_update_${date}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 7. ALERT BAR CONTROL
function showError(msg) {
  document.getElementById("error-message").innerText = msg;
  document.getElementById("error-banner").classList.remove("hidden");
}

function hideError() {
  document.getElementById("error-banner").classList.add("hidden");
}
