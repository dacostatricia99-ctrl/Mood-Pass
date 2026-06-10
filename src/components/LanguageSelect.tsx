import { useTranslation } from '../i18n/LanguageContext';
import { LANGUAGES, type Language } from '../i18n/translations';

export function LanguageSelect() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="select-wrapper">
      <select
        className="language-select"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
      >
        {LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
    </div>
  );
}
