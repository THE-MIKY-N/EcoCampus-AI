import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BrowserQRCodeReader } from "@zxing/browser";
import "./App.css";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
const recyclingIcon = L.divIcon({
  className: "recycling-marker",
  html: '<div class="marker-pin"><span>♻</span></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});


import "leaflet/dist/leaflet.css";

type Role = "student" | "admin";
type IconName =
  | "home"
  | "scan"
  | "qr"
  | "star"
  | "ranking"
  | "award"
  | "target"
  | "history"
  | "map"
  | "user"
  | "logout"
  | "leaf"
  | "menu"
  | "bell"
  | "chevron"
  | "recycle"
  | "users"
  | "chart"
  | "pin"
  | "file"
  | "settings"
  | "trash"
  | "download"
  | "filter"
  | "check"
  | "close"
  | "eye"
  | "arrow-left"
  | "gift"
  | "info"
  | "coin"
  | "lock";

type PerfilEstudiante = {
  usuario: string;
  correo: string;
  identificacion: string;
  codigo_qr: string;
  facultad: string;
  carrera: string;
  semestre: number;
  puntos: number;
  ecucoins: number;
  fecha_registro: string;
};

const paths: Record<IconName, ReactNode> = {
  home: <><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/></>,
  scan: <><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><path d="M7 12h10"/></>,
  qr: <><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 14h2v6h-2M14 18h2v2h-2"/></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3z"/>,
  ranking: <><path d="M8 21V10h8v11M3 21v-6h5M16 6h5v15"/><path d="M12 3v4M10 5h4"/></>,
  award: <><circle cx="12" cy="8" r="5"/><path d="m8.5 12-1 9 4.5-3 4.5 3-1-9"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  history: <><path d="M4 5v5h5"/><path d="M5.5 17A8 8 0 1 0 4 10"/><path d="M12 7v5l3 2"/></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15M15 6v15"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/></>,
  leaf: <><path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16z"/><path d="M4 21c3-6 7-9 12-12"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  recycle: <><path d="m8 6 2-3 2 3M10 3 6 10h-3"/><path d="m18 10 3 1-2 3M21 11l-4-7h-5"/><path d="m8 19-1 3-3-2M7 22h8l2-4"/></>,
  users: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20a6 6 0 0 1 12 0M15 15a5 5 0 0 1 6 5"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.7-1.7.9-2-2.2-2.2-2 .9-1.8-.7-.7-2h-3l-.7 2-1.7.7-2-.9L.9 6.1l.9 2-.7 1.7-2 .7v3l2 .7.7 1.7-.9 2 2.2 2.2 2-.9 1.7.7.7 2h3l.7-2 1.8-.7 2 .9 2.2-2.2-.9-2 .7-1.7 2-.7z" transform="scale(.85) translate(2 2)"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  "arrow-left": <><path d="m15 18-6-6 6-6"/><path d="M9 12h10"/></>,
  gift: <><rect x="3" y="8" width="18" height="4"/><path d="M5 12v9h14v-9M12 8v13M12 8c-2.5 0-4.5-1-4.5-3s3.5-2 4.5 3c1-5 4.5-5 4.5-3S14.500 8 12 8z"/></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  coin: <><circle cx="12" cy="12" r="9"/><path d="M14.500 9.500c-.5-1-1.500-1.500-2.500-1.500-1.500 0-2.500 1-2.500 2s1 1.700 2.500 2 2.500 1 2.500 2-1 2-2.500 2c-1 0-2-.5-2.500-1.500M12 6v2M12 16v2"/></>,
};

const toLocalDateTime = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Button({ children, onClick, variant = "primary", icon, type = "button", disabled = false, className = "", ariaPressed }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: IconName; type?: "button" | "submit"; disabled?: boolean; className?: string; ariaPressed?: boolean }) {
  return <button type={type} className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled} aria-pressed={ariaPressed}>{icon && <Icon name={icon} size={18}/>}<span>{children}</span></button>;
}

function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "red" | "gray" | "blue" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo"><span className="logo-mark"><Icon name="leaf" size={22}/></span>{!compact && <span><b>EcoCampus</b> <em>AI</em></span>}</div>;
}

const studentNav: [string, IconName][] = [
  ["Inicio", "home"], ["Mis puntos", "star"],
  ["Ranking", "ranking"], ["Insignias", "award"], ["Retos", "target"], ["Historial", "history"],
  ["Mapa de reciclaje", "map"], ["Recompensas", "gift"], ["Información de reciclaje", "info"], ["Perfil", "user"],
];
const adminNav: [string, IconName][] = [
  ["Dashboard", "home"],
  ["Usuarios", "users"],
  ["Facultades", "leaf"],
  ["Carreras", "file"],
  ["Reciclajes", "history"],
  ["Puntos de reciclaje", "pin"],
  ["Ranking", "ranking"],
  ["Recompensas", "gift"],
  ["Retos", "target"],
  ["Insignias", "award"],
  ["Reportes", "chart"],
  ["Configuración", "settings"],
];


function Login({
  onLogin,
}: {
  onLogin: (
    role: Role,
    usuario: {
      id: number;
      username: string;
      email: string;
      nombre: string;
      apellido: string;
      nombre_completo: string;
    }
  ) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Completa el correo institucional y la contraseña.");
      return;
    }

    setLoading(true);

    try {
      const csrfResponse = await fetch("/api/csrf/", {
        credentials: "include",
      });

      if (!csrfResponse.ok) {
        throw new Error("No se pudo establecer la conexión con Django.");
      }

      const csrfToken = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("csrftoken="))
        ?.split("=")[1];

      if (!csrfToken) {
        throw new Error("No se pudo obtener el token de seguridad. Recarga la página e inténtalo de nuevo.");
      }

      const response = await fetch("/api/login/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": decodeURIComponent(csrfToken),
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();
      console.log("RESPUESTA DEL LOGIN:", data);

      if (!response.ok) {
        throw new Error(data.error || "No se pudo iniciar sesión.");
      }

      const sesionResponse = await fetch("/api/sesion/", {
  credentials: "include",
});

if (!sesionResponse.ok) {
  throw new Error("No se pudieron cargar los datos de la sesión.");
}

const sesionData = await sesionResponse.json();

if (!sesionData.autenticado || !sesionData.usuario) {
  throw new Error("No se pudo recuperar la información del usuario.");
}

onLogin(
  sesionData.rol as Role,
  sesionData.usuario
);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con Django."
      );
    } finally {
      setLoading(false);
    }
  };

  return <main className="login-page">
    <section className="login-visual">
      <div className="login-visual-inner">
        <Logo />
        <div className="hero-copy">
          <Badge>Campus sostenible · IA aplicada</Badge>
          <h1>Reciclar transforma.<br/>La tecnología lo hace medible.</h1>
          <p>Sistema inteligente de gestión e incentivo del reciclaje universitario.</p>
        </div>
        <div className="impact-row">
          <div><b>12.480</b><span>residuos clasificados</span></div>
          <div><b>98,4%</b><span>precisión de detección</span></div>
          <div><b>1.248</b><span>estudiantes activos</span></div>
        </div>
      </div>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <div className="mobile-logo"><Logo /></div>
        <div className="eyebrow">Bienvenido de nuevo</div>
        <h2>Inicia sesión en EcoCampus AI</h2>
        <p className="muted">Accede con tus credenciales institucionales.</p>
        <form onSubmit={submit}>
          <label>Correo institucional<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@unemi.edu.ec" autoComplete="username" /></label>
          <label>Contraseña<div className="input-wrap"><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ingresa tu contraseña" autoComplete="current-password" /></div></label>
          {error && <div className="form-error"><Icon name="close" size={17}/>{error}</div>}
          <div className="form-options"><label className="check"><input type="checkbox"/> Recordarme</label><button type="button" className="link-btn">¿Olvidaste tu contraseña?</button></div>
          <Button type="submit" disabled={loading}>{loading ? "Verificando..." : "Iniciar sesión"}</Button>
        </form>
      </div>
    </section>
  </main>;
}


function Sidebar({ role, usuario, page, setPage, logout, open, close }: {
  role: Role;
  usuario: {
    nombre: string;
    apellido: string;
    nombre_completo: string;
    username: string;
    email: string;
  } | null;
  page: string;
  setPage: (p: string) => void;
  logout: () => void;
  open: boolean;
  close: () => void;
}) {
  const nav = role === "student" ? studentNav : adminNav;
  const navRef = useRef<HTMLElement>(null);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;
    const update = () => setHasMore(navElement.scrollHeight - navElement.clientHeight - navElement.scrollTop > 2);
    const observer = new ResizeObserver(update);
    observer.observe(navElement);
    navElement.addEventListener("scroll", update);
    update();
    return () => { observer.disconnect(); navElement.removeEventListener("scroll", update); };
  }, [role, open]);
  return <aside className={`sidebar ${open ? "open" : ""}`}>
    <div className="side-head"><Logo/></div>
    <nav ref={navRef}>{nav.map(([label, icon]) => <button key={label} className={page === label ? "active" : ""} onClick={() => { setPage(label); close(); }}><Icon name={icon}/><span>{label}</span>{page === label && <i/>}</button>)}</nav>
    {hasMore && <Button variant="ghost" className="sidebar-more" onClick={() => navRef.current?.scrollBy({top: navRef.current.clientHeight * .75, behavior: "smooth"})}><Icon name="chevron" size={18}/><span className="sr-only">Ver más contenido abajo</span></Button>}
    <div className="side-footer">
      <div className="mini-profile">
  <div className="avatar">
    {`${usuario?.nombre?.[0] || usuario?.username?.[0] || ""}${usuario?.apellido?.[0] || ""}`.toUpperCase()}
  </div>
  <div>
    <b>{usuario?.nombre_completo || usuario?.username || "Usuario"}</b>
    <span>{role === "student" ? "Estudiante" : "Administrador"}</span>
  </div>
</div>
      <button onClick={logout}><Icon name="logout"/><span>Cerrar sesión</span></button>
    </div>
  </aside>;
}



function Shell({
  role,
  logout,
  usuario,
}: {
  role: Role;
  logout: () => void;
  usuario: {
    nombre: string;
    apellido: string;
    nombre_completo: string;
    username: string;
    email: string;
  } | null;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(
    role === "student" ? "Inicio" : "Dashboard"
  );

  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);



  const navigate = (nextPage: string) => {
    if (nextPage === page) return;

    setPageHistory([...pageHistory, page]);
    setPage(nextPage);
  };

  const goBack = () => {
    const previousPage = pageHistory.at(-1);

    if (!previousPage) return;

    setPageHistory(pageHistory.slice(0, -1));
    setPage(previousPage);
  };

  // Estados de notificaciones
const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
const notificationRef = useRef<HTMLDivElement>(null);

const {
  data: notificacionesData,
} = useQuery<{
  notificaciones: any[];
  no_leidas: number;
}>({
  queryKey: ["notificaciones"],
  queryFn: async () => {
    const response = await fetch("/api/notificaciones/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar las notificaciones.");
    }

    return response.json();
  },
});

