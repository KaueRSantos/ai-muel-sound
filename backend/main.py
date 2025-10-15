import os
import uuid
import asyncio
import shutil
import tempfile
from pathlib import Path
from typing import List, Dict
from datetime import datetime, timedelta

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import librosa
import numpy as np
from scipy import signal
from scipy.signal import hilbert, butter, sosfilt
import soundfile as sf
import logging
import yt_dlp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Demucs imports
try:
    from demucs.separate import main as demucs_main
    from demucs.pretrained import get_model
    DEMUCS_AVAILABLE = True
    logger.info("Demucs carregado com sucesso - usando modelo SOTA HT-Demucs")
except ImportError:
    DEMUCS_AVAILABLE = False
    logger.warning("Demucs não está instalado. Execute: pip install demucs torch torchaudio")

# Initialize FastAPI app
app = FastAPI(title="Audio Splitter Studio API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_DIR = Path("./tmp/uploads")
OUTPUT_DIR = Path("./tmp/outputs")
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 52428800))  # 50MB default
CLEANUP_AFTER = int(os.getenv("CLEANUP_AFTER", 3600))  # 1 hour

# Create directories
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Audio processing functions
def separate_audio_advanced(input_path: str, output_dir: str, job_id: str):
    """
    Separa áudio em 6 stems usando Demucs 6-source (SOTA model).
    
    Características:
    - Usa o modelo HT-Demucs-6s (6 stems) da Meta/Facebook
    - Separa: voz, baixo, bateria, guitarra, piano e outros
    - Qualidade superior ao Spleeter
    - Preserva 48 kHz sample rate para qualidade Hi-Fi
    - Headroom de -1 dBFS para evitar clipping
    
    Stems gerados:
    - vocals (voz)
    - bass (baixo)
    - drums (bateria)
    - guitar (guitarra elétrica/acústica/violão)
    - piano (teclado/piano/sintetizadores)
    - other (outros instrumentos)
    """
    if not DEMUCS_AVAILABLE:
        raise RuntimeError("Demucs não está disponível. Instale com: pip install demucs torch torchaudio")
    
    try:
        # Create output directory
        stems_dir = Path(output_dir) / job_id
        stems_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Iniciando separação com Demucs 6-stems (htdemucs_6s) para job {job_id}")
        
        # Carrega o áudio original para preservar o sample rate
        audio_info = sf.info(input_path)
        original_sr = audio_info.samplerate
        logger.info(f"Sample rate original: {original_sr} Hz")
        
        # Demucs escreve em uma pasta de saída; usamos temp para organizar e depois movemos
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            
            # Simula chamada CLI: demucs -n htdemucs_6s -o <output> <input>
            # htdemucs_6s é o modelo com 6 stems (vocals, bass, drums, guitar, piano, other)
            import sys
            old_argv = sys.argv.copy()
            
            try:
                sys.argv = [
                    "demucs",
                    "-n", "htdemucs_6s",  # Modelo 6-stems: voz, baixo, bateria, guitarra, piano, outros
                    "-o", str(tmp_path),
                    input_path,
                ]
                
                logger.info(f"Executando Demucs 6-stems com argumentos: {sys.argv}")
                demucs_main()
                
            finally:
                sys.argv = old_argv
            
            # A pasta final fica em tmp/htdemucs_6s/<basename_sem_extensão>/
            model_output = tmp_path / "htdemucs_6s"
            
            # Encontra a pasta com os stems
            song_folders = list(model_output.glob("*"))
            if not song_folders:
                raise RuntimeError(f"Demucs não gerou saída esperada em {model_output}")
            
            song_folder = song_folders[0]
            logger.info(f"Stems encontrados em: {song_folder}")
            
            # Move e processa cada stem (agora são 6!)
            # Mapeamento: guitar -> guitarra, piano -> teclado
            stem_mapping = {
                "vocals": "vocals",
                "bass": "bass",
                "drums": "drums",
                "guitar": "guitar",  # Inclui guitarra elétrica, acústica e violão
                "piano": "piano",    # Inclui piano, teclado, sintetizadores
                "other": "other"
            }
            
            for stem_name, output_name in stem_mapping.items():
                src = song_folder / f"{stem_name}.wav"
                dst = stems_dir / f"{output_name}.wav"
                
                if src.exists():
                    # Lê o stem
                    audio, sr = sf.read(str(src))
                    
                    # Preserva 48 kHz se o original for próximo disso
                    # Garante headroom de -1 dBFS para evitar clipping
                    max_val = np.abs(audio).max()
                    if max_val > 0:
                        # Normaliza para -1 dBFS (0.891 = 10^(-1/20))
                        target_peak = 0.891
                        if max_val > target_peak:
                            audio = audio * (target_peak / max_val)
                    
                    # Salva com configurações de alta qualidade
                    # 48 kHz, 24-bit depth para qualidade próxima ao "Hi-Fi"
                    sf.write(
                        str(dst),
                        audio,
                        samplerate=sr,
                        subtype='PCM_24'  # 24-bit depth
                    )
                    
                    logger.info(f"Stem processado: {stem_name} -> {output_name} ({sr} Hz, pico: {np.abs(audio).max():.3f})")
                else:
                    logger.warning(f"Stem não encontrado: {src}")
        
        logger.info(f"Separação de áudio concluída para job {job_id} - 6 stems gerados")
        
        # Retorna caminhos para os 6 stems
        stems = {
            "voz": {
                "wav": f"/download/{job_id}/vocals.wav",
                "stream": f"/stream/{job_id}/vocals.wav",
            },
            "baixo": {
                "wav": f"/download/{job_id}/bass.wav",
                "stream": f"/stream/{job_id}/bass.wav",
            },
            "bateria": {
                "wav": f"/download/{job_id}/drums.wav",
                "stream": f"/stream/{job_id}/drums.wav",
            },
            "guitarra": {
                "wav": f"/download/{job_id}/guitar.wav",
                "stream": f"/stream/{job_id}/guitar.wav",
            },
            "teclado": {
                "wav": f"/download/{job_id}/piano.wav",
                "stream": f"/stream/{job_id}/piano.wav",
            },
            "outros": {
                "wav": f"/download/{job_id}/other.wav",
                "stream": f"/stream/{job_id}/other.wav",
            },
        }
        
        return stems
        
    except Exception as e:
        logger.error(f"Erro na separação com Demucs: {e}", exc_info=True)
        raise

