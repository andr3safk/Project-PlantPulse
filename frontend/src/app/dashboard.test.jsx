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