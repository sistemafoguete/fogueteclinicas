/**
 * Wrapper para console.log que só executa em desenvolvimento
 * Evita logs desnecessários em produção, melhorando performance
 */

const isDev = import.meta.env.DEV;

export const debugLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

export const debugWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

export const debugError = (...args: any[]) => {
  // Erros sempre são logados
  console.error(...args);
};

export const debugInfo = (...args: any[]) => {
  if (isDev) {
    console.info(...args);
  }
};

export const debugTable = (data: any, columns?: string[]) => {
  if (isDev) {
    console.table(data, columns);
  }
};

export const debugGroup = (label: string, fn: () => void) => {
  if (isDev) {
    console.group(label);
    fn();
    console.groupEnd();
  }
};

export const debugTime = (label: string) => {
  if (isDev) {
    console.time(label);
  }
};

export const debugTimeEnd = (label: string) => {
  if (isDev) {
    console.timeEnd(label);
  }
};
