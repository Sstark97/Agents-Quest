type Props = { enabled: boolean; count: number | null; onToggle: (enabled: boolean) => void; onDownload: () => void };

/** Turns the email step on or off for a session and downloads what has been collected. */
export function EmailControl({ enabled, count, onToggle, onDownload }: Props) {
  return (
    <div className="levelctl">
      <h2>CORREOS</h2>
      <label className="consent">
        <input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} />
        <span>Pedir correo al unirse (opcional para los equipos)</span>
      </label>
      <p>Correos recogidos: {count ?? "..."}</p>
      <p><button className="btn" onClick={onDownload} disabled={count === 0}>DESCARGAR CSV</button></p>
      <p className="muted">Se borran al eliminar la sesión o al caducar (30 días). Reiniciar puntuaciones no los borra: descárgalos antes.</p>
    </div>
  );
}
