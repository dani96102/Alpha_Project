// server/game-state.js
// برای MVP از یک آبجکت ساده در حافظه استفاده می‌کنیم
// در نسخه نهایی باید از Firestore استفاده کرد
const players = {}; // { socketId: { id: socketId, x: 0, y: 0, tgUser: null }, ... }

function addPlayer(socketId, tgUser = null) {
  if (players[socketId]) return players[socketId]; // Already exists

  players[socketId] = {
    id: socketId,
    x: Math.random() * 300 + 50, // موقعیت اولیه تصادفی
    y: Math.random() * 300 + 50,
    tgUser: tgUser // ذخیره اطلاعات کاربر تلگرام (در صورت وجود)
  };
  console.log('Player added:', socketId, tgUser ? tgUser.first_name : 'Guest');
  return players[socketId];
}

function removePlayer(socketId) {
  if (players[socketId]) {
    console.log('Player removed:', socketId);
    delete players[socketId];
  }
}

function updatePlayerPosition(socketId, x, y) {
  if (players[socketId]) {
    players[socketId].x = x;
    players[socketId].y = y;
    // اینجا می‌تونی اعتبارسنجی حرکت رو اضافه کنی
    return players[socketId];
  }
  return null;
}

function getPlayer(socketId) {
  return players[socketId];
}

function getAllPlayers() {
  return players;
}

module.exports = {
  addPlayer,
  removePlayer,
  updatePlayerPosition,
  getPlayer,
  getAllPlayers
};