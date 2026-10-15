'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BadgeCheck, Banknote, Ban, CalendarClock, Download, FileSpreadsheet, FileText,
  Landmark, Plus, Printer, RefreshCw, Save, Settings2, Wallet, type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export type FinanceOrder = {
  resi: string
  cust: string
  asal: string
  tujuan: string
  berat: number
  layanan: string
  status: string
  cod: string
  cancelled?: boolean
}

export type FinanceTrade = {
  id: string
  tipe: string
  asal: string
  tujuan: string
  moda: string
  kont: string
  hs: string
  kg: number
  nilai: number
  cc: string
}

export type FinancePage =
  | 'finance-dashboard'
  | 'finance-invoices'
  | 'finance-payments'
  | 'finance-rates'
  | 'finance-approvals'
  | 'finance-reports'

type RouteRate = {
  id: string
  origin_city: string
  destination_city: string
  base_cost_per_kg: number
}

type ServiceMultiplier = { service_type: string; multiplier: number }
type Invoice = {
  id: string
  invoice_number: string
  order_resi: string
  cost_amount: number
  recommended_amount: number
  total_amount: number
  due_date: string
  sent_at: string | null
  price_approval_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  cancelled: boolean
  cancelled_at: string | null
}
type Payment = {
  id: string
  invoice_id: string
  amount: number
  payment_method: string
  received_at: string
  reference: string | null
  note: string | null
}
type CodRemittance = {
  id: string
  invoice_id: string
  courier_name: string
  amount: number
  received_at: string
  note: string | null
}
type TradeCost = {
  id: string
  trade_document_id: string
  declared_value_idr: number
  customs_duty_idr: number
  customs_fees_idr: number
  updated_at: string
}

const inputClass = 'h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-600)]'
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-50'
const outlineButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)] disabled:cursor-not-allowed disabled:opacity-50'
const today = () => new Date().toISOString().slice(0, 10)

function idr(value: number) {
  return `Rp ${Math.round(value || 0).toLocaleString('id-ID')}`
}

