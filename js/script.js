// 1. Inicialização e Variáveis Globais:

let files = [];
let currentPDFIndex = 0;
let pdfDoc = null;
let modal = document.getElementById("pdf-modal");
let formModal = document.getElementById("form-modal");
let closeBtns = document.querySelectorAll(".close");
let prevPdfBtn = document.getElementById("prev-pdf");
let nextPdfBtn = document.getElementById("next-pdf");
let prevFormBtn = document.getElementById("prev-form");
let nextFormBtn = document.getElementById("next-form");
let conformidadeSpans;
let aprovacaoRadios;
let dadosPDF = []; // Array para armazenar os dados extraídos de cada PDF
let responsavelAnalise = '';

// 2. Funções para Gerenciar o LocalStorage:

function limparLocalStorage() {
  localStorage.clear();
}

// Função para salvar os dados do formulário no LocalStorage
function salvarDadosFormulario() {
  const observacoes = document.querySelectorAll('input[id^="observacao"]');
  const radios = document.querySelectorAll('input[type="radio"]');
  const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');

  observacoes.forEach(obs => {
    const chaveLocalStorage = `${obs.id}-${currentPDFIndex}`; 
    localStorage.setItem(chaveLocalStorage, obs.value);
  });

  radios.forEach(radio => {
    if (radio.checked) {
      const chaveLocalStorage = `${radio.name}-${currentPDFIndex}`;
      localStorage.setItem(chaveLocalStorage, radio.dataset.index);
    }
  });

  inputs.forEach(input => {
    const chaveLocalStorage = `${input.id}-${currentPDFIndex}`; 
    
    // Adiciona a condição para salvar apenas se o input não for responsavelAnalise
    if (input.id !== 'responsavelAnalise') { 
      localStorage.setItem(chaveLocalStorage, input.value);
    }
  });

  // Salva Observações Finais
  const observacoesFinais = document.getElementById('observacoesFinais');
  const chaveObservacoesFinais = `observacoesFinais-${currentPDFIndex}`;
  localStorage.setItem(chaveObservacoesFinais, observacoesFinais.value);
}

// Função para carregar os dados do formulário do LocalStorage
function carregarDadosFormulario() {
  const observacoes = document.querySelectorAll('input[id^="observacao"]');
  const radios = document.querySelectorAll('input[type="radio"]');
  const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');

  observacoes.forEach(obs => {
    const chaveLocalStorage = `${obs.id}-${currentPDFIndex}`;
    obs.value = localStorage.getItem(chaveLocalStorage) || '';
  });

  radios.forEach(radio => {
    const chaveLocalStorage = `${radio.name}-${currentPDFIndex}`;
    if (localStorage.getItem(chaveLocalStorage) === radio.dataset.index) {
      radio.checked = true;
    }
  });

  inputs.forEach(input => {
    const chaveLocalStorage = `${input.id}-${currentPDFIndex}`;
    input.value = localStorage.getItem(chaveLocalStorage) || '';
  });

  // Carrega Observações Finais
  const observacoesFinais = document.getElementById('observacoesFinais');
  const chaveObservacoesFinais = `observacoesFinais-${currentPDFIndex}`;
  observacoesFinais.value = localStorage.getItem(chaveObservacoesFinais) || '';
}

// Função para carregar os dados do formulário do LocalStorage
function carregarDadosFormulario() {
  const observacoes = document.querySelectorAll('input[id^="observacao"]');
  const radios = document.querySelectorAll('input[type="radio"]');
  const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');

  observacoes.forEach(obs => {
    obs.value = localStorage.getItem(obs.id) || '';
  });

  radios.forEach(radio => {
    if (localStorage.getItem(radio.name) === radio.dataset.index) {
      radio.checked = true;
    }
  });

  inputs.forEach(input => {
    const chaveLocalStorage = `${input.id}-${currentPDFIndex}`; // Chave única por input e índice do PDF
    input.value = localStorage.getItem(chaveLocalStorage) || '';
  });
}

