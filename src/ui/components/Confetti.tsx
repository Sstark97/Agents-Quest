const COLORS = ["#ffd84a", "#3ddc84", "#ff4f9a", "#4fc3ff", "#f4f1de"];
const PIECES = Array.from({ length: 44 }, (_, i) => ({ left: (i * 37) % 100, delay: ((i * 53) % 100) / 60, duration: 1.8 + ((i * 29) % 10) / 6, color: COLORS[i % COLORS.length], size: 6 + (i % 3) * 3 }));

export function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {PIECES.map((piece, index) => <i key={index} style={{ left: `${piece.left}%`, width: piece.size, height: piece.size, background: piece.color, animationDelay: `${piece.delay}s`, animationDuration: `${piece.duration}s` }} />)}
    </div>
  );
}