const notificaciones = notificacionesData?.notificaciones ?? [];
const noLeidas = notificacionesData?.no_leidas ?? 0;

  // Marcar una notificación como leída
  const marcarComoLeida = async (id: number) => {
  try {
    const csrfResponse = await fetch("/api/csrf/", {
      credentials: "include",
    });

    if (!csrfResponse.ok) {
      throw new Error("No se pudo obtener el token CSRF.");
    }

    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1];

    if (!csrfToken) {
      throw new Error("No se encontró el token CSRF.");
    }

    const response = await fetch("/api/notificaciones/", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": decodeURIComponent(csrfToken),
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new Error("No se pudo marcar como leída.");
    }

    queryClient.setQueryData(
      ["notificaciones"],
      (actual: { notificaciones: any[]; no_leidas: number } | undefined) => {
        if (!actual) return actual;

        return {
          notificaciones: actual.notificaciones.map((n) =>
            n.id === id ? { ...n, leida: true } : n
          ),
          no_leidas: Math.max(0, actual.no_leidas - 1),
        };
      }
    );
  } catch (error) {
    console.error("Error al marcar notificación:", error);
  }
};

  // Marcar todas como leídas
  const marcarTodasComoLeidas = async () => {
  try {
    const csrfResponse = await fetch("/api/csrf/", {
      credentials: "include",
    });

    if (!csrfResponse.ok) {
      throw new Error("No se pudo obtener el token CSRF.");
    }

    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1];

    if (!csrfToken) {
      throw new Error("No se encontró el token CSRF.");
    }

    const response = await fetch("/api/notificaciones/", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": decodeURIComponent(csrfToken),
      },
      body: JSON.stringify({ marcar_todas: true }),
    });

    if (!response.ok) {
      throw new Error("No se pudieron marcar las notificaciones.");
    }

    queryClient.setQueryData(
      ["notificaciones"],
      (actual: { notificaciones: any[]; no_leidas: number } | undefined) => {
        if (!actual) return actual;

        return {
          notificaciones: actual.notificaciones.map((n) => ({
            ...n,
            leida: true,
          })),
          no_leidas: 0,
        };
      }
    );
  } catch (error) {
    console.error("Error al marcar todas:", error);
  }
};

  // Eliminar todas las notificaciones
  const eliminarTodasLasNotificaciones = async () => {
  if (
    !window.confirm(
      "¿Estás seguro de que deseas eliminar todas tus notificaciones?"
    )
  ) {
    return;
  }

  try {
    const csrfResponse = await fetch("/api/csrf/", {
      credentials: "include",
    });

    if (!csrfResponse.ok) {
      throw new Error("No se pudo obtener el token CSRF.");
    }

    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1];

    if (!csrfToken) {
      throw new Error("No se encontró el token CSRF.");
    }

    const response = await fetch("/api/notificaciones/", {
      method: "DELETE",
      credentials: "include",
      headers: {
        "X-CSRFToken": decodeURIComponent(csrfToken),
      },
    });

    if (!response.ok) {
      throw new Error("No se pudieron eliminar las notificaciones.");
    }

    queryClient.setQueryData(["notificaciones"], {
      notificaciones: [],
      no_leidas: 0,
    });
  } catch (error) {
    console.error("Error al eliminar notificaciones:", error);
  }
};

  // Cerrar al hacer clic fuera del panel o presionar Escape
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setMostrarNotificaciones(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMostrarNotificaciones(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        role={role}
        page={page}
        setPage={navigate}
        logout={logout}
        open={menu}
        close={() => setMenu(false)}
        usuario={usuario}
      />

      {menu && (
        <div className="scrim" onClick={() => setMenu(false)} />
      )}

      <div className="workspace">
        <header className="topbar">
          <button
            className="menu-btn"
            onClick={() => setMenu(true)}
          >
            <Icon name="menu" />
          </button>

          <div className="crumb">
            <span>
              {role === "student"
                ? "Portal del estudiante"
                : "Administración"}
            </span>

            <Icon name="chevron" size={14} />

            <b>{page}</b>
          </div>

          <div className="top-actions">
            <div
              className="notification-container"
              ref={notificationRef}
            >
              <button
                className="icon-btn"
                onClick={() =>
                  setMostrarNotificaciones(!mostrarNotificaciones)
                }
                aria-label="Ver notificaciones"
              >
                <Icon name="bell" />

                {noLeidas > 0 && (
                  <span className="notification-count">
                    {noLeidas > 99 ? "99+" : noLeidas}
                  </span>
                )}
              </button>

              {mostrarNotificaciones && (
                <div className="notification-panel">

                  {/* Encabezado */}
                  <div className="notification-header">
                    <div className="notification-heading">
                      <div className="notification-heading-icon">
                        <Icon name="bell" size={19} />
                      </div>

                      <div>
                        <b>Notificaciones</b>
                        <span>{noLeidas} pendientes</span>
                      </div>
                    </div>

                    <button
                      className="notification-close"
                      onClick={() => setMostrarNotificaciones(false)}
                      aria-label="Cerrar notificaciones"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  {/* Contenido */}
                  {notificaciones.length === 0 ? (
                    <div className="notification-empty">
                      <Icon name="bell" size={25} />

                      <b>No tienes notificaciones</b>

                      <span>
                        Aquí aparecerán las novedades de tu cuenta.
                      </span>
                    </div>
                  ) : (
                    <div className="notification-list">
                      {notificaciones.map((n) => (
                        <div
                          key={n.id}
                          className={`notification-item ${
                            !n.leida ? "unread" : ""
                          }`}
                        >
                          <div className="notification-item-content">
                            <b>{n.titulo}</b>

                            <p>{n.mensaje}</p>

                            <small>
                              {new Date(
                                n.fecha_creacion
                              ).toLocaleString("es-EC")}
                            </small>
                          </div>

                          {!n.leida && (
                            <button
                              className="notification-read"
                              onClick={() => marcarComoLeida(n.id)}
                            >
                              Marcar como leída
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Acciones inferiores */}
                  {notificaciones.length > 0 && (
                    <div className="notification-footer">
                      {noLeidas > 0 && (
                        <button
                          className="notification-action"
                          onClick={marcarTodasComoLeidas}
                        >
                          <Icon name="check" size={18} />
                          <span>Marcar todas como leídas</span>
                        </button>
                      )}

                      <button
                        className="notification-delete"
                        onClick={eliminarTodasLasNotificaciones}
                      >
                        <Icon name="trash" size={18} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>

            <div className="avatar">
              {`${
                usuario?.nombre?.[0] ||
                usuario?.username?.[0] ||
                ""
              }${usuario?.apellido?.[0] || ""}`.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="content">
          {role === "student" ? (
            <StudentPage page={page} setPage={navigate} />
          ) : (
            <AdminPage page={page} setPage={navigate} />
          )}

          {pageHistory.length > 0 && (
            <div className="export-actions back-action">
              <Button
                variant="secondary"
                icon="arrow-left"
                onClick={goBack}
              >
                Volver
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function StatCard({ icon, label, value, note, tone = "" }: { icon: IconName; label: string; value: string; note?: string; tone?: string }) {
  return <div className={`card stat-card ${tone}`}><div className="stat-icon"><Icon name={icon}/></div><div><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div></div>;
}

const activity = [
  ["Plástico", "Hoy, 09:32", "+15", "Plástico"],
  ["Metal", "Ayer, 14:21", "+20", "Metal"],
  ["Papel y cartón", "8 sep, 10:15", "+10", "Papel y cartón"],
  ["Vidrio", "7 sep, 12:48", "+30", "Vidrio"],
  ["Orgánico", "6 sep, 09:05", "+5", "Orgánico"],
];


function StudentDashboard({ setPage }: { setPage: (p: string) => void }) {
  const [showQR, setShowQR] = useState(false);


const {
  data: perfil = null,
  isLoading: cargando,
  error: perfilError,
} = useQuery<PerfilEstudiante>({
  queryKey: ["perfil"],
  queryFn: async () => {
    const response = await fetch("/api/perfil/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar tus estadísticas.");
    }

    return response.json();
  },
});

const error = perfilError?.message ?? "";

const {
  data: historial = [],
  isLoading: cargandoActividad,
} = useQuery<Record<string, unknown>[]>({
  queryKey: ["historial"],
  queryFn: async () => {
    const response = await fetch("/api/historial/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar la actividad reciente.");
    }

    const data = await response.json();

    return Array.isArray(data)
      ? data
      : Array.isArray(data.results)
        ? data.results
        : [];
  },
});

const actividad = historial.slice(0, 3);

const {
  data: todosLosRetos = [],
  isLoading: cargandoRetos,
} = useQuery<RetoAPI[]>({
  queryKey: ["retos"],
  queryFn: async () => {
    const response = await fetch("/api/retos/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar los retos.");
    }

    return response.json();
  },
});

const retosActivos = todosLosRetos.filter(
  (reto) => reto.estado === "Activo" && !reto.completado
);

const {
  data: insignias = [],
  isLoading: cargandoInsignias,
} = useQuery<InsigniaAPI[]>({
  queryKey: ["mis-insignias"],
  queryFn: async () => {
    const response = await fetch("/api/mis-insignias/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar las insignias.");
    }

    return response.json();
  },
});

const {
  data: logros = null,
  isLoading: cargandoLogros,
} = useQuery<LogrosAPI>({
  queryKey: ["mis-logros"],
  queryFn: async () => {
    const response = await fetch("/api/mis-logros/", {
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar los logros.");
    }

    return response.json();
  },
});

const {
  data: ranking = [],
  isLoading: cargandoRanking,
} = useQuery<RankingAPI[]>({
  queryKey: ["ranking"],
  queryFn: async () => {
    const response = await fetch("/api/ranking/", {
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar el ranking.");
    }

    return response.json();
  },
});

const earnedEcuCoins = perfil?.ecucoins ?? 0;


  const puntos = logros?.puntos ?? perfil?.puntos ?? 0;

  const nivelActual = logros?.nivel_actual;
  const siguienteNivel = logros?.siguiente_nivel;

  const puntosNivelActual = nivelActual?.puntos_minimos ?? 0;
  const puntosSiguienteNivel = siguienteNivel?.puntos_minimos ?? puntosNivelActual;

  const progreso = siguienteNivel
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((puntos - puntosNivelActual) /
              (puntosSiguienteNivel - puntosNivelActual)) * 100
          )
        )
      )
    : 100;

  const miRanking = ranking.find(
  (estudiante) =>
    estudiante.usuario.toLowerCase() ===
    (perfil?.usuario ?? "").toLowerCase()
);

console.log("Usuario del perfil:", perfil?.usuario);
console.log("Usuarios del ranking:", ranking.map(e => e.usuario));
console.log("Mi posición:", miRanking?.posicion);

  return <>
    <PageHeader
      title={`Hola, ${perfil?.usuario ?? "estudiante"}`}
      subtitle="Tu impacto está creciendo. Esto es lo que has logrado hasta hoy."
      action={
        <Button icon="qr" onClick={() => setShowQR(true)}>
          QR Reciclaje
        </Button>
      }
    />

    {error && (
      <div className="profile-note" role="alert">
        {error}
      </div>
    )}

    <section className="progress-card">
      <div className="progress-top">
        <div>
          <span>Progreso de nivel</span>
          <h3>
            {puntos >= puntosSiguienteNivel
              ? "¡Nivel completado!"
              : "Progreso hacia el siguiente nivel"}
          </h3>
        </div>
        <b>
          {cargando ? "..." : puntos.toLocaleString("es-EC")} /{" "}
          {puntosSiguienteNivel.toLocaleString("es-EC")} pts
        </b>
      </div>

      <div className="progress">
        <i style={{ width: `${progreso}%` }} />
      </div>

      <div className="progress-foot">
  <span>
    {cargandoLogros
      ? "Cargando tus puntos..."
      : siguienteNivel
        ? `Faltan ${Math.max(0, puntosSiguienteNivel - puntos)} puntos para alcanzar ${siguienteNivel.nombre}.`
        : "¡Has alcanzado el nivel máximo!"}
  </span>
  <span>{cargandoLogros ? "..." : `${progreso}%`}</span>
</div>
    </section>

    <div className="stats-grid">
      <StatCard
        icon="star"
        label="Mis puntos"
        value={cargando ? "..." : puntos.toLocaleString("es-EC")}
        note="Total registrado"
      />
      <StatCard
        icon="award"
        label="Semestre"
        value={cargando ? "..." : String(perfil?.semestre ?? "—")}
        note="Información académica"
      />
      <StatCard
  icon="recycle"
  label="EcoCoins"
  value={
    cargando
      ? "..."
      : earnedEcuCoins.toLocaleString("es-EC")
  }
  note="Saldo disponible"
/>
      <StatCard
  icon="ranking"
  label="Posición en ranking"
  value={
    cargandoRanking
      ? "..."
      : miRanking
        ? `#${miRanking.posicion}`
        : "Sin posición"
  }
  note={
    miRanking
      ? `${miRanking.puntos} puntos acumulados`
      : "Aún no apareces en el ranking"
  }
/>
    </div>

    <div className="dashboard-grid">
      <section className="card panel activity-panel">
        <div className="panel-title">
          <div>
            <h3>Actividad reciente</h3>
            <p>Tus últimos registros verificados</p>
          </div>
          <button onClick={() => setPage("Historial")}>
            Ver historial <Icon name="chevron" size={15} />
          </button>
        </div>

        <div className="activity-list">
  {cargandoActividad ? (
    <p>Cargando actividad reciente...</p>
  ) : actividad.length === 0 ? (
    <p>
      Todavía no tienes reciclajes registrados.
    </p>
  ) : (
    actividad.map((registro) => {
      const fecha = registro.fecha_registro
        ? new Date(String(registro.fecha_registro)).toLocaleDateString("es-EC")
        : "—";

      return (
        <div className="activity-item" key={String(registro.id)}>
          <div>
            <strong>
              {String(registro.tipo_residuo_nombre ?? "Residuo")}
            </strong>
            <p>
              {String(registro.punto_reciclaje_nombre ?? "Punto no especificado")}
              {" · "}
              {fecha}
            </p>
          </div>

          <strong className="positive">
            +{String(registro.puntos_otorgados ?? 0)} pts
          </strong>
        </div>
      );
    })
  )}


</div>
      </section>

      <section className="card panel">
  <h3>Retos activos</h3>
  <p>Completa objetivos y suma puntos</p>

  {cargandoRetos ? (
    <p>Cargando retos...</p>
  ) : retosActivos.length === 0 ? (
    <p>No tienes retos activos disponibles en este momento.</p>
  ) : (
    retosActivos.slice(0, 2).map((reto) => (
      <Challenge
        key={reto.id}
        title={reto.titulo}
        meta={reto.descripcion}
        reward={`${reto.recompensa_puntos} puntos`}
        progress={reto.progreso ?? 0}
      />
    ))
  )}

  <Button
    variant="secondary"
    onClick={() => setPage("Retos")}
  >
    Ver todos los retos
  </Button>
</section>
    </div>

    <section className="card panel badges-preview">
  <h3>Insignias recientes</h3>

  {cargandoInsignias ? (
    <p>Cargando insignias...</p>
  ) : insignias.length === 0 ? (
    <p>
      Todavía no has obtenido insignias. ¡Sigue reciclando para conseguirlas!
    </p>
  ) : (
    insignias.slice(0, 4).map((insignia) => (
      <MiniBadge
        key={insignia.id}
        title={insignia.nombre}
        detail={insignia.descripcion || "Insignia obtenida"}
        icon="award"
      />
    ))
  )}
</section>

    {showQR && (
      <div
        className="modal-backdrop"
        onClick={() => setShowQR(false)}
      >
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-qr-title"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="modal-close"
            aria-label="Cerrar código QR"
            onClick={() => setShowQR(false)}
          >
            <Icon name="close" />
          </button>
          <Badge>Identificación activa</Badge>
          <h2 id="student-qr-title">
            {perfil?.usuario ?? "Estudiante"}
          </h2>
          <QRCode value={perfil?.codigo_qr ?? ""} />
          <p>Presenta tu identificación para registrar tu reciclaje.</p>
          <Button variant="secondary" onClick={() => setShowQR(false)}>
            Cerrar
          </Button>
        </div>
      </div>
    )}
  </>;
}


function Challenge({title,meta,reward,progress}:{title:string;meta:string;reward:string;progress:number}) {
  return <div className="challenge"><div className="challenge-row"><div><b>{title}</b><span>{meta}</span></div><Badge tone="amber">{reward}</Badge></div><div className="progress small"><i style={{width:`${progress}%`}}/></div></div>;
}
function MiniBadge({title,detail,icon,locked}:{title:string;detail:string;icon:IconName;locked?:boolean}) {
  return <div className={`mini-badge ${locked?"locked":""}`}><span><Icon name={icon}/></span><div><b>{title}</b><small>{detail}</small></div></div>;
}

function QRCode({ value }: { value: string }) {
  if (!value) {
    return <p>No se pudo cargar tu identificador QR.</p>;
  }

  return (
    <QRCodeSVG
      value={value}
      size={220}
      level="H"
      includeMargin
    />
  );
}


function HistoryPage() {
  const [filter, setFilter] = useState("Todos");
  const {
  data: rows = [],
  isLoading: loading,
  error: historyError,
} = useQuery<string[][]>({
  queryKey: ["historial"],
  queryFn: async () => {
    const response = await fetch("/api/historial/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar el historial.");
    }

    const data = await response.json();

    const registros = Array.isArray(data)
      ? data
      : Array.isArray(data.results)
        ? data.results
        : [];

    const obtener = (objeto: any, ...claves: string[]) => {
      for (const clave of claves) {
        const valor = objeto?.[clave];
        if (valor !== undefined && valor !== null) return valor;
      }
      return "";
    };

    const normalizados: string[][] = registros.map((registro: any) => {
      const fechaOriginal = obtener(
        registro,
        "fecha",
        "fecha_registro",
        "created_at"
      );

      const fecha = fechaOriginal
        ? new Date(fechaOriginal).toLocaleDateString("es-EC")
        : "—";

      const hora = fechaOriginal
        ? new Date(fechaOriginal).toLocaleTimeString("es-EC", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";

      const puntos = obtener(registro, "puntos", "puntos_obtenidos");
      const ecucoins = obtener(registro, "ecucoins", "ecucoins_obtenidos");

      const residuo = obtener(
        registro,
        "residuo_nombre",
        "material",
        "tipo_residuo",
        "residuo"
      );

      const punto = obtener(
        registro,
        "punto_reciclaje_nombre",
        "punto_nombre",
        "punto_reciclaje",
        "ubicacion"
      );

      const estado = obtener(registro, "estado", "estado_validacion");

      return [
        fecha,
        hora,
        String(residuo?.nombre ?? residuo ?? "No disponible"),
        String(punto?.nombre ?? punto ?? "No disponible"),
        String(puntos || 0),
        String(ecoins || 0),
        String(estado || "Completado"),
        fechaOriginal ? String(fechaOriginal).slice(0, 10) : "",
      ];
    });

    return normalizados;
  },
});

const error = historyError?.message ?? "";

  const FILTER_MATERIAL: Record<string, string[]> = {
    Plástico: ["plástic", "botella plástica"],
    Papel: ["papel", "cartón"],
    Vidrio: ["vidrio"],
    Metal: ["lata", "metal"],
    Orgánico: ["fruta", "orgánic"],
  };
  const [busqueda, setBusqueda] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [resultadoFiltro, setResultadoFiltro] = useState("Todos");
  const [pagina, setPagina] = useState(1);

  const REGISTROS_POR_PAGINA = 10;

  const normalizarTexto = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const filteredRows = rows.filter((row) => {
  const coincideMaterial =
  filter === "Todos" ||
  (FILTER_MATERIAL[filter] ?? []).some((material) =>
    normalizarTexto(row[2]).includes(normalizarTexto(material))


  );

  return coincideMaterial;



  const fecha = row[7];

  const coincideFechaDesde =
    !fechaDesde || (fecha && fecha >= fechaDesde);

  const coincideFechaHasta =
    !fechaHasta || (fecha && fecha <= fechaHasta);

  const coincideResultado =
    resultadoFiltro === "Todos" ||
    row[4].toLowerCase().includes(resultadoFiltro.toLowerCase());

  const texto = `${row[2]} ${row[3]} ${row[4]}`.toLowerCase();

  const coincideBusqueda = texto.includes(busqueda.toLowerCase());

  return (
    coincideMaterial &&
    coincideFechaDesde &&
    coincideFechaHasta &&
    coincideResultado &&
    coincideBusqueda
  );
});



  const totalPaginas = Math.max(
    1,
    Math.ceil(filteredRows.length / REGISTROS_POR_PAGINA)
  );

  const filasPagina = filteredRows.slice(
    (pagina - 1) * REGISTROS_POR_PAGINA,
    pagina * REGISTROS_POR_PAGINA
  );

  useEffect(() => {
    setPagina(1);
  }, [filter, busqueda, fechaDesde, fechaHasta, resultadoFiltro]);

  const exportarHistorial = () => {
  if (filteredRows.length === 0) {
    alert("No hay registros para exportar.");
    return;
  }

  const encabezados = [
    "Fecha",
    "Hora",
    "Residuo",
    "Punto",
    "Resultado",
    "Puntos",
    "EcuCoins",
  ];


  const escaparCSV = (valor: string) =>
    `"${String(valor).replace(/"/g, '""')}"`;

  const contenido = [
    encabezados.map(escaparCSV).join(";"),
    ...filteredRows.map((row) =>
      row.slice(0, 7).map(escaparCSV).join(";")
    ),
  ].join("\n");

  const archivo = new Blob(
    ["\uFEFF" + contenido],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = "historial_reciclajes.csv";
  enlace.click();

  URL.revokeObjectURL(url);
};


  return (
    <>
      <PageHeader
        title="Historial de reciclajes"
        subtitle="Consulta todos tus registros y puntos obtenidos."
        action={
          <Button
  variant="secondary"
  icon="download"
  onClick={exportarHistorial}
  disabled={filteredRows.length === 0}
>
  Exportar
</Button>
        }
      />

      <div className="filter-bar">
        {["Todos", "Plástico", "Papel", "Vidrio", "Metal", "Orgánico"].map(
          (f) => (
            <button
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
              key={f}
            >
              {f}
            </button>
          )
        )}
        <button
  className="date-filter"
  onClick={() => setMostrarFiltros(!mostrarFiltros)}
>
  <Icon name="filter" size={16} />
  Más filtros
</button>
      </div>

      <div className="history-extra-filters">
  <input
    type="text"
    placeholder="Buscar residuo, punto o resultado..."
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
  />
</div>

{mostrarFiltros && (
  <div className="history-extra-filters">
    <label>
      Desde:
      <input
        type="date"
        value={fechaDesde}
        onChange={(e) => setFechaDesde(e.target.value)}
      />
    </label>

    <label>
      Hasta:
      <input
        type="date"
        value={fechaHasta}
        onChange={(e) => setFechaHasta(e.target.value)}
      />
    </label>

    <label>
      Resultado:
      <select
        value={resultadoFiltro}
        onChange={(e) => setResultadoFiltro(e.target.value)}
      >
        <option value="Todos">Todos</option>
        <option value="Registrado">Registrado</option>
        <option value="Aprobado">Aprobado</option>
        <option value="Rechazado">Rechazado</option>
        <option value="Pendiente">Pendiente</option>
      </select>
    </label>

    <button
      onClick={() => {
        setFechaDesde("");
        setFechaHasta("");
        setResultadoFiltro("Todos");
        setBusqueda("");
        setFilter("Todos");
      }}
    >
      Limpiar filtros
    </button>
  </div>
)}

      <section className="card table-card">
        <table>
          <thead>
            <tr>
              {[
                "Fecha",
                "Hora",
                "Residuo",
                "Punto",
                "Resultado",
                "Puntos",
                "EcuCoins",
              ].map((columna) => (
                <th key={columna}>{columna}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filasPagina.map((row, index) => (
              <tr key={`${row[0]}-${row[1]}-${index}`}>
                {row.slice(0, 7).map((valor, i) => (
                  <td key={`${i}-${valor}`}>
                    {i === 4 ? (
                      <Badge>{valor}</Badge>
                    ) : i === 5 || i === 6 ? (
                      <strong className="positive">{valor}</strong>
                    ) : (
                      valor
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="empty-preview">
            <Icon name="history" size={42} />
            <h3>Cargando historial...</h3>
            <p>Estamos consultando tus registros.</p>
          </div>
        )}

        {!loading && error && (
          <div className="empty-preview">
            <Icon name="alert-circle" size={42} />
            <h3>No se pudo cargar el historial</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filteredRows.length === 0 && (
          <div className="empty-preview">
            <Icon name="history" size={42} />
            <h3>
              {rows.length === 0
                ? "Todavía no tienes reciclajes registrados"
                : `Sin registros de ${filter.toLowerCase()}`}
            </h3>
            <p>
              {rows.length === 0
                ? "Cuando se registren tus reciclajes, aparecerán aquí."
                : "No hay registros de este material en tu historial."}
            </p>
          </div>
        )}

        <div className="pagination">
  <span>
    Mostrando {filteredRows.length === 0 ? 0 : (pagina - 1) * REGISTROS_POR_PAGINA + 1}
    {" - "}
    {Math.min(pagina * REGISTROS_POR_PAGINA, filteredRows.length)}
    {" de "}
    {filteredRows.length} registros
  </span>

  <div>
    <button
      disabled={pagina === 1}
      onClick={() => setPagina(pagina - 1)}
    >
      ‹
    </button>

    <button className="active">
      {pagina} / {totalPaginas}
    </button>

    <button
      disabled={pagina >= totalPaginas}
      onClick={() => setPagina(pagina + 1)}
    >
      ›
    </button>
  </div>
</div>


      </section>
    </>
  );
}


// ── Ranking data ───────────────────────────────────────────────────────────────

type RankingType = "Estudiantes" | "Carreras" | "Facultades";
type RankingPeriod = "Todo el tiempo" | "Este mes" | "Esta semana";
type StudentRank = { name: string; faculty: string; career: string; points: number; level: number; isUser?: boolean; position?: number;};
function calcularNivel(puntos: number): number {
  return Math.floor(puntos / 300) + 1;
}
type CareerRank = { career: string; faculty: string; points: number; position?: number;};
type FacultyRank = { faculty: string; points: number; position?: number; };

const POINTS_PER_ECUCOIN = 5;
const WASTE_TYPES: [string, number][] = [
  ["Plástico", 15],
  ["Metal", 20],
  ["Papel y cartón", 10],
  ["Vidrio", 30],
  ["Orgánico", 5]
];

const FAC = {
  ci: "Ciencias e Ingenierías",
  soc: "Ciencias Sociales, Educación Comercial y Derecho",
  sal: "Salud y Servicios Sociales",
  edu: "Educación",
};
const FACULTY_NAMES = [FAC.ci, FAC.soc, FAC.sal, FAC.edu];
const USER_CAREER = "Ingeniería Ambiental";
const USER_FACULTY = FAC.ci;
const USER_POINTS = 1250;

const CAREER_RANKING: CareerRank[] = ([
  { career: "Ingeniería Ambiental", faculty: FAC.ci, points: 45820 },
  { career: "Medicina", faculty: FAC.sal, points: 42350 },
  { career: "Software", faculty: FAC.ci, points: 33150 },
  { career: "Comunicación", faculty: FAC.soc, points: 31890 },
  { career: "Biotecnología", faculty: FAC.ci, points: 28600 },
  { career: "Administración de Empresas", faculty: FAC.soc, points: 25800 },
  { career: "Enfermería", faculty: FAC.sal, points: 25000 },
  { career: "Pedagogía de la Actividad Física y Deporte", faculty: FAC.edu, points: 24600 },
  { career: "Educación", faculty: FAC.edu, points: 23800 },
  { career: "Nutrición y Dietética", faculty: FAC.sal, points: 23000 },
  { career: "Arquitectura Sostenible", faculty: FAC.ci, points: 22700 },
  { career: "Ingeniería Industrial", faculty: FAC.ci, points: 22200 },
  { career: "Psicología Clínica", faculty: FAC.sal, points: 21000 },
  { career: "Ingeniería Civil", faculty: FAC.ci, points: 20400 },
  { career: "Fisioterapia", faculty: FAC.sal, points: 19200 },
  { career: "Contabilidad y Auditoría", faculty: FAC.soc, points: 19000 },
  { career: "Multimedia y Producción Audiovisual", faculty: FAC.soc, points: 18700 },
  { career: "Economía", faculty: FAC.soc, points: 18000 },
  { career: "Alimentos", faculty: FAC.ci, points: 17800 },
  { career: "Educación Especial", faculty: FAC.edu, points: 17600 },
  { career: "Pedagogía de los Idiomas Nacionales y Extranjeros", faculty: FAC.edu, points: 17570 },
  { career: "Turismo", faculty: FAC.soc, points: 16900 },
  { career: "Pedagogía de la Lengua y Literatura", faculty: FAC.edu, points: 16200 },
  { career: "Agronegocios", faculty: FAC.soc, points: 15400 },
  { career: "Psicopedagogía", faculty: FAC.edu, points: 14800 },
] as CareerRank[]).sort((a, b) => b.points - a.points);

const FACULTY_RANKING: FacultyRank[] = FACULTY_NAMES
  .map(faculty => ({ faculty, points: CAREER_RANKING.filter(c => c.faculty === faculty).reduce((sum, c) => sum + c.points, 0) }))
  .sort((a, b) => b.points - a.points);

const OTHER_STUDENT_NAMES = ["Daniel Torres","Sara López","Mateo Díaz","Valentina Ruiz","Carlos Macías","Ana Martínez","Luis Hernández","María Zambrano","Pedro Ramírez","Camila Vera","Josué Cedeño","Kevin Alvarado","Andrea Barzola","Jordan Pinargote","Doménica Játiva","Bryan Mora","Nicole Espinoza","Gabriel Chávez","Melany Ponce","Anthony Suárez","Paola Villamar","Ariel Burgos","Génesis Quimí","Steven Tomalá","Dayana Lasso","Erick Bajaña","Michelle Arévalo","Fernando Cruz","Karla Montero","Joel Franco","Stephanie Rendón","Alex Ortiz","Thalía Sánchez","Christian Ayala","Scarlett Moreira","Dennis Yagual","Romina Peña","David Loor","Jessica Flores","Cristopher Vélez","Mishel Guerrero","Ronny Gómez","Lissette Aguirre","Óscar Reyes","Pamela Intriago","Washington Yánez","Noelia Palma","Byron Castro","Fabiola Herrera"];
const USER_RANK_INDEX = 11;
const STUDENT_RANKING: StudentRank[] = [
  ...OTHER_STUDENT_NAMES.slice(0, USER_RANK_INDEX),
  "Lucía Méndez",
  ...OTHER_STUDENT_NAMES.slice(USER_RANK_INDEX),
].map((name, index) => {
  if (name === "Lucía Méndez") return { name, faculty: USER_FACULTY, career: USER_CAREER, points: USER_POINTS, level: 5, isUser: true };
  const points = index < USER_RANK_INDEX ? 3100 - index * 140 : 1230 - (index - USER_RANK_INDEX - 1) * 17;
  const careerEntry = CAREER_RANKING[(index * 7 + 3) % CAREER_RANKING.length];
  return { name, faculty: careerEntry.faculty, career: careerEntry.career, points, level: Math.floor(points / 300) + 1 };
});
const USER_RANK = STUDENT_RANKING.findIndex(s => s.isUser) + 1;
const USER_CAREER_RANK = STUDENT_RANKING.filter(s => s.career === USER_CAREER).findIndex(s => s.isUser) + 1;
const USER_CAREER_POSITION = CAREER_RANKING.findIndex(c => c.career === USER_CAREER) + 1;
const USER_FACULTY_POSITION = FACULTY_RANKING.findIndex(f => f.faculty === USER_FACULTY) + 1;
const USER_FACULTY_POINTS = FACULTY_RANKING[USER_FACULTY_POSITION - 1].points;
const USER_CAREER_POINTS = CAREER_RANKING[USER_CAREER_POSITION - 1].points;

const PERIOD_FACTOR: Record<RankingPeriod, number> = {
  "Todo el tiempo": 1,
  "Este mes": 0.28,
  "Esta semana": 0.08,
};

const formatPoints = (points: number, period: RankingPeriod) =>
  Math.round(points * PERIOD_FACTOR[period]).toLocaleString("es-ES");


function StudentRankingTable({
  rows,
  period,
}: {
  rows: StudentRank[];
  period: RankingPeriod;
}) {
  return (
    <table>
      <thead>
        <tr>
          {["Posición", "Estudiante", "Facultad", "Carrera", "Puntos", "Nivel"].map(
            (x) => <th key={x}>{x}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((entry, index) => (
          <tr className={entry.isUser ? "current" : ""} key={entry.name}>
            <td>
              <span className={`rank rank-${entry.position ?? index + 1}`}>
                #{entry.position ?? index + 1}
              </span>
            </td>
            <td>
              <div className="person-cell">
                <div className="avatar small">
                  {entry.name.split(" ").map((s) => s[0]).join("").toUpperCase()}
                </div>
                <b>{entry.name}</b>
                {entry.isUser && <Badge>Tú</Badge>}
              </div>
            </td>
            <td>{entry.faculty}</td>
            <td>{entry.career}</td>
            <td>{formatPoints(entry.points, period)}</td>
            <td><Badge tone="blue">Nivel {entry.level}</Badge></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CareerRankingTable({
  rows,
  period,
}: {
  rows: CareerRank[];
  period: RankingPeriod;
}) {
  return (
    <table className="entity-ranking-table">
      <thead>
        <tr>
          {["Posición", "Carrera", "Facultad", "Puntos totales"].map(
            (x) => <th key={x}>{x}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((entry, index) => (
          <tr
            className={entry.career === USER_CAREER ? "current" : ""}
            key={entry.career}
          >
            <td>
              <span className={`rank rank-${entry.position ?? index + 1}`}>
                #{entry.position ?? index + 1}
              </span>
            </td>
            <td>
              <b>{entry.career}</b>
              {entry.career === USER_CAREER && <Badge>Tu carrera</Badge>}
            </td>
            <td>{entry.faculty}</td>
            <td><strong>{formatPoints(entry.points, period)}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FacultyRankingTable({
  rows,
  period,
}: {
  rows: FacultyRank[];
  period: RankingPeriod;
}) {
  return (
    <table className="entity-ranking-table faculty-ranking-table">
      <thead>
        <tr>
          {["Posición", "Facultad", "Puntos totales"].map(
            (x) => <th key={x}>{x}</th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((entry, index) => (
          <tr
            className={entry.faculty === USER_FACULTY ? "current" : ""}
            key={entry.faculty}
          >
            <td>
              <span className={`rank rank-${entry.position ?? index + 1}`}>
                #{entry.position ?? index + 1}
              </span>
            </td>
            <td>
              <b>{entry.faculty}</b>
              {entry.faculty === USER_FACULTY && <Badge>Tu facultad</Badge>}
            </td>
            <td><strong>{formatPoints(entry.points, period)}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}



function RankingPage() {
  const [rankingType, setRankingType] = useState<RankingType>("Estudiantes");
  const [period, setPeriod] = useState<RankingPeriod>("Todo el tiempo");
  const [showFull, setShowFull] = useState(false);
  const {
  data: rankingData = { students: [], currentUser: "" },
  isLoading: loading,
  error: rankingError,
} = useQuery<{
  students: StudentRank[];
  currentUser: string;
}>({
  queryFn: async () => {
  const [rankingResponse, sessionResponse] = await Promise.all([
    fetch(
      `/api/ranking/?periodo=${
        period === "Todo el tiempo"
          ? "todo"
          : period === "Este mes"
            ? "mes"
            : "semana"
      }`,
      { credentials: "include" }
    ),
    fetch("/api/sesion/", { credentials: "include" }),
  ]);

  if (!rankingResponse.ok) {
    throw new Error("No se pudo cargar el ranking.");
  }

  if (!sessionResponse.ok) {
    throw new Error("No se pudo comprobar el usuario actual.");
  }

  const registrosData = await rankingResponse.json();
  const sessionData = await sessionResponse.json();

  const registros = Array.isArray(registrosData)
    ? registrosData
    : Array.isArray(registrosData.results)
      ? registrosData.results
      : [];

  const usuarioActual = sessionData.autenticado
    ? String(sessionData.usuario?.username ?? "")
    : "";

  const estudiantes: StudentRank[] = registros.map(
    (
      registro: {
        posicion?: number;
        usuario?: string;
        facultad?: string;
        carrera?: string;
        puntos?: number;
      },
      index: number
    ) => {
      const name = registro.usuario ?? "Estudiante";
      const isUser =
        name.toLowerCase() === usuarioActual.toLowerCase();

      return {
        position: registro.posicion ?? index + 1,
        name,
        faculty: registro.facultad ?? "No disponible",
        career: registro.carrera ?? "No disponible",
        points: Number(registro.puntos ?? 0),
        level: 0,
        isUser,
      };
    }
  );

  estudiantes.sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  return {
    students: estudiantes,
    currentUser: usuarioActual,
  };
},
});

const students = rankingData.students;
const currentUser = rankingData.currentUser;
const error = rankingError?.message ?? "";



  const descriptions: Record<RankingType, string> = {
    Estudiantes: "Conoce a los estudiantes que lideran el cambio sostenible en el campus.",
    Carreras: "Conoce las carreras que más contribuyen al cambio sostenible en el campus.",
    Facultades: "Conoce las facultades que más contribuyen al cambio sostenible en el campus.",
  };

  const careerMap = new Map<string, { faculty: string; points: number }>();
  const facultyMap = new Map<string, number>();

  students.forEach((student) => {
    const career = careerMap.get(student.career);

    if (career) {
      career.points += student.points;
    } else {
      careerMap.set(student.career, {
        faculty: student.faculty,
        points: student.points,
      });
    }

    facultyMap.set(
      student.faculty,
      (facultyMap.get(student.faculty) ?? 0) + student.points
    );
  });

  const careerRows: CareerRank[] = Array.from(careerMap.entries())
    .map(([career, data]) => ({
      career,
      faculty: data.faculty,
      points: data.points,
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  const facultyRows: FacultyRank[] = Array.from(facultyMap.entries())
    .map(([faculty, points]) => ({ faculty, points }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  const myStudent = students.find((student) => student.isUser);
  const myCareer = myStudent?.career ?? "";
  const myFaculty = myStudent?.faculty ?? "";

  const myCareerRow = careerRows.find((entry) => entry.career === myCareer);
  const myFacultyRow = facultyRows.find((entry) => entry.faculty === myFaculty);

  const visibleStudents = students.slice(0, showFull ? students.length : 5);
  const visibleCareers = careerRows.slice(0, showFull ? careerRows.length : 5);

  return (
    <>
      <PageHeader
        title="Ranking universitario"
        subtitle={descriptions[rankingType]}
      />

      <div className={`ranking-hero ranking-hero-${rankingType.toLowerCase()}`}>
        {rankingType === "Estudiantes" && (
          <>
            <div>
              <span>Tu posición actual</span>
              <strong>{myStudent ? `#${myStudent.position}` : "—"}</strong>
              <p>Posición según los puntos acumulados disponibles</p>
            </div>
            <div>
              <b>{myStudent ? formatPoints(myStudent.points, period) : "—"}</b>
              <span>puntos acumulados</span>
            </div>
            <div>
              <b>{myCareerRow ? `#${myCareerRow.position}` : "—"}</b>
              <span>en tu carrera</span>
            </div>
          </>
        )}

        {rankingType === "Carreras" && (
          <>
            <div>
              <span>Tu carrera</span>
              <strong>{myCareer || "No disponible"}</strong>
              <p>La suma de los puntos de los estudiantes registrados</p>
            </div>
            <div>
              <b>{myCareerRow ? formatPoints(myCareerRow.points, period) : "—"}</b>
              <span>puntos totales</span>
            </div>
            <div>
              <b>{myCareerRow ? `Posición #${myCareerRow.position}` : "—"}</b>
              <span>según los datos disponibles</span>
            </div>
          </>
        )}

        {rankingType === "Facultades" && (
          <>
            <div>
              <span>Tu facultad</span>
              <strong>{myFaculty || "No disponible"}</strong>
              <p>El aporte conjunto de sus estudiantes registrados</p>
            </div>
            <div>
              <b>{myFacultyRow ? formatPoints(myFacultyRow.points, period) : "—"}</b>
              <span>puntos totales</span>
            </div>
            <div>
              <b>{myFacultyRow ? `Posición #${myFacultyRow.position}` : "—"}</b>
              <span>según los datos disponibles</span>
            </div>
          </>
        )}
      </div>

      <section className="ranking-controls" aria-label="Filtros del ranking">
        <div className="ranking-filter-group">
          <span>Tipo de ranking</span>
          <div>
            {(["Estudiantes", "Carreras", "Facultades"] as RankingType[]).map(
              (option) => (
                <Button
                  variant="secondary"
                  className={rankingType === option ? "active" : ""}
                  ariaPressed={rankingType === option}
                  onClick={() => {
                    setRankingType(option);
                    setShowFull(false);
                  }}
                  key={option}
                >
                  {option}
                </Button>
              )
            )}
          </div>
        </div>

        <div className="ranking-filter-group">
          <span>Período</span>
          <div>
            {(["Todo el tiempo", "Este mes", "Esta semana"] as RankingPeriod[]).map(
              (option) => (
                <Button
                  variant="secondary"
                  className={period === option ? "active" : ""}
                  ariaPressed={period === option}
                  onClick={() => setPeriod(option)}
                  key={option}
                >
                  {option}
                </Button>
              )
            )}
          </div>
        </div>
      </section>

      <section className="card table-card ranking-table-card">
        {loading ? (
          <div className="empty-preview">
            <h3>Cargando ranking...</h3>
            <p>Consultando los datos de EcoCampus AI.</p>
          </div>
        ) : error ? (
          <div className="empty-preview">
            <h3>No se pudo cargar el ranking</h3>
            <p>{error}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="empty-preview">
            <h3>Todavía no hay estudiantes en el ranking</h3>
            <p>Los registros aparecerán aquí cuando existan datos disponibles.</p>
          </div>
        ) : (
          <>
            {rankingType === "Estudiantes" && (
              <StudentRankingTable
                rows={visibleStudents}
                period={period}
              />
            )}
            {rankingType === "Carreras" && (
              <CareerRankingTable
                rows={visibleCareers}
                period={period}
              />
            )}
            {rankingType === "Facultades" && (
              <FacultyRankingTable
                rows={facultyRows}
                period={period}
              />
            )}
          </>
        )}

        {!loading && !error && students.length > 0 && rankingType !== "Facultades" && (
          <div className="pagination ranking-pagination">
            <Button
              variant={showFull ? "ghost" : "secondary"}
              icon={showFull ? "arrow-left" : "ranking"}
              onClick={() => setShowFull(!showFull)}
            >
              {showFull ? "Volver al resumen" : "Ver tabla de posición completa"}
            </Button>
          </div>
        )}
      </section>
    </>
  );
}


type BadgeItem = { id: string; title: string; desc: string; icon: IconName; progress: number };
const BADGES: BadgeItem[] = [
  { id: "primer", title: "Primer reciclaje", desc: "Realizaste tu primer reciclaje", icon: "leaf", progress: 100 },
  { id: "activo", title: "Reciclador activo", desc: "10 reciclajes completados", icon: "recycle", progress: 100 },
  { id: "separacion", title: "Separación correcta", desc: "10 residuos clasificados correctamente", icon: "check", progress: 100 },
  { id: "madrugador", title: "Eco madrugador", desc: "Recicla antes de las 08:00", icon: "pin", progress: 100 },
  { id: "primer-reto", title: "Primer reto", desc: "Completa tu primer reto ecológico", icon: "target", progress: 100 },
  { id: "experto", title: "Eco experto", desc: "Completa 50 reciclajes", icon: "award", progress: 96 },
  { id: "plastico", title: "Héroe del plástico", desc: "Recicla 25 residuos plásticos", icon: "star", progress: 72 },
  { id: "constancia", title: "Constancia verde", desc: "Recicla 7 días consecutivos", icon: "target", progress: 43 },
];
const EARNED_BADGES = BADGES.filter(b => b.progress === 100);
const MAX_EQUIPPED = 3;


function BadgesPage({ equipped }: { equipped: string[] }) {
  const {
  data: logrosData = {
    insignias_obtenidas: [],
    puntos: 0,
    nivel_actual: null,
  },
  isLoading: loadingLogros,
  error: logrosError,
} = useQuery<{
  insignias_obtenidas: unknown[];
  puntos: number;
  nivel_actual: { nombre: string } | null;
}>({
  queryKey: ["mis-logros"],
  queryFn: async () => {
    const response = await fetch("/api/mis-logros/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar tus insignias.");
    }

    return response.json();
  },
});

const error = logrosError?.message ?? "";
  const {
  data: badges = [],
  isLoading: loadingBadges,
} = useQuery<any[]>({
  queryKey: ["insignias-disponibles"],
  queryFn: async () => {
    const response = await fetch("/api/insignias-disponibles/", {
      credentials: "include",
    });


    if (!response.ok) {
      throw new Error("No se pudieron cargar las insignias disponibles.");
    }

    return response.json();
  },
});
  const loading = loadingLogros || loadingBadges;

  const obtenidas = logrosData.insignias_obtenidas;

  const insigniasObtenidas = obtenidas.flatMap((item) => {
    if (typeof item === "string" || typeof item === "number") {
      return [String(item).trim().toLowerCase()];
    }

    if (item && typeof item === "object") {
      const registro = item as Record<string, unknown>;

      return [
        registro.id,
        registro.insignia_id,
        registro.codigo,
        registro.nombre,
        registro.titulo,
        registro.title,
        registro.name,
      ]
        .filter(
          (valor): valor is string | number =>
            typeof valor === "string" || typeof valor === "number"
        )
        .map((valor) => String(valor).trim().toLowerCase());
    }

    return [];
  });

  const puntos = Number(logrosData.puntos ?? 0);
  const nivelActual = logrosData.nivel_actual;



  const totalObtenidas = badges.filter((badge) => {
  const nombre = String(
    badge.nombre ?? badge.name ?? badge.titulo ?? ""
  ).trim().toLowerCase();

  return insigniasObtenidas.some(
    (identificador) =>
      identificador === String(badge.id ?? "").toLowerCase() ||
      (nombre !== "" && identificador === nombre)
  );
}).length;

  const porcentaje = badges.length > 0
  ? Math.round((totalObtenidas / badges.length) * 100)
  : 0;

  return (
    <>
      <PageHeader
        title="Mis insignias"
        subtitle="Reconocimientos que reflejan tu impacto y constancia."
      />

      <div className="collection-summary">
        <div>
          <Icon name="award" size={28} />
          <span>
            <b>{loading ? "..." : `${totalObtenidas} de 12`}</b>{" "}
            insignias desbloqueadas
          </span>
        </div>
        <div className="progress">
          <i style={{ width: `${loading ? 0 : porcentaje}%` }} />
        </div>
        <span>{loading ? "Consultando tus logros..." : `${porcentaje}% de la colección`}</span>
      </div>

      {error && (
        <div className="empty-preview" role="alert">
          <h3>No se pudieron cargar tus insignias</h3>
          <p>{error}</p>
        </div>
      )}

      {!error && (
        <>
          <section className="card panel" style={{ marginBottom: 20 }}>
            <h3>Tu progreso ecológico</h3>
           <p>
  Nivel actual:{" "}
  <strong>
    {loading
      ? "Cargando..."
      : nivelActual?.nombre ?? "Sin nivel"}
  </strong>
  {" · "}
  Puntos:{" "}
  <strong>
    {loading ? "..." : puntos}
  </strong>
</p>
          </section>

          <div className="badge-grid">
            {badges.map((badge) => {
              const badgeId = String(badge.id ?? "").trim().toLowerCase();

const badgeNombre = String(
  badge.nombre ?? badge.title ?? badge.name ?? badge.titulo ?? ""
).trim().toLowerCase();

const earned = insigniasObtenidas.some(
  (identificador) =>
    identificador === badgeId ||
    (badgeNombre !== "" && identificador === badgeNombre)
);

              return (
                <div
                  className={`card badge-card ${earned ? "" : "locked"}`}
                  key={badge.id}
                >
                  <div className="badge-art">
  {badge.imageUrl ? (
    <img
      src={badge.imageUrl}
      alt={badge.name}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  ) : (
    <Icon name="award" size={35} />
  )}
</div>

                  <Badge tone={earned ? "green" : "gray"}>
                    {loading
                      ? "Consultando..."
                      : earned
                        ? "Desbloqueada"
                        : "No desbloqueada"}
                  </Badge>

                  <h3>{badge.title}</h3>
                  <p>{badge.descripcion}</p>

                  {earned ? (
                    <small>
                      Insignia obtenida
                      {equipped.includes(badge.id) ? " · Equipada" : ""}
                    </small>
                  ) : (
                    <small>
                      Cumple los objetivos de reciclaje para obtenerla.
                    </small>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}


function EquippedSlots({
  ids,
  badges,
  onSlot,
  highlight,
}: {
  ids: string[];
  badges: BadgeItem[];
  onSlot?: (id: string) => void;
  highlight?: boolean;
}) {
  return (
    <div className={`equipped-slots ${highlight ? "replace" : ""}`}>
      {Array.from({ length: MAX_EQUIPPED }, (_, i) => {
        const badge = badges.find(b => b.id === ids[i]);

        if (!badge) {
          return (
            <div className="equipped-slot empty" key={i}>
              <span><Icon name="award" size={22} /></span>
              <small>Espacio libre</small>
            </div>
          );
        }

        const content = (
          <>
            <span><Icon name={badge.icon} size={24} /></span>
            <b>{badge.title}</b>
          </>
        );

        return onSlot ? (
          <button
            type="button"
            className="equipped-slot"
            key={badge.id}
            onClick={() => onSlot(badge.id)}
          >
            {content}
          </button>
        ) : (
          <div className="equipped-slot" key={badge.id}>
            {content}
          </div>
        );
      })}
    </div>
  );
}


function EditBadgesModal({
  equipped,
  badges,
  onSave,
  onClose,
}: {
  equipped: string[];
  badges: BadgeItem[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(equipped);
  const [pending, setPending] = useState<string | null>(null);

  const pendingBadge = badges.find(b => b.id === pending);

  const pick = (id: string) => {
    if (draft.includes(id)) {
      setDraft(draft.filter(x => x !== id));
      setPending(null);
      return;
    }

    if (draft.length < MAX_EQUIPPED) {
      setDraft([...draft, id]);
      setPending(null);
      return;
    }

    setPending(id);
  };

  const replace = (id: string) => {
    if (!pending) {
      return setDraft(draft.filter(x => x !== id));
    }

    setDraft(draft.map(x => x === id ? pending : x));
    setPending(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal edit-badges-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-badges-title"
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" aria-label="Cerrar" onClick={onClose}>
          <Icon name="close" />
        </button>

        <Badge>{draft.length} de {MAX_EQUIPPED} equipadas</Badge>

        <h2 id="edit-badges-title">Editar insignias</h2>

        <p>
          {pendingBadge
            ? `Toca la insignia equipada que quieres reemplazar por "${pendingBadge.title}".`
            : "Las insignias equipadas se muestran públicamente en tu perfil. Puedes equipar hasta 3."}
        </p>

        <EquippedSlots
          ids={draft}
          badges={badges}
          onSlot={replace}
          highlight={!!pending}
        />

        <div className="owned-badges">
          {badges.map(b => {
            const on = draft.includes(b.id);

            return (
              <button
                type="button"
                key={b.id}
                className={`owned-badge ${on ? "on" : ""} ${pending === b.id ? "pending" : ""}`}
                onClick={() => pick(b.id)}
                aria-pressed={on}
              >
                <span><Icon name={b.icon} size={20} /></span>

                <div>
                  <b>{b.title}</b>
                  <small>
                    {on
                      ? "Equipada · toca para quitar"
                      : pending === b.id
                        ? "Elige a quién reemplaza"
                        : "Toca para equipar"}
                  </small>
                </div>

                {on && <Icon name="check" size={16} />}
              </button>
            );
          })}
        </div>

        <div className="flow-actions">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            onSave(draft);
            onClose();
          }}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}


// [title, description, progress_text, reward, deadline, progress_pct, featured, icon]
type ChallengeItem = [string, string, string, string, string, number, boolean, IconName];
const challengesRaw: ChallengeItem[] = [
  ["Semana sin plástico",   "Recicla 10 residuos plásticos.",               "6 / 10",  "+100 puntos",        "15 sep 2026", 60, false, "leaf"],
  ["Eco constancia",        "Recicla durante 5 días consecutivos.",          "3 / 5",   "Insignia + 150 pts", "18 sep 2026", 60, true,  "target"],
  ["Explorador circular",   "Utiliza 3 puntos de reciclaje diferentes.",     "2 / 3",   "+75 puntos",         "30 sep 2026", 67, false, "leaf"],
  ["Clasificador experto",  "Clasifica correctamente 20 residuos.",          "14 / 20", "+120 puntos",        "30 sep 2026", 70, false, "target"],
];

// Featured first (sorted by progress desc), then normal (sorted by progress desc)

type RetoAPI = {
  id: number;
  titulo: string;
  descripcion: string;
  recompensa_puntos: number;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_completado: string | null;
  estado: "Activo" | "Completado" | "Próximo" | "Finalizado";
  destacado: boolean;
  progreso: number;
  completado: boolean;
};

interface InsigniaAPI {
  id: number;
  nombre: string;
  descripcion: string;
  imagen: string | null;
  fecha_obtencion: string;
  puntos_requeridos: number;
}

interface LogrosAPI {
  puntos: number;
  ecucoins: number;
  nivel_actual: {
    nombre: string;
    descripcion: string;
    puntos_minimos: number;
    imagen: string | null;
  } | null;
  siguiente_nivel: {
    nombre: string;
    descripcion: string;
    puntos_minimos: number;
    imagen: string | null;
  } | null;
  insignias_obtenidas: {
    id: number;
    nombre: string;
    descripcion: string;
    fecha_obtencion: string;
  }[];
}

interface RankingAPI {
  posicion: number;
  usuario: string;
  facultad: string | null;
  carrera: string | null;
  puntos: number;
  ecucoins: number;
}

interface HistorialAPI {
  id: number;
  tipo_residuo_nombre: string;
  punto_reciclaje_nombre: string;
  cantidad: number;
  puntos_otorgados: number;
  fecha_registro: string;
}

function ChallengesPage() {
  const [tab, setTab] = useState<
    "Activos" | "Completados" | "Próximos"
  >("Activos");


const queryClient = useQueryClient();

const {
  data: retos = [],
  isLoading: cargando,
  error: errorConsulta,
} = useQuery<RetoAPI, Error>({
  queryKey: ["retos"],
  queryFn: async () => {
    const respuesta = await fetch("/api/retos/", {
      credentials: "same-origin",
    });

    if (!respuesta.ok) {
      throw new Error(
        respuesta.status === 401 || respuesta.status === 403
          ? "Inicia sesión para consultar tus retos."
          : "No se pudieron cargar los retos."
      );
    }

    return respuesta.json();
  },
});

const error = errorConsulta?.message ?? "";

  const [procesando, setProcesando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [retoSeleccionado, setRetoSeleccionado] = useState<RetoAPI | null>(null);


  const participarEnReto = async (retoId: number) => {
  try {
    setProcesando(retoId);
    setMensaje("");

    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1];

    const respuesta = await fetch(
      `/api/retos/${retoId}/participar/`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRFToken": csrfToken || "",
        },
      }
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      throw new Error(detalle || "No se pudo realizar la inscripción.");
    }

    // Actualizar los retos con la información real de Django.
    const actualizacion = await fetch("/api/retos/", {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    if (!actualizacion.ok) {
      throw new Error("Te inscribiste, pero no se pudo actualizar el progreso.");
    }

    const datos: RetoAPI[] = await actualizacion.json();

queryClient.setQueryData<RetoAPI[]>(["retos"], datos);

setMensaje("Te has inscrito correctamente en el reto.");
  } catch (e) {
    setMensaje(
      e instanceof Error
        ? e.message
        : "Ocurrió un error al inscribirte."
    );
  } finally {
    setProcesando(null);
  }
};

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return "Sin fecha";

    return new Date(fecha).toLocaleDateString("es-EC", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const convertirReto = (reto: RetoAPI): ChallengeItem => {
    const progreso = reto.completado
      ? 100
      : Math.min(100, Math.max(0, reto.progreso));

    const icon: IconName =
      /clasific|residuo|recicl/i.test(
        `${reto.titulo} ${reto.descripcion}`
      )
        ? "target"
        : "leaf";

    return [
      reto.titulo,
      reto.descripcion,
      `${progreso}% completado`,
      `+${reto.recompensa_puntos} puntos`,
      formatearFecha(
        reto.completado
          ? reto.fecha_completado
          : reto.fecha_fin
      ),
      progreso,
      reto.destacado,
      icon,
    ];
  };

  const activos = retos
    .filter((reto) => reto.estado === "Activo" && !reto.completado)
    .sort((a, b) => Number(b.destacado) - Number(a.destacado))
    .map((reto) => ({
  reto,
  tarjeta: convertirReto(reto),
}));

  const completados = retos
    .filter((reto) => reto.completado)
    .map((reto) => ({
  reto,
  tarjeta: convertirReto(reto),
}));

  const proximos = retos
    .filter((reto) => reto.estado === "Próximo")
    .map((reto) => ({
  reto,
  tarjeta: convertirReto(reto),
}));

  const lista =
    tab === "Activos"
      ? activos
      : tab === "Completados"
        ? completados
        : proximos;

  const label =
    tab === "Activos"
      ? "Activo"
      : tab === "Completados"
        ? "Completado"
        : "Próximo";

  return (
    <>
      <PageHeader
        title="Retos ecológicos"
        subtitle="Completa retos, gana recompensas y aumenta tu impacto."
      />
       {mensaje && (
      <div className="notice">
        {mensaje}
      </div>
    )}

      <div className="tabs">
        <button
          className={tab === "Activos" ? "active" : ""}
          onClick={() => setTab("Activos")}
        >
          Activos <Badge>{activos.length}</Badge>
        </button>

        <button
          className={tab === "Completados" ? "active" : ""}
          onClick={() => setTab("Completados")}
        >
          Completados
        </button>

        <button
          className={tab === "Próximos" ? "active" : ""}
          onClick={() => setTab("Próximos")}
        >
          Próximos
        </button>
      </div>

      {cargando && (
        <section className="card table-card">
          <div className="empty-preview">
            <p>Cargando retos ecológicos...</p>
          </div>
        </section>
      )}

      {!cargando && error && (
        <section className="card table-card">
          <div className="empty-preview">
            <Icon name="target" size={42} />
            <h3>No se pudieron cargar los retos</h3>
            <p>{error}</p>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          </div>
        </section>
      )}

      {!cargando && !error && lista.length === 0 && (
        <section className="card table-card">
          <div className="empty-preview">
            <Icon name="target" size={42} />
            <h3>
              {tab === "Activos"
                ? "No hay retos activos"
                : tab === "Completados"
                  ? "Aún no has completado retos"
                  : "No hay retos próximos"}
            </h3>
            <p>
              Los retos que correspondan a esta categoría
              aparecerán aquí cuando estén disponibles.
            </p>
          </div>
        </section>
      )}

      {!cargando && !error && (
        <div className="challenge-grid">
          {lista.map(({ reto, tarjeta: c }) => (
            <div
              className="card challenge-card"
              key={c[0]}
            >
              <div className="challenge-icon">
                <Icon name={c[7]} />
              </div>

              <div className="challenge-body">
                <div>
                  <Badge
                    tone={
                      tab === "Activos" && c[6]
                        ? "amber"
                        : "green"
                    }
                  >
                    {tab === "Activos" && c[6]
                      ? "Destacado"
                      : label}
                  </Badge>

                  <small>
                    {tab === "Completados"
                      ? "Completado el"
                      : "Hasta"}{" "}
                    {c[4]}
                  </small>
                </div>

                <h3>{c[0]}</h3>
                <p>{c[1]}</p>

                <div className="challenge-progress-label">
                  <b>{c[2]}</b>
                  <span>{c[5]}%</span>
                </div>

                <div className="progress small">
                  <i style={{ width: `${c[5]}%` }} />
                </div>

                <div className="challenge-reward">
                  <span>Recompensa</span>
                  <b>{c[3]}</b>
                </div>

                {reto.modalidad === "GRUPAL" && !reto.participo ? (
  <Button
    variant="primary"
    disabled={procesando === reto.id}
    onClick={() => participarEnReto(reto.id)}
  >
    {procesando === reto.id ? "Inscribiendo..." : "Participar en reto"}
  </Button>
) : (
  <Button
    variant="secondary"
    onClick={() => setRetoSeleccionado(reto)}
  >
    Ver reto
  </Button>
)}
              </div>
            </div>
          ))}
        </div>
      )}
            {retoSeleccionado && (
        <div className="reto-modal-overlay">
          <div className="reto-modal">
            <button
              className="reto-modal-close"
              onClick={() => setRetoSeleccionado(null)}
            >
              ×
            </button>

            <Badge tone="green">
              {retoSeleccionado.modalidad === "GRUPAL"
                ? `Grupal por ${retoSeleccionado.alcance?.toLowerCase()}`
                : "Individual"}
            </Badge>

            <h2>{retoSeleccionado.titulo}</h2>
            <p>{retoSeleccionado.descripcion}</p>

            <div className="reto-modal-info">
              <div>
                <span>Meta</span>
                <strong>{retoSeleccionado.meta}</strong>
              </div>

              <div>
                <span>Progreso</span>
                <strong>
                  {retoSeleccionado.completado
                    ? 100
                    : Math.min(100, retoSeleccionado.progreso)}%
                </strong>
              </div>

              <div>
                <span>Recompensa</span>
                <strong>
                  +{retoSeleccionado.recompensa_puntos} puntos
                </strong>
              </div>

              <div>
                <span>Objetivo</span>
                <strong>{retoSeleccionado.tipo_objetivo}</strong>
              </div>

              <div>
                <span>Fecha de inicio</span>
                <strong>
                  {formatearFecha(retoSeleccionado.fecha_inicio)}
                </strong>
              </div>

              <div>
                <span>Fecha de finalización</span>
                <strong>
                  {formatearFecha(retoSeleccionado.fecha_fin)}
                </strong>
              </div>
            </div>

            <div className="reto-modal-progress">
              <div className="progress small">
                <i
                  style={{
                    width: `${
                      retoSeleccionado.completado
                        ? 100
                        : Math.min(100, retoSeleccionado.progreso)
                    }%`,
                  }}
                />
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => setRetoSeleccionado(null)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}

    </>
  );
}


type RecyclingPoint = {
  id: number;
  nombre: string;
  ubicacion: string;
  descripcion: string;
  residuos_aceptados: string;
  activo: boolean;
  latitud: number | string | null;
  longitud: number | string | null;
};

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}



function CampusMap({ admin = false }: { admin?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState("Todos");
  const {
  data: locations = [],
  isLoading: loading,
  error: pointsError,
} = useQuery<RecyclingPoint[], Error>({
  queryKey: admin ? ["admin", "puntos-reciclaje"] : ["puntos-reciclaje"],
  queryFn: async () => {
    const response = await fetch(
      admin
        ? "/api/admin/puntos-reciclaje/"
        : "/api/puntos-reciclaje/",
      {
        credentials: "same-origin",
      }
    );

    if (!response.ok) {
      throw new Error(
        response.status === 401 || response.status === 403
          ? "Inicia sesión para consultar los puntos de reciclaje."
          : "No se pudieron cargar los puntos de reciclaje."
      );
    }

    return response.json();
  },
});

const error = pointsError?.message ?? "";

    const [addingPoint, setAddingPoint] = useState(false);
  const [newPointCoords, setNewPointCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [newPointName, setNewPointName] = useState("");
  const [newPointLocation, setNewPointLocation] = useState("");
  const [newPointQr, setNewPointQr] = useState("");
  const [savingPoint, setSavingPoint] = useState(false);


  const selectedPoint =
  locations.find((point) => point.id === selected) ?? locations[0] ?? null;

  const filteredLocations =
  filter === "Todos"
    ? locations
    : locations.filter(
        (point) =>
          (point.ubicacion || "").toLowerCase() === filter.toLowerCase()
      );

  return (
    <>




     <div className="map-filters">
  {["Todos", "Bloque", "Biblioteca", "Cafetería", "Laboratorios", "Otro"].map(
    (option) => (
      <button
        key={option}
        className={filter === option ? "active" : ""}
        onClick={() => setFilter(option)}
      >
        {option}
      </button>
    )
  )}
</div>

      {loading && (
        <section className="card table-card">
          <div className="empty-preview">
            <p>Cargando puntos de reciclaje...</p>
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="card table-card">
          <div className="empty-preview">
            <Icon name="pin" size={42} />
            <h3>No se pudieron cargar los puntos</h3>
            <p>{error}</p>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          </div>
        </section>
      )}

      {!loading && !error && locations.length === 0 && !admin && (
        <section className="card table-card">
          <div className="empty-preview">
            <Icon name="pin" size={42} />
            <h3>No hay puntos registrados</h3>
            <p>
              Cuando se registren puntos de reciclaje en el sistema,
              aparecerán aquí.
            </p>
          </div>
        </section>
      )}

      {!loading && !error && (locations.length > 0 || admin) && (
          <>
        <div className="map-layout">
<div className="campus-map">

  <MapContainer
  center={[-2.1490621784763038, -79.60285927370869]}
  zoom={18}
  minZoom={17}
  maxZoom={20}
  maxBounds={[
    [-2.1520, -79.6060],
    [-2.1460, -79.5990],
  ]}
  maxBoundsViscosity={1.0}
  scrollWheelZoom={true}
  style={{
    height: "560px",
    width: "100%",
    borderRadius: "16px",
  }}
>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />

    {admin && addingPoint && (
  <MapClickHandler
    onMapClick={(lat, lng) => {
      setNewPointCoords({ lat, lng });
    }}
  />
)}

    {filteredLocations
  .filter(
    (point) =>
      point.latitud !== null &&
      point.longitud !== null &&
      Number.isFinite(Number(point.latitud)) &&
      Number.isFinite(Number(point.longitud))
  )
  .map((point) => (
    <Marker
      key={point.id}
      position={[
        Number(point.latitud),
        Number(point.longitud),
      ]}
      icon={recyclingIcon}
      eventHandlers={{
        click: () => setSelected(point.id),
      }}
    >
      <Popup>
  <div style={{ minWidth: "190px" }}>
    <strong>{point.nombre}</strong>

    <p style={{ margin: "6px 0" }}>
      <strong>Tipo:</strong> {point.ubicacion}
    </p>

    <p style={{ margin: "6px 0" }}>
      <strong>Descripción:</strong>{" "}
      {point.descripcion || "Sin descripción disponible"}
    </p>

    <p style={{ margin: "6px 0" }}>
      <strong>Residuos aceptados:</strong>{" "}
      {point.residuos_aceptados || "No especificados"}
    </p>

    <p style={{ margin: "6px 0" }}>
      <strong>Estado:</strong>{" "}
      {point.activo ? "Activo" : "Inactivo"}
    </p>
  </div>
</Popup>
    </Marker>
  ))}

    {admin && addingPoint && newPointCoords && (
  <Marker
    position={[
      newPointCoords.lat,
      newPointCoords.lng,
    ]}
    icon={recyclingIcon}
  >
    <Popup>
      Ubicación seleccionada para el nuevo punto
    </Popup>
  </Marker>
)}
  </MapContainer>

  <div className="map-legend">
    <b>Campus UNEMI</b>
    <span>
      <i className="low" />
      {locations.length} puntos registrados
    </span>
  </div>
</div>
          <aside className="card location-detail">
            {selectedPoint ? (
              <>
                <div className="detail-cover">
                  <Icon name="pin" size={28} />
                  <Badge>
                    {selectedPoint.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <span className="eyebrow">{selectedPoint.nombre}</span>

                <h2>Punto de reciclaje — {selectedPoint.nombre}</h2>

                <p>{selectedPoint.ubicacion}</p>

                <dl>
                  <div>
                    <dt>Estado</dt>
                    <dd>
                      <Badge>
                        {selectedPoint.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </dd>
                  </div>

                  <div>
                    <dt>Ubicación</dt>
                    <dd>{selectedPoint.ubicacion}</dd>
                  </div>

                  {admin && (
                    <div>
                      <dt>Identificador</dt>
                      <dd>{selectedPoint.id}</dd>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <div className="empty-preview">
                <p>No hay puntos en esta categoría.</p>
              </div>
            )}
          </aside>
        </div>
          {admin && addingPoint && newPointCoords && (
  <section className="card" style={{ padding: "24px", marginTop: "20px" }}>
    <h3>Registrar nuevo punto de reciclaje</h3>

    <p>
      Coordenadas seleccionadas:
      {newPointCoords.lat.toFixed(7)},
      {newPointCoords.lng.toFixed(7)}
    </p>

    <div style={{ display: "grid", gap: "12px" }}>
      <label>
        Nombre del punto
        <input
          type="text"
          value={newPointName}
          onChange={(e) => setNewPointName(e.target.value)}
          placeholder="Ej. Punto de reciclaje Biblioteca"
        />
      </label>

      <label>
        Ubicación o descripción
        <input
          type="text"
          value={newPointLocation}
          onChange={(e) => setNewPointLocation(e.target.value)}
          placeholder="Ej. Frente a la biblioteca"
        />
      </label>

      <label>
        Código QR
        <input
          type="text"
          value={newPointQr}
          onChange={(e) => setNewPointQr(e.target.value)}
          placeholder="Código identificador del punto"
        />
      </label>
    </div>
    </section>
)}
        </>
      )}
    </>
  );
}


function ProfilePage({equipped,setEquipped}:{equipped:string[];setEquipped:(ids:string[])=>void}){
 const [editingBadges,setEditingBadges]=useState(false);
 const [description,setDescription]=useState("Estudiante de Ingeniería Ambiental apasionada por la economía circular y los campus sostenibles.");
 const [notice,setNotice]=useState("");
 const [editing,setEditing]=useState(false);
 const [draftDescription,setDraftDescription]=useState(description);
 const field=(label:string,value:string)=><label key={label}>{label}<div className="input-wrap"><input disabled value={value} readOnly/><Icon name="lock" size={16}/></div></label>;

  const {
  data: perfil = null,
  isLoading: cargandoPerfil,
  error: errorPerfil,
} = useQuery<PerfilEstudiante>({
  queryKey: ["perfil"],
  queryFn: async () => {
    const response = await fetch("/api/perfil/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar el perfil.");
    }

    return response.json();
  },
});

  const {
  data: logrosData,
  isLoading: cargandoInsignias,
} = useQuery<{
  insignias_obtenidas: {
  id: number;
  nombre: string;
  descripcion: string;
  fecha_obtencion: string;
  equipada: boolean;
}[];
}>({
  queryKey: ["mis-logros"],
  queryFn: async () => {
    const response = await fetch("/api/mis-logros/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar las insignias.");
    }

    return response.json();
  },
});

const insigniasDisponibles: BadgeItem[] = (
  logrosData?.insignias_obtenidas ?? []
).map((insignia) => ({
  id: String(insignia.id),
  title: insignia.nombre,
  desc: insignia.descripcion,
  icon: "award",
  progress: 100,
}));

useEffect(() => {
  if (!logrosData) return;

  const insigniasEquipadas = logrosData.insignias_obtenidas
    .filter((insignia) => insignia.equipada)
    .map((insignia) => String(insignia.id));

  setEquipped(insigniasEquipadas);
}, [logrosData, setEquipped]);


const guardarInsignias = async (ids: string[]) => {
  try {
    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1];

    if (!csrfToken) {
      throw new Error("No se encontró el token CSRF.");
    }

    const response = await fetch("/api/mis-logros/", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": decodeURIComponent(csrfToken),
      },
      body: JSON.stringify({
        insignias_ids: ids.map(Number),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "No se pudieron guardar las insignias.");
    }

    setEquipped(ids);
    setNotice("Insignias destacadas actualizadas.");
    setEditingBadges(false);
  } catch (error) {
    setNotice(
      error instanceof Error
        ? error.message
        : "Ocurrió un error al guardar las insignias."
    );
  }
};


const {
  data: ranking = [],
  isLoading: cargandoRanking,
} = useQuery<RankingAPI[]>({
  queryKey: ["ranking"],
  queryFn: async () => {
    const response = await fetch("/api/ranking/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar el ranking.");
    }

    return response.json();
  },
});

const miPosicion =
  ranking.find(
    (item) =>
      item.usuario.toLowerCase() ===
      (perfil?.usuario ?? "").toLowerCase()
  )?.posicion ?? null;


 return <><PageHeader title="Mi perfil" subtitle="Consulta tu información institucional y tu impacto personal." action={<div className="flex flex-wrap items-center gap-2"><Button variant="secondary" className="profile-edit" onClick={()=>{setDraftDescription(description);setEditing(true);setNotice("")}}>Editar perfil</Button><Button variant="secondary" className="profile-edit" onClick={()=>setEditingBadges(true)}>Editar insignias</Button></div>}/><div className="profile-layout"><section className="card profile-main"><div className="profile-cover"/><div className="profile-identity"><div className="avatar xl">
  {perfil?.usuario
    ? perfil.usuario
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(parte => parte[0])
        .join("")
        .toUpperCase()
    : "..."}
</div><div><h2>{cargandoPerfil ? "Cargando..." : perfil?.usuario ?? "Estudiante"}</h2><p>Estudiante · Cuenta verificada</p></div></div>

<div className="profile-fields">
  {field("Nombre completo", perfil?.usuario ?? "Cargando...")}
  {field("Identificación", perfil?.identificacion ?? "Cargando...")}
  {field("Correo institucional", perfil?.correo ?? "Cargando...")}
  {field("Rol", "Estudiante")}
  {field("Facultad", perfil?.facultad ?? "No disponible")}
  {field("Carrera", perfil?.carrera ?? "No disponible")}
  {field(
    "Curso / paralelo",
    perfil ? `${perfil.semestre}.º semestre` : "Cargando..."
  )}

 <label className="profile-description">Descripción<textarea disabled={!editing} value={editing?draftDescription:description} maxLength={160} rows={3} placeholder="Cuéntales a otros estudiantes sobre ti..." onChange={e=>{setDraftDescription(e.target.value);setNotice("")}}/><div className="description-foot"><small>{(editing?draftDescription:description).length} / 160 caracteres</small>{editing&&<div className="flex items-center gap-2"><Button variant="secondary" onClick={()=>setEditing(false)}>Cancelar</Button><Button onClick={()=>{setDescription(draftDescription);setEditing(false);setNotice("Descripción actualizada.")}}>Guardar descripción</Button></div>}</div></label></div>
 {notice&&<div className="profile-note"><div className="safe-note" role="status"><Icon name="check" size={16}/>{notice}</div></div>}
 <div className="profile-note"><div className="safe-note"><Icon name="lock" size={16}/>Tu información universitaria es administrada por la institución y no puede modificarse desde esta plataforma.</div></div>
 <div className="profile-badges"><div className="profile-badges-head"><div><h3>Insignias destacadas</h3><p>Reconocimientos obtenidos por tu actividad</p></div></div><EquippedSlots
  ids={equipped}
  badges={insigniasDisponibles}
/></div></section><aside>
<div className="profile-stats">
  <StatCard
    icon="star"
    label="Puntos"
    value={perfil ? perfil.puntos.toLocaleString("es-EC") : "..."}
  />
  <StatCard
    icon="recycle"
    label="EcoCoins"
    value={perfil ? perfil.ecucoins.toLocaleString("es-EC") : "..."}
  />
  <StatCard
    icon="award"
    label="Semestre"
    value={perfil ? String(perfil.semestre) : "..."}
  />
  <StatCard
  icon="ranking"
  label="Posición"
  value={
    cargandoRanking
      ? "..."
      : miPosicion !== null
        ? `#${miPosicion}`
        : "Sin posición"
  }
/>
</div>
</aside>
 </div>{editingBadges && (
  <EditBadgesModal
    equipped={equipped}
    badges={insigniasDisponibles}
    onSave={guardarInsignias}
    onClose={() => setEditingBadges(false)}
  />
)}</>;
}


function PointsPage({ setPage }: { setPage: (p: string) => void }) {
  const {
  data: perfil = null,
  isLoading: cargando,
  error: perfilError,
} = useQuery<PerfilEstudiante>({
  queryKey: ["perfil"],
  queryFn: async () => {
    const response = await fetch("/api/perfil/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar tu saldo de puntos.");
    }

    return response.json();
  },
});

const {
  data: logros = null,
  isLoading: cargandoLogros,
} = useQuery<LogrosAPI>({
  queryKey: ["mis-logros"],
  queryFn: async () => {
    const response = await fetch("/api/mis-logros/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar los niveles.");
    }

    return response.json();
  },
});

const {
  data: movimientos = [],
  isLoading: cargandoMovimientos,
} = useQuery<HistorialAPI[]>({
  queryKey: ["historial"],
  queryFn: async () => {
    const response = await fetch("/api/historial/", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar el historial.");
    }

    const datos = await response.json();
    const registros = Array.isArray(datos) ? datos : datos.results ?? [];

    return registros.slice(0, 5);
  },
});

const error = perfilError?.message ?? "";


  const puntos = logros?.puntos ?? perfil?.puntos ?? 0;

  const nivelActual = logros?.nivel_actual;
  const siguienteNivel = logros?.siguiente_nivel;

  const puntosNivelActual = nivelActual?.puntos_minimos ?? 0;
  const metaPuntos = siguienteNivel?.puntos_minimos ?? puntosNivelActual;

  const progreso = siguienteNivel
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((puntos - puntosNivelActual) /
              (metaPuntos - puntosNivelActual)) * 100
          )
        )
      )
    : 100;

  return <>
    <PageHeader
      title="Mis puntos"
      subtitle="Tu saldo, nivel y movimientos de recompensas."
    />

    {error && (
      <div className="profile-note" role="alert">
        {error}
      </div>
    )}

    <div className="points-hero">
      <div>
        <span>Saldo disponible</span>
        <strong>
          {cargando ? "..." : puntos.toLocaleString("es-EC")}
        </strong>
        <b>puntos</b>
        <p>Total de puntos registrados en tu cuenta</p>
      </div>

      <div>
        <Badge>
  {cargandoLogros
    ? "CARGANDO..."
    : siguienteNivel
      ? "EN PROGRESO"
      : "NIVEL MÁXIMO"}
</Badge>

<h2>
  {siguienteNivel
    ? `Progreso hacia ${siguienteNivel.nombre}`
    : "Has alcanzado el nivel máximo"}
</h2>
        <div className="progress">
          <i style={{ width: `${progreso}%` }} />
        </div>
        <p>
  {cargandoLogros
    ? "Calculando progreso..."
    : siguienteNivel
      ? `Te faltan ${(metaPuntos - puntos).toLocaleString("es-EC")} puntos para alcanzar el nivel ${siguienteNivel.nombre}.`
      : "¡Has alcanzado el nivel máximo!"}
</p>
      </div>
    </div>

    <div className="dashboard-grid">
      <section className="card panel">
        <h3>Cómo ganar puntos</h3>
        <div className="points-list">
          {WASTE_TYPES.map(x => (
            <div key={x[0]}>
              <span>
                <Icon name="recycle" />
                {x[0]}
              </span>
              <b>
                +{x[1]} pts · +
                {Number(x[1]) / POINTS_PER_ECUCOIN} EcuCoins
              </b>
            </div>
          ))}
        </div>
      </section>

      <section className="card panel">
  <h3>Últimos movimientos</h3>

  {cargandoMovimientos ? (
    <p>Cargando movimientos...</p>
  ) : movimientos.length === 0 ? (
    <p>Aún no tienes reciclajes registrados.</p>
  ) : (
    <div className="points-list">
      {movimientos.map((movimiento) => (
        <div key={movimiento.id}>
          <span>
            <Icon name="recycle" />
            {movimiento.tipo_residuo_nombre}
          </span>

          <b>+{movimiento.puntos_otorgados} pts</b>

          <p>
            {movimiento.punto_reciclaje_nombre} ·{" "}
            {new Date(movimiento.fecha_registro).toLocaleDateString("es-EC")}
          </p>
        </div>
      ))}
    </div>
  )}

  <Button
    variant="secondary"
    onClick={() => setPage("Historial")}
  >
    Consultar movimientos
  </Button>
</section>
    </div>
  </>;
}



type RewardAction = "Usar" | "Equipar" | "Aplicar" | null;

type Reward = {
  id: number;
  name: string;
  desc: string;
  cost: number;
  icon: IconName;
  action: RewardAction;
  stock: number;
};

type Redeemed = {
  id: string;
  rewardId: number;
  name: string;
  description: string;
  cost: number;
  date: string;
  applied: boolean;
  code: string;
};
const REWARDS: Reward[] = [
  { id: "sticker", name: "Sticker ecológico digital", desc: "Un sticker exclusivo para decorar tu perfil.", cost: 10, icon: "leaf", action: "Usar" },
  { id: "fondo", name: "Fondo de perfil ecológico", desc: "Fondo con paisajes verdes para tu perfil.", cost: 15, icon: "map", action: "Aplicar" },
  { id: "marco-basico", name: "Marco de perfil básico", desc: "Un marco verde para tu foto de perfil.", cost: 20, icon: "user", action: "Equipar" },
  { id: "insignia", name: "Insignia especial de reciclaje", desc: "Insignia de edición limitada para tu colección.", cost: 25, icon: "award", action: null },
  { id: "avatar", name: "Avatar ecológico", desc: "Avatar temático de la naturaleza del campus.", cost: 30, icon: "users", action: "Equipar" },
  { id: "marco-avanzado", name: "Marco de perfil avanzado", desc: "Marco animado con detalles de hojas y brillo.", cost: 40, icon: "star", action: "Equipar" },
  { id: "pack", name: "Pack de stickers ecológicos", desc: "Colección de 10 stickers sobre reciclaje.", cost: 50, icon: "recycle", action: "Usar" },
  { id: "tema", name: "Tema especial de perfil", desc: "Cambia los colores de tu perfil con un tema único.", cost: 60, icon: "settings", action: "Aplicar" },
  { id: "premium", name: "Recompensa ecológica premium", desc: "Paquete premium de personalización para tu cuenta.", cost: 75, icon: "gift", action: null },
  { id: "especial", name: "Recompensa especial de EcoCampus", desc: "La distinción más alta del programa EcoCampus.", cost: 100, icon: "coin", action: null },
];


function RewardsPage({
  balance,
  redeemed,
  redeem,
  toggleApplied
}: {
  balance: number;
  redeemed: Redeemed[];
  redeem: (r: Reward) => Promise<void>;
  toggleApplied: (id: string) => void;
}) {
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"available" | "mine">("available");


const {
  data: catalog = [],
  isLoading: loadingRewards,
  error: rewardsError,
} = useQuery<Reward[], Error>({
  queryKey: ["recompensas"],
  queryFn: async () => {
    const response = await fetch("/api/recompensas/", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar las recompensas.");
    }

    const data = await response.json();

    return data.map((item: any) => ({
      id: String(item.id),
      name: item.nombre,
      desc: item.descripcion,
      cost: item.costo_ecucoins,
      icon: "gift",
      action: null,
    }));
  },
});



  const available = catalog.filter(
    r => !redeemed.some(x => x.rewardId === Number(r.id))
  );

  if (loadingRewards) {
    return (
      <section className="card panel">
        <p className="muted">Cargando recompensas...</p>
      </section>
    );
  }

  return (
    <>
      <PageHeader
        title="Recompensas"
        subtitle="Canjea tus EcuCoins por recompensas ecológicas."
      />

      <div className="points-hero">
        <div>
          <span>Mis EcuCoins</span>
          <strong>{balance.toLocaleString("es-ES")}</strong>
          <b>EcuCoins</b>
          <p>Obtienes 1 EcuCoin por cada 5 puntos de reciclaje.</p>
        </div>

        <div>
          <Badge>5 PUNTOS = 1 ECUCOIN</Badge>
          <h2>Equivalencias</h2>
          <div className="coin-rates">
            {WASTE_TYPES.map(x => (
              <span key={x[0]}>
                {x[0]}<b>+{x[1] / POINTS_PER_ECUCOIN}</b>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={tab === "available" ? "active" : ""}
          onClick={() => setTab("available")}
        >
          Recompensas disponibles <Badge>{available.length}</Badge>
        </button>

        <button
          className={tab === "mine" ? "active" : ""}
          onClick={() => setTab("mine")}
        >
          Mis recompensas <Badge>{redeemed.length}</Badge>
        </button>
      </div>

      {notice && (
        <div className="safe-note" role="status">
          <Icon name="check" size={16} />
          {notice}
        </div>
      )}

      {tab === "available" && (
        available.length === 0 ? (
          <section className="card panel">
            <p className="muted">
              Ya canjeaste todas las recompensas disponibles.
            </p>
          </section>
        ) : (
          <div className="reward-grid">
            {available.map(r => {
              const can = balance >= r.cost;

              return (
                <div className="card badge-card reward-card" key={r.id}>
                  <div className="badge-art">
                    <Icon name={r.icon} size={35} />
                  </div>

                  <Badge tone="amber">{r.cost} EcuCoins</Badge>
                  <h3>{r.name}</h3>
                  <p>{r.desc}</p>

                  <Button
                    disabled={!can}
                    onClick={async () => {
                      try {
                        await redeem(r);
                        setNotice(
                          `¡Canje exitoso! "${r.name}" se guardó en Mis recompensas (-${r.cost} EcuCoins).`
                        );
                      } catch (error) {
                        setNotice(
                          error instanceof Error
                            ? error.message
                            : "No se pudo realizar el canje."
                        );
                      }
                    }}
                  >
                    {can
                      ? "Canjear"
                      : `Te faltan ${r.cost - balance} EcuCoins`}
                  </Button>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "mine" && (
        redeemed.length === 0 ? (
          <section className="card panel">
            <p className="muted">
              Aún no has canjeado recompensas. Canjea la primera en "Recompensas disponibles".
            </p>
          </section>
        ) : (
          <div className="reward-grid">
            {redeemed.map(x => {
              const r = catalog.find(
                y => Number(y.id) === x.rewardId
              );

              return (
                <div className="card badge-card reward-card" key={x.id}>
                  <div className="badge-art">
                    <Icon name={r?.icon ?? "gift"} size={35} />
                  </div>

                  <Badge tone="green">Canjeada</Badge>

                  <h3>{x.name}</h3>
                  <p>{x.description || "Sin descripción disponible."}</p>

                  <div className="voucher-details">
                    <p><strong>Comprobante de canje</strong></p>
                    <div className="voucher-qr">
  <QRCodeSVG
    value={`ECOCAMPUS-VOUCHER:${x.code}`}
    size={180}
    level="H"
    includeMargin={true}
  />

</div>
                    <small>Canjeada el {x.date}</small>
                    <p><strong>Costo:</strong> {x.cost} EcuCoins</p>
                    <p className="muted">
                      Presenta este comprobante para reclamar tu recompensa.
                    </p>
                  </div>

                  {r?.action ? (
                    <Button
                      variant={x.applied ? "secondary" : "primary"}
                      onClick={() => toggleApplied(x.id)}
                    >
                      {x.applied ? "Quitar" : r.action}
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled>
                      Canjeada
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </>
  );
}



type Bin = { id: string; name: string; colorName: string; color: string; dark: string; accepts: string; examples: string[]; avoid: string };
const BINS: Bin[] = [
  { id: "vidrio", name: "Vidrio", colorName: "Verde", color: "#2fa865", dark: "#1f7d4a", accepts: "Deposita aquí botellas y frascos de vidrio limpios.", examples: ["Botellas de vidrio","Frascos de conservas","Envases de perfume"], avoid: "No depositar plástico, latas, papel/cartón ni residuos orgánicos." },
  { id: "plastico", name: "Plástico y latas", colorName: "Amarillo", color: "#f2bf2b", dark: "#c99410", accepts: "Deposita aquí botellas de plástico, envases plásticos, latas de aluminio y otros envases reciclables.", examples: ["Botellas de agua o gaseosa","Envases de yogur","Latas de aluminio"], avoid: "No depositar residuos orgánicos, vidrio ni papel/cartón." },
  { id: "papel", name: "Papel y cartón", colorName: "Celeste", color: "#4bb4e6", dark: "#2a8bbd", accepts: "Deposita aquí papel y cartón limpios y secos.", examples: ["Hojas y cuadernos","Cajas de cartón","Periódicos y revistas"], avoid: "No depositar papel mojado o grasoso, vidrio, plástico ni residuos orgánicos." },
  { id: "organico", name: "Desechos naturales/orgánicos", colorName: "Naranja", color: "#f08a3c", dark: "#c76a1f", accepts: "Deposita aquí restos de frutas, verduras y otros residuos naturales/orgánicos apropiados.", examples: ["Restos de frutas","Restos de verduras","Hojas y restos de jardín"], avoid: "No depositar plástico, latas, vidrio, papel/cartón ni residuos no biodegradables." },
];

function BinArt({color,dark}:{color:string;dark:string}){
 return <svg viewBox="0 0 120 140" width="100%" height="100%" aria-hidden="true"><rect x="22" y="30" width="76" height="92" rx="8" fill={color}/><path d="M22 38h76v10H22z" fill={dark} opacity=".25"/><rect x="14" y="18" width="92" height="16" rx="6" fill={dark}/><rect x="48" y="8" width="24" height="10" rx="4" fill={dark}/><circle cx="36" cy="128" r="7" fill="#33443f"/><circle cx="84" cy="128" r="7" fill="#33443f"/><g transform="translate(40 58) scale(1.7)" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m8 6 2-3 2 3M10 3 6 10h-3"/><path d="m18 10 3 1-2 3M21 11l-4-7h-5"/><path d="m8 19-1 3-3-2M7 22h8l2-4"/></g></svg>;
}

function RecyclingInfoPage(){
 const [selected,setSelected]=useState<string|null>(null);
 return <><PageHeader title="Información de reciclaje" subtitle="Aprende a separar correctamente tus residuos. Toca un contenedor para ver los detalles."/>
  <div className="bin-grid">{BINS.map(bin=>{const open=selected===bin.id;return <div className="bin-wrap" key={bin.id}>
   <button type="button" className={`card bin-card ${open?"active":""}`} aria-expanded={open} onClick={()=>setSelected(open?null:bin.id)}><div className="bin-art"><BinArt color={bin.color} dark={bin.dark}/></div><h3>{bin.name}</h3><span className="bin-color"><i style={{background:bin.color}}/>Contenedor {bin.colorName.toLowerCase()}</span></button>
   {open&&<><div className="bin-scrim" onClick={()=>setSelected(null)}/><div className="card bin-pop" role="dialog" aria-label={bin.name}><button className="modal-close" aria-label="Cerrar" onClick={()=>setSelected(null)}><Icon name="close"/></button><div className="bin-pop-head"><i style={{background:bin.color}}/><div><b>{bin.name}</b><small>Contenedor {bin.colorName.toLowerCase()}</small></div></div><p>{bin.accepts}</p><h4>Ejemplos permitidos</h4><ul>{bin.examples.map(e=><li key={e}>{e}</li>)}</ul><div className="bin-avoid"><Icon name="close" size={16}/><span>{bin.avoid}</span></div></div></>}
  </div>})}</div></>;
}

function StudentPage({page,setPage}:{page:string;setPage:(p:string)=>void}){
 const queryClient = useQueryClient();
 const [equipped,setEquipped]=useState<string[]>([]);
 const {
  data: redeemed = [],
} = useQuery<Redeemed[]>({
  queryKey: ["mis-recompensas"],
  queryFn: async () => {
    const response = await fetch("/api/mis-recompensas/", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar tus recompensas.");
    }

    const data = await response.json();

    return data.map((item: any) => ({
      id: String(item.id),
      code: item.codigo,
      rewardId: Number(item.recompensa_id),
      name: item.nombre,
      description: item.descripcion,
      cost: Number(item.costo_ecucoins),
      date: new Date(item.fecha_canje).toLocaleDateString("es-EC"),
      applied: item.estado === "utilizada",
    }));
  },
});

 const actualizarEstadoCanje = async (
  id: string,
  estado: "pendiente" | "utilizada"
) => {
  const csrfResponse = await fetch("/api/csrf/", {
    credentials: "include",
  });

  if (!csrfResponse.ok) {
    throw new Error("No se pudo obtener el token de seguridad.");
  }

  const csrfToken = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("csrftoken="))
    ?.split("=")[1];

  if (!csrfToken) {
    throw new Error("No se encontró el token CSRF.");
  }

  const response = await fetch(`/api/mis-recompensas/${id}/`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": decodeURIComponent(csrfToken),
    },
    body: JSON.stringify({ estado }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo actualizar el estado.");
  }
};
 const {
  data: perfil = null,
  isLoading: cargandoPerfil,
} = useQuery<PerfilEstudiante>({
  queryKey: ["perfil"],
  queryFn: async () => {
    const datos = await obtenerPerfil();

    if (!datos) {
      throw new Error("No se pudo cargar el perfil del estudiante.");
    }

    return datos;
  },
});

const earnedEcuCoins = perfil?.ecucoins ?? 0;



    if (cargandoPerfil) {
      return <div>Cargando perfil del estudiante...</div>;
    }

    if (!perfil) {
      return <div>No se pudo cargar el perfil del estudiante.</div>;
    }
 if(page==="Inicio") return <StudentDashboard setPage={setPage}/>;
 if(page==="Historial") return <HistoryPage/>;
 if(page==="Ranking") return <RankingPage/>;
 if(page==="Insignias") return <BadgesPage equipped={equipped}/>;
 if(page==="Retos") return <ChallengesPage/>;
 if(page === "Mapa de reciclaje") return <CampusMap />;

 if(page === "Mapa de utilización") return <CampusMap admin={true} />;

if (page === "Recompensas") {
  const canjearRecompensa = async (r: Reward) => {
    try {
      const csrfResponse = await fetch("/api/csrf/", {
        credentials: "include",
      });

      if (!csrfResponse.ok) {
        throw new Error("No se pudo obtener el token de seguridad.");
      }

      const csrfToken = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("csrftoken="))
        ?.split("=")[1];

      if (!csrfToken) {
        throw new Error("No se encontró el token CSRF.");
      }

      const response = await fetch("/api/recompensas/canjear/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": decodeURIComponent(csrfToken),
        },
        body: JSON.stringify({
          recompensa_id: Number(r.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo canjear la recompensa.");
      }

      await Promise.all([
  queryClient.invalidateQueries({ queryKey: ["mis-recompensas"] }),
  queryClient.invalidateQueries({ queryKey: ["perfil"] }),
  queryClient.invalidateQueries({ queryKey: ["recompensas"] }),
]);
    } catch (error) {
  throw error;
}
  };

  return (
    <RewardsPage
      balance={earnedEcuCoins}
      redeemed={redeemed}
      redeem={canjearRecompensa}
      toggleApplied={async (id) => {
  const recompensa = redeemed.find((x) => x.id === id);

  if (!recompensa) return;

  const nuevoEstado =
    recompensa.applied ? "pendiente" : "utilizada";

  try {
    await actualizarEstadoCanje(id, nuevoEstado);

await queryClient.invalidateQueries({
  queryKey: ["mis-recompensas"],
});
  } catch (error) {
    console.error("Error al actualizar el canje:", error);
  }
}}
    />
  );
}
 if(page==="Información de reciclaje") return <RecyclingInfoPage/>;
 if(page==="Perfil") return <ProfilePage equipped={equipped} setEquipped={setEquipped}/>;
 return <PointsPage setPage={setPage} />;
}


type AdminEntity = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  faculty?: string;
  facultyId?: number;
  total_carreras?: number;
  total_estudiantes?: number;
  points?: number;
  location?: string;
  accepted?: string;
  cost?: number;
  stock?: number;
  redeemed?: number;
  objective?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  reward?: number;
  participants?: number;
  completed?: number;
  condition?: string;
  obtained?: number;
  latitud?: number | null;
  longitud?: number | null;
  qrCode?: string;
  imageUrl?: string;

  // Configuración de retos ecológicos
  modality?: "INDIVIDUAL" | "GRUPAL";
  scope?: "CARRERA" | "FACULTAD";
  careerId?: number;
  goalType?: "RECICLAJES" | "PUNTOS" | "MATERIAL";
  goal?: number;
  wasteTypeId?: number;
  wasteType?: string;
};


type AdminUser = {
  id: string;
  name: string;
  email: string;
  code: string;
  identification?: string;
  faculty: string;
  career: string;
  course: string;
  points: number;
  level?: number;
  recyclings: number;
  active: boolean;
  badges: string[];
  challenges: string[];
  fechaRegistro?: string;
  historial?: {
    id: number;
    fecha: string;
    residuo: string;
    punto: string;
    puntos: number;
    estado: string;
  }[];
};

type AdminRecycling={id:string;userId:string;date:string;time:string;waste:string;point:string;points:number;status:"Validado"|"Pendiente"|"Rechazado"};
type AdminStore={faculties:AdminEntity[];careers:AdminEntity[];users:AdminUser[];recyclings:AdminRecycling[];points:AdminEntity[];rewards:AdminEntity[];challenges:AdminEntity[];badges:AdminEntity[]};


const createAdminStore = (): AdminStore => ({
  faculties: [],
  careers: [],
  users: [],
  recyclings: [],
  points: [],
  rewards: [],
  challenges: [],
  badges: [],
});


function ConfirmModal({title,text,confirmLabel,onConfirm,onCancel}:{title:string;text:string;confirmLabel:string;onConfirm:()=>void;onCancel:()=>void}){return <div className="modal-backdrop" onClick={onCancel}><div className="modal admin-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" aria-label="Cerrar" onClick={onCancel}><Icon name="close"/></button><h2>{title}</h2><p>{text}</p><div className="flow-actions"><Button variant="secondary" onClick={onCancel}>Cancelar</Button><Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button></div></div></div>}
function AdminNotice({text}:{text:string}){return text?<div className="admin-notice" role="status"><Icon name="check" size={17}/>{text}</div>:null}
function AdminSearch({value,onChange,children}:{value:string;onChange:(v:string)=>void;children?:ReactNode}){return <div className="admin-toolbar"><div className="admin-search"><Icon name="filter" size={17}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder="Buscar en esta sección..."/></div>{children}</div>}

function AdminForm({
  title,
  item,
  faculties,
  careers,
  wasteTypes,
  isChallenge = false,
  allowImage = false,
    onSave,
  onClose,
  initialCoordinates,
}: {
  title: string;
  item?: AdminEntity;
  faculties?: AdminEntity[];
  careers?: AdminEntity[];
  wasteTypes?: { id: number; nombre: string }[];
  isChallenge?: boolean;
  allowImage?: boolean;
  onSave: (v: AdminEntity, image?: File) => void;
  onClose: () => void;
  initialCoordinates?: {
  lat: number;
  lng: number;
};
}) {

 const [draft, setDraft] = useState<AdminEntity>({
  ...(item || {
    id: "",
    name: "",
    description: "",
    active: true,
    faculty: faculties?.[0]?.name || "",
  }),
  ...(initialCoordinates
    ? {
        latitud: initialCoordinates.lat,
        longitud: initialCoordinates.lng,
      }
    : {}),
});
 const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const esFormularioReto = isChallenge;
 return <div className="modal-backdrop" onClick={onClose}><form className="modal admin-modal entity-form" onSubmit={e=>{e.preventDefault();if (draft.name.trim()) {
  onSave(
    {
      ...draft,
      id: draft.id || `item-nuevo-${draft.name.trim().toLowerCase().replace(/\s+/g, "-")}`,
    },
    selectedImage || undefined
  );
}}} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={onClose}><Icon name="close"/></button><h2>{title}</h2><div className="entity-form-fields"><label>Nombre<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Descripción<input required value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>{faculties && !isChallenge && (
  <label>
    Facultad
    <select
      required
      value={String(
        draft.facultyId ??
        faculties.find(f => f.name === draft.faculty)?.id ??
        faculties[0]?.id ??
        ""
      )}
      onChange={(e) => {
        const selected = faculties.find(
          f => f.id === e.target.value
        );

        setDraft({
          ...draft,
          facultyId: selected ? Number(selected.id) : undefined,
          faculty: selected?.name || "",
        });
      }}
    >
      {faculties.map(f => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  </label>
)}{item?.location!==undefined&&<><label>
  Tipo de ubicación
  <select
    value={draft.location || "Otro"}
    onChange={e =>
      setDraft({ ...draft, location: e.target.value })
    }
  >
    <option value="Bloque">Bloque</option>
    <option value="Biblioteca">Biblioteca</option>
    <option value="Cafetería">Cafetería</option>
    <option value="Laboratorios">Laboratorios</option>
    <option value="Otro">Otro</option>
  </select>
</label><label>Residuos aceptados<input value={draft.accepted||""} onChange={e=>setDraft({...draft,accepted:e.target.value})}/></label></>}
   {item?.location !== undefined && (
  <div className="form-wide">
    <label>Selecciona la ubicación en el mapa</label>

    <MapContainer
      center={[
        draft.latitud ?? -2.1490621784763038,
        draft.longitud ?? -79.60285927370869,
      ]}
      zoom={18}
      style={{ height: "280px", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />


      <MapClickHandler
        onMapClick={(lat, lng) =>
          setDraft({
            ...draft,
            latitud: lat,
            longitud: lng,
          })
        }
      />

      {draft.latitud != null && draft.longitud != null && (
        <Marker
          position={[draft.latitud, draft.longitud]}
          icon={recyclingIcon}
        />
      )}
    </MapContainer>

    <p>
      {draft.latitud != null && draft.longitud != null
        ? `Coordenadas: ${draft.latitud.toFixed(7)}, ${draft.longitud.toFixed(7)}`
        : "Haz clic en el mapa para seleccionar la ubicación."}
    </p>
  </div>
)}
   {item?.cost!==undefined&&<div className="field-row"><label>
  Costo en EcuCoins
  <input
    type="number"
    min="1"
    required
    value={draft.cost ?? ""}
    onChange={e =>
      setDraft({ ...draft, cost: Number(e.target.value) })
    }
  />
</label><label>Cantidad disponible<input type="number" value={draft.stock} onChange={e=>setDraft({...draft,stock:Number(e.target.value)})}/></label></div>}
   {esFormularioReto && <>
    <label>
      Modalidad del reto
      <select
        value={draft.modality || "INDIVIDUAL"}
        onChange={(e) =>
          setDraft({
            ...draft,
            modality: e.target.value as "INDIVIDUAL" | "GRUPAL",
            scope: undefined,
            careerId: undefined,
            facultyId: undefined,
          })
        }
      >
        <option value="INDIVIDUAL">Individual</option>
        <option value="GRUPAL">Grupal</option>
      </select>
    </label>

    {draft.modality === "GRUPAL" && (
      <label>
        Alcance del reto
        <select
          value={draft.scope || "CARRERA"}
          onChange={(e) =>
            setDraft({
              ...draft,
              scope: e.target.value as "CARRERA" | "FACULTAD",
              careerId: undefined,
              facultyId: undefined,
            })
          }
        >
          <option value="CARRERA">Por carrera</option>
          <option value="FACULTAD">Por facultad</option>
        </select>
      </label>
    )}


    <label>
      Tipo de objetivo
      <select
        value={draft.goalType || "RECICLAJES"}
        onChange={(e) =>
          setDraft({
            ...draft,
            goalType: e.target.value as "RECICLAJES" | "PUNTOS" | "MATERIAL",
            wasteTypeId: undefined,
          })
        }
      >
        <option value="RECICLAJES">Cantidad de reciclajes</option>
        <option value="PUNTOS">Acumulación de puntos</option>
        <option value="MATERIAL">Material específico</option>
      </select>
    </label>

    <label>
      Meta del reto
      <input
        type="number"
        min="1"
        required
        value={draft.goal ?? 1}
        onChange={(e) =>
          setDraft({ ...draft, goal: Number(e.target.value) })
        }
      />
    </label>

    {draft.goalType === "MATERIAL" && (
      <label>
        Material requerido
        <select
          required
          value={draft.wasteTypeId ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              wasteTypeId: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        >
          <option value="">Seleccionar material</option>
          {wasteTypes?.map((waste) => (
            <option key={waste.id} value={waste.id}>
              {waste.nombre}
            </option>
          ))}
        </select>
      </label>
)}
<label className="form-wide">Objetivo<input value={draft.objective||""} onChange={e=>setDraft({...draft,objective:e.target.value})}/></label>
   <div className="field-row">
  <label>
    Fecha y hora de inicio
    <input
      type="datetime-local"
      value={draft.startDate || ""}
      onChange={e =>
        setDraft({...draft, startDate: e.target.value})
      }
      required
    />
  </label>

  <label>
    Fecha y hora de finalización
    <input
      type="datetime-local"
      value={draft.endDate || ""}
      onChange={e =>
        setDraft({...draft, endDate: e.target.value})
      }
      required
    />
  </label>

  <label>
    Puntos otorgados
    <input
      type="number"
      min="0"
      value={draft.reward ?? 0}
      onChange={e =>
        setDraft({...draft, reward: Number(e.target.value)})
      }
      required
    />
  </label>
</div>
 </>}{item?.condition!==undefined&&<label className="form-wide">Condición para obtenerla<input value={draft.condition||""} onChange={e=>setDraft({...draft,condition:e.target.value})}/></label>}{allowImage && (
  <div className="entity-image-field">
    <label>
      Imagen
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) =>
          setSelectedImage(e.target.files?.[0] || null)
        }
      />
    </label>

    {selectedImage && (
      <p>Imagen seleccionada: {selectedImage.name}</p>
    )}
  </div>
)}</div><div className="flow-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Guardar</Button></div></form></div>
}


function AdminEntities({
  title,
  subtitle,
  kind,
  store,
  setStore,
}: {
  title: string;
  subtitle: string;
  kind: "faculties" | "careers" | "points" | "rewards" | "challenges" | "badges";
  store: AdminStore;
  setStore: React.Dispatch<React.SetStateAction<AdminStore>>;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminEntity | null>(null);
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<AdminEntity | null>(null);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [mapKey, setMapKey] = useState(0);
  const queryClient = useQueryClient();



  const isAcademic = kind === "faculties" || kind === "careers";

  const endpoints: Partial<Record<typeof kind, string>> = {
    rewards: "/api/admin/recompensas/",
    challenges: "/api/admin/retos/",
    badges: "/api/admin/insignias/",
    points: "/api/admin/puntos-reciclaje/",
  };

  const endpoint = endpoints[kind];

  const {
    data: loadedRecords = [],
    error: recordsError,
  } = useQuery<AdminEntity[], Error>({
    queryKey: ["admin", kind],
    enabled: Boolean(endpoint),
    queryFn: async () => {
      const response = await fetch(endpoint!, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      return data.map((item: any): AdminEntity => {
        if (kind === "points") {
          return {
            id: String(item.id),
            name: item.nombre,
            description: item.descripcion || "",
            location: item.ubicacion,
            accepted: item.residuos_aceptados || "",
            active: item.activo,
            latitud: item.latitud !== null ? Number(item.latitud) : null,
            longitud: item.longitud !== null ? Number(item.longitud) : null,
            qrCode: item.codigo_qr,
          };
        }

        if (kind === "rewards") {
          return {
            id: String(item.id),
            name: item.nombre,
            description: item.descripcion || "",
            active: item.activa,
            cost: item.costo_ecucoins,
            stock: item.cantidad_disponible,
            redeemed: item.canjes_realizados,
            imageUrl: item.imagen || "",
          };
        }

        if (kind === "challenges") {
          return {
            id: String(item.id),
            name: item.titulo,
            description: item.descripcion || "",
            objective: item.descripcion || "",
            active: item.activo,
            modality: item.modalidad || "INDIVIDUAL",
            scope: item.alcance || undefined,
            careerId: item.carrera ? Number(item.carrera) : undefined,
            facultyId: item.facultad ? Number(item.facultad) : undefined,
            goalType: item.tipo_objetivo || "RECICLAJES",
            goal: item.meta ?? 1,
            wasteTypeId: item.tipo_residuo
              ? Number(item.tipo_residuo)
              : undefined,
            reward: item.recompensa_puntos ?? 0,
            startDate: toLocalDateTime(item.fecha_inicio),
            endDate: toLocalDateTime(item.fecha_fin),
            participants: item.participantes ?? 0,
            completed: item.completados ?? 0,
          };
        }

        return {
          id: String(item.id),
          name: item.nombre,
          description: item.descripcion || "",
          active: item.activo,
          condition: `Alcanzar ${item.puntos_requeridos} puntos`,
          obtained: item.obtenidas,
          imageUrl: item.imagen || "",
        };
      });
    },
  });

  const source = endpoint ? loadedRecords : store[kind];


const invalidarDatos = async () => {
  await queryClient.invalidateQueries({
    queryKey: ["admin", kind],
  });

  if (kind === "rewards") {
    await queryClient.invalidateQueries({ queryKey: ["recompensas"] });
  }

  if (kind === "challenges") {
    await queryClient.invalidateQueries({ queryKey: ["retos"] });
  }

  if (kind === "badges") {
    await queryClient.invalidateQueries({ queryKey: ["insignias-disponibles"] });
    await queryClient.invalidateQueries({ queryKey: ["mis-logros"] });
  }

  if (kind === "points") {
    await queryClient.invalidateQueries({ queryKey: ["puntos-reciclaje"] });
  }

  if (kind === "careers") {
    await queryClient.invalidateQueries({ queryKey: ["admin", "carreras"] });
  }

  if (kind === "faculties") {
    await queryClient.invalidateQueries({ queryKey: ["admin", "facultades"] });
  }
  await queryClient.invalidateQueries({
  queryKey: ["admin", "reportes"],
});

await queryClient.invalidateQueries({
  queryKey: ["admin", "dashboard"],
});

if (kind === "points") {
  await queryClient.invalidateQueries({
    queryKey: ["admin", "puntos-reciclaje"],
  });
}

if (kind === "faculties" || kind === "careers") {
  await queryClient.invalidateQueries({
    queryKey: ["admin", "estructura-academica"],
  });
}

};


  useEffect(() => {
    if (recordsError) {
      console.error("Error al cargar los registros:", recordsError);
      setNotice("No se pudieron cargar los datos desde Django.");
    }
  }, [recordsError]);


const { data: careers = [] } = useQuery<AdminEntity[]>({
  queryKey: ["admin", "carreras"],
  queryFn: async () => {
    const response = await fetch("/api/admin/carreras/", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar las carreras.");
    }

    const data = await response.json();

    return data.map((item: any) => ({
      id: String(item.id),
      name: item.name,
      description: item.description || "",
      active: item.active,
      faculty: item.faculty,
      facultyId: Number(item.faculty_id),
    }));
  },
});

const { data: wasteTypes = [] } = useQuery<
  { id: number; nombre: string }[]
>({
  queryKey: ["residuos"],
  queryFn: async () => {
    const response = await fetch("/api/residuos/", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar los tipos de residuos.");
    }

    const data = await response.json();

    return data.map((item: any) => ({
      id: Number(item.id),
      nombre: item.nombre,
    }));
  },
});


  const icon: IconName =
    kind === "points"
      ? "pin"
      : kind === "rewards"
        ? "gift"
        : kind === "challenges"
          ? "target"
          : kind === "badges"
            ? "award"
            : "file";

  const save = async (item: AdminEntity, image?: File) => {
    if (kind === "faculties") {
      try {
        const previous = source.find((x) => x.id === item.id);

        const csrfToken = document.cookie
          .split("; ")
          .find((cookie) => cookie.startsWith("csrftoken="))
          ?.split("=")[1];

        const response = await fetch(
          previous
            ? `/api/admin/facultades/${item.id}/`
            : "/api/admin/facultades/",
          {
            method: previous ? "PUT" : "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-CSRFToken": csrfToken || "",
            },
            body: JSON.stringify({
              name: item.name,
              description: item.description,
              active: item.active,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(JSON.stringify(error));
        }

        const saved = await response.json();

        const updatedItem: AdminEntity = {
          ...item,
          id: String(saved.id),
          name: saved.name,
          description: saved.description || "",
          active: saved.active,
          total_carreras: saved.total_carreras,
          total_estudiantes: saved.total_estudiantes,
          points: saved.points,
        };

        setStore((previousStore) => ({
          ...previousStore,
          faculties: previous
            ? previousStore.faculties.map((f) =>
                f.id === item.id ? updatedItem : f
              )
            : [...previousStore.faculties, updatedItem],
        }));

        setMapKey((previous) => previous + 1);

        await invalidarDatos();
        setEditing(null);
        setNotice("Facultad guardada correctamente.");
        return;
      } catch (error) {
        console.error("Error al guardar la facultad:", error);
        setNotice("No se pudo guardar la facultad. Revisa la consola.");
        return;
      }
    }

    if (kind === "careers") {
      try {
        const previous = source.find((x) => x.id === item.id);

        const csrfToken = document.cookie
          .split("; ")
          .find((cookie) => cookie.startsWith("csrftoken="))
          ?.split("=")[1];

        const response = await fetch(
          previous
            ? `/api/admin/carreras/${item.id}/`
            : "/api/admin/carreras/",
          {
            method: previous ? "PUT" : "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-CSRFToken": csrfToken || "",
            },
            body: JSON.stringify({
              name: item.name,
              description: item.description,
              faculty_id: item.facultyId,
              active: item.active,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const saved = await response.json();

        const updatedItem: AdminEntity = {
          ...item,
          id: String(saved.id),
          name: saved.name,
          description: saved.description || "",
          active: saved.active,
          faculty: saved.faculty,
          facultyId: saved.faculty_id,
          total_estudiantes: saved.total_estudiantes,
          points: saved.points,
        };

        setStore((previousStore) => ({
          ...previousStore,
          careers: previous
            ? previousStore.careers.map((c) =>
                c.id === item.id ? updatedItem : c
              )
            : [...previousStore.careers, updatedItem],
        }));

        await invalidarDatos();
        setEditing(null);
        setNotice("Carrera guardada correctamente.");
        return;
      } catch (error) {
        console.error("Error al guardar la carrera:", error);
        setNotice("No se pudo guardar la carrera. Revisa la consola.");
        return;
      }
    }


    // Guardado de Retos en Django
    if (kind === "challenges") {
      try {
        const previous = source.find((x) => x.id === item.id);

        if (!item.startDate || !item.endDate) {
          setNotice("Debes seleccionar las fechas de inicio y finalización.");
          return;
        }

        const fechaInicio = new Date(item.startDate);
        const fechaFin = new Date(item.endDate);

        if (
          Number.isNaN(fechaInicio.getTime()) ||
          Number.isNaN(fechaFin.getTime()) ||
          fechaFin <= fechaInicio
        ) {
          setNotice("Revisa las fechas de inicio y finalización.");
          return;
        }

        const modalidad = item.modality || "INDIVIDUAL";
        const tipoObjetivo = item.goalType || "RECICLAJES";
        const alcance = modalidad === "GRUPAL"
          ? item.scope || "CARRERA"
          : null;

        if (!Number.isInteger(item.goal ?? 1) || (item.goal ?? 1) < 1) {
          setNotice("La meta debe ser un número entero mayor que cero.");
          return;
        }


        if (tipoObjetivo === "MATERIAL" && !item.wasteTypeId) {
          setNotice("Selecciona el material requerido para el reto.");
          return;
        }

        const csrfToken = document.cookie
          .split("; ")
          .find((cookie) => cookie.startsWith("csrftoken="))
          ?.split("=")[1];

        const ahora = new Date();

        const estado =
          ahora < fechaInicio
            ? "PROXIMO"
            : ahora <= fechaFin
              ? "ACTIVO"
              : "FINALIZADO";

        const response = await fetch(
          previous
            ? `/api/admin/retos/${item.id}/`
            : "/api/admin/retos/",
          {
            method: previous ? "PATCH" : "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-CSRFToken": csrfToken || "",
            },
            body: JSON.stringify({
              titulo: item.name,
              descripcion: item.description || "",
              modalidad,
              alcance,
              carrera: null,
              facultad: null,
              tipo_objetivo: tipoObjetivo,
              meta: item.goal ?? 1,
              tipo_residuo: tipoObjetivo === "MATERIAL"
                ? item.wasteTypeId
                : null,
              recompensa_puntos: item.reward ?? 0,
              fecha_inicio: fechaInicio.toISOString(),
              fecha_fin: fechaFin.toISOString(),
              estado,
              activo: item.active,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const saved = await response.json();

        const updatedItem: AdminEntity = {
          id: String(saved.id),
          name: saved.titulo,
          description: saved.descripcion || "",
          objective: saved.descripcion || "",
          active: saved.activo,
          modality: saved.modalidad,
          scope: saved.alcance,
          careerId: saved.carrera ?? undefined,
          facultyId: saved.facultad ?? undefined,
          goalType: saved.tipo_objetivo,
          goal: saved.meta,
          wasteTypeId: saved.tipo_residuo ?? undefined,
          wasteType: item.wasteType,
          reward: saved.recompensa_puntos,
          startDate: toLocalDateTime(saved.fecha_inicio),
          endDate: toLocalDateTime(saved.fecha_fin),
          participants: saved.participantes,
          completed: saved.completados,
        };

        setStore((previousStore) => ({
          ...previousStore,
          challenges: previous
            ? previousStore.challenges.map((challenge) =>
                challenge.id === item.id ? updatedItem : challenge
              )
            : [...previousStore.challenges, updatedItem],
        }));

        await invalidarDatos();
        setEditing(null);
        setNotice("Reto guardado correctamente.");
        return;
      } catch (error) {
        console.error("Error al guardar el reto:", error);
        setNotice("No se pudo guardar el reto. Revisa la consola.");
        return;
      }
    }




// Guardado de Recompensas en Django
if (kind === "rewards") {
  try {
    const previous = source.find((x) => x.id === item.id);

    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1];

    const formData = new FormData();

    formData.append("nombre", item.name);
    formData.append("descripcion", item.description || "");
    formData.append("costo_ecucoins", String(item.cost ?? 0));
    formData.append("cantidad_disponible", String(item.stock ?? 0));
    formData.append("activa", String(item.active));

    if (image) {
      formData.append("imagen", image);
    }

    const response = await fetch(
      previous
        ? `/api/admin/recompensas/${item.id}/`
        : "/api/admin/recompensas/",
      {
        method: previous ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const saved = await response.json();

    const updatedItem: AdminEntity = {
  id: String(saved.id),
  name: saved.nombre,
  description: saved.descripcion || "",
  active: saved.activa,
  cost: saved.costo_ecucoins,
  stock: saved.cantidad_disponible,
  redeemed: saved.canjes_realizados,
  imageUrl: saved.imagen || previous?.imageUrl || "",
};

    setStore((previousStore) => ({
      ...previousStore,
      rewards: previous
        ? previousStore.rewards.map((reward) =>
            reward.id === item.id ? updatedItem : reward
          )
        : [...previousStore.rewards, updatedItem],
    }));

    await invalidarDatos();
    setEditing(null);
    setNotice("Recompensa guardada correctamente.");
    return;
  } catch (error) {
    console.error("Error al guardar la recompensa:", error);
    setNotice("No se pudo guardar la recompensa. Revisa la consola.");
    return;
  }
}



// Guardado de Insignias en Django
if (kind === "badges") {
  try {
    const previous = source.find((x) => x.id === item.id);

    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1];

    const puntos = Number(
      item.condition?.match(/\d+/)?.[0] || 0
    );

    const formData = new FormData();

    formData.append("nombre", item.name);
    formData.append("descripcion", item.description || "");
    formData.append("puntos_requeridos", String(puntos));
    formData.append("activo", String(item.active));

    if (image) {
      formData.append("imagen", image);
    }

    const response = await fetch(
      previous
        ? `/api/admin/insignias/${item.id}/`
        : "/api/admin/insignias/",
      {
        method: previous ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const saved = await response.json();

    const updatedItem: AdminEntity = {
  id: String(saved.id),
  name: saved.nombre,
  description: saved.descripcion || "",
      accepted: saved.residuos_aceptados || "",
  active: saved.activo,
  condition: `Alcanzar ${saved.puntos_requeridos} puntos`,
  obtained: saved.obtenidas,
  imageUrl: saved.imagen || previous?.imageUrl || "",
};

    setStore((previousStore) => ({
      ...previousStore,
      badges: previous
        ? previousStore.badges.map((badge) =>
            badge.id === item.id ? updatedItem : badge
          )
        : [...previousStore.badges, updatedItem],
    }));

    await invalidarDatos();
    setEditing(null);
    setNotice("Insignia guardada correctamente.");
    return;
  } catch (error) {
    console.error("Error al guardar la insignia:", error);
    setNotice("No se pudo guardar la insignia. Revisa la consola.");
    return;
  }
}


    // Guardado de puntos de reciclaje en Django
if (kind === "points") {
  try {
    const previous = source.find((x) => x.id === item.id);

    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1];

    const response = await fetch(
      previous
        ? `/api/admin/puntos-reciclaje/${item.id}/`
        : "/api/admin/puntos-reciclaje/",
      {
        method: previous ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        body: JSON.stringify({
          nombre: item.name,
          ubicacion: item.location || "",
          descripcion: item.description || "",
          residuos_aceptados: item.accepted || "",
          codigo_qr: previous?.qrCode || crypto.randomUUID(),
          activo: item.active,
          latitud:
  item.latitud != null
    ? Number(item.latitud.toFixed(7))
    : null,
longitud:
  item.longitud != null
    ? Number(item.longitud.toFixed(7))
    : null,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const saved = await response.json();

    const updatedItem: AdminEntity = {
      ...item,
      id: String(saved.id),
      name: saved.nombre,
      location: saved.ubicacion,
      active: saved.activo,
      latitud: saved.latitud,
      longitud: saved.longitud,
      qrCode: saved.codigo_qr,
    };

    setStore((previousStore) => ({
      ...previousStore,
      points: previous
        ? previousStore.points.map((point) =>
            point.id === item.id ? updatedItem : point
          )
        : [...previousStore.points, updatedItem],
    }));

    await invalidarDatos();
    setEditing(null);
    setNotice("Punto de reciclaje guardado correctamente.");
    return;
  } catch (error) {
    console.error("Error al guardar el punto de reciclaje:", error);
    setNotice("No se pudo guardar el punto de reciclaje. Revisa la consola.");
    return;
  }
}

    // Conservamos el comportamiento anterior para las demás secciones.
    const previous = source.find((x) => x.id === item.id);

    let nextStore = {
      ...store,
      [kind]: source.some((x) => x.id === item.id)
        ? source.map((x) => (x.id === item.id ? item : x))
        : [...source, item],
    } as AdminStore;

    if (previous && previous.name !== item.name && kind === "faculties") {
      nextStore = {
        ...nextStore,
        careers: nextStore.careers.map((c) =>
          c.faculty === previous.name ? { ...c, faculty: item.name } : c
        ),
        users: nextStore.users.map((u) =>
          u.faculty === previous.name ? { ...u, faculty: item.name } : u
        ),
      };
    }

    if (previous && previous.name !== item.name && kind === "careers") {
      nextStore = {
        ...nextStore,
        users: nextStore.users.map((u) =>
          u.career === previous.name
            ? { ...u, career: item.name, faculty: item.faculty || u.faculty }
            : u
        ),
      };
    }

    setStore(nextStore);
    setEditing(null);
    setNotice(`${title.slice(0, -1)} guardada correctamente.`);
  };

  const toggle = async (id: string) => {
    if (
  kind === "faculties" ||
  kind === "careers" ||
  kind === "badges" ||
  kind === "rewards" ||
  kind === "challenges" ||
  kind === "points"
) {
      try {
        const item = source.find((x) => x.id === id);
        if (!item) return;

        const csrfToken = document.cookie
          .split("; ")
          .find((cookie) => cookie.startsWith("csrftoken="))
          ?.split("=")[1];

        const endpoint =
  kind === "faculties"
    ? `/api/admin/facultades/${id}/`
    : kind === "careers"
      ? `/api/admin/carreras/${id}/`
      : kind === "badges"
        ? `/api/admin/insignias/${id}/`
        : kind === "challenges"
          ? `/api/admin/retos/${id}/`
          : kind === "points"
            ? `/api/admin/puntos-reciclaje/${id}/`
            : `/api/admin/recompensas/${id}/`;

        const response = await fetch(endpoint, {
          method: "PATCH",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken || "",
          },
          body: JSON.stringify(
  kind === "rewards"
    ? { activa: !item.active }
    : kind === "badges" ||
        kind === "challenges" ||
        kind === "points"
      ? { activo: !item.active }
      : { active: !item.active }
),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const updated = await response.json();

        setStore((previous) => ({
          ...previous,
          [kind]: previous[kind].map((entity) =>
            entity.id === id
              ? {
    ...entity,
    active:
  kind === "rewards"
    ? updated.activa
    : kind === "badges" ||
        kind === "challenges" ||
        kind === "points"
      ? updated.activo
      : updated.active,
  }
              : entity
          ),
        }));

        await invalidarDatos();
        setNotice("Estado actualizado correctamente.");
        return;
      } catch (error) {
        console.error("Error al cambiar el estado:", error);
        setNotice("No se pudo actualizar el estado.");
        return;
      }
    }

    // Comportamiento anterior para las demás secciones.
    setStore({
      ...store,
      [kind]: source.map((x) =>
        x.id === id ? { ...x, active: !x.active } : x
      ),
    });

    setNotice("Estado actualizado correctamente.");
  };

  const remove = (item: AdminEntity) => {
    const hasRelations =
  kind === "faculties"
    ? false
    : kind === "careers"
      ? false
          : kind === "points"
            ? store.recyclings.some((r) => r.point === item.name)
            : false;

    if (hasRelations) {
      return setNotice(
        "No se puede eliminar: existen registros asociados. Desactívalo en su lugar."
      );
    }

    setDeleting(item);
  };

  const confirmRemove = async () => {
    if (!deleting) return;

    if (
  kind === "faculties" ||
  kind === "careers" ||
  kind === "badges" ||
  kind === "rewards" ||
  kind === "challenges" ||
  kind === "points"
) {
      try {
        const csrfToken = document.cookie
          .split("; ")
          .find((cookie) => cookie.startsWith("csrftoken="))
          ?.split("=")[1];

        const endpoint =
  kind === "faculties"
    ? `/api/admin/facultades/${deleting.id}/`
    : kind === "careers"
      ? `/api/admin/carreras/${deleting.id}/`
      : kind === "badges"
        ? `/api/admin/insignias/${deleting.id}/`
        : kind === "rewards"
          ? `/api/admin/recompensas/${deleting.id}/`
          : kind === "points"
            ? `/api/admin/puntos-reciclaje/${deleting.id}/`
            : `/api/admin/retos/${deleting.id}/`;

        const response = await fetch(endpoint, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "X-CSRFToken": csrfToken || "",
          },
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        setStore((previous) => ({
          ...previous,
          [kind]: previous[kind].filter(
            (item) => item.id !== deleting.id
          ),
        }));

        await invalidarDatos();
        setDeleting(null);
        setNotice(
  kind === "faculties"
    ? "Facultad eliminada correctamente."
    : kind === "careers"
      ? "Carrera eliminada correctamente."
      : kind === "badges"
        ? "Insignia eliminada correctamente."
        : kind === "rewards"
          ? "Recompensa eliminada correctamente."
          : "Reto eliminado correctamente."
);
        return;
      } catch (error) {
        console.error("Error al eliminar:", error);
        setNotice(
          "No se pudo eliminar. Comprueba si existen registros asociados."
        );
        setDeleting(null);
        return;
      }
    }

    // Comportamiento anterior para las demás secciones.
    setStore({
      ...store,
      [kind]: source.filter((x) => x.id !== deleting.id),
    });

    setDeleting(null);
    setNotice("Registro eliminado.");
  };

  const visible = source.filter(
    (x) =>
      (x.name + x.description)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (statusFilter === "Todos" ||
        (statusFilter === "Activos") === x.active)
  );

  const blank: AdminEntity = {
    id: "",
    name: "",
    description: "",
    active: true,
    ...(kind === "careers"
      ? {
          faculty: store.faculties[0]?.name || "",
          facultyId: store.faculties[0]
            ? Number(store.faculties[0].id)
            : undefined,
        }
      : {}),
    ...(kind === "points"
      ? {
          location: "Campus central",
          accepted: "Plástico, papel, vidrio y metal",
        }
      : {}),
    ...(kind === "rewards"
      ? { cost: 100, stock: 25, redeemed: 0 }
      : {}),
    ...(kind === "challenges"
  ? {
      objective: "",
      startDate: "",
      endDate: "",
      reward: 100,
      participants: 0,
      completed: 0,
    }
  : {}),
    ...(kind === "badges"
      ? { condition: "Completar el objetivo", obtained: 0 }
      : {}),
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button icon={icon} onClick={() => setEditing(blank)}>
            Agregar
          </Button>
        }
      />

      <AdminNotice text={notice} />

      <AdminSearch value={search} onChange={setSearch}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {["Todos", "Activos", "Inactivos"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </AdminSearch>


      {isAcademic ? (
        <section className="card table-card">
          <table>
            <thead>
              <tr>
                {[
                  kind === "faculties" ? "Facultad" : "Carrera",
                  kind === "faculties" ? "Carreras" : "Facultad",
                  "Estudiantes",
                  "Puntos acumulados",
                  "Estado",
                  "Acciones",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>{item.name}</b>
                    <small className="table-sub">{item.description}</small>
                  </td>

                  <td>
                    {kind === "faculties"
                      ? item.total_carreras ?? 0
                      : item.faculty}
                  </td>

                  <td>{item.total_estudiantes ?? 0}</td>

                  <td>
                    {(item.points ?? 0).toLocaleString("es-ES")}
                  </td>

                  <td>
                    <Badge tone={item.active ? "green" : "gray"}>
                      {item.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>

                  <td>
                    <div className="row-actions">
                      <Button
                        variant="ghost"
                        onClick={() => setEditing(item)}
                      >
                        Editar
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => toggle(item.id)}
                      >
                        {item.active ? "Desactivar" : "Activar"}
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => remove(item)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) :  (
  <div className="management-grid"
  style={{ alignItems: "start" }}
>
          {visible.map((item) => (
            <section className="card management-card" key={item.id}>
              <div className="management-card-head">
                <span className="stat-icon">
                  <Icon name={icon} />
                </span>

                <Badge tone={item.active ? "green" : "gray"}>
                  {item.active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              {(kind === "badges" || kind === "rewards") && item.imageUrl && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      margin: "12px 0",
    }}
  >
    <img
      src={item.imageUrl}
      alt={`${kind === "badges" ? "Insignia" : "Recompensa"} ${item.name}`}
      style={{
        display: "block",
        width: "120px",
        height: "120px",
        objectFit: "contain",
        objectPosition: "center",
        margin: "0 auto",
      }}
    />
  </div>
)}

              <h3>{item.name}</h3>
              <p>{item.description}</p>

              {kind === "points" && (
                <dl>
                  <div>
                    <dt>Ubicación</dt>
                    <dd>{item.location}</dd>
                  </div>

                  <div>
                    <dt>Acepta</dt>
                    <dd>{item.accepted}</dd>
                  </div>
                </dl>
              )}

              {kind === "rewards" && (
                <div className="entity-metrics">
                  <span>
                    <b>{item.cost}</b> EcuCoins
                  </span>
                  <span>
                    <b>{item.stock}</b> disponibles
                  </span>
                  <span>
                    <b>{item.redeemed}</b> canjeadas
                  </span>
                </div>
              )}

              {kind === "challenges" && (
                <div className="entity-metrics">
                  <span>
                    <b>{item.reward}</b> pts
                  </span>
                  <span>
                    <b>{item.participants}</b> participantes
                  </span>
                  <span>
                    <b>{item.completed}</b> completados
                  </span>
                </div>
              )}

              {kind === "badges" && (
                <div className="entity-metrics">
                  <span>
                    <b>{item.obtained}</b> obtenidas
                  </span>
                  <span>{item.condition}</span>
                </div>
              )}

              <div className="row-actions">
                <Button
                  variant="ghost"
                  onClick={() => setEditing(item)}
                >
                  Editar
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => toggle(item.id)}
                >
                  {item.active ? "Desactivar" : "Activar"}
                </Button>

                <Button
                  variant="danger"
                  onClick={() => remove(item)}
                >
                  Eliminar
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}


      {editing && (
  <AdminForm
    title={
  kind === "challenges"
    ? `${editing.id ? "Editar" : "Agregar"} reto`
    : `${editing.id ? "Editar" : "Agregar"} registro`
}
    item={editing}
    isChallenge={kind === "challenges"}
    allowImage={kind === "rewards" || kind === "badges"}
    faculties={kind === "careers" || kind === "challenges" ? store.faculties : undefined}
    careers={careers}
    wasteTypes={wasteTypes}
    onSave={save}
    onClose={() => setEditing(null)}
  />
)}

      {deleting && (
        <ConfirmModal
          title={`¿Eliminar "${deleting.name}"?`}
          text="El registro desaparecerá de la lista de ejemplo."
          confirmLabel="Confirmar"
          onCancel={() => setDeleting(null)}
          onConfirm={confirmRemove}
        />
      )}
    </>
  );
}


function AdminUsers({store}:{store:AdminStore}) {

  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("Todas");
  const [selected, setSelected] = useState<AdminUser | null>(null);


const {
  data: usuarios = [],
  isLoading: cargandoUsuarios,
  error: errorConsultaUsuarios,
  refetch: recargarUsuarios,
} = useQuery<AdminUser[], Error>({
  queryKey: ["admin", "usuarios"],
  refetchOnMount: "always",
  queryFn: async () => {
    const respuesta = await fetch("/api/admin/usuarios/", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!respuesta.ok) {
      throw new Error(
        respuesta.status === 403
          ? "No tienes permisos de administrador o tu sesión ha expirado."
          : `Error al consultar usuarios (${respuesta.status}).`
      );
    }

    const datos = await respuesta.json();

    return (datos.usuarios ?? []).map((u: any): AdminUser => ({
      id: String(u.id),
      identification: u.identificacion ?? "",
      name: u.nombre,
      email: u.correo,
      code: u.codigo_qr,
      faculty: u.facultad,
      career: u.carrera,
      course: `${u.semestre}.º semestre`,
      points: u.puntos,
      level: calcularNivel(u.puntos),
      recyclings: u.total_reciclajes,
      active: u.activo,
      badges: [],
      challenges: [],
      fechaRegistro: u.fecha_registro,
      historial: u.historial ?? [],
    }));
  },
});

const errorUsuarios = errorConsultaUsuarios?.message ?? "";


  const filasFiltradas = usuarios.filter(
      (u) =>
          (u.name + u.email + u.code)
              .toLowerCase()
              .includes(search.toLowerCase()) &&
          (faculty === "Todas" || u.faculty === faculty)
  );

  const rows = filasFiltradas;

  if (cargandoUsuarios) {
    return (
        <>
          <PageHeader
              title="Usuarios"
              subtitle="Consultando los usuarios registrados en EcoCampus AI..."
          />
          <p>Cargando usuarios...</p>
        </>
    );
  }

  if (errorUsuarios) {
    return (
        <>
          <PageHeader
              title="Usuarios"
              subtitle="No se pudieron consultar los usuarios."
          />
          <p>{errorUsuarios}</p>
          <Button
  variant="ghost"
  onClick={() => recargarUsuarios()}
>
  Volver a intentar
</Button>
        </>
    );
  }






   return <><PageHeader title="Usuarios" subtitle="Consulta la información institucional y toda la actividad de cada estudiante."/><AdminSearch value={search} onChange={setSearch}><select value={faculty} onChange={e=>setFaculty(e.target.value)}><option>Todas</option>v</select></AdminSearch><section className="card table-card"><table><thead><tr>{["Usuario","Facultad / carrera","Puntos","Nivel","Reciclajes","Acciones"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(u=><tr key={u.id}><td><div className="person-cell"><div className="avatar small">{u.name.split(" ").map(x=>x[0]).join("")}</div><div><b>{u.name}</b><small className="table-sub">{u.code}</small></div></div></td><td>{u.faculty}<small className="table-sub">{u.career}</small></td><td><b>{u.points.toLocaleString("es-ES")}</b></td><td><Badge tone="blue">Nivel {u.level}</Badge></td><td>{u.recyclings}</td><td><div className="row-actions"><Button variant="ghost" icon="eye" onClick={()=>setSelected(u)}>Ver</Button></div></td></tr>)}</tbody></table></section>{selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal admin-modal user-detail-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}><Icon name="close"/></button><h2>{selected.name}</h2><p>{selected.email} · {selected.code}</p><div className="detail-grid"><div><span>Identificación</span><b>{selected.identification}</b></div><div><span>Curso</span><b>{selected.course}</b></div><div><span>Facultad</span><b>{selected.faculty}</b></div><div><span>Carrera</span><b>{selected.career}</b></div><div>
  <span>Puntos / nivel</span>
  <b>{selected.points} · Nivel {calcularNivel(selected.points)}</b>
</div><div><span>Reciclajes</span><b>{selected.recyclings}</b></div><div><span>Insignias</span><b>{selected.badges.join(", ")}</b></div><div><span>Retos</span><b>{selected.challenges.join(", ")}</b></div></div><h3>Historial reciente</h3>
<div className="compact-list">
  {selected.historial && selected.historial.length > 0 ? (
    selected.historial.map(r => (
      <div key={r.id}>
        <span>
          {new Date(r.fecha).toLocaleString("es-EC")} · {r.residuo}
          <small className="table-sub">
            {r.punto} · {r.estado}
          </small>
        </span>
        <b>+{r.puntos} pts</b>
      </div>
    ))
  ) : (
    <p>Este estudiante todavía no tiene reciclajes registrados.</p>
  )}
</div></div></div>}</>
  }


type AdminRecyclingAPI = {
  id: number;
  userId: number;
  usuario: string;
  fecha: string;
  hora: string;
  waste: string;
  point: string;
  points: number;
  status: string;
  imagen: string | null;
  confianza: number | null;
};

function AdminRecyclings({ store }: { store: AdminStore }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [selected, setSelected] = useState<AdminRecyclingAPI | null>(null);

const {
  data: recyclings = [],
  isLoading: cargandoReciclajes,
  error: errorReciclajes,
  refetch: recargarReciclajes,
} = useQuery<AdminRecyclingAPI[], Error>({
  queryKey: ["admin", "reciclajes"],
  refetchOnMount: "always",
  queryFn: async () => {
    const response = await fetch("/api/admin/reciclajes/", {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar los reciclajes.");
    }

    return response.json();
  },
});


  const traducirEstado = (estado: string) => {
    const estados: Record<string, string> = {
      PENDIENTE: "Pendiente",
      VALIDADA: "Validado",
      RECHAZADA: "Rechazado",
    };

    return estados[estado] || estado;
  };

  if (cargandoReciclajes) {
  return (
    <>
      <PageHeader
        title="Reciclajes"
        subtitle="Consultando los registros de reciclaje..."
      />
      <p>Cargando reciclajes...</p>
    </>
  );
}

if (errorReciclajes) {
  return (
    <>
      <PageHeader
        title="Reciclajes"
        subtitle="No se pudieron consultar los registros."
      />
      <p>{errorReciclajes.message}</p>
      <Button variant="ghost" onClick={() => recargarReciclajes()}>
        Volver a intentar
      </Button>
    </>
  );
}

  const rows = recyclings.filter((r) => {
    return (
      (r.usuario + " " + r.waste)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "Todos" || traducirEstado(r.status) === status)
    );
  });

  return (
    <>
      <PageHeader
        title="Reciclajes"
        subtitle="Busca y filtra registros detectados por el sistema."
      />

      <AdminSearch value={search} onChange={setSearch}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["Todos", "Pendiente", "Validado", "Rechazado"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </AdminSearch>

      <section className="card table-card">
        <table>
          <thead>
            <tr>
              {["Usuario", "Fecha", "Hora", "Residuo", "Punto", "Puntos", "Detalle"].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.usuario}</b></td>
                <td>{r.fecha}</td>
                <td>{r.hora}</td>
                <td>{r.waste}</td>
                <td>{r.point}</td>
                <td className="positive">+{r.points}</td>
                <td>
                  <Button
                    variant="ghost"
                    onClick={() => setSelected(r)}
                  >
                    Ver detalles
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected && (
        <div
          className="modal-backdrop"
          onClick={() => setSelected(null)}
        >
          <div
            className="modal admin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
            >
              <Icon name="close" />
            </button>

            <h2>Detalle del reciclaje</h2>

            <div className="detail-grid">
              <div>
                <span>Usuario</span>
                <b>{selected.usuario}</b>
              </div>

              <div>
                <span>Fecha y hora</span>
                <b>{selected.fecha} · {selected.hora}</b>
              </div>

              <div>
                <span>Residuo</span>
                <b>{selected.waste}</b>
              </div>

              <div>
                <span>Punto</span>
                <b>{selected.point}</b>
              </div>

              <div>
                <span>Puntos</span>
                <b>+{selected.points}</b>
              </div>

              <div>
                <span>Estado</span>
                <b>{traducirEstado(selected.status)}</b>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



function AdminRanking({ store }: { store: AdminStore }) {
  const [type, setType] = useState<RankingType>("Estudiantes");

const {
  data: usuariosAPI = [],
  isLoading: cargando,
  error: errorConsulta,
  refetch: recargarRanking,
} = useQuery<AdminUser[], Error>({
  queryKey: ["admin", "usuarios"],
  queryFn: async () => {
    const respuesta = await fetch("/api/admin/usuarios/", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!respuesta.ok) {
      throw new Error(
        `No se pudieron cargar los usuarios (${respuesta.status}).`
      );
    }

    const datos = await respuesta.json();

    return (datos.usuarios ?? []).map((u: any): AdminUser => ({
      id: String(u.id),
      identification: u.identificacion ?? "",
      name: u.nombre,
      email: u.correo,
      code: u.codigo_qr,
      faculty: u.facultad,
      career: u.carrera,
      course: `${u.semestre}.º semestre`,
      points: u.puntos,
      level: calcularNivel(u.puntos),
      recyclings: u.total_reciclajes,
      active: u.activo,
      badges: [],
      challenges: [],
      fechaRegistro: u.fecha_registro,
      historial: u.historial ?? [],
    }));
  },
});

const error = errorConsulta?.message ?? "";


  const users = [...usuariosAPI].sort((a, b) => b.points - a.points);

  const careers = Array.from(
    new Set(usuariosAPI.map((u) => u.career).filter(Boolean))
  )
    .map((name) => {
      const estudiantes = usuariosAPI.filter((u) => u.career === name);
      return {
        id: name,
        name,
        faculty: estudiantes[0]?.faculty ?? "—",
        points: estudiantes.reduce((s, u) => s + u.points, 0),
      };
    })
    .sort((a, b) => b.points - a.points);

  const faculties = Array.from(
    new Set(usuariosAPI.map((u) => u.faculty).filter(Boolean))
  )
    .map((name) => ({
      id: name,
      name,
      points: usuariosAPI
        .filter((u) => u.faculty === name)
        .reduce((s, u) => s + u.points, 0),
    }))
    .sort((a, b) => b.points - a.points);

  return (
    <>
      <PageHeader
        title="Ranking"
        subtitle="Clasificación calculada desde los puntos reales de los estudiantes."
      />

      <div className="tabs">
        {(["Estudiantes", "Carreras", "Facultades"] as RankingType[]).map((x) => (
          <button
            className={type === x ? "active" : ""}
            onClick={() => setType(x)}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>

      {cargando ? (
        <p>Cargando ranking...</p>
      ) : error ? (
  <>
    <p>{error}</p>
    <Button
      variant="ghost"
      onClick={() => recargarRanking()}
    >
      Volver a intentar
    </Button>
  </>
) : (
        <section className="card table-card">
          <table>
            <thead>
              <tr>
                {(type === "Estudiantes"
                  ? ["Posición", "Estudiante", "Carrera", "Facultad", "Puntos", "Nivel"]
                  : type === "Carreras"
                    ? ["Posición", "Carrera", "Facultad", "Puntos"]
                    : ["Posición", "Facultad", "Puntos"]
                ).map((x) => <th key={x}>{x}</th>)}
              </tr>
            </thead>
            <tbody>
              {type === "Estudiantes" &&
                users.map((u, i) => (
                  <tr key={u.id}>
                    <td>#{i + 1}</td>
                    <td><b>{u.name}</b></td>
                    <td>{u.career}</td>
                    <td>{u.faculty}</td>
                    <td>{u.points.toLocaleString("es-ES")}</td>
                    <td>Nivel {calcularNivel(u.points)}</td>
                  </tr>
                ))}

              {type === "Carreras" &&
                careers.map((c, i) => (
                  <tr key={c.id}>
                    <td>#{i + 1}</td>
                    <td><b>{c.name}</b></td>
                    <td>{c.faculty}</td>
                    <td>{c.points.toLocaleString("es-ES")}</td>
                  </tr>
                ))}

              {type === "Facultades" &&
                faculties.map((f, i) => (
                  <tr key={f.id}>
                    <td>#{i + 1}</td>
                    <td><b>{f.name}</b></td>
                    <td>{f.points.toLocaleString("es-ES")}</td>
                  </tr>
                ))}

              {type === "Estudiantes" && users.length === 0 && (
                <tr><td colSpan={6}>Todavía no hay estudiantes registrados.</td></tr>
              )}

              {type === "Carreras" && careers.length === 0 && (
                <tr><td colSpan={4}>No hay carreras registradas.</td></tr>
              )}

              {type === "Facultades" && faculties.length === 0 && (
                <tr><td colSpan={3}>No hay facultades registradas.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}


function AdminDashboardV2({store,setPage}:{store:AdminStore;setPage:(p:string)=>void}){

  const [notice, setNotice] = useState("");

const {
  data: dashboard,
  isLoading: cargandoDashboard,
  error: errorConsultaDashboard,
  refetch: recargarDashboard,
} = useQuery<{
  usuarios_registrados: number;
  usuarios_activos: number;
  total_reciclajes: number;
  puntos_generados: number;
  facultades: {
    facultad: string;
    puntos: number;
    estudiantes: number;
  }[];
}, Error>({
  queryKey: ["admin", "dashboard"],
  queryFn: async () => {
    const respuesta = await fetch("/api/admin/dashboard/", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!respuesta.ok) {
      throw new Error(
        `Error al cargar el Dashboard (${respuesta.status}).`
      );
    }

    return respuesta.json();
  },
});

const errorDashboard = errorConsultaDashboard?.message ?? "";


  const total = dashboard?.puntos_generados ?? 0;

  if (cargandoDashboard) {
  return (
    <>
      <PageHeader
        title="Panel de Gestión Ambiental"
        subtitle="Consultando las estadísticas de EcoCampus AI..."
      />
      <p>Cargando estadísticas...</p>
    </>
  );
}

if (errorDashboard) {
  return (
    <>
      <PageHeader
        title="Panel de Gestión Ambiental"
        subtitle="No se pudieron cargar las estadísticas."
      />
      <p>{errorDashboard}</p>
      <Button
        variant="ghost"
        onClick={() => recargarDashboard()}
      >
        Volver a intentar
      </Button>
    </>
  );
}

 return <><PageHeader title="Panel de Gestión Ambiental" subtitle="Resumen conectado de EcoCampus AI" action={<Button variant="secondary" icon="download" onClick={()=>setNotice("Exportación simulada del resumen.")}>Exportar resumen</Button>}/><AdminNotice text={notice}/><div className="admin-stats"><StatCard
  icon="users"
  label="Usuarios registrados"
  value={String(dashboard?.usuarios_registrados ?? 0)}
  note={`${dashboard?.usuarios_activos ?? 0} activos`}
/><StatCard
  icon="history"
  label="Total de reciclajes"
  value={String(dashboard?.total_reciclajes ?? 0)}
  note="Registros almacenados en la base de datos"
/><StatCard icon="star" label="Puntos generados" value={total.toLocaleString("es-ES")}/><StatCard icon="leaf" label="Facultades / carreras" value={`${store.faculties.length} / ${store.careers.length}`}/><StatCard icon="target" label="Retos activos" value={String(store.challenges.filter(x=>x.active).length)}/><StatCard icon="gift" label="Recompensas activas" value={String(store.rewards.filter(x=>x.active).length)}/><StatCard icon="award" label="Insignias" value={String(store.badges.length)}/></div><div className="admin-charts"><section className="card panel"><div className="panel-title"><div><h3>Participación por facultad</h3><p>Puntos acumulados desde los usuarios</p></div></div>{(dashboard?.facultades ?? []).map((f) => {
  const maxPuntos = Math.max(
    ...(dashboard?.facultades ?? []).map((fac) => fac.puntos),
    1
  );

  return (
    <div className="faculty-row" key={f.facultad}>
      <div>
        <span>{f.facultad || "Sin facultad asignada"}</span>
        <b>{f.puntos.toLocaleString("es-ES")}</b>
      </div>

      <div className="progress small">
        <i
          style={{
            width: `${Math.min(100, (f.puntos / maxPuntos) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
})}</section><section className="card panel"><div className="panel-title"><div><h3>Acciones pendientes</h3><p>Elementos que requieren atención</p></div></div><div className="quick-actions"><button onClick={()=>setPage("Puntos de reciclaje")}><span><Icon name="pin"/></span><div><b>{store.points.filter(p=>!p.active).length} puntos</b><small>Inactivos o en mantenimiento</small></div><Icon name="chevron"/></button></div></section></div></>
}


function AdminReportsV2({ store }: { store: AdminStore }) {
  const [report, setReport] = useState("Reciclajes");
  const [period, setPeriod] = useState("Este mes");
  const [generated, setGenerated] = useState(false);
  const [notice, setNotice] = useState("");

const [facultyId, setFacultyId] = useState("");

const {
  data: reportData,
  isFetching: loading,
  refetch: consultarReporte,
} = useQuery<any, Error>({
  queryKey: ["admin", "reportes", report, period, facultyId],
  enabled: false,
  queryFn: async () => {
    const params = new URLSearchParams({
      tipo: report,
      periodo: period,
    });

    if (facultyId) {
      params.set("facultad_id", facultyId);
    }

    const response = await fetch(
      `/api/admin/reportes/?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Error al generar el reporte: ${response.status}`
      );
    }

    return response.json();
  },
});

const generarReporte = async () => {
  setNotice("");

  try {
    await consultarReporte({ throwOnError: true });
    setGenerated(true);
  } catch (error) {
    console.error(error);
    setGenerated(false);
    setNotice(
      "No se pudo generar el reporte. Verifica la conexión con Django."
    );
  }
};


  const exportarExcel = async () => {
  setNotice("");

  try {
    const params = new URLSearchParams({
      tipo: report,
      periodo: period,
      formato: "excel",
    });

    if (facultyId) {
      params.set("facultad_id", facultyId);
    }

    const response = await fetch(
      `/api/admin/reportes/?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Error al exportar: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `reporte_${report.replace(/\s+/g, "_")}.xlsx`;

    document.body.appendChild(enlace);
    enlace.click();

    enlace.remove();
    window.URL.revokeObjectURL(url);

    setNotice("El reporte Excel se descargó correctamente.");
  } catch (error) {
    console.error(error);
    setNotice("No se pudo exportar el reporte a Excel.");
  }
};

  const exportarPDF = async () => {
  setNotice("");

  try {
    const params = new URLSearchParams({
      tipo: report,
      periodo: period,
      formato: "pdf",
    });

    if (facultyId) {
      params.set("facultad_id", facultyId);
    }

    const response = await fetch(
      `/api/admin/reportes/?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Error al exportar: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `reporte_${report.replace(/\s+/g, "_")}.pdf`;

    document.body.appendChild(enlace);
    enlace.click();

    enlace.remove();
    window.URL.revokeObjectURL(url);

    setNotice("El reporte PDF se descargó correctamente.");
  } catch (error) {
    console.error(error);
    setNotice("No se pudo exportar el reporte a PDF.");
  }
};

  // Indicadores según el tipo de reporte
  const obtenerIndicadores = () => {
    const r = reportData?.resumen ?? {};

    switch (report) {
      case "Reciclajes":
        return [
          { label: "Reciclajes", value: r.total_reciclajes ?? 0 },
          { label: "Puntos generados", value: r.puntos_generados ?? 0 },
          { label: "Cantidad reciclada", value: r.cantidad_reciclada ?? 0 },
        ];

      case "Puntos obtenidos":
        return [
          { label: "Puntos obtenidos", value: r.total_puntos ?? 0 },
          { label: "Reciclajes", value: r.total_reciclajes ?? 0 },
        ];

      case "Participación de usuarios":
        return [
          { label: "Estudiantes participantes", value: r.total_estudiantes ?? 0 },
          { label: "Actividades", value: r.total_actividades ?? 0 },
          { label: "Puntos generados", value: r.total_puntos ?? 0 },
        ];

      case "Carreras":
        return [
          { label: "Carreras", value: r.total_carreras ?? 0 },
          { label: "Estudiantes", value: r.total_estudiantes ?? 0 },
          { label: "Puntos generados", value: r.total_puntos ?? 0 },
        ];

      case "Facultades":
        return [
          { label: "Facultades", value: r.total_facultades ?? 0 },
          { label: "Estudiantes", value: r.total_estudiantes ?? 0 },
          { label: "Puntos generados", value: r.total_puntos ?? 0 },
        ];

      case "Recompensas canjeadas":
        return [
          { label: "Canjes realizados", value: r.total_canjes ?? 0 },
          { label: "EcuCoins utilizados", value: r.ecucoins_utilizados ?? 0 },
        ];

      case "Retos completados":
        return [
          { label: "Retos completados", value: r.total_completados ?? 0 },
          { label: "Estudiantes participantes", value: r.total_estudiantes ?? 0 },
        ];

      case "Insignias obtenidas":
        return [
          { label: "Insignias alcanzadas", value: r.total_insignias_alcanzadas ?? 0 },
          { label: "Estudiantes", value: r.total_estudiantes ?? 0 },
          { label: "Tipos de insignias", value: r.total_insignias ?? 0 },
        ];

      default:
        return [];
    }
  };

  // Información agrupada para la vista previa
  const obtenerElementos = () => {
    if (!reportData) return [];

    switch (report) {
      case "Reciclajes":
        return (reportData.materiales ?? []).map((item: any) => ({
          titulo: item.material,
          descripcion: `${item.reciclajes} reciclajes`,
          valor: `${item.puntos} pts`,
        }));

      case "Puntos obtenidos":
        return (reportData.carreras ?? []).map((item: any) => ({
          titulo: item.carrera,
          descripcion: `${item.reciclajes} reciclajes`,
          valor: `${item.puntos} pts`,
        }));

      case "Participación de usuarios":
        return (reportData.detalle ?? []).map((item: any) => ({
          titulo: item.estudiante,
          descripcion: `${item.facultad} · ${item.carrera}`,
          valor: `${item.actividades} actividades · ${item.puntos} pts`,
        }));

      case "Carreras":
        return (reportData.carreras ?? []).map((item: any) => ({
          titulo: item.carrera,
          descripcion: `${item.facultad} · ${item.total_estudiantes} estudiantes`,
          valor: `${item.total_reciclajes} reciclajes · ${item.puntos} pts`,
        }));

      case "Facultades":
        return (reportData.facultades ?? []).map((item: any) => ({
          titulo: item.facultad,
          descripcion: `${item.total_carreras} carreras · ${item.total_estudiantes} estudiantes`,
          valor: `${item.total_reciclajes} reciclajes · ${item.puntos} pts`,
        }));

      case "Recompensas canjeadas":
        return (reportData.recompensas ?? []).map((item: any) => ({
          titulo: item.recompensa,
          descripcion: `${item.total_canjes} canjes`,
          valor: `${item.ecucoins} EcuCoins`,
        }));

      case "Retos completados":
        return (reportData.retos ?? []).map((item: any) => ({
          titulo: item.reto,
          descripcion: `${item.total_completados} completados`,
          valor: `${item.total_estudiantes} estudiantes`,
        }));

      case "Insignias obtenidas":
        return (reportData.insignias ?? []).map((item: any) => ({
          titulo: item.insignia,
          descripcion: `${item.puntos_requeridos} puntos requeridos`,
          valor: `${item.estudiantes} estudiantes`,
        }));

      default:
        return [];
    }
  };

  const indicadores = obtenerIndicadores();
  const elementos = obtenerElementos();

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle="Analiza y exporta información consolidada del sistema."
      />

      <AdminNotice text={notice} />

      <div className="reports-layout">
        <section className="card report-builder">
          <h3>Configurar reporte</h3>

          <label>
            Tipo de reporte
            <select
              value={report}
              onChange={(e) => {
                setReport(e.target.value);
                setGenerated(false);

              }}
            >
              {[
                "Reciclajes",
                "Puntos obtenidos",
                "Participación de usuarios",
                "Carreras",
                "Facultades",
                "Recompensas canjeadas",
                "Retos completados",
                "Insignias obtenidas",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Período
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setGenerated(false);

              }}
            >
              <option>Esta semana</option>
              <option>Este mes</option>
              <option>Este semestre</option>
              <option>Todo el tiempo</option>
            </select>
          </label>

          <label>
            Facultad
            <select
              value={facultyId}
              onChange={(e) => {
                setFacultyId(e.target.value);
                setGenerated(false);

              }}
            >
              <option value="">Todas las facultades</option>
              {store.faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <Button icon="file" onClick={generarReporte}>
            {loading ? "Generando..." : "Generar reporte"}
          </Button>
        </section>

        <section className="card report-preview">
          <div className="preview-head">
            <div>
              <span>VISTA PREVIA</span>
              <h3>Reporte de {report.toLowerCase()}</h3>
              <p>
                UNEMI · {reportData?.periodo ?? period}
              </p>
            </div>
            <Logo compact />
          </div>

          {generated && reportData ? (
            <>
              <div className="report-kpis">
                {indicadores.map((item, index) => (
                  <div key={index}>
                    <b>{item.value}</b>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {reportData.nota && (
                <p className="report-note">{reportData.nota}</p>
              )}

              <div className="compact-list">
                {elementos.length > 0 ? (
                  elementos.map((item: any, index: number) => (
                    <div key={index}>
                      <span>
                        <strong>{item.titulo}</strong>
                        <small>{item.descripcion}</small>
                      </span>
                      <b>{item.valor}</b>
                    </div>
                  ))
                ) : (
                  <p>No hay registros para este reporte y período.</p>
                )}
              </div>

              <div className="export-actions">
                <Button
  variant="secondary"
  icon="download"
  onClick={exportarPDF}
>
  Exportar PDF
</Button>

                <Button
  variant="secondary"
  icon="download"
  onClick={exportarExcel}
>
  Exportar Excel
</Button>
              </div>
            </>
          ) : (
            <div className="empty-preview">
              <Icon name="file" size={42} />
              <h3>Genera un reporte para ver la vista previa</h3>
              <p>
                Selecciona los filtros y pulsa "Generar reporte".
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}



function AdminConfigV2({
  store,
  setStore
}: {
  store: AdminStore;
  setStore: (s: AdminStore) => void
}) {

  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const [nuevoValor, setNuevoValor] = useState("5");

const [editorAbierto, setEditorAbierto] = useState(false);
const [saving, setSaving] = useState(false);

const {
  data: configuracion,
  isLoading: loading,
  refetch: cargarConfiguracion,
} = useQuery<{ puntos_por_ecucoin: number }, Error>({
  queryKey: ["admin", "configuracion"],
  refetchOnMount: "always",
  queryFn: async () => {
    const response = await fetch("/api/admin/configuracion/", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("No se pudo consultar la configuración.");
    }

    return response.json();
  },
});

const puntos = String(configuracion?.puntos_por_ecucoin ?? 5);

// Obtener el token CSRF de Django
const obtenerCSRF = () => {
  const cookies = document.cookie.split(";");

  const csrfCookie = cookies.find(cookie =>
    cookie.trim().startsWith("csrftoken=")
  );

  return csrfCookie
    ? decodeURIComponent(csrfCookie.split("=")[1])
    : "";
};

// Abrir editor y consultar el valor actual
const abrirEditor = async () => {
  setNotice("");

  try {
    const resultado = await cargarConfiguracion();

    if (resultado.data) {
      setNuevoValor(
        String(resultado.data.puntos_por_ecucoin)
      );
    }

    setEditorAbierto(true);
  } catch (error) {
    console.error(error);
    setNotice("No se pudo cargar la regla de conversión.");
  }
};

  // Guardar nueva equivalencia
  const guardarConversion = async () => {
    const valor = Number(nuevoValor);

    if (
      !Number.isInteger(valor) ||
      valor < 1 ||
      valor > 10000
    ) {
      setNotice("Ingresa un número entero entre 1 y 10000.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/admin/configuracion/", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": obtenerCSRF()
        },
        body: JSON.stringify({
          puntos_por_ecucoin: valor
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo guardar la conversión."
        );
      }

      setNuevoValor(String(data.puntos_por_ecucoin));

queryClient.setQueryData(
  ["admin", "configuracion"],
  data
);

await queryClient.invalidateQueries({
  queryKey: ["perfil"],
});

await queryClient.invalidateQueries({
  queryKey: ["mis-recompensas"],
});

setEditorAbierto(false);
setNotice("La regla de conversión se actualizó correctamente.");

    } catch (error) {
      console.error(error);

      setNotice(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al guardar la conversión."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Parámetros generales y mantenimiento de EcoCampus AI."
      />

      <AdminNotice text={notice} />

      <div className="settings-grid">

        {/* NOTIFICACIONES */}
        <section className="card setting-panel">
          <span>
            <Icon name="bell" />
          </span>

          <div>
            <h3>Notificaciones</h3>
            <p>Avisos de validaciones, canjes y actividad.</p>

            <Button
              variant="secondary"
              onClick={() => {
                setNotifications(!notifications);
                setNotice(
                  `Notificaciones ${
                    notifications ? "desactivadas" : "activadas"
                  }.`
                );
              }}
            >
              {notifications ? "Desactivar" : "Activar"}
            </Button>
          </div>
        </section>

        {/* CONVERSIÓN */}
        <section className="card setting-panel">
          <span>
            <Icon name="coin" />
          </span>

          <div>
            <h3>Conversión</h3>

            <p>
              {loading
                ? "Consultando regla..."
                : `${puntos} puntos = 1 EcuCoin.`}
            </p>

            <Button
              variant="secondary"
              onClick={abrirEditor}
              disabled={loading}
            >
              Verificar regla
            </Button>
          </div>
        </section>

        {/* RESTAURAR DATOS */}
        <section className="card setting-panel danger-panel">
          <span>
            <Icon name="settings" />
          </span>

          <div>
            <h3>Restaurar datos</h3>
            <p>Vuelve al conjunto inicial del prototipo.</p>

            <Button
              variant="danger"
              onClick={() => setConfirming(true)}
            >
              Restaurar demostración
            </Button>
          </div>
        </section>
      </div>

      {/* EDITOR DE CONVERSIÓN */}
      {editorAbierto && (
        <div
          onClick={() => {
            if (!saving) setEditorAbierto(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--card, white)",
              color: "var(--text, #222)",
              width: "100%",
              maxWidth: "420px",
              padding: "26px",
              borderRadius: "14px",
              boxShadow: "0 15px 45px rgba(0,0,0,0.2)"
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Editar conversión
            </h3>

            <p>
              Define cuántos puntos necesita un estudiante
              para obtener 1 EcuCoin.
            </p>

            <label
              htmlFor="nueva-conversion"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600
              }}
            >
              Puntos por EcuCoin
            </label>

            <input
              id="nueva-conversion"
              type="number"
              min="1"
              max="10000"
              step="1"
              value={nuevoValor}
              disabled={saving || loading}
              onChange={e => setNuevoValor(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                fontSize: "16px",
                marginBottom: "12px"
              }}
            />

            <p style={{ fontSize: "14px", opacity: 0.75 }}>
              {nuevoValor || "0"} puntos = 1 EcuCoin
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "22px"
              }}
            >
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => setEditorAbierto(false)}
              >
                Cancelar
              </Button>

              <Button
                disabled={saving || loading}
                onClick={guardarConversion}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACIÓN DE RESTAURACIÓN */}
      {confirming && (
        <ConfirmModal
          title="¿Restaurar datos de demostración?"
          text="Se volverá al conjunto inicial de datos de ejemplo."
          confirmLabel="Confirmar"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setStore(createAdminStore());
            setConfirming(false);
            setNotice("Datos restaurados.");
          }}
        />
      )}
    </>
  );
}


function AdminConsole({page,setPage}:{page:string;setPage:(p:string)=>void}){
 const [store,setStore]=useState<AdminStore>(createAdminStore);

const { data: estructuraAcademica } = useQuery({
  queryKey: ["admin", "estructura-academica"],
  queryFn: async () => {
    const [respuestaFacultades, respuestaCarreras] = await Promise.all([
      fetch("/api/admin/facultades/", {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
      fetch("/api/admin/carreras/", {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
    ]);

    if (!respuestaFacultades.ok || !respuestaCarreras.ok) {
      throw new Error("No se pudieron cargar las facultades y carreras.");
    }

    const datosFacultades = await respuestaFacultades.json();
    const datosCarreras = await respuestaCarreras.json();

    return {
      faculties: datosFacultades.map((f: any) => ({
        id: String(f.id),
        name: f.name,
        description: f.description || "",
        active: f.active,
        total_carreras: f.total_carreras,
        total_estudiantes: f.total_estudiantes,
        points: f.points,
      })),
      careers: datosCarreras.map((c: any) => ({
        id: String(c.id),
        name: c.name,
        description: c.description || "",
        active: c.active,
        faculty: c.faculty,
        facultyId: c.faculty_id,
        total_estudiantes: c.total_estudiantes,
        points: c.points,
      })),
    };
  },
});

useEffect(() => {
  if (!estructuraAcademica) return;

  setStore((anterior) => ({
    ...anterior,
    faculties: estructuraAcademica.faculties,
    careers: estructuraAcademica.careers,
  }));
}, [estructuraAcademica]);



 if(page==="Dashboard")return <AdminDashboardV2 store={store} setPage={setPage}/>;
 if(page==="Usuarios")return <AdminUsers store={store}/>;
 if(page==="Facultades")return <AdminEntities title="Facultades" subtitle="Administra la estructura académica, sus carreras y estudiantes." kind="faculties" store={store} setStore={setStore}/>;
 if(page==="Carreras")return <AdminEntities title="Carreras" subtitle="Gestiona carreras y su relación obligatoria con una facultad." kind="careers" store={store} setStore={setStore}/>;
 if(page==="Reciclajes")return <AdminRecyclings store={store}/>;
 if(page==="Puntos de reciclaje")return <AdminEntities title="Puntos de reciclaje" subtitle="Gestiona ubicación, disponibilidad y residuos aceptados." kind="points" store={store} setStore={setStore}/>;
 if(page==="Mapa de utilización")return <CampusMap admin={true}/>;
 if(page==="Ranking")return <AdminRanking store={store}/>;
 if(page==="Recompensas")return <AdminEntities title="Recompensas" subtitle="Crea y administra recompensas visibles para estudiantes." kind="rewards" store={store} setStore={setStore}/>;
 if(page==="Retos")return <AdminEntities title="Retos" subtitle="Define objetivos, períodos, puntos y participación." kind="challenges" store={store} setStore={setStore}/>;
 if(page==="Insignias")return <AdminEntities title="Insignias" subtitle="Gestiona reconocimientos y sus condiciones de obtención." kind="badges" store={store} setStore={setStore}/>;
 if(page==="Reportes")return <AdminReportsV2 store={store}/>;
 return <AdminConfigV2 store={store} setStore={setStore}/>;
}


function AdminPage({page,setPage}:{page:string;setPage:(p:string)=>void}){
 return <AdminConsole page={page} setPage={setPage}/>;
}


async function obtenerPerfil(): Promise<PerfilEstudiante> {
  const response = await fetch("/api/perfil/", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar el perfil del estudiante.");
  }

  return response.json();
}


function EstacionReciclaje() {
  const {
  data: puntos = [],
  isLoading: cargando,
  error: errorConsultaPuntos,
} = useQuery<
  { id: number; nombre: string; ubicacion: string; activo: boolean }[],
  Error
>({
  queryKey: ["estacion", "puntos-reciclaje"],
  queryFn: async () => {
    const response = await fetch("/api/estacion/puntos-reciclaje/", {
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("No se pudieron cargar los puntos.");
    }

    return response.json();
  },
});

const error = errorConsultaPuntos?.message ?? "";
const [puntoSeleccionado, setPuntoSeleccionado] = useState("");
  const [errorCamara, setErrorCamara] = useState("");
  const [cameraActiva, setCameraActiva] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [qrLeido, setQrLeido] = useState("");
  const [estudianteIdentificado, setEstudianteIdentificado] = useState<{
  nombre: string;
  facultad: string;
  carrera: string;
} | null>(null);
  const [estadoEstacion, setEstadoEstacion] = useState<
  | "ESPERANDO_QR"
  | "IDENTIFICANDO"
  | "DETECTANDO"
  | "VERIFICANDO_DEPOSITO"
  | "REGISTRANDO"
  | "FINALIZADO"
>("ESPERANDO_QR");
  const [reiniciarLectorQR, setReiniciarLectorQR] = useState(0);

  const [detecciones, setDetecciones] = useState<
  {
    clase: string;
    confianza: number;
    coordenadas: number[];
  }[]
>([]);

  const [procesandoDeteccion, setProcesandoDeteccion] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlesQRRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
  let cancelado = false;

  async function iniciarLectorQR() {
    const video = videoRef.current;

    if (!cameraActiva || !video || !streamRef.current) return;

    video.srcObject = streamRef.current;

    try {
      await video.play();

      const lector = new BrowserQRCodeReader();

      const controles = await lector.decodeFromVideoElement(
        video,
        (resultado) => {
          if (resultado) {
  const codigo = resultado.getText();
  setEstadoEstacion("IDENTIFICANDO");

  setQrLeido(codigo);
  controlesQRRef.current?.stop();

  fetch("/api/estacion/validar-qr/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      codigo_qr: codigo,
    }),
  })
    .then(async (response) => {
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo identificar al estudiante.");
      }

      return data;
    })
    .then((data) => {
  setEstudianteIdentificado(data.estudiante);
  setEstadoEstacion("DETECTANDO");

  console.log("Estudiante identificado:", data.estudiante);
})
    .catch((error) => {
  console.error("Error al validar QR:", error);

  setEstudianteIdentificado(null);
  setQrLeido("");
  setEstadoEstacion("ESPERANDO_QR");

  setReiniciarLectorQR((anterior) => anterior + 1);
});
}
        }
      );

      if (cancelado) {
        controles.stop();
      } else {
        controlesQRRef.current = controles;
      }
    } catch (error) {
      if (!cancelado) {
        console.error("Error al leer el QR:", error);
        setErrorCamara("No se pudo iniciar el lector QR.");
      }
    }
  }

  iniciarLectorQR();

  return () => {
    cancelado = true;
    controlesQRRef.current?.stop();
    controlesQRRef.current = null;
  };
}, [cameraActiva, reiniciarLectorQR]);


  useEffect(() => {
  if (!cameraActiva || estadoEstacion !== "DETECTANDO") return;

  let solicitudEnCurso = false;

  async function analizarImagen() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.videoWidth === 0 || solicitudEnCurso) {
      return;
    }

    solicitudEnCurso = true;
    setProcesandoDeteccion(true);

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const contexto = canvas.getContext("2d");

      if (!contexto) return;

      contexto.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imagen = canvas.toDataURL("image/jpeg", 0.7);

      console.log("Enviando imagen a YOLO...");
      const inicioAnalisis = performance.now();
      const response = await fetch("/api/detectar-residuo/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imagen }),
      });

      const data = await response.json();
      console.log(
  "Tiempo de análisis:",
  Math.round(performance.now() - inicioAnalisis),
  "ms"
);

      if (!response.ok) {
        throw new Error(data.error || "Error al analizar la imagen.");
      }

      setDetecciones(data.detecciones ?? []);
      dibujarDetecciones(data.detecciones ?? []);
      console.log(
  "Objetos rastreados:",
  JSON.stringify(data.detecciones, null, 2)
);
    } catch (error) {
      console.error("Error en la detección YOLO:", error);

    } finally {
      solicitudEnCurso = false;
      setProcesandoDeteccion(false);
    }
  }

  function dibujarDetecciones(detecciones: any[]) {
  const canvas = overlayRef.current;
  const video = videoRef.current;

  if (!canvas || !video) return;

  const contexto = canvas.getContext("2d");
  if (!contexto) return;

  const ancho = video.videoWidth;
  const alto = video.videoHeight;

  if (!ancho || !alto) return;

  canvas.width = ancho;
  canvas.height = alto;

  contexto.clearRect(0, 0, ancho, alto);

  detecciones.forEach((deteccion) => {
    const [x1, y1, x2, y2] = deteccion.coordenadas;

    const anchoCaja = x2 - x1;
    const altoCaja = y2 - y1;

    const etiqueta = `${deteccion.clase} ${deteccion.confianza}% | ID ${deteccion.track_id}`;

    // Cuadro de detección
    contexto.strokeStyle = "#00FF66";
    contexto.lineWidth = 3;
    contexto.strokeRect(x1, y1, anchoCaja, altoCaja);

    // Fondo de la etiqueta
    contexto.font = "bold 16px Arial";

    const anchoTexto = contexto.measureText(etiqueta).width + 12;
    const altoTexto = 26;

    contexto.fillStyle = "#00FF66";
    contexto.fillRect(
      x1,
      Math.max(0, y1 - altoTexto),
      anchoTexto,
      altoTexto
    );

    // Texto
    contexto.fillStyle = "#000000";
    contexto.fillText(
      etiqueta,
      x1 + 6,
      Math.max(18, y1 - 8)
    );
  });
}

  const intervalo = window.setInterval(analizarImagen, 200);

  return () => {
    window.clearInterval(intervalo);
  };
}, [cameraActiva, estadoEstacion]);

  async function iniciarCamara() {
    try {
      setErrorCamara("");

      if (!navigator.mediaDevices?.getUserMedia) {
  throw new Error("El navegador no permite acceder a la cámara.");
}

const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15, max: 20 },
  },
  audio: false,
});

      streamRef.current = stream;
setCameraActiva(true);
    } catch (error) {
  console.error("Error al activar la cámara:", error);

  setErrorCamara(
    error instanceof Error
      ? error.message
      : "No se pudo activar la cámara."
  );
}
  }

  function detenerCamara() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActiva(false);
  }

  return (
    <main className="station-page">
      <h1>EcoCampus AI</h1>
      <h2>Estación de reciclaje</h2>
      <div>
  <strong>Estado de la estación: </strong>

  {estadoEstacion === "ESPERANDO_QR" && "Esperando código QR..."}
  {estadoEstacion === "IDENTIFICANDO" && "Identificando estudiante..."}
  {estadoEstacion === "DETECTANDO" && "Detectando residuos..."}
  {estadoEstacion === "VERIFICANDO_DEPOSITO" && "Verificando depósito..."}
  {estadoEstacion === "REGISTRANDO" && "Registrando reciclaje..."}
  {estadoEstacion === "FINALIZADO" && "Proceso finalizado."}
</div>

      <p>Selecciona el punto de reciclaje que representa este dispositivo.</p>

      {cargando ? (
        <p>Cargando puntos de reciclaje...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <select
          value={puntoSeleccionado}
          onChange={(e) => setPuntoSeleccionado(e.target.value)}
          disabled={cameraActiva}
        >
          <option value="">Selecciona un punto</option>
          {puntos.map((punto) => (
            <option key={punto.id} value={punto.id}>
              {punto.nombre} - {punto.ubicacion}
            </option>
          ))}
        </select>
      )}

      <div>
        {!cameraActiva ? (
          <button
            onClick={iniciarCamara}
            disabled={!puntoSeleccionado}
          >
            Iniciar estación
          </button>
        ) : (
          <button onClick={detenerCamara}>
            Detener cámara
          </button>
        )}
      </div>

      {errorCamara && <p>{errorCamara}</p>}

      {cameraActiva && (
        <section>
          <h3>Cámara de la estación activa</h3>
          <div
  style={{
    position: "relative",
    width: "100%",
    maxWidth: "600px",
    overflow: "hidden",
  }}
>
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    style={{
      width: "100%",
      display: "block",
    }}
  />

  <canvas
    ref={overlayRef}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    }}
  />
</div>
          <canvas
  ref={canvasRef}
  style={{ display: "none" }}
/>
          {qrLeido && estudianteIdentificado ? (
  <div>
    <h3>¡Estudiante identificado!</h3>
    <p><strong>Nombre:</strong> {estudianteIdentificado.nombre}</p>
    <p><strong>Facultad:</strong> {estudianteIdentificado.facultad}</p>
    <p><strong>Carrera:</strong> {estudianteIdentificado.carrera}</p>
    <p><strong>Estado:</strong> Identificación correcta</p>
  </div>
) : qrLeido ? (
  <p>Verificando estudiante en la base de datos...</p>
) : (
  <p>Esperando que un estudiante presente su código QR...</p>
)}
          {estudianteIdentificado && (
  <section>
    <h3>Detección de residuos con YOLOv8</h3>

    {procesandoDeteccion && (
      <p>Analizando imagen de la cámara...</p>
    )}

    {detecciones.length > 0 ? (
      <div>
        {detecciones.map((deteccion, index) => (
          <div key={index}>
            <strong>{deteccion.clase}</strong>
            <p>
              Confianza: {deteccion.confianza.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p>No se han detectado residuos todavía.</p>
    )}
  </section>
)}
        </section>
      )}
    </main>
  );
}



export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const esEstacion = window.location.pathname === "/estacion-reciclaje";
  const [checkingSession, setCheckingSession] = useState(true);
  const queryClient = useQueryClient();

  type UsuarioSesion = {
  id: number;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  nombre_completo: string;
};

const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch("/api/sesion/", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("No se pudo comprobar la sesión");
        }

        const data = await response.json();

        if (!cancelled && data.autenticado) {
  setRole(data.rol as Role);
  setUsuario(data.usuario);
}
      } catch (error) {
        console.error(
          "Error al comprobar la sesión:",
          error
        );
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
  try {
    const csrfResponse = await fetch("/api/csrf/", {
      credentials: "include",
    });

    if (!csrfResponse.ok) {
      throw new Error("No se pudo obtener el token de seguridad.");
    }

    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrftoken="))
      ?.split("=")[1];

    if (!csrfToken) {
      throw new Error("No se encontró el token CSRF.");
    }

    const response = await fetch("/api/logout/", {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRFToken": decodeURIComponent(csrfToken),
      },
    });

    if (!response.ok) {
      throw new Error("No se pudo cerrar la sesión en Django.");
    }

    queryClient.clear();
setRole(null);
setUsuario(null);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    alert("No se pudo cerrar la sesión. Inténtalo de nuevo.");
  }
};

  if (esEstacion) {
  return <EstacionReciclaje />;
}

if (checkingSession) {
  return <div>Cargando EcoCampus AI...</div>;
}

  return role ? (
    <Shell role={role} logout={handleLogout} usuario={usuario} />
  ) : (
    <Login
  onLogin={(nuevoRol, nuevoUsuario) => {
    setRole(nuevoRol);
    setUsuario(nuevoUsuario);
  }}
/>
  );
}
