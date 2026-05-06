/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  BarChart3, 
  Users, 
  Clock, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign,
  Star,
  Download,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  UtensilsCrossed,
  Activity,
  UserCircle,
  TrendingDown,
  PieChart as PieIcon,
  CreditCard
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { Order } from '../types';

export const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'finanzas' | 'reseñas'>('general');

  useEffect(() => {
    // Escuchar todos los pedidos para estadísticas
    const ordersQ = query(collection(db, 'pedidos'), orderBy('timestamp', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQ, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
    };
  }, []);

  const totalSales = orders.reduce((acc, order) => acc + (order.total || 0), 0);
  const feedbackOrders = orders.filter(o => o.feedback);
  const avgRating = feedbackOrders.length > 0 
    ? (feedbackOrders.reduce((acc, o) => acc + (o.feedback?.rating || 0), 0) / feedbackOrders.length).toFixed(1)
    : '5.0';

  const stats = [
    { label: 'Ingresos Totales', value: `$${totalSales.toLocaleString()}`, change: '+12%', icon: DollarSign, color: 'emerald' },
    { label: 'Pedidos Totales', value: orders.length.toString(), change: '+5%', icon: ShoppingCart, color: 'orange' },
    { label: 'Satisfacción', value: `${avgRating} ★`, change: `${feedbackOrders.length} votos`, icon: Star, color: 'yellow' },
    { label: 'Tiempos Promedio', value: '12m', change: '-2m', icon: Clock, color: 'rose' },
  ];

  const downloadFinancialReport = () => {
    const headers = ['ID Pedido', 'Cliente', 'Items', 'Total', 'Tipo Entrega', 'Status', 'Fecha'];
    const csvData = orders.map(o => [
      o.id,
      o.userName,
      o.items.replace(/,/g, ';'),
      o.total,
      o.tipoEntrega,
      o.status,
      new Date(o.timestamp).toLocaleString()
    ].join(','));
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_financiero_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderGeneral = () => (
    <div className="space-y-8">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-white rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-gray-200/50 transition-all"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform`} />
            <div className="relative z-10 flex flex-col gap-4">
               <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-end gap-2 mt-1">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tighter italic">{stat.value}</h3>
                  <span className={`text-[10px] font-black flex items-center gap-0.5 mb-1 ${stat.change.startsWith('+') ? 'text-green-500' : 'text-rose-500'}`}>
                    {stat.change.startsWith('+') ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Monitor */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic flex items-center gap-2">
              <UtensilsCrossed size={20} className="text-orange-600" />
              Últimos Pedidos
            </h2>
            <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Ver Todo</button>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-3xl border border-gray-100 group hover:bg-white hover:shadow-lg hover:shadow-gray-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm">
                      <Package size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 leading-none">{order.userName}</h4>
                      <p className="text-[10px] font-medium text-gray-400 mt-1 line-clamp-1">{order.items}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">${order.total}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {order.timestamp ? `hace ${Math.round((Date.now() - order.timestamp) / 60000)}m` : 'Reciente'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      order.status === 'pendiente' ? 'bg-orange-100 text-orange-600' :
                      order.status === 'preparando' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="py-12 text-center text-gray-400 italic font-medium">No hay pedidos registrados hoy.</div>
              )}
            </div>
          </div>
        </div>

        {/* Promotional Card / Store Info */}
        <div className="bg-indigo-950 rounded-[40px] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 backdrop-blur-3xl" />
          <div className="relative z-10 flex flex-col h-full">
            <h2 className="text-xl font-black tracking-tighter uppercase italic mb-8 flex items-center gap-2">
              <Activity size={20} className="text-orange-500" />
              Estado del Local
            </h2>
            <div className="space-y-6 flex-1">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Capacidad Actual</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 w-[65%]" />
                  </div>
                  <span className="text-xs font-black italic">65%</span>
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pedidos por App</p>
                <h3 className="text-2xl font-black italic">{orders.length} órdenes activas</h3>
              </div>
            </div>
            <button className="mt-8 bg-white text-indigo-950 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/20 transition-all active:scale-95">
              Ver Menú Completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinanzas = () => {
    // Procesar datos para gráficas
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const revenueByDay = last7Days.map(day => {
      const dayTotal = orders
        .filter(o => new Date(o.timestamp).toISOString().split('T')[0] === day)
        .reduce((sum, o) => sum + (o.total || 0), 0);
      return { 
        name: new Date(day).toLocaleDateString('es-MX', { weekday: 'short' }), 
        total: dayTotal,
        pedidos: orders.filter(o => new Date(o.timestamp).toISOString().split('T')[0] === day).length
      };
    });

    const deliveryCount = orders.filter(o => o.tipoEntrega === 'delivery').length;
    const pickupCount = orders.filter(o => o.tipoEntrega === 'pickup').length;
    
    const deliveryStats = [
      { name: 'Delivery', value: deliveryCount, color: '#10b981' }, // emerald-500
      { name: 'Pickup', value: pickupCount, color: '#6366f1' },    // indigo-500
    ];

    const customerSpend = orders.reduce((acc, o) => {
      if (!acc[o.userName]) acc[o.userName] = { name: o.userName, total: 0, orders: 0 };
      acc[o.userName].total += o.total;
      acc[o.userName].orders += 1;
      return acc;
    }, {} as Record<string, { name: string, total: number, orders: number }>);

    const topCustomers = Object.values(customerSpend)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic flex items-center gap-2">
              <BarChart3 size={24} className="text-emerald-500" />
              Inteligencia Financiera
            </h2>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Monitoreo en tiempo real de ingresos y márgenes</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={downloadFinancialReport}
              className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Ingresos Semanales</h3>
                <p className="text-2xl font-black text-gray-900 tracking-tighter italic mt-1 font-mono">${revenueByDay.reduce((a, b) => a + b.total, 0).toLocaleString()}</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-black uppercase text-gray-400">Ventas Brut</span>
                </div>
              </div>
            </div>
            
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Delivery Pie Chart */}
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Canales de Venta</h3>
            <div className="flex-1 min-h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deliveryStats}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deliveryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-xs font-black text-gray-400 uppercase leading-none">Total</p>
                <p className="text-xl font-black text-gray-900 tracking-tighter">{orders.length}</p>
              </div>
            </div>
            <div className="space-y-3 mt-4">
              {deliveryStats.map(stat => (
                <div key={stat.name} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                    <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">{stat.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900">{stat.value} pedidos</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by Category Analysis */}
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 italic flex items-center gap-2">
                <UtensilsCrossed size={18} className="text-orange-600" />
                Ventas por Categoría
              </h3>
            </div>
            
            <div className="space-y-6">
              {(() => {
                const categories = [
                  { name: 'Tacos', total: 0, count: 0, color: 'bg-orange-500' },
                  { name: 'Gringas/Piratas', total: 0, count: 0, color: 'bg-indigo-500' },
                  { name: 'Bebidas', total: 0, count: 0, color: 'bg-blue-500' },
                  { name: 'Otros', total: 0, count: 0, color: 'bg-gray-400' }
                ];

                orders.forEach(o => {
                  const items = o.items.toLowerCase();
                  if (items.includes('taco')) {
                    categories[0].total += o.total;
                    categories[0].count++;
                  } else if (items.includes('gringa') || items.includes('pirata')) {
                    categories[1].total += o.total;
                    categories[1].count++;
                  } else if (items.includes('coca') || items.includes('agua') || items.includes('bebida')) {
                    categories[2].total += o.total;
                    categories[2].count++;
                  } else {
                    categories[3].total += o.total;
                    categories[3].count++;
                  }
                });

                const totalCatSales = categories.reduce((a, b) => a + b.total, 0) || 1;

                return categories.filter(c => c.total > 0).sort((a, b) => b.total - a.total).map((cat) => (
                  <div key={cat.name} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{cat.name}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase">{cat.count} pedidos</p>
                      </div>
                      <p className="text-xs font-black text-gray-900 font-mono">${cat.total.toLocaleString()}</p>
                    </div>
                    <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(cat.total / totalCatSales) * 100}%` }}
                        className={`h-full ${cat.color}`}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="mt-10 p-6 bg-indigo-50 rounded-3xl border border-indigo-100/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                  <TrendingUp size={16} />
                </div>
                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Proyección Mensual</p>
              </div>
              <p className="text-2xl font-black text-indigo-900 tracking-tighter italic">${(totalSales * 4).toLocaleString()}</p>
              <p className="text-[8px] font-bold text-indigo-600/60 uppercase mt-1">Basado en el rendimiento de los últimos 7 días</p>
            </div>
          </div>

          {/* Profit Margin Breakdown */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm flex-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 italic flex items-center gap-2 mb-8">
                <PieIcon size={18} className="text-emerald-500" />
                Estructura de Márgenes
              </h3>
              
              <div className="space-y-5">
                {[
                  { label: 'Costo de Insumos', val: 35, color: 'bg-rose-500', desc: 'Ingredientes y empaques' },
                  { label: 'Gastos Operativos', val: 20, color: 'bg-orange-500', desc: 'Renta, luz, servicios' },
                  { label: 'Margen Neto (Profit)', val: 45, color: 'bg-emerald-500', desc: 'Ganancia real retenida' },
                ].map(item => (
                  <div key={item.label} className="group">
                    <div className="flex justify-between items-center mb-1.5">
                      <div>
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{item.label}</span>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{item.desc}</p>
                      </div>
                      <span className="text-xs font-black text-gray-900 font-mono">{item.val}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden p-0.5 border border-gray-100">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.val}%` }}
                        className={`h-full rounded-full ${item.color} shadow-[0_0_8px_rgba(0,0,0,0.05)]`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ganancia Neta Estimada</p>
                  <p className="text-2xl font-black text-emerald-600 tracking-tighter italic font-mono">${(totalSales * 0.45).toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                  <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Salud Financiera</p>
                  <p className="text-[10px] font-black text-emerald-600 uppercase">Óptima</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-[32px] p-6 text-white shadow-xl">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Ticket Promedio</p>
                <p className="text-xl font-black italic font-mono">${orders.length > 0 ? (totalSales / orders.length).toFixed(0) : 0}</p>
              </div>
              <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Eficiencia Operativa</p>
                <p className="text-xl font-black italic font-mono text-gray-900">94.2%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReseñas = () => (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm mb-8">
        <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic flex items-center gap-2">
          <Star size={20} className="text-yellow-500 fill-yellow-500" />
          Feedback de Clientes
        </h2>
        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Lo que dicen tus clientes sobre el servicio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.filter(o => o.feedback).map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm group hover:shadow-xl hover:shadow-gray-200/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <UserCircle size={24} />
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      size={12} 
                      className={`${s <= (order.feedback?.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-100'}`} 
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm font-bold text-gray-900 italic line-clamp-4">
                "{order.feedback?.comment || 'Sin comentarios'}"
              </p>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">{order.userName}</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Pedido #{order.id.slice(-4)}</p>
              </div>
              <p className="text-[8px] font-black text-gray-300 uppercase">
                {order.feedback?.timestamp ? new Date(order.feedback.timestamp).toLocaleDateString() : ''}
              </p>
            </div>
          </motion.div>
        ))}
        {orders.filter(o => o.feedback).length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
              <MessageSquare size={40} />
            </div>
            <p className="text-sm font-bold text-gray-400 italic">Aún no hay reseñas registradas.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div id="admin-dashboard" className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/30 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Panel Administrativo</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Sabor Regio • San Pedro Garza García</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm relative z-50">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'general' ? 'bg-indigo-950 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            General
          </button>
          <button 
            onClick={() => setActiveTab('finanzas')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'finanzas' ? 'bg-indigo-950 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Finanzas
          </button>
          <button 
            onClick={() => setActiveTab('reseñas')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'reseñas' ? 'bg-indigo-950 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Reseñas
          </button>
        </div>
      </header>

      <div className="min-h-[500px]">
        {activeTab === 'general' && renderGeneral()}
        {activeTab === 'finanzas' && renderFinanzas()}
        {activeTab === 'reseñas' && renderReseñas()}
      </div>
    </div>
  );
};