// 3. Funções para Gerenciar Modais:

closeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const modalId = btn.dataset.modal;
    const modalToClose = document.getElementById(modalId);
    modalToClose.style.display = "none";
  });
});

// 4. Funções para Gerenciar Arquivos:

// Função para gerar miniaturas em ordem
async function generateThumbnailsInOrder(files) {
  for (let i = 0; i < files.length; i++) {
    await generateThumbnail(files[i], i);
  }
}

// Gera a miniatura do PDF
async function generateThumbnail(file, index) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function () {
      const pdfData = new Uint8Array(reader.result);
      pdfjsLib.getDocument({ data: pdfData }).promise.then(pdf => {
        pdf.getPage(1).then(page => {
          const scale = 0.3;
          const viewport = page.getViewport({ scale: scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          page.render(renderContext).promise.then(() => {
            const img = document.createElement('img');
            img.src = canvas.toDataURL();
            img.alt = `PDF ${index + 1}`;
            img.setAttribute('data-index', index);
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
              openPDFModal(index);
            });
            document.getElementById('thumbnails').appendChild(img);
            resolve();
          }).catch(error => {
            console.error('Erro ao renderizar a página:', error);
            reject(error);
          });
        }).catch(error => {
          console.error('Erro ao obter a página do PDF:', error);
          reject(error);
        });
      }).catch(error => {
        console.error('Erro ao carregar o documento PDF:', error);
        reject(error);
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

// Manipula a seleção de arquivos
async function handleFileSelect(event) {
  files = [];
  dadosPDF = []; 
  const fileList = event.target.files;

  for (let i = 0; i < fileList.length; i++) {
    files.push(fileList[i]);

    await extractDataFromPDF(fileList[i]);
  }

  const thumbnails = document.getElementById('thumbnails');
  thumbnails.innerHTML = '';
  currentPDFIndex = 0;

  generateThumbnailsInOrder(files);

  limparLocalStorage();
}

// Extrai dados do PDF
async function extractDataFromPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function () {
      const pdfData = new Uint8Array(reader.result);
      pdfjsLib.getDocument({ data: pdfData }).promise.then(pdf => {
        pdf.getPage(1).then(page => {
          page.getTextContent().then(textContent => {
            let extractedText = '';
            textContent.items.forEach(item => {
              extractedText += item.str + ' ';
            });
            extractedText = extractedText.replace(/\s+/g, ' ').trim();

            // Extração de dados do PDF (personalizado para o seu PDF)
            const codigoCertificado = extractedText.match(/(\d{8}-\d{5}-\d{4})/)?.[1] || extractedText.match(/(\d{8}-\d{4}-\d{4})/)?.[1] || extractedText.match(/(\d{8}-\d{6}-\d{4})/)?.[1] || extractedText.match(/(\d{8}-\d{7}-\d{4})/)?.[1] || '';
            const numeroSerie = codigoCertificado.split('-')[0];
            const dataCertificado = extractedText.match(/Data da Emissão:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1]?.trim() || '';
            const validadeCertificado = calcularDataValidade(dataCertificado);
            const descricaoEMH = extractedText.match(/Identificação do Equipamento\s+(.*?)\s+\d{8}/s)?.[1]?.trim() || '';
            const fornecedor = 'Fresenius Kabi'; 

            // Extração da Média das Leituras (considerando até 12 medidas)
            const blocoTabela = extractedText.split('MÉDIA')[1]?.split('Medida - Padrão')[0]?.trim() || '';
            const regexMedicao = /(\d+,\d+)\s*ml\/?h?/g;
            const medias = [];
            let match;
            while ((match = regexMedicao.exec(blocoTabela)) !== null) {
              medias.push(parseFloat(match[1].replace(',', '.')));
            }

            // Extração da Incerteza Expandida (considerando até 40 incertezas)
            const regexIncerteza = /(\d+,\d+)/g;
            const incertezas = [];
            while ((match = regexIncerteza.exec(extractedText)) !== null) {
              incertezas.push(parseFloat(match[1].replace(',', '.')));
            }

            // Lógica para definir as médias e incertezas corretas
            let media1, media2, media3, incerteza1, incerteza2, incerteza3;
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

            dadosPDF.push({
              codigoCertificado,
              numeroSerie,
              dataCertificado,
              validadeCertificado,
              descricaoEMH,
              fornecedor,
              media1,
              media2,
              media3,
              incerteza1,
              incerteza2,
              incerteza3,
              vvc1: 100, // Valor padrão para VVC1
              vvc2: 50,  // Valor padrão para VVC2
              vvc3: 20   // Valor padrão para VVC3
            });
            resolve();
          }).catch(error => reject(error));
        }).catch(error => reject(error));
      }).catch(error => reject(error));
    };
    reader.readAsArrayBuffer(file);
  });
}

