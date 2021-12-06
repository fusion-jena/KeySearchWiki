import Config from '../../../config/config';
import Cache from '../../../util/cache';

import Fs from 'fs';
import Path from 'path';
import Readline from 'readline';

/**
 * collect the information from phase3/getTypes into the final cache file
 * maps from a given entities to all its direct classes
 * separated to limit cache accesses (gets really slow otherwise)
 */
export default async function getEntitiesByTarget() {

  // size of chunks to insert at the same time
  const CHUNK_SIZE = 1000;

  // insert chunk-wise
  const stream = Fs.createReadStream( Path.join( Config.cachePath, 'getTypes.tmp.tsv' ) ),
        reader = Readline.createInterface( stream );
  const cache = new Cache( 'types', 'page' );
  const chunk = [];
  for await (const line of reader ) {

    // add to current chunk
    chunk.push( JSON.parse( line ) );

    // persist in cache?
    if( chunk.length > CHUNK_SIZE ) {
      cache.setValues( chunk );
      chunk.length = 0;
    }
  }

  // insert all remaining entries
  cache.setValues( chunk );

}
