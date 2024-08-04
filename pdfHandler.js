// pdfHandler.js

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function extractTextFromPDF(pdfUrl) {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  let extractedText = '';

  textContent.items.forEach(item => {
    extractedText += item.str + ' ';
  });

  return extractedText.trim();
}

document.getElementById('certificadoInput').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (file && file.type === 'application/pdf') {
    const fileURL = URL.createObjectURL(file);
    processarCertificado(fileURL);
  }
});

function calcularDataValidade(dataEmissaoStr) {
  if (!dataEmissaoStr) return '';

  const partesData = dataEmissaoStr.split('/');
  const dia = parseInt(partesData[0], 10);
  const mes = parseInt(partesData[1], 10) - 1;
  const ano = parseInt(partesData[2], 10);

  const dataEmissao = new Date(ano, mes, dia);
  dataEmissao.setFullYear(dataEmissao.getFullYear() + 1);

  const diaValidade = dataEmissao.getDate().toString().padStart(2, '0');
  const mesValidade = (dataEmissao.getMonth() + 1).toString().padStart(2, '0');
  const anoValidade = dataEmissao.getFullYear();

  return `${diaValidade}/${mesValidade}/${anoValidade}`;
}

async function processarCertificado(pdfUrl) {
  const textoPDF = await extractTextFromPDF(pdfUrl);
  const textoLimpo = textoPDF.replace(/\s+/g, ' ').trim();

  const blocoTabela = textoLimpo.split('MÉDIA')[1]?.split('Medida - Padrão')[0]?.trim() || '';

  // Procura pelo texto no formato com vírgula e ml/h ou ml
  const regexMedicao = /(\d+,\d+)\s*ml\/?h?/g; 
  const medias = [];
  let match;
  
  while ((match = regexMedicao.exec(blocoTabela)) !== null) {
    medias.push(parseFloat(match[1].replace(',', '.')));
  }

  // Procura pelo texto no formato xxxxxxxx-xxxx-xxxx ou xxxxxxxx-xxxxx-xxxx ou xxxxxxxx-xxxxxx-xxxx ou xxxxxxxx-xxxxxxx-xxxx
  const codigoCertificado = textoLimpo.match(/(\d{8}-\d{5}-\d{4})/)?.[1] || textoLimpo.match(/(\d{8}-\d{4}-\d{4})/)?.[1] || textoLimpo.match(/(\d{8}-\d{6}-\d{4})/)?.[1] || textoLimpo.match(/(\d{8}-\d{7}-\d{4})/)?.[1] || '';
  
  // Procura pelos primeiros 8 números do codigoCertificado, que é o referente ao numero de Série
  const numeroSerie = codigoCertificado.split('-')[0];

  const regexIncerteza = /(\d+,\d+)/g;
  const incertezas = [];

  while ((match = regexIncerteza.exec(textoLimpo)) !== null) {
    incertezas.push(parseFloat(match[1].replace(',', '.')));
  }

  let media1, media2, media3, incerteza1, incerteza2, incerteza3;

  // Verifica se os dados estão na ordem 100, 50 e 20 ou 20, 50 e 100 e preenche de acordo com a ordem.
  if (medias[3] < medias[7] && medias[7] < medias[11]) {
    media1 = medias[11] || '';
    media2 = medias[7] || '';
    media3 = medias[3] || '';
    incerteza1 = incertezas[39] || '';
    incerteza2 = incertezas[31] || '';
    incerteza3 = incertezas[23] || '';
  } else {
    media1 = medias[3] || '';
    media2 = medias[7] || '';
    media3 = medias[11] || '';
    incerteza1 = incertezas[23] || incertezas[11] || '';
    incerteza2 = incertezas[31] || '';
    incerteza3 = incertezas[39] || '';
  }

  const dadosCertificado = {
    codigoCertificado: codigoCertificado,
    dataCertificado: textoLimpo.match(/Data da Emissão:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1]?.trim() || '',
    validadeCertificado: calcularDataValidade(textoLimpo.match(/Data da Emissão:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1]?.trim()),
    fornecedor: 'Fresenius Kabi',
    descricaoEMH: textoLimpo.match(/Identificação do Equipamento\s+(.*?)\s+\d{8}/s)?.[1]?.trim() || '',
    numeroSerieEMH: numeroSerie,
    dataAnalise: new Date().toISOString().split('T')[0],
    media1: media1,
    media2: media2,
    media3: media3,
    incerteza1: incerteza1,
    incerteza2: incerteza2,
    incerteza3: incerteza3
  };

  console.log(dadosCertificado);
  preencherFormulario(dadosCertificado);
  
}

function preencherFormulario(dadosCertificado) {
  document.getElementById('codigoCertificado').value = dadosCertificado.codigoCertificado;
  document.getElementById('dataCertificado').value = dadosCertificado.dataCertificado;
  document.getElementById('validadeCertificado').value = dadosCertificado.validadeCertificado;
  document.getElementById('fornecedor').value = dadosCertificado.fornecedor;
  document.getElementById('descricaoEMH').value = dadosCertificado.descricaoEMH;
  document.getElementById('numeroSerieEMH').value = dadosCertificado.numeroSerieEMH;
  document.getElementById('dataAnalise').value = dadosCertificado.dataAnalise;

  // Define a tolerância com base na descrição do EMH
  const tolerancia = dadosCertificado.descricaoEMH.toLowerCase().includes("applix") ? '10' : '5'; 
  document.getElementById('toleranciaCertificado').value = tolerancia;
  document.getElementById('tolerancia1').value = tolerancia;
  document.getElementById('tolerancia2').value = tolerancia;
  document.getElementById('tolerancia3').value = tolerancia;

  for (let i = 1; i <= 3; i++) {
    document.getElementById(`media${i}`).value = dadosCertificado[`media${i}`] || '';
    document.getElementById(`incerteza${i}`).value = dadosCertificado[`incerteza${i}`] || '';
  }

  // Dispara o evento 'input' para calcular os resultados
  for (let i = 0; i < 3; i++) {
    const vvcInput = document.getElementById(`vvc${i + 1}`);
    vvcInput.dispatchEvent(new Event('input'));
  }
}