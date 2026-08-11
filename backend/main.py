from csv import reader
from email.mime import text
import json
import os
from pathlib import Path
from urllib import response
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from groq import Groq
from pydantic import BaseModel
from pypdf import PdfReader

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

model = "llama-3.3-70b-versatile"
app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="."), name="static")

# For resume parsing
class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = []

class Education(BaseModel):
    institution: str | None = None
    degree_or_class: str | None = None
    duration: str | None = None
    score: str | None = None

class Project(BaseModel):
    title: str | None = None
    date: str | None = None
    aim: str | None = None
    outcomes: str | None = None
    technology_used: list[str] = []

class Resume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None   
    github_url: str | None = None

    total_experience_years: float | None = None

    skills: list[str] = []
    experiences: list[Experience] = []
    education: list[Education] = []
    projects: list[Project] = []
    certifications: list[str] = []
resume_schema = Resume.model_json_schema()

class ChatMessage(BaseModel):
    role: str      # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

CACHED_RESUME: Resume | None = None

def ask_candidate(chat_history: list[ChatMessage], resume: Resume):

    BASE_URL = os.getenv("RENDER_EXTERNAL_URL", "http://127.0.0.1:8000")
    pdf_download_url = f"{BASE_URL}/static/Resume_Debanjit(2)(1).pdf"

    system_prompt = f"""
    You are an AI assistant representing a job candidate.

    Below is everything you know about the candidate.

    {resume.model_dump_json(indent=2)}

    Rules:

    1. Answer only using this information.
    2. Never hallucinate.
    3. If information is unavailable,say
       "I don't have enough information to answer that."
    4. Be professional.
    5. Answer as if HR is interviewing this candidate.
    6. 6. FORMATTING RULE: Whenever providing lists, items, or technology stacks, use standard numbered lists (1., 2., 3.) or bullet points (- or *) with clear line breaks.
    7. IF the recruiter/user asks to see, download, or get a copy of the resume/CV PDF, provide this clickable Markdown download link directly: 
       "Here is Debanjit's official resume PDF. You can view or download it directly using the link below:
       [Download Debanjit's Resume PDF]({pdf_download_url})"
    8. SUGGESTIONS RULE:
       At the very end of every response, add a section called "💡 **Suggested Follow-ups:**" with 3 concise, relevant questions the recruiter might want to ask next based on your response.
       
       Example structure:
       ... [Your main answer here] ...

       💡 **Suggested Follow-ups:**
       * What key projects has Debanjit built using AI and LLMs?
       * Can you tell me about his technical education and scores?
       * Would you like to view or download Debanjit's official resume PDF?
    """

    groq_messages = [{"role": "system", "content": system_prompt}]
    for msg in chat_history:
        groq_messages.append({"role": msg.role, "content": msg.content})

    response = client.chat.completions.create(
        model=model,
        messages=groq_messages,
        stream=True
    )
    for chunk in response:
        chunk_content = chunk.choices[0].delta.content or ""
        if chunk_content:
            yield chunk_content

def parse_resume(resume_text):
    system_prompt = f"""
    You are an expert resume parser.

    Extract information from the resume based on its meaning,
    not only based on exact section headings.

    Different resumes may use different headings.

    For example:
    - Experience
    - Professional Experience
    - Work History
    - Employment
    - Internships

    These may all contain relevant experience.

    Skills may also appear in the skills section, work experience,
    internships or projects.

    Return ONLY valid JSON matching this schema:

    {resume_schema}

    Important rules:

    1. Do not invent information.
    2. Extract LinkedIn and GitHub URLs into `linkedin_url` and `github_url`.
    3. Under `education`, extract school/college name, degree or class name, duration, and score (e.g. CGPA, percentage, marks).
    4. Under `projects`, extract project title, aim, outcomes, and technologies used.
    5. If a value is not available, return null.
    6. If a list has no information, return an empty list.
    7. Include internships inside experiences.
    8. Extract skills mentioned across the entire resume.
    """
    user_prompt = f"""
    Parse the following resume:

    {resume_text}
    """
    message_system={
        "role" : "system",
        "content" : system_prompt
    }
    message_user={
        "role" : "user",
        "content" : user_prompt
    }
    messages=[message_system, message_user]
    response_format={
        "type": "json_object"
    }
    response=client.chat.completions.create(model=model, messages=messages, response_format=response_format)
    raw_output = response.choices[0].message.content
    data = json.loads(raw_output)
    resume = Resume(**data)
    return resume

def read_pdf(file_path: Path):
    reader = PdfReader(file_path)
    text = ""

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text

@app.get("/")
def home():
    return {
        "message": "Welcome to Debanjit's HireMe AI backend!"
    }

@app.post("/chat")
def chat(request: ChatRequest):
    global CACHED_RESUME
    if not CACHED_RESUME:
        pdf_path = Path("Resume_Debanjit(2)(1).pdf")
        if pdf_path.exists():
            CACHED_RESUME = parse_resume(read_pdf(pdf_path))
        else:
            return {"answer": "Resume file not found on server."}

    return StreamingResponse(
        ask_candidate(request.messages, CACHED_RESUME),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
