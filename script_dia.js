/*************************************************
 * VARIÁVEIS GLOBAIS
 *************************************************/
let dados = [];
let chart = null;

let filtroTipo = null;
let filtroGiro = [];
let filtroDep = [];
let filtroTecnologias = [];
let filtroLocais = [];

/*************************************************
 * UTIL
 *************************************************/
function extrairDia(data) {
  if (data instanceof Date) return data.getDate();
  if (typeof data === "number") {
    const base = new Date(1899, 11, 30);
    return new Date(base.getTime() + data * 86400000).getDate();
  }
  const d = new Date(data);
  return isNaN(d) ? null : d.getDate();
}

/*************************************************
 * CARREGA EXCEL
 *************************************************/
fetch(new URL("Dados.xlsx", window.location.href))
  .then(r => {
    if (!r.ok) throw new Error("Erro ao carregar Dados.xlsx");
    return r.arrayBuffer();
  })
  .then(b => {
    const wb = XLSX.read(b, { type: "array" });
    const sh = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sh);
    console.log("✅ Excel carregado:", dados.length);
    atualizarTudo();
  })
  .catch(err => console.error(err));

/*************************************************
 * FILTRO CENTRAL
 *************************************************/
function aplicarFiltros() {
  let base = [...dados];

  if (filtroLocais.length > 0) {
    base = base.filter(d => filtroLocais.includes(d.Local));
  }

  if (filtroTipo && filtroTecnologias.length > 0) {
    base = base.filter(d => filtroTecnologias.includes(d[filtroTipo]));
  }

  if (filtroGiro.length > 0) {
    base = base.filter(d => filtroGiro.includes(d.Giro));
  }

  if (filtroDep.length > 0) {
    base = base.filter(d => filtroDep.includes(d["Dep."]));
  }

  return base;
}

/*************************************************
 * ATUALIZAÇÃO GERAL
 *************************************************/
function atualizarTudo() {
  if (!dados.length) return;

  console.log("📦 Total de dados:", dados.length);

  const base = aplicarFiltros();
  console.log("🎯 Base após filtros:", base.length);

  atualizarKPIs();
  atualizarGrafico();
  atualizarResumoSemanal();
}

/*************************************************
 * KPIs
 *************************************************/
function atualizarKPIs() {
  const base = aplicarFiltros();

  document.getElementById("kpi-selecionado").textContent =
    base.reduce((s, d) => s + Number(d.Quantidade || 0), 0).toLocaleString("pt-BR");

  document.getElementById("kpi-mes").textContent =
    dados.reduce((s, d) => s + Number(d.Quantidade || 0), 0).toLocaleString("pt-BR");
}

/*************************************************
 * GRÁFICO
 *************************************************/
function atualizarGrafico() {
  const labels = Array.from({ length: 31 }, (_, i) => i + 1);
  const valores = Array(31).fill(0);

  const base = aplicarFiltros();

  base.forEach(d => {
    const dia = extrairDia(d.Data);
    if (dia) valores[dia - 1] += Number(d.Quantidade || 0);
  });

  if (chart) {
    chart.destroy();
    chart = null;
  }

  const canvas = document.getElementById("graficoDiario");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

 chart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: labels,
    datasets: [{
      data: valores,
      borderRadius: 6,
      barPercentage: 0.9,
      categoryPercentage: 0.9,
      backgroundColor: (context) => {
        const value = context.raw || 0;
        const max = Math.max(...valores) || 1;

        const intensidade = value / max;

        const r = Math.round(2 + intensidade * 77);
        const g = Math.round(6 + intensidade * 203);
        const b = Math.round(23 + intensidade * 174);

        return `rgb(${r}, ${g}, ${b})`;
      }
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    animation: false,

    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#e5e7eb" }
      },
      y: {
        display: false
      }
    }
  }
});

// ✅ NÃO ESQUECE ISSO
atualizarFaixaSemanas(base);

}

/*************************************************
 * SEMANAS
 *************************************************/
