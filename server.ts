import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Retell from "retell-sdk";
import admin from "firebase-admin";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, collection, addDoc } from "firebase/firestore";
import twilio from "twilio";

// Función para obtener la instancia de Firestore (Usando Client SDK para evitar errores de permisos de Admin)
let dbClientInstance: any = null;
let dbError: any = null;

function getDbClient() {
  if (dbClientInstance) return dbClientInstance;
  
  try {
    const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(firebaseConfigPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
      
      const app = initializeClientApp(firebaseConfig);
      dbClientInstance = getClientFirestore(app, firebaseConfig.firestoreDatabaseId);
      console.log(">>> [DATABASE] Firestore Client SDK inicializado correctamente.");
      return dbClientInstance;
    }
  } catch (error: any) {
    dbError = error.message;
    console.error(">>> [DATABASE] Error inicializando Firestore Client:", error);
  }
  return null;
}

// --- CONSTANTES DE MENÚ Y LÓGICA DE PRECIOS ---
const MENU_PRICES: Record<string, number> = {
  // Tacos Individuales
  'pastor': 18,
  'al pastor': 18,
  'trompo': 18,
  'taco de trompo': 18,
  'bistec': 20,
  'chicharron': 20,
  'chicharrón': 20,
  'tripa': 25,
  'costilla': 24,
  'arrachera': 30,
  
  // Especialidades
  'gringa': 38,
  'campechana': 38,
  'pirata': 40,
  'quesadilla': 25,
  'quesataco': 30,
  'costra': 30,
  'papas': 35,
  'orden de papas': 35,

  // Bebidas
  'lata': 18,
  'refresco': 18,
  'coca': 18,
  'sprite': 18,
  'joya': 18,
  'fanta': 18,
  'pepsi': 18,
  '600': 25,
  'medio litro': 25,
  'natural': 15,
  'agua natural': 15,
  'agua': 15,
  'sabor': 20,
  'agua de sabor': 20,
  'cerveza': 30
};

const calculateTotalFromMenu = (itemsStr: string): number => {
  if (!itemsStr || itemsStr === "Pedido analizado" || itemsStr === "Pedido por voz") return 0;
  
  let total = 0;
  // Limpiar el texto y normalizar números escritos a dígitos
  let normalized = itemsStr.toLowerCase()
    .replace(/\bun\b|\buna\b|\buno\b/g, '1')
    .replace(/\bdos\b/g, '2')
    .replace(/\btres\b/g, '3')
    .replace(/\bcuatro\b/g, '4')
    .replace(/\bcinco\b/g, '5')
    .replace(/\bseis\b/g, '6')
    .replace(/\bsiete\b/g, '7')
    .replace(/\bocho\b/g, '8')
    .replace(/\bnueve\b/g, '9')
    .replace(/\bdiez\b/g, '10');

  // Separar el pedido en partes (por comas, " y ", ".", saltos de línea, etc.)
  // No separamos por "con" para no romper descripciones como "taco con queso"
  const parts = normalized.split(/,|\n|\.| y | e | mas | más |\+/).map(s => s.trim()).filter(Boolean);
  
  // Ordenar llaves por longitud descendente para evitar colisiones (ej. 'al pastor' antes que 'pastor')
  const sortedKeys = Object.keys(MENU_PRICES).sort((a, b) => b.length - a.length);

  parts.forEach(part => {
    // Buscar cantidad numérica en esta parte. Si no hay, asumimos 1.
    let qty = 1;
    const qtyMatch = part.match(/(\d+)/);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1]);
    }

    // Buscar si alguna palabra del menú está en esta parte
    let partPrice = 0;
    let matchFound = false;
    
    for (const key of sortedKeys) {
      if (part.includes(key)) {
        partPrice = MENU_PRICES[key];
        matchFound = true;
        console.log(`>>> [CALC] Coincidencia: ${qty} x "${key}" ($${partPrice}) en el fragmento "${part}"`);
        break; 
      }
    }

    if (matchFound) {
      total += (qty * partPrice);
    }
  });

  return total;
};

