import asyncio
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import model as ml

_executor = ThreadPoolExecutor(max_workers=1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model in a background thread so startup doesn't block the event loop
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, ml.load_model)
    yield


app = FastAPI(title="Scholarship Scorer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PSRequest(BaseModel):
    academic_goals: str
    career_goals: str
    leadership_experience: str
    personal_statement: str


class ResumeRequest(BaseModel):
    resume_text: str


@app.get("/health")
def health():
    return {"ok": True, "model_loaded": ml.MODEL_LOADED}


@app.post("/score/personal-statement")
async def score_ps(req: PSRequest):
    if not ml.MODEL_LOADED:
        raise HTTPException(status_code=503, detail="Model is still loading, try again shortly.")
    try:
        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(_executor, ml.score_statement, req.personal_statement)
        return scores
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/score/resume")
async def score_resume(req: ResumeRequest):
    if not ml.MODEL_LOADED:
        raise HTTPException(status_code=503, detail="Model is still loading, try again shortly.")
    try:
        loop = asyncio.get_event_loop()
        scores = await loop.run_in_executor(_executor, ml.score_resume, req.resume_text)
        return scores
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
