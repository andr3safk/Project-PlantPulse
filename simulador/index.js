import dotenv from 'dotenv';
dotenv.config();

const { API_URL, DEVICE_KEY, INTERVALO_MS } = process.env;
let cola = [];

function enviarLectura(lectura) {
  return fetch(`${API_URL}/api/readings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Key': DEVICE_KEY,
    },
    body: JSON.stringify(lectura),
  }).then(r => ({ ok: r.ok, status: r.status, body: r.status === 201 ? r.json() : null }))
    .catch(() => ({ ok: false, status: 0 }));
}

async function ciclo() {
  try {
    const { generarLectura } = await import('./generarLectura.js');
    const lectura = generarLectura();
    const res = await enviarLectura(lectura);
    if (res.ok) console.log('201', res.body?.plantStatus);
    else if (res.status === 400 || res.status === 401) console.log(res.status, 'error fijo');
    else {
      // reintentar: encolar
      cola.push(lectura);
      if (cola.length > 100) cola.shift();
    }
  } catch (e) {
    console.error('Error ciclo:', e.message);
  }
}

setInterval(() => {
  while (cola.length > 0) {
    const pend = cola.shift();
    enviarLectura(pend).then(r => {
      if (r.ok) console.log('Reintento 201', r.body?.plantStatus);
      else console.log('Reintento fallido', r.status);
    });
  }
  ciclo();
}, Number(INTERVALO_MS) || 10000);

process.on('SIGINT', () => {
  console.log('Cierro simulador');
  process.exit(0);
});
