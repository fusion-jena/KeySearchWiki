import Config               from './../../config/config';
import { logNetworkError }  from './../logger';

/**
 * given a list of wikipedia page ids retrieve their correspondingwikidata ids
 * @param     {String}            pageids          list of pageids : pageid1 | pageid2 ...
 * @param     {String}            apiurl           apiurl for current language
 * @param     {Number}            leftRetries      number of times to retry after facing a network error
 * @returns   {Promise}
 */
export default async function getWikidataID(pageids, apiurl, leftRetries = Config.maxRetries) {

  if (leftRetries <= 0) {
    throw 'limit # of query retries reached ! ';
    return;
  }

  let paramsWikidataID = {
    action: 'query',
    pageids: encodeURIComponent(pageids),
    prop: 'pageprops',
    format: 'json',
    utf8: 'true'
  };

  let url = apiurl + '?origin=*';
  Object.keys(paramsWikidataID).forEach(function (key) { url += '&' + key + '=' + paramsWikidataID[key]; });

  let responseIDs;

  try {

    responseIDs = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'kwsearch-goldstandard-generation-wikidata/1.0.0'
      }
    });
  }
  catch (e) {
    //if some network failure occurs, retry
    if (e.code == 'ECONNREFUSED' || e.code == 'ECONNRESET' || e.code == 'ETIMEDOUT' || e.code == 'EAI_AGAIN' || e.code == 'EHOSTUNREACH') {
      //write error in log together with query
      logNetworkError.error({ errorCode: `${e.code}`, errorMessage: `${e.message}`, function: 'getWikidataID', request: `${url}`, leftRetries: `${leftRetries}` });
      // reduce the load by delaying the execution
      await new Promise(resolve => setTimeout(resolve, Config.defaultDelay * 1000));
      //retry ;
      return await getWikidataID(pageids, apiurl, leftRetries - 1);
    }

    else {
      console.log(e);
      return;
    }
  }

  // if error retry
  if (responseIDs.status != 200) {

    //write error in log together with query
    logNetworkError.error({ status: `${responseIDs.status}`, statusText: `${responseIDs.statusText}`, function: 'getWikidataID', request: `${url}`, leftRetries: `${leftRetries}` });

    if ((responseIDs.status == 429) || (responseIDs.status >= 500)) {
      // get delay
      let delay;
      if (responseIDs.headers.hasOwnProperty('Retry-After')) {
        delay = responseIDs.headers['Retry-After'];
      }
      else {
        delay = Config.defaultDelay;
      }

      // reduce the load by delaying the execution
      await new Promise(resolve => setTimeout(resolve, delay * 1000));

      //retry ;
      return await getWikidataID(pageids, apiurl, leftRetries - 1);
    }

    else {
      throw responseIDs.statusText;
      return;
    }
  }

  let jsonIDs = await responseIDs.json();

  return jsonIDs.query.pages;

}
