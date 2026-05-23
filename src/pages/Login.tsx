import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Truck, Lock, Sparkles, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';

const loginSchema = z.object({
  email: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('¡Sesión iniciada con éxito! Bienvenido.');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 overflow-hidden relative font-sans">
      {/* Dynamic Futuristic Lights (Floating Bubbles) */}
      <motion.div 
        animate={{ 
          x: [0, 80, -40, 0],
          y: [0, -60, 50, 0],
          scale: [1, 1.2, 0.9, 1]
        }}
        transition={{ 
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-[400px] h-[400px] rounded-full bg-blue-600/20 blur-[100px] -top-20 -left-20 pointer-events-none"
      />
      <motion.div 
        animate={{ 
          x: [0, -100, 50, 0],
          y: [0, 80, -30, 0],
          scale: [1, 1.15, 0.95, 1]
        }}
        transition={{ 
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px] -bottom-40 -right-20 pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-md p-4">
        {/* Main interactive glass card */}
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          className="bg-slate-900/60 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-slate-800/80 w-full"
        >
          {/* Logo element with colorful pulsing glow */}
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="h-20 w-20 bg-slate-950 rounded-2xl flex items-center justify-center shadow-2xl relative group p-1.5 border border-slate-800"
            >
              <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur group-hover:blur-md opacity-40 transition-all duration-300" />
              <img 
                src="/icon.svg" 
                className="relative z-10 h-full w-full object-contain" 
                alt="App Logo" 
                referrerPolicy="no-referrer"
              />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-400 mt-4 tracking-tight"
            >
              FABIÁN - TRACK
            </motion.h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">SISTEMA LOGÍSTICO INTELIGENTE</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field with inline Icon */}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-1.5"
            >
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Usuario del Sistema</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="h-4.5 w-4.5 text-blue-400" />
                </div>
                <input
                  {...register('email')}
                  type="text"
                  className="w-full bg-slate-950/70 border border-slate-800 focus:border-blue-500/80 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-medium placeholder-slate-600"
                  placeholder="Ej: fabian o admin"
                />
              </div>
              {errors.email && <p className="text-rose-500 text-xs font-semibold mt-1">{errors.email.message}</p>}
            </motion.div>

            {/* Password Field with inline Icon */}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-1.5"
            >
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Contraseña secreta</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  {...register('password')}
                  type="password"
                  className="w-full bg-slate-950/70 border border-slate-800 focus:border-blue-500/80 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-medium placeholder-slate-650"
                  placeholder="Contraseña"
                />
              </div>
              {errors.password && <p className="text-rose-500 text-xs font-semibold mt-1">{errors.password.message}</p>}
            </motion.div>

            {/* Submit button with micro-bounce */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="pt-2"
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-blue-900/30 font-sans tracking-wide text-sm relative overflow-hidden group"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <span className="flex items-center">
                    Ingresar al Sistema <Sparkles className="w-4 h-4 ml-2 text-blue-200" />
                  </span>
                )}
              </button>
            </motion.div>
          </form>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 text-center text-xs text-slate-500"
          >
            <p>Ingreso seguro de personal logístico. ¿Problemas? Soporte de Sistemas.</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

