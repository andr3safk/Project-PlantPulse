import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Dashboard } from './Dashboard'
import { PlantProvider } from './contexts/PlantContext'

const renderDashboard = () => render(
  <MemoryRouter>
    <PlantProvider>
      <Dashboard />
    </PlantProvider>
  </MemoryRouter>
)

describe('Dashboard', () => {
  it('renderiza el título "Mis Plantas"', () => {
    renderDashboard()
    expect(screen.getByText('Mis Plantas')).toBeInTheDocument()
  })

  it('muestra el enlace para agregar nueva planta', () => {
    renderDashboard()
    expect(screen.getByText(/Nueva Planta/i)).toBeInTheDocument()
  })

  it('muestra las 4 tarjetas de resumen', () => {
    renderDashboard()
    expect(screen.getByText('Total Plantas')).toBeInTheDocument()
    expect(screen.getByText('Saludables')).toBeInTheDocument()
    expect(screen.getByText('Atención Req.')).toBeInTheDocument()
    expect(screen.getByText('Sensores Activos')).toBeInTheDocument()
  })

  it('el modal de editar no está visible al inicio', () => {
    renderDashboard()
    expect(screen.queryByText('Editar Planta')).not.toBeInTheDocument()
  })

  it('el modal de eliminar no está visible al inicio', () => {
    renderDashboard()
    expect(screen.queryByText('¿Estás seguro?')).not.toBeInTheDocument()
  })
})

describe('Editar planta', () => {
  // Abre el modal de edición de la planta en la posición indicada (0 = Monstruo, 1 = Serpientina)
  const abrirEditar = async (user, indice = 0) => {
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[indice])
  }

  const inputNombre = () => screen.getByLabelText('Nombre')
  const inputEspecie = () => screen.getByLabelText('Especie')
  const botonGuardar = () => screen.getByRole('button', { name: 'Guardar' })

  it('al pulsar Editar abre el modal con nombre y especie precargados', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await abrirEditar(user)

    expect(screen.getByRole('heading', { name: 'Editar Planta' })).toBeInTheDocument()
    expect(inputNombre()).toHaveValue('Monstruo')
    expect(inputEspecie()).toHaveValue('Monstera Deliciosa')
  })

  it('deshabilita Guardar sin cambios y también si solo se agregan espacios', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await abrirEditar(user)
    expect(botonGuardar()).toBeDisabled()

    await user.type(inputNombre(), '   ')
    await user.type(inputEspecie(), '  ')
    expect(inputNombre()).toHaveValue('Monstruo   ')
    expect(botonGuardar()).toBeDisabled()
  })

  it('con el nombre vacío muestra el error y no cambia la planta', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await abrirEditar(user)
    await user.clear(inputNombre())
    await user.click(botonGuardar())

    expect(screen.getByRole('alert')).toHaveTextContent(/nombre es un campo obligatorio/i)
    expect(inputNombre()).toHaveAttribute('aria-invalid', 'true')
    expect(inputEspecie()).not.toHaveAttribute('aria-invalid')
    // El modal sigue abierto y la tarjeta conserva el nombre original
    expect(screen.getByRole('heading', { name: 'Editar Planta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Monstruo' })).toBeInTheDocument()
  })

  it('el error desaparece al volver a escribir en el campo', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await abrirEditar(user)
    await user.clear(inputNombre())
    await user.click(botonGuardar())
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.type(inputNombre(), 'M')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(inputNombre()).not.toHaveAttribute('aria-invalid')
  })

  it('una edición válida con espacios de más guarda el nombre normalizado y cierra el modal', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await abrirEditar(user)
    await user.clear(inputNombre())
    await user.type(inputNombre(), '  Mi    Monstera  ')
    await user.click(botonGuardar())

    expect(screen.queryByRole('heading', { name: 'Editar Planta' })).not.toBeInTheDocument()
    // Testing Library unifica espacios al buscar por nombre, así que se compara textContent exacto
    const titulo = screen.getByRole('heading', { level: 3, name: 'Mi Monstera' })
    expect(titulo.textContent).toBe('Mi Monstera')
    expect(screen.queryByRole('heading', { level: 3, name: 'Monstruo' })).not.toBeInTheDocument()
  })

  it('Cancelar descarta los cambios y al reabrir no hay errores', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await abrirEditar(user)
    await user.clear(inputNombre())
    await user.click(botonGuardar())
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('heading', { name: 'Editar Planta' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Monstruo' })).toBeInTheDocument()

    await abrirEditar(user)
    expect(inputNombre()).toHaveValue('Monstruo')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(inputNombre()).not.toHaveAttribute('aria-invalid')
  })

  it('al abrir otra planta precarga los datos de esa planta', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await abrirEditar(user, 0)
    await user.type(inputNombre(), ' cambiado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await abrirEditar(user, 1)
    expect(inputNombre()).toHaveValue('Serpientina')
    expect(inputEspecie()).toHaveValue('Sansevieria Trifasciata')
  })
})
