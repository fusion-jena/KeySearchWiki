import 'cross-fetch/polyfill';

/**
 * check if a link is accessible
 *
 * @param {String}  link    link to check
 *
 */

export default async function urlAccessCheck(link){
  let resp ;
  try{
    resp =  await fetch(link, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'kwsearch-goldstandard-generation-wikidata/1.0.2'
      }
    });
  }
  catch(e){
    if(e.code == 'ENOTFOUND'){
      //console.log(e.code);
      return 'ENOTFOUND';
    }
  }

  //console.log(resp.status);

  if((resp.status == 429) || (resp.status >= 500)){
    //wait for 60 seconds (wikipedia allows 3 succesive dump downloads and after that one should wait at least 60 seconds)
    // with GET there is this limit , but switching to HEAD method does not seem to have limits
    //console.log(link);
    await new Promise(resolve => setTimeout(resolve,  60* 1000));
    return await urlAccessCheck(link);
  }
  return resp;
}
