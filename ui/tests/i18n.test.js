const React = require('react');
const ReactDOMServer = require('react-dom/server');
const i18next = require('i18next');
const { I18nextProvider, initReactI18next, useTranslation } = require('react-i18next');
const en = require('../src/i18n/locales/en/common.json');
const fr = require('../src/i18n/locales/fr/common.json');
const assert = require('assert');

i18next.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

function Comp() {
  const { t } = useTranslation();
  return React.createElement('span', null, t('nav.operations'));
}

let html = ReactDOMServer.renderToString(
  React.createElement(I18nextProvider, { i18n: i18next }, React.createElement(Comp))
);
assert(html.includes('Operations'));

i18next.changeLanguage('fr');
html = ReactDOMServer.renderToString(
  React.createElement(I18nextProvider, { i18n: i18next }, React.createElement(Comp))
);
assert(html.includes('Opérations'));

console.log('i18n test passed');
