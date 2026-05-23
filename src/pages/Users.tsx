import { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { User } from '../types';
import { Shield, User as UserIcon, Trash2, Key, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createUserSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  rol: z.enum(['admin', 'operador']),
});

const changePasswordSchema = z.object({
  password: z.string().min(6, 'Mínimo 6 caracteres'),
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

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-slate-500 mt-1">Gestión de roles y permisos</p>
        </div>
        {currentUser?.rol === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar Usuario
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3">
                        {user.nombre?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium text-slate-900">{user.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      user.rol === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {user.rol === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {user.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {currentUser?.rol === 'admin' && (
                      <>
                        <button
                          onClick={() => toggleRole(user)}
                          disabled={user.uid === currentUser?.uid}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Cambiar Rol"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPasswordModalUser(user)}
                          className="text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-50"
                          title="Cambiar Contraseña"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.uid)}
                          disabled={user.uid === currentUser?.uid}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <AddUserModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchUsers();
          }} 
        />
      )}

      {/* Change Password Modal */}
      {passwordModalUser && (
        <ChangePasswordModal 
          user={passwordModalUser} 
          onClose={() => setPasswordModalUser(null)} 
          onSuccess={() => {
            setPasswordModalUser(null);
          }} 
        />
      )}
    </div>
  );
}

function AddUserModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Agregar Usuario</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input {...register('nombre')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Juan Pérez" />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input {...register('email')} type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="juan@ejemplo.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input {...register('password')} type="password" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <select {...register('rol')} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="operador">Operador</option>
              <option value="admin">Administrador</option>
            </select>
            {errors.rol && <p className="text-red-500 text-xs mt-1">{errors.rol.message}</p>}
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center disabled:opacity-70">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ user, onClose, onSuccess }: { user: User, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordForm) => {
    setLoading(true);
    try {
      await dbService.updateUserPassword(user.uid, data.password);
      toast.success('Contraseña actualizada');
      onSuccess();
    } catch (error: any) {
      toast.error('Error al actualizar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Cambiar Contraseña</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 pb-0">
          <p className="text-sm text-slate-600 mb-4">
            Cambiando contraseña para <span className="font-semibold text-slate-900">{user.nombre}</span> ({user.email})
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
            <input {...register('password')} type="password" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium flex items-center disabled:opacity-70">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Actualizar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
