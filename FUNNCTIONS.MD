# 🗺️ Kiddie Sentinel - Function Registry

## 📂 Root

| File          | Block Name              | Purpose                                                                 |
|---------------|--------------------------|-------------------------------------------------------------------------|
| `project.py`  | PROJECT_ORCHESTRATOR    | CLI for backup, status, and starting the tunnel                        |
| `run.py`      | RUN_APP_CORE            | Flask entry point; initializes SocketIO and Blueprints                 |

## 📂 database/

| File                  | Block Name           | Purpose                                                                     |
|-----------------------|----------------------|-----------------------------------------------------------------------------|
| `context_manager.py`  | DB_IO                | Handles loading/saving the JSON database structure and initial setup       |
| `context_manager.py`  | STATUS_CONTROLS      | Manages online/offline visibility and server-start session resets          |
| `context_manager.py`  | LIBRARY_LOGIC        | Cleans YouTube IDs and detects content type (video vs playlist)            |
| `context_manager.py`  | KID_DATA_MGMT        | CRUD operations for kid profiles and persistent playback context           |

## 📂 routes/

| File                | Block Name            | Purpose                                                                                   |
|---------------------|-----------------------|-------------------------------------------------------------------------------------------|
| `socket_events.py`  | SOCKET_CORE_HUB       | Role-aware connection hub; manages identity-based room joining                           |
| `socket_events.py`  | REMOTE_DEBUGGER       | Pipes browser console.log and errors directly to the Python terminal                      |
| `socket_events.py`  | COMMAND_ROUTING       | Universal bridge relaying dashboard commands to kids as player_control                   |
| `socket_events.py`  | STATE_SYNC            | Bounces tablet player state (time/ID) back to parent mirrors                             |
| `socket_events.py`  | SNAPSHOT_LOGIC        | Processes base64 image uploads and saves "Cry Alert" files to the vault                   |
| `parent.py`         | ENROLLMENT_LOGIC      | Handles kid registration and unique UUID identity generation                             |
| `parent.py`         | DASHBOARD_CORE        | Renders the Parent Hub with full library and kid data context                            |
| `parent.py`         | VAULT_SERVICE         | Securely serves captured snapshots from the local database directory                     |

## 📦 static/js/parent/ (Dashboard Services)

| File                 | Block Name               | Purpose                                                                                 |
|----------------------|--------------------------|-----------------------------------------------------------------------------------------|
| `parent_socket.js`   | PARENT_SOCKET_CORE       | Main signaling hub; manages room joining and flattened command emission                |
| `parent_mirror.js`   | PARENT_MIRROR_ENGINE     | Secondary YT Players that mirror the child's screen state                              |
| `parent_stream.js`   | PARENT_STREAM_HANDLER    | Renders high-speed MJPEG-style frames from the tablet camera                           |
| `parent_vault.js`    | PARENT_VAULT_MANAGER     | Manages snapshot gallery, alerts, and real-time library assignment sync                |

[BLOCK: KID_REGISTRY_UPDATE]

## 📦 static/js/kid/ (Portal Services)

| File                | Block Name                | Purpose                                                                      |
|---------------------|---------------------------|------------------------------------------------------------------------------|
| `kid_socket.js`     | KID_SOCKET_CORE           | Signaling hub; routes player_control events to the player engine            |
| `kid_player.js`     | KID_YOUTUBE_ENGINE        | Handles hybrid loading and state reporting for videos/playlists             |
| `kid_hardware.js`   | KID_HARDWARE_CONTROLLER   | Manages camera/mic streams and high-speed frame emission                    |
| `kid_monitor.js`    | KID_AUDIO_MONITOR         | Triggers snapshots on decibel thresholds for cry detection                  |

[/BLOCK: KID_REGISTRY_UPDATE]

## 📂 templates/

| File           | Block Name          | Purpose                                                                |
|----------------|---------------------|------------------------------------------------------------------------|
| `parent.html`  | PARENT_DASHBOARD_UI | Grid layout for monitoring kids with library assignment dropdowns     |
| `kid.html`     | KID_PORTAL_UI       | Full-screen video player and hidden camera capture element            |
