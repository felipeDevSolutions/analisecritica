// pdfHandler.js

// Configura o worker do pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Função para extrair texto do PDF usando pdf.js
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

// Função para preencher o formulário com os dados extraídos
function preencherFormulario(dadosCertificado) {
  document.getElementById('codigoCertificado').value = dadosCertificado.codigoCertificado;
  document.getElementById('dataCertificado').value = dadosCertificado.dataCertificado;
  document.getElementById('validadeCertificado').value = dadosCertificado.validadeCertificado;
  document.getElementById('fornecedor').value = dadosCertificado.fornecedor;
  document.getElementById('descricaoEMH').value = dadosCertificado.descricaoEMH;
  document.getElementById('numeroSerieEMH').value = dadosCertificado.numeroSerieEMH;
  document.getElementById('dataAnalise').value = dadosCertificado.dataAnalise;

  // Preenche o campo de tolerância com o valor selecionado
  const porcentagem = document.getElementById('percentagemSelect').value || '5';
  document.getElementById('tolerancia1').value = porcentagem;
  document.getElementById('tolerancia2').value = porcentagem;
  document.getElementById('tolerancia3').value = porcentagem;

  for (let i = 1; i <= 3; i++) {
    document.getElementById(`media${i}`).value = dadosCertificado[`media${i}`] || '';
    document.getElementById(`incerteza${i}`).value = dadosCertificado[`incerteza${i}`] || '';
  }

  for (let i = 0; i < 3; i++) {
    const vvcInput = document.getElementById(`vvc${i + 1}`);
    vvcInput.dispatchEvent(new Event('input'));
  }
}

// Função principal para processar o PDF e preencher o formulário
async function processarCertificado(pdfUrl) {
  const textoPDF = await extractTextFromPDF(pdfUrl);
  const textoLimpo = textoPDF.replace(/\s+/g, ' ').trim();

  const blocoTabela = textoLimpo.split('MÉDIA')[1]?.split('Medida - Padrão')[0]?.trim() || '';

  // Verifique a ordem das medições para determinar como extrair o código do certificado
  const regexMedicao = /(\d+,\d+)\s*ml\/h/g;
  const medias = [];
  let match;
  
  while ((match = regexMedicao.exec(blocoTabela)) !== null) {
    medias.push(parseFloat(match[1].replace(',', '.')));
  }

  let codigoCertificado;
  
  if (medias[3] < medias[7] && medias[7] < medias[11]) {
    // Ordem crescente
    codigoCertificado = textoLimpo.split('Os resultados apresentados nesse certificado foram determinados pela média das 3 medições.')[1]?.split(' Certificado de Calibração')[0]?.trim() || '';
  } else {
    // Ordem decrescente
    codigoCertificado = textoLimpo.split('FATIMA ')[1]?.split(' Certificado de Calibração')[0]?.trim() || '';
  }

  // Continue extraindo os dados como antes
  const regexIncerteza = /(\d+,\d+)/g;
  const incertezas = [];

  while ((match = regexIncerteza.exec(textoLimpo)) !== null) {
    incertezas.push(parseFloat(match[1].replace(',', '.')));
  }

  let media1, media2, media3, incerteza1, incerteza2, incerteza3;

  if (medias[3] < medias[7] && medias[7] < medias[11]) {
    // Ordem crescente
    media1 = medias[11] || '';
    media2 = medias[7] || '';
    media3 = medias[3] || '';
    incerteza1 = incertezas[39] || '';
    incerteza2 = incertezas[31] || '';
    incerteza3 = incertezas[23] || '';
  } else {
    // Ordem decrescente
    media1 = medias[3] || '';
    media2 = medias[7] || '';
    media3 = medias[11] || '';
    incerteza1 = incertezas[23] || '';
    incerteza2 = incertezas[31] || '';
    incerteza3 = incertezas[39] || '';
  }

  const dadosCertificado = {
    codigoCertificado: codigoCertificado,
    dataCertificado: textoLimpo.match(/Data da Emissão:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1]?.trim() || '',
    validadeCertificado: calcularDataValidade(textoLimpo.match(/Data da Emissão:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1]?.trim()),
    fornecedor: 'Fresenius Kabi',
    descricaoEMH: textoLimpo.match(/Identificação do Equipamento\s+(.*?)\s+\d{8}/s)?.[1]?.trim() || '',
    numeroSerieEMH: textoLimpo.match(/Volumat\s+([\d.]+)/)?.[1]?.trim() || '',
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


// Função para calcular a data de validade (um ano após a data de emissão)
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

// Adiciona um listener ao input de arquivo para processar o PDF selecionado
document.getElementById('certificadoInput').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (file && file.type === 'application/pdf') {
    const fileURL = URL.createObjectURL(file);
    processarCertificado(fileURL);
  }
});
