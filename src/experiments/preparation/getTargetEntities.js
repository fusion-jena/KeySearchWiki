import localConfig        from './../config';
import mkdirp             from 'mkdirp';
import Cache              from './../../util/cache';
import { experPrep as Log } from './../../util/logger';
import Fs from 'fs';
import Readline from 'readline';
import Zlib from 'zlib';

const { performance } = require('perf_hooks');

/**
 * for entities of target/target in subclass hierarchy (from memberTargets cache), get id, label, description and all claims (top-10 targets)
 *
 *
 */

export default async function getTargetEntities(){

  // show logging on console as well
  Log.addStream({
    name: 'Console',
    stream: process.stderr,
    level: 'debug',
  });

  Log.info('Get target entities ... ');

  const t0 = performance.now();

  //where to write output needed info
  let entitiesFile = Fs.createWriteStream(localConfig.wiki_targets, {flags: 'a'});

  //get list of entities
  const cache = new Cache( 'memberTargets', 'e' );
  let resp = cache.getIterator();

  let entities = new Set();

  for (const item of resp) {
    let result = JSON.parse(item.resultString);
    // if not wikimedia item and target
    if(!result.some(elem => elem == 'Q17442446') && result.some(r => localConfig.targets.includes(r))){
      entities.add(item.e);
    }
  }

  Log.info(`${entities.size} retrieved`);

  const t01 = performance.now();

  Log.info(`
  time get target entities: ${(t01 - t0) / 1000} s
  `);

  // open stream to the dump
  let stream = Fs.createReadStream(localConfig.wiki_dump_json).pipe( Zlib.createGunzip() );
  let reader = Readline.createInterface( stream );

  // process line by line
  let lineCounter = -1;
  // some counters
  let acceptedEntries = 0;
  for await (const line of reader ) {

    if(entities.size == 0){
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

    if(!entities.has(entry.id)){
      continue;
    }

    entities.delete(entry.id);

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


    let claim = {};
    // accepted types for property value
    let acceptedTypes = new Set(['wikibase-entityid', 'quantity', 'time', 'string']);

  if(entry?.claims != undefined){

    Object.keys(entry.claims).forEach(prop => {
      let propArray = [];
      entry.claims[prop].forEach(object => {
        let type = object?.mainsnak?.datatype;
        let value = object?.mainsnak?.datavalue?.value;
        if(type != undefined && value != undefined){
          let valueType = object?.mainsnak?.datavalue?.type;
          if (acceptedTypes.has(valueType)){
            let valueID ;
            if(valueType == 'wikibase-entityid'){valueID = value.id};
            if(valueType == 'quantity'){valueID = value.amount};
            if(valueType == 'time'){valueID = value.time};
            if(valueType == 'string'){valueID = value};
            propArray.push({value: valueID , type: type});
          }
        }
      });

      if(propArray.length != 0){
        claim[prop] = propArray;
      }


    });

    newEntry['claims'] = claim;

  }
  else{
    newEntry['claims'] = claim;
  }


    entitiesFile.write(JSON.stringify(newEntry));
    entitiesFile.write('\r\n');

  }

  const t1 = performance.now();
  Log.info(`
  time get target entities: ${(t01 - t0) / 1000} s
  time get dump subset : ${(t1 - t0) / 1000} s
  total entities (english desc and label and of target) : ${acceptedEntries}

  `);

}
