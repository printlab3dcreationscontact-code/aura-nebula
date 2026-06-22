import React, { useState, useEffect, useRef } from "react";
import { 
  Globe, Search, ArrowLeft, ArrowRight, RotateCw, Home, Bookmark, History, 
  Sparkles, Cpu, BookOpen, Volume2, VolumeX, Plus, X, ExternalLink, 
  ShieldAlert, Gauge, Send, Share2, CornerDownRight, CheckCircle2, AlertTriangle, Play, Pause, Square, Info, ShieldCheck, Compass, HelpCircle, Flame, Lightbulb, Laptop
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Tab, TabType, SimulatedPage, SearchResultsPage, Bookmark as BookmarkType, HistoryEntry, SimulatedLink } from "./types";

// Default preset content to offer immediate browsing
const PRESETS = [
  { name: "Wikipedia - IA", url: "https://fr.wikipedia.org/wiki/Intelligence_artificielle", icon: "book-open", site: "Wikipedia" },
  { name: "Hacker News", url: "https://news.ycombinator.com", icon: "compass", site: "YCombinator" },
  { name: "TechCrunch", url: "https://techcrunch.com", icon: "flame", site: "TechCrunch" },
  { name: "NASA Space News", url: "https://www.nasa.gov/news", icon: "globe", site: "NASA" },
];

