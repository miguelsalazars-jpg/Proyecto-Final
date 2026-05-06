/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, HelpCircle, ShoppingCart, Package, MessageSquare, Headphones, Mic, MicOff, Volume2, VolumeX, Phone, Plus, Minus, MapPin, Store, Check, ChevronUp, ChevronDown, Loader2, Search, MessageSquareText, Utensils, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category } from '../types';

import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  where,
  limit,
  setDoc,
  doc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

export const ChatInterface: React.FC = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSendingOrder, setIsSendingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const isAdmin = user?.email === 'miguel.salazars@udem.edu';
  const [itemExtras, setItemExtras] = useState({
    cebolla: true,
    cilantro: true,
    salsa: true,
    limon: true,
    notas: '',
    customerName: '',
    customerPhone: '',
    customerAddress: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  const menuItems = [
    // TACOS INDIVIDUALES
    { id: 'pastor', category: 'Tacos', name: '🌮 Taco al pastor (Trompo)', price: 18, unit: 'taco', desc: 'Con piña, cebolla y cilantro' },
    { id: 'bistec', category: 'Tacos', name: '🌮 Taco de bistec', price: 20, unit: 'taco', desc: 'Carne asada, cebolla y cilantro' },
    { id: 'chicharron', category: 'Tacos', name: '🌮 Taco de chicharrón', price: 20, unit: 'taco', desc: 'Chicharrón prensado' },
    { id: 'tripa', category: 'Tacos', name: '🌮 Taco de tripa', price: 25, unit: 'taco', desc: 'Tripa dorada a la plancha' },
    { id: 'costilla', category: 'Tacos', name: '🌮 Taco de costilla', price: 24, unit: 'taco', desc: 'Costilla suave desmenuzada' },
    { id: 'arrachera', category: 'Tacos', name: '🌮 Taco de arrachera', price: 30, unit: 'taco', desc: 'Arrachera jugosa a la parrilla' },
    
    // ESPECIALIDADES
    { id: 'gringa', category: 'Especialidades', name: '🧀 Gringa', price: 38, unit: 'orden', desc: 'Pastor en harina con queso' },
    { id: 'campechana', category: 'Especialidades', name: '🌯 Campechana', price: 38, unit: 'orden', desc: 'Pastor y bistec en maíz' },
    { id: 'pirata', category: 'Especialidades', name: '⚔️ Pirata', price: 40, unit: 'orden', desc: 'Bistec en harina con queso' },
    { id: 'quesadilla', category: 'Especialidades', name: '🧀 Quesadilla', price: 25, unit: 'orden', desc: 'Queso fundido en harina' },
    { id: 'quesataco', category: 'Especialidades', name: '🌮 Quesataco', price: 30, unit: 'orden', desc: 'Taco con costra de queso' },
    { id: 'papas', category: 'Especialidades', name: '🍟 Orden de papas', price: 35, unit: 'orden', desc: 'A la francesa con salsa y queso' },
    
    // BEBIDAS
    { id: 'refresco_lata', category: 'Bebidas', name: '🥤 Refresco en lata', price: 18, unit: 'pieza', desc: 'Variedad de sabores' },
    { id: 'refresco_600', category: 'Bebidas', name: '🥤 Refresco 600 ml', price: 25, unit: 'pieza', desc: 'Botella de plástico' },
    { id: 'agua_natural', category: 'Bebidas', name: '💧 Agua natural', price: 15, unit: 'pieza', desc: 'Botella 500ml' },
    { id: 'agua_sabor', category: 'Bebidas', name: '🍹 Agua de sabor', price: 20, unit: 'pieza', desc: 'Fruta de temporada' },
    { id: 'cerveza', category: 'Bebidas', name: '🍺 Cerveza', price: 30, unit: 'pieza', desc: 'Bien helada' },
  ];

  const menuCategories = ['Tacos', 'Especialidades', 'Bebidas'];

  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(menuItems.map(item => [item.id, 1]))
  );

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartId));
  };

  const updateCartItemQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === cartId) {
        const newQty = Math.max(1, item.quantity + delta);
        const itemTitle = item.name;
        const extrasStr = item.extras;
        return {
          ...item,
          quantity: newQty,
          fullName: `${newQty} x ${itemTitle}${extrasStr}`
        };
      }
      return item;
    }));
  };

  const [editingCartId, setEditingCartId] = useState<string | null>(null);

  const handleOpenItem = (item: typeof menuItems[0], existingCartItem?: any) => {
    setSelectedItem(item);
    if (existingCartItem) {
      setEditingCartId(existingCartItem.id);
      setItemExtras(existingCartItem.rawExtras || {
        cebolla: true,
        cilantro: true,
        salsa: true,
        limon: true,
        notas: existingCartItem.notas || '',
        customerName: itemExtras.customerName,
        customerPhone: itemExtras.customerPhone,
        customerAddress: itemExtras.customerAddress
      });
      setQuantities(prev => ({ ...prev, [item.id]: existingCartItem.quantity }));
    } else {
      setEditingCartId(null);
      setSelectedItem(item);
      setItemExtras({
        cebolla: true,
        cilantro: true,
        salsa: true,
        limon: true,
        notas: '',
        customerName: user?.displayName || itemExtras.customerName || '',
        customerPhone: itemExtras.customerPhone || '',
        customerAddress: itemExtras.customerAddress || ''
      });
    }
  };

  const confirmItemAdd = () => {
    if (!selectedItem) return;

    const qty = quantities[selectedItem.id] || 1;
    const extras = [];
    
    if (selectedItem.category !== 'Bebidas') {
      if (!itemExtras.cebolla) extras.push('sin cebolla');
      if (!itemExtras.cilantro) extras.push('sin cilantro');
      if (!itemExtras.salsa) extras.push('sin salsa');
      if (!itemExtras.limon) extras.push('sin limón');
    }
    
    const extrasStr = extras.length > 0 ? ` (${extras.join(', ')})` : (selectedItem.category !== 'Bebidas' ? ' (con todo)' : '');
    const itemTitle = selectedItem.name.split(' ').slice(1).join(' ');
    
    const cartItem = {
      id: editingCartId || Math.random().toString(36).substr(2, 9),
      itemId: selectedItem.id,
      name: itemTitle,
      fullName: `${qty} x ${itemTitle}${extrasStr}`,
      price: selectedItem.price,
      quantity: qty,
      extras: extrasStr,
      notas: itemExtras.notas,
      rawExtras: { ...itemExtras }
    };

    if (editingCartId) {
      setCart(prev => prev.map(item => item.id === editingCartId ? cartItem : item));
    } else {
      setCart(prev => [...prev, cartItem]);
    }
    
    setSelectedItem(null);
    setEditingCartId(null);
  };

  const finalizeOrder = async () => {
    if (cart.length === 0) return;

    if (!itemExtras.customerName || !itemExtras.customerPhone) {
      alert("Por favor indica tu nombre y teléfono para confirmar el pedido.");
      return;
    }

    if (orderType === 'delivery' && !itemExtras.customerAddress) {
      alert("Necesitamos tu dirección para el envío a domicilio.");
      return;
    }

    setIsSendingOrder(true);

    try {
      const itemsStr = cart.map(item => item.fullName).join(' | ');
      const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      
      const orderData = {
        userId: user?.uid || 'anonymous',
        userName: itemExtras.customerName,
        items: itemsStr,
        total: total,
        status: 'pendiente',
        tipoEntrega: orderType,
        timestamp: Date.now(),
        notas: cart.map(i => i.notas).filter(n => n).join('; ') || 'Pedido vía Menú Digital',
        telefono: itemExtras.customerPhone,
        direccion: orderType === 'delivery' ? itemExtras.customerAddress : 'Recoger en local'
      };

      await addDoc(collection(db, 'pedidos'), orderData);
      
      setOrderSuccess(orderData);
      setCart([]);
      
      // DISPARAR AUTOMÁTICAMENTE
      setTimeout(() => {
        sendSMSConfirmation(orderData);
      }, 500);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'pedidos');
    } finally {
      setIsSendingOrder(false);
    }
  };

  const sendSMSConfirmation = async (order: any) => {
    try {
      const message = `🌮 ¡Sabor Regio! Confirmamos tu pedido:\n\n📝 Detalle: ${order.items}\n💰 Total: $${order.total}\n📍 Entrega: ${order.tipoEntrega === 'delivery' ? 'A domicilio' : 'Recoger'}\n\nEstamos preparando tu orden. ¡Gracias! 🔥`;
      
      // 1. Notificación al Cliente
      await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.telefono,
          message: message
        })
      });

      // 2. Notificación al Admin (Opcional, pero recomendado para pedidos manuales)
      // Nota: El número de admin debe estar configurado en el servidor
      console.log("Notificaciones de pedido enviadas.");
    } catch (error) {
      console.error("Error enviando SMS:", error);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Suscripción para Administrador (Todos los pedidos)
    if (isAdmin) {
      const q = query(collection(db, 'pedidos'), orderBy('timestamp', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // setOrders(p); // Unused
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'pedidos');
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  useEffect(() => {
    // Suscripción para Cliente (Solo sus pedidos)
    if (!user) {
      setUserOrders([]);
      return;
    }

    const q = query(
      collection(db, 'pedidos'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'), 
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserOrders(p);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'pedidos-usuario');
    });

    return () => unsubscribe();
  }, [user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Error de login", err);
    }
  };

  return (
    <div id="menu-container" className="flex flex-col min-h-screen w-full bg-gray-50">
      {/* Header */}
      <header id="menu-header" className="p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Store size={20} />
          </div>
          <div>
            <h1 className="font-black text-gray-900 tracking-tighter uppercase text-lg italic">Sabor Regio</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Parrilla Encendida • Menú
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 overflow-hidden shadow-sm">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" />
              ) : (
                <User size={16} className="text-gray-400" />
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="pb-20">
          {/* Order Type Selector */}
          <div className="px-6 py-6 sticky top-0 bg-white z-20 shadow-sm shadow-gray-100/50">
            <div className="flex p-1.5 bg-gray-100 rounded-2xl mb-6">
              <button
                onClick={() => setOrderType('delivery')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  orderType === 'delivery' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'
                }`}
              >
                <MapPin size={14} />
                Domicilio
              </button>
              <button
                onClick={() => setOrderType('pickup')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  orderType === 'pickup' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'
                }`}
              >
                <Store size={14} />
                Recoger
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-orange-600 animate-ping" />
              <p className="text-lg font-black text-gray-900 tracking-tighter uppercase italic">Nuestro Menú</p>
            </div>

            {/* BARRA DE BÚSQUEDA */}
            <div className="relative mt-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busca tus tacos, bebidas o especialidades..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-100 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-orange-600"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="px-6 space-y-12 pt-6">
            {menuCategories.map(category => {
              const filteredItems = menuItems.filter(item => 
                item.category === category && 
                (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 item.desc.toLowerCase().includes(searchTerm.toLowerCase()))
              );

              if (filteredItems.length === 0) return null;

              return (
                <div key={category} className="space-y-6">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] px-2 border-l-4 border-orange-500 ml-2">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleOpenItem(item)}
                        className="w-full group relative flex items-center gap-4 p-4 bg-white border border-transparent rounded-[32px] hover:border-orange-100 hover:shadow-xl hover:shadow-gray-100 transition-all text-left"
                      >
                        <div className="text-3xl bg-gray-50 w-20 h-20 rounded-3xl flex items-center justify-center group-hover:bg-orange-50 group-hover:scale-105 transition-all flex-shrink-0 shadow-inner">
                          {item.name.split(' ')[0]}
                        </div>
                        <div className="flex-1 pr-10">
                          <h3 className="text-base font-black text-gray-900 tracking-tight">{item.name.split(' ').slice(1).join(' ')}</h3>
                          <p className="text-[10px] font-medium text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <div className="bg-gray-100/50 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-gray-100">
                               <span className="text-xs font-black text-orange-600">$</span>
                               <span className="text-lg font-black text-gray-900 tracking-tight">{item.price}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">por {item.unit}</span>
                          </div>
                        </div>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
                          <Plus size={24} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {searchTerm && menuItems.filter(item => 
              item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
              item.desc.toLowerCase().includes(searchTerm.toLowerCase())
            ).length === 0 && (
              <div className="text-center py-20">
                <p className="text-4xl mb-4">😿</p>
                <h3 className="text-lg font-black text-gray-900 uppercase italic">¡Híjole! No encontramos eso</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Prueba buscando otra cosa o revisa las categorías</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Summary Floating Button */}
      <AnimatePresence>
        {cart.length > 0 && !selectedItem && !isCartOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-0 right-0 px-6 z-40 max-w-lg mx-auto"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-orange-600 text-white p-5 rounded-[24px] shadow-2xl shadow-orange-200 flex items-center justify-between group hover:bg-orange-700 transition-all active:scale-95"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center relative">
                  <ShoppingCart size={20} />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-orange-600 rounded-full text-[10px] font-black flex items-center justify-center shadow-sm">
                    {cart.length}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-orange-100 uppercase tracking-widest leading-none mb-1">Ver pedido</p>
                  <h4 className="text-sm font-black tracking-tight leading-none uppercase italic">Tu Carrito</h4>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black italic">$</span>
                <span className="text-3xl font-black tracking-tighter">
                  {cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)}
                </span>
                <ChevronUp className="ml-2 opacity-60 group-hover:translate-y-[-2px] transition-transform" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Modal / Checkout Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white rounded-t-[40px] z-[90] shadow-2xl p-8 max-h-[85vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 flex-shrink-0" />
              
              <AnimatePresence mode="wait">
                {orderSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10"
                  >
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-[32px] flex items-center justify-center shadow-inner">
                      <Check size={48} strokeWidth={3} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">¡Pedido Recibido!</h2>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 px-10">
                        Tu orden ha sido enviada a la cocina. ¡Prepárate para el sabor regio!
                      </p>
                    </div>
                    
                    <div className="w-full bg-gray-50 rounded-3xl p-6 border border-gray-100 text-left">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Resumen rápido</p>
                      <p className="text-sm font-bold text-gray-800 line-clamp-2 italic">"{orderSuccess.items}"</p>
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                        <span className="text-xs font-black text-gray-400 uppercase">Total Pagado:</span>
                        <span className="text-xl font-black text-gray-900">${orderSuccess.total}</span>
                      </div>
                    </div>

                      <div className="w-full space-y-3">
                        <button
                          onClick={() => setIsCartOpen(false)}
                          className="w-full py-5 bg-orange-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 hover:bg-orange-700 transition-all active:scale-95"
                        >
                          <MessageSquareText size={20} />
                          Seguir pidiendo
                        </button>
                        <button
                          onClick={() => {
                            setOrderSuccess(null);
                            setIsCartOpen(false);
                          }}
                          className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                        >
                          Cerrar y volver al menú
                        </button>
                      </div>
                  </motion.div>
                ) : (
                  <motion.div key="cart" className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-8 flex-shrink-0">
                      <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Tu Orden Final</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Revisa antes de confirmar</p>
                      </div>
                      <button 
                        onClick={() => setCart([])}
                        className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] px-4 py-2 hover:bg-red-50 rounded-xl transition-all"
                      >
                        Vaciar
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-8">
                      {cart.map((item) => (
                        <div key={item.id} className="p-4 bg-gray-50 rounded-[32px] border border-gray-100 group relative hover:bg-white hover:shadow-lg transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-black text-gray-900 uppercase italic tracking-tighter text-sm">{item.name}</h4>
                                <button 
                                  onClick={() => {
                                    const menuItem = menuItems.find(mi => mi.id === item.itemId);
                                    if (menuItem) handleOpenItem(menuItem, item);
                                  }}
                                  className="text-[8px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full hover:bg-indigo-600 hover:text-white transition-all"
                                >
                                  Editar Ingredientes
                                </button>
                              </div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.extras}</p>
                              {item.notas && (
                                <div className="mt-2 flex items-center gap-1">
                                  <MessageSquare size={10} className="text-orange-500" />
                                  <p className="text-[9px] text-orange-600 italic font-medium">"{item.notas}"</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-3">
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                              <div className="text-right">
                                <p className="text-base font-black text-gray-900 leading-none">${item.price * item.quantity}</p>
                                <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mt-1">${item.price} c/u</p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100">
                              <button 
                                onClick={() => updateCartItemQuantity(item.id, -1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-lg text-gray-600"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="font-black text-xs w-6 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => updateCartItemQuantity(item.id, 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-lg text-gray-600"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Desliza para ajustes</p>
                          </div>
                        </div>
                      ))}

                      {/* Customer info for checkout */}
                      <div className="pt-6 space-y-6">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Datos de la entrega</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tu Nombre</label>
                            <input 
                              type="text" 
                              value={itemExtras.customerName}
                              onChange={(e) => setItemExtras(prev => ({ ...prev, customerName: e.target.value }))}
                              placeholder="Nombre completo..."
                              className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-100 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tu Teléfono</label>
                            <input 
                              type="tel" 
                              value={itemExtras.customerPhone}
                              onChange={(e) => setItemExtras(prev => ({ ...prev, customerPhone: e.target.value }))}
                              placeholder="81-XXXX-XXXX"
                              className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-100 transition-all"
                            />
                          </div>
                        </div>

                        {orderType === 'delivery' && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2"
                          >
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Dirección de Entrega</label>
                            <textarea 
                              value={itemExtras.customerAddress}
                              onChange={(e) => setItemExtras(prev => ({ ...prev, customerAddress: e.target.value }))}
                              placeholder="Calle, número, colonia y referencias..."
                              className="w-full p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium outline-none focus:ring-4 focus:ring-orange-100 transition-all min-h-[100px] resize-none"
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <div className="bg-orange-600 rounded-[32px] p-6 mb-6 flex-shrink-0 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                      <div className="relative z-10 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-orange-100 uppercase tracking-[0.3em] mb-1">Subtotal de la Orden</p>
                          <p className="text-sm font-black text-white uppercase italic">{cart.length} productos listos</p>
                        </div>
                        <div className="flex items-start gap-1 text-white">
                          <span className="text-xl font-black mt-1">$</span>
                          <span className="text-5xl font-black tracking-tighter leading-none">
                            {cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 flex-shrink-0">
                      <button
                        onClick={() => setIsCartOpen(false)}
                        className="flex-1 py-5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-3xl transition-colors"
                      >
                        Seguir Comprando
                      </button>
                      <button
                        onClick={finalizeOrder}
                        disabled={isSendingOrder}
                        className="flex-[2] py-5 bg-orange-600 text-white rounded-3xl font-black shadow-xl shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isSendingOrder ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <>
                            <Check size={20} />
                            ¡ENVIAR PEDIDO!
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Item Detail Modal/Drawer */}
      <AnimatePresence>
        {selectedItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onAnimationComplete={() => !selectedItem}
              className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white rounded-t-[40px] z-[70] shadow-2xl p-8 overflow-hidden"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">{selectedItem.name}</h2>
                  <p className="text-xs font-bold text-gray-500 mt-1">{selectedItem.desc}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Personaliza tu orden a tu gusto</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Precio Unitario</span>
                  <div className="text-xl font-black text-gray-900 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                    ${selectedItem.price}
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-8 max-h-[50vh] overflow-y-auto no-scrollbar py-2">
                {/* Quantity */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl">
                  <span className="font-bold text-gray-800">¿Cuántos quieres?</span>
                  <div className="flex items-center gap-4 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                    <button 
                      onClick={() => updateQuantity(selectedItem.id, -1)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-xl text-gray-600 transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="font-black text-lg w-6 text-center">{quantities[selectedItem.id] || 1}</span>
                    <button 
                      onClick={() => updateQuantity(selectedItem.id, 1)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-xl text-gray-600 transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Extras - Solo para comida */}
                {selectedItem.category !== 'Bebidas' && (
                  <div>
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">¿Qué le quitamos?</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'cebolla', label: 'Cebolla' },
                        { id: 'cilantro', label: 'Cilantro' },
                        { id: 'salsa', label: 'Salsa' },
                        { id: 'limon', label: 'Limón' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setItemExtras(prev => ({ ...prev, [opt.id]: !prev[opt.id as keyof typeof prev] }))}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            itemExtras[opt.id as keyof typeof itemExtras] 
                              ? 'bg-orange-50 border-orange-200 text-orange-700 font-bold' 
                              : 'bg-white border-gray-100 text-gray-500'
                          }`}
                        >
                          {opt.label}
                          {itemExtras[opt.id as keyof typeof itemExtras] && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Instrucciones especiales</h4>
                  <textarea
                    value={itemExtras.notas}
                    onChange={(e) => setItemExtras(prev => ({ ...prev, notas: e.target.value }))}
                    placeholder="Ej: La carne bien doradita..."
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-orange-200 transition-all min-h-[80px]"
                  />
                </div>
              </div>

              {/* Resumen de Pago Prominente */}
              <div className="mb-8 p-6 bg-orange-600 rounded-[32px] shadow-xl shadow-orange-100 flex justify-between items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-orange-100 uppercase tracking-[0.3em] mb-1">Total a Liquidar</p>
                  <p className="text-sm text-white font-black italic uppercase tracking-tight">
                    {quantities[selectedItem.id] || 1} x {selectedItem.name.split(' ').slice(1).join(' ')}
                  </p>
                </div>
                <div className="relative z-10 text-right">
                  <div className="flex items-start justify-end gap-1 text-white">
                    <span className="text-lg font-black mt-1">$</span>
                    <span className="text-5xl font-black tracking-tighter leading-none">
                      {selectedItem.price * (quantities[selectedItem.id] || 1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSelectedItem(null);
                  }}
                  className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-3xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmItemAdd}
                  className="flex-[2] py-4 rounded-3xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Agregar al carrito
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
