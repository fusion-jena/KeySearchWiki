import Cache         from './../util/cache' ;
import runRequest    from './../util/wikidata/runRequest' ;
/**
 * get value and qualifiers of the category contains property
 * @param     {Array}             values    list of categories|lists
 * @param     {Function}          request   function to issue (sparql) queries
 * @param     {String}            source    list or set-category
 * @returns   {(Promise|Array)}   returns promise if we issue query to endpoint or direct array of result if data in cache
 */

//init cache
let cacheQualifiers = new Cache('qualifiers', 'iri') ;

export default async function getQualifiers(values , request , source) {

  let variable = 'iri' ;

  let p , ps ;
  if(source == 'list'){
    p = 'p:P360' ;
    ps = 'ps:P360';
  }
  if(source == 'set-category'){
    p = 'p:P4224';
    ps = 'ps:P4224';
  }

  function getQueryString(iris) {return `
    SELECT ?iri ?target ?keywordIRI ?isiri
      WHERE
      {
        VALUES ?iri {${iris}}
        ?iri ${p} ?statement.
        ?statement ${ps} ?target.
        OPTIONAL {
          ?statement ?pq ?keywordIRI.
          FILTER(REGEX(STR(?pq), "http://www.wikidata.org/prop/qualifier/P")) .
          BIND(isIRI(?keywordIRI) as ?isiri) .
        }
      }
    `;
  }

  let result = await runRequest(request, cacheQualifiers, variable , values , getQueryString) ;
  return result ;
}
