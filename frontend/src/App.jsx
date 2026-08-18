import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, Plus, MessageSquare, Compass, Lightbulb, Code, 
  Send, User, Sparkles, Mic, Image, Trash2, X, FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Custom inline SVG icons for GitHub & LinkedIn
const GithubIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

const LinkedinIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    fetch('https://hire-me-ai-backend-paxe.onrender.com')
      .catch((err) => console.log('Warming backend...'));
  }, []);

  const starterCards = [
    { 
      label: "Summarize experience", 
      desc: "Overview of professional background and tech roles", 
      icon: Compass, 
      query: "What is Debanjit's overall work experience?" 
    },
    { 
      label: "Key Technical Skills", 
      desc: "Programming languages, AI tools, and frameworks", 
      icon: Code, 
      query: "What programming languages and frameworks is Debanjit skilled in?" 
    },
    { 
      label: "Project Details & Live Work", 
      desc: "Deep dive into AI models and web architecture", 
      icon: Lightbulb, 
      query: "Can you list key projects built by Debanjit along with their technology stacks?" 
    },
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setCurrentSessionId(null);
    setLoading(false);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSelectSession = (session) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setLoading(false);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(updatedSessions);
    if (currentSessionId === sessionId) {
      handleNewChat();
    }
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query || !query.trim() || loading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage = { sender: 'user', text: query };
    const botPlaceholder = { sender: 'bot', text: '' };

    const historyPayload = messages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));
    historyPayload.push({ role: 'user', content: query });

    const updatedMessages = [...messages, userMessage, botPlaceholder];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    let activeId = currentSessionId;
    if (!activeId) {
      activeId = Date.now().toString();
      setCurrentSessionId(activeId);
      const newSession = {
        id: activeId,
        title: query.length > 25 ? query.substring(0, 25) + '...' : query,
        messages: updatedMessages
      };
      setSessions((prev) => [newSession, ...prev]);
    }

    try {
      const response = await fetch('https://hire-me-ai-backend-paxe.onrender.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyPayload }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming failed');
      }

      setLoading(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let buffer = '';
      let isStreamingDone = false;

      const readStream = async () => {
        while (true) {
          if (controller.signal.aborted) break;
          const { value, done } = await reader.read();
          if (done) {
            isStreamingDone = true;
            break;
          }
          buffer += decoder.decode(value, { stream: true });
        }
      };

      readStream();

      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (controller.signal.aborted) {
            clearInterval(interval);
            resolve();
            return;
          }

          if (buffer.length > 0) {
            const step = buffer.length > 50 ? 2 : 1;
            const nextChars = buffer.slice(0, step);
            buffer = buffer.slice(step);

            setMessages((prevMessages) => {
              if (prevMessages.length === 0) return prevMessages;
              const updated = [...prevMessages];
              const lastIndex = updated.length - 1;
              updated[lastIndex] = {
                ...updated[lastIndex],
                text: updated[lastIndex].text + nextChars,
              };

              setSessions((prevSessions) =>
                prevSessions.map((session) =>
                  session.id === activeId ? { ...session, messages: updated } : session
                )
              );

              return updated;
            });
          } else if (isStreamingDone && buffer.length === 0) {
            clearInterval(interval);
            resolve();
          }
        }, 28);
      });

    } catch (error) {
      if (error.name === 'AbortError') return;

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { 
          sender: 'bot', 
          text: "The backend server is waking up from idle state. Please wait ~30 seconds and try asking again!" 
        }
      ]);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-screen overflow-hidden bg-[#0e0f12] text-[#e3e3e3] font-sans antialiased">
      
      {/* Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[650px] h-[300px] sm:h-[450px] bg-gradient-to-tr from-blue-900/30 via-indigo-900/20 to-purple-900/15 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />

      {/* Mobile Dark Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Responsive Sidebar */}
      <aside 
        className={`fixed md:relative top-0 bottom-0 left-0 z-40 bg-[#16171a] md:bg-[#16171a]/95 backdrop-blur-xl flex flex-col justify-between p-3 border-r border-[#27282d]/60 transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0 w-72 md:w-64' : '-translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Toggle */}
          <div className="flex items-center justify-between shrink-0 mb-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[#22242a] rounded-full transition-colors text-gray-400 hover:text-white"
              aria-label="Toggle Menu"
            >
              <Menu size={20} />
            </button>
            {sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="p-2 text-gray-400 hover:text-white md:hidden"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Profile Card Section */}
          {sidebarOpen ? (
            <div className="flex flex-col items-center text-center p-3.5 bg-[#1c1e24]/70 border border-[#2b2e38] rounded-2xl mb-4 shrink-0 transition-all shadow-lg">
              <div className="relative mb-2.5">
                <img 
                  src="/profile.jpg" 
                  alt="Debanjit Halder" 
                  className="w-16 h-16 rounded-full object-cover object-top border-2 border-blue-500/80 shadow-md shadow-blue-500/10"
                />
              </div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Debanjit Halder</h2>
              <span className="text-[11px] font-medium text-blue-400 mt-0.5">AI Engineer</span>
              
              <p className="text-[10px] text-gray-400 mt-1.5 leading-tight font-light px-1">
                Python • GenAI • FastAPI • LLMs • C++
              </p>

              {/* Social / Profile Links */}
              <div className="flex items-center justify-center gap-2.5 mt-3 pt-2.5 border-t border-[#2d303b] w-full">
                <a 
                  href="https://hire-me-ai-backend-paxe.onrender.com/static/Resume_Debanjit(2)(1).pdf" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                  title="View Resume PDF"
                >
                  <FileText size={15} />
                </a>
                <a 
                  href="https://github.com/debanjithalder-dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 bg-[#252830] hover:bg-[#323642] text-gray-300 hover:text-white rounded-lg transition-all"
                  title="GitHub Profile"
                >
                  <GithubIcon size={15} />
                </a>
                <a 
                  href="https://www.linkedin.com/in/debanjit-halder/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all"
                  title="LinkedIn Profile"
                >
                  <LinkedinIcon size={15} />
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 mb-4 shrink-0">
              <img 
                src="/profile.jpg" 
                alt="Debanjit Halder" 
                className="w-8 h-8 rounded-full object-cover object-top border border-blue-500"
              />
            </div>
          )}

          {/* New Chat Button */}
          <button 
            onClick={handleNewChat}
            className="flex items-center justify-start gap-3 px-3.5 py-2.5 bg-[#1e2025] hover:bg-[#282b32] text-gray-200 rounded-full w-full border border-[#32353e] text-sm font-medium transition-all shadow-sm shrink-0"
          >
            <Plus size={18} className="text-blue-400" />
            {sidebarOpen && <span className="truncate">New Chat</span>}
          </button>

          {/* Recent Sessions */}
          {sidebarOpen && (
            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-3 mb-2">Recent</p>
              
              {sessions.length === 0 ? (
                <p className="text-xs text-gray-500 px-3 py-2 italic">No past conversations</p>
              ) : (
                <div className="space-y-1">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      className={`group flex items-center justify-between px-3 py-2 text-sm rounded-xl cursor-pointer transition-colors ${
                        currentSessionId === session.id
                          ? 'bg-[#282b32] text-white font-medium'
                          : 'text-gray-300 hover:bg-[#22242a]'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <MessageSquare size={15} className="text-gray-400 shrink-0" />
                        <span className="truncate text-xs">{session.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="p-1 hover:text-red-400 text-gray-400 transition-opacity"
                        title="Delete chat"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-between relative h-full w-full max-w-4xl mx-auto px-3 sm:px-6 z-10 overflow-hidden">
        
        {/* Header */}
        <header className="flex justify-between items-center py-3 sm:py-4 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 bg-[#16171a] rounded-lg text-gray-300 md:hidden border border-[#27282d]"
            >
              <Menu size={18} />
            </button>
            <span className="text-base sm:text-lg font-medium tracking-tight text-gray-200">HireMe AI</span>
          </div>
        </header>

        {/* Dynamic Workspace */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center my-auto py-4 overflow-y-auto">
            <div className="mb-6 sm:mb-10 text-center px-2">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-medium tracking-tight bg-gradient-to-r from-[#7ea2ff] via-[#c084fc] to-[#f87171] bg-clip-text text-transparent mb-2 sm:mb-3">
                Hi Recruiter, what's the plan?
              </h1>
              <p className="text-sm sm:text-base text-gray-400 font-light">
                Ask anything about Debanjit's experience, code, or projects.
              </p>
            </div>

            {/* Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 max-h-[45vh] sm:max-h-none overflow-y-auto px-1">
              {starterCards.map((card, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSend(card.query)}
                  className="group bg-[#16171a]/70 backdrop-blur-md hover:bg-[#202227] p-3.5 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer flex flex-col justify-between min-h-[90px] sm:h-36 border border-[#27282d] hover:border-[#3a3d46] transition-all duration-200 shadow-md active:scale-[0.98]"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-200 group-hover:text-blue-400 transition-colors mb-0.5 sm:mb-1">{card.label}</p>
                    <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed line-clamp-2">{card.desc}</p>
                  </div>
                  <div className="self-end p-1.5 sm:p-2 bg-[#0e0f12] rounded-full text-gray-400 group-hover:text-white transition-all mt-2">
                    <card.icon size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Stream */
          <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 my-2 sm:my-4 pr-1 scrollbar-thin scrollbar-thumb-[#282a2c]">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-2 sm:gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className={`p-3 sm:p-4 rounded-2xl max-w-[90%] sm:max-w-[85%] ${
                  msg.sender === 'user' 
                    ? 'bg-[#22242a] text-white rounded-tr-sm border border-[#32353e]' 
                    : 'bg-transparent text-gray-200'
                }`}>
                  <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed prose prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 no-underline hover:underline font-medium transition-all break-all"
                          />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul {...props} className="list-disc list-inside my-2 space-y-1 text-gray-200" />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol {...props} className="list-decimal list-inside my-2 space-y-1 text-gray-200" />
                        ),
                        li: ({ node, children, ...props }) => {
                          const textContent = node?.children?.[0]?.children?.[0]?.value || node?.children?.[0]?.value;
                          const isSuggestion = typeof textContent === 'string' && textContent.endsWith('?');

                          return (
                            <li
                              {...props}
                              onClick={() => isSuggestion && handleSend(textContent)}
                              className={`my-1 ${
                                isSuggestion 
                                  ? 'cursor-pointer text-blue-300 hover:text-blue-100 hover:underline transition-colors' 
                                  : ''
                              }`}
                            >
                              {children}
                            </li>
                          );
                        }
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#22242a] border border-[#32353e] flex items-center justify-center text-gray-300 shrink-0 mt-1">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 items-center text-gray-400 text-xs sm:text-sm py-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Sparkles size={14} className="animate-spin" />
                </div>
                <span className="animate-pulse">Thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Floating Input Pill Bar */}
        <div className="pb-3 sm:pb-6 pt-2 shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="bg-[#1e2025]/90 backdrop-blur-xl rounded-full flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border border-[#32353e] focus-within:border-gray-400 transition-all shadow-2xl"
          >
            <input 
              type="text"
              placeholder="Ask HireMe AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="bg-transparent flex-1 text-gray-200 placeholder-gray-500 outline-none text-xs sm:text-sm px-2 py-1"
            />
            <div className="flex items-center gap-1 sm:gap-1.5 text-gray-400 shrink-0">
              <button type="button" className="p-1.5 hover:text-white rounded-full hover:bg-[#282b32] transition-colors"><Image size={16} /></button>
              <button type="button" className="p-1.5 hover:text-white rounded-full hover:bg-[#282b32] transition-colors"><Mic size={16} /></button>
              {input.trim() && (
                <button 
                  type="submit"
                  className="p-1.5 sm:p-2 bg-white text-black rounded-full hover:bg-gray-200 transition-all transform active:scale-95"
                >
                  <Send size={13} />
                </button>
              )}
            </div>
          </form>
          <p className="text-[10px] sm:text-[11px] text-center text-gray-500 mt-1.5 sm:mt-2 font-light">
            HireMe AI displays information regarding Debanjit's skills, education, and projects.
          </p>
        </div>

      </main>
    </div>
  );
}
