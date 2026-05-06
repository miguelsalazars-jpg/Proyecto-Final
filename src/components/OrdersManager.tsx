/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Package, Store, Clock, MapPin, CheckCircle2, ChevronRight, Search, Filter, MessageSquareText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'pedidos'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(p);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'pedidos');
    });

    return () => unsubscribe();
  }, []);

  const sendOrderSMS = async (order: any) => {
    if (!order.telefono) {
      console.warn("No phone number for order", order.id);
      return;
    }

    try {
      const message = `¡Hola ${order.userName}! 👋 Confirmamos que tu pedido está: ${order.status.toUpperCase()}.\n\n📝 Pedido: ${order.items}\n💰 Total: $${order.total}`;
      
      await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.telefono,
          message: message
        })
      });
    } catch (error) {
      console.error("Error Twilio SMS:", error);
    }
  };

  const notifyStatusChange = async (order: any, newStatus: string, eta?: number) => {
    if (!order.telefono || order.telefono === "No proporcionado") return;

    const messages: Record<string, string> = {
      'preparando': `¡Hola ${order.userName}! 🔥 Tu pedido ya está en la cocina preparando tus tacos.${eta ? ` Tiempo estimado: ${eta} min.` : ''}`,
      'listo': `¡Buenas noticias ${order.userName}! ✅ Tu pedido en Sabor Regio está LISTO.`,
      'entregado': `¡Gracias por tu compra ${order.userName}! 🌮 Esperamos que disfrutes tus tacos de Sabor Regio.`
    };

    const msg = messages[newStatus];
    if (!msg) return;

    try {
      await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.telefono,
          message: msg
        })
      });
      console.log(`[SMS] Notificación enviada para estado: ${newStatus}`);
    } catch (error) {
      console.error("[SMS ERROR] Error al enviar notificación de estado:", error);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [etaSelections, setEtaSelections] = useState<Record<string, number>>({});

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'pedidos', orderId));
      setDeletingId(null);
    } catch (error: any) {
      console.error("Error al eliminar:", error);
      alert('Error: ' + error.message);
    }
  };

  const updateOrderStatus = async (order: any, newStatus: string, eta?: number) => {
    try {
      const updateData: any = { status: newStatus };
      if (eta) updateData.eta = eta;

      await setDoc(doc(db, 'pedidos', order.id), updateData, { merge: true });
      // Enviar notificación SMS
      await notifyStatusChange(order, newStatus, eta);
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert('Error: ' + error.message);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'todos' || order.status === filter;
    const matchesSearch = order.userName.toLowerCase().includes(search.toLowerCase()) || 
                         order.items.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    pendientes: orders.filter(o => o.status === 'pendiente').length,
    cocina: orders.filter(o => o.status === 'preparando').length,
    listos: orders.filter(o => o.status === 'listo').length,
  };

  return (
    <div id="orders-manager" className="p-8 max-w-6xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Monitor de Pedidos</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión en tiempo real • Cocina</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar pedido..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-2xl bg-gray-50 outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-200 transition-all text-sm"
            />
          </div>
        </div>
      </header>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Pendientes', count: stats.pendientes, color: 'bg-orange-500', shadow: 'shadow-orange-100', status: 'pendiente' },
          { label: 'En Cocina', count: stats.cocina, color: 'bg-blue-500', shadow: 'shadow-blue-100', status: 'preparando' },
          { label: 'Listos/Entregados', count: stats.listos, color: 'bg-green-500', shadow: 'shadow-green-100', status: 'listo' }
        ].map(stat => (
          <button 
            key={stat.label}
            onClick={() => setFilter(filter === stat.status ? 'todos' : stat.status)}
            className={`p-6 bg-white rounded-3xl border transition-all text-left flex items-center justify-between group ${
              filter === stat.status ? 'border-gray-900 ring-4 ring-gray-50' : 'border-gray-100'
            } hover:shadow-xl ${stat.shadow}`}
          >
            <div>
              <div className={`w-2 h-2 rounded-full ${stat.color} mb-2 ${stat.count > 0 ? 'animate-pulse' : ''}`} />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-gray-900">{stat.count}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${stat.color} text-white flex items-center justify-center opacity-10 group-hover:opacity-100 transition-opacity`}>
              <Filter size={20} />
            </div>
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-4">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Cola de Producción</h2>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-orange-100"
          >
            <option value="todos">Todos los pedidos</option>
            <option value="pendiente">Solo Pendientes</option>
            <option value="preparando">Solo en Cocina</option>
            <option value="listo">Solo Listos</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <motion.div 
                layout
                key={order.id} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`p-8 rounded-[40px] border transition-all ${
                  order.status === 'pendiente' ? 'bg-white border-orange-100 shadow-xl shadow-orange-50/50' : 
                  order.status === 'preparando' ? 'bg-white border-blue-100 shadow-xl shadow-blue-50/50' :
                  'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4 items-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner ${
                      order.status === 'pendiente' ? 'bg-orange-100 text-orange-600' : 
                      order.status === 'preparando' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {order.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-xl tracking-tight leading-none mb-1">{order.userName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">{order.tipoEntrega === 'delivery' ? 'DOMICILIO' : 'RECOGER'}</span>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <span className="text-[8px] text-gray-300 font-mono">ID: {order.id.slice(-4)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-900 tracking-tighter">${order.total}</p>
                    <span className={`inline-block mt-2 text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-tighter ${
                      order.status === 'pendiente' ? 'bg-orange-600 text-white' : 
                      order.status === 'preparando' ? 'bg-blue-600 text-white' :
                      order.status === 'cancelado' ? 'bg-red-600 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-3xl p-6 mb-6 border border-gray-100/50 min-h-[100px]">
                  <p className="text-lg text-gray-800 font-bold leading-tight">{order.items}</p>
                  
                  {order.eta && order.status === 'preparando' && (
                    <div className="mt-2 text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit flex items-center gap-1">
                      <Clock size={12} /> ETA: {order.eta} min
                    </div>
                  )}

                  {order.feedback && (
                    <div className="mt-4 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={i < order.feedback.rating ? "text-yellow-500" : "text-gray-300"}>★</span>
                        ))}
                        <span className="text-[10px] font-black text-yellow-700 ml-2 uppercase">Feedback Cliente</span>
                      </div>
                      <p className="text-xs text-yellow-800 italic">"{order.feedback.comment}"</p>
                    </div>
                  )}

                  {order.notas && (
                    <div className="mt-4 flex items-start gap-2 text-xs text-orange-700 font-bold bg-orange-50/80 p-3 rounded-2xl border border-orange-100 italic">
                      <span className="bg-orange-600 text-white px-1.5 rounded-md text-[8px] mt-0.5">NOTA</span>
                      {order.notas}
                    </div>
                  )}
                  {order.telefono && (
                    <div className="mt-2 text-[10px] font-bold text-gray-500 flex items-center gap-1">
                       📞 {order.telefono}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {order.status === 'pendiente' && (
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">¿En cuánto tiempo estará?</p>
                       <div className="flex gap-2">
                        {[15, 20, 30, 45].map(time => (
                          <button 
                            key={time}
                            onClick={() => setEtaSelections({ ...etaSelections, [order.id]: time })}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${
                              etaSelections[order.id] === time ? 'bg-orange-600 border-orange-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-600'
                            }`}
                          >
                            {time} min
                          </button>
                        ))}
                       </div>
                       <button 
                        disabled={!etaSelections[order.id]}
                        onClick={() => updateOrderStatus(order, 'preparando', etaSelections[order.id])}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group ${
                          etaSelections[order.id] ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        Confirmar y Cocinar
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}
                  {order.status === 'preparando' && (
                    <button 
                      onClick={() => updateOrderStatus(order, 'listo')}
                      className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 group"
                    >
                      <CheckCircle2 size={16} />
                      ¡Orden Lista!
                    </button>
                  )}
                  {order.status === 'listo' && (
                    <button 
                      onClick={() => updateOrderStatus(order, 'entregado')}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-2"
                    >
                      Archivar / Entregado
                    </button>
                  )}
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => sendOrderSMS(order)}
                      className="flex-1 h-12 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm gap-2 text-[10px] font-black uppercase"
                      title="Enviar Notificación SMS"
                    >
                      <MessageSquareText size={18} />
                      Enviar SMS Manual
                    </button>
                    <div className="relative">
                      <AnimatePresence mode="wait">
                        {deletingId === order.id ? (
                          <motion.div 
                            key="confirm"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex gap-2"
                          >
                            <button 
                              onClick={() => handleDeleteOrder(order.id)}
                              className="px-4 h-12 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200"
                            >
                              Eliminar
                            </button>
                            <button 
                              onClick={() => setDeletingId(null)}
                              className="px-4 h-12 bg-gray-200 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                            >
                              X
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button 
                            key="delete"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeletingId(order.id)}
                            className="w-12 h-12 bg-red-50 text-red-600 border border-red-100 rounded-2xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm group"
                            title="Eliminar permanentemente"
                          >
                            <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredOrders.length === 0 && (
            <div className="col-span-full text-center py-32 bg-white rounded-[60px] border border-dashed border-gray-200">
              <Package className="mx-auto text-gray-100 mb-6" size={80} />
              <h3 className="text-gray-400 font-black tracking-[0.2em] uppercase italic">No se encontraron pedidos</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
