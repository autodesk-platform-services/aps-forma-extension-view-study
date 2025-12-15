import i18next, { type Resource } from "i18next";

const localeFiles = import.meta.glob("../locales/*.json", { eager: true });


const resources: Resource = {};
for (const path in localeFiles) {
  const localeMatch = path.match(/\/([^/]+)\.json$/);
  if (localeMatch) {
    const localeCode = localeMatch[1];
    resources[localeCode] = {
      translation: localeFiles[path] as Record<string, unknown>,
    };
  }
}

// Initialize i18next with default English locale
i18next.init({
  lng: "en-US",
  fallbackLng: "en-US",
  resources,
  nonExplicitSupportedLngs: true,
  interpolation: {
    escapeValue: false, // React/Preact already escapes values
  },
});

export default i18next;

