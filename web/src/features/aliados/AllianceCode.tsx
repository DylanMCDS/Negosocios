import { useMemo, useState } from "react";
import { ShareNetwork } from "@phosphor-icons/react";
import QRCode from "qrcode";

// Same pattern as the other QR screens, copied here so this feature does not import another task's folder.
function CodeQr({ value }: { value: string }) {
  const { size, data } = useMemo(() => QRCode.create(value, { errorCorrectionLevel: "M" }).modules, [value]);
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) cells.push([x, y]);
  return (
    <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label={`QR del código ${value}`} className="aspect-square w-28 shrink-0 rounded-md bg-surface fill-ink" shapeRendering="crispEdges">
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)}
    </svg>
  );
}

/* The code of an alliance where this business gives the discount: big, copyable, shareable. */
export default function AllianceCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Usa mi código ${code} y recibe un descuento en mi puesto.`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="flex items-center gap-4 rounded-md bg-tint p-4">
      <CodeQr value={code} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[length:var(--text-s)] text-ink-2">Código para tus clientes</p>
        <p className="break-all font-display text-[length:var(--text-xl)] tracking-wide">{code}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-surface px-4 font-display text-[length:var(--text-s)] text-accent hover:bg-hairline"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-4 font-display text-[length:var(--text-s)] text-accent-ink hover:bg-accent-hover"
          >
            <ShareNetwork size={20} aria-hidden="true" />
            Compartir por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
