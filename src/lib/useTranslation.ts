import { signal } from "@preact/signals";
import i18n from "./i18n";

// Create signal to track locale changes for reactivity
export const localeSignal = signal(i18n.language);

// Update signal when language changes
i18n.on("languageChanged", (lng: string) => {
  localeSignal.value = lng;
});

export function useTranslation() {
  localeSignal.value; // This automatically subscribes the component to signal changes
  
  return {
    t: (key: string, options?: any): string => {
      return i18n.t(key, options) as string;
    },
  };
}
