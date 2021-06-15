import Cache         from './../util/cache' ;
import runRequest    from './../util/wikidata/runRequest' ;
/**
 * get keyword types
 * @param     {Array}             values    list of (keyword) iris
 * @param     {Function}          request   function to issue (sparql) queries
 * @returns   {(Promise|Array)}   returns promise if we issue query to endpoint or direct array of result if data in cache
 */

//init cache
let cacheKeywordTypes = new Cache('keyword_types', 'iri') ;

export default async function getKeywordType(values , request) {

  let variable = 'iri' ;

  function getQueryString(iris){   return `
    SELECT ?iri ?iriLabel ?type ?typeLabel
     WHERE
     {
       VALUES ?iri {${iris}}
       OPTIONAL{?iri wdt:P31 ?type .}
       SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
       }
    `;
  }

  let result = await runRequest(request, cacheKeywordTypes, variable , values , getQueryString) ;
  return result ;

}