function atualizarFaixaSemanas(base) {
  const div = document.getElementById("faixa-semanas");
  div.innerHTML = "";
  const map = {};

  base.forEach(d => {
    const dia = extrairDia(d.Data);
    let sem = Object.keys(d).find(k => k.toLowerCase().includes("semana"));
    if (dia && sem) {
      if (!map[d[sem]]) map[d[sem]] = [];
      map[d[sem]].push(dia);
    }
  });

  Object.entries(map).forEach(([s, d]) => {
    const el = document.createElement("div");
    el.style.gridColumn = `${Math.min(...d)} / ${Math.max(...d) + 1}`;
    el.textContent = s;
    div.appendChild(el);
  });
}

/*************************************************
 * RESUMO
 *************************************************/
function atualizarResumoSemanal() {
  const c = document.getElementById("resumo-semanal");
  c.innerHTML = "";
  const base = aplicarFiltros();
  const total = base.reduce((s,d)=>s+Number(d.Quantidade||0),0);
  const m={};

  base.forEach(d=>{
    let s = Object.keys(d).find(k=>k.toLowerCase().includes("semana"));
    if(s) m[d[s]]=(m[d[s]]||0)+Number(d.Quantidade||0);
  });

  Object.entries(m).forEach(([s,t])=>{
    c.innerHTML += `<div class="sem-box"><span>${s}</span><span>${t}</span><span>${Math.round((t/total)*100)||0}%</span></div>`;
  });
}

/*************************************************
 * MODAIS + FILTROS
 *************************************************/
document.getElementById("btn-local").onclick = () => {
  montarLocais();
  document.getElementById("modal-local").classList.add("active");
};

document.getElementById("btn-filtros").onclick = () =>
  document.getElementById("modal-filtros").classList.add("active");

document.querySelectorAll(".modal").forEach(m =>
  m.onclick = e => e.target===m && m.classList.remove("active")
);

document.querySelectorAll("input[name='tipo']").forEach(r =>
  r.onchange = () => { filtroTipo=r.value; montarTecnologias(); }
);

document.getElementById("btn-aplicar").onclick = () => {
  filtroGiro=[...document.querySelectorAll(".chk-giro:checked")].map(c=>c.value);
  filtroDep=[...document.querySelectorAll(".chk-dep:checked")].map(c=>c.value);
  atualizarTudo();
  document.getElementById("modal-filtros").classList.remove("active");
};

document.getElementById("btn-limpar").onclick = () => {
  filtroTipo=null; filtroGiro=[]; filtroDep=[]; filtroTecnologias=[];
  document.querySelectorAll("#modal-filtros input").forEach(i=>i.checked=false);
  document.getElementById("lista-tecnologia").innerHTML="";
  atualizarTudo();
};

/*************************************************
 * LISTAS
 *************************************************/
function montarLocais() {
  const l = document.getElementById("lista-local");
  l.innerHTML = "";

  [...new Set(dados.map(d => d.Local).filter(Boolean))]
    .forEach(v => {
      const label = document.createElement("label");

      const c = document.createElement("input");
      c.type = "checkbox";
      c.value = v;

      c.onchange = () => {
        filtroLocais = [...l.querySelectorAll("input:checked")]
          .map(x => x.value);
      };

      label.appendChild(c);
      label.append(" " + v);

      l.appendChild(label);
    });
}
/*************************************************
 * MONTAR TECNOLOGIA
 *************************************************/

function montarTecnologias() {
  const l = document.getElementById("lista-tecnologia");
  l.innerHTML = "";
  if (!filtroTipo) return;

  [...new Set(dados.filter(d => d[filtroTipo]).map(d => d[filtroTipo]))]
    .forEach(v => {
      const label = document.createElement("label");

      const c = document.createElement("input");
      c.type = "checkbox";
      c.value = v;

      c.onchange = () => {
        filtroTecnologias = [...l.querySelectorAll("input:checked")]
          .map(x => x.value);
      };

      label.appendChild(c);
      label.append(" " + v);

      l.appendChild(label);
    });
}
