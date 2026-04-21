// ============================================================
//  Firebase config
// ============================================================
const firebaseConfig = {
  apiKey:      "AIzaSyAiR4vo-lkUyR6HBHCimGZkc40gTKcWTHg",
  authDomain:  "authret.firebaseapp.com",
  projectId:   "authret",
  databaseURL: "https://authret-default-rtdb.firebaseio.com"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.database();

// ============================================================
//  CARRINHO (memória local)
// ============================================================
let cart = {};   // { prodId: { name, price, qty, stock } }

function addToCart(prodId, name, price, stock) {
  if (cart[prodId]) {
    if (cart[prodId].qty >= stock) { log("Estoque insuficiente."); return; }
    cart[prodId].qty++;
  } else {
    cart[prodId] = { name, price, qty: 1, stock };
  }
  renderCart();
  log("Adicionado ao carrinho: " + name);
}

function removeFromCart(prodId) {
  delete cart[prodId];
  renderCart();
}

function limparCarrinho() {
  cart = {};
  renderCart();
}

function renderCart() {
  const div   = document.getElementById("cartList");
  const total = document.getElementById("cartTotal");
  const ids   = Object.keys(cart);

  if (!ids.length) {
    div.innerHTML = "<p>Seu carrinho está vazio.</p>";
    total.style.display = "none";
    return;
  }

  let html  = '<div class="orders-grid">';
  let soma  = 0;
  ids.forEach(id => {
    const item = cart[id];
    const sub  = item.price * item.qty;
    soma += sub;
    html += `
      <div class="order-card">
        <strong>${item.name}</strong><br>
        R$ ${item.price.toFixed(2)} x
        <input type="number" min="1" max="${item.stock}" value="${item.qty}"
          style="width:50px;display:inline;margin:0 4px;"
          onchange="alterarQtdCart('${id}', this.value, ${item.stock})">
        = <strong>R$ ${sub.toFixed(2)}</strong><br>
        <button class="small-btn danger" onclick="removeFromCart('${id}')">Remover</button>
      </div>`;
  });
  html += '</div>';
  div.innerHTML = html;
  document.getElementById("cartTotalValue").innerText = soma.toFixed(2);
  total.style.display = "block";
}

function alterarQtdCart(prodId, val, stock) {
  const n = parseInt(val);
  if (!n || n < 1) { removeFromCart(prodId); return; }
  if (n > stock)   { log("Estoque máximo: " + stock); cart[prodId].qty = stock; }
  else             { cart[prodId].qty = n; }
  renderCart();
}

async function finalizarPedido() {
  const user = auth.currentUser;
  if (!user) return;
  const ids = Object.keys(cart);
  if (!ids.length) { log("Carrinho vazio."); return; }

  const pedidoRef  = db.ref("orders").push();
  const createdAt  = new Date().toISOString();
  const itens      = {};
  let   totalPedido = 0;

  // monta itens e desconta estoque
  for (const id of ids) {
    const item     = cart[id];
    itens[id]      = { name: item.name, price: item.price, qty: item.qty };
    totalPedido   += item.price * item.qty;

    // desconta estoque
    const snap     = await db.ref("products/" + id + "/stock").once("value");
    const estoqueAtual = snap.val() || 0;
    const novoEstoque  = Math.max(0, estoqueAtual - item.qty);
    await db.ref("products/" + id + "/stock").set(novoEstoque);
  }

  await pedidoRef.set({
    userId:    user.uid,
    userEmail: user.email,
    itens,
    total:     totalPedido,
    status:    "pending",
    createdAt
  });

  log("Pedido realizado! Total: R$ " + totalPedido.toFixed(2));
  limparCarrinho();
  loadUserOrders();
  loadAdminStats();
}

// ============================================================
//  AUTH STATE
// ============================================================
auth.onAuthStateChanged(user => {
  if (user) {
    checkRole(user).then(role => {
      showLoggedIn(user, role);
      if (role === "admin") {
        document.getElementById("adminArea").style.display = "block";
        document.getElementById("userArea").style.display  = "none";
        loadAdminStats();
      } else {
        document.getElementById("userArea").style.display  = "block";
        document.getElementById("adminArea").style.display = "none";
        loadUserProfile();
        loadCatalog();
        loadUserOrders();
      }
    });
  } else {
    showLogout();
    hideAllAreas();
  }
});

// ============================================================
//  AUTH
// ============================================================
function register() {
  const email = document.getElementById("emailRegister").value.trim();
  const pass  = document.getElementById("passwordRegister").value;
  auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => db.ref("users/" + cred.user.uid).set({
      email, role: "user",
      createdAt: new Date().toISOString(),
      name: email.split('@')[0]
    }))
    .then(() => { log("Cadastro realizado!"); showLogin(); })
    .catch(err => log("ERRO: " + err.message));
}

