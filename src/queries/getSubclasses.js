import Cache         from './../util/cache' ;
import runRequest    from './../util/wikidata/runRequest' ;

/**
 * get for a specific target its direct and indirect subclasses
 *
 * @param     {Array}             target    iri of target in array
 * @param     {Function}          request   function to issue (sparql) queries
 * @returns   {(Promise|Array)}   returns promise if we issue query to endpoint or direct array of result if data in cache
 */

//init cache
let cacheSubclasses = new Cache('subclasses', 'target') ;

export default async function getSubclasses(target , request) {
  let variable = 'target' ;

  function getQueryString(iris){ return `
      SELECT ?target ?sub WHERE {
        VALUES ?target {${iris}}
        OPTIONAL {?sub wdt:P279* ?target .} .
      }
      `;
  }

  let result = await runRequest(request, cacheSubclasses, variable , target , getQueryString) ;
  return result ;

}
