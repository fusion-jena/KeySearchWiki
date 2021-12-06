import Cache from './../cache';
import getWikidataID from './getWikidataID';
//import { logWikipediaHit } from './../logger';
//import requestWikip          from './connWikipedia';


//init cache
let cacheWikipIDs = new Cache('wikipedia_page_wikidataID', 'pageid' );

/**
 * run query to get wikidata ids for wikipedia pages / handel cache misses/hits
 * @param     {Array}      pages             list of wikipedia pageids
 * @param     {String}     apiurl            apiurl for current language
 * @param     {String}     lang              current language
 * @returns   {(Promise[Array]}   returns promise with an array of results
 */
export default async function runRequestCatID(pages, apiurl, lang) {

  // page ids to string
  pages = pages.map(item => item = item.toString());

  //make sure we have unique values
  let set = [...new Set(pages)];
  // hit cache
  let ask = cacheWikipIDs.getValues( set, lang );
  let notfound = ask.misses;

  //** TODO: remove after first run of pipeline
  //if(ask.hits.length > 0){
  //console.log('hit: '+ cache._name);
  //logWikipediaHit.info('hit: '+ cacheWikipIDs._name );
  //}
  //**

  if (notfound.length == 0) {
    return ask.hits;
  }

  const reqs = [];
  const resp = [];

  for (let j = 0; j < notfound.length; j += 50) {

    // next slice to query
    const slice = notfound.slice(j, j + 50);

    // format parameter for request
    const pageids = slice.join( '|' );

    // trigger request
    reqs.push(getWikidataID(pageids, apiurl));
    //reqs.push(requestWikip(pageids, apiurl));

  }

  let res = await Promise.all(reqs);

  res.forEach(item => {
    Object.keys(item).forEach(key => {
      if( item[key]?.pageprops?.wikibase_item != undefined){
        resp.push({pageid: key, result:item[key].pageprops.wikibase_item})
      }
      else{
        resp.push({pageid: key, result:''})
      }
    });
  });

  cacheWikipIDs.setValues(resp, lang );

  return [...ask.hits, ...resp];

}
