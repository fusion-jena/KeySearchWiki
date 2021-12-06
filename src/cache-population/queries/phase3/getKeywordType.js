import Cache from '../../../util/cache';
import { getObjectValues } from '../../util';
import extractTargetKeyword from '../../../keyword-target-extraction/extractTargetKeyword';

// setup cache
const cache = new Cache('keyword_types', 'iri') ;

// extract list of keyword IRIs from qualifiers-cache
const keywords = new Set();
const literals = new Set();
{
  const qualifierCache = new Cache('qualifiers', 'iri') ;
  for( const row of qualifierCache.getAll() ) {
    for( const entry of row.result ) {
      if( 'keywordIRI' in entry ) {
        if(entry.isiri){
          keywords.add( entry.keywordIRI );
        }
        else{
          literals.add( entry.keywordIRI );
        }
      }
    }
  }

  // extract list of sparql keywords from categories cache
  const cacheCat = new Cache( 'Categories', 'setCat' );
  for( const row of cacheCat.getAll() ) {
    for( const entry of row.result ) {
      if('sparql' in entry){
        extractTargetKeyword(entry.sparql).keywords.forEach(key => {
          keywords.add(key);
        });
      }
    }
  }
}

//for literals assign an empty array
cache.setValues([... literals].map(item => ({ iri: item, result: [{}] })));

/**
 * for all occurring keywords, determine their direct types
 */
export default function getKeywordType( entry ) {

  // skip anything that is not our keywords
  if( !keywords.has( entry.id ) ) {
    return;
  }

  // get all classes
  const classes = getObjectValues( entry, 'P31' );

  // create results
  const res = [];
  if( classes ) {
    res.push( ... classes.map( (c) => ({ type: c }) ) );
  } else {
    res.push({});
  }

  // persist
  cache.setValues([{ iri: entry.id, result: res }]);

}
