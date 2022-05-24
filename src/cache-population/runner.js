import CacheConfig from './config';
import Config from './../config/config';
import { cachePopLog as Log } from './../util/logger';
import { isInstanceOf } from './util';
import groupByLang from './queries/phase2/groupByLang';
import getCatsTarget from './queries/phase2/getCatsTarget';
import download from './queries/phase2/download';
import populateCaches from './queries/phase2/populateCaches';

import Glob from 'glob-promise';

import Fs from 'fs';
import Path from 'path';
import Readline from 'readline';
import Zlib from 'zlib';


(async function(){

  // show logging on console as well
  Log.addStream({
    name: 'Console',
    stream: process.stderr,
    level: 'debug',
  });

  let queries = [], stream, reader, lineCounter;

  /* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX First Phase XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

     Log.info( '---------------- Phase 1 (Wikidata) ----------------' );

  // collect query modules
  queries.length = 0;
  for( const file of await Glob( '*.js', { cwd: Path.join( __dirname, 'queries', 'phase1' )} ) ) {
    const module = await import( Path.join( __dirname, 'queries', 'phase1', file ) );
    queries.push( module.default );
    Log.info( `loaded query: ${file}` );
  }

  // open stream to the dump
  stream = Fs.createReadStream( CacheConfig.wdDump ).pipe( Zlib.createGunzip() );
  reader = Readline.createInterface( stream );

  // process line by line
  lineCounter = -1;
  for await (const line of reader ) {

    // adjust, so we can read line by line JSON
    lineCounter += 1;
    if( [ '[', ']' ].includes( line[0] ) ) {
      continue;
    }

    // log progress
    if( lineCounter % CacheConfig.logInterval == 0 ) {
      Log.info( `processed ${lineCounter} lines` );
    }

    // parse the object
    const entry = line.endsWith(',')
      ? JSON.parse( line.slice(0, -1) )   // chop off last character, which should be a comma
      : JSON.parse( line );               // last (data) line does not have a comma

    // augment with common data
    entry._isSetCat = isInstanceOf( entry, Config.categoryIRI );

    // pass through all queries
    await Promise.all( queries.map( (q) => q( entry ) ) );

  }

    Log.info( '---------------- Phase 1a (Wikidata) ----------------' );

  // collect query modules
  queries.length = 0;
  for( const file of await Glob( '*.js', { cwd: Path.join( __dirname, 'queries', 'phase1a' )} ) ) {
    const module = await import( Path.join( __dirname, 'queries', 'phase1a', file ) );
    queries.push( module.default );
    Log.info( `loaded query: ${file}` );
  }

  // pass through all queries
  await Promise.all( queries.map( (q) => q() ) );

  Log.info( '---------------- Phase 1b (Wikidata) ----------------' );

  // collect query modules
  queries.length = 0;
  for( const file of await Glob( '*.js', { cwd: Path.join( __dirname, 'queries', 'phase1b' )} ) ) {
    const module = await import( Path.join( __dirname, 'queries', 'phase1b', file ) );
    queries.push( module.default );
    Log.info( `loaded query: ${file}` );
  }

  // pass through all queries
  await Promise.all( queries.map( (q) => q() ) );

  /* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Second Phase XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

  Log.info( '---------------- Phase 2 (Wikipedia download) ----------------' );

  // return list of categories together with their corresponding target
  let catToTarget = getCatsTarget();

  // group initial categories by language lang: [cat1, cat2, ...]
  let grouped = await groupByLang(catToTarget.exclude , catToTarget.catToTarget);

  //download wikipedia dump tables for all languages
  await download(grouped.langList.both);


  Log.info( '---------------- Phase 2 (Wikipedia cache population) ----------------' );

  let grouped = JSON.parse(Fs.readFileSync(CacheConfig.catGroupedBylang));

  //just temporary to avoid importing english language (put it in the beginning of grouped object)
  /*let temp = grouped['en'];
  delete grouped.en;
  let newgrouped = Object.assign({en: temp}, grouped);*/

  await populateCaches(grouped);


  /* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Third Phase XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

    Log.info( '---------------- Phase 3 (Wikidata) ----------------' );

  // collect query modules
  queries.length = 0;
  for( const file of await Glob( '*.js', { cwd: Path.join( __dirname, 'queries', 'phase3' )} ) ) {
    const module = await import( Path.join( __dirname, 'queries', 'phase3', file ) );
    queries.push( module.default );
    Log.info( `loaded query: ${file}` );
  }

  // open stream to the dump
  stream = Fs.createReadStream( CacheConfig.wdDump ).pipe( Zlib.createGunzip() );
  reader = Readline.createInterface( stream );

  // process line by line
  lineCounter = -1;
  for await (const line of reader ) {

    // adjust, so we can read line by line JSON
    lineCounter += 1;
    if( [ '[', ']' ].includes( line[0] ) ) {
      continue;
    }

    // log progress
    if( lineCounter % CacheConfig.logInterval == 0 ) {
      Log.info( `processed ${lineCounter} lines` );
    }

    // parse the object
    const entry = line.endsWith(',')
      ? JSON.parse( line.slice(0, -1) )   // chop off last character, which should be a comma
      : JSON.parse( line );               // last (data) line does not have a comma

    // pass through all queries
    await Promise.all( queries.map( (q) => q( entry ) ) );

  }


  /* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Fourth Phase XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

  Log.info( '---------------- Phase 4 (Wikidata) ----------------' );

  // collect query modules
  queries.length = 0;
  for( const file of await Glob( '*.js', { cwd: Path.join( __dirname, 'queries', 'phase4' )} ) ) {
    const module = await import( Path.join( __dirname, 'queries', 'phase4', file ) );
    queries.push( module.default );
    Log.info( `loaded query: ${file}` );
  }

  // pass through all queries
  await Promise.all( queries.map( (q) => q() ) );

  /* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Final Phase a XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
  Log.info( '---------------- Final phase - a (Wikidata)  ----------------' );

    // collect query modules
    queries.length = 0;

    for( const file of await Glob( '*.js', { cwd: Path.join( __dirname, 'queries', 'final-a' )} ) ) {
      const module = await import( Path.join( __dirname, 'queries', 'final-a', file ) );
      queries.push( module.default );
      Log.info( `loaded query: ${file}` );
    }

    // open stream to the dump
    stream = Fs.createReadStream( CacheConfig.wdDump ).pipe( Zlib.createGunzip() );
    reader = Readline.createInterface( stream );

    // process line by line
    lineCounter = -1;
    for await (const line of reader ) {

      // adjust, so we can read line by line JSON
      lineCounter += 1;
      if( [ '[', ']' ].includes( line[0] ) ) {
        continue;
      }

      // log progress
      if( lineCounter % CacheConfig.logInterval == 0 ) {
        Log.info( `processed ${lineCounter} lines` );
      }

      // parse the object
      const entry = line.endsWith(',')
        ? JSON.parse( line.slice(0, -1) )   // chop off last character, which should be a comma
        : JSON.parse( line );               // last (data) line does not have a comma

      // pass through all queries
      await Promise.all( queries.map( (q) => q( entry ) ) );

    }

    /* XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX Final Phase b XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

    Log.info( '---------------- Final phase - b (Wikidata)----------------' );

    // collect query modules
    queries.length = 0;
    for( const file of await Glob( '*.js', { cwd: Path.join( __dirname, 'queries', 'final-b' )} ) ) {
      const module = await import( Path.join( __dirname, 'queries', 'final-b', file ) );
      queries.push( module.default );
      Log.info( `loaded query: ${file}` );
    }

    // pass through all queries
    await Promise.all( queries.map( (q) => q() ) );

})().catch( (e) => console.error(e) );
