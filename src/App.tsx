/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Dashboard } from './components/Dashboard';
import { OrdersManager } from './components/OrdersManager';
import { UserOrders } from './components/UserOrders';
import { SettingsPanel } from './components/SettingsPanel';
import { LayoutDashboard, Settings, LogOut, Building2, Package, Clock, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

const ADMIN_EMAIL = 'miguel.salazars@udem.edu';

export default function App() {
  const [view, setView] = useState<'menu' | 'dashboard' | 'orders' | 'my-orders' | 'settings'>('menu');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setView('menu');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setAuthError("Error con Google: " + error.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Actualizar el perfil con el nombre
        if (displayName) {
          await updateProfile(userCredential.user, { displayName: displayName });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      const message = error.code === 'auth/user-not-found' ? 'Usuario no encontrado' :
                     error.code === 'auth/wrong-password' ? 'Contraseña incorrecta' :
                     error.code === 'auth/email-already-in-use' ? 'El correo ya está registrado' :
                     error.code === 'auth/weak-password' ? 'La contraseña debe tener al menos 6 caracteres' :
                     error.message;
      setAuthError(message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-indigo-400 border-t-white rounded-full animate-spin" />
          <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs">Cargando Sabor Regio...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-orange-600 rounded-[28px] flex items-center justify-center mx-auto shadow-xl rotate-3">
               <Building2 size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">Sabor Regio</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Portal de Clientes</p>
            </div>
          </div>
          
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authMode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Correo Electrónico</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-200 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Contraseña</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-200 transition-all"
              />
            </div>

            {authError && (
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight text-center bg-rose-50 p-2 rounded-lg">
                {authError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-orange-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 active:scale-95"
            >
              {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-300 bg-white px-4 tracking-widest">O continúa con</div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-50 p-4 rounded-2xl hover:border-indigo-100 hover:bg-gray-50 transition-all active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span className="font-black text-gray-800 uppercase tracking-tight text-xs">Google Account</span>
          </button>

          <p className="text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
            >
              {authMode === 'login' ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </p>

          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-4 border-t border-gray-50 text-center">
            © 2026 Sabor Regio • San Pedro
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="app-root" className="flex min-h-screen bg-white text-gray-900 font-sans overflow-hidden">
      {/* Navigation Sidebar */}
      <nav id="main-nav" className="fixed left-0 top-0 h-full w-20 bg-indigo-950 flex flex-col items-center py-8 gap-6 z-50 text-indigo-300 border-r border-white/5 flex-shrink-0">
        <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-orange-900/20">
          <Building2 size={24} />
        </div>
        
        <button 
          onClick={() => setView('menu')}
          className={`p-3 rounded-xl transition-all ${view === 'menu' ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
          title="Menú Digital"
        >
          <Utensils size={24} />
        </button>

        <button 
          onClick={() => setView('my-orders')}
          className={`p-3 rounded-xl transition-all ${view === 'my-orders' ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
          title="Mis Pedidos"
        >
          <Clock size={24} />
        </button>

        {isAdmin && (
          <>
            <div className="w-8 h-px bg-white/10 my-2" />
            
            <button 
              onClick={() => setView('orders')}
              className={`p-3 rounded-xl transition-all ${view === 'orders' ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
              title="Monitor de Pedidos"
            >
              <Package size={24} />
            </button>

            <button 
              onClick={() => setView('dashboard')}
              className={`p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
              title="Dashboard Admin"
            >
              <LayoutDashboard size={24} />
            </button>

            <button 
              onClick={() => setView('settings')}
              className={`p-3 rounded-xl transition-all ${view === 'settings' ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
              title="Configuración"
            >
              <Settings size={24} />
            </button>
          </>
        )}

        <button 
          onClick={handleLogout}
          className="mt-auto p-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut size={24} />
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 ml-20 min-h-screen relative overflow-y-auto bg-gray-50">
        <div className="w-full h-full max-w-4xl mx-auto">
            {view === 'menu' ? <ChatInterface /> : 
             view === 'my-orders' ? <UserOrders /> : 
             isAdmin && view === 'orders' ? <OrdersManager /> : 
             isAdmin && view === 'dashboard' ? <Dashboard /> : 
             isAdmin && view === 'settings' ? <SettingsPanel /> :
             <ChatInterface />
            }
        </div>
      </main>

      {/* View indicator */}
      <div className="fixed bottom-4 right-4 bg-indigo-950/90 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest z-50 backdrop-blur-md shadow-2xl border border-white/10">
        <span className="flex items-center gap-2">
          {view === 'menu' ? 'Menú Digital' : 
           view === 'my-orders' ? 'Mis Pedidos' : 
           view === 'orders' ? 'Panel: Monitor de Pedidos' : 
           view === 'dashboard' ? 'Panel: Estadísticas' : 'Configuración'}
          {isAdmin && <span className="bg-orange-600 px-2 py-0.5 rounded text-[8px]">ADMIN</span>}
        </span>
      </div>
    </div>
  );
}
