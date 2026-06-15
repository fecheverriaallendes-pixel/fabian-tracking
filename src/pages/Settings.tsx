import { useState, useEffect, ChangeEvent } from 'react';
import { dbService } from '../services/db';
import { User } from '../types';
import { Download, Upload, AlertTriangle, Loader2, Shield, User as UserIcon, Trash2, Key, Plus, X, Users as UsersIcon, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'backups' | 'users'>('backups');
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const { user: currentUser } = useAuth();

  const handleRebuild = async () => {
    if (!confirm('ADVERTENCIA: ¿Estás seguro de reconstruir la base de datos nacional completa? Se borrarán usuarios, despachos de ejemplo e instalará el listado con más de 40 transportes y 345 comunas de cobertura tanto de tu servidor local como de tu base de datos FirebaseFirestore online asociada. Esta acción no se puede deshacer.')) {
      return;
    }
    setRebuilding(true);
    try {
      const result = await dbService.rebuildDatabase();
      toast.success(`¡Base de datos nacional re-inicializada con éxito! ${result.count} transportistas sembrados.`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al reconstruir la base de datos nacional');
    } finally {
      setRebuilding(false);
    }
  };

  // User list states
  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await dbService.getUsers();
      setUsersList(data);
    } catch (error) {
      console.error("Error fetching users in settings:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await dbService.exportDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logitrack-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Respaldo descargado exitosamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al exportar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('ADVERTENCIA: Importar un respaldo SOBRESCRIBIRÁ todos los datos actuales del sistema. ¿Estás seguro de continuar?')) {
      event.target.value = '';
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        await dbService.importDatabase(json);
        toast.success('Datos restaurados exitosamente. Recargando...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error(error);
        toast.error('Error al importar: Archivo inválido');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const toggleRole = async (user: User) => {
    if (user.uid === currentUser?.uid) {
      toast.error("No puedes cambiar tu propio rol");
      return;
    }

    const newRole = user.rol === 'admin' ? 'operador' : 'admin';
    try {
      await dbService.updateUserRole(user.uid, newRole);
      toast.success(`Rol del usuario actualizado a ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Error al actualizar rol");
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (uid === currentUser?.uid) {
      toast.error("No puedes eliminar tu propio usuario");
      return;
    }
    if (!confirm('¿Estás seguro de eliminar este usuario del sistema? No tendrá más acceso.')) return;
    
    try {
      await dbService.deleteUser(uid);
      toast.success('Usuario de acceso eliminado con éxito');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar usuario');
    }
  };

  const isAdmin = currentUser?.rol === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-500 mt-1">Administración del sistema, copias de seguridad y accesos</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('backups')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all flex items-center ${
            activeTab === 'backups'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Download className="w-4 h-4 mr-2" />
          Copias de Seguridad y Datos
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 font-medium text-sm border-b-2 transition-all flex items-center ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <UsersIcon className="w-4 h-4 mr-2" />
          Usuarios con Ingreso al Sistema
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'backups' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Data Management Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Respaldo de Datos</h2>
                <p className="text-sm text-slate-500">Descarga una copia de seguridad de toda la información</p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                  Los datos se guardan localmente en este navegador. Te recomendamos realizar respaldos periódicos, especialmente antes de borrar el historial o cambiar de dispositivo.
                </p>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Descargar Respaldo (JSON)
            </button>
          </div>

          {/* Restore Data Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mr-3">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Restaurar Datos</h2>
                <p className="text-sm text-slate-500">Importa un archivo de respaldo previamente descargado</p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 font-medium">
                  ¡Atención! Esta acción reemplazará todos los datos actuales con los del archivo de respaldo. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <button
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Seleccionar Archivo de Respaldo
              </button>
            </div>
          </div>

          {/* Re-seed/Reconstruct National Database Card */}
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-red-100 rounded-lg text-red-600 mr-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Restablecimiento Completo & Cobertura Nacional de Fábrica</h2>
                <p className="text-sm text-slate-500">
                  Fuerza la reinstalación y sincronización del listado completo de los 40+ transportistas y sus 345 comunas de cobertura chilena.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 font-medium text-xs text-slate-700 leading-relaxed">
              <p className="font-bold text-red-600 mb-1">💡 ¿Cuándo utilizar esta herramienta?</p>
              Utiliza esta opción si implementaste la aplicación en un nuevo entorno (con vinculación online a Firebase Firestore) o si notas que no aparecen los 40 transportistas o las 345 comunas por defecto en tus búsquedas. Esto reconstruirá la base de datos local SQLite y sincronizará en masa todos los transportes y zonas a Firebase Firestore si está activo en la nube.
            </div>

            <button
              onClick={handleRebuild}
              disabled={rebuilding}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-600 font-bold text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70 text-sm shadow-sm"
              id="settings-rebuild-db-btn"
            >
              {rebuilding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando cobertura nacional (40+ transportistas y 345 comunas)...
                </>
              ) : (
                <>
                  ⚡ Reconstruir Base de Datos Completa & Sincronizar Cobertura de Fábrica
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Usuarios del Sistema</h2>
              <p className="text-sm text-slate-500 mt-0.5">Define quién tiene acceso a ingresar a la plataforma y administrar datos</p>
            </div>
            {isAdmin ? (
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Nuevo Usuario
              </button>
            ) : (
              <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium">
                <Lock className="w-3.5 h-3.5 mr-1" />
                Requiere rol de Administrador
              </div>
            )}
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-slate-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Correo Electrónico</th>
                    <th className="px-6 py-4">Rol / Permisos</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((usr) => (
                    <tr key={usr.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3 text-xs uppercase">
                            {usr.nombre?.charAt(0) || 'U'}
                          </div>
                          <span className="font-semibold text-slate-900">{usr.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{usr.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          usr.rol === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {usr.rol === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                          {usr.rol === 'admin' ? 'Administrador' : 'Operador'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => toggleRole(usr)}
                              disabled={usr.uid === currentUser?.uid}
                              className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Cambiar Rol (Admin/Operador)"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPasswordModalUser(usr)}
                              className="text-amber-600 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                              title="Editar Contraseña"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(usr.uid)}
                              disabled={usr.uid === currentUser?.uid}
                              className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Eliminar Acceso de Usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Sin permisos de edición</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No hay otros usuarios registrados en el sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <AddUserModalInline
          onClose={() => setIsAddUserModalOpen(false)}
          onSuccess={() => {
            setIsAddUserModalOpen(false);
            fetchUsers();
          }}
        />
      )}

      {/* Change Password Modal */}
      {passwordModalUser && (
        <ChangePasswordModalInline
          user={passwordModalUser}
          onClose={() => setPasswordModalUser(null)}
          onSuccess={() => {
            setPasswordModalUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

// Subcomponent: Add User Modal (Inline layout)
function AddUserModalInline({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { rol: 'operador' }
  });

  const onSubmit = async (data: CreateUserForm) => {
    setLoading(true);
    try {
      await dbService.createUser(data as any);
      toast.success('Usuario creado con éxito. Ahora tiene ingreso al sistema');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Crear Usuario de Sistema</h3>
            <p className="text-xs text-slate-500">Asigna credenciales válidas de ingreso</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
            <input 
              {...register('nombre')} 
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
              placeholder="Ej: Nicolás Fuentes" 
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1 font-medium">{errors.nombre.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Usuario (o correo)</label>
            <input 
              {...register('email')} 
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" 
              placeholder="Ej: nicolas o nicolas@empresa.cl" 
            />
            {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña de Ingreso</label>
            <input 
              {...register('password')} 
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" 
              placeholder="Ej: 2024" 
            />
            {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Permisos de Sistema (Rol)</label>
            <select 
              {...register('rol')} 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            >
              <option value="operador">Operador (Ingresar y consultar datos)</option>
              <option value="admin">Administrador (Control total y administración de usuarios)</option>
            </select>
            {errors.rol && <p className="text-red-500 text-xs mt-1 font-medium">{errors.rol.message}</p>}
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center disabled:opacity-73 transition-colors shadow-sm"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar y Crear Acceso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subcomponent: Change Password Modal (Inline layout)
function ChangePasswordModalInline({ user, onClose, onSuccess }: { user: User, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordForm) => {
    setLoading(true);
    try {
      await dbService.updateUserPassword(user.uid, data.password);
      toast.success('Nueva contraseña de ingreso establecida con éxito');
      onSuccess();
    } catch (error: any) {
      toast.error('Error al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Modificar Contraseña</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500">Usuario a actualizar:</p>
            <p className="text-sm font-semibold text-slate-900">{user.nombre}</p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">{user.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña del Sistema</label>
            <input 
              {...register('password')} 
              type="text" 
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" 
              placeholder="Ej: 2024" 
            />
            {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm flex items-center disabled:opacity-73 transition-colors shadow-sm"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Actualizar Contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
