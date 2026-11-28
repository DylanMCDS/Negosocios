import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { DEMO_BUSINESS_ID } from "../../lib/business";
import { Button, PageHeader, Surface } from "../../lib/ui";
import ProfileView from "./ProfileView";
import type { Profile } from "./model";

const readId = () => {
  try { return decodeURIComponent(window.location.hash.split("/")[1] || DEMO_BUSINESS_ID); }
  catch { return DEMO_BUSINESS_ID; }
};
export default function Perfil() {
  const [id, setId] = useState(readId);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const sync = () => setId(readId());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    let current = true;
    setProfile(null); setFailed(false);
    api<Profile>(`/profile/${encodeURIComponent(id)}`).then(
      (p) => { if (current) setProfile(p); }, () => { if (current) setFailed(true); },
    );
    return () => { current = false; };
  }, [id, retry]);
  if (profile) return <ProfileView key={id} profile={profile} />;
  return <div className="flex flex-col gap-6"><PageHeader title="Página del negocio" />
    <Surface>{failed ? <div className="flex flex-col items-start gap-4"><p role="alert">No pudimos cargar este negocio. Revisa el enlace o inténtalo de nuevo.</p><Button onClick={() => setRetry((n) => n + 1)}>Reintentar</Button><a href="#explorar" className="min-h-11 text-accent underline">Volver a Explorar</a></div> : <div role="status" className="flex flex-col gap-4"><div className="h-32 rounded-lg bg-tint motion-safe:animate-pulse" /><p>Cargando el negocio…</p></div>}</Surface>
  </div>;
}
