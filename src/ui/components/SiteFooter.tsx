/** Credits shown at the bottom of every page. */
export function SiteFooter() {
  return (
    <footer className="sitefoot">
      <nav aria-label="Enlaces">
        <a href="https://sirviendocodigo.com/" target="_blank" rel="noopener noreferrer">
          <img src="/logos/sirviendo-codigo.svg" alt="" width={28} height={28} /><span>Sirviendo Código</span>
        </a>
        <a href="https://leanmind.es/es" target="_blank" rel="noopener noreferrer">
          <img src="/logos/leanmind.webp" alt="" width={35} height={28} /><span>LeanMind</span>
        </a>
      </nav>
      <p>made it by <a href="https://ascinfo.dev/" target="_blank" rel="noopener noreferrer">ascinfo.dev</a></p>
    </footer>
  );
}
