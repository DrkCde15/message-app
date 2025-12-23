//npm install lucide-react 
import React, { useState, useEffect, useRef } from 'react';
import { Send, User, LogOut, MessageSquare } from 'lucide-react';

const API_URL = 'http://localhost:4001/api';
const WS_URL = 'ws://localhost:4002';

export default function MessagingApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    if (!currentUser) return;
    
    const websocket = new WebSocket(WS_URL);
    
    websocket.onopen = () => {
      websocket.send(JSON.stringify({ type: 'register', userId: currentUser.id }));
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        if (selectedContact && 
            (data.message.sender_id === selectedContact.id || 
             data.message.receiver_id === selectedContact.id)) {
          setMessages(prev => [...prev, data.message]);
        }
      }
    };
    
    return () => {
      websocket.close();
    };
  }, [currentUser, selectedContact]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        loadContacts(data.user.id);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Erro ao fazer login');
    }
  };

  // Load contacts
  const loadContacts = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}`);
      const data = await res.json();
      setContacts(data.users);
    } catch (err) {
      console.error('Erro ao carregar contatos:', err);
    }
  };

  // Load messages
  const loadMessages = async (contactId) => {
    try {
      const res = await fetch(`${API_URL}/messages/${currentUser.id}/${contactId}`);
      const data = await res.json();
      setMessages(data.messages);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    }
  };

  // Select contact
  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    loadMessages(contact.id);
  };

  // Send message
  const handleSend = async () => {
    if (inputText.trim() && selectedContact) {
      try {
        const res = await fetch(`${API_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_id: currentUser.id,
            receiver_id: selectedContact.id,
            message: inputText
          })
        });
        const data = await res.json();
        setMessages([...messages, data.message]);
        setInputText('');
      } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Login Screen
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-96">
          <div className="text-center mb-6">
            <MessageSquare size={48} className="mx-auto text-blue-600 mb-2" />
            <h1 className="text-2xl font-bold text-gray-800">App de Mensagens</h1>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Usuário (usuario1 ou usuario2)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              placeholder="Senha (123456)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 mb-6 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main App Screen
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Contacts */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={24} />
            <span className="font-semibold">{currentUser.username}</span>
          </div>
          <button
            onClick={() => setCurrentUser(null)}
            className="hover:bg-blue-700 p-2 rounded-full transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {contacts.map(contact => (
            <div
              key={contact.id}
              onClick={() => handleSelectContact(contact)}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedContact?.id === contact.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-gray-300 rounded-full p-2">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{contact.username}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <User size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{selectedContact.username}</h2>
                  <p className="text-xs text-green-600">Online</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex mb-3 ${
                    msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow ${
                      msg.sender_id === currentUser.id
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="break-words">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender_id === currentUser.id ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex gap-2 items-end">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 resize-none border border-gray-300 rounded-2xl px-4 py-2 focus:outline-none focus:border-blue-500 max-h-32"
                  rows="1"
                />
                <button
                  onClick={handleSend}
                  className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                  disabled={!inputText.trim()}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <MessageSquare size={64} className="mx-auto mb-4" />
              <p className="text-lg">Selecione um contato para começar a conversar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}