import Cache         from './../util/cache' ;
import runRequest    from './../util/wikidata/runRequest' ;

/**
 * get category members from DBpedia running a federated sparql query over wikidata
 *
 *
 */

//init cache
let cacheDBpediaMembers = new Cache('cat_dbpedia_members', 'catIRI') ;
export default async function getCatMembersDBpedia(values, request) {

  let variable = 'catIRI';

  function getQueryString(iris){return `
    PREFIX dbc: <http://dbpedia.org/resource/Category:>
    PREFIX dct: <http://purl.org/dc/terms/>
    SELECT ?catIRI ?item ?itemLabel WHERE {
      SERVICE <http://dbpedia.org/sparql> {
         VALUES ?catIRI {${iris}}
         OPTIONAL{
         ?dbpediaCat owl:sameAs ?catIRI .
         ?dbpediaEntity dct:subject ?dbpediaCat .
         ?dbpediaEntity owl:sameAs ?item .
         FILTER (STRSTARTS(STR(?item), "http://www.wikidata.org"))
       }
    }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  }
    `;
  }


  let result = await runRequest(request, cacheDBpediaMembers, variable , values , getQueryString) ;

  return result ;
}
