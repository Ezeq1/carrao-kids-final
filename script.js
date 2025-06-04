/*********************************************************************
 *  Carrão Kids (Frontend) – script.js
 *  • Consome o backend para autenticação, escalas e e-mails automáticos
 *  • Abas internas (tabs)
 *  • Cadastro estendido (com e-mail e sala)
 *  • Envio automático de confirmações e notificações (via backend)
 *********************************************************************/

/* ---------- helper simples ---------- */
const $  = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

// Armazenamento temporário da sessão (apenas username)
function setSessionUser(username) {
  sessionStorage.setItem('user', username);
}
function getSessionUser() {
  return sessionStorage.getItem('user');
}
function clearSessionUser() {
  sessionStorage.removeItem('user');
}

/* ---------- DOM referências ---------- */
const dom = {
  // Autenticação
  loginForm      : $('#login-form'),
  cadastroForm   : $('#cadastro-form'),
  authWrap       : $('#auth-container'),
  mainSection    : $('#main'),
  escalasBox     : $('#escalas'),
  trocasBox      : $('#trocas-pendentes'),
  userNameSpan   : $('#user-name'),
  btnLogin       : $('#btn-login'),
  btnCadastro    : $('#btn-cadastro'),
  linkToCadastro : $('#link-to-cadastro'),
  linkToLogin    : $('#link-to-login'),
  loginUser      : $('#login-user'),
  loginPass      : $('#login-pass'),
  cadastroUser   : $('#cadastro-user'),
  cadastroEmail  : $('#cadastro-email'),
  cadastroPass   : $('#cadastro-pass'),
  cadastroFuncao : $('#cadastro-funcao'),
  cadastroSala   : $('#cadastro-sala'),
  loginError     : $('#login-error'),
  cadastroError  : $('#cadastro-error'),
  logoutBtn      : $('#btn-logout'),

  // Admin
  adminSection       : $('#admin'),
  btnLogoutAdmin     : $('#btn-logout-admin'),
  adminUsersList     : $('#admin-users-list'),
  formAdminAdd       : $('#form-admin-add'),
  adminNewUser       : $('#admin-new-user'),
  adminNewEmail      : $('#admin-new-email'),
  adminNewPass       : $('#admin-new-pass'),
  adminNewFuncao     : $('#admin-new-funcao'),
  adminNewSala       : $('#admin-new-sala'),
  adminEscolasBox    : $('#admin-escalas'),
  formAdminTransfer  : $('#form-admin-transfer'),
  adminOrigemDate    : $('#admin-origem-date'),
  adminTransferUser  : $('#admin-transfer-user'),
  adminDestinoDate   : $('#admin-destino-date'),
  btnAdminAdd        : $('#btn-admin-add'),
  btnAdminTransfer   : $('#btn-admin-transfer')
};

/* ---------- Configurações gerais ---------- */
const API_BASE = 'http://localhost:3000/api'; // ajuste se necessário

/* ---------- Toggle login/cadastro ---------- */
function toggleForms(destino) {
  dom.loginError.textContent = '';
  dom.cadastroError.textContent = '';
  dom.loginForm.style.display    = (destino === 'login')    ? 'flex' : 'none';
  dom.cadastroForm.style.display = (destino === 'cadastro') ? 'flex' : 'none';
}

dom.linkToCadastro.addEventListener('click', e => {
  e.preventDefault();
  toggleForms('cadastro');
});
dom.linkToLogin.addEventListener('click', e => {
  e.preventDefault();
  toggleForms('login');
});

/* ---------- Cadastro (Chama POST /register) ---------- */
dom.btnCadastro.addEventListener('click', async () => {
  dom.cadastroError.textContent = '';
  const username = dom.cadastroUser.value.trim().toLowerCase();
  const email    = dom.cadastroEmail.value.trim().toLowerCase();
  const passwd   = dom.cadastroPass.value.trim();
  const funcao   = dom.cadastroFuncao.value;
  const sala     = dom.cadastroSala.value;

  if (!username || !email || !passwd) {
    dom.cadastroError.textContent = 'Preencha todos os campos.';
    return;
  }
  // Valida email
  if (!/\S+@\S+\.\S+/.test(email)) {
    dom.cadastroError.textContent = 'E-mail inválido.';
    return;
  }

  // Chamada para o backend
  try {
    const resp = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username, email, passwd, funcao, sala })
    });
    const data = await resp.json();
    if (!resp.ok) {
      dom.cadastroError.textContent = data.error || 'Erro no cadastro.';
    } else {
      alert(data.message);
      toggleForms('login');
    }
  } catch (err) {
    dom.cadastroError.textContent = 'Erro ao conectar ao servidor.';
    console.error(err);
  }
});

