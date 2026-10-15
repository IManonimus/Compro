'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Truck,
  Ship,
  User,
  Phone,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  Anchor,
  Sparkles,
  Calculator,
  Compass,
  X,
  ArrowRight,
  Navigation,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react'
import type { OperationalOrder } from './OperationsWorkspace'

export type DriverStatus = 'Tersedia' | 'Dalam Pelayaran' | 'Pengantaran Darat' | 'Istirahat'

export type DriverTicketInfo = {
  ticketNumber: string
  shipName: string
  originPort: string
  destinationPort: string
  departureDate: string // YYYY-MM-DD
  departureTime: string // HH:mm
  seaDurationHours: number
  portHandlingHours: number
  landDeliveryHours: number
  finalDestinationAddress: string
  assignedResis: string[]
  notes: string
  manifestNumber?: string
}

export type Driver = {
  id: string
  code: string
  name: string
  phone: string
  licensePlate: string
  truckType: string
  status: DriverStatus
  ticket: DriverTicketInfo | null
  manifestNumber?: string
  lastCompletedManifest?: {
    ticket: DriverTicketInfo
    manifestNumber: string
    completedAt: string
  } | null
  createdAt: string
}

const DEFAULT_PORT_ROUTES: Record<string, { seaHours: number; handlingHours: number; landHours: number; destPort: string }> = {
  'Surabaya → Makassar': { seaHours: 28, handlingHours: 5, landHours: 6, destPort: 'Pelabuhan Soekarno-Hatta (Makassar)' },
  'Surabaya → Banjarmasin': { seaHours: 20, handlingHours: 4, landHours: 5, destPort: 'Pelabuhan Trisakti (Banjarmasin)' },
  'Surabaya → Balikpapan': { seaHours: 26, handlingHours: 5, landHours: 6, destPort: 'Pelabuhan Semayang (Balikpapan)' },
  'Jakarta → Pontianak': { seaHours: 32, handlingHours: 5, landHours: 7, destPort: 'Pelabuhan Dwikora (Pontianak)' },
  'Jakarta → Pangkal Pinang': { seaHours: 18, handlingHours: 4, landHours: 4, destPort: 'Pelabuhan Pangkal Balam' },
  'Surabaya → Lembar (Lombok)': { seaHours: 14, handlingHours: 3, landHours: 4, destPort: 'Pelabuhan Lembar (Lombok)' },
  'Banyuwangi → Gilimanuk (Bali)': { seaHours: 2, handlingHours: 2, landHours: 3, destPort: 'Pelabuhan Gilimanuk (Bali)' },
}

