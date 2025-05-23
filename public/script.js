const socket = io('https://watchtogether1.onrender.com');
const name = localStorage.getItem('name');
const room = localStorage.getItem('room');

document.getElementById('roomTitle').innerText = `Room Code: ${room}`;

const video = document.getElementById('video');
const chatInput = document.getElementById('chatInput');
const messages = document.getElementById('messages');

let ytPlayer;
let isYouTube = false;

// Join the room
socket.emit('join-room', room, name);

// Listen to chat messages
socket.on('chat-message', msg => {
  const div = document.createElement('div');
  const [username, ...text] = msg.split(': ');
  div.innerHTML = `<strong>${username}</strong>: ${text.join(': ')}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// Send message on Enter
chatInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

// Send message on button click
document.getElementById('sendMsgBtn').onclick = sendMessage;

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  socket.emit('chat-message', text);
  chatInput.value = '';
}

// Upload video
document.getElementById('uploadForm').onsubmit = async (e) => {
  e.preventDefault();
  const file = document.getElementById('videoFile').files[0];
  if (!file) return alert("Please select a video.");
  const formData = new FormData();
  formData.append('video', file);
  const res = await fetch('https://watchtogether1.onrender.com/upload', {
  method: 'POST',
  body: formData
});
  const data = await res.json();

  // Play video and broadcast to others
  video.src = data.videoPath;
  video.load();
  socket.emit('video-action', { type: 'new-video', videoPath: data.videoPath });
};

// Broadcast video actions
function sync(type, time = null) {
  socket.emit('video-action', { type, time });
}

// Send play/pause/seek
video.addEventListener('play', () => sync('play'));
video.addEventListener('pause', () => sync('pause'));
video.addEventListener('seeked', () => sync('seek', video.currentTime));

// Apply received video actions
socket.on('video-action', data => {
  if (data.type === 'new-video') {
    video.src = data.videoPath;
    video.load();
  }
  if (data.type === 'play' && video.paused) video.play();
  if (data.type === 'pause' && !video.paused) video.pause();
  if (data.type === 'seek' && Math.abs(video.currentTime - data.time) > 0.5) {
    video.currentTime = data.time;
  }
});

// YouTube sync
function loadYouTube() {
  const url = document.getElementById('youtubeUrl').value;
  const videoId = extractYouTubeID(url);
  if (!videoId) return alert('Invalid YouTube link');

  isYouTube = true;
  if (ytPlayer) ytPlayer.destroy();

  ytPlayer = new YT.Player('ytPlayer', {
    height: '390',
    width: '640',
    videoId,
    events: {
      onReady: () => socket.emit('youtube', { type: 'load', videoId }),
      onStateChange: onPlayerStateChange
    }
  });
}

function extractYouTubeID(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : null;
}

function onPlayerStateChange(event) {
  if (!isYouTube) return;
  if (event.data === YT.PlayerState.PLAYING) socket.emit('youtube', { type: 'play' });
  if (event.data === YT.PlayerState.PAUSED) socket.emit('youtube', { type: 'pause' });
}

socket.on('youtube', data => {
  if (!isYouTube && data.type === 'load') {
    ytPlayer = new YT.Player('ytPlayer', {
      height: '390',
      width: '640',
      videoId: data.videoId,
      events: {
        onReady: () => {},
        onStateChange: onPlayerStateChange,
      }
    });
    isYouTube = true;
  }

  if (isYouTube && ytPlayer) {
    if (data.type === 'play') ytPlayer.playVideo();
    if (data.type === 'pause') ytPlayer.pauseVideo();
  }
});

// Sidebar toggle
document.getElementById('menuToggle').onclick = () => {
  document.getElementById('sideMenu').classList.toggle('hidden');
};

function showYouTube() {
  document.getElementById('youtubeSection').classList.remove('hidden');
  document.getElementById('sideMenu').classList.add('hidden');
}

function exitRoom() {
  window.location.href = 'index.html';
}

const sideMenu = document.getElementById('sideMenu');
const menuToggle = document.getElementById('menuToggle');
const closeBtn = sideMenu.querySelector('.close-btn');

menuToggle.onclick = () => {
  sideMenu.classList.toggle('hidden');
};

closeBtn.onclick = () => {
  sideMenu.classList.add('hidden');
};

