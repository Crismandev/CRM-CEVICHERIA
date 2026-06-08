import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Anchor, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    setter(e.target.value);
    // Limpiar errores mientras el usuario escribe
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor ingrese su correo y contraseña.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      showToast('Sesión iniciada correctamente.', 'success');
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Error en las credenciales. Verifique su correo e intente de nuevo.';
      setErrorMessage(msg === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : msg);
      showToast('Error al iniciar sesión.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 font-sans overflow-hidden select-none px-4">
      {/* 1. Fondo Decorativo Marino Premium */}
      <div className="absolute inset-0 z-0">
        {/* Degradado base de océano */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950/70" />
        
        {/* Círculo decorativo 1 (Sutil verde marino) */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Círculo decorativo 2 (Sutil azul) */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Patrón de ondas abstracto SVG */}
        <svg className="absolute bottom-0 w-full h-40 opacity-15 pointer-events-none" viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 64L48 80C96 96 192 128 288 133.3C384 139 480 117 576 96C672 75 768 53 864 64C960 75 1056 117 1152 133.3C1248 149 1344 139 1392 133.3L1440 128V200H1392C1344 200 1248 200 1152 200C1056 200 960 200 864 200C768 200 672 200 576 200C480 200 384 200 288 200C192 200 96 200 48 200H0V64Z" fill="url(#paint0_linear)" />
          <defs>
            <linearGradient id="paint0_linear" x1="720" y1="64" x2="720" y2="200" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10b981" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 2. Tarjeta Glassmorphic Clara (Alto Contraste) */}
      <div className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-2xl flex flex-col gap-6 animate-slide-in text-slate-800">
        
        {/* Encabezado Logo */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20 shadow-inner">
            <Anchor className="h-10 w-10 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-slate-900 leading-none">Restaurante El Puerto</h1>
            <p className="text-2xs font-extrabold uppercase tracking-widest text-slate-500 mt-2">Terminal de Puntos de Venta</p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email-input" className="text-3xs font-extrabold uppercase tracking-widest text-slate-500">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <input
                id="email-input"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => handleInputChange(e, setEmail)}
                placeholder="ejemplo@elpuerto.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500/70 focus:bg-white text-slate-900 transition-all font-sans placeholder-slate-400"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password-input" className="text-3xs font-extrabold uppercase tracking-widest text-slate-500">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => handleInputChange(e, setPassword)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500/70 focus:bg-white text-slate-900 transition-all font-mono placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-600 cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <p className="text-3xs font-bold text-red-600 uppercase tracking-wider text-center mt-1 bg-red-50 py-2 border border-red-200 rounded-lg">
              ⚠️ {errorMessage}
            </p>
          )}

          {/* Botón enviar */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all mt-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Verificando...' : 'Ingresar al POS'}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

      </div>
    </div>
  );
};
