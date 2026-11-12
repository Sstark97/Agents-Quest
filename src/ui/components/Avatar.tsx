"use client";
import { AVATARS, robotArt, robotPal } from "@/src/ui/art/pixel-art";
import { PixelArt } from "@/src/ui/art/sprites";

export function Avatar({ n, size = 28 }: { n: number; size?: number }) {
  const index = AVATARS[n] ? n : 0;
  return <span className="avatar" style={{ width: size, height: size }}><PixelArt art={robotArt(index)} pal={robotPal(index)} /></span>;
}

export function AvatarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="avatars" role="radiogroup" aria-label="Elige tu robot">
      {AVATARS.map((avatar, index) => (
        <button key={index} type="button" role="radio" aria-checked={value === index} aria-label={avatar.name} title={avatar.name} className={`avbtn ${value === index ? "on" : ""}`} onClick={() => onChange(index)}>
          <Avatar n={index} size={44} /><small>{avatar.name}</small>
        </button>
      ))}
    </div>
  );
}