// Carrega o PDF no visualizador
function loadPDF(index) {
  currentPDFIndex = index;
  const file = files[index];
  const reader = new FileReader();
  reader.onload = function () {
    const pdfData = new Uint8Array(reader.result);
    pdfjsLib.getDocument({ data: pdfData }).promise.then(pdf => {
      pdfDoc = pdf;
      renderPage(1);
      updateNavigationButtons();
    }).catch(error => {
      console.error('Erro ao carregar o documento PDF:', error);
    });
  };
  reader.readAsArrayBuffer(file);
}

// Renderiza a página do PDF no canvas
function renderPage(num) {
  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: 5 });
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    page.render(renderContext);
  });
}

// 5. Funções para Abrir Modais:

// Abre o modal do visualizador de PDF
function openPDFModal(index) {
  currentPDFIndex = index;
  loadPDF(currentPDFIndex);
  modal.style.display = "block";
}

// Abre o modal do formulário
function openFormModal() {
  loadForm(currentPDFIndex);
  formModal.style.display = "block";
}

// Abre o modal do formulário e atualiza a contagem de arquivos
function openFormModalAndCount() {
  const formContainer = document.getElementById('form-container');
  formContainer.innerHTML = ''; 

  document.getElementById('responsavelAnaliseInput').value = '';
  const responsavelAnaliseFields = document.querySelectorAll('input[id="responsavelAnalise"]');
  responsavelAnaliseFields.forEach(field => {
    field.value = '';
  });

  loadForm(currentPDFIndex);
  formModal.style.display = "block";
  updateNavigationButtons();
}

// 6. Funções para Manipular Dados do PDF:

// Calcula a data de validade com base na data de emissão
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