function login() {
  const email = document.getElementById("email").value.trim();
  const pass  = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, pass)
    .catch(err => log("ERRO: " + err.message));
}

function logout() {
  cart = {};
  auth.signOut().then(() => { showLogout(); hideAllAreas(); log("Sessão encerrada."); });
}

function checkRole(user) {
  return db.ref("users/" + user.uid).once("value")
    .then(s => { const d = s.val(); return (d && d.role) ? d.role : "user"; });
}

// ============================================================
//  UI HELPERS
// ============================================================
function showLoggedIn(user, role) {
  document.getElementById("loginForm").style.display    = "none";
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("loggedArea").style.display   = "block";
  document.getElementById("userInfo").innerHTML =
    `Logado como <strong>${user.email}</strong> &nbsp;<span class="role-${role}">${role}</span>`;
}
function showLogout() {
  document.getElementById("loginForm").style.display    = "block";
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("loggedArea").style.display   = "none";
}
function showRegister() {
  document.getElementById("loginForm").style.display    = "none";
  document.getElementById("registerForm").style.display = "block";
}
function showLogin() {
  document.getElementById("loginForm").style.display    = "block";
  document.getElementById("registerForm").style.display = "none";
}
function hideAllAreas() {
  document.getElementById("userArea").style.display  = "none";
  document.getElementById("adminArea").style.display = "none";
}

// ============================================================
//  USER — Perfil
// ============================================================
function loadUserProfile() {
  const user = auth.currentUser;
  if (!user) return;
  db.ref("users/" + user.uid).once("value").then(s => {
    const d = s.val() || {};
    document.getElementById("userName").innerText  = d.name || "—";
    document.getElementById("userEmail").innerText = user.email;
    document.getElementById("userSince").innerText = d.createdAt
      ? new Date(d.createdAt).toLocaleDateString("pt-BR") : "Hoje";
  });
}

// ============================================================
//  USER — Catálogo
// ============================================================
function loadCatalog() {
  db.ref("products").once("value").then(s => {
    const products = s.val();
    const div      = document.getElementById("catalogList");
    if (!products) {
      div.innerHTML = "<p>Nenhum produto disponível no momento.</p>";
      return;
    }
    let html = '<div class="users-grid">';
    for (const id in products) {
      const p = products[id];
      const semEstoque = p.stock <= 0;
      html += `
        <div class="user-card">
          ${p.imgUrl ? `<img src="${p.imgUrl}" alt="${p.name}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;">` : ''}
          <strong>${p.name}</strong><br>
          <small style="color:var(--muted-foreground)">${p.description || ""}</small><br>
          <p style="font-size:1.25rem;font-weight:700;margin:6px 0">R$ ${parseFloat(p.price).toFixed(2)}</p>
          <span class="${semEstoque ? 'status-cancelled' : 'status-completed'}">
            ${semEstoque ? "Sem estoque" : "Em estoque: " + p.stock}
          </span><br>
          <button style="margin-top:10px" ${semEstoque ? "disabled" : ""}
            onclick="addToCart('${id}','${p.name}',${p.price},${p.stock})">
            Adicionar ao Carrinho
          </button>
        </div>`;
    }
    html += '</div>';
    div.innerHTML = html;
  });
}

// ============================================================
//  USER — Meus Pedidos
// ============================================================
function loadUserOrders() {
  const user = auth.currentUser;
  if (!user) return;
  db.ref("orders").orderByChild("userId").equalTo(user.uid).once("value").then(s => {
    const orders = s.val();
    const div    = document.getElementById("userOrders");
    if (!orders) { div.innerHTML = "<p>Nenhum pedido encontrado.</p>"; return; }
    let html = '';
    Object.entries(orders).reverse().forEach(([id, o]) => {
      const itens = o.itens ? Object.values(o.itens).map(i => `${i.name} x${i.qty}`).join(", ") : o.product;
      html += `
        <div class="order-item">
          <strong>Pedido #${id.slice(-6)}</strong> &nbsp;
          <span class="status-${o.status}">${o.status}</span><br>
          ${itens}<br>
          <strong>Total: R$ ${parseFloat(o.total || 0).toFixed(2)}</strong><br>
          <small>${o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""}</small>
        </div>`;
    });
    div.innerHTML = html;
  });
}

// ============================================================
//  ADMIN — Stats
// ============================================================
function loadAdminStats() {
  db.ref("users").once("value").then(s => {
    const u = s.val() || {};
    document.getElementById("totalUsers").innerText = Object.keys(u).length;
    document.getElementById("adminCount").innerText = Object.values(u).filter(x => x.role === "admin").length;
  });
  db.ref("orders").once("value").then(s => {
    const o = s.val() || {};
    document.getElementById("totalOrders").innerText = Object.keys(o).length;
  });
  db.ref("products").once("value").then(s => {
    const p = s.val() || {};
    document.getElementById("totalProducts").innerText = Object.keys(p).length;
  });
}

