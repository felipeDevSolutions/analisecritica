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

// --- Função para salvar os dados do formulário no LocalStorage e no array dadosPDF ---
function salvarDadosFormulario() {
  const observacoes = document.querySelectorAll('input[id^="observacao"]');
  const radios = document.querySelectorAll('input[type="radio"]');
  const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
  const textareas = document.querySelectorAll('textarea');

  // Objeto para armazenar os dados do formulário atual
  const dadosFormulario = {};

  observacoes.forEach(obs => {
    const chaveLocalStorage = `${obs.id}-${currentPDFIndex}`;
    localStorage.setItem(chaveLocalStorage, obs.value);
    dadosFormulario[obs.id] = obs.value; // Salva no objeto
  });

  radios.forEach(radio => {
    if (radio.checked) {
      const chaveLocalStorage = `${radio.name}-${currentPDFIndex}`;
      localStorage.setItem(chaveLocalStorage, radio.dataset.index);
  
      // Salva 'checked' no atributo correto do objeto
      dadosFormulario[`${radio.id}`] = 'checked';
    }
  });

  inputs.forEach(input => {
    const chaveLocalStorage = `${input.id}-${currentPDFIndex}`;
    if (input.id !== 'responsavelAnalise') {
      localStorage.setItem(chaveLocalStorage, input.value);
      dadosFormulario[input.id] = input.value; // Salva no objeto
    }
  });

  textareas.forEach(textarea => {
    const chaveLocalStorage = `${textarea.id}-${currentPDFIndex}`;
    localStorage.setItem(chaveLocalStorage, textarea.value);
    dadosFormulario[textarea.id] = textarea.value; // Salva no objeto
  });

  // Salva o Responsável pela Análise no objeto
  dadosFormulario['responsavelAnalise'] = document.getElementById('responsavelAnaliseInput').value;

  // Salva os dados do formulário no array dadosPDF
  dadosPDF[currentPDFIndex] = dadosFormulario;
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
        // Dados do Certificado
        document.getElementById('codigoCertificado').value = dados.codigoCertificado;
        document.getElementById('dataCertificado').value = dados.dataCertificado;
        document.getElementById('validadeCertificado').value = dados.validadeCertificado;

        // Dados do Equipamento
        document.getElementById('fornecedor').value = dados.fornecedor;
        document.getElementById('descricaoEMH').value = dados.descricaoEMH;
        document.getElementById('numeroSerieEMH').value = dados.numeroSerie;

        // Criar as linhas da tabela dinamicamente
        let linhasTabela = '';
        for (let i = 1; i <= 3; i++) {
          linhasTabela += `
            <tr>
              <td class="coluna-vvc"><input type="number" id="vvc${i}" value="${dados[`vvc${i}`] || ''}"></td>
              <td class="coluna-media"><input type="number" id="media${i}" value="${dados[`media${i}`] || ''}"></td>
              <td class="coluna-incerteza"><input type="number" id="incerteza${i}" value="${dados[`incerteza${i}`] || ''}"></td>
              <td class="coluna-tolerancia"><input type="text" id="tolerancia${i}" value="${dados[`tolerancia${i}`] || ''}" readonly></td>
              <td class="coluna-muk"><span id="resultadoMedicao${i}"></span></td>
              <td class="coluna-resultado-esperado"><span id="resultadoEsperado${i}"></span></td>
              <td><span id="conformidade${i}"></span></td>
            </tr>
          `;
        }

        // Inserir as linhas da tabela no placeholder
        const tbody = formContainer.querySelector('tbody');
        tbody.innerHTML = linhasTabela;

        // Tolerância
        const tolerancia = dados.descricaoEMH.toLowerCase().includes("applix") ? '10' : '5';
        document.getElementById('toleranciaCertificado').value = tolerancia;
        document.getElementById('tolerancia1').value = tolerancia;
        document.getElementById('tolerancia2').value = tolerancia;
        document.getElementById('tolerancia3').value = tolerancia;

        // Data da Análise
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
          const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
              if (mutation.type === 'childList') {
                atualizarAprovacaoFinal();
              }
            });
          });

          observer.observe(span, { childList: true });
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

document.getElementById('baixar-analise').addEventListener('click', () => {
  gerarPDFAnalise();
});


