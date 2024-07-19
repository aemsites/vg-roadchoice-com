// eslint-disable-next-line import/no-cycle
import { sampleRUM, loadScript } from './lib-franklin.js';
// eslint-disable-next-line import/no-cycle
import {
  isPerformanceAllowed,
  isTargetingAllowed,
  COOKIE_CONFIGS,
  loadWorker,
} from './common.js';

// COOKIE ACCEPTANCE AND IDs default to false in case no ID is present
const {
  DATA_DOMAIN_SCRIPT = false,
  GTM_ID = false,
  HOTJAR_ID = false,
  ARTIBOT_ID = false,
  COOKIE_CHECK = true,
} = COOKIE_CONFIGS;

// Core Web Vitals RUM collection
sampleRUM('cwv');

const avoidCookieCheck = COOKIE_CHECK === 'false';

// COOKIE ACCEPTANCE CHECKING
if (avoidCookieCheck || isPerformanceAllowed()) {
  if (GTM_ID) loadGoogleTagManager();
  if (HOTJAR_ID) loadHotjar();
}

if (avoidCookieCheck || isTargetingAllowed()) {
  if (ARTIBOT_ID) loadArtibot();
}

// add more delayed functionality here

// Prevent the cookie banner from loading when running in library
if (!window.location.pathname.includes('srcdoc')
  && !['localhost', 'hlx.page', 'hlx.live', 'aem.page', 'aem.live'].some((url) => window.location.host.includes(url))) {
  loadScript('https://cdn.cookielaw.org/scripttemplates/otSDKStub.js', {
    type: 'text/javascript',
    charset: 'UTF-8',
    'data-domain-script': DATA_DOMAIN_SCRIPT,
  });
}

window.OptanonWrapper = () => {
  const currentOnetrustActiveGroups = window.OnetrustActiveGroups;

  function isSameGroups(groups1, groups2) {
    const s1 = JSON.stringify(groups1.split(',').sort());
    const s2 = JSON.stringify(groups2.split(',').sort());

    return s1 === s2;
  }

  window.OneTrust.OnConsentChanged(() => {
    // reloading the page only when the active group has changed
    if (!isSameGroups(currentOnetrustActiveGroups, window.OnetrustActiveGroups)) {
      window.location.reload();
    }
  });
};

// Google Analytics
async function loadGoogleTagManager() {
  // google tag manager
  // eslint-disable-next-line func-names
  (function (w, d, s, l, i) {
    w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' }); const f = d.getElementsByTagName(s)[0]; const j = d.createElement(s); const
      dl = l !== 'dataLayer' ? `&l=${l}` : ''; j.async = true; j.src = `https://www.googletagmanager.com/gtm.js?id=${i}${dl}`; f.parentNode.insertBefore(j, f);
  }(window, document, 'script', 'dataLayer', GTM_ID));
}

// Hotjar
async function loadHotjar() {
  /* eslint-disable */
  (function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:HOTJAR_ID,hjsv:6}; a=o.getElementsByTagName('head')[0];
    r=o.createElement('script');r.async=1; r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
    a.appendChild(r);
  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  /* eslint-enable */
}

async function loadArtibot() {
  // Artibot
  /* eslint-disable */
  (async function(t,e){
    t.artibotApi={l:[],t:[],on:function(){this.l.push(arguments)},trigger:function(){this.t.push(arguments)}};
    var a=!1,i=e.createElement("script");
    i.async=!0,i.type="text/javascript",
    i.src="https://app.artibot.ai/loader.js",
    e.getElementsByTagName("head").item(0).appendChild(i),
    i.onreadystatechange=i.onload = function() {
      if (!(a||this.readyState&&"loaded"!=this.readyState&&"complete"!=this.readyState)) {
        new window.ArtiBot({i:ARTIBOT_ID});
        a=!0
      }
    }
  })(window,document);
  /* eslint-enable */
}

// Roadchoice specific code ↓
// This Worker loads all the product information into de global object window
const productsWorker = loadWorker();
export default productsWorker;

// This searches for id="cookie-preference" button and displays the cookie preference center.
const preferenceBtn = document.querySelector('#cookie-preference');
if (preferenceBtn) preferenceBtn.addEventListener('click', () => window.OneTrust.ToggleInfoDisplay());