const POPULAR_SHIPS = [
  'KM Dharma Rucitra VII (DLU)',
  'KM Dharma Ferry VIII (DLU)',
  'KM Kirana IX (DLU)',
  'KM Niki Sejahtera',
  'KM Kumala',
  'KMP Legundi (ASDP)',
  'KM Swarna Bahari',
  'KM Mila Utama',
]

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv-1',
    code: 'DRV-001',
    name: 'Bambang Santoso',
    phone: '0812-3456-7890',
    licensePlate: 'L 9421 UZ',
    truckType: 'Hino Ranger 500 Wingbox',
    status: 'Dalam Pelayaran',
    manifestNumber: 'MNF-DRV001-20261012',
    ticket: {
      ticketNumber: 'TKT-DLU-20261012-09',
      shipName: 'KM Dharma Rucitra VII (DLU)',
      originPort: 'Pelabuhan Tanjung Perak (Surabaya)',
      destinationPort: 'Pelabuhan Tanjung Priok (Jakarta)',
      departureDate: new Date().toISOString().slice(0, 10),
      departureTime: '10:00',
      seaDurationHours: 28,
      portHandlingHours: 5,
      landDeliveryHours: 6,
      finalDestinationAddress: 'Gudang Distribusi Jakarta, Jl. Raya Cilincing No. 45, Jakarta Utara',
      assignedResis: ['NX1865100258', 'NX1864953729'],
      notes: 'Muatan bahan cairan dan material logam industri',
      manifestNumber: 'MNF-DRV001-20261012',
    },
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'drv-2',
    code: 'DRV-002',
    name: 'Joko Prabowo',
    phone: '0813-8877-2211',
    licensePlate: 'B 9821 TCI',
    truckType: 'Mitsubishi Fuso Fighter Box',
    status: 'Dalam Pelayaran',
    manifestNumber: 'MNF-DRV002-20261013',
    ticket: {
      ticketNumber: 'TKT-ASDP-20261013-14',
      shipName: 'KM Niki Sejahtera',
      originPort: 'Pelabuhan Tanjung Priok (Jakarta)',
      destinationPort: 'Pelabuhan Tanjung Perak (Surabaya)',
      departureDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      departureTime: '14:30',
      seaDurationHours: 20,
      portHandlingHours: 4,
      landDeliveryHours: 5,
      finalDestinationAddress: 'Kawasan Pergudangan Margomulyo, Surabaya / Malang',
      assignedResis: ['NX0659571704', 'NX2609280012'],
      notes: 'Tiket kapal sudah confirmed, muatan barang paket umum',
      manifestNumber: 'MNF-DRV002-20261013',
    },
    createdAt: '2026-09-10T09:30:00Z',
  },
  {
    id: 'drv-3',
    code: 'DRV-003',
    name: 'Suryadi Pratama',
    phone: '0852-7711-9944',
    licensePlate: 'B 9104 KXY',
    truckType: 'Isuzu Giga Tronton 6x2',
    status: 'Dalam Pelayaran',
    manifestNumber: 'MNF-DRV003-20261014',
    ticket: {
      ticketNumber: 'TKT-DLU-20261014-03',
      shipName: 'KM Kumala',
      originPort: 'Pelabuhan Tanjung Emas (Semarang)',
      destinationPort: 'Pelabuhan Dwikora (Pontianak)',
      departureDate: new Date().toISOString().slice(0, 10),
      departureTime: '11:00',
      seaDurationHours: 24,
      portHandlingHours: 4,
      landDeliveryHours: 5,
      finalDestinationAddress: 'Gudang Semarang / Yogyakarta',
      assignedResis: ['NX0659567580'],
      notes: 'Muatan barang konsinyasi',
      manifestNumber: 'MNF-DRV003-20261014',
    },
    createdAt: '2026-09-15T10:00:00Z',
  },
  {
    id: 'drv-4',
    code: 'DRV-004',
    name: 'Agus Hendrawan',
    phone: '0821-6655-4433',
    licensePlate: 'L 8390 AB',
    truckType: 'Colt Diesel Double (CDD) Long Box',
    status: 'Pengantaran Darat',
    manifestNumber: 'MNF-DRV004-20261010',
    ticket: {
      ticketNumber: 'TKT-DLU-20261010-04',
      shipName: 'KM Kirana IX (DLU)',
      originPort: 'Pelabuhan Tanjung Perak (Surabaya)',
      destinationPort: 'Pelabuhan Belawan (Medan)',
      departureDate: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
      departureTime: '08:00',
      seaDurationHours: 26,
      portHandlingHours: 5,
      landDeliveryHours: 6,
      finalDestinationAddress: 'Gudang Konsinyasi Medan / Denpasar',
      assignedResis: ['NX2609280013', 'NX2609280014'],
      notes: 'Barang sedang dalam perjalanan ke gudang penerima',
      manifestNumber: 'MNF-DRV004-20261010',
    },
    createdAt: '2026-09-20T11:00:00Z',
  },
]

export function getStoredDrivers(): Driver[] {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ls_drivers_data')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        // fallback
      }
    }
  }
  return INITIAL_DRIVERS
}

export function saveStoredDrivers(drivers: Driver[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ls_drivers_data', JSON.stringify(drivers))
    window.dispatchEvent(new Event('ls_drivers_updated'))
  }
}

export function calculateSmartEta(ticket: DriverTicketInfo) {
  if (!ticket.departureDate) return null

  const timeParts = (ticket.departureTime || '08:00').split(':')
  const hours = parseInt(timeParts[0] || '8', 10)
  const minutes = parseInt(timeParts[1] || '0', 10)

  const departureDateTime = new Date(ticket.departureDate)
  departureDateTime.setHours(hours, minutes, 0, 0)

  // Step 1: Sea voyage
  const seaArrival = new Date(departureDateTime.getTime() + ticket.seaDurationHours * 3600000)

  // Step 2: Port clearance & handling
  const portClearance = new Date(seaArrival.getTime() + ticket.portHandlingHours * 3600000)

  // Step 3: Land haulage to final recipient / destination warehouse
  const finalEta = new Date(portClearance.getTime() + ticket.landDeliveryHours * 3600000)

  const totalTransitHours = ticket.seaDurationHours + ticket.portHandlingHours + ticket.landDeliveryHours

  return {
    departureDateTime,
    seaArrival,
    portClearance,
    finalEta,
    totalTransitHours,
  }
}