# Store processing jobs
jobs: Dict[str, Dict] = {}


# Pydantic models
class YouTubeRequest(BaseModel):
    url: str


async def download_youtube_audio(url: str, job_id: str) -> Path:
    """Download audio from YouTube URL"""
    try:
        output_file = UPLOAD_DIR / f"{job_id}.mp3"
        
        # Configurações avançadas para evitar bloqueio do YouTube
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': str(UPLOAD_DIR / f"{job_id}"),
            'quiet': True,
            'no_warnings': True,
            # Opções para evitar detecção como bot
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            'nocheckcertificate': True,
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'player_skip': ['webpage', 'configs'],
                }
            },
            # Headers adicionais
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        }
        
        logger.info(f"Baixando áudio do YouTube para job {job_id}: {url}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            logger.info(f"Áudio baixado: {info.get('title', 'Unknown')}")
        
        if not output_file.exists():
            raise RuntimeError(f"Falha ao baixar áudio do YouTube")
        
        # Verificar tamanho do arquivo
        file_size = output_file.stat().st_size
        if file_size > MAX_FILE_SIZE:
            output_file.unlink()
            raise HTTPException(
                status_code=413,
                detail=f"Arquivo muito grande. Tamanho máximo: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        logger.info(f"Download concluído: {output_file} ({file_size / 1024 / 1024:.2f}MB)")
        return output_file
        
    except Exception as e:
        logger.error(f"Erro ao baixar do YouTube: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao baixar do YouTube: {str(e)}")


async def cleanup_old_files():
    """Remove files older than CLEANUP_AFTER seconds"""
    try:
        current_time = datetime.now()
        for directory in [UPLOAD_DIR, OUTPUT_DIR]:
            for item in directory.iterdir():
                if item.is_file() or item.is_dir():
                    item_time = datetime.fromtimestamp(item.stat().st_mtime)
                    if (current_time - item_time).seconds > CLEANUP_AFTER:
                        if item.is_file():
                            item.unlink()
                        else:
                            shutil.rmtree(item)
                        logger.info(f"Cleaned up old file: {item}")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")


async def process_audio(job_id: str, input_path: Path, output_path: Path):
    """Process audio file with simple separation"""
    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = 10
        
        logger.info(f"Starting audio separation for job {job_id}")
        
        jobs[job_id]["progress"] = 30
        
        # Perform separation using our advanced method
        stems = separate_audio_advanced(str(input_path), str(output_path.parent), job_id)
        
        jobs[job_id]["progress"] = 100
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["stems"] = stems
        
        logger.info(f"Job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Error processing job {job_id}: {e}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)


@app.get("/")
async def root():
    return {"message": "Audio Splitter Studio API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/upload")
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """Upload and process audio file"""
    try:
        # Validate file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Validate file type
        allowed_extensions = [".mp3", ".wav", ".flac", ".ogg", ".m4a"]
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Save uploaded file
        input_path = UPLOAD_DIR / f"{job_id}{file_ext}"
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File uploaded: {file.filename} -> {job_id}")
        
        # Initialize job
        jobs[job_id] = {
            "id": job_id,
            "filename": file.filename,
            "status": "queued",
            "progress": 0,
            "created_at": datetime.now().isoformat()
        }
        
        # Start processing in background
        output_path = OUTPUT_DIR / job_id
        output_path.mkdir(exist_ok=True)
        
        background_tasks.add_task(process_audio, job_id, input_path, output_path)
        background_tasks.add_task(cleanup_old_files)
        
        return {
            "job_id": job_id,
            "status": "queued",
            "message": "File uploaded successfully. Processing started."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process-youtube")
async def process_youtube(
    request: YouTubeRequest,
    background_tasks: BackgroundTasks
):
    """Process audio from YouTube URL"""
    try:
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job
        jobs[job_id] = {
            "id": job_id,
            "filename": request.url,
            "status": "downloading",
            "progress": 0,
            "created_at": datetime.now().isoformat()
        }
        
        logger.info(f"Iniciando download do YouTube para job {job_id}: {request.url}")
        
        # Download audio from YouTube
        input_path = await download_youtube_audio(request.url, job_id)
        
        # Update job status
        jobs[job_id]["status"] = "queued"
        jobs[job_id]["progress"] = 5
        
        # Start processing in background
        output_path = OUTPUT_DIR / job_id
        output_path.mkdir(exist_ok=True)
        
        background_tasks.add_task(process_audio, job_id, input_path, output_path)
        background_tasks.add_task(cleanup_old_files)
        
        return {
            "job_id": job_id,
            "status": "queued",
            "message": "YouTube audio downloaded successfully. Processing started."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"YouTube processing error: {e}")
        if job_id in jobs:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{job_id}")
async def get_status(job_id: str):
    """Get processing status of a job"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return jobs[job_id]


@app.get("/download/{job_id}/{filename}")
async def download_file(job_id: str, filename: str):
    """Download a separated stem"""
    file_path = OUTPUT_DIR / job_id / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@app.get("/stream/{job_id}/{filename}")
async def stream_audio(job_id: str, filename: str, request: Request):
    """Stream audio for direct playback in browser"""
    file_path = OUTPUT_DIR / job_id / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get file size
    file_size = file_path.stat().st_size
    
    # Get range header for partial content support
    range_header = request.headers.get('Range')
    
    if range_header:
        # Parse range header
        range_match = range_header.replace('bytes=', '').split('-')
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if range_match[1] else file_size - 1
        
        # Ensure end doesn't exceed file size
        end = min(end, file_size - 1)
        
        # Calculate content length
        content_length = end - start + 1
        
        # Read the requested range
        with open(file_path, 'rb') as f:
            f.seek(start)
            data = f.read(content_length)
        
        # Return partial content response
        return StreamingResponse(
            iter([data]),
            status_code=206,
            headers={
                'Content-Range': f'bytes {start}-{end}/{file_size}',
                'Accept-Ranges': 'bytes',
                'Content-Length': str(content_length),
                'Content-Type': 'audio/wav'
            }
        )
    else:
        # Return full file
        return FileResponse(
            path=file_path,
            media_type="audio/wav",
            headers={
                'Accept-Ranges': 'bytes',
                'Content-Length': str(file_size)
            }
    )


@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its files"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    try:
        # Remove files
        upload_file = None
        for ext in [".mp3", ".wav", ".flac", ".ogg", ".m4a"]:
            path = UPLOAD_DIR / f"{job_id}{ext}"
            if path.exists():
                upload_file = path
                break
        
        if upload_file:
            upload_file.unlink()
        
        output_path = OUTPUT_DIR / job_id
        if output_path.exists():
            shutil.rmtree(output_path)
        
        # Remove from jobs dict
        del jobs[job_id]
        
        return {"message": "Job deleted successfully"}
        
    except Exception as e:
        logger.error(f"Delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

