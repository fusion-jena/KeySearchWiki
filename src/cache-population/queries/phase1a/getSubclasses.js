import Config from '../../../config/config';
import Cache from '../../../util/cache';

import Fs from 'fs';
import Path from 'path';
import Readline from 'readline';

/**
 * collect the information from phase1/getSubclasses into the final cache file
 * maps from a given target class to all its subclasses
 */
export default async function getSubclasses() {

  // build hierarchy of classes
  const stream = Fs.createReadStream( Path.join( Config.cachePath, 'getSubclasses.tmp.tsv' ) ),
        reader = Readline.createInterface( stream );
  const hierarchy = {};
  for await (const line of reader ) {
    const [ klass, parent ] = line.split('\t');
    if( !(parent in hierarchy) ) {
      hierarchy[ parent ] = [];
    }
    hierarchy[ parent ].push( klass );
  }

  // determine all target's
  const setCatCache = new Cache( 'Categories', 'setCat' );
  const targets = new Set();
  for( const entry of setCatCache.getAll() ) {
    for( const val of entry.result ) {
      if( 'contains' in val ){
        targets.add( val.contains );
      }
    }
  }


  // add media "Wikimedia internal item (Q17442446)" as target , would be needed by type check to exclude URIs that are descendants of "Wikimedia internal item (Q17442446)"
  targets.add('Q17442446');

  // collect all subclasses per target into cache
  const entries = [];
  for( const target of targets ) {

    // collect all subclasses
    const subclasses = [];

    // traverse the hierarchy
    const seen = new Set( [target] ); // account for possible cycles
    const backlog = [ target ];
    while( backlog.length > 0 ) {

      const item = backlog.pop();
      subclasses.push( item );

      if( item in hierarchy ) {
        for( const child of hierarchy[item] ) {
          if( !seen.has( child ) ) {
            backlog.push( child );
            seen.add( child );
          }
        }
      }

    }

    // assemble entry
    entries.push({
      target,
      result: subclasses.map( (s) => ({sub: s}) ),
    });

  }


  // write to cache
  const cache = new Cache('subclasses', 'target') ;
  cache.setValues( Object.values( entries ) );

}
