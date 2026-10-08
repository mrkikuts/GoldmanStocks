import { useEffect } from 'react';

import { restoreStoredLanguage } from '@/lib/i18n';

export function LanguageSync() {
  useEffect(() => {
    void restoreStoredLanguage().catch((error: unknown) =>
      console.error('Could not restore the saved app language', error),
    );
  }, []);

  return null;
}
