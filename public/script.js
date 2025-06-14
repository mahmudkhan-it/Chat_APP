const loginBox = document.getElementById('login-box');
const chatContainer = document.getElementById('chat-container');
const chatBox = document.getElementById('chat-box');
const imageInput = document.getElementById('imageInput');
const messageInput = document.getElementById('messageInput');

let socket = null;

async function register() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.ok) initChat();
  else showError(data.error);
}

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.ok) initChat();
  else showError(data.error);
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.reload();
}

function showError(msg) {
  document.getElementById('login-error').innerText = msg;
}

function initChat() {
  loginBox.style.display = 'none';
  chatContainer.style.display = 'block';

  socket = io();

  socket.on('loadMessages', messages => {
    chatBox.innerHTML = '';
    messages.forEach(addMessage);
  });

  socket.on('newMessage', addMessage);
}

function addMessage(msg) {
  const div = document.createElement('div');
  div.innerHTML = `<strong>${msg.username}</strong>: ${msg.text || ''}`;
  if (msg.image) {
    const img = document.createElement('img');
    img.src = msg.image;
    img.style.maxWidth = '400px';
    img.style.marginTop = '5px';
    div.appendChild(img);
  }
  div.style.marginBottom = '10px';
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function sendMessage() {
  const text = messageInput.value.trim();
  const imageFile = imageInput.files[0];

  if (!text && !imageFile) return;

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit('sendMessage', {
        text,
        image: reader.result
      });
    };
    reader.readAsDataURL(imageFile);
  } else {
    socket.emit('sendMessage', { text });
  }

  messageInput.value = '';
  imageInput.value = '';
}

// Auto-check session on page load
fetch('/api/check')
  .then(res => res.ok ? initChat() : null);
