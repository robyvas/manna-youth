import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KINDS } from '../lib/logic'
import { BackPill, Button, Logo } from '../ui/kit'
import { useStaffData } from './StaffData'

/** Printable A4 entrance poster. The QR always points at /in on this domain. */
export default function Poster() {
  const { ev } = useStaffData()
  const navigate = useNavigate()
  const [svg, setSvg] = useState('')
  const url = `${window.location.origin}/in`
  const host = window.location.host

  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#171311', light: '#f6f1ea' } }).then(setSvg)
  }, [url])

  return (
    <div className="min-h-dvh bg-[#2a0b07] py-6 print:bg-manna print:p-0">
      <div className="no-print mx-auto mb-5 flex max-w-[210mm] items-center justify-between gap-3 px-4">
        <BackPill onClick={() => navigate('/admin')}>← Setări</BackPill>
        <Button height={44} className="max-w-[220px] text-sm" onClick={() => window.print()}>
          Printează / PDF
        </Button>
      </div>
      <div className="mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col bg-manna p-[9%] text-cream print:max-w-none print:w-[210mm] print:h-[297mm]">
        <Logo width={220} />
        <div className="mt-[10%] w-[62%] rounded bg-cream p-[4%]">
          <div className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <div className="mt-auto font-display text-[clamp(32px,8vw,64px)] leading-none tracking-[-.02em]">
          Scanează.
          <br />
          Scrie-ți numele.
          <br />
          Află-ți {KINDS[ev.kind].unitAcc}.
        </div>
        <div className="mt-[3%] text-[clamp(14px,2.4vw,20px)] opacity-80">{host}/in · fără instalare</div>
      </div>
    </div>
  )
}