// --- Estilos de Impressão ---
const estilosDeImpressao = {
  '*': {
    margin: '0mm',
    padding: '0mm',
  },
  'body': {
    width: '105mm',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '297mm', 
    fontFamily: 'Arial, sans-serif',
  },
  '.formulario-container': {
    width: '105mm',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    marginTop: '0mm',

    padding: '0mm',
    color: '#343d4b',
    fontSize: '6pt',
  },
  '.form-section': {
    width: '105mm',
    display: 'flex',
    flexDirection: 'column',
    margin: '0mm',
    padding: '0mm',
  },
  '.logo-container': {
    width: '105mm', 
    height: '10mm',
    marginTop: '10mm',
  },
  'img': {
    width: '20mm',
    height: 'auto',
  },
  '.title': {
    textAlign: 'center',
    color: '#343d4b',
    marginBottom: '5px',
  },
  'h2': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '105mm',
    color: '#343d4b',
    marginTop: '2mm',
    marginBottom: '3mm',
    borderBottom: '1px solid #4dca6a',
    padding: '1mm',
    backgroundColor: '#e1e2e1',
    fontSize: '7pt',
  },
  // --- Centralização Vertical nos Inputs e Textareas ---
  'input[type="text"], input[type="date"], input[type="number"], textarea, select': {
    width: '100%',
    height: '5mm',
    padding: '0', // Remova padding desnecessário
    fontSize: '6pt',
    color: '#4c596d',
    textAlign: 'center', 
    borderRadius:'2px',
    // Centralização Vertical:
    display: 'table-cell', // Transforma o input em uma célula de tabela
    verticalAlign: 'middle', // Centraliza verticalmente na célula
    border: 'none', // Remove a borda dos inputs no PDF      
  },
  // Especificamente para os campos de observação
  'input[id^="observacao"]': { 
    textAlign: 'left',
  },
  '.cabecalho, .header-group, .btn-upload': {
    display: 'none', 
  },
  '.page-break-after-dados-certificado': {
    marginTop: '0mm',
    marginBottom: '3mm',
  },
  '.page-break-after-dados-emh': {
    marginTop: '3mm',
    marginBottom: '3mm',
  },
  '.page-break-after-resultados': {
    marginTop: '3mm',
    marginBottom: '20mm',
  },
  '.checklist': {
    marginBottom: '14mm',
  },
  '.observacoesFinais': {
    textAlign: 'left', 
    marginTop: '5mm',
    marginBottom: '3mm',
  },
  '.grid-container': {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(25mm, 1fr))',
    gap: '4mm',
  },
  '.form-group': {
    display: 'flex',
    flexDirection: 'column',
  },
  'label': {
    fontWeight: 'bold',
    marginBottom: '3px',
    fontSize: '6pt',
  },
  'textarea': {
    height: '15mm', 
    textAlign: 'left', // Alinha o texto à esquerda
    padding: '3px',
  },

  'table': {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '3px',
    tableLayout: 'fixed', 
  },
  'th, td': { 
    padding: '1mm',
    textAlign: 'left',
    fontSize: '5pt',
    overflow: 'hidden', 
  },
  'th': {
    backgroundColor: '#41554b',
    color: '#fff',
    fontWeight: 'bold',
  },
  '.coluna-vvc': {
    width: '5mm',
  },
  '.coluna-media': {
    width: '13mm',
  },
  '.coluna-incerteza': {
    width: '15mm',
  },
  '.coluna-tolerancia': {
    width: '15mm',
  },
  '.coluna-muk': {
    width: '20mm',
  },
  '.checklist table th:first-child, .checklist table td:first-child': {
    width: '8mm',
    textAlign: 'center',
  },
  '.checklist table th:nth-child(2), .checklist table td:nth-child(2)': {
    width: '50mm', 
  },
  '.checklist table th:nth-child(3), .checklist table td:nth-child(3), .checklist table th:nth-child(4), .checklist table td:nth-child(4)': {
    width: '8mm', 
  },
  '.form-group-aprovacao': {
    display: 'flex',
    gap: '5px',
    alignItems: 'center',
  },

  // --- Estilos para os Radio Buttons ---
  'input[type="radio"]': {
    appearance: 'none',
    width: '6pt', 
    height: '6pt',
    border: '1px solid #4c596d',
    borderRadius: '0', 
    outline: 'none',
    cursor: 'pointer',
    marginRight: '3mm', // Adicione espaço à direita

    // Para exibir o "v" e "x":
    '&:checked::before': { // Use &:checked::before
      content: '"✓"',
      display: 'block',
      textAlign: 'center',
      color: '#fff',
      fontSize: '5pt',
      lineHeight: '6pt',
    },
    '&:not(:checked)::before': { // Use &:not(:checked)::before
      content: '"✗"',
      display: 'block',
      textAlign: 'center',
      color: '#4c596d',
      fontSize: '5pt',
      lineHeight: '6pt', 
    },
  },

  
};


