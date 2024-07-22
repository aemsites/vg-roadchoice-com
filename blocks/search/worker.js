/**
 * @property {string} crData - Cross Reference Data URL
 * @property {string} pnData - Part Number Data URL
 * @property {string} imgData - Images Data URL
 */
const URLs = {
  crData: '/cross-reference-data/cr-data.json',
  pnData: '/product-data/road-choice-make-model-part-filter-options.json',
  imgData: '/product-images/road-choice-website-images.json',
};

const limit = 100_000;
const postMessageData = {};
const tempData = [];


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

onmessage = ({ data }) => {
  const { rootLangPath } = data;
  const postMessages = Object.keys(URLs);
  postMessages.forEach(async (key) => {
    const url = `${rootLangPath}${URLs[key]}`;
    postMessageData[key] = await getData(url);
    postMessage(postMessageData);
  });
};
