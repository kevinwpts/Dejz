const PIN_KEY = 'app_pin';
const BIOMETRICS_KEY = 'app_biometrics';

export const getPin = () => {
  const pin = localStorage.getItem(PIN_KEY);
  if (!pin) return null;
  try {
    return atob(pin);
  } catch (_e) {
    console.error('Failed to decode PIN:', _e);
    localStorage.removeItem(PIN_KEY);
    return null;
  }
};

export const setPin = (pin: string) => localStorage.setItem(PIN_KEY, btoa(pin));

export const removePin = () => localStorage.removeItem(PIN_KEY);

export const hasPin = () => !!localStorage.getItem(PIN_KEY);

export const verifyPin = (input: string) => {
  const stored = localStorage.getItem(PIN_KEY);
  return stored === btoa(input);
};

export const isBiometricsEnabled = () => localStorage.getItem(BIOMETRICS_KEY) === 'true';

export const setBiometricsEnabled = (enabled: boolean) => localStorage.setItem(BIOMETRICS_KEY, String(enabled));