// ============================================================
//  ADMIN — Produtos
// ============================================================
function salvarProduto() {
  const id    = document.getElementById("prodId").value;
  const name  = document.getElementById("prodName").value.trim();
  const desc  = document.getElementById("prodDesc").value.trim();
  const price = parseFloat(document.getElementById("prodPrice").value);
  const stock = parseInt(document.getElementById("prodStock").value);
  const img   = document.getElementById("prodImg").value.trim();

  if (!name || isNaN(price) || isNaN(stock)) { log("Preencha nome, preço e estoque."); return; }

  const data = { name, description: desc, price, stock, imgUrl: img, updatedAt: new Date().toISOString() };
  const ref  = id ? db.ref("products/" + id) : db.ref("products").push();

  ref.set(data)
    .then(() => {
      log((id ? "Produto atualizado: " : "Produto cadastrado: ") + name);
      cancelarEdicao();
      loadAdminProducts();
      loadAdminStats();
    })
    .catch(err => log("ERRO: " + err.message));
}

function editarProduto(id, name, desc, price, stock, img) {
  document.getElementById("prodId").value    = id;
  document.getElementById("prodName").value  = name;
  document.getElementById("prodDesc").value  = desc;
  document.getElementById("prodPrice").value = price;
  document.getElementById("prodStock").value = stock;
  document.getElementById("prodImg").value   = img || "";
  document.getElementById("productFormTitle").innerHTML = "<strong>Editar Produto</strong>";
  document.getElementById("productForm").scrollIntoView({ behavior: "smooth" });
}

