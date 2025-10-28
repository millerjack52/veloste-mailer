const nodemailer = require('nodemailer');


module.exports = async function handler(req, res) {
// ---- CORS (allow your static site + local dev) ----
const origin = req.headers.origin || '';
const ALLOW = [
'https://www.veloste.com',
'https://veloste.github.io', // if you ever use the default GH Pages domain
'http://localhost:5173', // Vite dev server
];
if (ALLOW.includes(origin)) {
res.setHeader('Access-Control-Allow-Origin', origin);
res.setHeader('Vary', 'Origin');
}
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(204).end();
if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');


try {
const raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
const { name, email, message } = schema.parse(raw);


const port = Number(process.env.SMTP_PORT || 465);
const transporter = nodemailer.createTransport({
host: process.env.SMTP_HOST,
port,
secure: port === 465, // SSL 465
requireTLS: port === 587, // STARTTLS 587
auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});


// Optional: comment out in production to save a round-trip
// await transporter.verify();


await transporter.sendMail({
from: process.env.MAIL_FROM, // must be verified/allowed
to: process.env.MAIL_TO,
replyTo: `${name} <${email}>`,
subject: `Veloste contact from ${name}`,
text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
html: `<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p style="white-space:pre-wrap">${message}</p>`,
});


return res.status(200).json({ ok: true });
} catch (err) {
if (err instanceof ZodError) {
const first = err.issues?.[0];
return res.status(400).json({ error: first?.message || 'Invalid input' });
}
return res.status(400).json({
error: err?.message || 'Unable to send message',
code: err?.code || err?.responseCode,
response: err?.response,
});
}
};