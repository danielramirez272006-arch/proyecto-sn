import { useState, useEffect } from 'react';

/**
 * Hook seguro para persistencia en localStorage con manejo de excepciones y sincronización
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`[useLocalStorage] Error leyendo clave "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      console.warn(`[useLocalStorage] Error guardando clave "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

