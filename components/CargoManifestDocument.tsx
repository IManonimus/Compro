'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import { ArrowLeft, Printer, X, Plus, Trash2 } from 'lucide-react'
import type { OperationalOrder } from './OperationsWorkspace'

export type ManifestInfo = {
  id: string
  manifest_number: string
  origin_city: string
  destination_city: string
  created_at: string
}

export type CargoItem = {
  no: number
  name: string
  weight: number
  volume?: string
}

export interface DriverManifestInfo {
  driverName?: string
  driverCode?: string
  driverPhone?: string
  jabatan?: string
  expedisiName?: string
  truckType?: string
  licensePlate?: string
  shipName?: string
  departureDate?: string
  departureTime?: string
  originPort?: string
  destinationPort?: string
  originCity?: string
  destinationCity?: string
  manifestNumber?: string
}

export interface CargoManifestDocumentProps {
  manifest: ManifestInfo
  orders?: OperationalOrder[]
  driverInfo?: DriverManifestInfo
  onClose: () => void
}

function formatDateIndonesian(dateStr?: string) {
  const d = dateStr ? new Date(dateStr) : new Date()
  if (isNaN(d.getTime())) return dateStr || ''
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const day = String(d.getDate()).padStart(2, '0')
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatWeight(val: number) {
  if (!val || isNaN(val)) return '0'
  return val.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

export default function CargoManifestDocument({
  manifest,
  orders = [],
  driverInfo,
  onClose,
}: CargoManifestDocumentProps) {
  // Rincian barang sesuai daftar resi pada manifest, atau default sesuai PDF resmi
  const initialItems: CargoItem[] = useMemo(() => {
    if (!orders || orders.length === 0) {
      return [
        { no: 1, name: 'Timah', weight: 3605, volume: '' },
        { no: 2, name: 'Winch Jangkar', weight: 1500, volume: '' },
        { no: 3, name: 'Konfeksi', weight: 616, volume: '' },
        { no: 4, name: 'Elbow Besi', weight: 2049, volume: '' },
        { no: 5, name: 'Dodos', weight: 1378, volume: '' },
        { no: 6, name: 'Bawang Merah, Ubi, Kunyit', weight: 19000, volume: '' },
      ]
    }

    const itemsList: CargoItem[] = []
    let counter = 1

    orders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach(it => {
          itemsList.push({
            no: counter++,
            name: `${it.name}${orders.length > 1 ? ` (Resi: ${order.resi})` : ''}`,
            weight: Number(it.weight || 0) * (Number(it.quantity) || 1) || Number(order.berat) || 0,
            volume: '',
          })
        })
      } else {
        const desc =
          order.notes?.trim() ||
          (order as any).namaBarang?.trim() ||
          order.senderDescription?.trim() ||
          `${order.cust} (Resi: ${order.resi})`

        itemsList.push({
          no: counter++,
          name: desc,
          weight: Number(order.berat) || 0,
          volume: '',
        })
      }
    })

    return itemsList.length > 0
      ? itemsList
      : [
          { no: 1, name: 'Timah', weight: 3605, volume: '' },
          { no: 2, name: 'Winch Jangkar', weight: 1500, volume: '' },
          { no: 3, name: 'Konfeksi', weight: 616, volume: '' },
          { no: 4, name: 'Elbow Besi', weight: 2049, volume: '' },
          { no: 5, name: 'Dodos', weight: 1378, volume: '' },
          { no: 6, name: 'Bawang Merah, Ubi, Kunyit', weight: 19000, volume: '' },
        ]
  }, [orders])

  const [cargoItems, setCargoItems] = useState<CargoItem[]>(initialItems)

  // Data identitas sopir & pelayaran sesuai PDF template resmi (dapat diedit langsung)
  const [driverName, setDriverName] = useState(
    driverInfo?.driverName || 'Rahmat Catur Yulianto'
  )
  const [jabatan, setJabatan] = useState(driverInfo?.jabatan || 'Sopir')
  const [expedisiName, setExpedisiName] = useState(
    driverInfo?.expedisiName || 'CV. LAUTAN SEJATI TRANS CARGO'
  )
  const [namaKapal, setNamaKapal] = useState(
    driverInfo?.shipName || 'Dharma Kartika 7'
  )
  const [tanggalBerangkat, setTanggalBerangkat] = useState(
    driverInfo?.departureDate
      ? formatDateIndonesian(driverInfo.departureDate)
      : manifest.created_at
        ? formatDateIndonesian(manifest.created_at)
        : '1 Oktober 2026'
  )
  const [tujuan, setTujuan] = useState(
    driverInfo?.destinationCity ||
      driverInfo?.destinationPort?.split('(')[0]?.trim() ||
      manifest.destination_city ||
      orders[0]?.tujuan ||
      'Pontianak'
  )
  const [jenisKendaraan, setJenisKendaraan] = useState(
    driverInfo?.truckType || 'Fuso (5B)'
  )
  const [nopol, setNopol] = useState(
    driverInfo?.licensePlate || 'BA 9203 LQ'
  )
  const [kotaTanggal, setKotaTanggal] = useState(
    `${driverInfo?.originCity || manifest.origin_city || orders[0]?.asal || 'Surabaya'}, ${formatDateIndonesian(manifest.created_at || new Date().toISOString())}`
  )

  const totalWeight = useMemo(() => {
    return cargoItems.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0)
  }, [cargoItems])

  const handlePrint = () => {
    window.print()
  }

  const handleAddItem = () => {
    setCargoItems(prev => [
      ...prev,
      {
        no: prev.length + 1,
        name: '',
        weight: 0,
        volume: '',
      },
    ])
  }

  const handleDeleteItem = (index: number) => {
    setCargoItems(prev => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((item, i) => ({ ...item, no: i + 1 }))
    })
  }

  return (
    <div className="waybill-print-shell min-h-screen bg-slate-100 py-4 sm:py-8 px-2 sm:px-4 flex flex-col items-center justify-start print:p-0 print:m-0 print:bg-white print:min-h-0 print:block">
      {/* Explicit Print CSS override for Cargo Manifest Document */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait !important;
          margin: 6mm 8mm !important;
        }
        @media print {
          html, body {
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .manifest-action-bar {
            display: none !important;
          }
          .waybill-print-shell {
            position: static !important;
            inset: auto !important;
            display: block !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .manifest-wrapper {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .waybill-print {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .waybill-print input {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            border: none !important;
            padding: 0 !important;
          }
        }
      ` }} />

      {/* Container wrapper */}
      <div className="manifest-wrapper relative w-full max-w-[850px] rounded-xl bg-white shadow-2xl border border-slate-200 print:shadow-none print:border-none print:max-w-none print:w-full print:rounded-none">
        
        {/* Floating action bar (hidden during print) */}
        <div className="manifest-action-bar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 sm:px-6 py-3.5 backdrop-blur print:hidden rounded-t-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>
            <div className="h-5 w-[1px] bg-slate-200 mx-1" />
            <span className="font-semibold text-slate-800 text-sm">
              Surat Pernyataan Cargo Manifest
            </span>
            <span className="rounded bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
              {manifest.manifest_number}
            </span>
            {orders.length > 0 && (
              <span className="text-xs text-slate-500 hidden sm:inline">
                ({orders.length} resi dimuat)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Baris</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#1268b3] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0e528e] transition active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak / Unduh PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE SHEET: EXACT A4 PORTRAIT MATCH TO USER PDF TEMPLATE
           ========================================================================= */}
        <div
          id="cargo-manifest-sheet"
          className="waybill-print mx-auto bg-white px-8 py-8 sm:px-12 sm:py-10 text-black print:p-0 print:m-0"
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#000',
            lineHeight: 1.35,
          }}
        >
          {/* HEADER / KOP SURAT (EXACT MATCH PDF) */}
          <div className="flex items-start justify-between gap-4">
            {/* Logo Kiri */}
            <div className="flex-shrink-0 pt-1">
              <Image
                src="/company-logo.svg"
                alt="Logo CV. Lautan Sejati Trans Cargo"
                width={86}
                height={94}
                className="object-contain"
                priority
              />
            </div>

            {/* Bagian Tengah (Nama & Alamat Kantor Pusat) */}
            <div className="flex-1 text-center px-2">
              <p className="text-[13px] font-bold tracking-wide text-[#0284c7]">
                KHUSUS SURABAYA - PONTIANAK
              </p>
              <p className="text-[13px] font-bold tracking-wide text-[#0284c7]">
                EXPEDISI VIA KAPAL VERI
              </p>
              <h1
                className="my-0.5 text-[19px] font-bold tracking-tight text-[#0f4c81]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                CV. LAUTAN SEJATI TRANS CARGO
              </h1>
              <p className="text-[11.5px] text-[#0284c7]">
                Jl. Raya Demak No. 363 Surabaya
              </p>
              <p className="text-[11.5px] text-[#0284c7]">
                Telp. 081331724819
              </p>
              <p className="text-[11.5px] text-[#0284c7]">
                Email : tutikmariyani08@gmail.com
              </p>
            </div>

            {/* Bagian Kanan (Perwakilan Cabang) */}
            <div className="w-[180px] flex-shrink-0 text-left text-[11px] leading-tight text-[#0284c7] pt-1">
              <p className="font-medium">Perwakilan :</p>
              <p>Jl. Komyos Sudarso</p>
              <p>Gang Durian I / No. 16</p>
              <p>RT. 04 RW. 02</p>
              <p>Kel. SEI JAWI LUAR</p>
              <p>Telp. 085346160034</p>
            </div>
          </div>

          {/* Garis Pembatas Kop Surat (Double Line Biru) */}
          <div className="my-3 w-full">
            <div className="h-[3px] bg-[#1268b3]" />
            <div className="mt-[2px] h-[1px] bg-[#1268b3]" />
          </div>

          {/* Tanggal (Kanan Atas) */}
          <div className="mt-3 text-right text-[13px]">
            <input
              type="text"
              value={kotaTanggal}
              onChange={e => setKotaTanggal(e.target.value)}
              className="bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none text-right px-1 print:border-none print:p-0"
              placeholder="Surabaya, 09 Oktober 2026"
            />
          </div>

          {/* Judul Dokumen (Tengah, Tebal) */}
          <div className="my-5 text-center">
            <h2 className="text-[15px] font-bold tracking-wide uppercase">
              SURAT PERNYATAAN CARGO MANIFEST
            </h2>
            <h3 className="text-[14px] font-bold tracking-wide uppercase">
              (MUATAN &amp; KONDISI KENDARAAN DIATAS KAPAL)
            </h3>
          </div>

          {/* Pembuka Identitas */}
          <div className="mb-2 flex items-center justify-between text-[13px]">
            <span>Yang bertanda tangan di bawah ini:</span>
            <span className="text-[13px]">(Sesuai KTP/SIM/Identitas)</span>
          </div>

          {/* Rincian Sopir & Kendaraan */}
          <div className="mb-5 text-[13px]">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="w-[200px] py-[2px]">Nama lengkap</td>
                  <td className="w-[15px] text-center">:</td>
                  <td className="py-[2px]">
                    <input
                      type="text"
                      value={driverName}
                      onChange={e => setDriverName(e.target.value)}
                      placeholder="Masukkan nama sopir / pengemudi"
                      className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 print:border-none print:p-0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-[2px]">Jabatan</td>
                  <td className="text-center">:</td>
                  <td className="py-[2px]">
                    <input
                      type="text"
                      value={jabatan}
                      onChange={e => setJabatan(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 print:border-none print:p-0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-[2px]">Nama expedisi</td>
                  <td className="text-center">:</td>
                  <td className="py-[2px]">
                    <input
                      type="text"
                      value={expedisiName}
                      onChange={e => setExpedisiName(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 print:border-none print:p-0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-[2px]">Nama kapal</td>
                  <td className="text-center">:</td>
                  <td className="py-[2px]">
                    <input
                      type="text"
                      value={namaKapal}
                      onChange={e => setNamaKapal(e.target.value)}
                      placeholder="Masukkan nama kapal penyeberangan"
                      className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 print:border-none print:p-0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-[2px]">Tanggal keberangkatan</td>
                  <td className="text-center">:</td>
                  <td className="py-[2px]">
                    <input
                      type="text"
                      value={tanggalBerangkat}
                      onChange={e => setTanggalBerangkat(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 print:border-none print:p-0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-[2px]">Tujuan keberangkatan</td>
                  <td className="text-center">:</td>
                  <td className="py-[2px]">
                    <input
                      type="text"
                      value={tujuan}
                      onChange={e => setTujuan(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 print:border-none print:p-0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-[2px]">Jenis kendaraan</td>
                  <td className="text-center">:</td>
                  <td className="py-[2px]">
                    <input
                      type="text"
                      value={jenisKendaraan}
                      onChange={e => setJenisKendaraan(e.target.value)}
                      placeholder="Jenis kendaraan (contoh: Fuso (5B))"
                      className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 print:border-none print:p-0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-[2px]">Nopol</td>
                  <td className="text-center">:</td>
                  <td className="py-[2px]">
                    <input
                      type="text"
                      value={nopol}
                      onChange={e => setNopol(e.target.value)}
                      placeholder="Nomor polisi (contoh: BA 9203 LQ)"
                      className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none py-0.5 print:border-none print:p-0"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABEL BARANG / CARGO (EXACT MATCH PDF) */}
          <div className="mb-14">
            <table
              className="w-full border-collapse text-[13px]"
              style={{ border: '1px solid black' }}
            >
              <thead>
                <tr className="font-bold">
                  <th
                    className="border border-black px-2 py-1.5 text-center font-bold"
                    style={{ width: '7%' }}
                  >
                    No
                  </th>
                  <th
                    className="border border-black px-3 py-1.5 text-center font-bold"
                    style={{ width: '51%' }}
                  >
                    Nama Barang
                  </th>
                  <th
                    className="border border-black px-3 py-1.5 text-center font-bold"
                    style={{ width: '22%' }}
                  >
                    Berat (Kg)
                  </th>
                  <th
                    className="border border-black px-3 py-1.5 text-center font-bold"
                    style={{ width: '20%' }}
                  >
                    Volume (m³)
                  </th>
                </tr>
              </thead>
              <tbody>
                {cargoItems.map((item, idx) => (
                  <tr key={idx} className="group">
                    <td className="border border-black px-2 py-1 text-center relative">
                      {item.no}
                      {cargoItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="opacity-0 group-hover:opacity-100 absolute left-1 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 print:hidden"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                    <td className="border border-black px-3 py-1 text-left">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => {
                          const updated = [...cargoItems]
                          updated[idx].name = e.target.value
                          setCargoItems(updated)
                        }}
                        placeholder="Nama barang..."
                        className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none print:border-none print:p-0"
                      />
                    </td>
                    <td className="border border-black px-3 py-1 text-right">
                      <input
                        type="number"
                        step="any"
                        value={item.weight || ''}
                        onChange={e => {
                          const updated = [...cargoItems]
                          updated[idx].weight = Number(e.target.value) || 0
                          setCargoItems(updated)
                        }}
                        className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none print:border-none print:p-0"
                      />
                    </td>
                    <td className="border border-black px-3 py-1 text-center">
                      <input
                        type="text"
                        value={item.volume || ''}
                        onChange={e => {
                          const updated = [...cargoItems]
                          updated[idx].volume = e.target.value
                          setCargoItems(updated)
                        }}
                        className="w-full text-center bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none print:border-none print:p-0"
                      />
                    </td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="font-bold">
                  <td
                    colSpan={2}
                    className="border border-black px-3 py-1.5 text-center font-bold"
                  >
                    Total
                  </td>
                  <td className="border border-black px-3 py-1.5 text-right font-bold">
                    {formatWeight(totalWeight)}
                  </td>
                  <td className="border border-black px-3 py-1.5 text-center" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tanda Tangan Hormat Kami (Kanan Bawah - Sesuai PDF) */}
          <div className="flex justify-end text-[13px]">
            <div className="w-[260px] text-center">
              <p>Hormat kami,</p>
              <div className="h-[75px]" />
              <p className="font-semibold tracking-wide">
                CV. LAUTAN SEJATI TRANS CARGO
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
