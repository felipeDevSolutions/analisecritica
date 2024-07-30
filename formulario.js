const vvcInputs = document.querySelectorAll('input[id^="vvc"]');
const mediaInputs = document.querySelectorAll('input[id^="media"]');
const incertezaInputs = document.querySelectorAll('input[id^="incerteza"]');
const toleranciaInputs = document.querySelectorAll('input[id^="tolerancia"]');
const resultadoMedicaoSpans = document.querySelectorAll('span[id^="resultadoMedicao"]');
const resultadoEsperadoInputs = document.querySelectorAll('input[id^="resultadoEsperado"]');
const conformidadeSpans = document.querySelectorAll('span[id^="conformidade"]');
const aprovacaoRadios = document.querySelectorAll('input[name="aprovacao"]');

function calcularResultados(index) {
  const vvc = parseFloat(vvcInputs[index].value) || 0;
  const media = parseFloat(mediaInputs[index].value) || 0;
  const incerteza = parseFloat(incertezaInputs[index].value) || 0;
  const tolerancia = parseFloat(toleranciaInputs[index].value) || 0; 

  // Calcula Resultado da Medição (M-Uk, M+Uk)
  const resultadoMin = media - incerteza;
  const resultadoMax = media + incerteza;
  resultadoMedicaoSpans[index].textContent = `${resultadoMin.toFixed(3)}, ${resultadoMax.toFixed(3)}`;

  // Calcula Resultado Esperado (MÍN, MÁX) em relação ao V.V.C.
  const esperadoMin = vvc - (vvc * (tolerancia / 100)); // Calcula a porcentagem da tolerância
  const esperadoMax = vvc + (vvc * (tolerancia / 100)); // Calcula a porcentagem da tolerância
  resultadoEsperadoInputs[index].value = `${esperadoMin.toFixed(3)}, ${esperadoMax.toFixed(3)}`;

  // Avalia a Conformidade
  if (resultadoMin >= esperadoMin && resultadoMax <= esperadoMax) {
    conformidadeSpans[index].textContent = 'CONFORME';
    conformidadeSpans[index].style.color = 'green';
  } else {
    conformidadeSpans[index].textContent = 'NÃO CONFORME';
    conformidadeSpans[index].style.color = 'red';
  }
}

function atualizarAprovacaoFinal() {
  let todasConformes = true;
  for (let i = 0; i < conformidadeSpans.length; i++) {
    if (conformidadeSpans[i].textContent !== 'CONFORME') {
      todasConformes = false;
      break; 
    }
  }

  if (todasConformes) {
    aprovacaoRadios[0].checked = true; 
  } else {
    aprovacaoRadios[1].checked = true;
  }
}

// Adiciona evento de input a cada campo para recalcular os resultados
for (let i = 0; i < vvcInputs.length; i++) {
  vvcInputs[i].addEventListener('input', () => {
    calcularResultados(i);
    atualizarAprovacaoFinal(); // Atualiza a aprovação final após o cálculo
  });
  mediaInputs[i].addEventListener('input', () => {
    calcularResultados(i);
    atualizarAprovacaoFinal(); // Atualiza a aprovação final após o cálculo
  });
  incertezaInputs[i].addEventListener('input', () => {
    calcularResultados(i);
    atualizarAprovacaoFinal(); // Atualiza a aprovação final após o cálculo
  });
  toleranciaInputs[i].addEventListener('input', () => {
    calcularResultados(i);
    atualizarAprovacaoFinal(); // Atualiza a aprovação final após o cálculo
  });
}

// Executa o cálculo inicial ao carregar a página
for (let i = 0; i < vvcInputs.length; i++) {
  calcularResultados(i);
}