// --- Função para Gerar PDF ---
async function gerarPDFAnalise() {
  try {
    if (dadosPDF.length === 0) {
      alert('Nenhum arquivo para baixar.');
      return;
    }

    if (dadosPDF.length === 1) {
      // Se houver apenas um PDF, faça o download diretamente
      const dadosFormulario = dadosPDF[0];
      gerarPDFUnico(dadosFormulario);
    } else {
      // Se houver vários PDFs, crie um arquivo .zip
      const zip = new JSZip();
      const folder = zip.folder('Analises_Crítica_Certificados'); 

      for (let i = 0; i < dadosPDF.length; i++) {
        const dadosFormulario = dadosPDF[i];
        const html = await obterHTMLFormulario(dadosFormulario);

        // Crie o PDF e adicione à pasta dentro do .zip
        const pdf = await gerarPDF(html, dadosFormulario.codigoCertificado);
        folder.file(`Analise_Crítica_Certificado_${dadosFormulario.codigoCertificado}.pdf`, pdf, { binary: true });
      }

      zip.generateAsync({ type: 'blob' }).then(function (content) {
        saveAs(content, 'Analises_Crítica_Certificados.zip');
      });
    }
  } catch (error) {
    console.error('Erro ao gerar o PDF:', error);
  }
}

// Função auxiliar para gerar um único PDF
async function gerarPDFUnico(dadosFormulario) {
  const html = await obterHTMLFormulario(dadosFormulario);
  const doc = new jspdf.jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 5;
  doc.setProperties({
    title: `Analise_Crítica_Certificado_${dadosFormulario.codigoCertificado}`,
    author: 'Seu Nome ou da Empresa',
    creator: 'Seu Nome ou da Empresa',
  });

  doc.html(html, {
    callback: (doc) => {
      doc.save(`Analise_Crítica_Certificado_${dadosFormulario.codigoCertificado}.pdf`);
    },
    x: margin,
    y: margin,
    html2canvas: {
      scale: 0.5,
      useCORS: true,
      onclone: (doc) => {
        Object.keys(estilosDeImpressao).forEach(seletor => {
          const elementos = doc.querySelectorAll(seletor);
          elementos.forEach(elemento => {
            Object.assign(elemento.style, estilosDeImpressao[seletor]);
          });
        });
      }
    }
  });
}

// Função auxiliar para obter o HTML do formulário preenchido
async function obterHTMLFormulario(dadosFormulario) {
  const response = await fetch('formulario.html');
  let html = await response.text();

  // Calcula os resultados e formata a string HTML da tabela
  let resultadosHTML = '';
  for (let k = 1; k <= 3; k++) {
    const vvc = parseFloat(dadosFormulario[`vvc${k}`]) || 0;
    const media = parseFloat(dadosFormulario[`media${k}`]) || 0;
    const incerteza = parseFloat(dadosFormulario[`incerteza${k}`]) || 0;
    const tolerancia = dadosFormulario.descricaoEMH.toLowerCase().includes("applix") ? 10 : 5;

    const resultadoMin = media - incerteza;
    const resultadoMax = media + incerteza;
    const resultadoMedicao = `${resultadoMin.toFixed(3)}, ${resultadoMax.toFixed(3)}`;

    const esperadoMin = vvc - (vvc * (tolerancia / 100));
    const esperadoMax = vvc + (vvc * (tolerancia / 100));
    const resultadoEsperado = `${esperadoMin.toFixed(3)}, ${esperadoMax.toFixed(3)}`;

    const conformidade = (resultadoMin >= esperadoMin && resultadoMax <= esperadoMax) ? 'CONFORME' : 'NÃO CONFORME';
    const corConformidade = (conformidade === 'CONFORME') ? 'green' : 'red';

    resultadosHTML += `
      <tr>
        <td>${vvc}</td>
        <td>${media}</td>
        <td>${incerteza}</td>
        <td>${tolerancia}</td>
        <td>${resultadoMedicao}</td>
        <td>${resultadoEsperado}</td>
        <td style="color: ${corConformidade};">${conformidade}</td>
      </tr>
    `;
  }

  html = html.replace('<tbody>', '<tbody>' + resultadosHTML);

  for (const chave in dadosFormulario) {
    html = html.replaceAll(`{${chave}}`, dadosFormulario[chave] || '');
  }

  return html;
}

// Função auxiliar para gerar o PDF usando jspdf.html()
async function gerarPDF(htmlContent, nomeArquivo) {
  return new Promise((resolve, reject) => {
    const doc = new jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    doc.html(htmlContent, {
      callback: (doc) => {
        const pdfOutput = doc.output('arraybuffer'); 
        resolve(pdfOutput);
      },
      x: 5,
      y: 5,
      html2canvas: {
        scale: 0.5,
        useCORS: true,
        onclone: (doc) => {
          Object.keys(estilosDeImpressao).forEach(seletor => {
            const elementos = doc.querySelectorAll(seletor);
            elementos.forEach(elemento => {
              Object.assign(elemento.style, estilosDeImpressao[seletor]);
            });
          });
        }
      }
    });
  });
}

// Funções para aplicar e remover estilos de impressão
function aplicarEstiloImpressao() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/formulario.css'; // Ou o caminho para o seu CSS de impressão
  link.media = 'print';
  document.head.appendChild(link);
}

function removerEstiloImpressao() {
  const links = document.querySelectorAll('link[media="print"]');
  links.forEach(link => link.remove());
}