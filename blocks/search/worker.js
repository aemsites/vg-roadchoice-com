const limit = 100_000;
const postMessageData = {};
const tempData = [];

function getLocaleContextedUrl(urlPathToConvert, providedWorkerData = {}) {
  const { rootLangPath = '', pathname = '' } = providedWorkerData;
  const localeRegexToMatch = new RegExp(`${rootLangPath}/`, 'i');
  const localeInPageUrlRegex = new RegExp(`^/${rootLangPath}/`, 'i');
  let pageUrl = urlPathToConvert.startsWith('/') ? urlPathToConvert : `/${urlPathToConvert}`;

  if (!rootLangPath) {
    return pageUrl;
  }

  if (localeRegexToMatch.test(pathname) && !localeInPageUrlRegex.test(pageUrl)) {
    pageUrl = `${rootLangPath.toLocaleLowerCase()}${pageUrl}`;
  }

  return pageUrl;
}

async function getInitialJSONData(props) {
  const { url, offset = 0, limit: newLimit = null } = props;
  const nextOffset = offset > 0 ? `?offset=${offset}` : '';
  const nextLimit = newLimit ? `${offset > 0 ? '&' : '?'}limit=${newLimit}` : '';

  try {
    const results = await fetch(`${url}${nextOffset}${nextLimit}`);
    if (!results.ok) {
      throw new Error(`HTTP error! status: ${results.status}`);
    }
    const json = await results.json();
    return json;
  } catch (error) {
    console.error('Error fetching JSON data:', error);
    return null;
  }
}

async function getMoreJSONData(url, total, offset = 0) {
  const newOffset = offset + limit;
  const json = await getInitialJSONData({ url, offset: newOffset, limit });
  const isLastCall = json.offset + limit >= json.total;
  if (isLastCall) {
    const lastData = [...tempData, ...json.data];
    tempData.length = 0;
    return lastData;
  }
  tempData.push(...json.data);
  return getMoreJSONData(total, newOffset);
}

async function getData(url) {
  const jsonData = await getInitialJSONData({ url, limit });

  if (jsonData) {
    const initialData = [...jsonData.data];
    let moreData;
    if (jsonData.data.length < jsonData.total) {
      moreData = await getMoreJSONData(url, jsonData.total);
    }
    return moreData ? [...initialData, ...moreData] : initialData;
  }

  return [];
}

onmessage = function test({ data: providedWorkerData }) {
  const URLs = {
    crData: getLocaleContextedUrl('/cross-reference-data/cr-data.json', providedWorkerData),
    pnData: getLocaleContextedUrl('/product-data/road-choice-make-model-part-filter-options.json', providedWorkerData),
    imgData: getLocaleContextedUrl('/product-images/road-choice-website-images.json', providedWorkerData),
  };

  const postMessages = Object.keys(URLs);
  postMessages.forEach(async (key) => {
    const url = URLs[key];

    if (url) {
      postMessageData[key] = await getData(url);
      postMessage(postMessageData);
    }
  });
};
