// Pruebas del envío con cola de reintentos — PLAN-47 (sin red: enviar es simulado)
import { describe, it, expect } from 'vitest';
import { crearCola, clasificar, ejecutarCiclo, COLA_MAX } from './ciclo.js';

const L = (n) => ({ moisture: n, temperature: 22, light: 60 });

// enviar falso: responde en orden los estados indicados y registra lo enviado
function enviarFalso(estados) {
  const enviadas = [];
  const enviar = async (lectura) => {
    enviadas.push(lectura);
    const status = estados.length > 0 ? estados.shift() : 201;
    return { status, body: status === 201 ? { plantStatus: 'healthy' } : { message: 'x' } };
  };
  return { enviar, enviadas };
}

describe('clasificar', () => {
  it.each([
    [201, 'ok'],
    [0, 'reintentar'],
    [500, 'reintentar'],
    [503, 'reintentar'],
    [400, 'descartar'],
    [401, 'descartar'],
    [404, 'descartar'],
  ])('%s → %s', (status, esperado) => {
    expect(clasificar(status)).toBe(esperado);
  });
});

describe('crearCola', () => {
  it(`guarda como máximo ${COLA_MAX} y descarta la más antigua`, () => {
    const cola = crearCola();
    for (let i = 1; i <= COLA_MAX + 5; i++) cola.agregar(L(i));
    expect(cola.tamano).toBe(COLA_MAX);
    expect(cola.primero()).toEqual(L(6));
  });
});

describe('ejecutarCiclo', () => {
  it('201 → enviada y la cola sigue vacía', async () => {
    const cola = crearCola();
    const { enviar, enviadas } = enviarFalso([201]);
    expect(await ejecutarCiclo({ cola, enviar, lectura: L(1) })).toEqual({ enviada: true, enCola: 0 });
    expect(enviadas).toEqual([L(1)]);
  });

  it.each([0, 500])('status %s → la lectura se encola', async (status) => {
    const cola = crearCola();
    const { enviar } = enviarFalso([status]);
    expect(await ejecutarCiclo({ cola, enviar, lectura: L(1) })).toEqual({ enviada: false, enCola: 1 });
    expect(cola.primero()).toEqual(L(1));
  });

  it.each([400, 401])('status %s → no se encola (reintentar no sirve)', async (status) => {
    const cola = crearCola();
    const { enviar } = enviarFalso([status]);
    expect(await ejecutarCiclo({ cola, enviar, lectura: L(1) })).toEqual({ enviada: false, enCola: 0 });
  });

  it('cuando el backend vuelve, envía primero los pendientes en orden y luego la nueva', async () => {
    const cola = crearCola();
    cola.agregar(L(1));
    cola.agregar(L(2));
    const { enviar, enviadas } = enviarFalso([201, 201, 201]);
    expect(await ejecutarCiclo({ cola, enviar, lectura: L(3) })).toEqual({ enviada: true, enCola: 0 });
    expect(enviadas).toEqual([L(1), L(2), L(3)]);
  });

  it('si un pendiente vuelve a fallar, se detiene, no pierde nada y encola la nueva', async () => {
    const cola = crearCola();
    cola.agregar(L(1));
    cola.agregar(L(2));
    const { enviar, enviadas } = enviarFalso([201, 0]);
    expect(await ejecutarCiclo({ cola, enviar, lectura: L(3) })).toEqual({ enviada: false, enCola: 2 });
    expect(enviadas).toEqual([L(1), L(2)]); // L(3) no se intenta mientras el backend falla
    expect(cola.quitarPrimero()).toEqual(L(2));
    expect(cola.quitarPrimero()).toEqual(L(3));
  });

  it('un pendiente rechazado (400) se descarta y se sigue con el resto', async () => {
    const cola = crearCola();
    cola.agregar(L(1));
    cola.agregar(L(2));
    const { enviar, enviadas } = enviarFalso([400, 201, 201]);
    expect(await ejecutarCiclo({ cola, enviar, lectura: L(3) })).toEqual({ enviada: true, enCola: 0 });
    expect(enviadas).toEqual([L(1), L(2), L(3)]);
  });

  it('informa por log el plantStatus de la respuesta', async () => {
    const mensajes = [];
    const { enviar } = enviarFalso([201]);
    await ejecutarCiclo({ cola: crearCola(), enviar, lectura: L(1), log: (m) => mensajes.push(m) });
    expect(mensajes[0]).toContain('planta: healthy');
  });
});
