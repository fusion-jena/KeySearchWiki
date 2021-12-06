import Config from '../../../config/config';
import Cache from '../../../util/cache';

import Fs from 'fs';
import Path from 'path';
import Readline from 'readline';

/**
 * collect the information from phase2/getSparql into the final cache file
 */
export default async function getEntitiesByTarget() {

  // collect entity lists
  const stream = Fs.createReadStream( Path.join( Config.cachePath, 'sparqlResults.tmp.tsv' ) ),
        reader = Readline.createInterface( stream );
  const result = {};
  for await (const line of reader ) {

    const [ queryKey, entity ] = line.split( '\t' );

    if( !(queryKey in result ) ) {
      result[ queryKey ] = {
        query: queryKey,
        result: [],
      };
    }
    result[ queryKey ].result.push({ item: entity });

  }

  // make sure all sparql queries are represented
  // might make some queries with actual results appear empty,
  // as we can not handle them in /phase3/getSparql.tmp.js
  const setCatCache = new Cache( 'Categories', 'setCat' );
  for( const row of setCatCache.getAll() ) {
    for( const entry of row.result ) {
      if( 'sparql' in entry ) {

        // create a key for the sparql query
        const key = entry.sparql.replace(/[^A-Z0-9]/ig, '');

        // make sure it's present in the result
        if( !(key in result ) ) {
          result[key] = {
            query: key,
            result: [{}],
          };
        }

      }
    }
  }

  // write to cache
  const cache = new Cache('sparql_results', 'query') ;
  cache.setValues( Object.values( result ) );

}
