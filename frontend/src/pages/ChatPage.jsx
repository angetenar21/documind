import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, User, Loader2, Database, ChevronDown } from 'lucide-react';
import LibraryModal from '../components/LibraryModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialScope = location.state?.filename || 'All Documents';
  const displayName = initialScope === 'All Documents' ? 'Database Documents' : initialScope;

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      content: `Hello! I'm ready to answer questions about: ${displayName}. What would you like to know?`,
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [isWaitingForStream, setIsWaitingForStream] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [availableDocs, setAvailableDocs] = useState([]);
  const [selectedScope, setSelectedScope] = useState(initialScope);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isWaitingForStream]);

  // Fetch documents for the scope dropdown
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/documents`);
        const data = await response.json();
        if (data.documents) {
          setAvailableDocs(data.documents);
          // If the currently selected scope was deleted, reset to All
          if (selectedScope !== 'All Documents' && !data.documents.includes(selectedScope)) {
            setSelectedScope('All Documents');
          }
        }
      } catch (err) {
        console.error('Failed to fetch documents for dropdown', err);
      }
    };
    fetchDocs();
  }, [isLibraryOpen]); // Re-fetch whenever the Library modal closes

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isWaitingForStream || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessages = [...messages, { id: Date.now(), role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsWaitingForStream(true);

    const aiMsgId = Date.now() + 1;

    try {
      const payload = { 
        question: userMessage,
        target_filename: selectedScope === 'All Documents' ? null : selectedScope
      };

      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Network response was not ok');

      setIsWaitingForStream(false);
      setIsStreaming(true);

      setMessages(prev => [
        ...prev,
        { id: aiMsgId, role: 'ai', content: '', sources: [] }
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let aiMessageContent = '';
      let currentSources = [];
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // The last line might be incomplete, save it for the next chunk
        buffer = lines.pop() || '';
        
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'sources') {
                currentSources = data.data;
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, sources: currentSources } : m));
              } else if (data.type === 'token') {
                aiMessageContent += data.data;
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: aiMessageContent } : m));
              }
            } catch (e) {
              console.error('Error parsing SSE data', e);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setIsWaitingForStream(false);
      setMessages([
        ...newMessages,
        {
          id: aiMsgId,
          role: 'ai',
          content: 'Sorry, I encountered an error while trying to answer that. Please try again.',
          isError: true
        }
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const getGroupedSources = (sources) => {
    if (!sources) return [];
    
    // Group pages by filename
    const grouped = {};
    sources.forEach(src => {
      if (!grouped[src.filename]) {
        grouped[src.filename] = new Set();
      }
      grouped[src.filename].add(src.page);
    });
    
    // Format into an array of objects with page ranges
    return Object.entries(grouped).map(([filename, pagesSet]) => {
      const pages = Array.from(pagesSet).sort((a, b) => a - b);
      
      let pageRanges = [];
      let start = pages[0];
      let prev = start;
      
      for (let i = 1; i <= pages.length; i++) {
        if (pages[i] === prev + 1) {
          prev = pages[i];
        } else {
          if (start === prev) {
            pageRanges.push(`${start}`);
          } else {
            pageRanges.push(`${start}-${prev}`);
          }
          start = pages[i];
          prev = start;
        }
      }
      
      return {
        filename,
        pageString: pageRanges.join(', ')
      };
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-base)]">
      <LibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
      
      {/* Header */}
      <header className="flex items-center px-6 py-4 glass-panel border-b border-white/5 z-20">
        <button 
          onClick={() => navigate('/')}
          className="p-2 mr-4 rounded-full hover:bg-white/10 transition-colors text-[var(--color-text-muted)] hover:text-white"
          title="Back to Upload"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="overflow-hidden flex-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            DocuMind Chat
          </h1>
          <p className="text-xs text-green-400 flex items-center mt-0.5 truncate max-w-[300px] sm:max-w-[500px]">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1.5 flex-shrink-0"></span>
            <span className="truncate">Reading: {selectedScope === 'All Documents' ? 'Database Documents' : selectedScope}</span>
          </p>
        </div>

        {/* Scope Dropdown */}
        <div className="ml-auto mr-4 relative hidden sm:block">
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="appearance-none bg-black/40 border border-white/10 hover:border-white/20 text-zinc-300 text-xs rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-green-500/50 transition-all cursor-pointer max-w-[200px] truncate"
            title="Choose which document to search"
          >
            <option value="All Documents">Scope: All Documents</option>
            {availableDocs.map((doc, idx) => (
              <option key={idx} value={doc}>Scope: {doc}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsLibraryOpen(true)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center space-x-2"
          title="Manage Database"
        >
          <Database className="w-5 h-5" />
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-6 w-full pb-32">
          {messages.map((msg) => {
            const groupedSources = getGroupedSources(msg.sources);
            
            return (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ml-3' 
                      : 'bg-white/10 border border-white/10 mr-3 mt-1'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>

                  {/* Bubble */}
                  <div className={`px-5 py-4 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-tr-none shadow-lg shadow-green-900/20'
                      : msg.isError
                        ? 'bg-red-500/10 border border-red-500/20 text-red-200 rounded-tl-none'
                        : 'bg-[#18181b] border border-white/5 text-zinc-100 rounded-tl-none shadow-xl'
                  }`}>
                    
                    {/* Content */}
                    <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1 text-[15px]">
                      {msg.content.split('\n').map((paragraph, idx) => (
                        <p key={idx} className="min-h-[1.5rem]">{paragraph}</p>
                      ))}
                    </div>

                    {/* Citations Pill Box */}
                    {groupedSources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                        {groupedSources.map((src, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-zinc-400 select-none"
                          >
                            <span className="truncate max-w-[200px]">{src.filename}</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-green-400/80">Pg {src.pageString}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isWaitingForStream && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex flex-row max-w-[75%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/10 mr-3 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-[#18181b] border border-white/5 rounded-tl-none flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--color-bg-base)] via-[var(--color-bg-base)] to-transparent pt-12 z-20 pointer-events-none">
        <div className="max-w-4xl mx-auto relative pointer-events-auto">
          <form 
            onSubmit={handleSubmit}
            className="flex items-center bg-[#1f1f22] border border-white/10 rounded-2xl p-2 shadow-2xl focus-within:border-white/30 focus-within:ring-4 focus-within:ring-white/5 transition-all duration-300"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedScope === 'All Documents' ? "Ask a question about your entire database..." : `Ask a question about ${selectedScope}...`}
              className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-white placeholder:text-zinc-500"
              disabled={isWaitingForStream || isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isWaitingForStream || isStreaming}
              className={`p-3 rounded-xl ml-2 flex items-center justify-center transition-all duration-200 ${
                !input.trim() || isWaitingForStream || isStreaming
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/20 active:scale-95'
              }`}
            >
              {(isWaitingForStream || isStreaming) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[11px] text-zinc-500">AI can make mistakes. Check the source document to verify.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
