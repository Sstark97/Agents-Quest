import type { JoinedSession } from "@/src/application/client/session-membership";
import { TEAM_NAME_MAX } from "@/src/domain/session/score-submission";
import { AvatarPicker } from "@/src/ui/components/Avatar";
import { EmailForm } from "./EmailForm";

const CODE_INPUT_MAX = 8;

type ProfileProps = { team: string; avatar: number; onAvatarChange: (avatar: number) => void };

type EmailHandlers = { busy: boolean; onSubmit: (email: string, consent: boolean) => void; onSkip: () => void; notice: { tone: "good" | "warn"; text: string } | null };

type JoinedProps = ProfileProps & {
  session: JoinedSession; onTeamChange: (team: string) => void; onLeave: () => void;
  askEmail: boolean; emailNotice: { tone: "good" | "warn"; text: string } | null; email: EmailHandlers;
};

/** The session the device has joined, with the team name and robot still editable. */
export function JoinedSessionCard({ session, team, avatar, onTeamChange, onAvatarChange, onLeave, askEmail, emailNotice, email }: JoinedProps) {
  return (
    <div className="card">
      <div className="muted">SESIÓN</div>
      <h2 style={{ color: "var(--gold)", margin: "4px 0 12px" }}>{session.name} · {session.code}</h2>
      <div className="muted">Tu equipo o nombre</div>
      <input placeholder="Nombre del equipo" value={team} maxLength={TEAM_NAME_MAX} onChange={(event) => onTeamChange(event.target.value)} />
      <div className="muted" style={{ marginTop: 8 }}>Tu robot</div>
      <AvatarPicker value={avatar} onChange={onAvatarChange} />
      {emailNotice && !askEmail && <p className={`fb ${emailNotice.tone}`} role="status">{emailNotice.text}</p>}
      {askEmail && <EmailForm title="¿Quieres dejar tu correo? (opcional)" submitLabel="GUARDAR CORREO" skipLabel="Ahora no" {...email} />}
      <p><button className="btn ghost" onClick={onLeave}>SALIR DE LA SESION</button></p>
      <p className="muted">Tu progreso (niveles superados) pertenece a esta sesión: si sales, se borra.</p>
    </div>
  );
}

type JoinProps = ProfileProps & {
  code: string; error: string; busy: boolean;
  onCodeChange: (code: string) => void; onTeamChange: (team: string) => void; onJoin: () => void;
  emailStep: boolean; email: EmailHandlers;
};

/** Form to join a session with the facilitator's code. */
export function JoinSessionCard({ code, team, avatar, error, busy, onCodeChange, onTeamChange, onAvatarChange, onJoin, emailStep, email }: JoinProps) {
  if (emailStep) {
    return (
      <div className="card">
        <h2>UNETE A UNA SESION</h2>
        <EmailForm submitLabel="UNIRME CON CORREO" skipLabel="UNIRME SIN CORREO" autoFocus {...email} />
      </div>
    );
  }
  return (
    <div className="card">
      <h2>UNETE A UNA SESION</h2>
      <div className="muted">Código que te da el formador</div>
      <input placeholder="K7M2Q" value={code} maxLength={CODE_INPUT_MAX} onChange={(event) => onCodeChange(event.target.value.toUpperCase())} />
      <div className="muted" style={{ marginTop: 8 }}>Tu equipo o nombre</div>
      <input placeholder="Nombre del equipo" value={team} maxLength={TEAM_NAME_MAX} onChange={(event) => onTeamChange(event.target.value)} />
      <div className="muted" style={{ marginTop: 8 }}>Elige tu robot</div>
      <AvatarPicker value={avatar} onChange={onAvatarChange} />
      {error && <p className="fb bad">{error}</p>}
      <p><button className="btn start" onClick={onJoin} disabled={busy}>UNIRME</button></p>
    </div>
  );
}
