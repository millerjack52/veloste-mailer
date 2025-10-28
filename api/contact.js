// api/contact.js
const nodemailer = require('nodemailer');
const { z, ZodError } = require('zod');

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(5),
});

function send(res, code, body, headers = {}) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function noContent(res, headers = {}) {
  res.statusCode = 204;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end();
}

module.exports = async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const ALLOW = [
    'https://www.veloste.com',
    'https://veloste.github.io',
    'http://localhost:5173',
  ];
  if (ALLOW.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return noContent(res);
  if (req.method !== 'POST') return send(res, 405, { error: 'Method Not Allowed' });

  try {
    // Normalize body (object|string|undefined)
    let raw = req.body;
    if (typeof raw === 'undefined') {
      raw = await new Promise((resolve, reject) => {
        let buf = '';
        req.on('data', (c) => (buf += c));
        req.on('end', () => resolve(buf || '{}'));
        req.on('error', reject);
      });
    }
    const data = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;
    const { name, email, message } = schema.parse(data);

    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    // await transporter.verify(); // optional

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      replyTo: `${name} <${email}>`,
      subject: `Veloste contact from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p style="white-space:pre-wrap">${message}</p>`,
    });

    return send(res, 200, { ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues?.[0];
      return send(res, 400, { error: first?.message || 'Invalid input' });
    }
    return send(res, 400, {
      error: err?.message || 'Unable to send message',
      code: err?.code || err?.responseCode,
      response: err?.response,
    });
  }
};
