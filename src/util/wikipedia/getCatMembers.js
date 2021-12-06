import Config                        from './../../config/config';
import {logNetworkError}             from './../logger';


/**
 * given a category title get its members
 * @todo : retrieve together with wikidata ids using generator parameter , avoid asking two times : https://www.mediawiki.org/wiki/API:Query#Generators
 *        would imply also change of cache , either fill from scratch or fill from wikidata ids cache
 * @param     {String}            lang              language
 * @param     {String}            catTitle          title of initial category
 * @param     {String}            apiurl            apiurl for current language
 * @param     {String}            memberType        page / subcat or 'page|subcat' for both
 * @param     {Array}             categoryMembers   holder for category members
 * @param     {Number}            leftRetries       number of times to retry after facing a network error
 * @returns   {Promise}
 */
export default async function getCatMembers(lang , catTitle, apiurl, memberType, categoryMembers , leftRetries = Config.maxRetries,  continueParm) {

  if(leftRetries <= 0){
    throw 'limit # of query retries reached ! ' ;
    return ;
  }

  let paramsCatMemb = {
    action: 'query',
    list: 'categorymembers',
    cmtitle: encodeURIComponent(catTitle),
    cmtype: encodeURIComponent(memberType) ,
    cmlimit: '500',
    format: 'json',
    utf8: 'true'
  };

  if(continueParm !== undefined){
    paramsCatMemb['cmcontinue'] = continueParm ;
  }

  let url = apiurl + '?origin=*';
  Object.keys(paramsCatMemb).forEach(function(key){url += '&' + key + '=' + paramsCatMemb[key];});

  let responseMembers ;

  try {
    responseMembers = await fetch(url,{
      method: 'POST',
      headers: {
        'User-Agent': 'kwsearch-goldstandard-generation-wikidata/1.0.0'
      }
    });
  }
  catch(e) {
    //if some network failure occurs, retry
    if(e.code == 'ECONNREFUSED' || e.code == 'ECONNRESET' || e.code == 'ETIMEDOUT' || e.code == 'EAI_AGAIN' || e.code == 'EHOSTUNREACH'){
    //write error in log together with query
      logNetworkError.error({errorCode: `${e.code}`, errorMessage: `${e.message}`, function: 'getCatMembers' , category: `${catTitle}`, request: `${url}` , leftRetries: `${leftRetries}`});
      // reduce the load by delaying the execution
      await new Promise(resolve => setTimeout(resolve, Config.defaultDelay*1000));
      //retry ;
      return await getCatMembers(lang , catTitle, apiurl, memberType, categoryMembers ,  leftRetries - 1 , continueParm );
    }
    else {
      console.log(e);
      return ;
    }
  }

  // if error retry
  if(responseMembers.status != 200){

    //write error in log together with query
    logNetworkError.error({status: `${responseMembers.status}`, statusText: `${responseMembers.statusText}`, category: `${catTitle}`, function: 'getCatMembers' , request: `${url}` , leftRetries: `${leftRetries}`});

    if((responseMembers.status == 429) || (responseMembers.status >= 500)){
      // get delay
      let delay ;
      if(responseMembers.headers.hasOwnProperty('Retry-After')){
        delay = responseMembers.headers['Retry-After'];
      }
      else{
        delay = Config.defaultDelay ;
      }

      // reduce the load by delaying the execution
      await new Promise(resolve => setTimeout(resolve, delay*1000));

      //retry ;
      return await getCatMembers(lang , catTitle, apiurl, memberType, categoryMembers ,  leftRetries - 1 , continueParm );
    }

    else{
      console.log(responseMembers.status);
      return;
    }
  }

  let jsonMembers = await responseMembers.json();

  //faced case where one category from wikidata wikipedia link list , is written in a slightly different way
  // but has same meaning (url = https://si.wikipedia.org/w/api.php, from wikidata link = ප්රවර්ගය:ජීවමාන ජනය , in wikipedia page title : ප්‍රවර්ගය:ජීවමාන ජනයා)
  // so i get a a invalidcategory error in json from api

  if(jsonMembers.hasOwnProperty('error')){
    if(jsonMembers.error.code == 'invalidcategory'){
      return 'invalidcategory' ;
    }
  }

  categoryMembers = [... categoryMembers, ...jsonMembers.query.categorymembers] ;

  if(jsonMembers.hasOwnProperty('continue')){
    let cmcontinue = jsonMembers.continue.cmcontinue ;
    return await getCatMembers(lang , catTitle, apiurl, memberType, categoryMembers, leftRetries = Config.maxRetries , cmcontinue);
  }

  // to use catTitle as identifier we need to make it unique , in general it is unique to the category , but in the case of same language ,
  //but another variant (en-simple and english) if it happens that en is in cache before running en-simple it will automatically take it from cache but in fact it should return the fact that there is no api lin for en-simple

  return {catTitle: catTitle, result: categoryMembers} ;

}
