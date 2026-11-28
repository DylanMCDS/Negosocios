import { useState } from "react";
import { Coffee, Flower, Leaf, MapPin, ShareNetwork, Star, Storefront, WhatsappLogo } from "@phosphor-icons/react";
import { Button, Chip, DataBadge, Surface } from "../../lib/ui";
import { days, money, profileHash, type Profile } from "./model";

const art = { toldo: Storefront, maiz: Leaf, cafe: Coffee, flores: Flower };
const backgrounds = { toldo: "bg-tint", maiz: "bg-warn", cafe: "bg-tint", flores: "bg-ok" };

export default function ProfileView({ profile: p, preview = false }: { profile: Profile; preview?: boolean }) {
  const [shared, setShared] = useState("");
  const Illustration = art[p.cover];
  const Heading = preview ? "h3" : "h1";
  const Section = preview ? "h4" : "h2";
  async function share() {
    const url = `${window.location.origin}/${profileHash(p.business_id)}`;
    try {
      if (navigator.share) await navigator.share({ title: p.name, url });
      else { await navigator.clipboard.writeText(url); setShared("Enlace copiado."); }
    } catch { setShared("No se pudo compartir. Copia el enlace de esta página."); }
  }
  return <article className="flex min-w-0 flex-col gap-6">
    <header className={`relative overflow-hidden rounded-lg p-6 md:p-8 ${backgrounds[p.cover]}`}>
      <Illustration size={preview ? 80 : 144} aria-hidden="true" className="absolute -right-4 -top-2 text-accent opacity-15" />
      <div className="relative flex flex-col items-start gap-3">
        <p className="flex items-center gap-2 text-ink-2"><MapPin size={20} aria-hidden="true" />{p.zone}</p>
        <Heading className={`max-w-[24ch] font-display leading-tight ${preview ? "text-[length:var(--text-l)]" : "text-[length:var(--text-xl)] md:text-[length:var(--text-2xl)]"}`}>{p.name}</Heading>
        <p>{p.category}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={!preview && p.open_now ? "ok" : "neutral"} size="sm">{preview ? "Vista previa" : p.open_now ? "Abierto ahora" : Object.values(p.schedule).some(Boolean) ? "Cerrado ahora" : "Horario sin publicar"}</Chip>
          {p.demo_data && <DataBadge />}
        </div>
      </div>
    </header>
    {p.description ? <p className="max-w-[65ch] whitespace-pre-wrap break-words">{p.description}</p> : <p className="text-ink-2">Este negocio todavía no publica su descripción.</p>}
    <div className="flex flex-wrap items-center gap-3"><Chip size="sm">Aquí se paga con CoDi</Chip><span className="text-[length:var(--text-s)] text-ink-2">Sello informativo</span></div>
    {!preview && <div className="flex flex-wrap items-center gap-3">
      {p.whatsapp && <Button onClick={() => window.location.assign(`https://wa.me/${p.whatsapp}`)}><WhatsappLogo size={24} aria-hidden="true" />WhatsApp</Button>}
      <a className="inline-flex min-h-11 items-center gap-2 font-display text-accent underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.zone)}`} target="_blank" rel="noreferrer"><MapPin size={24} aria-hidden="true" />Cómo llegar</a>
      <Button variant="secondary" size="sm" onClick={share}><ShareNetwork size={24} aria-hidden="true" />Compartir</Button>
      {shared && <p role="status">{shared}</p>}
    </div>}
    <div className={preview ? "flex flex-col gap-6" : "grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"}>
      <Surface className="flex flex-col gap-6">
        <section><Section className="mb-3 font-display text-[length:var(--text-l)]">Menú y productos</Section>
          {p.menu.length ? <ul className="divide-y divide-hairline">{p.menu.map((item, i) => <li key={i} className="flex items-center gap-3 py-3">
            {item.featured && <Star size={20} aria-label="Destacado" className="shrink-0 text-accent" />}
            <span className="min-w-0 flex-1 break-words">{item.name}</span><span className="shrink-0 font-display text-[length:var(--text-l)]">{money(item.price_cents)}</span>
          </li>)}</ul> : <p className="text-ink-2">El negocio todavía no publica su menú.</p>}
          {p.menu.length > 0 && <p className="mt-2 text-[length:var(--text-s)] text-ink-2">Precios en MXN publicados por el negocio.</p>}
        </section>
        <section><Section className="mb-3 font-display text-[length:var(--text-l)]">Promociones</Section>
          {p.promotions.length ? <ul className="divide-y divide-hairline">{p.promotions.map((offer) => <li key={offer.id} className="py-3">{offer.title}<span className="block font-display text-money">{offer.discount_pct} % de descuento</span></li>)}</ul> : <p className="text-ink-2">Sin promociones activas por ahora.</p>}
        </section>
        <section><Section className="mb-3 font-display text-[length:var(--text-l)]">Reseñas</Section>
          {p.reputation.rating === null ? <p className="text-ink-2">Aún sin reseñas.</p> : <p className="mb-3 font-display text-[length:var(--text-l)]">{p.reputation.rating.toFixed(1)} de 5 · {p.reputation.reviews_count} reseñas</p>}
          {p.reviews.length > 0 && <ul className="divide-y divide-hairline">{p.reviews.map((review) => <li key={review.id} className="py-3"><p className="font-semibold">{review.stars} de 5</p><p className="break-words">{review.text || "Sin comentario"}</p></li>)}</ul>}
          <p className="mt-2 text-[length:var(--text-s)] text-ink-2">Estrellas de compras pagadas. Los avales de aliados se cuentan aparte.</p>
        </section>
      </Surface>
      <Surface className="flex flex-col gap-6">
        <section><Section className="mb-3 font-display text-[length:var(--text-l)]">Horario</Section><p className="mb-2 text-[length:var(--text-s)] text-ink-2">Hora de Ciudad de México</p>
          {Object.values(p.schedule).some(Boolean) ? <dl>{days.map(([key, name]) => <div className="flex justify-between gap-3 py-1" key={key}><dt>{name}</dt><dd>{p.schedule[key] ? `${p.schedule[key]!.open} a ${p.schedule[key]!.close}` : "Cerrado"}</dd></div>)}</dl> : <p className="text-ink-2">Consulta el horario con el negocio.</p>}
        </section>
        <section><Section className="mb-3 font-display text-[length:var(--text-l)]">Aliados</Section>
          {p.allies.length ? <ul className="divide-y divide-hairline">{p.allies.map((ally) => <li key={ally.business_id} className="py-3"><a className="inline-flex min-h-11 items-center font-display text-accent underline" href={profileHash(ally.business_id)}>{ally.name}</a></li>)}</ul> : <p className="text-ink-2">Todavía no tiene alianzas activas.</p>}
          {p.reputation.endorsements > 0 && <p className="mt-2 text-[length:var(--text-s)] text-ink-2">{p.reputation.endorsements} avales de alianzas activas.</p>}
        </section>
      </Surface>
    </div>
  </article>;
}
