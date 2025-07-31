import json
import os
from collections import OrderedDict
from threading import Lock
from datetime import datetime

class JSONLRUCache:
    def __init__(self, cache_file='cache.json', max_size=4):
        self.cache_file = cache_file
        self.max_size = max_size
        self.lock = Lock()
        self._load_cache()
    
    def _load_cache(self):
        """Load cache from JSON file"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r') as f:
                    data = json.load(f)
                    # Convert to OrderedDict to maintain order
                    self.cache = OrderedDict(data)
            else:
                self.cache = OrderedDict()
        except (json.JSONDecodeError, IOError):
            self.cache = OrderedDict()
    
    def _save_cache(self):
        """Save cache to JSON file"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(dict(self.cache), f, indent=2)
        except IOError:
            pass  # Handle file write errors gracefully
    
    def get(self, key):
        """Get value from cache and move to end (most recently used)"""
        with self.lock:
            if key in self.cache:
                # Move to end (most recently used)
                value = self.cache.pop(key)
                self.cache[key] = value
                # Update timestamp on access
                if isinstance(value, dict):
                    value['timestamp'] = datetime.now().isoformat()
                    self.cache[key] = value
                self._save_cache()
                return value
            return None
    
    def put(self, key, value):
        """Put value in cache, evict least recently used if necessary"""
        with self.lock:
            # Always add/update timestamp
            if isinstance(value, dict):
                value = value.copy()
                value['timestamp'] = datetime.now().isoformat()
            if key in self.cache:
                # Update existing key, move to end
                self.cache.pop(key)
            elif len(self.cache) >= self.max_size:
                # Remove least recently used (first item)
                self.cache.popitem(last=False)
            # Add new item (most recently used)
            self.cache[key] = value
            self._save_cache()
    
    def clear(self):
        """Clear all cache entries"""
        with self.lock:
            self.cache.clear()
            self._save_cache()

# Global cache instance
cache_instance = JSONLRUCache()