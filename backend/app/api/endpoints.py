from fastapi import APIRouter, HTTPException, Query, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uuid

from app.services.langgraph_agent import langgraph_doctor
from app.services.prescription_service import prescription_service
from app.services.pharmacy_tools import search_1mg, search_pharmeasy, search_local_kaggle_neo4j
from app.services import records_db
from app.core.security import rate_limiter, llm_rate_limiter, verify_api_guard

router = APIRouter()

class ChatRequest(BaseModel):
    message: str = Field(..., description="Patient dialogue or medical query")
    session_id: Optional[str] = Field(None, description="Unique session thread ID for LangGraph state persistence")
    patient_info: Optional[Dict[str, Any]] = Field(default=None, description="Patient vitals, name, age, gender")

class ChatResponse(BaseModel):
    response: str
    session_id: str
    tools_called: List[Dict[str, Any]]
    prescription: Optional[Dict[str, Any]] = None

class PrescriptionRequest(BaseModel):
    session_id: str
    conversation_summary: str
    patient_info: Optional[Dict[str, Any]] = None

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, raw_req: Request):
    llm_rate_limiter.check(raw_req)
    session_id = request.session_id or str(uuid.uuid4())
    try:
        result = await langgraph_doctor.chat(
            session_id=session_id,
            message=request.message,
            patient_info=request.patient_info
        )
        return ChatResponse(
            response=result["response"],
            session_id=result["session_id"],
            tools_called=result.get("tools_called", []),
            prescription=result.get("prescription")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph Agent Error: {str(e)}")

@router.post("/prescription/generate")
async def generate_prescription(request: PrescriptionRequest, raw_req: Request):
    llm_rate_limiter.check(raw_req)
    try:
        prescription = await prescription_service.generate_from_conversation(
            conversation_history=request.conversation_summary,
            patient_info=request.patient_info
        )
        return {"status": "success", "prescription": prescription}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prescription generation error: {str(e)}")

@router.get("/medicines/1mg")
def query_1mg(raw_req: Request, q: str = Query(..., description="Search 1mg for Indian medicines")):
    rate_limiter.check(raw_req)
    try:
        return {"source": "Tata 1mg", "query": q, "results": search_1mg.invoke(q)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/medicines/pharmeasy")
def query_pharmeasy(raw_req: Request, q: str = Query(..., description="Search PharmEasy for Indian medicines")):
    rate_limiter.check(raw_req)
    try:
        return {"source": "PharmEasy", "query": q, "results": search_pharmeasy.invoke(q)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/medicines/neo4j")
def query_neo4j(raw_req: Request, q: str = Query(..., description="Search local Neo4j Kaggle vector store")):
    rate_limiter.check(raw_req)
    try:
        return {"source": "Neo4j Kaggle RAG", "query": q, "results": search_local_kaggle_neo4j.invoke(q)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Clinical EMR Records Endpoints (Stored on AWS SQLite with WAL Concurrency)
@router.post("/records")
def save_consultation_record(data: Dict[str, Any], raw_req: Request):
    rate_limiter.check(raw_req)
    try:
        saved = records_db.save_record(data)
        return {"status": "success", "record": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SQLite Error: {str(e)}")

@router.get("/records")
def list_consultation_records(raw_req: Request, limit: int = 50, offset: int = 0):
    rate_limiter.check(raw_req)
    try:
        records = records_db.get_records(limit=limit, offset=offset)
        return {"status": "success", "records": records, "count": len(records), "storage": "AWS EC2 SQLite (WAL Mode)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SQLite Error: {str(e)}")

# Automated SQLite Database Backup Endpoints
@router.post("/records/backup")
def trigger_sqlite_backup(raw_req: Request):
    rate_limiter.check(raw_req)
    try:
        backup_info = records_db.create_backup()
        return {"status": "success", "backup": backup_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup error: {str(e)}")

@router.get("/records/backups")
def list_sqlite_backups(raw_req: Request):
    rate_limiter.check(raw_req)
    try:
        backups = records_db.list_backups()
        return {"status": "success", "backups": backups, "count": len(backups)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup list error: {str(e)}")

@router.get("/records/{record_id}")
def get_consultation_record(record_id: str, raw_req: Request):
    rate_limiter.check(raw_req)
    rec = records_db.get_record_by_id(record_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"status": "success", "record": rec, "storage": "AWS EC2 SQLite (WAL Mode)"}

@router.delete("/records/{record_id}")
def delete_consultation_record(record_id: str, raw_req: Request):
    rate_limiter.check(raw_req)
    success = records_db.delete_record_by_id(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"status": "success", "message": f"Record {record_id} deleted from SQLite"}
