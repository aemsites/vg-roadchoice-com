// import { getMetadata } from '../../scripts/lib-franklin.js';

// const langLocale = getMetadata('i18n');
const langLocale = 'fr-ca'; // TODO: refactor to make this dynamic
const i18nPath = langLocale ? `/${langLocale}` : '';

/**
 * @property {string} crData - Cross Reference Data URL
 * @property {string} pnData - Part Number Data URL
 * @property {string} imgData - Images Data URL
 */
const URLs = {
  crData: `${i18nPath}/cross-reference-data/cr-data.json`,
  pnData: `${i18nPath}/product-data/road-choice-make-model-part-filter-options.json`,
  imgData: `${i18nPath}/product-images/road-choice-website-images.json`,
};

const limit = 100_000;
const postMessageData = {};
const tempData = [];

async function getInitialJSONData(props) {
  const { url, offset = 0, limit: newLimit = null } = props;
  const nextOffset = offset > 0 ? `?offset=${offset}` : '';
  const nextLimit = limit ? `${offset > 0 ? '&' : '?'}limit=${newLimit}` : '';
  const results = await fetch(`${url}${nextOffset}${nextLimit}`);
  const json = await results.json();
  return json;
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
  const initialData = [...jsonData.data];
  let moreData;
  if (jsonData.data.length < jsonData.total) {
    moreData = await getMoreJSONData(url, jsonData.total);
  }
  return moreData ? [...initialData, ...moreData] : initialData;
}

onmessage = () => {
  const postMessages = Object.keys(URLs);
  postMessages.forEach(async (key) => {
    const url = URLs[key];
    postMessageData[key] = await getData(url);
    postMessage(postMessageData);
  });
};