function cancelarEdicao() {
  ["prodId","prodName","prodDesc","prodPrice","prodStock","prodImg"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("productFormTitle").innerHTML = "<strong>Cadastrar Produto</strong>";
}

function atualizarEstoque(id, novoEstoque) {
  db.ref("products/" + id + "/stock").set(parseInt(novoEstoque))
    .then(() => { log("Estoque atualizado."); loadAdminProducts(); })
    .catch(err => log("ERRO: " + err.message));
}

function atualizarPreco(id, novoPreco) {
  db.ref("products/" + id + "/price").set(parseFloat(novoPreco))
    .then(() => { log("Preço atualizado."); loadAdminProducts(); })
    .catch(err => log("ERRO: " + err.message));
}

function deletarProduto(id, name) {
  if (!confirm("Remover produto: " + name + "?")) return;
  db.ref("products/" + id).remove()
    .then(() => { log("Produto removido: " + name); loadAdminProducts(); loadAdminStats(); })
    .catch(err => log("ERRO: " + err.message));
}

function loadAdminProducts() {
  db.ref("products").once("value").then(s => {
    const products = s.val();
    const div      = document.getElementById("adminProductsList");
    if (!products) { div.innerHTML = "<p>Nenhum produto cadastrado.</p>"; return; }

    let html = '<div class="users-grid" style="margin-top:12px">';
    for (const id in products) {
      const p = products[id];
      html += `
        <div class="user-card">
          <strong>${p.name}</strong><br>
          <small>${p.description || ""}</small><br>
          <div style="margin:6px 0">
            <label style="font-size:13px">Preço: R$</label>
            <input id="price_${id}" type="number" value="${parseFloat(p.price).toFixed(2)}" step="0.01" min="0"
              style="width:90px;display:inline;margin:0 4px;">
            <button class="small-btn" onclick="atualizarPreco('${id}', document.getElementById('price_${id}').value)">Salvar</button>
          </div>
          <div style="margin:6px 0">
            <label style="font-size:13px">Estoque:</label>
            <input id="stock_${id}" type="number" value="${p.stock}" min="0"
              style="width:70px;display:inline;margin:0 4px;">
            <button class="small-btn" onclick="atualizarEstoque('${id}', document.getElementById('stock_${id}').value)">Salvar</button>
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
            <button class="small-btn"
              onclick="editarProduto('${id}','${p.name.replace(/'/g,"\\'")}','${(p.description||"").replace(/'/g,"\\'")}',${p.price},${p.stock},'${p.imgUrl||""}')">
              Editar
            </button>
            <button class="small-btn danger" onclick="deletarProduto('${id}','${p.name.replace(/'/g,"\\'")}')">Remover</button>
          </div>
        </div>`;
    }
    html += '</div>';
    div.innerHTML = html;
  });
}

// ============================================================
//  ADMIN — Pedidos
// ============================================================
function loadAllOrders() {
  db.ref("orders").once("value").then(s => {
    const orders = s.val();
    const div    = document.getElementById("allOrdersList");
    if (!orders) { div.innerHTML = "<p>Nenhum pedido encontrado.</p>"; return; }

    let html = '<div class="orders-grid" style="margin-top:12px">';
    Object.entries(orders).reverse().forEach(([id, o]) => {
      const itens = o.itens ? Object.values(o.itens).map(i => `${i.name} x${i.qty}`).join(", ") : (o.product || "—");
      html += `
        <div class="order-card">
          <strong>Pedido #${id.slice(-6)}</strong><br>
          <small>${o.userEmail || o.userId || "?"}</small><br>
          ${itens}<br>
          <strong>R$ ${parseFloat(o.total || 0).toFixed(2)}</strong><br>
          Status: <span class="status-${o.status}">${o.status}</span><br>
          <small>${o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""}</small><br>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">
            <button class="small-btn" onclick="updateOrderStatus('${id}','processing')">Processing</button>
            <button class="small-btn" onclick="updateOrderStatus('${id}','completed')">Concluído</button>
            <button class="small-btn danger" onclick="updateOrderStatus('${id}','cancelled')">Cancelar</button>
          </div>
        </div>`;
    });
    html += '</div>';
    div.innerHTML = html;
    log("Pedidos carregados.");
  });
}

function updateOrderStatus(orderId, status) {
  db.ref("orders/" + orderId + "/status").set(status)
    .then(() => { log("Pedido " + orderId.slice(-6) + " → " + status); loadAllOrders(); })
    .catch(err => log("ERRO: " + err.message));
}

// ============================================================
//  ADMIN — Usuários
// ============================================================
function loadUsers() {
  db.ref("users").once("value").then(s => {
    const users = s.val();
    const div   = document.getElementById("usersList");
    if (!users) { div.innerHTML = "<p>Nenhum usuário encontrado.</p>"; return; }

    let html = '<div class="users-grid" style="margin-top:12px">';
    for (const uid in users) {
      const u = users[uid];
      html += `
        <div class="user-card">
          <strong>${u.name || "Sem nome"}</strong><br>
          <small>${u.email}</small><br>
          <span class="role-${u.role}">${u.role}</span><br>
          <small>Desde: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "?"}</small><br>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            <button class="small-btn" onclick="promoteUser('${uid}','admin')">Tornar Admin</button>
            <button class="small-btn" onclick="promoteUser('${uid}','user')">Tornar User</button>
            <button class="small-btn danger" onclick="deleteUser('${uid}')">Remover</button>
          </div>
        </div>`;
    }
    html += '</div>';
    div.innerHTML = html;
    log("Usuários carregados.");
  });
}

function promoteUser(uid, role) {
  db.ref("users/" + uid + "/role").set(role)
    .then(() => { log("Usuário " + uid.slice(-6) + " → " + role); loadUsers(); loadAdminStats(); })
    .catch(err => log("ERRO: " + err.message));
}

function deleteUser(uid) {
  if (!confirm("Remover este usuário do banco?")) return;
  db.ref("users/" + uid).remove()
    .then(() => { log("Usuário " + uid.slice(-6) + " removido."); loadUsers(); loadAdminStats(); })
    .catch(err => log("ERRO: " + err.message));
}

// ============================================================
//  ADMIN — Sistema
// ============================================================
function loadSystemLogs() {
  db.ref("admin-data/logs").limitToLast(50).once("value").then(s => {
    const logs = s.val();
    const out  = document.getElementById("output");
    if (!logs) { out.querySelector(".logs").innerHTML = '<div class="log-entry">Nenhum log.</div>'; return; }
    let html = '';
    Object.values(logs).reverse().forEach(e => {
      html += `<div class="log-entry">[${e.timestamp || "?"}] ${e.message || JSON.stringify(e)}</div>`;
    });
    out.querySelector(".logs").innerHTML = html;
  });
}

function clearAllOrders() {
  if (!confirm("Apagar TODOS os pedidos?")) return;
  db.ref("orders").remove()
    .then(() => {
      document.getElementById("allOrdersList").innerHTML = "";
      loadAdminStats();
      log("Todos os pedidos removidos.");
    })
    .catch(err => log("ERRO: " + err.message));
}

// ============================================================
//  LOG HELPER
// ============================================================
function log(msg) {
  const logsDiv = document.querySelector("#output .logs");
  const time    = new Date().toLocaleTimeString("pt-BR");
  const entry   = document.createElement("div");
  entry.className   = "log-entry";
  entry.textContent = "[" + time + "] " + msg;
  logsDiv.prepend(entry);

  // Persiste no Firebase em admin-data/logs
  db.ref("admin-data/logs").push({
    message:   msg,
    timestamp: new Date().toISOString()
  });
}
