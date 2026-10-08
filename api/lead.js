/* Приём заявок с сайта и отправка в Telegram (Vercel Function).
 * Нужны переменные окружения в Vercel (Settings → Environment Variables):
 *   TELEGRAM_BOT_TOKEN — токен бота от @BotFather
 *   TELEGRAM_CHAT_IDS  — номера чатов через запятую (куда присылать заявки)
 * Без них функция отвечает 503, а сайт сам открывает письмо на info@rr-logistics.org. */
'use strict';

const ALLOWED_ORIGINS = ['https://rr-logistics.org', 'https://www.rr-logistics.org'];
const KINDS = { callback: 'Geri zəng / Обратный звонок', lead: 'Sorğu / Запрос', quote: 'Hesablama / Расчёт', contact: 'Mesaj / Сообщение' };
const hits = new Map(); // простейшее ограничение частоты (на один экземпляр функции)

const clip = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n);

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 2000) for (const [k, v] of hits) if (!v.some((t) => now - t < 10 * 60 * 1000)) hits.delete(k);
  return list.length > 5; // не больше 5 заявок за 10 минут с одного адреса
}

function buildText(b, kind) {
  const rows = [
    ['🆕 ' + (KINDS[kind] || KINDS.lead), ''],
    ['Ad / Имя', clip(b.name, 120)],
    ['Telefon', clip(b.phone, 40)],
    ['E-poçt', clip(b.email, 120)],
    ['Mövzu / Тема', clip(b.subject, 150)],
    ['Daşınma / Перевозка', clip(b.transport, 80)],
    ['Yük / Груз', clip(b.freight, 80)],
    ['Mesaj / Сообщение', clip(b.message, 1200)],
    ['Səhifə / Страница', clip(b.page, 200)],
  ];
  return rows.filter(([, v], i) => i === 0 || v).map(([k, v]) => (v ? `${k}: ${v}` : k)).join('\n');
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };

  if (req.method !== 'POST') return send(405, { ok: false, error: 'method' });
  const origin = req.headers.origin || '';
  if (!ALLOWED_ORIGINS.includes(origin)) return send(403, { ok: false, error: 'origin' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chats = String(process.env.TELEGRAM_CHAT_IDS || '').split(',').map((s) => s.trim()).filter((s) => /^-?\d{3,20}$/.test(s));
  if (!token || !chats.length) return send(503, { ok: false, error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return send(400, { ok: false, error: 'body' });

  if (body.hp) return send(200, { ok: true });                              // «ловушка» для роботов: молча принимаем и выбрасываем
  if (Number(body.t) < 2500) return send(400, { ok: false, error: 'too_fast' }); // человек не заполняет форму быстрее 2,5 секунды
  const kind = Object.prototype.hasOwnProperty.call(KINDS, body.kind) ? body.kind : 'lead';
  const phone = clip(body.phone, 40);
  const email = clip(body.email, 120);
  if (!phone && !email) return send(400, { ok: false, error: 'contact' });
  if (phone && !/^[0-9+()\-\s.]{5,40}$/.test(phone)) return send(400, { ok: false, error: 'phone' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(400, { ok: false, error: 'email' });

  const ip = String((req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '?').trim();
  if (limited(ip)) return send(429, { ok: false, error: 'rate' });

  const text = buildText({ ...body, phone, email }, kind);
  try {
    const results = await Promise.all(chats.map((chat_id) => fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text, disable_web_page_preview: true }),
    }).then((r) => r.ok)));
    if (!results.some(Boolean)) return send(502, { ok: false, error: 'telegram' });
    return send(200, { ok: true });
  } catch (e) {
    return send(502, { ok: false, error: 'telegram' });
  }
};
