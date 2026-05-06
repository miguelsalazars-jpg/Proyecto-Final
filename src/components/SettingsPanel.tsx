/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Save, Volume2, Building2, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';

export interface AppSettings {
  companyName: string;
  phoneNumber: string;
  whatsappNumber: string;
  voiceURI: string;
  voicePitch: number;
  voiceRate: number;
}

export const SettingsPanel: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    companyName: 'Taquería Sabor Regio',
    phoneNumber: '',
    whatsappNumber: '',
    voiceURI: '',
    voicePitch: 1,
    voiceRate: 1,
  });

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices.filter(v => v.lang.startsWith('es')));
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const saved = localStorage.getItem('servicio_agil_settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('servicio_agil_settings', JSON.stringify(settings));
    alert('Configuración guardada correctamente.');
  };

  return (
    <div id="settings-panel" className="p-8 max-w-2xl mx-auto space-y-8 bg-white min-h-screen border-x border-gray-50 shadow-sm">
      <header className="border-b border-gray-100 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="text-gray-500 text-sm">Personaliza cómo interactúa el chat con tus clientes.</p>
      </header>

      <div className="space-y-6">
        {/* Empresa */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold border-b border-indigo-50 pb-2">
            <Building2 size={18} />
            <h2>Identidad de la Empresa</h2>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nombre de la Empresa</label>
            <input 
              type="text" 
              value={settings.companyName}
              onChange={(e) => setSettings({...settings, companyName: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Ej. Mi PyME S.A."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Teléfono Directo</label>
              <input 
                type="tel" 
                value={settings.phoneNumber || ''}
                onChange={(e) => setSettings({...settings, phoneNumber: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="+52..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">WhatsApp (Link)</label>
              <input 
                type="tel" 
                value={settings.whatsappNumber || ''}
                onChange={(e) => setSettings({...settings, whatsappNumber: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="521..."
              />
            </div>
          </div>
        </section>

        {/* Voz */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold border-b border-indigo-50 pb-2">
            <Volume2 size={18} />
            <h2>Configuración de Voz</h2>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Seleccionar Voz</label>
            <select 
              value={settings.voiceURI}
              onChange={(e) => setSettings({...settings, voiceURI: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
            >
              <option value="">Predeterminada del sistema</option>
              {voices.map(voice => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tono (Pitch): {settings.voicePitch}</label>
              <input 
                type="range" min="0.5" max="2" step="0.1"
                value={settings.voicePitch}
                onChange={(e) => setSettings({...settings, voicePitch: parseFloat(e.target.value)})}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Velocidad (Rate): {settings.voiceRate}</label>
              <input 
                type="range" min="0.5" max="2" step="0.1"
                value={settings.voiceRate}
                onChange={(e) => setSettings({...settings, voiceRate: parseFloat(e.target.value)})}
                className="w-full"
              />
            </div>
          </div>
        </section>

        <button 
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Save size={18} />
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};