function formatFullDateTime(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getDriverManifestNumber(driver: Driver, ticket?: DriverTicketInfo | null): string {
  if (ticket?.manifestNumber) return ticket.manifestNumber
  if (driver.manifestNumber) return driver.manifestNumber
  const code = driver.code.replace(/[^A-Za-z0-9]/g, '') || 'DRV001'
  const dateStr = ticket?.departureDate
    ? ticket.departureDate.replace(/-/g, '')
    : new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `MNF-${code}-${dateStr}`
}

export default function DriverWorkspace({
  page,
  orders,
  onNavigate,
  onTrackResi,
}: {
  page: 'drivers' | 'pengiriman'
  orders: OperationalOrder[]
  onNavigate?: (page: 'drivers' | 'pengiriman') => void
  onTrackResi?: (resi: string) => void
}) {
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ls_drivers_data')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_DRIVERS
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)

  // Driver Form State
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    licensePlate: '',
    truckType: 'Hino Ranger 500 Wingbox',
    status: 'Tersedia' as DriverStatus,
  })

  // Ticket Form State
  const [ticketForm, setTicketForm] = useState<DriverTicketInfo>({
    ticketNumber: '',
    shipName: POPULAR_SHIPS[0],
    originPort: 'Pelabuhan Tanjung Perak (Surabaya)',
    destinationPort: 'Pelabuhan Soekarno-Hatta (Makassar)',
    departureDate: new Date().toISOString().slice(0, 10),
    departureTime: '10:00',
    seaDurationHours: 28,
    portHandlingHours: 5,
    landDeliveryHours: 6,
    finalDestinationAddress: '',
    assignedResis: [],
    notes: '',
  })

  // Calculator Simulator State (Pengiriman)
  const [calcRoute, setCalcRoute] = useState('Surabaya → Makassar')
  const [calcDate, setCalcDate] = useState(new Date().toISOString().slice(0, 10))
  const [calcTime, setCalcTime] = useState('14:00')

  // Save to localStorage whenever drivers change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ls_drivers_data', JSON.stringify(drivers))
    }
  }, [drivers])

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase()) ||
        d.truckType.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [drivers, search, statusFilter])

  function openAddDriver() {
    setEditingDriver(null)
    setDriverForm({
      name: '',
      phone: '',
      licensePlate: '',
      truckType: 'Hino Ranger 500 Wingbox',
      status: 'Tersedia',
    })
    setIsDriverModalOpen(true)
  }

  function openEditDriver(driver: Driver) {
    setEditingDriver(driver)
    setDriverForm({
      name: driver.name,
      phone: driver.phone,
      licensePlate: driver.licensePlate,
      truckType: driver.truckType,
      status: driver.status,
    })
    setIsDriverModalOpen(true)
  }

  function saveDriver() {
    if (!driverForm.name.trim() || !driverForm.licensePlate.trim()) return

    if (editingDriver) {
      setDrivers(prev =>
        prev.map(d =>
          d.id === editingDriver.id
            ? {
                ...d,
                name: driverForm.name.trim(),
                phone: driverForm.phone.trim(),
                licensePlate: driverForm.licensePlate.trim(),
                truckType: driverForm.truckType,
                status: driverForm.status,
              }
            : d
        )
      )
    } else {
      const newDriver: Driver = {
        id: 'drv-' + Date.now(),
        code: `DRV-00${drivers.length + 1}`,
        name: driverForm.name.trim(),
        phone: driverForm.phone.trim(),
        licensePlate: driverForm.licensePlate.trim(),
        truckType: driverForm.truckType,
        status: driverForm.status,
        ticket: null,
        createdAt: new Date().toISOString(),
      }
      setDrivers(prev => [newDriver, ...prev])
    }
    setIsDriverModalOpen(false)
  }

  function deleteDriver(driver: Driver) {
    if (confirm(`Hapus data sopir "${driver.name}" (${driver.licensePlate})?`)) {
      setDrivers(prev => prev.filter(d => d.id !== driver.id))
      if (selectedDriver?.id === driver.id) {
        setSelectedDriver(null)
      }
    }
  }

  function openAddShipment() {
    const candidate = drivers.find(d => !d.ticket && d.status === 'Tersedia') || drivers.find(d => !d.ticket) || drivers[0]
    if (!candidate) {
      alert('Belum ada data armada sopir. Silakan tambahkan data sopir terlebih dahulu di menu Data Sopir.')
      return
    }
    setSelectedDriver(candidate)
    const routeData = DEFAULT_PORT_ROUTES['Surabaya → Makassar'] || { seaHours: 28, handlingHours: 5, landHours: 6, destPort: 'Pelabuhan Soekarno-Hatta (Makassar)' }

    setTicketForm({
      ticketNumber: `TKT-DLU-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${candidate.code.replace(/\D/g, '') || '01'}`,
      shipName: POPULAR_SHIPS[0],
      originPort: 'Pelabuhan Tanjung Perak (Surabaya)',
      destinationPort: routeData.destPort,
      departureDate: new Date().toISOString().slice(0, 10),
      departureTime: '12:00',
      seaDurationHours: routeData.seaHours,
      portHandlingHours: routeData.handlingHours,
      landDeliveryHours: routeData.landHours,
      finalDestinationAddress: 'Gudang Distribusi Tujuan',
      assignedResis: [],
      notes: '',
    })
    setIsTicketModalOpen(true)
  }

  function openManageTicket(driver: Driver) {
    setSelectedDriver(driver)
    if (driver.ticket) {
      setTicketForm(driver.ticket)
    } else {
      setTicketForm({
        ticketNumber: `TKT-DLU-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${driver.code.replace(/\D/g, '') || '01'}`,
        shipName: POPULAR_SHIPS[0],
        originPort: 'Pelabuhan Tanjung Perak (Surabaya)',
        destinationPort: 'Pelabuhan Soekarno-Hatta (Makassar)',
        departureDate: new Date().toISOString().slice(0, 10),
        departureTime: '12:00',
        seaDurationHours: 28,
        portHandlingHours: 5,
        landDeliveryHours: 6,
        finalDestinationAddress: 'Gudang Tujuan Pengirim / Penerima',
        assignedResis: [],
        notes: '',
      })
    }
    setIsTicketModalOpen(true)
  }

  function applyPresetRouteToTicket(routeName: string) {
    const routeData = DEFAULT_PORT_ROUTES[routeName]
    if (!routeData) return
    const parts = routeName.split(' → ')
    const origin = parts[0] ? `Pelabuhan ${parts[0]}` : ticketForm.originPort
    setTicketForm(t => ({
      ...t,
      originPort: origin,
      destinationPort: routeData.destPort,
      seaDurationHours: routeData.seaHours,
      portHandlingHours: routeData.handlingHours,
      landDeliveryHours: routeData.landHours,
    }))
  }

  function saveTicket() {
    if (!selectedDriver) return

    // Sinkronisasi data manifest: simpan atau perbarui nomor manifest unik
    const mnfNum = getDriverManifestNumber(selectedDriver, ticketForm)
    const updatedTicket: DriverTicketInfo = {
      ...ticketForm,
      manifestNumber: mnfNum,
    }

    setDrivers(prev =>
      prev.map(d =>
        d.id === selectedDriver.id
          ? {
              ...d,
              status: 'Dalam Pelayaran',
              ticket: updatedTicket,
              manifestNumber: mnfNum,
            }
          : d
      )
    )
    setSelectedDriver(curr => (curr ? { ...curr, status: 'Dalam Pelayaran', ticket: updatedTicket, manifestNumber: mnfNum } : null))
    setIsTicketModalOpen(false)
  }

  function removeTicketFromDriver(driver: Driver) {
    if (confirm(`Selesaikan pengiriman untuk sopir "${driver.name}"? Status armada akan dikembalikan menjadi Tersedia.`)) {
      setDrivers(prev =>
        prev.map(d =>
          d.id === driver.id
            ? {
                ...d,
                ticket: null,
                status: 'Tersedia',
              }
            : d
        )
      )
      if (selectedDriver?.id === driver.id) {
        setSelectedDriver(curr => (curr ? { ...curr, ticket: null, status: 'Tersedia' } : null))
      }
    }
  }

  // Smart ETA for simulated calculator in Pengiriman
  const simulatedEta = useMemo(() => {
    const routeData = DEFAULT_PORT_ROUTES[calcRoute] || { seaHours: 24, handlingHours: 4, landHours: 5, destPort: 'Pelabuhan Tujuan' }
    const tempTicket: DriverTicketInfo = {
      ticketNumber: 'SIMULATION',
      shipName: 'Kapal Pelayaran Terpilih',
      originPort: calcRoute.split(' → ')[0] ? `Pelabuhan ${calcRoute.split(' → ')[0]}` : 'Pelabuhan Asal',
      destinationPort: routeData.destPort,
      departureDate: calcDate,
      departureTime: calcTime,
      seaDurationHours: routeData.seaHours,
      portHandlingHours: routeData.handlingHours,
      landDeliveryHours: routeData.landHours,
      finalDestinationAddress: 'Gudang Utama Tujuan',
      assignedResis: [],
      notes: '',
    }
    return calculateSmartEta(tempTicket)
  }, [calcRoute, calcDate, calcTime])

  const activeShipmentsCount = drivers.filter(d => d.ticket).length
  const sailingDriversCount = drivers.filter(d => d.status === 'Dalam Pelayaran').length
  const landDriversCount = drivers.filter(d => d.status === 'Pengantaran Darat').length
  const availableDriversCount = drivers.filter(d => d.status === 'Tersedia').length

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* ========== HALAMAN: DATA SOPIR (HANYA DATA SOPIR) ========== */}
      {/* ============================================================ */}
      {page === 'drivers' && (
        <>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-600)] text-white shadow-sm">
                  <Truck className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Data Sopir</h1>
              </div>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                Kelola data armada dan profil sopir staf operasional.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddDriver}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--brand-600)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-700)] active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Tambah Sopir Baru
            </button>
          </div>

          {/* Quick Metrics Sopir */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-[var(--text-soft)]">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Sopir</span>
                <User className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[var(--text)]">{drivers.length}</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Armada terdaftar</p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-semibold uppercase tracking-wider">Sopir Tersedia</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{availableDriversCount}</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Siap ditugaskan</p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-blue-600">
                <span className="text-xs font-semibold uppercase tracking-wider">Dalam Pelayaran</span>
                <Ship className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-600">{sailingDriversCount}</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Menyeberang kapal laut</p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-xs font-semibold uppercase tracking-wider">Pengantaran Darat</span>
                <Compass className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-600">{landDriversCount}</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Distribusi ke penerima</p>
            </div>
          </div>

          {/* Driver Controls & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama sopir, plat nomor, armada..."
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm text-[var(--text)] shadow-xs outline-none focus:border-[var(--brand-600)]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] shadow-xs outline-none focus:border-[var(--brand-600)]"
              >
                <option value="ALL">Semua Status</option>
                <option value="Tersedia">Tersedia</option>
                <option value="Dalam Pelayaran">Dalam Pelayaran</option>
                <option value="Pengantaran Darat">Pengantaran Darat</option>
                <option value="Istirahat">Istirahat</option>
              </select>
            </div>
          </div>

          {/* Driver Cards (Pure Driver Data) */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDrivers.map(driver => (
              <div
                key={driver.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-white p-5 shadow-xs transition hover:border-[var(--brand-600)] hover:shadow-md"
              >
                <div>
                  {/* Card Top: Driver identity & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                        <User className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[var(--text)]">{driver.name}</h3>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-600">
                            {driver.code}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-soft)]">
                          {driver.licensePlate}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        driver.status === 'Tersedia'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : driver.status === 'Dalam Pelayaran'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : driver.status === 'Pengantaran Darat'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {driver.status === 'Dalam Pelayaran' && <Ship className="mr-1 h-3 w-3" />}
                      {driver.status === 'Pengantaran Darat' && <Truck className="mr-1 h-3 w-3" />}
                      {driver.status === 'Tersedia' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {driver.status}
                    </span>
                  </div>

                  {/* Driver Details */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[var(--text-soft)]">Jenis Armada:</span>
                      <span className="font-semibold text-slate-800">{driver.truckType}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[var(--text-soft)]">Nomor Kontak:</span>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{driver.phone}</span>
                      </div>
                    </div>

                    {/* Operational Assignment Indicator */}
                    {driver.ticket ? (
                      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                            <Ship className="h-3 w-3 text-blue-600" />
                            Sedang Bertugas
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-blue-700">
                            {driver.ticket.ticketNumber}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-blue-800 font-medium">
                          {driver.ticket.shipName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-blue-600 line-clamp-1">
                          Rute: {driver.ticket.originPort.split('(')[0]?.trim()} → {driver.ticket.destinationPort.split('(')[0]?.trim()}
                        </p>
                        {onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('pengiriman')}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                          >
                            <span>Lihat jadwal di menu Pengiriman</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-2.5 text-center">
                        <p className="text-[11px] text-slate-500">
                          Sopir belum ditugaskan penyeberangan kapal.
                        </p>
                        {onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('pengiriman')}
                            className="mt-1 text-[11px] font-semibold text-[var(--brand-600)] hover:underline"
                          >
                            Jadwalkan di menu Pengiriman →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-400">
                    ID: {driver.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditDriver(driver)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      title="Ubah Profil Sopir"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDriver(driver)}
                      className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                      title="Hapus Sopir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredDrivers.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                <User className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-2 text-sm font-semibold text-slate-700">Tidak ada sopir ditemukan</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Coba ubah kata kunci pencarian atau filter status armada.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* ========== HALAMAN: PENGIRIMAN & PREDIKSI ETA ============== */}
      {/* ============================================================ */}
      {page === 'pengiriman' && (
        <>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                  <Navigation className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Pengiriman & Prediksi ETA</h1>
              </div>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                Hitung estimasi kedatangan (ETA) penyeberangan kapal laut secara real-time dan kelola jadwal pengiriman aktif seluruh armada.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddShipment}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Jadwalkan Pengiriman
            </button>
          </div>

          {/* Quick Metrics Pengiriman */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-indigo-700">
                <span className="text-xs font-semibold uppercase tracking-wider">Pengiriman Aktif</span>
                <Navigation className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-indigo-950">{activeShipmentsCount}</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Sopir dengan jadwal tiket</p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-blue-600">
                <span className="text-xs font-semibold uppercase tracking-wider">Di Kapal Laut</span>
                <Ship className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-600">{sailingDriversCount}</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Pelayaran antar pulau</p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-xs font-semibold uppercase tracking-wider">Pengantaran Darat</span>
                <Truck className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-600">{landDriversCount}</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Menuju gudang/penerima</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-semibold uppercase tracking-wider">Sopir Siap Jalan</span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{availableDriversCount}</p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">Tersedia untuk muatan baru</p>
            </div>
          </div>

          {/* Simulator Widget: Sistem Cerdas Prediksi ETA */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/60 p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-indigo-950">
                    Sistem Cerdas &quot;Prediksi ETA&quot; Penyeberangan Kapal Laut
                  </h2>
                  <p className="text-xs text-indigo-700">
                    Algoritma maritim menghitung durasi pelayaran kapal, bongkar muat di pelabuhan tujuan, dan distribusi darat ke alamat penerima.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-800 shadow-xs">
                <Calculator className="h-3.5 w-3.5" />
                Kalkulator Simulasi Real-Time
              </span>
            </div>

            {/* Input Parameters for Simulation */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Rute Penyeberangan Maritim</label>
                <select
                  value={calcRoute}
                  onChange={e => setCalcRoute(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 shadow-xs outline-none focus:border-indigo-600"
                >
                  {Object.keys(DEFAULT_PORT_ROUTES).map(route => (
                    <option key={route} value={route}>{route}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Tanggal Tiket Kapal</label>
                <input
                  type="date"
                  value={calcDate}
                  onChange={e => setCalcDate(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 shadow-xs outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Jam Keberangkatan Kapal</label>
                <input
                  type="time"
                  value={calcTime}
                  onChange={e => setCalcTime(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 shadow-xs outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Smart ETA Visual Timeline */}
            {simulatedEta && (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-xs">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">1. Berangkat Kapal</span>
                    <p className="mt-1 text-xs font-bold text-slate-800">{formatFullDateTime(simulatedEta.departureDateTime)}</p>
                    <p className="text-[11px] text-slate-500">Pelabuhan Muat Asal</p>
                  </div>

                  <div className="rounded-lg bg-blue-50/70 p-3">
                    <span className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">2. Tiba di Pelabuhan</span>
                    <p className="mt-1 text-xs font-bold text-blue-900">{formatFullDateTime(simulatedEta.seaArrival)}</p>
                    <p className="text-[11px] text-blue-600">Pelayaran ~{DEFAULT_PORT_ROUTES[calcRoute]?.seaHours || 24} jam</p>
                  </div>

                  <div className="rounded-lg bg-amber-50/70 p-3">
                    <span className="text-[10px] font-bold tracking-wider text-amber-700 uppercase">3. Bongkar Muat</span>
                    <p className="mt-1 text-xs font-bold text-amber-900">{formatFullDateTime(simulatedEta.portClearance)}</p>
                    <p className="text-[11px] text-amber-600">Handling pelabuhan ~{DEFAULT_PORT_ROUTES[calcRoute]?.handlingHours || 5} jam</p>
                  </div>

                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                    <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">4. Prediksi Cerdas ETA</span>
                    <p className="mt-1 text-xs font-extrabold text-emerald-900">{formatFullDateTime(simulatedEta.finalEta)}</p>
                    <p className="text-[11px] font-semibold text-emerald-700">Tiba di Gudang / Tujuan (Total: {simulatedEta.totalTransitHours} jam)</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Daftar Pengiriman Aktif (Sopir dengan Tiket) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text)]">Jadwal Pengiriman Aktif Armada</h2>
                <p className="text-xs text-[var(--text-soft)]">
                  Memantau armada sopir yang memiliki tiket kapal dan rute penyeberangan aktif.
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                {activeShipmentsCount} Pengiriman Berjalan
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {drivers.filter(d => d.ticket).map(driver => {
                const etaData = driver.ticket ? calculateSmartEta(driver.ticket) : null
                const hasAssignedResis = Boolean(driver.ticket?.assignedResis && driver.ticket.assignedResis.length > 0)

                return (
                  <div
                    key={driver.id}
                    className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-white p-5 shadow-xs transition hover:border-indigo-400 hover:shadow-md"
                  >
                    <div>
                      {/* Driver Snippet & Status */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-[var(--text)]">{driver.name}</h3>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-600">
                                {driver.code}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-soft)]">
                              {driver.licensePlate} · {driver.truckType}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            driver.status === 'Dalam Pelayaran'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {driver.status === 'Dalam Pelayaran' && <Ship className="mr-1 h-3 w-3" />}
                          {driver.status === 'Pengantaran Darat' && <Truck className="mr-1 h-3 w-3" />}
                          {driver.status}
                        </span>
                      </div>

                      {/* Ticket & Smart ETA Detail Card */}
                      {driver.ticket && etaData && (
                        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                          <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                              <Ship className="h-4 w-4 text-blue-700" />
                              <span>{driver.ticket.shipName}</span>
                            </div>
                            <span className="text-[11px] font-mono font-medium text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                              {driver.ticket.ticketNumber}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] text-blue-600 block font-medium">Jadwal Keberangkatan Kapal:</span>
                              <div className="flex items-center gap-1 mt-0.5 font-semibold text-slate-800">
                                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                <span>{driver.ticket.departureDate} ({driver.ticket.departureTime})</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] text-blue-600 block font-medium">Rute Penyeberangan:</span>
                              <div className="flex items-center gap-1 mt-0.5 font-semibold text-slate-800 line-clamp-1">
                                <Anchor className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">
                                  {driver.ticket.originPort.split('(')[0]?.trim()} → {driver.ticket.destinationPort.split('(')[0]?.trim()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Smart ETA Result Banner */}
                          <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                Prediksi Cerdas Tiba (ETA):
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Total: +{etaData.totalTransitHours} Jam
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-extrabold text-emerald-950">
                              {formatFullDateTime(etaData.finalEta)}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-600 flex items-start gap-1">
                              <MapPin className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                              <span className="line-clamp-1">Tujuan: {driver.ticket.finalDestinationAddress}</span>
                            </p>
                          </div>

                          {/* Assigned Resi */}
                          {driver.ticket.assignedResis.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                              <span className="font-semibold text-slate-700">Resi Muatan:</span>
                              {driver.ticket.assignedResis.map(resi => (
                                <button
                                  key={resi}
                                  type="button"
                                  onClick={() => onTrackResi?.(resi)}
                                  className="rounded bg-white px-2 py-0.5 font-mono text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50"
                                >
                                  {resi}
                                </button>
                              ))}
                            </div>
                          )}

                          {driver.ticket.notes && (
                            <p className="mt-2 text-[11px] text-slate-500 italic">
                              Catatan: {driver.ticket.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions: Ubah Tiket, Selesaikan Pengiriman */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 1. Ubah Tiket / Jadwal */}
                        <button
                          type="button"
                          onClick={() => openManageTicket(driver)}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-95"
                        >
                          <Anchor className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Ubah Tiket</span>
                        </button>

                        {/* 2. Selesaikan Pengiriman */}
                        <button
                          type="button"
                          onClick={() => removeTicketFromDriver(driver)}
                          className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition active:scale-95"
                          title="Selesaikan pengiriman armada"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Selesaikan</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('manifests' as any)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
                            title="Buka menu Manajemen Manifest untuk mencetak surat manifest"
                          >
                            <span>Cetak manifest di Manajemen Manifest →</span>
                          </button>
                        )}
                        <span className="text-[11px] text-slate-400 font-mono hidden xl:inline">
                          Telp: {driver.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {!drivers.some(d => d.ticket) && (
                <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                  <Ship className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-3 text-base font-semibold text-slate-700">Belum Ada Pengiriman Aktif</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Klik tombol di bawah untuk menjadwalkan penyeberangan kapal dan menghitung estimasi kedatangan (ETA).
                  </p>
                  <button
                    type="button"
                    onClick={openAddShipment}
                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    Jadwalkan Pengiriman Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* ========== MODAL: TAMBAH / UBAH DATA SOPIR ================= */}
      {/* ============================================================ */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[var(--text)]">
                {editingDriver ? 'Ubah Profil Sopir' : 'Tambah Sopir Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDriverModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Nama Lengkap Sopir *</label>
                <input
                  type="text"
                  value={driverForm.name}
                  onChange={e => setDriverForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Misal: Bambang Santoso"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-600)]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Nomor Telepon / Kontak *</label>
                <input
                  type="text"
                  value={driverForm.phone}
                  onChange={e => setDriverForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Misal: 0812-3456-7890"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-600)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Nomor Plat Polisi *</label>
                  <input
                    type="text"
                    value={driverForm.licensePlate}
                    onChange={e => setDriverForm(f => ({ ...f, licensePlate: e.target.value }))}
                    placeholder="Misal: L 9421 UZ"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm uppercase outline-none focus:border-[var(--brand-600)]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Status Operasional</label>
                  <select
                    value={driverForm.status}
                    onChange={e => setDriverForm(f => ({ ...f, status: e.target.value as DriverStatus }))}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-600)]"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Dalam Pelayaran">Dalam Pelayaran</option>
                    <option value="Pengantaran Darat">Pengantaran Darat</option>
                    <option value="Istirahat">Istirahat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Jenis Kendaraan / Truk</label>
                <select
                  value={driverForm.truckType}
                  onChange={e => setDriverForm(f => ({ ...f, truckType: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[var(--brand-600)]"
                >
                  <option value="Hino Ranger 500 Wingbox">Hino Ranger 500 Wingbox</option>
                  <option value="Mitsubishi Fuso Fighter Box">Mitsubishi Fuso Fighter Box</option>
                  <option value="Isuzu Giga Tronton 6x2">Isuzu Giga Tronton 6x2</option>
                  <option value="Colt Diesel Double (CDD) Long Box">Colt Diesel Double (CDD) Long Box</option>
                  <option value="Engkel Box (CDE)">Engkel Box (CDE)</option>
                  <option value="Trailer Kontainer 20ft / 40ft">Trailer Kontainer 20ft / 40ft</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDriverModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveDriver}
                disabled={!driverForm.name.trim() || !driverForm.licensePlate.trim()}
                className="rounded-xl bg-[var(--brand-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-700)] disabled:opacity-50"
              >
                Simpan Sopir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ========== MODAL: INPUT TIKET & PREDIKSI CERDAS ETA ======== */}
      {/* ============================================================ */}
      {isTicketModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                  <Ship className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[var(--text)]">
                    Jadwal Pengiriman &amp; Prediksi Cerdas ETA
                  </h3>
                  <p className="text-xs text-[var(--text-soft)]">
                    Jadwalkan tiket kapal penyeberangan untuk armada sopir yang dipilih.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Row 0: Driver Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700">Pilih Sopir / Armada yang Ditugaskan *</label>
                <select
                  value={selectedDriver.id}
                  onChange={e => {
                    const found = drivers.find(d => d.id === e.target.value)
                    if (found) {
                      setSelectedDriver(found)
                      if (found.ticket) {
                        setTicketForm(found.ticket)
                      }
                    }
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-600"
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code}) - {d.licensePlate} · {d.truckType} [{d.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset Route Helper */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-indigo-600" />
                    Pilih Template Rute Cepat (Otomatis Isi Durasi)
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.keys(DEFAULT_PORT_ROUTES).map(routeName => (
                    <button
                      key={routeName}
                      type="button"
                      onClick={() => applyPresetRouteToTicket(routeName)}
                      className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-600 hover:text-white transition"
                    >
                      {routeName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 1: Ship & Ticket No */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Nama Kapal / Operator Pelayaran *</label>
                  <select
                    value={ticketForm.shipName}
                    onChange={e => setTicketForm(t => ({ ...t, shipName: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-indigo-600"
                  >
                    {POPULAR_SHIPS.map(ship => (
                      <option key={ship} value={ship}>{ship}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Nomor / Kode Booking Tiket Kapal *</label>
                  <input
                    type="text"
                    value={ticketForm.ticketNumber}
                    onChange={e => setTicketForm(t => ({ ...t, ticketNumber: e.target.value }))}
                    placeholder="Misal: TKT-DLU-20261015-88"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono outline-none focus:border-indigo-600"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Origin & Destination Ports */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Pelabuhan Keberangkatan Asal</label>
                  <input
                    type="text"
                    value={ticketForm.originPort}
                    onChange={e => setTicketForm(t => ({ ...t, originPort: e.target.value }))}
                    placeholder="Misal: Pelabuhan Tanjung Perak (Surabaya)"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Pelabuhan Tujuan</label>
                  <input
                    type="text"
                    value={ticketForm.destinationPort}
                    onChange={e => setTicketForm(t => ({ ...t, destinationPort: e.target.value }))}
                    placeholder="Misal: Pelabuhan Soekarno-Hatta (Makassar)"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Row 3: Departure Date and Time */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                <span className="text-xs font-bold text-indigo-950 block mb-2">
                  Jadwal Pemberangkatan Kapal (Basis Perhitungan ETA)
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Tanggal Keberangkatan Kapal *</label>
                    <input
                      type="date"
                      value={ticketForm.departureDate}
                      onChange={e => setTicketForm(t => ({ ...t, departureDate: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Jam Keberangkatan Kapal *</label>
                    <input
                      type="time"
                      value={ticketForm.departureTime}
                      onChange={e => setTicketForm(t => ({ ...t, departureTime: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600"
                      required
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Durasi Laut (Jam)</label>
                    <input
                      type="number"
                      min="1"
                      value={ticketForm.seaDurationHours}
                      onChange={e => setTicketForm(t => ({ ...t, seaDurationHours: parseInt(e.target.value, 10) || 1 }))}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Bongkar Muat (Jam)</label>
                    <input
                      type="number"
                      min="1"
                      value={ticketForm.portHandlingHours}
                      onChange={e => setTicketForm(t => ({ ...t, portHandlingHours: parseInt(e.target.value, 10) || 1 }))}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Antar Gudang (Jam)</label>
                    <input
                      type="number"
                      min="1"
                      value={ticketForm.landDeliveryHours}
                      onChange={e => setTicketForm(t => ({ ...t, landDeliveryHours: parseInt(e.target.value, 10) || 1 }))}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Address */}
              <div>
                <label className="text-xs font-semibold text-slate-700">Alamat Gudang / Tujuan Akhir Pengantaran *</label>
                <input
                  type="text"
                  value={ticketForm.finalDestinationAddress}
                  onChange={e => setTicketForm(t => ({ ...t, finalDestinationAddress: e.target.value }))}
                  placeholder="Misal: Gudang Distribusi Makassar, Jl. Kima Raya No. 45"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-indigo-600"
                  required
                />
              </div>

              {/* Assign orders to this driver's voyage */}
              <div>
                <label className="text-xs font-semibold text-slate-700">Pilih Resi Muatan yang Diangkut</label>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1">
                  {orders.length > 0 ? (
                    orders.slice(0, 20).map(o => {
                      const isSelected = ticketForm.assignedResis.includes(o.resi)
                      return (
                        <label key={o.resi} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setTicketForm(t => ({ ...t, assignedResis: [...t.assignedResis, o.resi] }))
                              } else {
                                setTicketForm(t => ({ ...t, assignedResis: t.assignedResis.filter(r => r !== o.resi) }))
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600"
                          />
                          <span className="font-mono font-bold text-slate-800">{o.resi}</span>
                          <span className="text-slate-500">({o.cust} - {o.asal} → {o.tujuan})</span>
                        </label>
                      )
                    })
                  ) : (
                    <p className="p-2 text-xs text-slate-400">Belum ada order untuk di-assign.</p>
                  )}
                </div>
              </div>

              {/* Smart ETA Realtime Output in Modal */}
              {calculateSmartEta(ticketForm) && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3.5">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span>Hasil Prediksi Cerdas ETA untuk Sopir &amp; Muatan Ini:</span>
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded-lg p-2.5 border border-emerald-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Estimasi Waktu Tiba di Tujuan:</span>
                      <p className="text-sm font-extrabold text-emerald-950">
                        {formatFullDateTime(calculateSmartEta(ticketForm)!.finalEta)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                      Total: {calculateSmartEta(ticketForm)!.totalTransitHours} Jam Perjalanan
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveTicket}
                disabled={!ticketForm.ticketNumber.trim() || !ticketForm.departureDate}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Simpan Tiket &amp; Terapkan Prediksi ETA
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
