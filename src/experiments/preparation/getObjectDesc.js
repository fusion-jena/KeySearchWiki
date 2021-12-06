/**
 * for each object in entities triples, get its description from wikidata json dump
 *
 *
 */

import localConfig  from './../config';

const { performance } = require('perf_hooks');

import Fs from 'fs';
import Readline from 'readline';
import Zlib from 'zlib';
import { experPrep as Log } from './../../util/logger';

export default async function getObjectDesc(){

  Log.info('Gather objects ... ');

  const t0 = performance.now();
  // read-interface to the source file
  const rl = Readline.createInterface({
    input: Fs.createReadStream( localConfig.wiki_targets ),
  });

  // set of objects
  let objectSet = new Set();
  let targetEntryCount = 0;

  for await (const line of rl) {

    targetEntryCount ++ ;

    let entry = JSON.parse(line);

if(Object.keys(entry.claims).length != 0){
    Object.values(entry.claims).forEach(val => {
      val.forEach(object => {
        if(object.type == 'wikibase-item'){
          objectSet.add(object.value);
        }
      });
    });
  }
}

  Log.info(`${objectSet.size} objects retrieved`);
  Log.info(`${targetEntryCount} target entries visited`);

  rl.close();

  const t1 = performance.now();

  Log.info('Get object decription/label ... ');

  //where to write output needed info
  let entitiesFile = Fs.createWriteStream(localConfig.object_desc, {flags: 'a'});

  // open stream to the dump
  let stream = Fs.createReadStream(localConfig.wiki_dump_json).pipe( Zlib.createGunzip() );
  let reader = Readline.createInterface( stream );

  // process line by line
  let lineCounter = -1;
  // some counters
  let acceptedEntries = 0;

  for await (const line of reader ) {

    if(objectSet.size == 0){
      Log.info('no more entities');
      break ;
    }

    // adjust, so we can read line by line JSON
    lineCounter += 1;
    if( [ '[', ']' ].includes( line[0] ) ) {
      continue;
    }

    // log progress
    if( lineCounter % localConfig.logInterval == 0 ) {
      Log.info( `processed ${lineCounter} lines` );
    }

    // parse the object
    const entry = line.endsWith(',')
      ? JSON.parse( line.slice(0, -1) )   // chop off last character, which should be a comma
      : JSON.parse( line );               // last (data) line does not have a comma


    if(!objectSet.has(entry.id)){
      continue;
    }

    objectSet.delete(entry.id);

    //take only entities having english description or label
    let enDesc = entry?.descriptions?.en?.value ;
    let enLabel = entry?.labels?.en?.value ;
    let enTrue = (entry?.descriptions?.en?.value != undefined || entry?.labels?.en?.value != undefined)

    if(!enTrue){
      continue ;
    }

    acceptedEntries ++ ;

    let newEntry = {id: entry.id};
    if(enDesc != undefined){newEntry['description'] = enDesc} else {newEntry['description'] = ""};
    if(enLabel != undefined){newEntry['label'] = enLabel} else {newEntry['label'] = ""};

    entitiesFile.write(JSON.stringify(newEntry));
    entitiesFile.write('\r\n');

  }

  const t2 = performance.now();

  Log.info(`
  time (gather objects from targets dump): ${(t1 - t0) / 1000} s
  time (get descriptions from full dump): ${(t2 - t1) / 1000} s
  `);

  Log.info('# object with english desc or label: ' + acceptedEntries );

}
