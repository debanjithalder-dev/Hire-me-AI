# 🚀 HireMe AI — Personal Portfolio & Interactive Recruiter Chatbot

**Hire Me AI** is a full-stack, AI-powered interactive assistant built for recruiters and hiring managers. It acts as a digital candidate representative, allowing recruiters to ask questions about technical background, project experience, skills, and resume details in real time.


## ✨ Features

- **⚡ Real-time Token Streaming:** Instant, word-by-word streaming responses with a smooth typewriter typing effect.
- **📄 Automated Resume Parsing:** Parses PDF resumes dynamically into structured JSON schemas using LLM intelligence.
- **💡 Smart Follow-up Suggestions:** Contextual questions generated at the end of every answer to keep interviewers engaged.
- **📥 Direct PDF Resume Download:** Generates inline Markdown links allowing recruiters to view or download the candidate's official resume PDF.
- **💬 Chat History & Sessions:** Save, select, and delete past conversation threads stored across interactive sessions.
- **🌐 Cold-Start Optimization:** Automatic background warming pings on initial page load to eliminate free-tier server boot delays.


## 🛠️ Tech Stack

**Frontend**
- **Framework:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Markdown & Icons:** `react-markdown`, `lucide-react`
- **Deployment:** [Vercel](https://vercel.com/)

**Backend**
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3)
- **AI Model:** Llama 3.3 70B Versatile via [Groq API](https://groq.com/)
- **PDF Processing:** `pypdf`, `pydantic`
- **Deployment:** [Render](https://render.com/)


## 📁 Repository Structure

```text
Hire-me-AI/
├── backend/
│   ├── main.py                     # FastAPI server, Groq integration, & resume parser
│   ├── requirements.txt            # Python dependencies
│   └── Resume_Debanjit(2)(1).pdf   # Candidate resume source file
└── frontend/
    ├── src/
    │   ├── App.jsx                 # Main React UI component
    │   └── main.jsx                # React DOM entry point
    ├── index.html                  # HTML template with custom favicon & title
    ├── package.json                # Node dependencies
    └── vite.config.js              # Vite configuration
