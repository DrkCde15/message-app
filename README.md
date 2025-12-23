# 📩 Message App

Aplicação de mensagens em tempo real utilizando **Node.js** no back-end e **React** no front-end.

Projeto focado em simplicidade, separação de responsabilidades e base sólida para evolução futura.

Nada de excesso de framework, nada de mágica escondida.

---

## 🧱 Stack Tecnológica

### Back-end
- Node.js
- Express
- WebSocket (`ws`)
- SQLite3
- CORS
- Body-parser

### Front-end
- React
- Lucide React (ícones)

---

## 📂 Estrutura do Projeto

```

messaging-app/
│
├── server/
│   ├── server.js
│   ├── package.json
│
└── client/
├── public/
├── src/
├── package.json

````

---

## 📋 Pré-requisitos

- Node.js (versão LTS recomendada)
- NPM ou Yarn
- Terminal (CMD, PowerShell ou Bash)

---

## 📥 Clonando o Repositório

```bash
git clone https://github.com/seu-usuario/messaging-app.git
cd messaging-app
````

---

## 📦 Instalação de Dependências

### Back-end

```bash
cd server
npm install express sqlite3 ws cors body-parser bcrypt jsonwebtoken helmet express-rate-limit npm install dotenv morgan uuid
```

### Front-end

```bash
cd ../client
npm install
npm install lucide-react jwt-decode
```

---

## 🔧 Back-end (Node.js)

> **Todas as etapas via terminal**

### Criar estrutura inicial

```bash
mkdir messaging-app
cd messaging-app
mkdir server
cd server
npm init -y
```

### Instalar dependências

```bash
npm install express sqlite3 ws cors body-parser
```

### Executar o servidor

```bash
node server.js
```

Servidor rodando por padrão em:

```
http://localhost:4001
```

(WebSocket ativo no mesmo host)

---

## 🎨 Front-end (React)

```bash
cd ..
npx create-react-app client
cd client
npm install lucide-react
```

### Executar o front-end

```bash
npm start
```

Aplicação disponível em:

```
http://localhost:4000
```

---

## 🔌 Comunicação em Tempo Real

* WebSocket para troca de mensagens
* Conexão persistente
* Baixa latência
* Ideal para chats 1–1 ou por salas

---

## 🗄️ Persistência de Dados

* Banco local com **SQLite**
* Estrutura simples
* Fácil migração para PostgreSQL ou MySQL

---

## 🧪 Scripts Úteis

### Back-end

```bash
node server.js
```

### Front-end

```bash
npm start
```

---