/* ---------- Login (Chama POST /login) ---------- */
dom.btnLogin.addEventListener('click', async () => {
  dom.loginError.textContent = '';
  const username = dom.loginUser.value.trim().toLowerCase();
  const passwd   = dom.loginPass.value.trim();

  if (!username || !passwd) {
    dom.loginError.textContent = 'Usuário e senha são obrigatórios.';
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username, passwd })
    });
    const data = await resp.json();
    if (!resp.ok) {
      dom.loginError.textContent = data.error || 'Erro no login.';
    } else {
      // user logado
      setSessionUser(data.id);
      iniciarSessao(data);
    }
  } catch (err) {
    dom.loginError.textContent = 'Erro ao conectar ao servidor.';
    console.error(err);
  }
});

/* ---------- Logout ---------- */
function logout() {
  clearSessionUser();
  location.reload();
}
dom.logoutBtn.addEventListener('click', logout);
dom.btnLogoutAdmin.addEventListener('click', logout);

/* ---------- Iniciar Sessão ---------- */
function iniciarSessao(user) {
  dom.authWrap.style.display = 'none';
  if (user.funcao === 'admin') {
    dom.adminSection.style.display = 'block';
    carregarAdminInterface();
    ativarTabs('#admin');
  } else {
    dom.mainSection.style.display = 'block';
    dom.userNameSpan.textContent = user.username;
    renderEscalasUsuario();
    fetchTrocasPendentes();
    ativarTabs('#main');
  }
}

/* ---------- Funções do Voluntário ---------- */
/* Buscar e exibir próximas escalas (GET /escalas) */
async function renderEscalasUsuario() {
  dom.escalasBox.innerHTML = '';
  const userId = getSessionUser();
  try {
    const resp = await fetch(`${API_BASE}/escalas`);
    const datas = await resp.json(); // [{data, participantes:[{userId,funcao,sala}]}]
    datas.forEach(obj => {
      const { data, participantes } = obj;
      // Mostrar somente professores e auxiliares separados
      const profs = participantes.filter(p => p.funcao==='professor').map(p=>p.userId);
      const auxs  = participantes.filter(p => p.funcao==='auxiliar' ).map(p=>p.userId);
      const esta  = participantes.some(p => p.userId === userId);

      const card = document.createElement('div');
      card.className = 'escala-card';
      card.innerHTML = `
        <div class="escala-info">
          <b>${formatar(data)}</b><br>
          Professores: ${profs.length>0 ? profs.join(', ') : '—'}<br>
          Auxiliares: ${auxs.length>0 ? auxs.join(', ') : '—'}
        </div>`;

      // Botão entrar/sair
      const btn = document.createElement('button');
      btn.textContent = esta ? 'Sair da escala' : 'Entrar na escala';
      btn.onclick = () => toggleEscala(data, userId);
      card.appendChild(btn);

      // Se o usuário acabou de entrar, o backend envia e-mail automaticamente,
      // logo não precisamos disparar mailto aqui. Apenas exibimos botão.
      // Botão trocar (se estiver na escala)
      if (esta) {
        const btTroca = document.createElement('button');
        btTroca.textContent = 'Trocar escala';
        btTroca.className = 'btn-trocar';
        btTroca.onclick = ()=>iniciarTroca(data, userId);
        card.appendChild(btTroca);
      }
      dom.escalasBox.appendChild(card);
    });
  } catch (err) {
    console.error('Erro ao buscar escalas:', err);
  }
}

/* Entrar ou sair da escala (POST /entrar-escala) */
async function toggleEscala(data, userId) {
  try {
    const resp = await fetch(`${API_BASE}/entrar-escala`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ userId, data })
    });
    if (!resp.ok) {
      const e = await resp.json();
      alert(e.error || 'Erro ao atualizar escala.');
    } else {
      renderEscalasUsuario();
    }
  } catch (err) {
    console.error(err);
  }
}

