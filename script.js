// Configuração Supabase
const SUPABASE_URL = 'https://jjtfzteodsazbdkyubhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqdGZ6dGVvZHNhemJka3l1YmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxOTY0OTYsImV4cCI6MjA4MTc3MjQ5Nn0.8oUi04Xcv-ueGn2xLBU3ClGs9JYcd6L3i9QJ2ppGYNY';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado global
let allData = [];

// Formatar valor em reais (sem símbolo)
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Formatar data
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

// Atualizar cards
function updateCards(data) {
  const creditos = data.filter(d => d.tipo === 'credito');
  const debitos = data.filter(d => d.tipo === 'debito');
  
  const totalCreditos = creditos.reduce((sum, d) => sum + parseFloat(d.valor), 0);
  const totalDebitos = debitos.reduce((sum, d) => sum + parseFloat(d.valor), 0);
  const saldo = totalCreditos - totalDebitos;
  
  document.getElementById('total-creditos').textContent = formatCurrency(totalCreditos);
  document.getElementById('count-creditos').textContent = `${creditos.length} lançamentos`;
  
  document.getElementById('total-debitos').textContent = formatCurrency(totalDebitos);
  document.getElementById('count-debitos').textContent = `${debitos.length} lançamentos`;
  
  document.getElementById('saldo').textContent = formatCurrency(saldo);
  
  const saldoCard = document.querySelector('.card.saldo');
  const saldoStatus = document.getElementById('saldo-status');
  
  if (saldo >= 0) {
    saldoCard.classList.remove('negativo');
    saldoCard.classList.add('positivo');
    saldoStatus.textContent = 'Saldo positivo ✓';
  } else {
    saldoCard.classList.remove('positivo');
    saldoCard.classList.add('negativo');
    saldoStatus.textContent = 'Saldo negativo ✗';
  }
}

// Atualizar tabela
function updateTable(data) {
  const tbody = document.getElementById('tbody-lancamentos');
  
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhum lançamento encontrado</td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(item => `
    <tr>
      <td>${formatDate(item.data)}</td>
      <td class="tipo-${item.tipo}">${item.tipo === 'credito' ? '↑ Crédito' : '↓ Débito'}</td>
      <td class="valor-${item.tipo}">${formatCurrency(item.valor)}</td>
      <td>${item.categoria || '-'}</td>
      <td>${item.parte || '-'}</td>
      <td>${item.fornecedor || '-'}</td>
      <td>${item.descricao || '-'}</td>
    </tr>
  `).join('');
}

// Atualizar filtro de categorias
function updateCategoryFilter(data) {
  const select = document.getElementById('filter-categoria');
  // Limpar opções exceto "Todas"
  select.innerHTML = '<option value="">Todas</option>';
  
  const categorias = [...new Set(data.map(d => d.categoria).filter(Boolean))];
  
  categorias.sort().forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

// Aplicar filtros
function applyFilters() {
  const categoria = document.getElementById('filter-categoria').value;
  const tipo = document.getElementById('filter-tipo').value;
  
  let filtered = [...allData];
  
  if (categoria) {
    filtered = filtered.filter(d => d.categoria === categoria);
  }
  
  if (tipo) {
    filtered = filtered.filter(d => d.tipo === tipo);
  }
  
  updateCards(filtered);
  updateTable(filtered);
}

// Buscar dados
async function fetchData() {
  try {
    const { data, error } = await supabaseClient
      .from('conciliacao_movelmar_sp')
      .select('*')
      .order('data', { ascending: false });
    
    if (error) throw error;
    
    allData = data || [];
    
    updateCards(allData);
    updateTable(allData);
    updateCategoryFilter(allData);
    
    document.getElementById('last-update').textContent = new Date().toLocaleString('pt-BR');
    
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    document.getElementById('tbody-lancamentos').innerHTML = 
      '<tr><td colspan="7" class="loading">Erro ao carregar dados. Verifique a configuração.</td></tr>';
  }
}

// ========== MODAL ==========

const modalOverlay = document.getElementById('modal-overlay');
const btnNovoLancamento = document.getElementById('btn-novo-lancamento');
const btnModalClose = document.getElementById('modal-close');
const btnCancel = document.getElementById('btn-cancel');
const formLancamento = document.getElementById('form-lancamento');

// Abrir modal
function openModal() {
  modalOverlay.classList.add('active');
  // Preencher data com hoje
  document.getElementById('input-data').value = new Date().toISOString().split('T')[0];
  document.getElementById('input-valor').focus();
}

// Fechar modal
function closeModal() {
  modalOverlay.classList.remove('active');
  formLancamento.reset();
}

// Salvar lançamento
async function saveLancamento(e) {
  e.preventDefault();
  
  const submitBtn = formLancamento.querySelector('.btn-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';
  
  const lancamento = {
    data: document.getElementById('input-data').value,
    tipo: document.getElementById('input-tipo').value,
    valor: parseFloat(document.getElementById('input-valor').value),
    categoria: document.getElementById('input-categoria').value || null,
    parte: document.getElementById('input-parte').value || null,
    fornecedor: document.getElementById('input-fornecedor').value || null,
    descricao: document.getElementById('input-descricao').value || null
  };
  
  try {
    const { data, error } = await supabaseClient
      .from('conciliacao_movelmar_sp')
      .insert([lancamento])
      .select();
    
    if (error) throw error;
    
    // Sucesso - fechar modal e recarregar dados
    closeModal();
    await fetchData();
    
    // Feedback visual
    alert('Lançamento salvo com sucesso!');
    
  } catch (error) {
    console.error('Erro ao salvar:', error);
    alert('Erro ao salvar: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar';
  }
}

// Event listeners do modal
btnNovoLancamento.addEventListener('click', openModal);
btnModalClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
formLancamento.addEventListener('submit', saveLancamento);

// Fechar modal ao clicar fora
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeModal();
  }
});

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
    closeModal();
  }
});

// ========== INIT ==========

// Event listeners dos filtros
document.getElementById('filter-categoria').addEventListener('change', applyFilters);
document.getElementById('filter-tipo').addEventListener('change', applyFilters);

// Iniciar
fetchData();

// Auto-refresh a cada 5 minutos
setInterval(fetchData, 5 * 60 * 1000);
