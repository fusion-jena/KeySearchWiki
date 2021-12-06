import Cache                 from './../cache' ;
import getCatMembers         from './getCatMembers' ;
//import {logWikipediaHit}     from './../logger';

/**
 * run query to get wikipedia page members / handel cache misses/hits
 * @param     {String}            lang              language
 * @param     {String}            catTitle          title of initial category
 * @param     {String}            apiurl            apiurl for current language
 * @param     {String}            memberType        page / subcat or 'page|subcat' for both
 * @param     {Array}             categoryMembers   holder for category members
 * @returns   {(Promise|Array)}   returns promise if we issue query to endpoint or direct array of result if data in cache
 */

//init cache
let cacheWikipMembers = new Cache('wikipedia_page_members', 'catTitle') ;

export default async function runRequestCatMembers(lang, catTitle, apiurl, memberType, categoryMembers){

  // hit cache
  let ask = cacheWikipMembers.getValues([catTitle], lang);

  //check if hit
  //if(ask.hits.length > 0){
  //console.log('hit: '+ cache._name);
  //logWikipediaHit.info('hit: '+ cacheWikipMembers._name );
  //}
  //**

  if(ask.misses.length == 0){
    return ask.hits[0] ;
  }

  let result = await getCatMembers(lang, catTitle, apiurl, memberType, categoryMembers);

  if(result == 'invalidcategory'){
    console.log('  |  invalidcategory');
    let res = {catTitle: catTitle , result: []};
    cacheWikipMembers.setValues([res], lang);
    return res;
  }

  result.result.forEach(item => {
    if(item.ns != 14){
      delete item.title;
    }
  });

  cacheWikipMembers.setValues([result], lang);
  return result;

}