/* Solicitar troca (POST /solicitar-troca) */
async function iniciarTroca(data, userId) {
  // Busca lista de participantes dessa data (para filtrar candidatos)
  try {
    const resp = await fetch(`${API_BASE}/escalas`);
    const datas = await resp.json();
    const obj   = datas.find(d => d.data === data);
    const userEntrys = obj.participantes;
    const meuUser = userEntrys.find(p => p.userId === userId);
    const candidatos = userEntrys
      .filter(p => p.funcao === meuUser.funcao && p.userId !== userId)
      .map(p => p.userId);

    if (candidatos.length === 0) {
      alert('Não há candidatos disponíveis para troca nesta função.');
      return;
    }
    const alvoId = prompt(`Trocar ${formatar(data)} com qual usuário?\n\nCandidatos: ${candidatos.join(', ')}`);
    if (!alvoId || !candidatos.includes(alvoId)) {
      alert('Opção inválida ou cancelada.');
      return;
    }
    // Chama backend para solicitar troca
    const resp2 = await fetch(`${API_BASE}/solicitar-troca`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ deId:userId, paraId:alvoId, data })
    });
    const data2 = await resp2.json();
    if (!resp2.ok) {
      alert(data2.error || 'Erro ao solicitar troca.');
    } else {
      alert(data2.message);
      fetchTrocasPendentes();
    }
  } catch (err) {
    console.error(err);
  }
}

/* Buscar trocas pendentes (GET /trocas-pendentes/:userId) */
async function fetchTrocasPendentes() {
  const userId = getSessionUser();
  dom.trocasBox.innerHTML = '';
  try {
    const resp = await fetch(`${API_BASE}/trocas-pendentes/${userId}`);
    const pend = await resp.json();
    pend.forEach(t => {
      const card = document.createElement('div');
      card.className = 'troca-card';
      card.innerHTML = `<p>${t.de} solicitou troca em ${formatar(t.data)}</p>`;
      const btnAceitar = document.createElement('button');
      btnAceitar.textContent = 'Aceitar';
      btnAceitar.onclick = () => responderTroca(t.id, 'aceitar', card);
      const btnRecusar = document.createElement('button');
      btnRecusar.textContent = 'Recusar';
      btnRecusar.onclick = () => responderTroca(t.id, 'recusar', card);
      card.appendChild(btnAceitar);
      card.appendChild(btnRecusar);
      dom.trocasBox.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

/* Responder troca (POST /responder-troca) */
async function responderTroca(trocaId, resposta, cardElem) {
  try {
    const resp = await fetch(`${API_BASE}/responder-troca`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ trocaId, resposta })
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(data.error || 'Erro ao responder troca.');
    } else {
      alert(data.message);
      cardElem.remove(); // remover card de pendente
      renderEscalasUsuario();
    }
  } catch (err) {
    console.error(err);
  }
}

/* ---------- Funções do Admin ---------- */
async function carregarAdminInterface() {
  await preencherListaUsuarios();
  await preencherEscalasAdmin();
  preencherTransferForm();
}

/* Preencher lista de usuários (GET /users) */
async function preencherListaUsuarios() {
  dom.adminUsersList.innerHTML = '';
  try {
    const resp = await fetch(`${API_BASE}/users`);
    const lista = await resp.json(); // [{id,username,email,funcao,sala}]
    lista.forEach(u => {
      const row = document.createElement('div');
      row.className = 'user-row';
      row.innerHTML = `
        <span>${u.username} (${u.funcao}) – ${u.email} – ${u.sala}</span>
        <div class="user-actions">
          <button onclick="resetSenhaAdmin('${u.id}')">Reset Senha</button>
          <button onclick="removerUsuarioAdmin('${u.id}')">Remover</button>
        </div>`;
      dom.adminUsersList.appendChild(row);
    });
  } catch (err) {
    console.error(err);
  }
}

/* Resetar senha (POST /reset-senha) */
async function resetSenhaAdmin(userId) {
  if (!confirm('Resetar senha para “1234”?')) return;
  try {
    const resp = await fetch(`${API_BASE}/reset-senha`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(data.error || 'Erro ao resetar senha.');
    } else {
      alert(data.message);
      await preencherListaUsuarios();
    }
  } catch (err) {
    console.error(err);
  }
}

/* Remover usuário (DELETE /users/:id) */
async function removerUsuarioAdmin(userId) {
  if (!confirm('Remover usuário permanentemente?')) return;
  try {
    const resp = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
    const data = await resp.json();
    if (!resp.ok) {
      alert(data.error || 'Erro ao remover usuário.');
    } else {
      alert(data.message);
      await preencherListaUsuarios();
      await preencherEscalasAdmin();
    }
  } catch (err) {
    console.error(err);
  }
}

/* Criar novo usuário (chama /register direto para admin) */
dom.btnAdminAdd.addEventListener('click', async e => {
  e.preventDefault();
  const u    = dom.adminNewUser.value.trim().toLowerCase();
  const eMail= dom.adminNewEmail.value.trim().toLowerCase();
  const p    = dom.adminNewPass.value.trim();
  const f    = dom.adminNewFuncao.value;
  const s    = dom.adminNewSala.value;
  if (!u||!eMail||!p) {
    alert('Preencha todos os campos.');
    return;
  }
  if (!/\S+@\S+\.\S+/.test(eMail)) {
    alert('E-mail inválido.');
    return;
  }
  try {
    const resp = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username:u, email:eMail, passwd:p, funcao:f, sala:s })
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(data.error || 'Erro ao criar usuário.');
    } else {
      alert(data.message);
      dom.adminNewUser.value=''; dom.adminNewEmail.value=''; dom.adminNewPass.value='';
      await preencherListaUsuarios();
    }
  } catch (err) {
    console.error(err);
  }
});

