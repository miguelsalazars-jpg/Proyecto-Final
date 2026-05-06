/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Clock, MapPin, Package, CheckCircle2, Bike, Store, Timer, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, Feedback } from '../types';

export const UserOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'pedidos'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(p);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'pedidos');
    });

    return () => unsubscribe();
  }, [user]);

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await setDoc(doc(db, 'pedidos', orderId), { status: 'entregado' }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `pedidos/${orderId}`);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
        <div className="w-20 h-20 rounded-3xl bg-orange-100 flex items-center justify-center text-orange-600 mb-6">
          <Package size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Inicia Sesión</h2>
        <p className="text-sm text-gray-500 font-medium max-w-xs mt-2">Necesitas estar registrado para ver el historial y estatus de tus pedidos.</p>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pendiente':
        return { label: 'Recibido', color: 'text-orange-500', bg: 'bg-orange-50', icon: Clock, description: 'Estamos revisando tu pedido' };
      case 'preparando':
        return { label: 'En Cocina', color: 'text-blue-500', bg: 'bg-blue-50', icon: Timer, description: 'La parrilla está a tope' };
      case 'listo':
        return { label: '¡Listo!', color: 'text-green-500', bg: 'bg-green-50', icon: CheckCircle2, description: 'Ya puede pasar por él o va en camino' };
      case 'entregado':
        return { label: 'Entregado', color: 'text-gray-400', bg: 'bg-gray-100', icon: Store, description: '¡Gracias por tu compra!' };
      default:
        return { label: 'Procesando', color: 'text-gray-500', bg: 'bg-gray-50', icon: Package, description: 'Actualizando estatus...' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 min-h-screen bg-gray-50/50">
      <header>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Mis Pedidos</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Estatus en tiempo real • {user.displayName}</p>
      </header>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {orders.map((order) => {
            const config = getStatusConfig(order.status);
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-3xl ${config.bg} ${config.color} flex items-center justify-center shadow-inner`}>
                        <StatusIcon size={28} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <h3 className={`text-xl font-black uppercase italic tracking-tight ${config.color}`}>{config.label}</h3>
                           <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{config.description}</p>
                        {order.eta && order.status === 'preparando' && (
                          <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit mt-1">Llega en ~{order.eta} min</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-gray-900 tracking-tighter">${order.total || '0'}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {new Date(order.timestamp).toLocaleDateString()} • {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Tu Orden</h4>
                        <p className="text-lg text-gray-900 font-bold leading-tight">{order.items}</p>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                          {order.tipoEntrega === 'delivery' ? <Bike size={14} className="text-orange-600" /> : <Store size={14} className="text-orange-600" />}
                          <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">
                            {order.tipoEntrega === 'delivery' ? 'A Domicilio' : 'Recoger en Sucursal'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-64 space-y-4">
                       <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1">
                            <MapPin size={10} /> Entrega en:
                          </label>
                          <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 text-xs font-bold text-gray-700 italic">
                            {order.direccion || 'Recoger en local'}
                          </div>
                       </div>
                       
                       {order.status === 'listo' && (
                         <motion.button
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                           onClick={() => handleCompleteOrder(order.id)}
                           className="w-full py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-200 flex items-center justify-center gap-2 hover:bg-black transition-all"
                         >
                           <Check size={14} />
                           Finalizar Pedido
                         </motion.button>
                       )}
                    </div>
                  </div>
                </div>

                {/* Feedback Section */}
                {order.status === 'entregado' && (
                  <FeedbackForm orderId={order.id} existingFeedback={order.feedback} />
                )}

                {/* Progress Bar */}
                <div className="flex h-1.5 w-full bg-gray-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ 
                      width: order.status === 'pendiente' ? '25%' : 
                             order.status === 'preparando' ? '50%' : 
                             order.status === 'listo' ? '75%' : '100%' 
                    }}
                    className={`h-full transition-all duration-1000 ${
                      order.status === 'pendiente' ? 'bg-orange-500' :
                      order.status === 'preparando' ? 'bg-blue-500' :
                      order.status === 'listo' ? 'bg-green-500' : 'bg-gray-900'
                    }`}
                  />
                </div>
              </motion.div>
            );
          })}

          {orders.length === 0 && (
            <div className="text-center py-32 bg-white rounded-[60px] border border-dashed border-gray-200">
              <Package className="mx-auto text-gray-100 mb-6" size={80} />
              <h3 className="text-gray-400 font-black tracking-[0.2em] uppercase italic">No tienes pedidos recientes</h3>
              <p className="text-xs text-gray-400 mt-2">¡Ve al menú y ordena algo delicioso!</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const FeedbackForm: React.FC<{ orderId: string, existingFeedback?: Feedback }> = ({ orderId, existingFeedback }) => {
  const [rating, setRating] = useState(existingFeedback?.rating || 0);
  const [comment, setComment] = useState(existingFeedback?.comment || '');
  const [submitted, setSubmitted] = useState(!!existingFeedback);
  const [loading, setLoading] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      const feedback: Feedback = { 
        rating, 
        comment, 
        timestamp: new Date().toISOString() 
      };
      await setDoc(doc(db, 'pedidos', orderId), { 
        feedback 
      }, { merge: true });
      setSubmitted(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `pedidos/${orderId}/feedback`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="bg-green-50 p-6 border-t border-green-100 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <Check size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-0.5">¡Orden Completada!</p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className={`text-sm ${star <= rating ? "text-yellow-500" : "text-gray-200"}`}>★</span>
              ))}
            </div>
          </div>
        </div>
        {comment && (
          <p className="text-[10px] font-bold text-green-600/70 italic max-w-[200px] text-right line-clamp-2">
            "{comment}"
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-8 border-t border-gray-100 space-y-6"
    >
      <div className="text-center md:text-left">
        <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter italic leading-none">¿Qué tal estuvo tu pedido?</h4>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Califica tu experiencia de 1 a 5 estrellas</p>
      </div>
      
      <div className="flex justify-center md:justify-start gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button 
            key={star} 
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => setRating(star)}
            className={`text-4xl transition-all duration-200 transform ${
              star <= (hoveredStar || rating) ? "text-yellow-400 scale-110 rotate-12" : "text-gray-100 hover:text-yellow-200"
            } ${star <= rating ? "drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" : ""}`}
          >
            ★
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <textarea 
          placeholder="Dinos qué te gustó o cómo podemos mejorar..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[32px] text-sm outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-200 transition-all min-h-[100px] font-medium text-gray-700"
        />

        <motion.button 
          whileHover={{ scale: rating > 0 ? 1.01 : 1 }}
          whileTap={{ scale: rating > 0 ? 0.99 : 1 }}
          disabled={rating === 0 || loading}
          onClick={handleSubmit}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl ${
            rating > 0 
              ? "bg-gray-900 text-white hover:bg-black shadow-gray-200" 
              : "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
          }`}
        >
          {loading ? "Enviando..." : "Enviar Reseña y Finalizar"}
        </motion.button>
      </div>
    </motion.div>
  );
};
