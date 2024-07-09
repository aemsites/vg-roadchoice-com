/* eslint-disable import/no-cycle */
import { loadScript, sampleRUM } from './lib-franklin.js';
import { loadWorker } from './scripts.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

// OneTrust Cookies Consent Notice start for roadchoice.com
if (!window.location.pathname.includes('srcdoc')
  && !['localhost', 'hlx.page', 'hlx.live', 'aem.page', 'aem.live'].some((url) => window.location.host.includes(url))) {
  // when running on localhost in the block library host is empty but the path is srcdoc
  // on localhost/hlx.page/hlx.live the consent notice is displayed every time the page opens,
  // because the cookie is not persistent. To avoid this annoyance, disable unless on the
  // production page.
  loadScript('https://cdn.cookielaw.org/scripttemplates/otSDKStub.js', {
    type: 'text/javascript',
    charset: 'UTF-8',
    'data-domain-script': '73cee13a-d7db-4fb2-9508-a0b50738d660',
  });

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
}

// This searches for id="cookie-preference" button and displays the cookie preference center.
const preferenceBtn = document.querySelector('#cookie-preference');
if (preferenceBtn) preferenceBtn.addEventListener('click', () => window.OneTrust.ToggleInfoDisplay());

// add more delayed functionality here

// Google Analytics
async function loadGoogleTagManager() {
  // eslint-disable-next-line func-names
  (function (w, d, s, l, i) {
    w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' }); const f = d.getElementsByTagName(s)[0]; const j = d.createElement(s); const
      dl = l !== 'dataLayer' ? `&l=${l}` : ''; j.async = true; j.src = `https://www.googletagmanager.com/gtm.js?id=${i}${dl}`; f.parentNode.insertBefore(j, f);
  }(window, document, 'script', 'dataLayer', 'GTM-MJJCNZK'));
}

async function loadHotjar() {
  // Hotjar
  /* eslint-disable */
  (async function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:714824,hjsv:6}; a=o.getElementsByTagName('head')[0];
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
    i.async=!0,i.type="text/javascript",i.src="https://app.artibot.ai/loader.js",e.getElementsByTagName("head").item(0).appendChild(i),i.onreadystatechange=i.onload=function(){if(!(a||this.readyState&&"loaded"!=this.readyState&&"complete"!=this.readyState)){new window.ArtiBot({i:"8b46bd2b-302c-418e-9d5a-b1c46088754f"});
    a=!0}}
  })(window,document);
  /* eslint-enable */
}

const COOKIES = {
  performance: 'C0002:1',
  Target: 'C0004:1',
};

const cookieSetting = decodeURIComponent(document.cookie.split(';').find((cookie) => cookie.trim().startsWith('OptanonConsent=')));
const isPerformanceAllowed = cookieSetting.includes(COOKIES.performance);
const isTargetAllowed = cookieSetting.includes(COOKIES.Target);

if (isPerformanceAllowed) {
  loadGoogleTagManager();
  loadHotjar();
}

if (isTargetAllowed) {
  loadArtibot();
}

// This Worker loads all the product information into de global object window
const productsWorker = loadWorker();
export default productsWorker;
