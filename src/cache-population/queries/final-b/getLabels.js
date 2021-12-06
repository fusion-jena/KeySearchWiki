import Config from '../../../config/config';
import Cache from '../../../util/cache';

import Fs from 'fs';
import Path from 'path';
import Readline from 'readline';

/**
 * collect the information from final-a into the final cache file
 *
 * separated to limit cache accesses (gets really slow otherwise)
 */
export default async function getLabels() {

  // size of chunks to insert at the same time
  const CHUNK_SIZE = 1000;

  // insert chunk-wise
  const stream = Fs.createReadStream( Path.join( Config.cachePath, 'getLabels.tmp.tsv' ) ),
        reader = Readline.createInterface( stream );
  const cache = new Cache( 'labels', 'iri' );
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
