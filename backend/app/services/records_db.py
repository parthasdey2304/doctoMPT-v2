import sqlite3
import json
import os
import glob
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "records.db")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")

def get_connection(timeout: float = 10.0) -> sqlite3.Connection:
    """
    Returns an optimized SQLite connection with:
    - WAL mode (Write-Ahead Logging) for non-blocking concurrent reads and writes
    - Normal synchronous mode for high write throughput
    - 5000ms busy timeout to prevent "database is locked" errors
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=timeout)
    conn.row_factory = sqlite3.Row
    # Concurrency and Performance Pragmas
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS consultation_records (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                patient_name TEXT DEFAULT 'Anonymous',
                age INTEGER DEFAULT 30,
                gender TEXT DEFAULT 'Unspecified',
                chief_complaint TEXT,
                diagnosis TEXT,
                transcript TEXT,
                prescription TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_session ON consultation_records(session_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_created ON consultation_records(created_at);")
        conn.commit()
    finally:
        conn.close()

# Auto-initialize on import
init_db()

def save_record(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        rec_id = data.get("id") or str(uuid.uuid4())
        session_id = data.get("session_id") or rec_id
        patient_name = data.get("patient_name") or data.get("patient_info", {}).get("name") or "Patient"
        age = data.get("age") or data.get("patient_info", {}).get("age") or 30
        gender = data.get("gender") or data.get("patient_info", {}).get("gender") or "Not specified"
        chief_complaint = data.get("chief_complaint") or data.get("symptoms") or "General Consultation"
        
        prescription = data.get("prescription")
        if isinstance(prescription, (dict, list)):
            prescription_str = json.dumps(prescription)
            if not data.get("diagnosis") and isinstance(prescription, dict):
                diagnosis = prescription.get("diagnosis", "Clinical Assessment")
            else:
                diagnosis = data.get("diagnosis", "Clinical Assessment")
        else:
            prescription_str = str(prescription or "")
            diagnosis = data.get("diagnosis", "Clinical Assessment")

        transcript = data.get("transcript") or data.get("conversation_history") or []
        transcript_str = json.dumps(transcript) if isinstance(transcript, (dict, list)) else str(transcript or "")
        created_at = data.get("created_at") or datetime.utcnow().isoformat()

        cursor.execute("""
            INSERT OR REPLACE INTO consultation_records 
            (id, session_id, patient_name, age, gender, chief_complaint, diagnosis, transcript, prescription, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (rec_id, session_id, patient_name, age, gender, chief_complaint, diagnosis, transcript_str, prescription_str, created_at))
        conn.commit()

        return {
            "id": rec_id,
            "session_id": session_id,
            "patient_name": patient_name,
            "age": age,
            "gender": gender,
            "chief_complaint": chief_complaint,
            "diagnosis": diagnosis,
            "created_at": created_at,
            "status": "saved"
        }
    finally:
        conn.close()

def get_records(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, session_id, patient_name, age, gender, chief_complaint, diagnosis, transcript, prescription, created_at
            FROM consultation_records
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        rows = cursor.fetchall()
        results = []
        for row in rows:
            rec = dict(row)
            try:
                rec["transcript"] = json.loads(rec["transcript"])
            except Exception:
                pass
            try:
                rec["prescription"] = json.loads(rec["prescription"])
            except Exception:
                pass
            results.append(rec)
        return results
    finally:
        conn.close()

def get_record_by_id(record_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM consultation_records WHERE id = ? OR session_id = ?", (record_id, record_id))
        row = cursor.fetchone()
        if not row:
            return None
        rec = dict(row)
        try:
            rec["transcript"] = json.loads(rec["transcript"])
        except Exception:
            pass
        try:
            rec["prescription"] = json.loads(rec["prescription"])
        except Exception:
            pass
        return rec
    finally:
        conn.close()

def delete_record_by_id(record_id: str) -> bool:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM consultation_records WHERE id = ? OR session_id = ?", (record_id, record_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

def create_backup() -> Dict[str, Any]:
    """
    Creates an atomic, zero-downtime backup of the SQLite database
    using SQLite's online backup API.
    """
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_file = f"records_backup_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_file)

    source_conn = get_connection()
    backup_conn = sqlite3.connect(backup_path)
    try:
        source_conn.backup(backup_conn, pages=100)
        backup_size = os.path.getsize(backup_path)
        logger.info(f"SQLite backup successfully created: {backup_path} ({backup_size} bytes)")
        
        # Cleanup: keep only the latest 10 backups
        backups = sorted(glob.glob(os.path.join(BACKUP_DIR, "records_backup_*.db")), reverse=True)
        for old_backup in backups[10:]:
            try:
                os.remove(old_backup)
            except Exception as e:
                logger.warning(f"Failed to remove old backup {old_backup}: {e}")

        return {
            "status": "success",
            "backup_file": backup_file,
            "backup_path": backup_path,
            "size_bytes": backup_size,
            "timestamp": timestamp,
            "total_backups_retained": min(len(backups), 10)
        }
    finally:
        backup_conn.close()
        source_conn.close()

def list_backups() -> List[Dict[str, Any]]:
    os.makedirs(BACKUP_DIR, exist_ok=True)
    backups = sorted(glob.glob(os.path.join(BACKUP_DIR, "records_backup_*.db")), reverse=True)
    res = []
    for path in backups:
        res.append({
            "filename": os.path.basename(path),
            "size_bytes": os.path.getsize(path),
            "created_at": datetime.fromtimestamp(os.path.getctime(path)).isoformat()
        })
    return res
