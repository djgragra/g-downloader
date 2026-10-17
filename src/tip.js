// The tip card in Help & info (apps/COMMON-FEATURES.md, section 6): it opens the site's own page, never a payment
// link, in the language of the app. Only these three addresses may be opened from the interface.
export const TIP_URLS = {
  en: 'https://onairgarage.com/support/',
  it: 'https://onairgarage.com/it/support/',
  es: 'https://onairgarage.com/es/support/'
};

export const tipUrl = (lang) => TIP_URLS[lang] || TIP_URLS.en;
export const isTipUrl = (url) => Object.values(TIP_URLS).includes(url);