/* Preencher escalas gerais (GET /escalas) */
async function preencherEscalasAdmin() {
  dom.adminEscolasBox.innerHTML = '';
  try {
    const resp = await fetch(`${API_BASE}/escalas`);
    const datas = await resp.json(); // [{data, participantes:[...]}, ...]
    datas.forEach(obj => {
      const dt   = obj.data;
      const arr  = obj.participantes;
      const profs= arr.filter(p=>p.funcao==='professor').map(p=>p.userId);
      const auxs = arr.filter(p=>p.funcao==='auxiliar' ).map(p=>p.userId);
      const row  = document.createElement('div');
      row.className = 'escala-row-admin';
      row.innerHTML = `
        <div>${formatar(dt)}</div>
        <div>Professores: ${profs.join(', ')||'—'}</div>
        <div>Auxiliares: ${auxs.join(', ')||'—'}</div>`;
      dom.adminEscolasBox.appendChild(row);
    });
  } catch (err) {
    console.error(err);
  }
}

/* Preencher formulário de transferência forçada */
async function preencherTransferForm() {
  dom.adminOrigemDate.innerHTML = '';
  dom.adminDestinoDate.innerHTML = '';
  const proximos = proxDomingos(6);
  proximos.forEach(dt => {
    const o = document.createElement('option');
    o.value = dt; o.textContent = formatar(dt);
    dom.adminOrigemDate.appendChild(o);
    const d = document.createElement('option');
    d.value = dt; d.textContent = formatar(dt);
    dom.adminDestinoDate.appendChild(d);
  });
  preencherTransferUsers();
  dom.adminOrigemDate.onchange = preencherTransferUsers;
}

/* Preencher dropdown de usuários para transferência forçada */
async function preencherTransferUsers() {
  const dt = dom.adminOrigemDate.value;
  dom.adminTransferUser.innerHTML = '';
  try {
    const resp = await fetch(`${API_BASE}/escalas`);
    const datas= await resp.json();
    const obj  = datas.find(d => d.data === dt);
    const arr  = obj ? obj.participantes : [];
    if (!arr.length) {
      const opt = document.createElement('option');
      opt.textContent = 'Nenhum usuário nesta data'; opt.value = '';
      dom.adminTransferUser.appendChild(opt);
      dom.btnAdminTransfer.disabled = true;
      return;
    }
    dom.btnAdminTransfer.disabled = false;
    arr.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.userId; opt.textContent = p.userId;
      dom.adminTransferUser.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

/* Transferência forçada (POST /transferir-admin) */
dom.btnAdminTransfer.addEventListener('click', async e => {
  e.preventDefault();
  const dataO = dom.adminOrigemDate.value;
  const user  = dom.adminTransferUser.value;
  const dataD = dom.adminDestinoDate.value;
  if (!user || !dataO || !dataD) {
    alert('Selecione todos os campos corretamente.');
    return;
  }
  if (dataO === dataD) {
    alert('Escolha datas diferentes.');
    return;
  }
  try {
    const resp = await fetch(`${API_BASE}/transferir-admin`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ userId:user, dataOrigem:dataO, dataDestino:dataD })
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(data.error || 'Erro na transferência.');
    } else {
      alert(data.message);
      await preencherEscalasAdmin();
      await renderEscalasUsuario();
    }
  } catch (err) {
    console.error(err);
  }
});

/* ---------- Tabs (Navegação) ---------- */
function ativarTabs(contextSelector) {
  const context = document.querySelector(contextSelector);
  const tabs    = context.querySelectorAll('.tab-button');
  const panes   = context.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t=>t.classList.remove('active'));
      panes.forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      const id = tab.dataset.tab;
      context.querySelector(`#${id}`).classList.add('active');
    };
  });
}

/* ---------- Formatação de data ---------- */
function formatar(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'
  });
}

function proxDomingos(n=6) {
  const arr=[]; 
  let hoje=new Date();
  let ds=hoje.getDay(), diasAte=(7-ds)%7||7;
  let d=new Date(hoje); d.setDate(d.getDate()+diasAte);
  for(let i=0;i<n;i++){
    arr.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate()+7);
  }
  return arr;
}
