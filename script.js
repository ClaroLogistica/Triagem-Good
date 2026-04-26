let dados = [];
let chart;
let semanaAtiva = null;

// ===== UTIL: converter data do Excel corretamente =====
function extrairDia(dataExcel) {
  // Caso 1: number serial do Excel
  if (typeof dataExcel === "number") {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + dataExcel * 86400000);
    return d.getDate();
  }

  // Caso 2: string ou Date
  const d = new Date(dataExcel);
  if (!isNaN(d)) return d.getDate();

  return null;
}

// ===== CARREGAR EXCEL =====
fetch("Dados.xlsx")
  .then(res => res.arrayBuffer())
  .then(buffer => {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sheet);

    criarBotoesSemana();
    semanaAtiva = obterSemanas()[0];
    atualizarGrafico();
  });

// ===== SEMANAS =====
function obterSemanas() {
  return [...new Set(dados.map(d => d["semana "]).filter(Boolean))];
}

// ===== BOTÕES =====
function criarBotoesSemana() {
  const container = document.getElementById("botoes-semana");
  container.innerHTML = "";

  obterSemanas().forEach((sem, i) => {
    const btn = document.createElement("button");
    btn.textContent = sem;
    btn.onclick = () => {
      semanaAtiva = sem;
      document.querySelectorAll(".painel-botoes button")
        .forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      atualizarGrafico();
    };
    if (i === 0) btn.classList.add("ativo");
    container.appendChild(btn);
  });
}

// ===== GRÁFICO DIA A DIA (1 A 31) =====
function atualizarGrafico() {
  const labels = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const valores = Array(31).fill(0);

  dados
    .filter(d => d["semana "] === semanaAtiva)
    .forEach(d => {
      const dia = extrairDia(d.Data);
      if (dia && dia >= 1 && dia <= 31) {
        valores[dia - 1] += Number(d.Quantidade || 0);
      }
    });

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("graficoDiario"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Produção por Dia",
        data: valores,
        backgroundColor: "#38bdf8"
      }]
    },
    options: {
      animation: false,
      responsive: true,
      scales: {
        x: {
          type: "category",
          ticks: { color: "#e5e7eb" },
          title: {
            display: true,
            text: "Dia do Mês",
            color: "#e5e7eb"
          }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#e5e7eb" },
          title: {
            display: true,
            text: "Quantidade Produzida",
            color: "#e5e7eb"
          }
        }
      },
      plugins: {
        legend: { labels: { color: "#e5e7eb" } }
      }
    }
  });
}
``