export default function App() {
  // Tabs management
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: "tab-1",
      title: "Nouvel Onglet",
      url: "home",
      type: "home",
      history: [],
      forwardHistory: [],
      pageContent: null,
      searchContent: null,
      isLoading: false,
      error: null,
      chatHistory: [
        { role: "model", text: "Bonjour ! Je suis votre Copilote de navigation. Entrez une URL réelle, recherchez un sujet ou cliquez sur un raccourci pour démarrer." }
      ]
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");
  
  // Settings / Panel state
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [activeCompanionTab, setActiveCompanionTab] = useState<'insights' | 'chat'>('insights');
  
  // Speech synthesis state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechSpeed, setSpeechSpeed] = useState<number>(1);
  
  // Local state for bar input
  const [addressBarText, setAddressBarText] = useState<string>("");
  
  // Ref for chat scrolling and containing parent scroll views safely
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Sync Input bar with active tab url
  useEffect(() => {
    if (activeTab.type === 'home') {
      setAddressBarText("");
    } else {
      setAddressBarText(activeTab.url);
    }
    // Set Companion tab to insights when content loads
    if (activeTab.pageContent) {
      setActiveCompanionTab('insights');
    }
  }, [activeTabId, activeTab.url, activeTab.type]);

  // Load Bookmarks & History from LocalStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem("ai_browser_bookmarks");
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Set initial sample bookmarks
      const initialBookmarks: BookmarkType[] = [
        { id: "b1", title: "Wikipédia - Intelligence Artificielle", url: "https://fr.wikipedia.org/wiki/Intelligence_artificielle", siteName: "Wikipédia" },
        { id: "b2", title: "TechCrunch - Technology News", url: "https://techcrunch.com", siteName: "TechCrunch" },
      ];
      setBookmarks(initialBookmarks);
      localStorage.setItem("ai_browser_bookmarks", JSON.stringify(initialBookmarks));
    }

    const savedHistory = localStorage.getItem("ai_browser_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Scroll to bottom of chat safely using scrollTop to avoid window scroll page glitches
  useEffect(() => {
    if (activeCompanionTab === 'chat' && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeTab.chatHistory, activeCompanionTab]);

  // Handle TTS window cancel on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Save Bookmarks Helper
  const saveBookmarks = (newBookmarks: BookmarkType[]) => {
    setBookmarks(newBookmarks);
    localStorage.setItem("ai_browser_bookmarks", JSON.stringify(newBookmarks));
  };

  // Save History Helper
  const recordHistory = (title: string, url: string, type: TabType) => {
    const entry: HistoryEntry = {
      id: "hist-" + Date.now() + Math.random().toString(36).substr(2, 5),
      title: title || url,
      url,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      type
    };
    const updatedHistory = [entry, ...history.slice(0, 49)]; // Limit to last 50
    setHistory(updatedHistory);
    localStorage.setItem("ai_browser_history", JSON.stringify(updatedHistory));
  };

  // Browser Navigation: GO / SEARCH
  const navigateTo = async (input: string, tabId = activeTabId, addToHistory = true) => {
    if (!input.trim()) return;

    // Determine type: Search or Direct URL
    let targetType: TabType = 'page';
    let cleanUrlOrQuery = input.trim();

    // Check if it's a URL
    const isUrl = /^(https?:\/\/)?((www\.)?[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+)(\/[a-zA-Z0-9_.-]*)*\/?(\?.*)?$/.test(cleanUrlOrQuery) && !cleanUrlOrQuery.includes(" ");
    
    if (isUrl) {
      targetType = 'page';
      if (!/^https?:\/\//i.test(cleanUrlOrQuery)) {
        cleanUrlOrQuery = 'https://' + cleanUrlOrQuery;
      }
    } else {
      targetType = 'search';
    }

    // Stop speaking if active
    stopSpeech();

    // Update active tab state to loading
    setTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        const historySnapshot = [...t.history];
        if (addToHistory && t.url !== "home") {
          historySnapshot.push({ url: t.url, type: t.type, title: t.title });
        }
        return {
          ...t,
          title: isUrl ? cleanUrlOrQuery : `Web Search: ${cleanUrlOrQuery}`,
          url: cleanUrlOrQuery,
          type: targetType,
          isLoading: true,
          error: null,
          history: historySnapshot,
          forwardHistory: [], // reset forward history on new navigation
          pageContent: null,
          searchContent: null
        };
      }
      return t;
    }));

    try {
      if (targetType === 'search') {
        // Fetch Search Results Grounding
        const response = await fetch("/api/browser/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: cleanUrlOrQuery })
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData?.error || "Erreur lors de la recherche.");
        }

        const data: SearchResultsPage = await response.json();
        
        setTabs(prev => prev.map(t => {
          if (t.id === tabId) {
            recordHistory(`Recherche : ${cleanUrlOrQuery}`, cleanUrlOrQuery, 'search');
            return {
              ...t,
              title: `Recherche: ${cleanUrlOrQuery}`,
              isLoading: false,
              searchContent: data,
              chatHistory: [
                { role: "model", text: `J'ai effectué une recherche approfondie en temps réel pour "${data.query}". Les résultats proviennent directement des données de Google Search. Vous pouvez cliquer sur un résultat ou me poser des questions sur les conclusions générales.` }
              ]
            };
          }
          return t;
        }));
      } else {
        // Fetch Direct Page simulation via urlContext
        const response = await fetch("/api/browser/browse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: cleanUrlOrQuery })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData?.error || "Impossible de charger ou d'accéder à ce site.");
        }

        const data: SimulatedPage = await response.json();

        setTabs(prev => prev.map(t => {
          if (t.id === tabId) {
            recordHistory(data.title, data.url, 'page');
            return {
              ...t,
              title: data.metadata?.siteName ? `${data.metadata.siteName} - ${data.title}` : data.title,
              isLoading: false,
              pageContent: data,
              chatHistory: [
                { role: "model", text: `Bienvenue sur le lecteur intelligent du site. J'ai analysé la page de **${data.metadata.siteName || "ce site"}** (${data.url}). Je l'ai reformulée ci-contre. \n\nVous trouverez à droite ma fiche d'analyse d'esprit critique (crédibilité, biais, sentiment). Vous pouvez également me poser des questions précises sur le contenu de cet article !` }
              ]
            };
          }
          return t;
        }));
      }
    } catch (error: any) {
      console.error(error);
      setTabs(prev => prev.map(t => {
        if (t.id === tabId) {
          return {
            ...t,
            isLoading: false,
            error: error?.message || "Un problème technique empêche d'accéder à ce site. Veuillez vérifier vos secrets d'API GEMINI_API_KEY ou réessayer."
          };
        }
        return t;
      }));
    }
  };

  // Back action
  const goBack = () => {
    if (activeTab.history.length === 0) return;
    const historySnapshot = [...activeTab.history];
    const previous = historySnapshot.pop()!;
    
    // Push current to forward history
    const forwardSnapshot = [{ url: activeTab.url, type: activeTab.type, title: activeTab.title }, ...activeTab.forwardHistory];

    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        return {
          ...t,
          url: previous.url,
          type: previous.type,
          title: previous.title,
          history: historySnapshot,
          forwardHistory: forwardSnapshot,
        };
      }
      return t;
    }));

    if (previous.url === "home") {
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          return {
            ...t,
            pageContent: null,
            searchContent: null,
            error: null
          };
        }
        return t;
      }));
    } else {
      navigateTo(previous.url, activeTabId, false);
    }
  };

  // Forward action
  const goForward = () => {
    if (activeTab.forwardHistory.length === 0) return;
    const forwardSnapshot = [...activeTab.forwardHistory];
    const next = forwardSnapshot.shift()!;

    // Push current to history
    const historySnapshot = [...activeTab.history, { url: activeTab.url, type: activeTab.type, title: activeTab.title }];

    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        return {
          ...t,
          url: next.url,
          type: next.type,
          title: next.title,
          history: historySnapshot,
          forwardHistory: forwardSnapshot,
        };
      }
      return t;
    }));

    navigateTo(next.url, activeTabId, false);
  };

  // Refresh current
  const handleRefresh = () => {
    if (activeTab.url !== "home") {
      navigateTo(activeTab.url, activeTabId, false);
    }
  };

  // Go to homepage within tab
  const goHome = () => {
    stopSpeech();
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        return {
          ...t,
          title: "Nouvel Onglet",
          url: "home",
          type: "home" as TabType,
          pageContent: null,
          searchContent: null,
          error: null,
          isLoading: false,
          history: [...t.history, { url: t.url, type: t.type, title: t.title }]
        };
      }
      return t;
    }));
  };

  // Open New Tab
  const createNewTab = () => {
    const newId = "tab-" + Date.now();
    const newTab: Tab = {
      id: newId,
      title: "Nouvel Onglet",
      url: "home",
      type: "home",
      history: [],
      forwardHistory: [],
      pageContent: null,
      searchContent: null,
      isLoading: false,
      error: null,
      chatHistory: [
        { role: "model", text: "Onglet ouvert ! Utilisez le moteur de recherche IA ou entrez directement une adresse web (ex: wikipedia.org)." }
      ]
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  // Close Tab
  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Keep at least one tab
    
    const filtered = tabs.filter(t => t.id !== tabId);
    setTabs(filtered);
    
    if (activeTabId === tabId) {
      // Set active to the tab next or previous to closed
      const index = tabs.findIndex(t => t.id === tabId);
      const nextActiveIndex = index === 0 ? 0 : index - 1;
      setActiveTabId(filtered[nextActiveIndex].id);
    }
    stopSpeech();
  };

  // Bookmarking handler
  const toggleBookmark = () => {
    if (activeTab.type === 'home' || activeTab.isLoading || activeTab.error) return;
    
    const url = activeTab.url;
    const isBookmarked = bookmarks.some(b => b.url === url);
    if (isBookmarked) {
      saveBookmarks(bookmarks.filter(b => b.url !== url));
    } else {
      const title = activeTab.pageContent?.title || activeTab.title || url;
      const siteName = activeTab.pageContent?.metadata?.siteName || "Web";
      const newB: BookmarkType = {
        id: "book-" + Date.now(),
        title,
        url,
        siteName
      };
      saveBookmarks([...bookmarks, newB]);
    }
  };

  // Co-pilot Send Message in Chat
  const sendChatMessage = async (text: string) => {
    if (!text.trim()) return;

    // Append user message
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        return {
          ...t,
          chatHistory: [...t.chatHistory, { role: "user", text }]
        };
      }
      return t;
    }));

    // Temp model response to animate loading
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        return {
          ...t,
          chatHistory: [...t.chatHistory, { role: "model", text: "..." }]
        };
      }
      return t;
    }));

    try {
      const pageCtx = activeTab.pageContent;
      const filteredHistory = activeTab.chatHistory.filter(h => h.text !== "...");

      const response = await fetch("/api/browser/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: filteredHistory,
          pageContext: pageCtx,
          userMessage: text
        })
      });

      if (!response.ok) {
        throw new Error("Impossible de joindre le copilote IA.");
      }

      const resData = await response.json();
      
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          // Remove the "..." loader message and append actual response
          const historyWithoutLoader = t.chatHistory.filter(h => h.text !== "...");
          return {
            ...t,
            chatHistory: [...historyWithoutLoader, { role: "model", text: resData.text }]
          };
        }
        return t;
      }));
    } catch (error: any) {
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          const historyWithoutLoader = t.chatHistory.filter(h => h.text !== "...");
          return {
            ...t,
            chatHistory: [...historyWithoutLoader, { role: "model", text: `Désolé, j'ai rencontré un problème : ${error?.message || "Une erreur inconnue s'est produite."}` }]
          };
        }
        return t;
      }));
    }
  };

  // Handle Suggested Question click
  const handleSuggestedQuestion = (question: string) => {
    setActiveCompanionTab('chat');
    sendChatMessage(question);
  };

  // Native Speech Synthesis reading (Audio Summarizer player)
  const startSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Votre navigateur ne supporte pas la synthèse vocale intégrée.");
      return;
    }
    window.speechSynthesis.cancel();
    
    // Clean text from markdown notations
    const cleanText = text
      .replace(/[*#_\-\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = activeTab.pageContent?.metadata?.language === 'en' ? 'en-US' : 'fr-FR';
    utterance.rate = speechSpeed;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const toggleSpeechActive = () => {
    if (isSpeaking) {
      stopSpeech();
    } else {
      if (activeTab.pageContent) {
        const p = activeTab.pageContent;
        const textToSpeech = `Résumé de la page ${p.title} sur ${p.metadata.siteName}. \n Synthèse de l'IA : ${p.analysis.summary}. \n Points essentiels : ${p.analysis.keyTakeaways.join(". \n ")}`;
        startSpeech(textToSpeech);
      }
    }
  };

  // Build speech text preview
  const speechTextToSpeak = activeTab.pageContent ? 
    `${activeTab.pageContent.title}. Résumé : ${activeTab.pageContent.analysis.summary}` : "";

  // Dynamic Icon selector for metadata site icons fallback
  const getSiteIconComponent = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'book-open': return <BookOpen className="w-5 h-5 text-indigo-600" />;
      case 'globe': return <Globe className="w-5 h-5 text-blue-600" />;
      case 'flame': return <Flame className="w-5 h-5 text-amber-500" />;
      case 'compass': return <Compass className="w-5 h-5 text-teal-600" />;
      default: return <Globe className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050506] text-[#e0e0e0] flex flex-col font-sans selection:bg-purple-500/30 overflow-hidden antialiased relative">
      
      {/* Immersive background decoration blur nodes */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-purple-900/15 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-indigo-900/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* 1. TOP BAR CHROME: TAB RAIL & COMPACT METADATA */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 pt-2.5 pb-0 flex items-center justify-between gap-4 shrink-0 shadow-xl select-none z-20">
        
        {/* App identity / title logo on left */}
        <div className="flex items-center gap-2.5 mr-4 pb-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.3)]">
            <div className="w-3 h-3 bg-white rounded-sm"></div>
          </div>
          <span className="font-bold text-sm tracking-tight text-white">Aura Browser</span>
        </div>

        {/* Dynamic active tabs list */}
        <div className="flex items-end gap-1.5 overflow-x-auto scrollbar-none flex-1 max-w-3xl">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                id={`tab-btn-${tab.id}`}
                key={tab.id}
                onClick={() => {
                  stopSpeech();
                  setActiveTabId(tab.id);
                }}
                className={`group relative flex items-center gap-2 px-3 py-1.5 text-xs rounded-t-xl cursor-pointer transition-all duration-200 border-t ${
                  isActive 
                    ? "bg-[#050506]/90 text-indigo-300 font-medium border-t-purple-500 bg-gradient-to-b from-white/[0.04] to-transparent shadow-md" 
                    : "text-white/40 hover:text-white/80 hover:bg-white/5 border-t-transparent"
                } max-w-[170px] min-w-[110px] truncate`}
              >
                <div className="shrink-0">
                  {tab.isLoading ? (
                    <div className="w-3 h-3 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                  ) : tab.type === 'home' ? (
                    <Compass className="w-3 p-0 text-purple-400" />
                  ) : tab.type === 'search' ? (
                    <Search className="w-3 p-0 text-amber-400" />
                  ) : (
                    <Globe className="w-3 p-0 text-emerald-400" />
                  )}
                </div>
                <span className="truncate flex-1 pr-4 text-[11px] leading-tight font-sans">{tab.title}</span>
                
                {/* Close Tab btn */}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => closeTab(tab.id, e)}
                    className="absolute right-1 text-white/20 hover:text-rose-400 hover:bg-white/5 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Plus icon to open navigation workspace tabs */}
          <button 
            id="btn-new-tab"
            onClick={createNewTab}
            className="p-1 px-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors mb-1.5 ml-1"
            title="Ouvrir un nouvel onglet"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Engine status pill (Top Right) */}
        <div className="flex items-center gap-2 py-1 px-3.5 rounded-full bg-white/5 border border-white/5 text-[9px] text-white/40 select-none shrink-0 font-mono mb-2">
          <Cpu className="w-3 h-3 text-purple-400 animate-pulse" />
          <span>Aura Neural Engine</span>
          <span className="text-white/10">|</span>
          <span className="text-emerald-400 font-bold">•</span>
          <span>Grounding Active</span>
        </div>
      </div>

      {/* 2. NAVIGATION BAR, PILLED ADDRESS BAR & GLOBAL USER BADGE */}
      <div className="bg-black/20 border-b border-white/5 px-6 py-3 flex items-center gap-4 shrink-0 select-none z-10">
        
        {/* Navigation Arrows */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            id="nav-back-btn"
            onClick={goBack}
            disabled={activeTab.history.length === 0}
            className={`w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center transition-colors ${
              activeTab.history.length === 0 
                ? "text-white/10 cursor-not-allowed" 
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title="Reculer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            id="nav-forward-btn"
            onClick={goForward}
            disabled={activeTab.forwardHistory.length === 0}
            className={`w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center transition-colors ${
              activeTab.forwardHistory.length === 0 
                ? "text-white/10 cursor-not-allowed" 
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title="Avancer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            id="nav-reload-btn"
            onClick={handleRefresh}
            disabled={activeTab.url === 'home'}
            className={`w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center transition-colors ${
              activeTab.url === 'home' 
                ? "text-white/10 cursor-not-allowed" 
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title="Rafraîchir"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button 
            id="nav-home-btn"
            onClick={goHome}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/70 hover:text-indigo-400 hover:bg-white/10 transition-colors"
            title="Accueil"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address Bar: Futuristic Pill shape resembling general Aura Search */}
        <form 
          id="address-bar-form"
          onSubmit={(e) => {
            e.preventDefault();
            navigateTo(addressBarText);
          }}
          className="flex-1 max-w-2xl mx-auto relative flex items-center"
        >
          {/* Decorative Sparkles & Status */}
          <div className="absolute left-4 text-purple-400 flex items-center">
            {activeTab.type === 'home' ? (
              <span className="text-sm font-sans">✨</span>
            ) : activeTab.url.startsWith('https://') ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Globe className="w-4 h-4 text-indigo-400" />
            )}
          </div>

          <input
            id="address-bar-input"
            type="text"
            className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 focus:bg-white/10 text-xs rounded-full pl-10 pr-24 py-2.5 text-white transition-all select-all font-mono outline-none shadow-inner"
            placeholder="Rechercher avec l'IA Aura ou saisir une URL..."
            value={addressBarText}
            onChange={(e) => setAddressBarText(e.target.value)}
          />

          {/* Quick interactive parameters within pill */}
          <div className="absolute right-3.5 flex items-center gap-2">
            {activeTab.url !== 'home' && (
              <>
                <a
                  href={activeTab.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded text-white/40 hover:text-purple-400 transition-colors flex items-center justify-center cursor-pointer"
                  title="Ouvrir le vrai site dans un nouvel onglet"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={toggleBookmark}
                  className="p-1.5 rounded text-white/40 hover:text-yellow-400 transition-colors"
                  title="Conserver en favoris"
                >
                  <Bookmark 
                    className={`w-3.5 h-3.5 ${
                      bookmarks.some(b => b.url === activeTab.url) 
                        ? "fill-yellow-400 text-yellow-400" 
                        : ""
                    }`} 
                  />
                </button>
              </>
            )}

            <button 
              type="submit" 
              className="px-3 py-1 rounded-full text-[10px] bg-purple-500/25 border border-purple-500/30 hover:bg-purple-600/40 text-purple-300 transition-all font-sans font-medium uppercase tracking-wider"
            >
              Go
            </button>
          </div>
        </form>

        {/* Bookmarks, History Drawers & Active User Profile Ribbon */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-bookmarks"
            onClick={() => {
              setShowBookmarksDrawer(!showBookmarksDrawer);
              setShowHistoryDrawer(false);
            }}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
              showBookmarksDrawer ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10"
            }`}
            title="Mes Favoris"
          >
            <Bookmark className="w-4 h-4" />
          </button>
          
          <button
            id="btn-history"
            onClick={() => {
              setShowHistoryDrawer(!showHistoryDrawer);
              setShowBookmarksDrawer(false);
            }}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
              showHistoryDrawer ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10"
            }`}
            title="Historique de Surf"
          >
            <History className="w-4 h-4" />
          </button>

          <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

          {/* User profile circular emblem, matching jd mockup */}
          <div 
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-yellow-500 p-[1px]"
            title="Profil huglegallou@gmail.com"
          >
            <div className="w-full h-full rounded-full bg-[#050506]/95 border border-[#050506] flex items-center justify-center text-[10px] font-bold text-white uppercase font-sans select-none">
              HL
            </div>
          </div>
        </div>
      </div>

      {/* 3. BROWSER GRID CANVAS LAYOUT (Main body) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDE DRAWER: BOOKMARKS */}
        <AnimatePresence>
          {showBookmarksDrawer && (
            <motion.div
              id="bookmarks-drawer"
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 top-0 h-full w-[260px] bg-slate-950 border-r border-slate-800 z-20 flex flex-col shadow-2xl"
            >
              <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5" /> Mes Favoris
                </span>
                <button onClick={() => setShowBookmarksDrawer(false)} className="text-slate-400 hover:text-slate-100 p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2 overflow-y-auto flex-1 space-y-1 scrollbar-none">
                {bookmarks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 px-4">
                    Aucun favori enregistré. Cliquez sur l'icône étoile de la barre d'adresse pour sauvegarder des pages.
                  </div>
                ) : (
                  bookmarks.map((b) => (
                    <div 
                      key={b.id} 
                      className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900/80 cursor-pointer transition-colors"
                      onClick={() => {
                        navigateTo(b.url);
                        setShowBookmarksDrawer(false);
                      }}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-medium text-slate-200 truncate">{b.title}</p>
                        <span className="text-[10px] text-slate-500 font-mono truncate block">{b.url}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveBookmarks(bookmarks.filter(item => item.id !== b.id));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800/85 rounded"
                        title="Retirer des favoris"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SIDE DRAWER: HISTORY */}
        <AnimatePresence>
          {showHistoryDrawer && (
            <motion.div
              id="history-drawer"
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 top-0 h-full w-[260px] bg-slate-950 border-r border-slate-800 z-20 flex flex-col shadow-2xl"
            >
              <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" /> Historique de Surf
                </span>
                <div className="flex items-center gap-1">
                  {history.length > 0 && (
                    <button 
                      onClick={() => {
                        setHistory([]);
                        localStorage.removeItem("ai_browser_history");
                      }}
                      className="text-[10px] text-rose-400 p-1 hover:underline mr-1"
                    >
                      Effacer
                    </button>
                  )}
                  <button onClick={() => setShowHistoryDrawer(false)} className="text-slate-400 hover:text-slate-100 p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-2 overflow-y-auto flex-1 space-y-1 scrollbar-none">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 px-4">
                    L'historique est vide. Visitez des sites pour alimenter la liste.
                  </div>
                ) : (
                  history.map((h) => (
                    <div 
                      key={h.id} 
                      className="p-1.5 rounded-lg hover:bg-slate-900/80 cursor-pointer transition-colors flex items-start gap-2"
                      onClick={() => {
                        navigateTo(h.url);
                        setShowHistoryDrawer(false);
                      }}
                    >
                      <div className="mt-0.5 shrink-0">
                        {h.type === 'search' ? (
                          <Search className="w-3 text-amber-500" />
                        ) : (
                          <Globe className="w-3 text-indigo-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-300 truncate">{h.title}</p>
                        <div className="flex justify-between items-center mt-0.5 text-[9px] text-slate-500 font-mono">
                          <span className="truncate max-w-[120px]">{h.url}</span>
                          <span className="shrink-0">{h.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOADING SHIMMER BAR */}
        {activeTab.isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-950 overflow-hidden z-20">
            <div className="h-full bg-gradient-to-r from-violet-500 via-indigo-400 to-emerald-400 animate-[pulse_1.5s_infinite] w-[40%] rounded-full" style={{
              animationDuration: '1.2s',
              animationIterationCount: 'infinite'
            }} />
          </div>
        )}

        {/* COMPONENT COLUMN 1: INTERACTIVE VIEWSPACE (Left 70% Pane) */}
        <div className="flex-1 flex flex-col bg-transparent overflow-y-auto relative p-6 lg:p-10">
          
          {/* HOME PANEL (French greeting & original design features beautifully scaled) */}
          {activeTab.type === 'home' && (
            <div id="home-view" className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto w-full py-2">
              
              {/* French header styling block */}
              <div className="text-left w-full mb-8">
                <p className="text-purple-400 text-xs uppercase tracking-widest font-semibold mb-2 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> Espace de Travail Optimisé
                </p>
                <h1 className="text-4xl font-extralight tracking-tight text-white mb-2 leading-tight">
                  Bonjour, <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-300">Hugh</span>.
                </h1>
                <p className="text-white/40 text-sm max-w-md">
                  Votre copilote de navigation intelligent avec IA Grounding est paré pour l'analyse.
                </p>
              </div>

              {/* Central grid structure exactly matching template's layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                
                {/* AI INSIGHT CARD (Deep scan simulation) */}
                <div className="md:col-span-2 bg-gradient-to-br from-white/[0.06] to-transparent border border-white/10 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[260px]">
                  {/* Glowing background hint inside card */}
                  <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-500/10 rounded-full blur-[40px] pointer-events-none"></div>

                  <div className="absolute top-6 right-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                      <span className="animate-pulse w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                      <span className="text-[9px] font-bold text-purple-300 uppercase tracking-widest">Aura Analyser</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold font-mono">Cognition Contextuelle de l'IA</p>
                    <h2 className="text-2xl font-semibold mb-2 leading-snug text-white max-w-lg">
                      Synthèse de votre navigation et de vos recherches
                    </h2>
                    <p className="text-white/60 text-xs leading-relaxed max-w-xl">
                      Utilisez Aura pour décortiquer l'internet réel sans failles de cadres iframe ! Saisissez ou collez simplement l'adresse de n'importe quel site internet ou écrivez votre requête ci-dessous pour démarrer. Le moteur va automatiquement extraire, restructurer et évaluer la crédibilité du site pour vous.
                    </p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      navigateTo(addressBarText);
                    }}
                    className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl focus-within:border-purple-500/50 focus-within:bg-white/10 transition-all shadow-inner mt-6"
                  >
                    <input
                      type="text"
                      className="flex-1 bg-transparent px-4 py-2 text-xs text-white outline-none placeholder:text-white/20 font-mono"
                      placeholder="Qu'allons-nous inspecter aujourd'hui ?"
                      value={addressBarText}
                      onChange={(e) => setAddressBarText(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="px-5 py-1.5 rounded-xl text-xxs font-semibold bg-white text-[#050506] hover:bg-white/90 cursor-pointer transition-all"
                    >
                      Analyser
                    </button>
                  </form>
                </div>

                {/* DAILY METRICS CONTROLLER CARD (Productivity card) */}
                <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 flex flex-col justify-between shadow-lg">
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest mb-6 font-mono font-semibold">Statistiques Réseau</p>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs text-white/50">Lectures Structurées</span>
                        <span className="text-xs text-indigo-400 font-mono font-bold">42</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs text-white/50">Neutralité Biais</span>
                        <span className="text-xs text-purple-400 font-mono font-bold">98%</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs text-white/50">Recherches Grounding</span>
                        <span className="text-xs text-emerald-400 font-mono font-bold">Active</span>
                      </div>
                      <div className="flex justify-between items-center font-mono text-[10px]">
                        <span className="text-white/30">Moteur Neural</span>
                        <span className="text-purple-300 font-bold">Aura v1.2</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 mt-6 border-t border-white/5">
                    <p className="text-[10px] text-white/30 italic leading-snug">
                      "L'intelligence d'Aura réside dans sa discrétion."
                    </p>
                  </div>
                </div>

                {/* RECENTS & FAVORITES SEED SITES GRID */}
                <div className="col-span-1 md:col-span-3 mt-4">
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mb-4 font-mono font-semibold">Sites de départ conseillés (Aura Seed-Sites)</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {PRESETS.map((preset) => (
                      <div
                        key={preset.name}
                        onClick={() => navigateTo(preset.url)}
                        className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2.5 hover:bg-white/[0.07] hover:border-purple-500/30 cursor-pointer transition-all group shadow-sm min-h-[100px]"
                      >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 border border-purple-500/20 flex items-center justify-center group-hover:from-purple-500/20 group-hover:to-pink-500/15 group-hover:scale-105 transition-all">
                          {getSiteIconComponent(preset.icon)}
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-semibold text-white/80 group-hover:text-purple-300 transition-colors leading-tight">{preset.name}</p>
                          <span className="text-[8.5px] text-white/30 font-mono truncate block max-w-[130px] mt-0.5">{preset.url}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WINDOWS NATIVE CLIENT INSTALLATION PANEL */}
                <div className="col-span-1 md:col-span-3 mt-8 bg-gradient-to-r from-purple-950/20 via-slate-900/40 to-indigo-950/20 border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl">
                  {/* Neon light background effect */}
                  <div className="absolute -left-16 -top-16 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-mono font-semibold">Prêt pour le Bureau</p>
                      </div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Laptop className="w-5 h-5 text-purple-400" /> Aura Nebula pour Windows (.EXE)
                      </h3>
                      <p className="text-white/60 text-xs leading-relaxed max-w-2xl">
                        Installez Aura Nebula localement sur votre ordinateur avec un installateur en un clic semblable à <strong>Google Chrome</strong>. Bénéficiez d'une intégration parfaite avec Windows, de fenêtres sans bordures premium et d'une fluidité de calcul maximale.
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-3">
                      <a
                        href="/build-installer.bat"
                        download="build-installer.bat"
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-500/15"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Télécharger build-installer.bat
                      </a>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/5 pt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1.5">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs text-purple-300 font-mono font-bold">1</div>
                      <h4 className="text-xs font-semibold text-slate-200">Exportez le code</h4>
                      <p className="text-white/40 text-[10px] leading-snug">Cliquez sur Export dans le menu AI Studio (en haut à droite) pour télécharger le projet (.zip ou GitHub).</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1.5">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs text-purple-300 font-mono font-bold">2</div>
                      <h4 className="text-xs font-semibold text-slate-200">Décompressez l'archive</h4>
                      <p className="text-white/40 text-[10px] leading-snug">Extrayez tous les fichiers de l'archive ZIP téléchargée dans un nouveau dossier sur votre ordinateur sous Windows.</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1.5">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs text-purple-300 font-mono font-bold">3</div>
                      <h4 className="text-xs font-semibold text-slate-200">Installez Node.js</h4>
                      <p className="text-white/40 text-[10px] leading-snug">Assurez-vous d'avoir Node.js installé sur votre PC (téléchargeable gratuitement sur nodejs.org).</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs text-emerald-300 font-mono font-bold">4</div>
                      <h4 className="text-xs font-semibold text-slate-200">Double-cliquez !</h4>
                      <p className="text-white/40 text-[10px] leading-snug">Lancez <strong>build-installer.bat</strong>. Il installe, compile et crée votre installateur Windows Chrome-style de manière autonome !</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SKELETON LOADER SCREEN DURING INGESTION */}
          {activeTab.isLoading && (
            <div className="flex-1 max-w-3xl mx-auto w-full space-y-7 py-8 animate-pulse select-none z-10 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10" />
                <div>
                  <div className="h-3.5 bg-white/10 rounded w-28 mb-1.5" />
                  <div className="h-2.5 bg-white/5 rounded w-16" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-8 bg-white/10 rounded w-11/12" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
              </div>
              <div className="border border-white/5 p-8 rounded-3xl bg-white/[0.01]/20 space-y-4">
                <div className="h-3 bg-white/10 rounded w-full" />
                <div className="h-3 bg-white/10 rounded w-5/6" />
                <div className="h-3 bg-white/5 rounded w-4/5" />
              </div>
              <div className="space-y-5">
                <div className="h-5 bg-white/10 rounded w-44" />
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-11/12" />
              </div>
              
              <div className="flex justify-center items-center py-10 text-xs text-purple-400 font-mono gap-2 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                <span>Décryptage des données réseau avec de l'IA Aura...</span>
              </div>
            </div>
          )}

          {/* VIRTUAL ERROR DIALOG */}
          {activeTab.error && !activeTab.isLoading && (
            <div id="error-screen" className="flex-1 flex flex-col justify-center items-center py-16 max-w-md mx-auto text-center space-y-6 z-10">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2.5">
                <h3 className="text-lg font-bold text-white">Anomalie virtuelle de liaison</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  {activeTab.error}
                </p>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl mt-3 text-left">
                  <p className="text-[10px] text-purple-300 font-mono leading-normal">
                    CONSEIL TECHNIQUE : Une clé de service API Gemini est requise. Assurez-vous qu'elle est bien enregistrée en tant que GEMINI_API_KEY.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => navigateTo(addressBarText)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/90 transition-all"
                >
                  Réessayer
                </button>
                <button
                  onClick={goHome}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/20"
                >
                  Aller à l'accueil
                </button>
              </div>
            </div>
          )}

          {/* WEB READER CANVAS VIEW (parsed reader details) */}
          {activeTab.type === 'page' && activeTab.pageContent && !activeTab.isLoading && (
            <div id="simulated-browser-viewer" className="flex-1 max-w-3xl mx-auto w-full py-4 space-y-8 z-10">
              
              {/* Site Details Pill bar */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 text-xs text-white/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-purple-500/20 border border-purple-500/20 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-purple-300">
                    {activeTab.pageContent.metadata?.siteName?.[0] || "W"}
                  </div>
                  <span className="font-bold text-white/90">{activeTab.pageContent.metadata?.siteName}</span>
                  <span>•</span>
                  <span>Lecture de {activeTab.pageContent.metadata?.readingTime || "3 min"}</span>
                  {activeTab.pageContent.metadata?.publishDate && (
                    <>
                      <span>•</span>
                      <span>Modifié le {activeTab.pageContent.metadata.publishDate}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={activeTab.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-sans text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer"
                    title="Visiter le site web d'origine en direct"
                  >
                    <ExternalLink className="w-3 h-3" /> Accéder au vrai site
                  </a>
                  <div className="text-[9px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest font-semibold">
                    Aura Reader Mode
                  </div>
                </div>
              </div>

              {/* Headline block */}
              <div className="space-y-4">
                <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-snug">
                  {activeTab.pageContent.title}
                </h1>
                {activeTab.pageContent.headline && (
                  <p className="text-xs font-medium text-white/70 bg-white/[0.02] p-5 border-l-2 border-purple-500 rounded-r-2xl italic leading-relaxed">
                    « {activeTab.pageContent.headline} »
                  </p>
                )}
              </div>

              {/* Sections rendering */}
              <div className="space-y-8 leading-relaxed text-slate-300">
                {activeTab.pageContent.sections?.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <h2 className="text-base font-semibold text-white pt-3 border-b border-white/5 pb-2 flex items-center gap-2">
                      <span className="text-purple-400 font-mono text-[10px] bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">0{idx + 1}</span> 
                      {section.heading}
                    </h2>
                    <p className="whitespace-pre-line text-xs text-white/70 leading-relaxed font-normal">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Anchors/Outbound hyperlinks */}
              {activeTab.pageContent.links?.length > 0 && (
                <div className="pt-8 border-t border-white/5">
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400 mb-4 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-purple-400" /> Liens Détectés par l'Indexeur
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {activeTab.pageContent.links.map((link, idx) => (
                      <div
                        key={idx}
                        onClick={() => navigateTo(link.url)}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 hover:bg-white/[0.05] cursor-pointer flex items-center justify-between group transition-all duration-200"
                      >
                        <span className="text-white/80 group-hover:text-purple-300 transition-colors font-semibold truncate pr-3">
                          {link.text}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-white/30 font-mono">
                          <span className="truncate max-w-[100px]">{link.url}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-purple-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested dynamic questions for dialogs */}
              {activeTab.pageContent.suggestedQuestions?.length > 0 && (
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 shadow-xl">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-extrabold text-purple-300 uppercase tracking-widest">
                    <HelpCircle className="w-4 h-4 text-purple-400" /> Pistes de réflexion suggérées par l'IA
                  </div>
                  <div className="space-y-2">
                    {activeTab.pageContent.suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedQuestion(q)}
                        className="w-full text-left text-xs bg-[#050506]/60 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/20 p-3.5 rounded-2xl text-white/80 hover:text-purple-300 transition-all duration-200 flex items-start gap-2.5"
                      >
                        <span className="text-purple-400 font-extrabold shrink-0 mt-0.5">→</span>
                        <span className="leading-snug">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* SEARCH GROUNDING LISTVIEW (type: 'search') */}
          {activeTab.type === 'search' && activeTab.searchContent && !activeTab.isLoading && (
            <div id="simulated-search-results" className="flex-1 max-w-3xl mx-auto w-full py-4 space-y-8 z-10">
              
              <div className="border-b border-white/5 pb-4 text-xs text-white/50 flex justify-between items-center">
                <span>Index de recherche : <strong className="text-white">"{activeTab.searchContent.query}"</strong></span>
                <span className="text-[9px] font-mono text-purple-300 bg-purple-500/15 border border-purple-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-semibold">Google Grounding OK</span>
              </div>

              {/* AI DEEP OVERVIEW CONTAINER */}
              {activeTab.searchContent.quickAnswer && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#050506] via-[#0c0c12] to-[#050506] border border-white/15 space-y-4 shadow-xl relative overflow-hidden">
                  {/* Neon light pill decoration inside */}
                  <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-extrabold text-purple-300 uppercase tracking-widest">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" /> Aura Deep-Overview (Résumé IA)
                  </div>
                  <div className="text-white/80 text-xs leading-relaxed whitespace-pre-line border-l-2 border-purple-500/40 pl-4">
                    {activeTab.searchContent.quickAnswer}
                  </div>
                </div>
              )}

              {/* INDIVIDUAL CARDS DISPLAY */}
              <div className="space-y-4 pt-2">
                <h3 className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">Résultats Organiques Identifiés</h3>
                <div className="space-y-4">
                  {activeTab.searchContent.results?.map((res, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigateTo(res.url)}
                      className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-purple-500/30 hover:bg-white/[0.03] cursor-pointer block group transition-all duration-200 space-y-2 shadow"
                    >
                      <div className="flex items-center justify-between gap-1.5 text-[10px] text-slate-500 font-mono">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-indigo-400 font-bold shrink-0">{res.source}</span>
                          <span>•</span>
                          <span className="truncate max-w-xs">{res.url}</span>
                        </div>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[9px] text-purple-400 hover:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full transition-all duration-150 cursor-pointer shrink-0 hover:bg-purple-500/25"
                          title="Ouvrir le lien réel dans un nouvel onglet"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> Ouvrir le vrai site
                        </a>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {res.title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {res.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RELATED KEYWORD SEARCHES */}
              {activeTab.searchContent.relatedSearches?.length > 0 && (
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <h4 className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">Recherches alternatives recommandées</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {activeTab.searchContent.relatedSearches.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigateTo(term)}
                        className="text-left bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-purple-500/20 p-3 rounded-xl text-white/80 hover:text-purple-300 transition-all flex items-center justify-between group"
                      >
                        <span className="truncate pr-2 font-medium">{term}</span>
                        <Search className="w-3.5 h-3.5 text-white/20 group-hover:text-purple-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* COMPONENT COLUMN 2: COPILOT PANEL (Right 30% Pane) */}
        <div id="ai-companion-sidebar" className="w-[340px] xl:w-[380px] bg-black/30 backdrop-blur-2xl border-l border-white/5 flex flex-col shrink-0 overflow-hidden shadow-2xl z-10 select-none">
          
          {/* Header selectors */}
          <div className="flex bg-[#050506]/40 border-b border-white/5 text-xs shrink-0 font-medium">
            <button
              onClick={() => setActiveCompanionTab('insights')}
              disabled={!activeTab.pageContent}
              className={`flex-1 py-4 text-center border-b transition-all flex justify-center items-center gap-1.5 font-semibold ${
                !activeTab.pageContent 
                  ? "text-white/10 cursor-not-allowed opacity-40" 
                  : activeCompanionTab === 'insights'
                    ? "border-b-purple-500 text-purple-300 bg-white/[0.02]"
                    : "border-b-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.01]"
              }`}
            >
              <Info className="w-3.5 h-3.5" /> Fiche d'Analyse (Insights)
            </button>
            <button
              onClick={() => setActiveCompanionTab('chat')}
              className={`flex-1 py-4 text-center border-b transition-all flex justify-center items-center gap-1.5 font-semibold ${
                activeCompanionTab === 'chat'
                  ? "border-b-purple-500 text-purple-300 bg-white/[0.02]"
                  : "border-b-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.01]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Chat Copilote
            </button>
          </div>

          {/* INSIGHTS SUB-STATE VIEW */}
          {activeCompanionTab === 'insights' && activeTab.pageContent && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-none">
              
              {/* Radial credible thermometer / gauge scale */}
              <div className="p-4 rounded-xl border border-slate-850 bg-slate-900/40 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-indigo-400" /> Fiabilité d'Analyse
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    activeTab.pageContent.analysis.credibilityScore > 75 
                      ? "text-emerald-400 bg-emerald-500/10" 
                      : activeTab.pageContent.analysis.credibilityScore > 50 
                        ? "text-amber-400 bg-amber-500/10" 
                        : "text-rose-400 bg-rose-500/10"
                  }`}>
                    {activeTab.pageContent.analysis.credibilityScore > 75 ? "Élevé" : "Modéré"}
                  </span>
                </div>

                <div className="flex items-center gap-4 py-1">
                  {/* Gauge indicator graphics */}
                  <div className="relative flex items-center justify-center shrink-0">
                    <div className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center">
                      <span className="text-sm font-extrabold font-mono text-slate-100">
                        {activeTab.pageContent.analysis.credibilityScore}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200">Indice de Crédibilité</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Score virtuel estimé selon la neutralité lexicale, l'abondance d'ancrages factuels et l'absence d'exagérations émotionnelles.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Sentiment block */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">TON GLOBAL / SENTIMENT</div>
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                  activeTab.pageContent.analysis.sentiment?.toLowerCase().includes('positif') || activeTab.pageContent.analysis.sentiment?.toLowerCase().includes('positive')
                    ? "bg-emerald-500/5 border-emerald-500/15" 
                    : activeTab.pageContent.analysis.sentiment?.toLowerCase().includes('négatif') || activeTab.pageContent.analysis.sentiment?.toLowerCase().includes('negative')
                      ? "bg-rose-500/5 border-rose-500/15" 
                      : "bg-indigo-500/5 border-indigo-500/15"
                }`}>
                  <div className="mt-0.5 shrink-0">
                    {activeTab.pageContent.analysis.sentiment?.toLowerCase().includes('positif') || activeTab.pageContent.analysis.sentiment?.toLowerCase().includes('positive') ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Info className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold capitalize text-slate-200">
                      Sentiment : {activeTab.pageContent.analysis.sentiment}
                    </h5>
                    <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                      L'écriture démontre un sentiment lexical mesurable déterminé comme {activeTab.pageContent.analysis.sentiment?.toLowerCase()}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cognitive Bias and Transparency Report */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">BIAIS MÉDIATIQUES / CONFLITS</div>
                <div className="p-3 rounded-xl border border-slate-850 bg-slate-950 text-xs leading-normal space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Analyse de Neutralité :
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {activeTab.pageContent.analysis.biasReport}
                  </p>
                </div>
              </div>

              {/* Summary TL;DR & Speech Narrator Audio Controls */}
              <div className="space-y-3.5 border-t border-white/5 pt-5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">TL;DR SYNTHÈSE IA</span>
                  
                  {/* Speech Toggle Button */}
                  <button
                    onClick={toggleSpeechActive}
                    className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                      isSpeaking 
                        ? "bg-rose-500/20 text-rose-300 animate-pulse border border-rose-500/35" 
                        : "bg-white/5 text-white/60 border border-white/10 hover:text-white"
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3 h-3" /> Arrêter
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 text-purple-400" /> Écouter la page
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-white/80 text-xs leading-relaxed font-normal">
                  {activeTab.pageContent.analysis.summary}
                </div>
              </div>

              {/* Key takeaways bullet list */}
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">POINTS CRITIQUES RETENUS</div>
                <ul className="space-y-2 text-xs">
                  {activeTab.pageContent.analysis.keyTakeaways?.map((takeaway, idx) => (
                    <li key={idx} className="flex gap-2.5 text-white/70 leading-relaxed font-normal">
                      <span className="text-purple-400 font-extrabold shrink-0">•</span>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Speed Speech modifier if reading */}
              {isSpeaking && (
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30 font-mono">
                  <span>Vitesse d'élocution :</span>
                  <div className="flex gap-1">
                    {[1, 1.25, 1.5].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => {
                          setSpeechSpeed(speed);
                          if (isSpeaking) {
                            toggleSpeechActive();
                            setTimeout(() => {
                              toggleSpeechActive();
                            }, 100);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-full ${
                          speechSpeed === speed ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold" : "hover:text-white/60"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* INSIGHTS BLANK SCREEN STATE */}
          {activeCompanionTab === 'insights' && !activeTab.pageContent && (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-4">
              <Compass className="w-10 h-10 text-white/10 animate-spin-slow" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-white/80">Rapport analytique vacant</p>
                <p className="text-[11px] text-white/40 max-w-[200px] leading-relaxed mx-auto font-normal font-sans">
                  Explorez une page web réelle pour activer la synthèse sémantique instantanée.
                </p>
              </div>
            </div>
          )}

          {/* CHAT COPILOT VIEW (Active inside tab) */}
          {activeCompanionTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-black/10">
              
              {/* Message scroll list */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
                {activeTab.chatHistory.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={idx}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                        isUser 
                          ? "bg-purple-600 text-white rounded-tr-none shadow-md shadow-purple-600/10 font-medium font-sans" 
                          : "bg-white/[0.02] border border-white/5 text-white/90 rounded-tl-none whitespace-pre-wrap font-sans font-normal"
                      }`}>
                        
                        {/* If loading block */}
                        {msg.text === "..." ? (
                          <div className="flex gap-1 py-1">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        ) : (
                          msg.text
                        )}

                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Quick Prompts triggers */}
              {activeTab.pageContent && (
                <div className="p-2 border-t border-white/5 bg-black/40 shrink-0 flex gap-1.5 overflow-x-auto scrollbar-none">
                  <button 
                    onClick={() => sendChatMessage("Résume cet article en 3 lignes")}
                    className="shrink-0 scale-95 hover:scale-100 text-[9px] bg-white/5 hover:bg-white/10 hover:text-purple-300 transition-all border border-white/5 rounded-full py-1 px-3 text-white/70 font-medium cursor-pointer font-sans"
                  >
                    Résumé Express
                  </button>
                  <button 
                    onClick={() => sendChatMessage("Traduis l'esprit général en Anglais")}
                    className="shrink-0 scale-95 hover:scale-100 text-[9px] bg-white/5 hover:bg-white/10 hover:text-purple-300 transition-all border border-white/5 rounded-full py-1 px-3 text-white/70 font-medium cursor-pointer font-sans"
                  >
                    Translate English
                  </button>
                  <button 
                    onClick={() => sendChatMessage("Quelles sont les faiblesses d'argumentation de l'auteur ?")}
                    className="shrink-0 scale-95 hover:scale-100 text-[9px] bg-white/5 hover:bg-white/10 hover:text-purple-300 transition-all border border-white/5 rounded-full py-1 px-3 text-white/70 font-medium cursor-pointer font-sans"
                  >
                    Analyse Critique
                  </button>
                </div>
              )}

              {/* Chat Form panel */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const messageText = target.message.value;
                  if (!messageText.trim()) return;
                  sendChatMessage(messageText);
                  target.reset();
                }}
                className="p-3 bg-[#050506]/55 border-t border-white/5 shrink-0 flex items-center gap-2"
              >
                <input
                  name="message"
                  type="text"
                  className="flex-1 bg-white/5 border border-white/10 focus:border-purple-500/50 focus:bg-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none font-sans"
                  placeholder="Posez une question sur le contenu..."
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition-all shadow-md shadow-purple-600/10 shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