function amount(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const raw = typeof value === 'string' && /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : String(value)
    return `"${raw.replaceAll('"', '""')}"`
  }
  const csv = `\uFEFF${rows.map(row => row.map(escape).join(',')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function smartPrice(
  order: FinanceOrder,
  rates: RouteRate[],
  multipliers: ServiceMultiplier[],
  minimumMargin: number,
) {
  const route = rates.find(rate =>
    rate.origin_city.trim().toLowerCase() === order.asal.trim().toLowerCase() &&
    rate.destination_city.trim().toLowerCase() === order.tujuan.trim().toLowerCase()
  )
  const multiplier = multipliers.find(item => item.service_type === order.layanan)
  if (!route || !multiplier) return null
  const cost = amount(route.base_cost_per_kg) * order.berat * amount(multiplier.multiplier)
  return { cost, recommended: Math.ceil(cost * (1 + minimumMargin / 100)) }
}

function Feedback({ error, notice }: { error: string; notice: string }) {
  if (!error && !notice) return null
  return (
    <div role={error ? 'alert' : 'status'} className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
      {error || notice}
    </div>
  )
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[22px] font-semibold leading-tight text-[var(--text)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--text-soft)]">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

function Metric({ icon: Icon, title, value, note }: { icon: LucideIcon; title: string; value: string; note: string }) {
  return (
    <section className="utility-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-[var(--text)]">{value}</p>
          <p className="mt-2 text-xs text-[var(--text-soft)]">{note}</p>
        </div>
        <span className="rounded-xl bg-[var(--info-soft)] p-3 text-[var(--info)]"><Icon className="h-5 w-5" /></span>
      </div>
    </section>
  )
}

function statusLabel(invoice: Invoice, balance: number) {
  if (invoice.cancelled) return 'Dibatalkan'
  if (invoice.price_approval_status === 'pending') return 'Menunggu persetujuan harga'
  if (invoice.price_approval_status === 'rejected') return 'Harga ditolak'
  if (balance <= 0) return 'Lunas'
  if (invoice.due_date < today()) return 'Jatuh tempo'
  return invoice.sent_at ? 'Terkirim · belum lunas' : 'Draft'
}

function statusClass(label: string) {
  if (label === 'Lunas') return 'bg-[var(--success-soft)] text-[var(--success)]'
  if (label.includes('tempo') || label.includes('ditolak') || label === 'Dibatalkan') return 'bg-[var(--danger-soft)] text-[var(--danger)]'
  if (label.includes('Menunggu')) return 'bg-[var(--warning-soft)] text-[var(--warning)]'
  return 'bg-[var(--info-soft)] text-[var(--info)]'
}

export default function FinanceWorkspace({
  page,
  orders,
  trade,
  ready,
}: {
  page: FinancePage
  orders: FinanceOrder[]
  trade: FinanceTrade[]
  ready: boolean
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [remittances, setRemittances] = useState<CodRemittance[]>([])
  const [rates, setRates] = useState<RouteRate[]>([])
  const [multipliers, setMultipliers] = useState<ServiceMultiplier[]>([])
  const [minimumMargin, setMinimumMargin] = useState(20)
  const [tradeCosts, setTradeCosts] = useState<TradeCost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedResi, setSelectedResi] = useState('')
  const [quotedPrice, setQuotedPrice] = useState('')
  const [dueDate, setDueDate] = useState(today())
  const [paymentInvoice, setPaymentInvoice] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Prepaid')
  const [paymentReference, setPaymentReference] = useState('')
  const [courierName, setCourierName] = useState('')
  const [codInvoice, setCodInvoice] = useState('')
  const [codAmount, setCodAmount] = useState('')
  const [routeDraft, setRouteDraft] = useState({ origin: '', destination: '', cost: '' })
  const [revisedPriceDraft, setRevisedPriceDraft] = useState<Record<string, string>>({})
  const [marginDraft, setMarginDraft] = useState('20')
  const [multiplierDraft, setMultiplierDraft] = useState<Record<string, string>>({})
  const [month, setMonth] = useState(today().slice(0, 7))
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null)
  const [cancelInvoiceDraft, setCancelInvoiceDraft] = useState<Invoice | null>(null)

  const loadFinanceData = useCallback(async () => {
    setError('')
    if (!supabase) {
      setError('Supabase belum dikonfigurasi. Modul Keuangan memerlukan database aktif.')
      setLoading(false)
      return
    }
    if (!ready) {
      setError('Data order live belum tersedia. Pastikan migrasi akses staf sudah diterapkan dan koneksi Supabase aktif.')
      setLoading(false)
      return
    }

    setLoading(true)
    const results = await Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('invoice_payments').select('*').order('received_at', { ascending: false }),
      supabase.from('cod_remittances').select('*').order('received_at', { ascending: false }),
      supabase.from('route_rates').select('*').order('origin_city'),
      supabase.from('service_multipliers').select('*').order('service_type'),
      supabase.from('finance_settings').select('*').eq('id', true).maybeSingle(),
      supabase.from('trade_costs').select('*').order('updated_at', { ascending: false }),
    ] as const)
    const [invoiceResult, paymentResult, remittanceResult, rateResult, multiplierResult, settingsResult, costResult] = results
    const firstError = results.find(result => result.error)?.error
    if (firstError) {
      setError(`Gagal memuat data Keuangan. Pastikan migrasi supabase/migrations/202610070002_finance_workspace.sql sudah dijalankan. ${firstError.message}`)
      setLoading(false)
      return
    }

    setInvoices((invoiceResult.data || []) as Invoice[])
    setPayments((paymentResult.data || []) as Payment[])
    setRemittances((remittanceResult.data || []) as CodRemittance[])
    setRates((rateResult.data || []) as RouteRate[])
    setMultipliers((multiplierResult.data || []) as ServiceMultiplier[])
    setMinimumMargin(amount(settingsResult.data?.minimum_margin_percent ?? 20))
    setMarginDraft(String(settingsResult.data?.minimum_margin_percent ?? 20))
    setTradeCosts((costResult.data || []) as TradeCost[])
    setMultiplierDraft(Object.fromEntries((multiplierResult.data || []).map(row => [row.service_type, String(row.multiplier)])))
    setLoading(false)
  }, [ready])

  useEffect(() => {
    void Promise.resolve().then(loadFinanceData)
  }, [loadFinanceData])

  const orderByResi = useMemo(() => new Map(orders.map(order => [order.resi, order])), [orders])
  const invoiceById = useMemo(() => new Map(invoices.map(invoice => [invoice.id, invoice])), [invoices])
  const availableOrders = useMemo(() => orders.filter(order => !order.cancelled && !invoices.some(invoice => invoice.order_resi === order.resi)), [orders, invoices])

  function getReceived(invoice: Invoice) {
    const regular = payments.filter(payment => payment.invoice_id === invoice.id).reduce((sum, payment) => sum + amount(payment.amount), 0)
    const cod = remittances.filter(remittance => remittance.invoice_id === invoice.id).reduce((sum, remittance) => sum + amount(remittance.amount), 0)
    return regular + cod
  }

  function getBalance(invoice: Invoice) {
    return Math.max(0, amount(invoice.total_amount) - getReceived(invoice))
  }

  const selectedOrder = availableOrders.find(order => order.resi === selectedResi)
  const quote = selectedOrder ? smartPrice(selectedOrder, rates, multipliers, minimumMargin) : null

  const invoiceBalances = invoices.map(invoice => ({ invoice, balance: getBalance(invoice) }))
  const outstandingCod = invoiceBalances.filter(({ invoice, balance }) => !invoice.cancelled && invoice.price_approval_status === 'approved' && orderByResi.get(invoice.order_resi)?.cod === 'COD' && balance > 0)
  const outstandingInvoices = invoiceBalances.filter(({ invoice, balance }) => !invoice.cancelled && invoice.price_approval_status === 'approved' && balance > 0)
  const monthlyInvoiceRows = invoiceBalances.filter(({ invoice }) => invoice.created_at.slice(0, 7) === month)
  const approvedMonthlyRows = monthlyInvoiceRows.filter(({ invoice }) => !invoice.cancelled && invoice.price_approval_status === 'approved')
  const monthlyPayments = payments.filter(payment => payment.received_at.slice(0, 7) === month)
  const monthlyCod = remittances.filter(receipt => receipt.received_at.slice(0, 7) === month)
  const revenueCollected = monthlyPayments.reduce((sum, payment) => sum + amount(payment.amount), 0) + monthlyCod.reduce((sum, item) => sum + amount(item.amount), 0)
  const monthlyReceivables = approvedMonthlyRows.reduce((sum, row) => sum + row.balance, 0)
  const overdueAmount = outstandingInvoices.filter(({ invoice }) => invoice.due_date < today()).reduce((sum, row) => sum + row.balance, 0)
  const currentCodOutstanding = outstandingCod.reduce((sum, row) => sum + row.balance, 0)

  async function withSaving(action: () => Promise<void>) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Operasi Keuangan gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }

  async function createInvoice() {
    if (!supabase || !selectedOrder || !quote) {
      setError('Rute order belum memiliki tarif pokok dan pengali layanan. Atur tarif terlebih dahulu.')
      return
    }
    const trimmedQuotedPrice = quotedPrice.trim()
    const finalAmount = trimmedQuotedPrice === '' ? quote.recommended : Number(trimmedQuotedPrice)
    if (!Number.isFinite(finalAmount) || finalAmount <= 0 || !dueDate) {
      setError('Masukkan harga invoice dan tanggal jatuh tempo yang valid.')
      return
    }
    await withSaving(async () => {
      const { data: userData, error: userError } = await supabase!.auth.getUser()
      if (userError) throw userError
      const invoiceNumber = `INV-${today().replaceAll('-', '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
      const requiresApproval = finalAmount < quote.recommended
      const { error: insertError } = await supabase!.from('invoices').insert({
        invoice_number: invoiceNumber,
        order_resi: selectedOrder.resi,
        cost_amount: quote.cost,
        recommended_amount: quote.recommended,
        total_amount: finalAmount,
        due_date: dueDate,
        price_approval_status: requiresApproval ? 'pending' : 'approved',
        created_by: userData.user?.id,
      })
      if (insertError) throw insertError
      setNotice(requiresApproval ? `Invoice ${invoiceNumber} dibuat sebagai draft dan menunggu persetujuan harga.` : `Invoice ${invoiceNumber} berhasil dibuat.`)
      setSelectedResi('')
      setQuotedPrice('')
      await loadFinanceData()
    })
  }

  async function markInvoiceSent(invoice: Invoice) {
    if (!supabase || invoice.cancelled) return
    await withSaving(async () => {
      const { error: updateError } = await supabase!.from('invoices').update({ sent_at: new Date().toISOString() }).eq('id', invoice.id)
      if (updateError) throw updateError
      setNotice(`Invoice ${invoice.invoice_number} ditandai terkirim. Pengiriman email dilakukan manual di luar aplikasi.`)
      await loadFinanceData()
    })
  }

  async function cancelInvoice(invoice: Invoice) {
    if (!supabase || invoice.cancelled) return
    await withSaving(async () => {
      const { error: cancelError } = await supabase!.rpc('finance_cancel_invoice', { p_invoice_id: invoice.id })
      if (cancelError) throw cancelError
      setNotice(`Invoice ${invoice.invoice_number} dibatalkan dan aktivitasnya dicatat.`)
      setCancelInvoiceDraft(null)
      await loadFinanceData()
    })
  }

  async function recordPayment(invoice: Invoice, method = paymentMethod, value = paymentAmount) {
    if (!supabase) return
    const paidAmount = Number(value)
    if (!Number.isFinite(paidAmount) || paidAmount <= 0 || paidAmount > getBalance(invoice)) {
      setError('Nominal pembayaran harus lebih dari 0 dan tidak boleh melebihi sisa tagihan.')
      return
    }
    await withSaving(async () => {
      const { data: userData, error: userError } = await supabase!.auth.getUser()
      if (userError) throw userError
      const { error: insertError } = await supabase!.from('invoice_payments').insert({
        invoice_id: invoice.id,
        amount: paidAmount,
        payment_method: method,
        reference: paymentReference.trim() || null,
        received_by: userData.user?.id,
      })
      if (insertError) throw insertError
      setNotice(`Pembayaran ${idr(paidAmount)} untuk ${invoice.invoice_number} berhasil dicatat.`)
      setPaymentAmount('')
      setPaymentReference('')
      await loadFinanceData()
    })
  }

  async function recordCodRemittance() {
    if (!supabase) return
    const invoice = invoices.find(item => item.id === codInvoice)
    const received = Number(codAmount)
    if (!invoice || !courierName.trim() || !Number.isFinite(received) || received <= 0 || received > getBalance(invoice)) {
      setError('Pilih tagihan COD, isi nama kurir, dan pastikan setoran tidak melebihi sisa tagihan.')
      return
    }
    await withSaving(async () => {
      const { data: userData, error: userError } = await supabase!.auth.getUser()
      if (userError) throw userError
      const { error: insertError } = await supabase!.from('cod_remittances').insert({
        invoice_id: invoice.id,
        courier_name: courierName.trim(),
        amount: received,
        received_by: userData.user?.id,
      })
      if (insertError) throw insertError
      setNotice(`Setoran COD ${idr(received)} dari ${courierName.trim()} berhasil direkonsiliasi.`)
      setCodAmount('')
      setCourierName('')
      await loadFinanceData()
    })
  }

  async function reviewInvoice(invoice: Invoice, approve: boolean) {
    if (!supabase) return
    await withSaving(async () => {
      const { error: rpcError } = await supabase!.rpc('finance_approve_invoice', { invoice_id: invoice.id, approve })
      if (rpcError) throw rpcError
      setNotice(approve ? `Harga ${invoice.invoice_number} disetujui.` : `Harga ${invoice.invoice_number} ditolak.`)
      await loadFinanceData()
    })
  }

  async function reviseRejectedInvoice(invoice: Invoice) {
    if (!supabase) return
    const revisedAmount = Number(revisedPriceDraft[invoice.id])
    if (!Number.isFinite(revisedAmount) || revisedAmount <= 0) {
      setError('Masukkan harga baru yang lebih besar dari nol.')
      return
    }
    await withSaving(async () => {
      const { error: rpcError } = await supabase!.rpc('finance_update_rejected_invoice_price', {
        p_invoice_id: invoice.id,
        p_total_amount: revisedAmount,
      })
      if (rpcError) throw rpcError
      setNotice(revisedAmount < amount(invoice.recommended_amount)
        ? `Harga invoice ${invoice.invoice_number} diperbarui dan kembali menunggu persetujuan.`
        : `Harga invoice ${invoice.invoice_number} diperbarui dan memenuhi rekomendasi.`)
      setRevisedPriceDraft(current => {
        const next = { ...current }
        delete next[invoice.id]
        return next
      })
      await loadFinanceData()
    })
  }

  async function saveRouteRate() {
    if (!supabase) return
    const origin = routeDraft.origin.trim()
    const destination = routeDraft.destination.trim()
    const costInput = routeDraft.cost.trim()
    const cost = Number(costInput)
    if (!origin || !destination || !costInput || !Number.isFinite(cost) || cost < 0) {
      setError('Isi kota asal, kota tujuan, dan biaya pokok per kg dengan benar.')
      return
    }
    await withSaving(async () => {
      const existing = rates.find(rate => rate.origin_city.toLowerCase() === origin.toLowerCase() && rate.destination_city.toLowerCase() === destination.toLowerCase())
      const payload = { origin_city: origin, destination_city: destination, base_cost_per_kg: cost, updated_at: new Date().toISOString() }
      const result = existing
        ? await supabase!.from('route_rates').update(payload).eq('id', existing.id)
        : await supabase!.from('route_rates').insert(payload)
      if (result.error) throw result.error
      setRouteDraft({ origin: '', destination: '', cost: '' })
      setNotice('Tarif rute berhasil disimpan.')
      await loadFinanceData()
    })
  }

  async function savePricingSettings() {
    if (!supabase) return
    const marginText = marginDraft.trim()
    const margin = Number(marginText)
    const updatedMultipliers = Object.entries(multiplierDraft).map(([service_type, multiplier]) => ({
      service_type,
      multiplier: Number(multiplier),
      updated_at: new Date().toISOString(),
    }))
    if (!marginText || !Number.isFinite(margin) || margin < 0 || margin > 1000 || updatedMultipliers.some(row => !String(multiplierDraft[row.service_type] ?? '').trim() || !Number.isFinite(row.multiplier) || row.multiplier <= 0)) {
      setError('Margin harus 0–1000% dan semua pengali layanan harus lebih dari 0.')
      return
    }
    await withSaving(async () => {
      const { error: settingsError } = await supabase!.from('finance_settings').upsert({ id: true, minimum_margin_percent: margin, updated_at: new Date().toISOString() })
      if (settingsError) throw settingsError
      if (updatedMultipliers.length) {
        const { error: multiplierError } = await supabase!.from('service_multipliers').upsert(updatedMultipliers)
        if (multiplierError) throw multiplierError
      }
      setNotice('Margin minimum dan pengali layanan berhasil disimpan.')
      await loadFinanceData()
    })
  }


  function exportReport() {
    const rows: (string | number)[][] = [
      ['Jenis', 'Tanggal', 'Referensi', 'Resi', 'Pelanggan / Kurir', 'Rute / Keterangan', 'Layanan', 'Nilai IDR', 'Biaya IDR', 'Margin IDR', 'Status'],
    ]
    for (const { invoice, balance } of monthlyInvoiceRows) {
      const order = orderByResi.get(invoice.order_resi)
      rows.push([
        'Invoice', invoice.created_at.slice(0, 10), invoice.invoice_number, invoice.order_resi,
        order?.cust || '', `${order?.asal || ''} → ${order?.tujuan || ''}`, order?.layanan || '',
        invoice.total_amount, invoice.cost_amount, amount(invoice.total_amount) - amount(invoice.cost_amount),
        statusLabel(invoice, balance),
      ])
    }
    for (const payment of monthlyPayments) {
      const invoice = invoiceById.get(payment.invoice_id)
      rows.push(['Pembayaran', payment.received_at.slice(0, 10), invoice?.invoice_number || '', invoice?.order_resi || '', payment.payment_method, payment.reference || '', '', payment.amount, 0, payment.amount, 'Diterima'])
    }
    for (const remittance of monthlyCod) {
      const invoice = invoiceById.get(remittance.invoice_id)
      rows.push(['Setoran COD', remittance.received_at.slice(0, 10), invoice?.invoice_number || '', invoice?.order_resi || '', remittance.courier_name, remittance.note || '', 'COD', remittance.amount, 0, remittance.amount, 'Direkonsiliasi'])
    }
    for (const cost of tradeCosts.filter(item => item.updated_at.slice(0, 7) === month)) {
      const record = trade.find(row => row.id === cost.trade_document_id)
      const customsTotal = amount(cost.customs_duty_idr) + amount(cost.customs_fees_idr)
      rows.push(['Biaya customs', cost.updated_at.slice(0, 10), record?.hs || '', cost.trade_document_id, record?.tipe || '', `${record?.asal || ''} → ${record?.tujuan || ''}`, record?.moda || '', cost.declared_value_idr, customsTotal, -customsTotal, record?.cc || ''])
    }
    downloadCsv(`laporan-keuangan-${month}.csv`, rows)
  }

  function openPrintView(invoice: Invoice) {
    setPrintInvoice(invoice)
  }

  if (loading) {
    return <div className="utility-card flex items-center gap-3 p-6 text-sm text-[var(--text-soft)]"><RefreshCw className="h-4 w-4 animate-spin" />Memuat modul Keuangan...</div>
  }

  const pageTitles: Record<FinancePage, [string, string]> = {
    'finance-dashboard': ['Dashboard keuangan', 'Pendapatan tertagih, piutang, setoran COD, dan tren bisnis.'],
    'finance-invoices': ['Invoice dan tagihan', 'Buat, cetak, tandai terkirim, dan pantau jatuh tempo pelanggan.'],
    'finance-payments': ['Pembayaran dan rekonsiliasi COD', 'Catat penerimaan prepaid serta setoran tunai dari kurir.'],
    'finance-rates': ['Pengaturan tarif', 'Kelola biaya pokok rute, pengali layanan, dan margin minimum Smart Pricing.'],
    'finance-approvals': ['Persetujuan harga', 'Tinjau invoice yang berada di bawah harga rekomendasi Smart Pricing.'],
    'finance-reports': ['Laporan keuangan', 'Rekap bulanan invoice, pembayaran, COD, dan pendapatan operasional.'],
  }
  const [title, subtitle] = pageTitles[page]

  return (
    <div>
      <SectionHeader title={title} subtitle={subtitle} action={<button type="button" disabled={saving} onClick={() => void loadFinanceData()} className={outlineButtonClass}><RefreshCw className="h-4 w-4" />Muat ulang</button>} />
      <Feedback error={error} notice={notice} />

      {page === 'finance-dashboard' && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Wallet} title="Pendapatan tertagih bulan ini" value={idr(revenueCollected)} note={`Periode ${month}`} />
            <Metric icon={CalendarClock} title="Piutang berjalan" value={idr(outstandingInvoices.reduce((sum, row) => sum + row.balance, 0))} note={`Jatuh tempo: ${idr(overdueAmount)}`} />
            <Metric icon={Banknote} title="COD belum disetor" value={idr(currentCodOutstanding)} note={`${outstandingCod.length} invoice COD terbuka`} />
            <Metric icon={Landmark} title="Nilai invoice bulan ini" value={idr(monthlyInvoiceRows.filter(row => !row.invoice.cancelled).reduce((sum, row) => sum + amount(row.invoice.total_amount), 0))} note={`${monthlyInvoiceRows.filter(row => !row.invoice.cancelled).length} tagihan aktif`} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="utility-card p-5">
              <h2 className="mb-4 text-base font-semibold text-[var(--text)]">Pendapatan menurut rute</h2>
              <TrendRows rows={approvedMonthlyRows.map(({ invoice }) => {
                const order = orderByResi.get(invoice.order_resi)
                return { label: `${order?.asal || '—'} → ${order?.tujuan || '—'}`, value: invoice.total_amount }
              })} />
            </section>
            <section className="utility-card p-5">
              <h2 className="mb-4 text-base font-semibold text-[var(--text)]">Pendapatan menurut layanan</h2>
              <TrendRows rows={approvedMonthlyRows.map(({ invoice }) => {
                const order = orderByResi.get(invoice.order_resi)
                return { label: order?.layanan || 'Layanan lain', value: invoice.total_amount }
              })} />
            </section>
          </div>
          <section className="utility-card mt-5 overflow-hidden p-0">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-semibold text-[var(--text)]">Tagihan perlu perhatian</h2>
            </div>
            <InvoiceTable rows={outstandingInvoices.slice(0, 6)} orders={orderByResi} onPrint={openPrintView} />
          </section>
        </>
      )}

      {page === 'finance-invoices' && (
        <>
          <section className="utility-card mb-6 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-[var(--text)]"><Plus className="h-4 w-4" />Buat invoice dari order</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-medium text-[var(--text-soft)]">Order
                <select className={`${inputClass} mt-1`} value={selectedResi} onChange={event => {
                  const resi = event.target.value
                  const order = availableOrders.find(item => item.resi === resi)
                  const nextQuote = order ? smartPrice(order, rates, multipliers, minimumMargin) : null
                  setSelectedResi(resi)
                  setQuotedPrice(nextQuote ? String(nextQuote.recommended) : '')
                }}>
                  <option value="">Pilih order yang belum ditagih</option>
                  {availableOrders.map(order => <option key={order.resi} value={order.resi}>{order.resi} · {order.cust} · {order.asal} → {order.tujuan}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-[var(--text-soft)]">Harga invoice (IDR)
                <input className={`${inputClass} mt-1`} type="number" min="1" value={quotedPrice} onChange={event => setQuotedPrice(event.target.value)} placeholder="Harga jual" />
              </label>
              <label className="text-sm font-medium text-[var(--text-soft)]">Jatuh tempo
                <input className={`${inputClass} mt-1`} type="date" min={today()} value={dueDate} onChange={event => setDueDate(event.target.value)} />
              </label>
              <div className="flex items-end"><button type="button" disabled={saving || !selectedOrder || !quote} onClick={() => void createInvoice()} className={`${buttonClass} w-full`}><FileText className="h-4 w-4" />Buat invoice</button></div>
            </div>
            {selectedOrder && (
              <div className="mt-4 rounded-lg bg-[var(--panel-soft)] p-3 text-sm text-[var(--text-soft)]">
                {quote
                  ? <>Biaya pokok {idr(quote.cost)} · Harga rekomendasi {idr(quote.recommended)} · Margin minimum {minimumMargin}%{Number(quotedPrice) > 0 && Number(quotedPrice) < quote.recommended ? <strong className="ml-2 text-[var(--warning)]">Harga di bawah rekomendasi memerlukan persetujuan.</strong> : null}</>
                  : 'Tarif rute atau pengali layanan belum tersedia. Lengkapi di Pengaturan Tarif sebelum membuat invoice.'}
              </div>
            )}
          </section>
          <section className="utility-card overflow-hidden p-0"><InvoiceTable rows={invoiceBalances} orders={orderByResi} onPrint={openPrintView} onSend={markInvoiceSent} onCancel={setCancelInvoiceDraft} canCancel={invoice => getReceived(invoice) === 0} saving={saving} /></section>
        </>
      )}

      {page === 'finance-payments' && (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="utility-card p-5">
              <h2 className="mb-4 font-semibold text-[var(--text)]">Catat pembayaran pelanggan</h2>
              <div className="grid gap-3">
                <select className={inputClass} value={paymentInvoice} onChange={event => setPaymentInvoice(event.target.value)}>
                  <option value="">Pilih invoice belum lunas (non-COD)</option>
                  {outstandingInvoices.filter(({ invoice }) => orderByResi.get(invoice.order_resi)?.cod !== 'COD').map(({ invoice, balance }) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} · {invoice.order_resi} · sisa {idr(balance)}</option>)}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className={inputClass} type="number" min="1" value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} placeholder="Nominal diterima (IDR)" />
                  <select className={inputClass} value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option>Prepaid</option><option>Transfer</option><option>Tunai</option><option>Lainnya</option></select>
                </div>
                <input className={inputClass} value={paymentReference} onChange={event => setPaymentReference(event.target.value)} placeholder="Referensi / bukti (opsional)" />
                <button type="button" disabled={saving || !paymentInvoice} className={buttonClass} onClick={() => {
                  const invoice = invoices.find(item => item.id === paymentInvoice)
                  if (invoice) void recordPayment(invoice)
                }}>Catat pembayaran</button>
                <p className="text-xs text-[var(--text-soft)]">Untuk menandai prepaid lunas, catat pembayaran sebesar sisa tagihannya.</p>
              </div>
            </section>
            <section className="utility-card p-5">
              <h2 className="mb-4 font-semibold text-[var(--text)]">Rekonsiliasi setoran COD kurir</h2>
              <div className="grid gap-3">
                <input className={inputClass} value={courierName} onChange={event => setCourierName(event.target.value)} placeholder="Nama kurir" />
                <select className={inputClass} value={codInvoice} onChange={event => setCodInvoice(event.target.value)}>
                  <option value="">Pilih invoice COD belum lunas</option>
                  {outstandingCod.map(({ invoice, balance }) => <option key={invoice.id} value={invoice.id}>{invoice.order_resi} · {invoice.invoice_number} · sisa {idr(balance)}</option>)}
                </select>
                <input className={inputClass} type="number" min="1" value={codAmount} onChange={event => setCodAmount(event.target.value)} placeholder="Nominal setoran (IDR)" />
                <button type="button" disabled={saving || !codInvoice} className={buttonClass} onClick={() => void recordCodRemittance()}>Rekonsiliasi setoran</button>
              </div>
            </section>
          </div>
          <section className="utility-card mt-5 overflow-hidden p-0">
            <div className="border-b border-[var(--border)] px-5 py-4"><h2 className="font-semibold text-[var(--text)]">Riwayat penerimaan</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-[var(--panel-soft)] text-xs uppercase text-[var(--text-soft)]"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Resi / invoice</th><th className="px-4 py-3">Sumber</th><th className="px-4 py-3">Referensi</th><th className="px-4 py-3 text-right">Nominal</th></tr></thead>
                <tbody>
                  {[...payments.map(item => ({ date: item.received_at, invoiceId: item.invoice_id, source: item.payment_method, reference: item.reference || item.note || '—', amount: item.amount })), ...remittances.map(item => ({ date: item.received_at, invoiceId: item.invoice_id, source: `COD · ${item.courier_name}`, reference: item.note || 'Setoran kurir', amount: item.amount }))].sort((a, b) => b.date.localeCompare(a.date)).map((item, index) => {
                    const invoice = invoiceById.get(item.invoiceId)
                    return <tr key={`${item.invoiceId}-${item.date}-${index}`} className="border-t border-[var(--border)]"><td className="px-4 py-3">{new Date(item.date).toLocaleDateString('id-ID')}</td><td className="px-4 py-3 font-medium">{invoice?.order_resi || '—'}<span className="ml-2 text-xs text-[var(--text-soft)]">{invoice?.invoice_number}</span></td><td className="px-4 py-3">{item.source}</td><td className="px-4 py-3 text-[var(--text-soft)]">{item.reference}</td><td className="px-4 py-3 text-right font-semibold">{idr(item.amount)}</td></tr>
                  })}
                  {!payments.length && !remittances.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--text-soft)]">Belum ada pembayaran yang dicatat.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {page === 'finance-rates' && (
        <>
          <section className="utility-card mb-5 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-[var(--text)]"><Settings2 className="h-4 w-4" />Tambah / perbarui biaya pokok rute</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
              <input className={inputClass} value={routeDraft.origin} onChange={event => setRouteDraft(draft => ({ ...draft, origin: event.target.value }))} placeholder="Kota asal" />
              <input className={inputClass} value={routeDraft.destination} onChange={event => setRouteDraft(draft => ({ ...draft, destination: event.target.value }))} placeholder="Kota tujuan" />
              <input className={inputClass} type="number" min="0" value={routeDraft.cost} onChange={event => setRouteDraft(draft => ({ ...draft, cost: event.target.value }))} placeholder="Biaya pokok per kg (IDR)" />
              <button type="button" disabled={saving} onClick={() => void saveRouteRate()} className={buttonClass}><Save className="h-4 w-4" />Simpan rute</button>
            </div>
          </section>
          <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
            <section className="utility-card overflow-hidden p-0">
              <div className="border-b border-[var(--border)] px-5 py-4"><h2 className="font-semibold text-[var(--text)]">Tarif pokok per rute</h2></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-[var(--panel-soft)] text-xs uppercase text-[var(--text-soft)]"><tr><th className="px-4 py-3">Asal</th><th className="px-4 py-3">Tujuan</th><th className="px-4 py-3 text-right">Biaya / kg</th><th className="px-4 py-3">Aksi</th></tr></thead>
                <tbody>{rates.map(rate => <tr key={rate.id} className="border-t border-[var(--border)]"><td className="px-4 py-3">{rate.origin_city}</td><td className="px-4 py-3">{rate.destination_city}</td><td className="px-4 py-3 text-right">{idr(rate.base_cost_per_kg)}</td><td className="px-4 py-3"><button type="button" className="text-sm font-semibold text-[var(--brand-600)]" onClick={() => setRouteDraft({ origin: rate.origin_city, destination: rate.destination_city, cost: String(rate.base_cost_per_kg) })}>Ubah</button></td></tr>)}
                  {!rates.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-soft)]">Belum ada tarif rute.</td></tr>}</tbody>
              </table></div>
            </section>
            <section className="utility-card p-5">
              <h2 className="mb-4 font-semibold text-[var(--text)]">Smart Pricing</h2>
              <label className="mb-4 block text-sm font-medium text-[var(--text-soft)]">Margin minimum (%)
                <input className={`${inputClass} mt-1`} type="number" min="0" max="1000" step="0.1" value={marginDraft} onChange={event => setMarginDraft(event.target.value)} />
              </label>
              <div className="space-y-3">
                {multipliers.map(item => <label key={item.service_type} className="block text-sm font-medium text-[var(--text-soft)]">Pengali {item.service_type}
                  <input className={`${inputClass} mt-1`} type="number" min="0.01" step="0.01" value={multiplierDraft[item.service_type] ?? item.multiplier} onChange={event => setMultiplierDraft(current => ({ ...current, [item.service_type]: event.target.value }))} />
                </label>)}
              </div>
              <button type="button" disabled={saving} onClick={() => void savePricingSettings()} className={`${buttonClass} mt-5 w-full`}><Save className="h-4 w-4" />Simpan aturan harga</button>
              <p className="mt-3 text-xs leading-relaxed text-[var(--text-soft)]">Harga rekomendasi = biaya pokok rute/kg × berat × pengali layanan × (1 + margin minimum). Nilai tarif tersimpan sebagai snapshot pada invoice.</p>
            </section>
          </div>
        </>
      )}

      {page === 'finance-approvals' && (
        <section className="utility-card overflow-hidden p-0">
          <div className="border-b border-[var(--border)] px-5 py-4"><h2 className="font-semibold text-[var(--text)]">Harga menunggu persetujuan</h2></div>
          <div className="divide-y divide-[var(--border)]">
            {invoices.filter(invoice => !invoice.cancelled && invoice.price_approval_status === 'pending').map(invoice => {
              const order = orderByResi.get(invoice.order_resi)
              return <div key={invoice.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="font-semibold text-[var(--text)]">{invoice.invoice_number} · {invoice.order_resi}</p><p className="mt-1 text-sm text-[var(--text-soft)]">{order?.cust || 'Pelanggan'} · {order?.asal} → {order?.tujuan} · {order?.layanan}</p><p className="mt-2 text-sm">Harga diajukan <strong>{idr(invoice.total_amount)}</strong> · Rekomendasi {idr(invoice.recommended_amount)} · Biaya pokok {idr(invoice.cost_amount)}</p></div>
                <div className="flex gap-2"><button type="button" disabled={saving} onClick={() => void reviewInvoice(invoice, false)} className={outlineButtonClass}>Tolak</button><button type="button" disabled={saving} onClick={() => void reviewInvoice(invoice, true)} className={buttonClass}><BadgeCheck className="h-4 w-4" />Setujui</button></div>
              </div>
            })}
            {!invoices.some(invoice => !invoice.cancelled && invoice.price_approval_status === 'pending') && <p className="p-8 text-center text-sm text-[var(--text-soft)]">Tidak ada harga yang menunggu persetujuan.</p>}
          </div>
          {invoices.some(invoice => !invoice.cancelled && invoice.price_approval_status === 'rejected') && <>
            <div className="border-t border-[var(--border)] px-5 py-4"><h2 className="font-semibold text-[var(--text)]">Harga ditolak · perbarui dan ajukan kembali</h2></div>
            <div className="divide-y divide-[var(--border)]">
              {invoices.filter(invoice => !invoice.cancelled && invoice.price_approval_status === 'rejected').map(invoice => <div key={invoice.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="font-semibold text-[var(--text)]">{invoice.invoice_number} · {invoice.order_resi}</p><p className="mt-1 text-sm text-[var(--text-soft)]">Harga sebelumnya {idr(invoice.total_amount)} · Rekomendasi {idr(invoice.recommended_amount)}</p></div>
                <div className="flex gap-2"><input className={`${inputClass} w-48`} type="number" min="1" value={revisedPriceDraft[invoice.id] ?? ''} onChange={event => setRevisedPriceDraft(current => ({ ...current, [invoice.id]: event.target.value }))} placeholder="Harga baru (IDR)" /><button type="button" disabled={saving} onClick={() => void reviseRejectedInvoice(invoice)} className={buttonClass}>Ajukan ulang</button></div>
              </div>)}
            </div>
          </>}
        </section>
      )}



      {page === 'finance-reports' && (
        <>
          <section className="utility-card mb-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between">
            <label className="text-sm font-medium text-[var(--text-soft)]">Periode laporan
              <input className={`${inputClass} mt-1 w-48`} type="month" value={month} onChange={event => setMonth(event.target.value)} />
            </label>
            <button type="button" onClick={exportReport} className={buttonClass}><Download className="h-4 w-4" />Ekspor CSV untuk Excel</button>
          </section>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Wallet} title="Pendapatan diterima" value={idr(revenueCollected)} note="Pembayaran + setoran COD" />
            <Metric icon={FileText} title="Invoice diterbitkan" value={idr(monthlyInvoiceRows.filter(row => !row.invoice.cancelled).reduce((sum, row) => sum + amount(row.invoice.total_amount), 0))} note={`${monthlyInvoiceRows.filter(row => !row.invoice.cancelled).length} invoice aktif pada periode ini`} />
            <Metric icon={CalendarClock} title="Piutang periode ini" value={idr(monthlyReceivables)} note="Sisa nilai invoice periode terpilih" />
            <Metric icon={FileSpreadsheet} title="Biaya bea & customs" value={idr(tradeCosts.reduce((sum, row) => sum + (row.updated_at.slice(0, 7) === month ? amount(row.customs_duty_idr) + amount(row.customs_fees_idr) : 0), 0))} note="Data customs yang diperbarui bulan ini" />
          </div>
          <section className="utility-card overflow-hidden p-0"><InvoiceTable rows={monthlyInvoiceRows} orders={orderByResi} onPrint={openPrintView} /></section>
        </>
      )}

      {cancelInvoiceDraft && <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/45 p-4">
        <section className="w-full max-w-md rounded-xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)]" role="alertdialog" aria-modal="true" aria-labelledby="cancel-invoice-title">
          <h2 id="cancel-invoice-title" className="text-lg font-semibold text-[var(--text)]">Batalkan invoice?</h2>
          <p className="mt-2 text-sm text-[var(--text-soft)]">Invoice {cancelInvoiceDraft.invoice_number} akan ditandai dibatalkan dan tetap tersimpan di riwayat audit. Invoice dengan pembayaran atau setoran COD tidak dapat dibatalkan.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={saving} onClick={() => setCancelInvoiceDraft(null)} className={outlineButtonClass}>Kembali</button>
            <button type="button" disabled={saving || getReceived(cancelInvoiceDraft) > 0} onClick={() => void cancelInvoice(cancelInvoiceDraft)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--danger)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Ban className="h-4 w-4" />Konfirmasi pembatalan</button>
          </div>
        </section>
      </div>}
      {printInvoice && <InvoicePrint invoice={printInvoice} order={orderByResi.get(printInvoice.order_resi)} paid={getReceived(printInvoice)} onClose={() => setPrintInvoice(null)} />}
    </div>
  )
}

