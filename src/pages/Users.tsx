import { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { User } from '../types';
import { Shield, User as UserIcon, Trash2, Key, Plus, X, Loader2, Users as UsersIcon, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const createUserSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  email: z.string().min(3, 'Usuario o Email requerido (mínimo 3 caracteres)'),
  password: z.string().min(4, 'Mínimo 4 caracteres'),
  rol: z.enum(['admin', 'operador']),
});

const changePasswordSchema = z.object({
  password: z.string().min(4, 'Mínimo 4 caracteres'),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await dbService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleRole = async (user: User) => {
    if (user.uid === currentUser?.uid) {
      toast.error("No puedes cambiar tu propio rol");
      return;
    }

    const newRole = user.rol === 'admin' ? 'operador' : 'admin';
    try {
      await dbService.updateUserRole(user.uid, newRole);
      toast.success(`Rol actualizado a ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Error al actualizar rol");
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
      await dbService.deleteUser(uid);
      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar usuario');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 relative"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <UsersIcon className="w-3.5 h-3.5 mr-1" />
            Acceso Autorizado
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Colaboradores & Usuarios</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Gestiona permisos, añade operadores y resetea credenciales al instante</p>
        </div>
        {currentUser?.rol === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-6 py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/10 transition-all hover:scale-102 active:scale-98"
          >
            <Plus className="w-5 h-5" />
            <span>Agregar Colaborador</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative flex items-center justify-center">
            <div className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-purple-400 opacity-75"></div>
            <div className="relative animate-spin rounded-full h-12 w-12 border-t-2 border-r-2 border-purple-600"></div>
          </div>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4.5">Colaborador</th>
                  <th className="px-6 py-4.5">Correo Electrónico</th>
                  <th className="px-6 py-4.5">Roles & Niveles</th>
                  <th className="px-6 py-4.5 text-right">Acciones de Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {users.map((user) => (
                  <motion.tr 
                    key={user.uid} 
                    variants={cardVariants}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-black mr-3 uppercase">
                          {user.nombre?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block text-sm">{user.nombre}</span>
                          {user.uid === currentUser?.uid && (
                            <span className="text-[9px] bg-blue-50 text-blue-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border border-blue-100 mt-0.5 inline-block">
                              Tú (Sesión Activa)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-500 font-mono text-xs">{user.email}</td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        user.rol === 'admin' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : 'bg-slate-50 text-slate-600 border-slate-100'
                      )}>
                        {user.rol === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3 mr-1.5 text-purple-500" />
                            Administrador
                          </>
                        ) : (
                          <>
                            <UserIcon className="w-3 h-3 mr-1.5 text-slate-400" />
                            Operador
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end space-x-1">
                        {currentUser?.rol === 'admin' && (
                          <>
                            <button
                              onClick={() => toggleRole(user)}
                              disabled={user.uid === currentUser?.uid}
                              className="text-purple-600 hover:text-purple-800 p-2 rounded-xl hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                              title="Cambiar permisos de nivel"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPasswordModalUser(user)}
                              className="text-amber-600 hover:text-amber-800 p-2 rounded-xl hover:bg-amber-50 transition-all"
                              title="Asignar nueva contraseña"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.uid)}
                              disabled={user.uid === currentUser?.uid}
                              className="text-rose-600 hover:text-rose-800 p-2 rounded-xl hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                              title="Dar de baja de la plataforma"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-10 border-slate-100 overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Agregar Nuevo Colaborador</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Asigna credenciales y define accesos</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm transition-all hover:scale-105"
                >
                  <X className="w-4 text-slate-500" />
                </button>
              </div>
              
              <AddUserModalForm 
                onClose={() => setIsAddModalOpen(false)} 
                onSuccess={() => {
                  setIsAddModalOpen(false);
                  fetchUsers();
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {passwordModalUser && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Modificar Privilegios</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Restablecer contraseña de ingreso</p>
                </div>
                <button 
                  onClick={() => setPasswordModalUser(null)} 
                  className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm transition-all hover:scale-105"
                >
                  <X className="w-4 text-slate-500" />
                </button>
              </div>
              
              <div className="p-6 pb-0 bg-slate-50/30">
                <div className="flex items-center bg-amber-50 rounded-2xl p-4 border border-amber-100 text-amber-850 text-xs font-semibold">
                  <Key className="w-4.5 h-4.5 mr-2.5 text-amber-500 shrink-0" />
                  <p>
                    Vas a ingresar una clave de acceso nueva para: <span className="font-extrabold text-slate-900 block mt-0.5 font-sans">{passwordModalUser.nombre} ({passwordModalUser.email})</span>
                  </p>
                </div>
              </div>

              <ChangePasswordModalForm 
                user={passwordModalUser} 
                onClose={() => setPasswordModalUser(null)} 
                onSuccess={() => {
                  setPasswordModalUser(null);
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddUserModalForm({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { rol: 'operador' }
  });

  const onSubmit = async (data: CreateUserForm) => {
    setLoading(true);
    try {
      await dbService.createUser(data as any);
      toast.success('Usuario creado exitosamente');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 font-medium text-sm">
      <div>
        <label className="block text-slate-700 mb-1.5 font-bold text-xs uppercase tracking-wider">Nombre Completo</label>
        <input 
          {...register('nombre')} 
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all placeholder-slate-450" 
          placeholder="Ej: Camilo Echeverría" 
        />
        {errors.nombre && <p className="text-rose-500 text-xs font-bold mt-1.5">{errors.nombre.message}</p>}
      </div>
      
      <div>
        <label className="block text-slate-700 mb-1.5 font-bold text-xs uppercase tracking-wider">Nombre de Usuario (o correo)</label>
        <input 
          {...register('email')} 
          type="text" 
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all placeholder-slate-450" 
          placeholder="Ej: camilo o camilo@correo.cl" 
        />
        {errors.email && <p className="text-rose-500 text-xs font-bold mt-1.5">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-slate-700 mb-1.5 font-bold text-xs uppercase tracking-wider">Contraseña (Mínimo 4 dígitos)</label>
        <input 
          {...register('password')} 
          type="password" 
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all placeholder-slate-450 font-mono" 
          placeholder="🔑 Ingrese clave" 
        />
        {errors.password && <p className="text-rose-500 text-xs font-bold mt-1.5">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-slate-700 mb-1.5 font-bold text-xs uppercase tracking-wider">Rol Organizacional</label>
        <select 
          {...register('rol')} 
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all cursor-pointer font-semibold text-slate-700"
        >
          <option value="operador">Operador (Puede registrar despachos)</option>
          <option value="admin">Administrador (Control total del sistema)</option>
        </select>
        {errors.rol && <p className="text-rose-500 text-xs font-bold mt-1.5">{errors.rol.message}</p>}
      </div>

      <div className="pt-4 flex justify-end gap-2.5">
        <button 
          type="button" 
          onClick={onClose} 
          className="px-5 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold transition-all active:scale-95 text-xs uppercase tracking-wider"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={loading} 
          className="px-5 py-3 bg-gradient-to-r from-purple-650 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center disabled:opacity-70 transition-all active:scale-95 text-xs uppercase tracking-wider shadow-lg shadow-purple-500/10"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Crear Colaborador
        </button>
      </div>
    </form>
  );
}

function ChangePasswordModalForm({ user, onClose, onSuccess }: { user: User, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordForm) => {
    setLoading(true);
    try {
      await dbService.updateUserPassword(user.uid, data.password);
      toast.success('Contraseña actualizada exitosamente');
      onSuccess();
    } catch (error: any) {
      toast.error('Error al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 font-medium text-sm">
      <div>
        <label className="block text-slate-700 mb-1.5 font-bold text-xs uppercase tracking-wider">Nueva Contraseña (mínimo 4 dígitos)</label>
        <input 
          {...register('password')} 
          type="password" 
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all placeholder-slate-450 font-mono" 
          placeholder="••••" 
        />
        {errors.password && <p className="text-rose-500 text-xs font-bold mt-1.5">{errors.password.message}</p>}
      </div>

      <div className="pt-4 flex justify-end gap-2.5">
        <button 
          type="button" 
          onClick={onClose} 
          className="px-5 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold transition-all active:scale-95 text-xs uppercase tracking-wider"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={loading} 
          className="px-5 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl font-bold flex items-center justify-center disabled:opacity-70 transition-all active:scale-95 text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Guardar Cambios
        </button>
      </div>
    </form>
  );
}
