// Período de fechamento: dia 20 de um mês ao dia 19 do mês seguinte
// Ex: período "2026-03" = 20/02/2026 a 19/03/2026

export function getPeriodoAtual() {
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth(); // 0-indexed
  const ano = hoje.getFullYear();

  // Se hoje é dia 20 ou depois, o período atual começou no dia 20 deste mês
  // Se hoje é antes do dia 20, o período atual começou no dia 20 do mês anterior
  let inicioMes, inicioAno;
  if (dia >= 20) {
    inicioMes = mes;
    inicioAno = ano;
  } else {
    inicioMes = mes - 1;
    inicioAno = ano;
    if (inicioMes < 0) { inicioMes = 11; inicioAno = ano - 1; }
  }

  const inicio = new Date(inicioAno, inicioMes, 20);
  const fim = new Date(inicioAno, inicioMes + 1, 19);

  // Label: "Mar/2026" baseado no mês de fechamento (dia 19)
  const label = fim.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');

  return { inicio, fim, label, inicioAno, inicioMes };
}

export function getPeriodos(qtd = 12) {
  // Retorna os últimos N períodos
  const periodos = [];
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear();

  let inicioMes, inicioAno;
  if (dia >= 20) { inicioMes = mes; inicioAno = ano; }
  else { inicioMes = mes - 1; inicioAno = ano; if (inicioMes < 0) { inicioMes = 11; inicioAno = ano - 1; } }

  for (let i = 0; i < qtd; i++) {
    let m = inicioMes - i;
    let a = inicioAno;
    while (m < 0) { m += 12; a--; }
    const inicio = new Date(a, m, 20);
    const fim = new Date(a, m + 1, 19);
    const label = fim.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
    const key = `${a}-${String(m + 1).padStart(2, '0')}`;
    periodos.push({ key, label, inicio, fim });
  }
  return periodos;
}

export function dataEstaNoPeriodo(dataStr, periodoKey) {
  // periodoKey = "YYYY-MM" onde MM é o mês de início (dia 20)
  const [a, m] = periodoKey.split('-').map(Number);
  const inicio = new Date(a, m - 1, 20);
  const fim = new Date(a, m, 19);
  const d = new Date(dataStr + 'T12:00:00');
  return d >= inicio && d <= fim;
}

export function formatPeriodoLabel(periodoKey) {
  const [a, m] = periodoKey.split('-').map(Number);
  const fim = new Date(a, m, 19);
  return fim.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}