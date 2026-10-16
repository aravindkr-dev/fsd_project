import { createContext, useContext } from 'react';

export const ToastContext = createContext({ toast: () => {} });

/** toast('Saved') or toast('Failed', 'error'). */
export const useToast = () => useContext(ToastContext).toast;