// Carrega o formulário e preenche com os dados do PDF
function loadForm(index) {
  const formContainer = document.getElementById('form-container');
  formContainer.innerHTML = ''; 

  // Carrega o CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/formulario.css';
  document.head.appendChild(link);

  fetch('formulario.html')
    .then(response => response.text())
    .then(html => {
      formContainer.innerHTML = html;

      // Carrega os dados do formulário do LocalStorage
      const observacoes = document.querySelectorAll('input[id^="observacao"]');
      const radios = document.querySelectorAll('input[type="radio"]');
      const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
      const textareas = document.querySelectorAll('textarea');

      observacoes.forEach(obs => {
        const chaveLocalStorage = `${obs.id}-${currentPDFIndex}`;
        obs.value = localStorage.getItem(chaveLocalStorage) || '';
      });

      radios.forEach(radio => {
        const chaveLocalStorage = `${radio.name}-${currentPDFIndex}`;
        if (localStorage.getItem(chaveLocalStorage) === radio.dataset.index) {
          radio.checked = true;
        }
      });

      inputs.forEach(input => {
        const chaveLocalStorage = `${input.id}-${currentPDFIndex}`;
        input.value = localStorage.getItem(chaveLocalStorage) || '';
      });

      textareas.forEach(textarea => {
        const chaveLocalStorage = `${textarea.id}-${currentPDFIndex}`;
        textarea.value = localStorage.getItem(chaveLocalStorage) || '';
      });

      const dados = dadosPDF[index];

      if (dados) {
        document.getElementById('codigoCertificado').value = dados.codigoCertificado;
        document.getElementById('dataCertificado').value = dados.dataCertificado;
        document.getElementById('validadeCertificado').value = dados.validadeCertificado;
        document.getElementById('fornecedor').value = dados.fornecedor;
        document.getElementById('descricaoEMH').value = dados.descricaoEMH;
        document.getElementById('numeroSerieEMH').value = dados.numeroSerie;
        document.getElementById('media1').value = dados.media1;
        document.getElementById('media2').value = dados.media2;
        document.getElementById('media3').value = dados.media3;
        document.getElementById('incerteza1').value = dados.incerteza1;
        document.getElementById('incerteza2').value = dados.incerteza2;
        document.getElementById('incerteza3').value = dados.incerteza3;
        document.getElementById('vvc1').value = dados.vvc1;
        document.getElementById('vvc2').value = dados.vvc2;
        document.getElementById('vvc3').value = dados.vvc3;

        const tolerancia = dados.descricaoEMH.toLowerCase().includes("applix") ? '10' : '5';
        document.getElementById('toleranciaCertificado').value = tolerancia;
        document.getElementById('tolerancia1').value = tolerancia;
        document.getElementById('tolerancia2').value = tolerancia;
        document.getElementById('tolerancia3').value = tolerancia;

        const dataAnaliseInput = document.getElementById('dataAnalise');
        const dataAtual = new Date();
        const dia = dataAtual.getDate().toString().padStart(2, '0');
        const mes = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
        const ano = dataAtual.getFullYear();
        const dataFormatada = `${dia}/${mes}/${ano}`;
        dataAnaliseInput.value = dataFormatada;

        // Define conformidadeSpans e aprovacaoRadios antes do loop
        conformidadeSpans = document.querySelectorAll('span[id^="conformidade"]');
        aprovacaoRadios = document.querySelectorAll('input[name="aprovacao"]');

        // Calcula os resultados e atualiza a aprovação
        for (let i = 1; i <= 3; i++) {
          calcularResultados(i - 1);
        }
        atualizarAprovacaoFinal();

        currentPDFIndex = index;
        updateNavigationButtons();

        // Adiciona event listeners para os campos do formulário
        const vvcInputs = document.querySelectorAll('input[id^="vvc"]');
        const mediaInputs = document.querySelectorAll('input[id^="media"]');
        const incertezaInputs = document.querySelectorAll('input[id^="incerteza"]');
        const toleranciaInputs = document.querySelectorAll('input[id^="tolerancia"]');

        for (let i = 0; i < vvcInputs.length; i++) {
          vvcInputs[i].addEventListener('input', () => {
            calcularResultados(i);
            atualizarAprovacaoFinal();
            salvarDadosFormulario();
          });
          mediaInputs[i].addEventListener('input', () => {
            calcularResultados(i);
            atualizarAprovacaoFinal();
            salvarDadosFormulario();
          });
          incertezaInputs[i].addEventListener('input', () => {
            calcularResultados(i);
            atualizarAprovacaoFinal();
            salvarDadosFormulario();
          });
          toleranciaInputs[i].addEventListener('input', () => {
            calcularResultados(i);
            atualizarAprovacaoFinal();
            salvarDadosFormulario();
          });
        }

        // Adiciona event listener para atualizar a aprovação final
        // quando a conformidade normativa mudar
        conformidadeSpans.forEach(span => {
          span.addEventListener('DOMSubtreeModified', () => {
            atualizarAprovacaoFinal();
          });
        });

        // Gerencia o campo "Responsável pela Análise"
        const responsavelAnaliseInput = document.getElementById('responsavelAnaliseInput');
        responsavelAnalise = localStorage.getItem('responsavelAnalise') || '';
        responsavelAnaliseInput.value = responsavelAnalise;

        function atualizarDadosAnalise() {
          const responsavelAnaliseFields = document.querySelectorAll('input[id="responsavelAnalise"]');
          responsavelAnaliseFields.forEach(field => {
            field.value = responsavelAnalise;
          });

          const dataAnaliseFields = document.querySelectorAll('input[id="dataAnalise"]');
          dataAnaliseFields.forEach(field => {
            field.value = dataFormatada; 
          });
        }

        atualizarDadosAnalise();

        responsavelAnaliseInput.addEventListener('input', () => {
          responsavelAnalise = responsavelAnaliseInput.value;
          atualizarDadosAnalise();
          responsavelAnaliseInput.value = responsavelAnalise;
          localStorage.setItem('responsavelAnalise', responsavelAnalise);
        });

      } else {
        console.error('Dados do PDF não encontrados!');
      }

      // Salva os dados do formulário no LocalStorage ao alterar os campos
      observacoes.forEach(obs => {
        obs.addEventListener('input', salvarDadosFormulario);
      });

      radios.forEach(radio => {
        radio.addEventListener('change', salvarDadosFormulario);
      });

      inputs.forEach(input => {
        if (input.id !== 'responsavelAnalise') { 
          input.addEventListener('input', salvarDadosFormulario);
        }
      });

      textareas.forEach(textarea => {
        textarea.addEventListener('input', salvarDadosFormulario);
      });

    })
    .catch(error => {
      console.error('Erro ao carregar o formulário:', error);
    });
}

