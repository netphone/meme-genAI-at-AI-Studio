import React, { useState, useRef, useCallback } from 'react';
import { Upload, Wand2, Download, Image as ImageIcon, Type as TypeIcon, Edit, Plus, Trash2, Sparkles, Lightbulb, Palette, Settings, X, Check } from 'lucide-react';
import Button from './components/Button';
import MemeCanvas from './components/MemeCanvas';
import { generateMemeCaptions, editMemeImage, generateAutoMeme } from './services/geminiService';
import { MemeText, Template, ProcessingState, Theme } from './types';

// Constants
const DEFAULT_TEMPLATES: Template[] = [
  { id: '1', name: 'Laptop Work', url: 'https://picsum.photos/id/1/800/600' },
  { id: '2', name: 'Black Dog', url: 'https://picsum.photos/id/237/800/600' },
  { id: '3', name: 'Person in Blanket', url: 'https://picsum.photos/id/1025/800/600' },
  { id: '4', name: 'Jellyfish', url: 'https://picsum.photos/id/1069/800/600' },
];

const THEMES: Theme[] = [
  {
    id: 'cosmic',
    name: 'Cosmic Dark',
    appBg: 'bg-gray-900',
    panelBg: 'bg-gray-800',
    headerBg: 'bg-gray-900/90',
    textColor: 'text-gray-100',
    subTextColor: 'text-gray-400',
    borderColor: 'border-gray-700',
    accentColor: 'text-purple-400',
    iconColor: 'text-purple-400',
    primaryBtn: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-purple-900/20',
    secondaryBtn: 'bg-gray-700 hover:bg-gray-600 text-white border-transparent',
    dangerBtn: 'bg-red-600 hover:bg-red-500 text-white',
    canvasBg: 'bg-gray-950/50',
    inputBg: 'bg-gray-900'
  },
  {
    id: 'light',
    name: 'Clean Light',
    appBg: 'bg-gray-50',
    panelBg: 'bg-white',
    headerBg: 'bg-white/90',
    textColor: 'text-gray-900',
    subTextColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    accentColor: 'text-blue-600',
    iconColor: 'text-blue-500',
    primaryBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20',
    secondaryBtn: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200',
    dangerBtn: 'bg-red-500 hover:bg-red-400 text-white',
    canvasBg: 'bg-gray-100 border-gray-200',
    inputBg: 'bg-gray-50'
  },
  {
    id: 'cyber',
    name: 'Cyberpunk',
    appBg: 'bg-black',
    panelBg: 'bg-gray-900',
    headerBg: 'bg-black/90',
    textColor: 'text-yellow-400',
    subTextColor: 'text-cyan-400',
    borderColor: 'border-yellow-900',
    accentColor: 'text-cyan-400',
    iconColor: 'text-yellow-400',
    primaryBtn: 'bg-yellow-400 hover:bg-yellow-300 text-black font-bold shadow-yellow-900/20',
    secondaryBtn: 'bg-gray-900 border border-cyan-500 text-cyan-400 hover:bg-gray-800',
    dangerBtn: 'bg-red-600 hover:bg-red-500 text-white',
    canvasBg: 'bg-gray-900 border-yellow-900',
    inputBg: 'bg-black border border-yellow-900 text-yellow-400 placeholder-yellow-800'
  }
];

const INITIAL_CUSTOM_THEME: Theme = {
  id: 'custom',
  name: 'Custom Theme',
  appBg: 'bg-[#0f172a]',
  panelBg: 'bg-[#1e293b]',
  headerBg: 'bg-[#0f172a]/90',
  textColor: 'text-[#f8fafc]',
  subTextColor: 'text-[#94a3b8]',
  borderColor: 'border-[#334155]',
  accentColor: 'text-[#38bdf8]',
  iconColor: 'text-[#38bdf8]',
  primaryBtn: 'bg-[#38bdf8] hover:opacity-90 text-white shadow-lg',
  secondaryBtn: 'bg-[#1e293b] border border-[#334155] text-[#f8fafc] hover:opacity-80',
  dangerBtn: 'bg-[#ef4444] hover:opacity-90 text-white',
  canvasBg: 'bg-[#020617]/50',
  inputBg: 'bg-[#0f172a]'
};

