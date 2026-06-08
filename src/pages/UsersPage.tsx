import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../services/db';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { Perfil } from '../types/database';
import { UserPlus, Trash2, Shield, User, ShieldAlert, X, KeyRound } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Formulario de creación
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'admin' | 'mesero'>('mesero');
  const [submitting, setSubmitting] = useState(false);

  const fetchPerfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getPerfiles();
      setPerfiles(data);
    } catch (err: any) {
      console.error(err);
      showToast('Error al cargar la lista de personal.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPerfiles();
  }, [fetchPerfiles]);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Por favor complete todos los campos.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await db.crearUsuarioAdmin(email.trim(), password, rol);
      showToast('Colaborador creado exitosamente.', 'success');
      setShowAddModal(false);
      // Reset form
      setEmail('');
      setPassword('');
      setRol('mesero');
      fetchPerfiles();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error al crear el usuario. Verifique si ya existe.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCambiarRol = async (userEmail: string, nuevoRol: 'admin' | 'mesero') => {
    if (userEmail === currentUser?.email) {
      showToast('No puedes cambiar tu propio rol.', 'error');
      return;
    }
    if (userEmail === 'admin@elpuerto.com') {
      showToast('No se puede alterar el rol del administrador principal.', 'error');
      return;
    }

    try {
      await db.cambiarRolAdmin(userEmail, nuevoRol);
      showToast(`Rol de ${userEmail.split('@')[0]} cambiado a ${nuevoRol.toUpperCase()}.`, 'success');
      fetchPerfiles();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error al cambiar el rol.', 'error');
    }
  };

  const handleEliminarUsuario = async (userEmail: string) => {
    if (userEmail === currentUser?.email) {
      showToast('No puedes eliminar tu propia cuenta.', 'error');
      return;
    }
    if (userEmail === 'admin@elpuerto.com') {
      showToast('No se puede eliminar al administrador principal del sistema.', 'error');
      return;
    }

    if (!window.confirm(`¿Está seguro de que desea eliminar a ${userEmail}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await db.eliminarUsuarioAdmin(userEmail);
      showToast('Colaborador eliminado exitosamente.', 'success');
      fetchPerfiles();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error al eliminar el colaborador.', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      
      {/* Cabecera */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-3 flex-shrink-0">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Gestión del Personal</h3>
          <p className="text-2xs text-slate-500 font-bold uppercase mt-1">Registra personal, cambia privilegios y gestiona accesos al sistema</p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Registrar Colaborador
        </button>
      </div>

      {/* Grid Principal */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-2xs">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-2xs font-bold uppercase tracking-widest border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="p-4">Colaborador</th>
                <th className="p-4">Rol del Sistema</th>
                <th className="p-4">Acciones / Permisos</th>
                <th className="p-4 text-right">Eliminar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading && perfiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600 mx-auto"></div>
                  </td>
                </tr>
              ) : perfiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                    No se encontraron colaboradores registrados.
                  </td>
                </tr>
              ) : (
                perfiles.map((p) => {
                  const isMainAdmin = p.email === 'admin@elpuerto.com';
                  const isMe = p.email === currentUser?.email;
                  const canAlter = !isMainAdmin && !isMe;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Email */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${p.rol === 'admin' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                            {p.rol === 'admin' ? <Shield className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 leading-tight">
                              {p.email.split('@')[0]} {isMe && <span className="text-3xs bg-slate-100 text-slate-500 font-black px-1 rounded uppercase">Tú</span>}
                            </span>
                            <span className="text-xs text-slate-400 font-mono mt-0.5">{p.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="p-4">
                        <span className={`text-2xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          p.rol === 'admin'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-sky-50 text-sky-700 border border-sky-100'
                        }`}>
                          {p.rol === 'admin' ? 'Administrador' : 'Mesero'}
                        </span>
                      </td>

                      {/* Selector de Rol */}
                      <td className="p-4">
                        {canAlter ? (
                          <select
                            value={p.rol}
                            onChange={(e) => handleCambiarRol(p.email, e.target.value as 'admin' | 'mesero')}
                            className="text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none cursor-pointer"
                          >
                            <option value="mesero">Mesero</option>
                            <option value="admin">Administrador</option>
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold uppercase select-none">
                            {isMainAdmin ? 'Acceso Principal' : 'Privilegios Bloqueados'}
                          </span>
                        )}
                      </td>

                      {/* Eliminar */}
                      <td className="p-4 text-right">
                        {canAlter ? (
                          <button
                            onClick={() => handleEliminarUsuario(p.email)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-3xs font-black text-slate-300 uppercase tracking-widest select-none pr-3">
                            Protegido
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar Usuario */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-slate-700" />
                <h3 className="font-extrabold text-slate-800 uppercase tracking-wide text-xs">Registrar Colaborador</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCrearUsuario} className="p-5 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-3xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-sm placeholder-slate-400 bg-slate-50/50"
                  placeholder="nombre@elpuerto.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-3xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Contraseña Temporal *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-sm placeholder-slate-400 bg-slate-50/50"
                    placeholder="Min. 6 caracteres"
                  />
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-3xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Rol del Sistema *
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as 'admin' | 'mesero')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-sm bg-white cursor-pointer"
                >
                  <option value="mesero">Mesero (Toma pedidos)</option>
                  <option value="admin">Administrador (Acceso total)</option>
                </select>
              </div>

              {/* Advertencia de Seguridad */}
              <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-3 flex gap-2 text-2xs text-amber-800">
                <ShieldAlert className="h-4.5 w-4.5 text-amber-500 flex-shrink-0" />
                <p className="leading-snug">
                  <strong>Nota:</strong> Los meseros nuevos podrán iniciar sesión inmediatamente y tomar pedidos. Los administradores tendrán privilegios de modificación de inventario.
                </p>
              </div>

              {/* Acciones */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creando...' : 'Crear Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
