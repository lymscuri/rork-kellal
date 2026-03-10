const memoryStore: Record<string, string> = {};

let useMemory = false;

async function getAsyncStorage() {
  if (useMemory) return null;
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    const AS = mod.default;
    await AS.getItem('__test__');
    return AS;
  } catch {
    console.warn('[Storage] AsyncStorage not available, using in-memory fallback');
    useMemory = true;
    return null;
  }
}

export const AppStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const AS = await getAsyncStorage();
    if (AS) {
      return AS.getItem(key);
    }
    return memoryStore[key] ?? null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    const AS = await getAsyncStorage();
    if (AS) {
      await AS.setItem(key, value);
    } else {
      memoryStore[key] = value;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    const AS = await getAsyncStorage();
    if (AS) {
      await AS.removeItem(key);
    } else {
      delete memoryStore[key];
    }
  },
};

export const zustandStorage = {
  getItem: (name: string): Promise<string | null> => {
    return AppStorage.getItem(name);
  },
  setItem: (name: string, value: string): Promise<void> => {
    return AppStorage.setItem(name, value);
  },
  removeItem: (name: string): Promise<void> => {
    return AppStorage.removeItem(name);
  },
};
