// Pruebas unitarias de la validación de plantas (sin BD) — PLAN-53
import { describe, it, expect } from 'vitest';
import { normalizarTexto, validarPlanta } from './validarPlanta.js';

const VALIDA = { name: 'Monstera', species: 'Monstera deliciosa' };

describe('normalizarTexto', () => {
  it('quita espacios de los extremos y unifica los repetidos', () => {
    expect(normalizarTexto('  Mi    planta ')).toBe('Mi planta');
  });

  it('pasa a NFC (letra + tilde combinada → un solo carácter)', () => {
    const nfd = 'Potós'; // "ó" escrita como "o" + tilde combinada
    expect(normalizarTexto(nfd)).toBe('Potós');
    expect(normalizarTexto(nfd)).toHaveLength(5);
  });
});

describe('validarPlanta', () => {
  it('datos válidos → sin errores y datos normalizados', () => {
    const { datos, errores } = validarPlanta({ name: '  Mi    planta ', species: ' Ficus  lyrata ' });
    expect(errores).toEqual({});
    expect(datos).toEqual({ name: 'Mi planta', species: 'Ficus lyrata', location: null, imageUrl: null });
  });

  it('acepta tildes, ñ, números, guion, punto y paréntesis', () => {
    const { errores } = validarPlanta({ name: 'Ñame-2 (sala)', species: 'Dioscorea sp. Pérez' });
    expect(errores).toEqual({});
  });

  it('name y species vacíos o solo espacios → obligatorio', () => {
    const { errores } = validarPlanta({ name: '   ', species: '' });
    expect(errores.name).toBe('El nombre es un campo obligatorio.');
    expect(errores.species).toBe('La especie es un campo obligatorio.');
  });

  it('name y species ausentes o null → obligatorio', () => {
    expect(validarPlanta({}).errores).toEqual({
      name: 'El nombre es un campo obligatorio.',
      species: 'La especie es un campo obligatorio.',
    });
    expect(validarPlanta({ name: null, species: null }).errores.name).toBe('El nombre es un campo obligatorio.');
  });

  it('body que no es objeto (undefined, null, texto) → errores, no excepción', () => {
    for (const entrada of [undefined, null, 'hola', 42]) {
      expect(Object.keys(validarPlanta(entrada).errores)).toEqual(['name', 'species']);
    }
  });

  it('name o species que no son texto → error de validación, no excepción', () => {
    const { errores } = validarPlanta({ name: 123, species: { a: 1 } });
    expect(errores.name).toBe('El nombre debe ser un texto.');
    expect(errores.species).toBe('La especie debe ser un texto.');
  });

  it('respeta los mínimos (2) y máximos (50 y 100)', () => {
    expect(validarPlanta({ ...VALIDA, name: 'A' }).errores.name).toBe('El nombre debe tener al menos 2 caracteres.');
    expect(validarPlanta({ ...VALIDA, species: 'B' }).errores.species).toBe('La especie debe tener al menos 2 caracteres.');
    expect(validarPlanta({ ...VALIDA, name: 'a'.repeat(50) }).errores).toEqual({});
    expect(validarPlanta({ ...VALIDA, name: 'a'.repeat(51) }).errores.name).toBe('El nombre no puede superar los 50 caracteres.');
    expect(validarPlanta({ ...VALIDA, species: 'b'.repeat(100) }).errores).toEqual({});
    expect(validarPlanta({ ...VALIDA, species: 'b'.repeat(101) }).errores.species).toBe('La especie no puede superar los 100 caracteres.');
  });

  it('rechaza caracteres no permitidos', () => {
    const { errores } = validarPlanta({ name: '<script>', species: 'Rosa; DROP TABLE' });
    expect(errores.name).toBe('El nombre solo puede contener letras, números, espacios, guiones, puntos y paréntesis.');
    expect(errores.species).toBe('La especie solo puede contener letras, números, espacios, guiones, puntos y paréntesis.');
  });

  it('ignora campos que no son de la planta (status, userId, id, deviceId)', () => {
    const { datos } = validarPlanta({ ...VALIDA, status: 'critical', userId: 'x', id: 'y', deviceId: 'z' });
    expect(Object.keys(datos).sort()).toEqual(['imageUrl', 'location', 'name', 'species']);
  });
});

describe('validarPlanta — campos opcionales', () => {
  it('location e imageUrl vacíos, solo espacios o null → null', () => {
    expect(validarPlanta({ ...VALIDA, location: '   ', imageUrl: '' }).datos).toMatchObject({ location: null, imageUrl: null });
    expect(validarPlanta({ ...VALIDA, location: null, imageUrl: null }).datos).toMatchObject({ location: null, imageUrl: null });
  });

  it('location se normaliza y acepta hasta 50 caracteres', () => {
    expect(validarPlanta({ ...VALIDA, location: '  Sala   principal ' }).datos.location).toBe('Sala principal');
    expect(validarPlanta({ ...VALIDA, location: 'x'.repeat(50) }).errores).toEqual({});
    expect(validarPlanta({ ...VALIDA, location: 'x'.repeat(51) }).errores.location).toBe('La ubicación no puede superar los 50 caracteres.');
  });

  it('location con caracteres no permitidos o que no es texto → error', () => {
    expect(validarPlanta({ ...VALIDA, location: 'Sala #1' }).errores.location).toBe('La ubicación solo puede contener letras, números, espacios, guiones, puntos y paréntesis.');
    expect(validarPlanta({ ...VALIDA, location: 5 }).errores.location).toBe('La ubicación debe ser un texto.');
  });

  it('imageUrl acepta http:// y https://', () => {
    expect(validarPlanta({ ...VALIDA, imageUrl: ' https://ejemplo.com/a.jpg ' }).datos.imageUrl).toBe('https://ejemplo.com/a.jpg');
    expect(validarPlanta({ ...VALIDA, imageUrl: 'http://ejemplo.com/a.jpg' }).errores).toEqual({});
  });

  it('imageUrl con otro esquema, sin dominio o con espacios → error', () => {
    const mensaje = 'La URL de la imagen debe empezar por http:// o https://.';
    for (const url of ['javascript:alert(1)', 'ftp://x.com/a.jpg', 'ejemplo.com/a.jpg', 'https://', 'https://a b.com']) {
      expect(validarPlanta({ ...VALIDA, imageUrl: url }).errores.imageUrl).toBe(mensaje);
    }
  });

  it('imageUrl de más de 500 caracteres o que no es texto → error', () => {
    const larga = 'https://e.com/' + 'a'.repeat(500);
    expect(validarPlanta({ ...VALIDA, imageUrl: larga }).errores.imageUrl).toBe('La URL de la imagen no puede superar los 500 caracteres.');
    expect(validarPlanta({ ...VALIDA, imageUrl: true }).errores.imageUrl).toBe('La URL de la imagen debe ser un texto.');
  });
});
