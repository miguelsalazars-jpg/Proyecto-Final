/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'Ventas' | 'Soporte' | 'Pedidos' | 'Humano' | 'Otros';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'agent';
  timestamp: number;
  category?: Category;
}

export interface Feedback {
  rating: number;
  comment: string;
  timestamp: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  items: string;
  total: number;
  status: 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
  timestamp: number;
  tipoEntrega: 'delivery' | 'pickup';
  direccion?: string;
  telefono?: string;
  notas?: string;
  eta?: number;
  feedback?: Feedback;
}

export interface ChatSession {
  id: string;
  customerName: string;
  messages: Message[];
  status: 'open' | 'resolved' | 'escalated';
  category: Category;
  lastUpdate: number;
}
