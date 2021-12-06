import {transformToCacheFormat} from './formatResult';
//import {logWikipediaHit}        from './../logger';
/**
 * run request for queries that have VALUES clause / handel cache misses/hits
 * @param     {Function}    request        function to issue (sparql) queries
 * @param     {Object}      cache          cache object for the current query
 * @param     {String}      variable       the key used in cache table
 * @param     {Array}       values         list of values to put in VALUES clause
 * @param     {String}      queryString    query to send
 * @param     {Number}      maxValues      maximal number of values that fit into VALUES clause (depending on endpoint , 10000 for wikidata)
 */
export default async function runRequest(request, cache, variable , values , queryString , maxValues = 10000) {
  //make sure we have unique values
  let set = [...new Set(values)];
  // hit cache
  let ask = cache.getValues(set);
  let notfound = ask.misses ;

  //** check if cache hit
  //if(ask.hits.length > 0){
  //console.log('hit: '+ cache._name);
  //logWikipediaHit.info('hit: '+ cache._name );
  //}
  //**

  if(notfound.length == 0){
    return ask.hits ;
  }

  // issue request for not found entities
  let resp = [] ;
  let reqs = [];

  for (let j = 0, k = notfound.length ; j<k ; j+=maxValues){

    let slice = notfound.slice(j, j + maxValues) ;

    let iriList = '';

    slice.forEach(rel => {
      iriList += `wd:${rel} `;
    });

    reqs.push(request(queryString(iriList)));
    //const respSlice = await request(queryString(iriList));
    //resp = [...resp , ...respSlice];
  }

  let res = await Promise.all(reqs) ;

  res.forEach(item => {
    resp = [...resp, ...item] ;
  });

  //adjust iris for literals and unknown
  // replace prefix added by endpoint, in case of non-existng uri with empty string
  // noticed that some keywords have unknown values (e.g., Category:Year of death missing) or are numbers (https://www.wikidata.org/wiki/Q6640133)
  resp.forEach(item => {
    let prefix = 'http://query.wikidata.org/bigdata/namespace/wdq/';
    if(item[variable].includes(prefix)){
      item[variable] = item[variable].replace(prefix, '');
    }
  });

  // transform into cache format
  let respFormatted = transformToCacheFormat(resp, variable, notfound) ;

  cache.setValues(respFormatted);

  //return [... transformToEndpointFormat(ask.hits, variable) , ... resp];
  return [... ask.hits, ... respFormatted];
}