function TrendRows({ rows }: { rows: { label: string; value: number }[] }) {
  const grouped = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.label] = (acc[row.label] || 0) + amount(row.value)
    return acc
  }, {})
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const max = Math.max(1, ...entries.map(([, value]) => value))
  return entries.length ? <div className="space-y-4">{entries.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate text-[var(--text-soft)]">{label}</span><strong className="shrink-0 text-[var(--text)]">{idr(value)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-[var(--panel-soft)]"><div className="h-full rounded-full bg-[var(--brand-600)]" style={{ width: `${Math.max(4, value / max * 100)}%` }} /></div></div>)}</div> : <p className="text-sm text-[var(--text-soft)]">Belum ada invoice pada periode ini.</p>
}

function InvoiceTable({
  rows,
  orders,
  onPrint,
  onSend,
  onCancel,
  canCancel,
  saving = false,
}: {
  rows: { invoice: Invoice; balance: number }[]
  orders: Map<string, FinanceOrder>
  onPrint: (invoice: Invoice) => void
  onSend?: (invoice: Invoice) => void
  onCancel?: (invoice: Invoice) => void
  canCancel?: (invoice: Invoice) => boolean
  saving?: boolean
}) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
    <thead className="bg-[var(--panel-soft)] text-xs uppercase text-[var(--text-soft)]"><tr><th className="px-4 py-3">Invoice / resi</th><th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3">Jatuh tempo</th><th className="px-4 py-3 text-right">Tagihan</th><th className="px-4 py-3 text-right">Sisa</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
    <tbody>{rows.map(({ invoice, balance }) => {
      const order = orders.get(invoice.order_resi)
      const label = statusLabel(invoice, balance)
      return <tr key={invoice.id} className="border-t border-[var(--border)]">
        <td className="px-4 py-3"><span className="font-semibold text-[var(--text)]">{invoice.invoice_number}</span><span className="mt-1 block text-xs text-[var(--text-soft)]">{invoice.order_resi}</span></td>
        <td className="px-4 py-3">{order?.cust || '—'}<span className="mt-1 block text-xs text-[var(--text-soft)]">{order ? `${order.asal} → ${order.tujuan}` : 'Order tidak tersedia'}</span></td>
        <td className="px-4 py-3">{new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString('id-ID')}</td>
        <td className="px-4 py-3 text-right">{idr(invoice.total_amount)}</td><td className="px-4 py-3 text-right font-semibold">{idr(balance)}</td>
        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(label)}`}>{label}</span></td>
        <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => onPrint(invoice)} className={outlineButtonClass} aria-label={`Cetak ${invoice.invoice_number}`}><Printer className="h-4 w-4" /></button>{onSend && !invoice.cancelled && invoice.price_approval_status === 'approved' && balance > 0 && <button type="button" disabled={saving} onClick={() => onSend(invoice)} className={outlineButtonClass}>{invoice.sent_at ? 'Kirim ulang' : 'Tandai terkirim'}</button>}{onCancel && !invoice.cancelled && <button type="button" disabled={saving || canCancel?.(invoice) === false} title={canCancel?.(invoice) === false ? 'Pembayaran telah tercatat; invoice tidak dapat dibatalkan' : 'Batalkan invoice'} onClick={() => onCancel(invoice)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Batalkan invoice ${invoice.invoice_number}`}><Ban className="h-4 w-4" />Batalkan</button>}</div></td>
      </tr>
    })}
      {!rows.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-soft)]">Belum ada invoice untuk ditampilkan.</td></tr>}
    </tbody>
  </table></div>
}


