import React, { useEffect, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import "./App.css";

const API_URL = "http://localhost:4001/api";
const WS_URL = "ws://localhost:4002";

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  /* ================= AUTH ================= */

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      setError("Credenciais inválidas");
      return;
    }

    const data = await res.json();
    const decoded = jwtDecode(data.token);

    setToken(data.token);
    setUser({ id: decoded.id, username: decoded.username });
  }
  /* ================= WEBSOCKET ================= */

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "register", token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "new_message") {
        setMessages((prev) => [...prev, data.message]);
      }

      if (data.type === "typing" && data.from === selectedContact?.id) {
        setTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTyping(false), 1500);
      }

      if (data.type === "seen") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, seen: true } : m
          )
        );
      }
    };

    return () => ws.close();
  }, [token, selectedContact]);

  /* ================= CONTACTS ================= */

  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setContacts(data.users));
  }, [token]);

  /* ================= MESSAGES ================= */

  function loadMessages(contact) {
    setSelectedContact(contact);

    fetch(`${API_URL}/messages/${contact.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMessages(data.messages));
  }

  async function sendMessage() {
    if (!input.trim()) return;

    await fetch(`${API_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiver_id: selectedContact.id,
        message: input,
      }),
    });

    setInput("");
  }

  function handleTyping() {
    wsRef.current?.send(
      JSON.stringify({ type: "typing", to: selectedContact.id })
    );
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================= LOGIN UI ================= */

  if (!token || !user) {
    return (
      <div className="login-container">
        <form className="login-card" onSubmit={handleLogin}>
          <h2>Login</h2>

          <input
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Entrar</button>
          {error && <span className="error">{error}</span>}
        </form>
      </div>
    );
  }

  /* ================= CHAT UI ================= */

  return (
    <div className="app">
      <aside className="sidebar">
        <header>{user.username}</header>

        {contacts.map((c) => (
          <div
            key={c.id}
            className="contact"
            onClick={() => loadMessages(c)}
          >
            {c.username}
          </div>
        ))}
      </aside>

      <main className="chat">
        {selectedContact ? (
          <>
            <header>
              {selectedContact.username}
              {typing && <span className="typing"> digitando...</span>}
            </header>

            <div className="messages">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`message ${m.sender_id === user.id ? "me" : "other"}`}
                >
                  <span>{m.message}</span>
                  <div className="meta">
                    {m.time}{" "}
                    {m.sender_id === user.id && (
                      <span className={m.seen ? "seen" : ""}>✓✓</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <footer>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleTyping}
                placeholder="Digite uma mensagem"
              />
              <button onClick={sendMessage}>Enviar</button>
            </footer>
          </>
        ) : (
          <div className="empty">Selecione uma conversa</div>
        )}
      </main>
    </div>
  );
}
