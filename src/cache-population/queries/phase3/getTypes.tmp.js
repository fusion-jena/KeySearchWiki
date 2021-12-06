import Cache from '../../../util/cache';
import { logPipelineProgress as Log } from '../../../util/logger';
import Config from '../../../config/config';
import { getObjectValues } from '../../util';

import Glob from 'glob-promise';

import Fs from 'fs';
import Path from 'path';
import Util from 'util';

// list of entities we will monitor in the dump
const monitoredEntities = new Set();

// set up temp file
const tempFilePath = Path.join( Config.cachePath, 'getTypes.tmp.tsv' );
const tempFile = Fs.createWriteStream( tempFilePath, {});
const appendTemp = Util.promisify( tempFile.write ).bind( tempFile );

export default async function getTypes( entry ){

  // initialize
  if( monitoredEntities.size < 1 ) {
    await init();
  }


  // store direct classes for all monitored entities
  if( monitoredEntities.has( entry.id ) ) {
    const classes = getObjectValues( entry, 'P31' );
    if( classes ){
      appendTemp(JSON.stringify({ page: entry.id, result: classes.map((c) => ({type: c}) ) }) );
      appendTemp('\n');
    }
    else{
      appendTemp(JSON.stringify({ page: entry.id, result: [{}] }) );
      appendTemp('\n');
    }
  }

}


/**
 * initially load the list of monitored entities
 */
async function init(){


  Log.info( 'getTypes: initializing monitored entities' );

  // cache proxy
  const cache = new Cache( 'wikipedia_page_wikidataID', 'pageid' );

  // traverse all mappings between pageIDs and Wikidata IDs
  // this should be all the entities we can encounter
  for( const file of await Glob( '*.db', { cwd: Path.join( Config.cachePath, 'wikipedia_page_wikidataID' ) } ) ) {

    // add all referred Wikidata IDs
    for( const entry of cache.getAll( file.slice(0, -3) ) ) {
      monitoredEntities.add( entry.result );
    }

  }

  Log.info( `getTypes: monitoring ${monitoredEntities.size} entities` );

}
