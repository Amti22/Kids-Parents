"""
[AUDIT]
# FILE: database/context_manager.py
# ROLE: JSON Database Handler (The Bunker).
# VERSION: 2.7 (Restoration & Sync Optimized)
# LAST_CHANGE: Updated assign_to_kid to return full lib_item for robust JS media-type switching.
"""

import json
import os
import time
import re

class ContextManager:
    def __init__(self, db_path='database/context-map.json'):
        self.db_path = db_path
        self.data = self._load()

    # [BLOCK: DB_IO]
    def _load(self):
        """Loads or creates the JSON database structure with Library support."""
        if not os.path.exists(self.db_path) or os.stat(self.db_path).st_size == 0:
            initial_data = {
                "family_id": "FAM_001",
                "library": {},
                "kids": {},
                "global_commands": {
                    "pause_all": False,
                    "night_mode_all": False,
                    "global_volume": 100
                }
            }
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f, indent=4)
            return initial_data

        try:
            with open(self.db_path, 'r', encoding='utf-8') as f:
                content = json.load(f)
                # Schema Migration: Ensure library exists
                if "library" not in content:
                    content["library"] = {}
                return content
        except json.JSONDecodeError:
            print("[⚠️] Database corrupted. Resetting.")
            return {"family_id": "FAM_001", "library": {}, "kids": {}}

    def save(self):
        """Writes current state to disk."""
        try:
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=4)
            return True
        except Exception as e:
            print(f"[❌] Failed to save Bunker: {e}")
            return False

    def get_data(self, key=None):
        """Helper to retrieve raw data or specific keys used by routes."""
        if key:
            return self.data.get(key, {})
        return self.data
    # [/BLOCK: DB_IO]

    # [BLOCK: STATUS_CONTROLS]
    def reset_all_statuses(self):
        """Cleanup session states on server restart."""
        for kid_id in self.data.get('kids', {}):
            self.data['kids'][kid_id]['status'] = "offline"
        self.save()

    def update_status(self, kid_id, status):
        """Updates online/offline visibility."""
        if kid_id in self.data.get('kids', {}):
            self.data['kids'][kid_id]['status'] = status
            self.save()
            return True
        return False
    # [/BLOCK: STATUS_CONTROLS]

    # [BLOCK: LIBRARY_LOGIC]
    def get_library(self):
        """Returns the global library warehouse."""
        return self.data.get('library', {})

    def add_to_library(self, name, source_url):
        """Cleans YouTube IDs and detects Content Type."""
        content_type = "video"
        content_id = ""

        if 'list=' in source_url:
            content_id = source_url.split('list=')[-1].split('&')[0]
            content_type = "playlist"
        else:
            match = re.search(r"(?:v=|\/)([a-zA-Z0-9_-]{11})", source_url)
            content_id = match.group(1) if match else source_url
            content_type = "video"

        lib_id = f"lib_{int(time.time())}"
        self.data['library'][lib_id] = {
            "name": name,
            "url": content_id,
            "type": content_type,
            "added_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        return self.save()

    def assign_to_kid(self, kid_id, mode, library_id):
        """
        Syncs library item to a kid and returns (Success, Library_Item).
        RESTORED: Returns the full dict so the Parent Route knows the type (playlist vs video).
        """
        kid = self.get_kid(kid_id)
        if not kid:
            return False, "Kid not found"

        # Handle un-assignment (empty string)
        if library_id == "" or library_id is None:
            if 'playlists' not in kid: kid['playlists'] = {"day": "", "night": ""}
            kid['playlists'][mode] = ""
            self.save()
            return True, {"url": "", "type": "video"}

        if library_id in self.data.get('library', {}):
            lib_item = self.data['library'][library_id]

            # Ensure playlist structure exists
            if 'playlists' not in kid: kid['playlists'] = {"day": "", "night": ""}
            kid['playlists'][mode] = library_id

            # Update active playback context for persistence across reboots
            kid['playback']['current_video'] = lib_item['url']
            kid['playback']['media_type'] = lib_item['type']

            self.save()
            print(f"[🔗] Bunker Sync: {kid['name']} ({mode}) -> {lib_item['type']} {lib_item['url']}")
            return True, lib_item

        return False, "Library item not found in database"
    # [/BLOCK: LIBRARY_LOGIC]

    # [BLOCK: KID_DATA_MGMT]
    def get_kid(self, kid_id):
        return self.data.get('kids', {}).get(kid_id)

    def get_all_kids(self):
        return self.data.get('kids', {})

    def add_kid(self, kid_id, name, age, bedtime, wakeup):
        """Initializes a kid profile with the V2.5 schema."""
        self.data['kids'][kid_id] = {
            "name": name,
            "age": age,
            "bedtime": bedtime,
            "wakeup": wakeup,
            "status": "offline",
            "playback": {
                "current_video": "5qap5aO4i9A",
                "media_type": "video",
                "volume": 80,
                "is_paused": False
            },
            "playlists": {"day": "", "night": ""},
            "settings": {"night_mode": False}
        }
        return self.save()
    # [/BLOCK: KID_DATA_MGMT]