const parsePrice = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  // Limpiar símbolos de moneda y texto extra
  const cleaned = String(val).replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // Log de inicio
  console.log("Iniciando Sabor Regio Server...");

  // Health check inmediato
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Helper para enviar SMS con Twilio
  const sendSMS = async (to: string, message: string) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

    if (!accountSid || !authToken || !fromNumber) {
      console.warn(">>> [TWILIO] Faltan variables de configuración. Se omite el envío de SMS.");
      return null;
    }

    try {
      const client = twilio(accountSid, authToken);
      
      const digits = to.replace(/\D/g, '');
      const cleanTo = digits.length === 10 ? '+52' + digits : '+' + digits;
      
      console.log(`[TWILIO] Intentando enviar SMS de ${fromNumber} a ${cleanTo}`);

      const response = await client.messages.create({
        body: message,
        from: fromNumber,
        to: cleanTo
      });
      console.log(">>> [TWILIO SUCCESS] SMS enviado. SID:", response.sid);
      return response.sid;
    } catch (error: any) {
      console.error(">>> [TWILIO ERROR] No se pudo enviar el SMS:", error.message);
      return null;
    }
  };

  app.post("/api/send-sms", async (req, res) => {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: "to and message are required" });

    try {
      const sid = await sendSMS(to, message);
      res.json({ success: true, sid });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Webhook para Retell AI (Llamadas inteligentes)
  app.post("/api/webhooks/retell", async (req, res) => {
    const { event, call } = req.body;
    const db = getDbClient();
    console.log(`[RETELL WEBHOOK] Evento: ${event}`, call?.call_id);

    // Procesar cuando la llamada termina o se analiza
    if ((event === "call_ended" || event === "call_analyzed") && call && db) {
      try {
        const analysis = call.call_analysis || {};
        const customerNumber = call.from_number || "Desconocido";
        
        // Intentamos extraer datos estructurados
        const customData = analysis.custom_analysis_data || {};
        
        // Si no hay datos en customData, intentamos ver si vienen en el summary o transcript
        const summary = analysis.summary || "";
        
      // Intentar calcular el total basándonos en el menú local
      const itemsString = customData.order_summary || customData.pedido || summary || "Pedido analizado";
      let cleanTotal = calculateTotalFromMenu(itemsString);
      
      // Fallback: Si el cálculo local da 0, intentamos parsear lo que venga de Retell
      if (cleanTotal === 0) {
        let rawTotal = customData.total_price || customData.total || customData.price || 
                       customData.monto || customData.total_amount || customData.amount ||
                       customData.costo || customData.precio || 0;

        if (rawTotal === 0 || rawTotal === "0") {
          const keys = Object.keys(customData);
          const priceKey = keys.find(k => 
            k.toLowerCase().includes("total") || k.toLowerCase().includes("monto") || 
            k.toLowerCase().includes("price") || k.toLowerCase().includes("cost") || k.toLowerCase().includes("precio")
          );
          if (priceKey) rawTotal = customData[priceKey];
        }
        cleanTotal = parsePrice(rawTotal);
      }

      console.log(`>>> [RETELL WEBHOOK CALC] Items: "${itemsString}" -> Final Total: ${cleanTotal}`);

      const newOrder = {
        userId: "retell-ai-webhook",
        userName: customData.customer_name || customData.nombre || "Cliente por Llamada",
        items: itemsString,
        total: cleanTotal,
        status: "pendiente",
        tipoEntrega: customData.delivery_type || customData.tipo_entrega || "pendiente",
        timestamp: Date.now(),
        telefono: customerNumber,
        direccion: customData.address || customData.direccion || "Consultar grabación",
        notas: `Evento: ${event}. ID Llamada: ${call.call_id}.`,
      };

        // Evitar duplicados si ya se registró por herramienta manual (opcional, pero aquí lo registramos siempre si es análisis final)
        const docRef = await addDoc(collection(db, "pedidos"), newOrder);
        console.log(`[RETELL WEBHOOK] Pedido registrado ID: ${docRef.id}`);
        
        if (customerNumber !== "Desconocido") {
          const clientMsg = `¡Gracias por tu llamada!  Taco en Sabor Regio hemos registrado tu pedido: ${newOrder.items}. En breve te confirmaremos los detalles finales.`;
          await sendSMS(customerNumber, clientMsg);

          const adminPhone = process.env.ADMIN_PHONE_NUMBER;
          if (adminPhone) {
            const adminMsg = `🟢 NUEVO PEDIDO: ${newOrder.userName} (${customerNumber})\nItems: ${newOrder.items}\nTotal: $${newOrder.total}`;
            await sendSMS(adminPhone, adminMsg);
          }
        }
      } catch (error) {
        console.error("[RETELL WEBHOOK] Error:", error);
      }
    }

    res.status(200).json({ received: true });
  });

  // Webhook para llamadas de Twilio (Llamadas tradicionales - Fallback)
  app.post("/api/twilio/voice", async (req, res) => {
    const from = req.body.From || "Desconocido";
    const db = getDbClient();
    console.log(`Llamada entrante detectada desde: ${from}`);

    if (db) {
      try {
        const newOrder = {
          userId: "external-call",
          userName: "Llamada Externa",
          items: "Pendiente por definir (Llamada entrante)",
          total: 0,
          status: "pendiente",
          tipoEntrega: "pendiente",
          timestamp: Date.now(),
          telefono: from,
          direccion: "Pendiente",
          notas: "Llamada registrada automáticamente desde Twilio Webhook.",
        };
        await addDoc(collection(db, "pedidos"), newOrder);
        console.log("Contacto por llamada registrado en pedidos.");
      } catch (error) {
        console.error("Error registrando llamada en DB:", error);
      }
    }

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ language: 'es-MX' }, "Gracias por llamar a Sabor Regio. Su llamada ha sido registrada y un asesor se pondrá en contacto pronto.");
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  });

  // API Route: Create Web Call Access Token
  app.post("/api/create-web-call", async (req, res) => {
    try {
      const { agent_id } = req.body;
      if (!agent_id) return res.status(400).json({ error: "agent_id is required" });

      const apiKey = process.env.RETELL_API_KEY;
      if (!apiKey) {
        console.warn("RETELL_API_KEY no configurada");
        return res.status(500).json({ error: "RETELL_API_KEY is not configured on server" });
      }
      
      const retell = new Retell({ apiKey });
      const webCallResponse = await retell.call.createWebCall({
        agent_id: agent_id,
      });

      res.json({ access_token: webCallResponse.access_token });
    } catch (error: any) {
      console.error("Retell Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint para registrar pedidos desde Retell (Tool)
  app.post("/api/retell/register-order", async (req, res) => {
    console.log(">>> [RETELL TOOL CALL] Recibido:", JSON.stringify(req.body, null, 2));
    
    let db;
    try {
      db = getDbClient();
    } catch (e: any) {
      return res.status(500).json({ error: `Error obteniendo DB: ${e.message}` });
    }
    
    if (!db) {
      return res.status(500).json({ 
        error: "Servicio de pedidos no disponible (Firestore no inicializado)",
        dbError: dbError,
        configExists: fs.existsSync(path.join(process.cwd(), "firebase-applet-config.json")),
        cwd: process.cwd()
      });
    }

    try {
      // Retell suele enviar los argumentos en 'args' o directamente en el body
      const data = req.body.args || req.body.parameters || req.body; 
      console.log(">>> [RETELL DATA EXTRACTED]:", JSON.stringify(data, null, 2));
      
      // Mapeo flexible de campos (Soporta múltiples idiomas y formatos)
      const name = data.customer_name || data.nombre || data.nombre_cliente || data.client_name || "Cliente por Llamada";
      const rawItems = data.order_items || data.pedido || data.items || data.productos || data.order_summary || "Pedido por voz";
      const phone = data.customer_phone || data.telefono || data.phone || data.number || "No proporcionado";
      const address = data.customer_address || data.direccion || data.address || (String(data.delivery_type || "").toLowerCase().includes("recoger") ? "Recoger en local" : "No proporcionada");
      const type = data.delivery_type || data.tipo_entrega || data.entrega || "pickup";
      const itemsString = Array.isArray(rawItems) ? rawItems.join(", ") : String(rawItems);
      
      // Cálculo de precio local basado en el menú
      let cleanTotalArg = calculateTotalFromMenu(itemsString);

      // Fallback: Si el cálculo local da 0, intentamos parsear lo que venga de Retell
      if (cleanTotalArg === 0) {
        let rawTotalArg = data.total || data.total_price || data.precio_total || 
                          data.costo || data.price || data.monto || data.total_amount || 0;

        if (rawTotalArg === 0 || rawTotalArg === "0") {
          const keys = Object.keys(data);
          const priceKey = keys.find(k => 
            k.toLowerCase().includes("total") || k.toLowerCase().includes("monto") || 
            k.toLowerCase().includes("price") || k.toLowerCase().includes("cost") || k.toLowerCase().includes("precio")
          );
          if (priceKey) rawTotalArg = data[priceKey];
        }
        cleanTotalArg = parsePrice(rawTotalArg);
      }

      console.log(`>>> [VOICE TOOL CALC] Items: "${itemsString}" -> Final Total: ${cleanTotalArg}`);

      const notes = data.notes || data.notas || data.comentarios || "";

      const newOrder = {
        userId: "retell-voice-tool",
        userName: name,
        items: itemsString,
        total: cleanTotalArg,
        status: "pendiente",
        tipoEntrega: (String(type).toLowerCase().includes("domicilio") || String(type).toLowerCase().includes("delivery")) ? "delivery" : "pickup",
        timestamp: Date.now(),
        telefono: phone,
        direccion: address,
        notas: notes ? `Llamada Retell: ${notes}` : "Pedido capturado por asistente de voz",
      };

      console.log(">>> [RETELL PREPARING SAVE]:", JSON.stringify(newOrder, null, 2));
      const docRef = await addDoc(collection(db, "pedidos"), newOrder);
      console.log(">>> [RETELL SUCCESS] Pedido guardado en Firestore con ID:", docRef.id);
      
      // Intentar enviar SMS de confirmación a cliente y administrador
      if (newOrder.telefono && newOrder.telefono !== "No proporcionado") {
        try {
          const clientMsg = `¡Hola ${newOrder.userName}! Confirmamos tu pedido en Sabor Regio vía asistente de voz:\n\nPedido: ${newOrder.items}\nTotal: $${newOrder.total}\nEntrega: ${newOrder.tipoEntrega === 'delivery' ? 'A domicilio' : 'Recoger en sucursal'}`;
          await sendSMS(newOrder.telefono, clientMsg);
          
          const adminPhone = process.env.ADMIN_PHONE_NUMBER;
          if (adminPhone) {
            const adminMsg = `NUEVO PEDIDO (Voz): ${newOrder.userName} (${newOrder.telefono})\nItems: ${newOrder.items}\nTotal: $${newOrder.total}`;
            await sendSMS(adminPhone, adminMsg);
          }
        } catch (smsError: any) {
          console.warn(">>> [SMS WARNING] No se pudo enviar confirmación:", smsError.message);
        }
      }
      
      res.json({ 
        status: "success", 
        order_id: docRef.id,
        message: "Order registered successfully" 
      });
    } catch (error: any) {
      console.error(">>> [RETELL ERROR] Fallo al registrar pedido:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Integración con Vite
  if (process.env.NODE_ENV !== "production") {
    console.log("Configurando middleware de Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Iniciar escucha
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Servidor listo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