function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [texts, setTexts] = useState<MemeText[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.IDLE);
  const [captions, setCaptions] = useState<string[]>([]);
  const [editPrompt, setEditPrompt] = useState('');
  
  // Theme State
  const [activeThemeId, setActiveThemeId] = useState<string>('cosmic');
  const [customTheme, setCustomTheme] = useState<Theme>(INITIAL_CUSTOM_THEME);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [paletteColors, setPaletteColors] = useState<string[]>(['#3b82f6', '#8b5cf6', '#10b981', '#1f2937', '#ffffff']);

  const activeTheme = activeThemeId === 'custom' ? customTheme : (THEMES.find(t => t.id === activeThemeId) || THEMES[0]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Theme Handler ---
  const toggleTheme = () => {
    // Cycle through presets only, custom is accessed via builder
    const presetThemes = THEMES.map(t => t.id);
    const currentIndex = presetThemes.indexOf(activeThemeId);
    let nextIndex = 0;
    if (currentIndex !== -1) {
       nextIndex = (currentIndex + 1) % presetThemes.length;
    }
    setActiveThemeId(presetThemes[nextIndex]);
  };

  const updateCustomThemePart = (part: keyof Theme, color: string) => {
    let className = '';
    // Generate Tailwind arbitrary value class based on the part type
    if (part === 'appBg' || part === 'panelBg' || part === 'canvasBg' || part === 'inputBg') {
      className = `bg-[${color}]`;
    } else if (part === 'headerBg') {
      className = `bg-[${color}]/90`;
    } else if (part === 'textColor' || part === 'subTextColor' || part === 'accentColor' || part === 'iconColor') {
      className = `text-[${color}]`;
    } else if (part === 'borderColor') {
      className = `border-[${color}]`;
    } else if (part === 'primaryBtn') {
      className = `bg-[${color}] hover:opacity-90 text-white shadow-lg shadow-[${color}]/20`;
    } else if (part === 'secondaryBtn') {
      className = `bg-[${color}] hover:opacity-80 text-white`;
    }
    
    if (className) {
      setCustomTheme(prev => ({ ...prev, [part]: className }));
      if (activeThemeId !== 'custom') {
        setActiveThemeId('custom');
      }
    }
  };

  const updatePaletteColor = (index: number, color: string) => {
    const newPalette = [...paletteColors];
    newPalette[index] = color;
    setPaletteColors(newPalette);
  };

  // --- Handlers ---

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setTexts([]); // Reset texts on new image
        setCaptions([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadTemplate = (url: string) => {
     fetch(url)
      .then(r => r.blob())
      .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
             setImageSrc(reader.result as string);
             setTexts([]);
             setCaptions([]);
          }
          reader.readAsDataURL(blob);
      })
      .catch(() => {
          setImageSrc(url);
      });
  };

  const addText = () => {
    if (!canvasRef.current) return;
    const newText: MemeText = {
      id: crypto.randomUUID(),
      text: 'Double Click to Edit',
      x: canvasRef.current.width / 2,
      y: canvasRef.current.height / 2,
      fontSize: 40,
      color: '#FFFFFF'
    };
    setTexts([...texts, newText]);
    setSelectedTextId(newText.id);
  };

  const updateText = (id: string, updates: Partial<MemeText>) => {
    setTexts(texts.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteText = (id: string) => {
    setTexts(texts.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'meme-gen-ai.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  // --- AI Features ---

  const handleAutoMeme = async () => {
    let currentImageSrc = imageSrc;
    if (!currentImageSrc) {
       const randomTemplate = DEFAULT_TEMPLATES[Math.floor(Math.random() * DEFAULT_TEMPLATES.length)];
       try {
         const res = await fetch(randomTemplate.url);
         const blob = await res.blob();
         currentImageSrc = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
         });
         setImageSrc(currentImageSrc);
       } catch (e) {
         console.error("Failed to load template for auto-meme", e);
         return;
       }
    }

    if (!currentImageSrc) return;

    setProcessingState(ProcessingState.ANALYZING);
    try {
      const result = await generateAutoMeme(currentImageSrc);
      
      if (canvasRef.current) {
         const width = canvasRef.current.width;
         const height = canvasRef.current.height;
         const newTexts: MemeText[] = [];
         
         if (result.topText) {
            newTexts.push({
               id: crypto.randomUUID(),
               text: result.topText.toUpperCase(),
               x: width / 2,
               y: 50,
               fontSize: 40,
               color: '#FFFFFF'
            });
         }
         
         if (result.bottomText) {
            newTexts.push({
               id: crypto.randomUUID(),
               text: result.bottomText.toUpperCase(),
               x: width / 2,
               y: height - 50,
               fontSize: 40,
               color: '#FFFFFF'
            });
         }
         setTexts(newTexts);
         setCaptions([]); 
      }

      setProcessingState(ProcessingState.SUCCESS);
    } catch (e) {
      console.error(e);
      setProcessingState(ProcessingState.ERROR);
    } finally {
      if (processingState !== ProcessingState.ERROR) {
          setTimeout(() => setProcessingState(ProcessingState.IDLE), 1000);
      }
    }
  };

  const handleMagicCaption = async () => {
    if (!imageSrc) return;
    setProcessingState(ProcessingState.ANALYZING);
    try {
      const suggestions = await generateMemeCaptions(imageSrc);
      setCaptions(suggestions);
      setProcessingState(ProcessingState.SUCCESS);
    } catch (e) {
      console.error(e);
      setProcessingState(ProcessingState.ERROR);
    } finally {
      if (processingState !== ProcessingState.ERROR) {
          setTimeout(() => setProcessingState(ProcessingState.IDLE), 1000);
      }
    }
  };

  const handleGenerativeEdit = async () => {
    if (!imageSrc || !editPrompt.trim()) return;
    setProcessingState(ProcessingState.EDITING);
    try {
      const newImageBase64 = await editMemeImage(imageSrc, editPrompt);
      if (newImageBase64) {
        setImageSrc(newImageBase64);
        setEditPrompt('');
      }
      setProcessingState(ProcessingState.SUCCESS);
    } catch (e) {
      console.error(e);
      setProcessingState(ProcessingState.ERROR);
    } finally {
        setTimeout(() => setProcessingState(ProcessingState.IDLE), 1000);
    }
  };

  const applyCaption = (caption: string) => {
    if (!canvasRef.current) return;
    
    const newText: MemeText = {
      id: crypto.randomUUID(),
      text: caption,
      x: canvasRef.current.width / 2,
      y: canvasRef.current.height - 50,
      fontSize: 32,
      color: '#FFFFFF'
    };
    setTexts([...texts, newText]);
    setSelectedTextId(newText.id);
  };

  const selectedText = texts.find(t => t.id === selectedTextId);

  return (
    <div className={`min-h-screen ${activeTheme.appBg} ${activeTheme.textColor} flex flex-col font-sans transition-colors duration-500`}>
      {/* Header */}
      <header className={`border-b ${activeTheme.borderColor} ${activeTheme.headerBg} backdrop-blur-md sticky top-0 z-20 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Wand2 size={20} className="text-white" />
            </div>
            <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${activeThemeId === 'cyber' ? 'from-yellow-400 to-red-500' : 'from-pink-400 to-purple-400'}`}>
              MemeGen AI
            </h1>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4">
             <Button
                variant="custom"
                onClick={() => setIsBuilderOpen(true)}
                className={`p-2 rounded-full ${activeTheme.panelBg} ${activeTheme.borderColor} border hover:bg-opacity-80 transition-all ${activeTheme.textColor}`}
                title="Customize Scheme: Add specific colors to a palette, then assign to areas."
             >
                <Settings size={18} />
             </Button>

             <Button
                variant="custom"
                onClick={toggleTheme}
                className={`p-2 rounded-full ${activeTheme.panelBg} ${activeTheme.borderColor} border hover:bg-opacity-80 transition-all ${activeTheme.textColor}`}
                title={`Switch Preset (Current: ${activeTheme.name})`}
             >
                <Palette size={18} />
             </Button>

             <Button 
               variant="custom"
               onClick={handleDownload} 
               disabled={!imageSrc}
               icon={<Download size={18} />}
               className={`${activeTheme.primaryBtn} transform transition-all duration-300 hover:scale-105 hover:-translate-y-0.5`}
             >
               Export
             </Button>
          </div>
        </div>
      </header>

      {/* Theme Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`${activeTheme.panelBg} border ${activeTheme.borderColor} ${activeTheme.textColor} rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden`}>
            <div className={`p-4 border-b ${activeTheme.borderColor} flex justify-between items-center ${activeTheme.headerBg}`}>
               <h2 className="font-bold flex items-center"><Settings className="w-5 h-5 mr-2" /> Theme Builder</h2>
               <button onClick={() => setIsBuilderOpen(false)} className="hover:opacity-70"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Palette Section */}
              <div>
                 <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${activeTheme.subTextColor}`}>1. Build Your Palette</h3>
                 <div className="flex justify-between gap-2 p-3 rounded-xl bg-black/10">
                    {paletteColors.map((color, idx) => (
                      <div key={idx} className="group relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-offset-2 ring-transparent hover:ring-gray-400 transition-all shadow-lg cursor-pointer">
                        <input 
                          type="color" 
                          value={color} 
                          onChange={(e) => updatePaletteColor(idx, e.target.value)}
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                        />
                      </div>
                    ))}
                 </div>
                 <p className={`text-xs mt-2 ${activeTheme.subTextColor}`}>Click on any circle to change its color.</p>
              </div>

              {/* Assignment Section */}
              <div>
                <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${activeTheme.subTextColor}`}>2. Assign to Interface</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Main Background', key: 'appBg' },
                    { label: 'Cards & Panels', key: 'panelBg' },
                    { label: 'Header Bar', key: 'headerBg' },
                    { label: 'Primary Text', key: 'textColor' },
                    { label: 'Buttons', key: 'primaryBtn' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                       <span className="text-sm font-medium">{item.label}</span>
                       <div className="flex gap-2">
                          {paletteColors.map((color, idx) => (
                             <button
                               key={idx}
                               onClick={() => updateCustomThemePart(item.key as keyof Theme, color)}
                               className="w-6 h-6 rounded-full border border-gray-500/30 hover:scale-110 transition-transform"
                               style={{ backgroundColor: color }}
                               title={`Apply this color to ${item.label}`}
                             />
                          ))}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={`p-4 border-t ${activeTheme.borderColor} ${activeTheme.headerBg} flex justify-end`}>
               <Button onClick={() => setIsBuilderOpen(false)} variant="custom" className={`${activeTheme.primaryBtn} px-6`}>
                 Done
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Canvas & Main Image */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <MemeCanvas 
            imageSrc={imageSrc} 
            texts={texts}
            onTextUpdate={updateText}
            onTextSelect={setSelectedTextId}
            selectedTextId={selectedTextId}
            canvasRef={canvasRef}
            className={`${activeTheme.canvasBg} ${activeTheme.borderColor}`}
          />

          {/* Prompt Editor (Generative Edit) */}
          <div className={`${activeTheme.panelBg} rounded-xl p-4 border ${activeTheme.borderColor} backdrop-blur-sm transition-colors duration-500`}>
             <div className="flex items-center space-x-2 mb-2">
                <Edit className={`w-5 h-5 ${activeTheme.accentColor}`} />
                <h3 className={`font-medium ${activeTheme.textColor}`}>AI Generative Edit</h3>
             </div>
             <div className="flex space-x-2">
               <input 
                 type="text" 
                 placeholder="Describe how to change the image (e.g. 'Make it retro', 'Add a cat')" 
                 className={`flex-1 ${activeTheme.inputBg} border ${activeTheme.borderColor} rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder-gray-500 ${activeTheme.textColor}`}
                 value={editPrompt}
                 onChange={(e) => setEditPrompt(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleGenerativeEdit()}
               />
               <Button 
                 onClick={handleGenerativeEdit} 
                 isLoading={processingState === ProcessingState.EDITING}
                 disabled={!imageSrc || !editPrompt}
                 variant="custom"
                 className={activeTheme.secondaryBtn}
               >
                 Generate
               </Button>
             </div>
             <p className={`text-xs mt-2 ${activeTheme.subTextColor}`}>Powered by Gemini 2.5 Flash Image (Nano Banana)</p>
          </div>
        </div>

        {/* Right Column: Tools & Controls */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* 1. Upload & Templates */}
          <div className={`${activeTheme.panelBg} rounded-xl p-5 border ${activeTheme.borderColor} shadow-lg transition-colors duration-500`}>
             <h3 className={`font-semibold ${activeTheme.textColor} mb-4 flex items-center`}>
                <ImageIcon className={`w-5 h-5 mr-2 ${activeTheme.iconColor}`} /> Source Image
             </h3>
             
             <input 
               type="file" 
               accept="image/*" 
               ref={fileInputRef} 
               className="hidden" 
               onChange={handleFileUpload} 
             />
             <Button 
                variant="custom" 
                className={`w-full mb-4 border-dashed border-2 transition-colors ${activeTheme.secondaryBtn}`}
                onClick={() => fileInputRef.current?.click()}
                icon={<Upload size={18} />}
             >
                Upload Photo
             </Button>

             <div className="grid grid-cols-4 gap-2">
               {DEFAULT_TEMPLATES.map(tmpl => (
                 <button 
                   key={tmpl.id}
                   onClick={() => loadTemplate(tmpl.url)}
                   className={`relative aspect-square rounded-lg overflow-hidden border ${activeTheme.borderColor} hover:border-purple-500 hover:ring-2 hover:ring-purple-500/50 transition-all opacity-80 hover:opacity-100`}
                 >
                   <img src={tmpl.url} alt={tmpl.name} className="w-full h-full object-cover" />
                 </button>
               ))}
             </div>
          </div>

          {/* 2. Magic Captions */}
          <div className={`${activeTheme.panelBg} rounded-xl p-5 border ${activeTheme.borderColor} shadow-lg transition-colors duration-500`}>
             <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${activeTheme.textColor} flex items-center`}>
                  <Wand2 className={`w-5 h-5 mr-2 ${activeTheme.iconColor}`} /> Magic Captions
                </h3>
                {captions.length > 0 && (
                   <button onClick={() => setCaptions([])} className={`text-xs ${activeTheme.subTextColor} hover:underline transition-colors`}>Clear</button>
                )}
             </div>

             {/* Auto-Meme Button */}
             <Button 
                variant="custom" 
                className={`w-full mb-3 transition-all ${activeTheme.primaryBtn}`}
                onClick={handleAutoMeme}
                isLoading={processingState === ProcessingState.ANALYZING}
                icon={<Sparkles size={18} />}
             >
                Auto-Generate Meme
             </Button>

             {/* Generate List Button */}
             <Button 
                variant="custom" 
                className={`w-full mb-4 text-sm ${activeTheme.secondaryBtn}`}
                onClick={handleMagicCaption}
                isLoading={processingState === ProcessingState.ANALYZING}
                disabled={!imageSrc}
                icon={<Lightbulb size={16} />}
             >
                Generate Idea List
             </Button>

             <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {captions.map((cap, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => applyCaption(cap)}
                    className={`p-3 ${activeTheme.inputBg} hover:opacity-80 border ${activeTheme.borderColor} rounded-lg cursor-pointer transition-all hover:translate-x-1 text-sm ${activeTheme.textColor}`}
                  >
                    "{cap}"
                  </div>
                ))}
             </div>
             <p className={`text-xs mt-2 text-center ${activeTheme.subTextColor}`}>Powered by Gemini 3 Pro Preview</p>
          </div>

          {/* 3. Text Controls */}
          <div className={`${activeTheme.panelBg} rounded-xl p-5 border ${activeTheme.borderColor} shadow-lg transition-colors duration-500`}>
             <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${activeTheme.textColor} flex items-center`}>
                  <TypeIcon className={`w-5 h-5 mr-2 ${activeTheme.iconColor}`} /> Text Layers
                </h3>
                <Button 
                   variant="custom" 
                   onClick={addText} 
                   className={`!px-2 !py-1 text-xs ${activeTheme.secondaryBtn}`}
                   icon={<Plus size={14}/>}
                   disabled={!imageSrc}
                >
                  Add
                </Button>
             </div>

             {selectedText ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div>
                      <label className={`text-xs ${activeTheme.subTextColor} block mb-1`}>Content</label>
                      <textarea 
                        value={selectedText.text}
                        onChange={(e) => updateText(selectedText.id, { text: e.target.value })}
                        className={`w-full ${activeTheme.inputBg} border ${activeTheme.borderColor} rounded p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-colors ${activeTheme.textColor}`}
                        rows={2}
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`text-xs ${activeTheme.subTextColor} block mb-1`}>Size ({selectedText.fontSize}px)</label>
                        <input 
                           type="range" 
                           min="12" 
                           max="120" 
                           value={selectedText.fontSize}
                           onChange={(e) => updateText(selectedText.id, { fontSize: parseInt(e.target.value) })}
                           className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${activeTheme.subTextColor} block mb-1`}>Color</label>
                        <input 
                           type="color" 
                           value={selectedText.color}
                           onChange={(e) => updateText(selectedText.id, { color: e.target.value })}
                           className={`w-full h-8 rounded cursor-pointer ${activeTheme.inputBg} border ${activeTheme.borderColor}`}
                        />
                      </div>
                   </div>
                   <Button 
                      variant="custom" 
                      className={`w-full !py-1 text-sm mt-2 opacity-80 hover:opacity-100 ${activeTheme.dangerBtn}`}
                      onClick={() => deleteText(selectedText.id)}
                      icon={<Trash2 size={14} />}
                   >
                     Remove Layer
                   </Button>
                </div>
             ) : (
                <p className={`text-sm py-4 text-center ${activeTheme.subTextColor}`}>Select a text on the canvas to edit properties</p>
             )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;