// 7. Funções para Calcular Resultados e Atualizar Formulário:

// Função para calcular os resultados (M-Uk, M+Uk), (MÍN, MÁX) e Conformidade
function calcularResultados(index) {
  const vvc = parseFloat(document.getElementById(`vvc${index + 1}`).value) || 0;
  const media = parseFloat(document.getElementById(`media${index + 1}`).value) || 0;
  const incerteza = parseFloat(document.getElementById(`incerteza${index + 1}`).value) || 0;
  const tolerancia = parseFloat(document.getElementById(`tolerancia${index + 1}`).value) || 0;

  const resultadoMin = media - incerteza;
  const resultadoMax = media + incerteza;
  document.getElementById(`resultadoMedicao${index + 1}`).textContent = `${resultadoMin.toFixed(3)}, ${resultadoMax.toFixed(3)}`;

  const esperadoMin = vvc - (vvc * (tolerancia / 100));
  const esperadoMax = vvc + (vvc * (tolerancia / 100));
  document.getElementById(`resultadoEsperado${index + 1}`).textContent = `${esperadoMin.toFixed(3)}, ${esperadoMax.toFixed(3)}`;

  if (resultadoMin >= esperadoMin && resultadoMax <= esperadoMax) {
    document.getElementById(`conformidade${index + 1}`).textContent = 'CONFORME';
    document.getElementById(`conformidade${index + 1}`).style.color = 'green';
  } else {
    document.getElementById(`conformidade${index + 1}`).textContent = 'NÃO CONFORME';
    document.getElementById(`conformidade${index + 1}`).style.color = 'red';
  }

  atualizarAprovacaoFinal();
}

