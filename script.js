let todosOsProdutos = [];
let produtosFiltrados = [];
let searchTimeout;

// --------- CSV Parsing seguro ---------
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const produtos = [];
    let tempLine = '', inQuotes = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('COD;') || line === '1;;') continue;
        if (line.includes('"')) {
            const quoteCount = (line.match(/"/g) || []).length;
            if (quoteCount % 2 !== 0) {
                if (!inQuotes) { inQuotes = true; tempLine = line; continue; }
                else { inQuotes = false; tempLine += ' ' + line; processLine(tempLine, produtos); tempLine = ''; continue; }
            }
        }
        if (inQuotes) { tempLine += ' ' + line; continue; }
        processLine(line, produtos);
    }
    return produtos;
}
function processLine(linha, produtos) {
    const campos = [];
    let campoAtual = '', dentroAspas = false;
    for (let i = 0; i < linha.length; i++) {
        const char = linha[i];
        if (char === '"') {
            if (dentroAspas && linha[i + 1] === '"') { campoAtual += '"'; i++; }
            else { dentroAspas = !dentroAspas; }
        } else if (char === ';' && !dentroAspas) { campos.push(campoAtual.trim()); campoAtual = ''; }
        else { campoAtual += char; }
    }
    if (campoAtual) campos.push(campoAtual.trim());
    if (campos.length >= 3) {
        const codigo = campos[0].replace(/^"|"$/g, '').trim();
        const produto = campos[1].replace(/^"|"$/g, '').trim();
        const vendPor = campos[2].replace(/^"|"$/g, '').trim();
        if (codigo && produto && vendPor) {
            produtos.push({
                cod: codigo,
                produto: produto.replace(/\s+/g, ' ').trim(),
                vendPor: vendPor
            });
        }
    }
}

// --------- Carregar Produtos ---------
async function carregarProdutos() {
    mostrarLoading();
    document.getElementById('errorMessage').style.display = 'none';
    try {
        // Se for aberto via file://, vai falhar; trate isso e informe:
        if (window.location.protocol === 'file:') {
            throw new Error('Por favor, instale um servidor local para abrir este site adequadamente.');
        }
        const response = await fetch('Produtos.csv');
        if (!response.ok) {
            throw new Error('Arquivo Produtos.csv não encontrado ou bloqueado pelo navegador.');
        }
        const csvText = await response.text();
        if (!csvText.trim()) throw new Error('Arquivo CSV está vazio.');
        todosOsProdutos = parseCSV(csvText);
        if (todosOsProdutos.length === 0) throw new Error('Nenhum produto válido encontrado.');
        produtosFiltrados = todosOsProdutos.slice();
        esconderLoading();
        renderizarTabela();
        atualizarContador();
    } catch (error) {
        mostrarErro(error.message || error);
    }
}

// --------- Tabela e Busca ---------
function renderizarTabela() {
    const tbody = document.getElementById('productsTableBody');
    const noResults = document.getElementById('noResults');
    if (produtosFiltrados.length === 0) {
        tbody.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    noResults.style.display = 'none';
    const html = produtosFiltrados
        .sort((a, b) => a.produto.localeCompare(b.produto, 'pt-BR'))
        .map(item => `
            <tr>
                <td><strong>${escapeHtml(item.cod)}</strong></td>
                <td>${escapeHtml(item.produto)}</td>
                <td><span class="unit-badge">${escapeHtml(item.vendPor)}</span></td>
            </tr>
        `).join('');
    tbody.innerHTML = html;
}
function escapeHtml(text) {
    const div = document.createElement('div'); div.textContent = text || ''; return div.innerHTML;
}
function filtrarProdutos() {
    const termo = document.getElementById('searchInput').value.toLowerCase().trim();
    produtosFiltrados = termo
        ? todosOsProdutos.filter(produto =>
            produto.produto.toLowerCase().includes(termo) ||
            produto.cod.toLowerCase().includes(termo)
          )
        : todosOsProdutos.slice();
    renderizarTabela();
    atualizarContador();
}
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(filtrarProdutos, 300);
}
function limparBusca() {
    document.getElementById('searchInput').value = '';
    produtosFiltrados = todosOsProdutos.slice();
    renderizarTabela();
    atualizarContador();
    document.getElementById('searchInput').focus();
}
function atualizarContador() {
    const t = produtosFiltrados.length, tg = todosOsProdutos.length;
    document.getElementById('totalProducts').textContent =
        t === tg
        ? `📦 ${t} produtos`
        : `📦 ${t} de ${tg} produtos`;
}

function mostrarLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
}
function esconderLoading() {
    document.getElementById('loading').style.display = 'none';
}
function mostrarErro(mensagem) {
    esconderLoading();
    document.getElementById('errorText').innerHTML = mensagem;
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('noResults').style.display = 'none';
}
function esconderErro() {
    document.getElementById('errorMessage').style.display = 'none';
}

// --------- Eventos ---------
document.addEventListener('DOMContentLoaded', function() {
    // Carregar produtos
    carregarProdutos();
    // Debounced search
    document.getElementById('searchInput').addEventListener('input', debounceSearch);
    document.getElementById('clearSearch').addEventListener('click', limparBusca);
    // Retry
    document.getElementById('retryBtn').addEventListener('click', function() {
        esconderErro();
        carregarProdutos();
    });
    // ESC tecla
    document.getElementById('searchInput').addEventListener('keydown', function(e) {
        if (e.key === 'Escape') limparBusca();
    });
});