function InvoicePrint({ invoice, order, paid, onClose }: { invoice: Invoice; order?: FinanceOrder; paid: number; onClose: () => void }) {
  return <div className="invoice-print-shell fixed inset-0 z-[180] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
    <section className="invoice-print w-full max-w-3xl rounded-xl bg-white p-8 text-slate-900 shadow-xl" role="dialog" aria-modal="true" aria-label={`Invoice ${invoice.invoice_number}`}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-800">Lautan Sejati Trans Cargo</p><h2 className="mt-3 text-3xl font-bold">INVOICE</h2><p className="mt-1 text-sm text-slate-500">{invoice.invoice_number}</p></div>
        <div className="text-right text-sm"><p>Tanggal: {new Date(invoice.created_at).toLocaleDateString('id-ID')}</p><p className="mt-1">Jatuh tempo: {new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString('id-ID')}</p></div>
      </div>
      {invoice.cancelled && <p className="mb-6 rounded border-2 border-red-700 px-4 py-3 text-center text-xl font-black tracking-[0.2em] text-red-700">DIBATALKAN</p>}
      <div className="mb-8 grid gap-5 border-y border-slate-200 py-5 sm:grid-cols-2">
        <div><p className="text-xs uppercase text-slate-500">Tagihan kepada</p><p className="mt-2 font-semibold">{order?.cust || 'Pelanggan'}</p></div>
        <div><p className="text-xs uppercase text-slate-500">Detail pengiriman</p><p className="mt-2 font-semibold">{invoice.order_resi}</p><p className="mt-1 text-sm text-slate-600">{order ? `${order.asal} → ${order.tujuan} · ${order.berat} kg · ${order.layanan}` : '—'}</p></div>
      </div>
      <div className="flex justify-between border-b border-slate-200 py-4 text-sm"><span>Biaya pengiriman</span><strong>{idr(invoice.total_amount)}</strong></div>
      <div className="mt-5 space-y-2 text-right text-sm"><p>Diterima: <strong>{idr(paid)}</strong></p><p className="text-xl">Sisa tagihan: <strong>{idr(Math.max(0, invoice.total_amount - paid))}</strong></p></div>
      <p className="mt-10 text-xs text-slate-500">Invoice dibuat dari pencatatan manual pada aplikasi Lautan Sejati Trans Cargo.</p>
      <div className="mt-8 flex justify-end gap-3">
        <button type="button" onClick={onClose} className={`invoice-print-hide ${outlineButtonClass}`}>Tutup</button>
        <button type="button" onClick={() => window.print()} className={`invoice-print-hide ${buttonClass}`}><Printer className="h-4 w-4" />Cetak invoice</button>
      </div>
    </section>
  </div>
}
