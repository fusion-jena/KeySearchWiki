import Cache from '../../../util/cache';
import { getCombinations, getDataValues, getObjectValues } from '../../util';

// setup cache
const cache = new Cache( 'Categories', 'setCat' );

export default function getSetCategories( entry ) {

  // e.g., Q59542487 ... "Wikimedia set category"
  if( !entry._isSetCat ) {
    return;
  }

  // get associated values
  const sparql    = getDataValues( entry, 'P3921' ),
        contains  = getObjectValues( entry, 'P4224' ),
        list      = getObjectValues( entry, 'P1753' );

  // check, whether we can use this SPARQL-query
  const useSparql = sparql &&
    // filter sparql queries that deal with literals
    !sparql[0].includes( 'FILTER' ) &&
    // some queries (5) contain union (e.g., multiple targets)
    !sparql[0].includes( 'UNION' ) &&
    // in some queries there is no instance of relation (e.g., Q15337205) (cannot determine target from query)
    sparql[0].includes( 'wdt:P31' ) &&
    // we search for entities instance of target (exclude entities wdt:P31/wdt:P279* target)
    !sparql[0].includes( 'wdt:P31/wdt:P279' );

  // create entries for persisting
  const res = [];
  for( const [ pContains, pList ] of getCombinations([ contains, list ])) {
    res.push({
      sparql:   useSparql ? sparql[0] : undefined,
      contains: pContains,
      list:     pList
    });
  }

  // persist
  cache.setValues([{ setCat: entry.id, result: res }]);

}
