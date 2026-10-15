'use client'

import Image from 'next/image'
import { ArrowLeft, Printer } from 'lucide-react'

type ReceiptOrder = {
  resi: string
  cust: string
  namaBarang?: string
  berat: number
  items?: { name: string; quantity: number; weight: number; packing?: string }[]
  senderDescription?: string
  recipientAddress?: string
  notes?: string
  packing?: string
}

export default function ReceiptDocument({ order, onBack }: { order: ReceiptOrder; onBack: () => void }) {
  const items = order.items?.length
    ? order.items
    : [{ name: order.namaBarang || '', quantity: 1, weight: order.berat }]

  return (
    <main className="receipt-screen">
      <div className="receipt-toolbar">
        <button type="button" onClick={onBack} className="receipt-action receipt-action-secondary">
          <ArrowLeft aria-hidden="true" size={17} /> Kembali ke order
        </button>
        <button type="button" onClick={() => window.print()} className="receipt-action receipt-action-primary">
          <Printer aria-hidden="true" size={17} /> Cetak surat
        </button>
      </div>

      <article className="receipt-sheet" aria-label={`Surat Tanda Terima nomor ${order.resi}`}>
        <header className="receipt-header">
          <div className="receipt-company">
            <Image src="/company-logo.svg" alt="Logo CV. Lautan Sejati Trans Cargo" width={72} height={78} className="receipt-mark" />
            <div className="receipt-company-copy">
              <p className="receipt-company-kicker">EXPEDISI KAPAL VERI</p>
              <h1>CV. LAUTAN SEJATI TRANS CARGO</h1>
              <p>Jl. Raya Demak No. 363 Surabaya</p>
              <p>Telp. 031-7481072 - 99096898 HP. 081 331 724 819</p>
            </div>
          </div>
          <section className="receipt-recipient" aria-label="Penerima kiriman">
            <p>Kepada Yth. : <strong>{order.cust}</strong></p>
            {order.recipientAddress && <p>{order.recipientAddress}</p>}
            {order.senderDescription && <p>Pengirim: {order.senderDescription}</p>}
            <div className="receipt-dotted-line" />
          </section>
        </header>

        <p className="receipt-number">Surat Tanda Terima No. <strong>{order.resi}</strong></p>

        <table className="receipt-items">
          <colgroup>
            <col className="receipt-col-colly" />
            <col className="receipt-col-packing" />
            <col className="receipt-col-goods" />
            <col className="receipt-col-weight" />
            <col className="receipt-col-notes" />
          </colgroup>
          <thead>
            <tr>
              <th>Jumlah Colly</th>
              <th>Packing</th>
              <th>Nama / Jenis Barang</th>
              <th><span>Berat</span><span>Volume</span></th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td aria-label="Jumlah colly">{item.quantity}</td>
                <td aria-label="Packing">{item.packing || (index === 0 ? order.packing : '')}</td>
                <td aria-label="Nama atau jenis barang">{item.name}</td>
                <td className="receipt-weight-cell">
                  <span>{(item.weight * item.quantity).toLocaleString('id-ID')} kg</span>
                  <span />
                </td>
                <td className={order.notes ? '' : 'receipt-unchecked'}>{index === 0 ? order.notes || 'ISI TIDAK DIPERIKSA' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="receipt-footer">
          <section className="receipt-terms">
            <h2>PERHATIAN !</h2>
            <ol>
              <li>Jika si penerima tidak mau bayar ongkosnya angkutan, si pengirim yang mesti bayar ongkosnya.</li>
              <li>Tidak diberi penggantian untuk kehilangan dan kerugian disebabkan force majeure misalnya kecelakaan, kebakaran, perampokan, moles, bencana alam, dsb.</li>
              <li>Barang-barang cair atau yang bisa pecah, perpackingnya kurang baik/bocor, menguap dll adalah di luar tanggungan PT.</li>
              <li>Kerusakan dan kehilangan barang harus disaksikan mandor atau sopir selewatnya dan tanggal penerimaan bukan jadi tanggungan PT.</li>
              <li>Segala pengaduan selewatnya 2 bulan di luar tanggungan PT kami terhitung dari tanggal pengiriman.</li>
            </ol>
          </section>

          <section className="receipt-signature" aria-label="Tanggal dan tanda tangan penerima">
            <p className="receipt-date">Surabaya, ........................................ 20 ........</p>
            <div className="receipt-signature-space" />
            <p className="receipt-recipient-label">Penerima Barang</p>
            <p className="receipt-insurance">ONGKOS TIDAK TERMASUK<br /><strong>ASURANSI</strong></p>
            <div className="receipt-signature-line" />
            <p className="receipt-signature-label">Tanda Tangan / Nama / Stempel</p>
          </section>
        </footer>
      </article>
      <p className="receipt-preview-note">Data yang belum tersedia pada order dibiarkan kosong untuk dilengkapi saat proses penerimaan.</p>
    </main>
  )
}