// Função para atualizar a aprovação final com base nos resultados
function atualizarAprovacaoFinal() {
  let todasConformes = true;

  // Verifica se ALGUM dos spans de conformidade é 'NÃO CONFORME'
  for (let i = 0; i < conformidadeSpans.length; i++) {
    if (conformidadeSpans[i].textContent === 'NÃO CONFORME') {
      todasConformes = false;
      break; // Sai do loop, pois já encontramos um 'NÃO CONFORME'
    }
  }

  const aprovacaoSim = document.getElementById('aprovacao-sim');
  const aprovacaoNao = document.getElementById('aprovacao-nao');

  if (todasConformes) {
    aprovacaoSim.checked = true;
    aprovacaoNao.checked = false;
  } else {
    aprovacaoSim.checked = false;
    aprovacaoNao.checked = true; // Marca "NÃO" se houver algum 'NÃO CONFORME'
  }
}


// 8. Navegação entre PDFs:

// Navegação do PDF
function nextPDF() {
  if (currentPDFIndex < files.length - 1) {
    currentPDFIndex++;
    openPDFModal(currentPDFIndex);
    loadForm(currentPDFIndex);
    updateNavigationButtons();
  }
}

function prevPDF() {
  if (currentPDFIndex > 0) {
    currentPDFIndex--;
    openPDFModal(currentPDFIndex);
    loadForm(currentPDFIndex);
    updateNavigationButtons();
  }
}

// Navegação do Formulário
function nextForm() {
  salvarDadosFormulario(); 
  if (currentPDFIndex < files.length - 1) {
    currentPDFIndex++;
    loadForm(currentPDFIndex);
    updateNavigationButtons();
  }
}

function prevForm() {
  salvarDadosFormulario();
  if (currentPDFIndex > 0) {
    currentPDFIndex--;
    loadForm(currentPDFIndex);
    updateNavigationButtons();
  }
}

// 9. Funções Auxiliares:

// Atualiza os botões de navegação
function updateNavigationButtons() {
  prevPdfBtn.disabled = currentPDFIndex === 0;
  nextPdfBtn.disabled = currentPDFIndex === files.length - 1;
  prevFormBtn.disabled = currentPDFIndex === 0;
  nextFormBtn.disabled = currentPDFIndex === files.length - 1;

  prevPdfBtn.style.backgroundColor = prevPdfBtn.disabled ? "#e0e0e0" : "";
  nextPdfBtn.style.backgroundColor = nextPdfBtn.disabled ? "#e0e0e0" : "";
  prevFormBtn.style.backgroundColor = prevFormBtn.disabled ? "#e0e0e0" : "";
  nextFormBtn.style.backgroundColor = nextFormBtn.disabled ? "#e0e0e0" : "";

  let fileCountSpanPdf = document.getElementById('file-count-pdf');
  if (!fileCountSpanPdf) {
    const span = document.createElement('span');
    span.id = 'file-count-pdf';
    span.style.margin = '0 10px'; 
    document.querySelector('#pdf-modal .pdf-navigation').appendChild(span);
  }
  fileCountSpanPdf.textContent = `${currentPDFIndex + 1} de ${files.length}`;

  let fileCountSpanForm = document.getElementById('file-count-form');
  if (!fileCountSpanForm) {
    const span = document.createElement('span');
    span.id = 'file-count-form';
    span.style.margin = '0 10px';
    document.querySelector('#form-modal .pdf-navigation').appendChild(span);
  }
  fileCountSpanForm.textContent = `${currentPDFIndex + 1} de ${files.length}`;
}

// 10. Event Listeners para Botões de Navegação:

prevPdfBtn.addEventListener("click", prevPDF);
nextPdfBtn.addEventListener("click", nextPDF);
prevFormBtn.addEventListener("click", prevForm);
nextFormBtn.addEventListener("click", nextForm);

// 11. Event Listeners:

document.getElementById('certificadoInput').addEventListener('change', (event) => {
  limparLocalStorage(); // Limpa antes de carregar novos arquivos
  handleFileSelect(event);
});
document.getElementById('analyze-button').addEventListener('click', openFormModalAndCount);

// Event Listener para o botão "Ver PDF" na modal do formulário
document.getElementById('open-pdf-from-form').addEventListener('click', () => {
  openPDFModal(currentPDFIndex);
});
