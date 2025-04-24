// server/bot.js
const { Telegraf } = require('telegraf');
const { getEnvOrThrow } = require('./utils');

function setupBot(token) {
  const bot = new Telegraf(token);
  const miniAppUrl = getEnvOrThrow('MINI_APP_URL'); // آدرس فرانت‌اند از Firebase Hosting

  bot.start((ctx) => {
    console.log('Received /start from:', ctx.from.id);
    ctx.reply('سلام به پروژه آلفا! آماده‌ای برای یک ماجراجویی طنز و رازآلود؟ روی دکمه زیر کلیک کن!', {
      reply_markup: {
        // دکمه شیشه‌ای که مینی‌اپ رو باز می‌کنه
        inline_keyboard: [
          [{ text: '🚀 شروع بازی آلفا 🚀', web_app: { url: miniAppUrl } }]
        ]
      }
    });
  });

  bot.help((ctx) => ctx.reply('این ربات بازی چندنفره "پروژه آلفا" رو اجرا می‌کنه. با دستور /start می‌تونی وارد بازی بشی.'));

  // می‌تونی دستورات بیشتری اضافه کنی

  // فقط نمونه ربات رو برمی‌گردونیم، وبهوک در server.js تنظیم می‌شه
  return bot;
}

module.exports = { setupBot };