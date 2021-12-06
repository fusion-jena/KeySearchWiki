import Config from '../../../config/config';
import Cache from '../../../util/cache';
import { cachePopLog as Log } from '../../../util/logger';

import Fs from 'fs';
import Path from 'path';
import Readline from 'readline';

/**
 * create a (temporary) cache file to map from entities to target classes
 * entities will be omitted, if they are no instance of any subclass of any target
 */
export default async function getMemberTargets() {

  // build a lookup for targets and their subclasses
  const targetCache = new Cache('subclasses', 'target') ;
  const targetLookup = {};
  for( const target of targetCache.getAll() ) {
    for( const el of target.result ) {
      if( !(el.sub in targetLookup) ) {
        targetLookup[ el.sub ] = [];
      }
      targetLookup[ el.sub ].push( target.target );
    }
  }

  // size of chunks to insert at the same time
  const CHUNK_SIZE = 1000;

  // process all entities and memorize their corresponding targets
  const stream = Fs.createReadStream( Path.join( Config.cachePath, 'getDirectTypes.tmp.tsv' ) ),
        reader = Readline.createInterface( stream ),
        cache = new Cache( 'memberTargets', 'e' );
  const chunk = [];
  let total = 0,
      discarded = 0;
  for await (const line of reader ) {

    const item = JSON.parse( line );

    // collect targets for this entity
    const targets = [];
    for( const klass of item.result ) {
      if( klass in targetLookup ) {
        targets.push( ... targetLookup[ klass ] );
      }
    }

    // only add entities belonging to some target
    total += 1;
    if( targets.length > 0 ) {
      chunk.push({ e: item.page, result: targets });
    } else {
      discarded += 1;
    }

    // persist in cache?
    if( chunk.length > CHUNK_SIZE ) {
      cache.setValues( chunk );
      chunk.length = 0;
    }

  }

  // insert remaining entries
  if( chunk.length > 0 ) {
    cache.setValues( chunk );
  }

  Log.info( `getMemberTargets: ${total} entities | ${discarded} discarded | ${total-discarded} added to cache` );

}
