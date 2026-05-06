/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
#Rol
Eres el asistente virtual amable, claro y resolutivo de una taquería en Monterrey llamada "Sabor Regio". Atiendes a clientes que quieren hacer pedidos. Actúa como una persona real del equipo de recepción, pero sin usar nombres propios. Nunca digas que eres "Tania" ni ningún otro nombre específico. No menciones que eres un asistente de forma robótica.

#Tarea
Tu función es registrar pedidos. Debes identificar si el cliente quiere su pedido para recoger o a domicilio.

#Reglas de Datos
1. Si el pedido es PARA RECOGER: Necesitas Nombre y Teléfono.
2. Si el pedido es A DOMICILIO: Necesitas Nombre, Teléfono y Dirección Completa.

#Guía de Conversación
- Sé amable y eficiente.
- Si falta información, pídela de forma natural.
- Una vez que tengas TODOS los datos necesarios según el tipo de entrega, usa la función registra_pedido.

#Lógica de Pedidos
- Una orden = 5 tacos (solo para tacos individuales). No aplica a especialidades como Gringas o Piratas.

#Consultas de precios
- Consulta el menú si es necesario. Precios en pesos.

#Finalización
Confirma que el pedido ha sido registrado y despídete amablemente.
`;

export async function getChatResponse(message: string, history: { role: string; text: string }[]) {
  try {
    const contents = [
      ...history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        tools: [
          {
            functionDeclarations: [
              {
                name: "registra_pedido",
                description: "Registra un pedido en la base de datos",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    nombre: { type: Type.STRING },
                    pedido: { type: Type.STRING },
                    tipo_entrega: { type: Type.STRING, enum: ["Recoger", "Domicilio"] },
                    telefono: { type: Type.STRING },
                    direccion: { type: Type.STRING, description: "Dirección completa si es a domicilio, de lo contrario omitir o poner 'Para recoger'" }
                  },
                  required: ["nombre", "pedido", "tipo_entrega", "telefono"]
                }
              }
            ]
          }
        ]
      }
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      return {
        text: response.text || "Registrando tu pedido...",
        functionCall: functionCalls[0]
      };
    }

    return { text: response.text || "Lo siento, no pude entender eso." };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Estamos experimentando dificultades técnicas. Por favor, intenta de nuevo más tarde." };
  }
}

export async function categorizeMessage(message: string): Promise<Category> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Categoriza el siguiente mensaje de un cliente en una de estas categorías: Ventas, Pedidos, Soporte, Humano, Otros. 
      Responde SOLO con el nombre de la categoría.
      Mensaje: "${message}"`,
      config: {
        responseMimeType: "text/plain",
      }
    });

    const category = response.text?.trim() as Category;
    const validCategories: Category[] = ['Ventas', 'Pedidos', 'Soporte', 'Humano', 'Otros'];
    return validCategories.includes(category) ? category : 'Otros';
  } catch (error) {
    console.error("Categorization Error:", error);
    return 'Otros';
  }
}
