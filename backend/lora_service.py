import os
import requests
from pathlib import Path
import threading

# Global storage for tracking download progress
download_progress = {}

def download_lora_task(url: str, filename: str, destination_dir: Path):
    """
    Background task to download a LoRA file and track progress.
    """
    try:
        download_progress[filename] = {"status": "downloading", "progress": 0}
        
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded_size = 0
        
        destination_dir.mkdir(parents=True, exist_ok=True)
        dest_path = destination_dir / filename
        
        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded_size += len(chunk)
                    if total_size > 0:
                        progress = int((downloaded_size / total_size) * 100)
                        download_progress[filename]["progress"] = progress

        download_progress[filename] = {"status": "completed", "progress": 100, "local_path": str(dest_path)}
        print(f"✅ Successfully downloaded LoRA: {filename}")
        
        # Trigger ComfyUI model refresh
        refresh_comfy_models()
        
    except Exception as e:
        print(f"❌ Error downloading LoRA {filename}: {e}")
        download_progress[filename] = {"status": "error", "message": str(e)}

def refresh_comfy_models():
    """
    Tells ComfyUI to refresh its internal list of LoRAs and models.
    """
    try:
        # Standard ComfyUI refresh endpoint
        res = requests.post("http://127.0.0.1:8188/refresh", timeout=5)
        if res.ok:
            print("🔄 ComfyUI models refreshed successfully.")
            return True
        else:
            print(f"⚠️ ComfyUI refresh failed with status: {res.status_code}")
            return False
    except Exception as e:
        print(f"⚠️ Could not contact ComfyUI for refresh: {e}")
        return False

def start_lora_download(url: str, filename: str):
    """
    Triggers a background thread to download the LoRA.
    """
    comfy_loras = Path(__file__).parent.parent / "ComfyUI" / "models" / "loras" / "premium"
    
    # Start thread
    thread = threading.Thread(target=download_lora_task, args=(url, filename, comfy_loras))
    thread.start()
    return {"status": "started", "filename": filename}

def get_download_status(filename: str):
    """
    Returns the current status of a specific download.
    """
    return download_progress.get(filename, {"status": "not_found"})
