import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import svTranslations from '@/locales/sv/common.json';
import enTranslations from '@/locales/en/common.json';

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			sv: {
				translation: svTranslations,
			},
			en: {
				translation: enTranslations,
			},
		},
		fallbackLng: 'sv',
		supportedLngs: ['sv', 'en'],
		interpolation: {
			escapeValue: false,
		},
		detection: {
			order: ['localStorage', 'navigator'],
			caches: ['localStorage'],
		},
	});

export default i18n;

