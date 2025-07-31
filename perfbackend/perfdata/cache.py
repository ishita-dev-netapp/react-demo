import json
import os
from collections import OrderedDict
from threading import Lock

class JSONLRUCache:
    def __init__(self, cache_file='cache.json', max_size=20):
        self.cache_file = cache_file
        self.max_size = max_size
        self.lock = Lock()
        self._load_cache()
    
    def _load_cache(self):
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r') as f:
                    data = json.load(f)
                    self.cache = OrderedDict(data)
            else:
                self.cache = OrderedDict()
        except (json.JSONDecodeError, IOError):
            self.cache = OrderedDict()
    
    def _save_cache(self):
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(dict(self.cache), f, indent=2)
        except IOError:
            pass
    
    def get(self, key):
        with self.lock:
            if key in self.cache:
                value = self.cache.pop(key)
                self.cache[key] = value
                self._save_cache()
                return value
            return None
    
    def put(self, key, value):
        with self.lock:
            if key in self.cache:
                self.cache.pop(key)
            elif len(self.cache) >= self.max_size:
                self.cache.popitem(last=False)
            self.cache[key] = value
            self._save_cache()
    
    def clear(self):
        with self.lock:
            self.cache.clear()
            self._save_cache()

cache_instance = JSONLRUCache()