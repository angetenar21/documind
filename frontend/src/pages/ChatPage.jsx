import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, User, Loader2, Database } from 'lucide-react';
import LibraryModal from '../components/LibraryModal';

export default function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // We can now handle multiple filenames, or just show a general title
  const filename = location.state?.filename || 'Database Documents';

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      content: `Hello! I'm ready to answer questions about: ${filename}. What would you like to know?`,
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [isWaitingForStream, setIsWaitingForStream] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isWaitingForStream]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isWaitingForStream || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    const newMessages = [...messages, { id: Date.now(), role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsWaitingForStream(true);

    const aiMsgId = Date.now() + 1;

    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      setIsWaitingForStream(false);
      setIsStreaming(true);

      // Add empty AI message placeholder
      setMessages(prev => [
        ...prev,
        { id: aiMsgId, role: 'ai', content: '', sources: [] }
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let aiMessageContent = '';
      let currentSources = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
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

  // Helper to remove duplicate sources (same filename and page)
  const getUniqueSources = (sources) => {
    if (!sources) return [];
    const unique = [];
    const seen = new Set();
    sources.forEach(src => {
      const key = `${src.filename}-${src.page}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(src);
      }
    });
    return unique;
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
            <span className="truncate">Reading: {filename}</span>
          </p>
        </div>
        <button
          onClick={() => setIsLibraryOpen(true)}
          className="p-2 ml-auto text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center space-x-2"
          title="Manage Database"
        >
          <Database className="w-5 h-5" />
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-6 w-full pb-32">
          {messages.map((msg) => {
            const uniqueSources = getUniqueSources(msg.sources);
            
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
                      : 'bg-white/10 border border-white/10 mr-3 mt-1' // mt-1 aligns with top of bubble
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
                    {uniqueSources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                        {uniqueSources.map((src, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-zinc-400 select-none"
                          >
                            <span className="truncate max-w-[150px]">{src.filename}</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-green-400/80">Pg {src.page}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator (Waiting for First Token) */}
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
              placeholder="Ask a question about your document(s)..."
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
