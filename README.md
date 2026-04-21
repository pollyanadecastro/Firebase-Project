# 🛒 Sistema de Controle de Produtos com Firebase

## 📌 Descrição

Este projeto é um sistema simples de controle de produtos utilizando **HTML, CSS e JavaScript**, integrado ao Firebase (Realtime Database e Authentication).

Permite:

* Cadastro de produtos
* Edição de produtos
* Controle de estoque
* Sistema de usuários (com admin)

---

## ⚙️ Tecnologias Utilizadas

* HTML5
* CSS3
* JavaScript
* Firebase

  * Realtime Database
  * Authentication

---

## 🚀 Funcionalidades

### 👤 Usuários

* Cadastro e login
* Controle de acesso por função (admin ou usuário)

### 📦 Produtos

* Criar produtos
* Editar produtos
* Listar produtos
* Controle de estoque

### 🧾 Pedidos (Orders)

* Registro de pedidos
* Visualização por usuário ou admin

---

## 🔐 Regras do Banco (Firebase Rules)

Regras utilizadas:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",

    "users": {
      "$uid": {
        ".read": "auth.uid === $uid || root.child('users/' + auth.uid + '/role').val() === 'admin'",
        ".write": "auth.uid === $uid || root.child('users/' + auth.uid + '/role').val() === 'admin'"
      }
    },

    "products": {
      ".read": true,
      ".write": true
    },

    "orders": {
      "$orderId": {
        ".read": "auth != null && (data.child('userId').val() === auth.uid || root.child('users/' + auth.uid + '/role').val() === 'admin')",
        ".write": "auth != null"
      }
    },

    "logs": {
      ".read": "root.child('users/' + auth.uid + '/role').val() === 'admin'",
      ".write": "auth != null"
    }
  }
}
```

---

## 👑 Sistema de Admin

Para definir um usuário como administrador:

1. Acesse o **Realtime Database**
2. Vá na aba **Data**
3. Adicione:

```json
{
  "users": {
    "SEU_UID_AQUI": {
      "role": "admin"
    }
  }
}
```

---

## ▶️ Como Executar o Projeto

1. Clone o repositório:

```bash
git clone https://github.com/pollyanadecastro/Firebase-Project
```

2. Abra o projeto no Visual Studio Code

3. Execute o arquivo `index.html`

4. Certifique-se de que o Firebase está configurado corretamente no arquivo JS.

---

## 🧪 Testes

* Certifique-se de estar logado
* Verifique permissões no Firebase
* Utilize o console (F12) para debug

---

## ⚠️ Observações

* O sistema utiliza regras de segurança baseadas em autenticação
* Apenas administradores podem cadastrar produtos
* Projeto desenvolvido para fins educacionais



