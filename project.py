"""
[AUDIT]
# FILE: project.py
# ROLE: Main CLI Orchestrator (Backup, Status, and Global Tunneling).
# VERSION: 4.1 (Debugger Sync Update)
# LAST_CHANGE:
# - Switched subprocess target from 'app.py' to 'run.py'.
# - Enabled unbuffered output to ensure browser logs appear in terminal instantly.
# - Cleaned up subprocess handling for direct terminal piping.
"""

import os
import zipfile
import sys
import subprocess
import time
import requests
from datetime import datetime
from database.context_manager import ContextManager

# Configuration
KID_ID = "8660AC2E"
db = ContextManager()


# [BLOCK: BACKUP_LOGIC]
def backup_project():
    """Zips the current project state into the backups folder."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if not os.path.exists('backups'): os.makedirs('backups')

    zip_path = f"backups/kiddie_backup_{timestamp}.zip"
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Exclude environment, git, cache, and node_modules
            if any(x in root for x in ['backups', '__pycache__', '.venv', '.git', 'node_modules', 'database/vault']):
                continue
            for file in files:
                zipf.write(os.path.join(root, file))
    print(f"[✔] Project Secured: {zip_path}")
# [/BLOCK: BACKUP_LOGIC]


# [BLOCK: STATUS_LOGIC]
def show_status():
    """Prints the current project_map.md to the console with UTF-8 support."""
    if os.path.exists('project_map.md'):
        try:
            with open('project_map.md', 'r', encoding='utf-8') as f:
                print(f.read())
        except Exception as e:
            print(f"[❌] Could not read project_map.md: {e}")
    else:
        print("[!] project_map.md not found.")
# [/BLOCK: STATUS_LOGIC]


# [BLOCK: TUNNEL_LOGIC]
def start_tunnel():
    """Launches Flask V6.0 and Ngrok, then displays live sentinel links."""
    print("\n" + "=" * 55)
    print("🚀 KIDDIE GUARD - V6.0 SENTINEL COMMAND CENTER")
    print("=" * 55)

    # --- RESET STATUSES ---
    print("[🧹] System Cleanup: Resetting device statuses...")
    db.reset_all_statuses()

    # 1. Start the Flask Server (Pointing to run.py)
    print("[1/2] Launching V6.0 Stream Server (run.py)...")
    python_cmd = sys.executable

    # Using 'unbuffered' output so browser logs appear immediately
    flask_env = os.environ.copy()
    flask_env["PYTHONUNBUFFERED"] = "1"

    # Launch run.py directly. We don't pipe stdout so it flows to your terminal.
    flask_proc = subprocess.Popen([python_cmd, "run.py"], env=flask_env)
    time.sleep(4)

    # 2. Start Ngrok
    print("[2/2] Opening High-Speed Ngrok Tunnel...")
    ngrok_proc = subprocess.Popen(["ngrok", "http", "5000", "--host-header=rewrite"], shell=True)
    time.sleep(5)

    try:
        # 3. Fetch Dynamic URL
        response = requests.get("http://127.0.0.1:4040/api/tunnels")
        tunnels = response.json().get('tunnels', [])

        if tunnels:
            public_url = tunnels[0]['public_url']
            # Ensure it uses HTTPS for Camera Permissions
            if public_url.startswith("http:"):
                public_url = public_url.replace("http:", "https:")

            print("\n" + "⭐" * 50)
            print("🟢 GLOBAL SENTINEL ACTIVE")
            print(f"🔗 PUBLIC URL:   {public_url}")
            print(f"👶 KID PORTAL:   {public_url}/kid/portal/{KID_ID}")
            print(f"📱 DASHBOARD:    {public_url}/parent/dashboard")
            print("⭐" * 50)
            print("\n[LIVE] Mirror & Remote Debugger: ENABLED")
            print("[!] Check this terminal for browser console logs.")
            print("[!] Press Ctrl+C to terminate.")
        else:
            print("[❌] Tunnel failed. Check if Ngrok is already running elsewhere.")

        while True:
            # Check if server died unexpectedly
            if flask_proc.poll() is not None:
                print("[❌] Flask server (run.py) stopped unexpectedly!")
                break
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[🛑] Shutdown signal received. Closing Sentinel...")
    except Exception as e:
        print(f"\n[❌] Orchestrator Error: {e}")
    finally:
        flask_proc.terminate()
        ngrok_proc.terminate()
        # Force kill for Windows
        if os.name == 'nt':
            os.system('taskkill /f /im python.exe /t >nul 2>&1')
        print("[✔] Cleanup Complete. Ports cleared.")

# [/BLOCK: TUNNEL_LOGIC]

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd == "backup":
            backup_project()
        elif cmd == "status":
            show_status()
        elif cmd == "tunnel":
            start_tunnel()
        else:
            print(f"Unknown command '{cmd}'. Use: backup | status | tunnel")
    else:
        print("Usage: python project.py [backup|status|tunnel]")