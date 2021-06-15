/**
 * determine the (sub-)categories a particular instance appears in
 * in particular, we need to know which subcategory caused the instance to be included
 * REMARK : readline not able to parse long strings (not able to catch error to skip those entries)
 */

import Fs         from 'fs';
import Path       from 'path';
import Readline   from 'readline';
import Config     from './../config/config' ;


// general configuration
const cfg = {

  // source file
  source: Config.rawData,

};

// parse command line arguments
if( process.argv.length < 4 ) {
  console.error( `Usage: npm debug:instance2cat [instance] [category1] [category2] ...\nfound only ${process.argv.length-2} argument(s); need at least two` );
  process.exit();
}
const instance = process.argv[ 2 ];
const categories = new Set( process.argv.slice( 3 ) );
const entityRegexp = /^Q\d+$/;
if( !entityRegexp.test(instance) ) {
  console.error( `Instance must be of form Qxx - found ${instance}` );
  process.exit();
}
for( const cat of categories ) {
  if( !entityRegexp.test(cat) ) {
    console.error( `Categories must be of form Qxx - found ${cat}` );
    process.exit();
  }
}


(async function(){

  // read-interface to the source file
  const rl = Readline.createInterface({
    input: Fs.createReadStream( cfg.source ),
  });

  // walk through the file line by line
  let entry;
  const out = [];           // collect the output, so we can add some stuff later on
  let label = '[unknown]';  // label of the instance we are looking for; only available within the data
  for await (const line of rl) {

    // parse the line
    try {
      entry = JSON.parse( line.slice( 0, -1) );
    } catch(e) {
      // skip partial entries
      // e.g., first line with just an [
      continue;
    }

    // skip everything that's not our target categories
    if( !categories.has( entry.queryID ) ){
      continue;
    }
    categories.delete( entry.queryID );
    out.push( `Category (${entry.queryID}): ${entry.query}` );

    // shortcut
    const relResults = entry?.relevant?.wikipedia;
    if( relResults === null ) {
      continue;
    }

    for( const type of ['targetType', 'noType', 'noTargetType', 'noWikidataID' ] ) {
      for( const resultSet of relResults ) {

        // check, if our instance is included here
        const match = resultSet[ type ]?.find( (el) => el.iri == instance );
        if( !match ) {
          continue;
        }

        // memorize the instance label
        label = match.iriLabel;

        // print all sources
        out.push( `  matches in ${type}` );
        for( const sourceCat of match.source ) {
          out.push(  `    * (${sourceCat.lang}) ${sourceCat.cat}` );
          out.push(  `      https://${sourceCat.lang}.wikipedia.org/wiki/${encodeURIComponent(sourceCat.cat)}` );
        }

      }
    }

    // we can stop once all categories have been found
    if( categories.size < 1 ) {
      break;
    }

  }

  // print
  console.log( `Looking for (${instance}): ${label}\n` );
  console.log( out.join( '\n' ) );

})().catch( (e) => console.error(e) );
