let dados = [];
let chart = null;

let localAtivo = null;
let terminalAtivo = null;

/* ===== UTIL ===== */
function extrairDia(data) {
  if (data instanceof Date) return data.getDate();
  if (typeof data === "number") {
    const base = new Date(1899, 11, 30);
    return new Date(base.getTime() + data * 86400000).getDate();
  }
  const d = new Date(data);
  return isNaN(d) ? null : d.getDate();
}

/* ===== CARREGAR EXCEL ===== */
fetch("Dados.xlsx")
  .then(r => r.arrayBuffer())
  .then(b => {
    const wb = XLSX.read(b, { type: "array" });
    const sh = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sh);

    criarBotoesLocal();
    criarBotoesTerminais();
    atualizarTudo();
  });

/* ===== LISTAS ===== */
function obterLocais() {
  return [...new Set(dados.map(d => d["Local"]).filter(Boolean))];
}

function obterTerminais() {
  return [...new Set(dados.map(d => d["Terminais"]).filter(Boolean))];
}

/* ===== BOTÕES ===== */
function criarBotoesLocal() {
  const div = document.getElementById("botoes-lab");
  div.innerHTML = "";

  criarBotao(div, "Todos", () => { localAtivo = null; atualizarTudo(); }, true);

  obterLocais().forEach(l => {
    criarBotao(div, l, () => { localAtivo = l; atualizarTudo(); });
  });
}

function criarBotoesTerminais() {
  const div = document.getElementById("botoes-terminais");
  div.innerHTML = "";

  criarBotao(div, "Todos", () => { terminalAtivo = null; atualizarTudo(); }, true);

  obterTerminais().forEach(t => {
    criarBotao(div, t, () => { terminalAtivo = t; atualizarTudo(); });
  });
}

function criarBotao(container, texto, acao, ativo = false) {
  const b = document.createElement("button");
  b.textContent = texto;
  if (ativo) b.classList.add("ativo");

  b.onclick = () => {
    container.querySelectorAll("button").forEach(x => x.classList.remove("ativo"));
    b.classList.add("ativo");
    acao();
  };

  container.appendChild(b);
}

/* ===== ATUALIZA TUDO ===== */
function atualizarTudo() {
  atualizarKPIs();
  atualizarGrafico();
  atualizarResumoSemanal();
}

/* ===== KPIs ===== */
function atualizarKPIs() {
  const base = dados
    .filter(d => !localAtivo || d["Local"] === localAtivo)
    .filter(d => !terminalAtivo || d["Terminais"] === terminalAtivo);

  const totalSelecionado = base.reduce((s, d) => s + Number(d.Quantidade || 0), 0);
  const totalMes = dados.reduce((s, d) => s + Number(d.Quantidade || 0), 0);

  document.getElementById("kpi-selecionado").textContent = totalSelecionado.toLocaleString("pt-BR");
  document.getElementById("kpi-mes").textContent = totalMes.toLocaleString("pt-BR");
}

/* ===== GRÁFICO ===== */
function atualizarGrafico() {
  const labels = Array.from({ length: 31 }, (_, i) => i + 1);
  const valores = Array(31).fill(0);

  dados
    .filter(d => !localAtivo || d["Local"] === localAtivo)
    .filter(d => !terminalAtivo || d["Terminais"] === terminalAtivo)
    .forEach(d => {
      const dia = extrairDia(d.Data);
      if (dia) valores[dia - 1] += Number(d.Quantidade || 0);
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
      plugins: {
        legend: { display: false }
      }
    },
    plugins: [{
      id: "labels",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "11px Arial";
        ctx.textAlign = "center";
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
          const v = valores[i];
          if (v > 0) ctx.fillText(v.toLocaleString("pt-BR"), bar.x, bar.y - 5);
        });
        ctx.restore();
      }
    }]
  });
}

/* ===== RESUMO SEMANAL ===== */
function atualizarResumoSemanal() {
  const container = document.getElementById("resumo-semanal");
  container.innerHTML = "";

  // aplica filtros de Local e Terminais
  const base = dados
    .filter(d => !localAtivo || d["Local"] === localAtivo)
    .filter(d => !terminalAtivo || d["Terminais"] === terminalAtivo);

  const totalMes = base.reduce(
    (s, d) => s + Number(d.Quantidade || 0),
    0
  );

  const porSemana = {};

  base.forEach(d => {
    // 🔴 AQUI ESTÁ A CORREÇÃO CRÍTICA
    let semanaValor = null;

    Object.keys(d).forEach(k => {
      if (k.toLowerCase().includes("semana")) {
        semanaValor = d[k];
      }
    });

    if (!semanaValor) return;

    porSemana[semanaValor] =
      (porSemana[semanaValor] || 0) + Number(d.Quantidade || 0);
  });

  Object.keys(porSemana)
    .sort()
    .forEach(sem => {
      const total = porSemana[sem];
      const perc =
        totalMes > 0 ? Math.round((total / totalMes) * 100) : 0;

      const div = document.createElement("div");
      div.className = "sem-box";
      div.innerHTML = `
        <span>${sem}</span>
        <span>${total.toLocaleString("pt-BR")}</span>
        <span class="percentual">${perc}%</span>
      `;

      container.appendChild(div);
    });
}
