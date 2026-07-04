/**
 * Trailing-edge debouncer.
 *
 * Coalesce múltiples invocaciones dentro de una ventana de `ms` milisegundos
 * en una sola llamada al final con los últimos argumentos recibidos. La
 * invocación pendiente puede forzarse con `flush()` (no espera la ventana)
 * o cancelarse con `cancel()` (se descarta).
 *
 * Diseñado para evitar storms de PATCH `/api/books/:id/progress` cuando el
 * usuario hace scroll rápido. Se combina con coalescers a nivel de estado
 * (ver `bookStore.scheduleCloudProgress`) para que múltiples fuentes de
 * actualización (scroll, reading timer) puedan mezclarse en un único fetch.
 */
export function trailingDebounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): {
  call: (...args: A) => void;
  cancel: () => void;
  flush: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: A | undefined;

  function call(...args: A): void {
    lastArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs !== undefined) {
        const args = lastArgs;
        lastArgs = undefined;
        fn(...args);
      }
    }, ms);
  }

  function cancel(): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    lastArgs = undefined;
  }

  function flush(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs !== undefined) {
      const args = lastArgs;
      lastArgs = undefined;
      fn(...args);
    }
  }

  return { call, cancel, flush };
}
