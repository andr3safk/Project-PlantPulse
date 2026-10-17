import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./contexts/AuthContext";
import { Sprout } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const validateForm = (): string | null => {
    if (!email.trim()) return "El correo electrónico es obligatorio";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return "Ingresa un correo válido";
    if (!password) return "La contraseña es obligatoria";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validateForm();
    if (v) { setError(v); return; }
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "No se pudo conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Lado izquierdo — imagen/verde */}
      <div className="hidden md:flex w-1/2 relative overflow-hidden bg-emerald-800">
        <img
          src="https://images.unsplash.com/photo-1463936575829-25148e1db1b8?q=80&w=2070&auto=format&fit=crop"
          alt="Planta"
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white/90 space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm">
              <Sprout className="w-8 h-8 text-emerald-300" />
            </div>
            <span className="text-2xl font-bold tracking-tight">PlantPulse</span>
          </div>
          <p className="text-lg leading-relaxed max-w-sm text-white/80">
            El sistema inteligente para monitorear la salud y el entorno de tus plantas de interior.
          </p>
        </div>
      </div>

      {/* Lado derecho — formulario oscuro */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-[#0f172a] text-white px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Bienvenido de nuevo</h1>
            <p className="text-slate-400">Ingresa a tu cuenta para ver el estado de tu jardín.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">Correo Electrónico</label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full rounded-xl bg-slate-800/60 border border-slate-700 px-4 py-3 pl-10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                />
                <img src="/email-9-svgrepo-com.svg" alt="" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 [filter:invert(60%)]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-300">Contraseña</label>
                <a href="#" className="text-xs text-emerald-400 hover:text-emerald-300">¿Olvidaste tu contraseña?</a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-800/60 border border-slate-700 px-4 py-3 pl-10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                />
                <img src="/password-lock-svgrepo-com.svg" alt="" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 [filter:invert(60%)]" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded-md border-slate-600 text-emerald-500 focus:ring-emerald-500/40"
              />
              Mantener sesión iniciada
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3.5 px-4 transition shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? "Ingresando..." : "Ingresar a mi jardín →"}
            </button>
          </form>

          <p className="text-sm text-center text-slate-400">
            ¿No tienes una cuenta?{" "}
            <a href="#" className="text-emerald-400 font-medium hover:underline">Regístrate aquí</a>
          </p>
        </div>
      </div>
    </div>
  );
}
