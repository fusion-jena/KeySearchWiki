import Cache from '../../../util/cache';
import Config from '../../../config/config';
import Glob from 'glob-promise';
import Fs from 'fs';
import Path from 'path';
import Util from 'util';

// setup caches
const cacheCat = new Cache( 'Categories', 'setCat' );
const cacheQual = new Cache('qualifiers', 'iri') ;
const cacheKey = new Cache('keyword_types', 'iri') ;
const cacheSparql = new Cache('sparql_results', 'query') ;
const cacheTypes = new Cache( 'types', 'page' );

const cacheLabels = new Cache( 'labels', 'iri' );

// setup temp file
const tempFilePath = Path.join( Config.cachePath, 'getLabels.tmp.tsv' );
const tempFile = Fs.createWriteStream( tempFilePath, {});
const appendTemp = Util.promisify( tempFile.write ).bind( tempFile );

// extract list of iris for which we need labels
const iris = new Set();
const literals = new Set();

//for categories
for( const row of cacheCat.getAll() ) {
  iris.add(row.setCat);
}
//for qualifiers
for( const row of cacheQual.getAll() ) {
  for( const entry of row.result ) {
    if( 'keywordIRI' in entry ) {
      if(entry.isiri){
        iris.add( entry.keywordIRI );
      }
      else{
        literals.add( entry.keywordIRI );
      }
    }
    if( 'target' in entry ) {
      iris.add(entry.target);
    }
  }
}
//for keyword_types
for( const row of cacheKey.getAll() ) {
  for( const entry of row.result ) {
    if( 'type' in entry ) {
      iris.add( entry.type );
    }
  }
}
//for wikipedia members
for( const row of cacheTypes.getAll() ) {
  iris.add(row.page);
}
//for sparql target + keyword + sparql query results
for( const row of cacheSparql.getAll() ) {
  // get entities from sparql query key
  let entities = row.query.match(/Q[0-9]*/g) ;
  entities.forEach(e => {
    iris.add(e);
  });
  for( const entry of row.result ) {
    if( 'item' in entry ) {
      iris.add( entry.item );
    }
  }
}

//for literals assign literal itself as label
cacheLabels.setValues([... literals].map(item => ({ iri: item, result: [{iriLabel: item}] })));

/**
 * for all iris determine labels
 */
export default function getLabels( entry ) {

  // skip anything that is not our iri
  if( !iris.has( entry.id ) ) {
    return;
  }

  // get english label
  let label;
  if(entry?.labels?.en != undefined){
    label = entry?.labels?.en?.value;
  }
  else{
    label = entry.id;
  }


  // persist
  appendTemp(JSON.stringify({ iri: entry.id, result: [{iriLabel: label}] }) );
  appendTemp('\n');

}
