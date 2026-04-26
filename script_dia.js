/*************************************************
 * VARIÁVEIS GLOBAIS
 *************************************************/
let dados = [];
let chart = null;
let semanaAtiva = null;
let laboratorioAtivo = null;

/*************************************************
 * FUNÇÃO ROBUSTA PARA EXTRAIR O DIA DA DATA
 *************************************************/
function extrairDia(data) {

  // Caso 1: já é Date
  if (data instanceof Date) {
    return data.getDate();
  }

  // Caso 2: número serial do Excel
  if (typeof data === "number") {
    const base = new Date(1899, 11, 30);
    const d = new Date(base.getTime() + data * 86400000);
    return d.getDate();
  }

  // Caso 3: string
  const d = new Date(data);
  if (!isNaN(d)) {
    return d.getDate();
  }

  return null;
}

/*************************************************
 * CARREGAR O EXCEL
 *************************************************/
fetch("Dados.xlsx")
