import Config from '../../../config/config';
import Cache from '../../../util/cache';
import { getObjectValues } from '../../util';

import Fs from 'fs';
import Path from 'path';
import Util from 'util';

// fetch all included SPARQL queries
const monitoredQueries = [];
{
  const setCatCache = new Cache( 'Categories', 'setCat' );
  const targets = [];
  for( const row of setCatCache.getAll() ) {
    for( const entry of row.result ) {
      if( 'sparql' in entry ) {
        // this entry has a sparql query
        const where = [];

        // crude parsing of SPARQL fragment
        for( const section of entry.sparql.split( '.' ).filter( (el) => el ) ){
          const triples = section.split( ';' )
            .map( (t) => t.trim().split( ' ' ) );

          // first triple, should actually be a triple, so extract the subject
          const subject = triples[0].shift();

          // if we get anything else than '?item' as a subject, we bail
          if( subject != '?item' ) {
            where.length = 0;
            break;
          }

          // extract the constraints from the remaining triples
          where.push(
            ...triples.map( (t) => ({
              prop: t[0].slice( 4 ),  // remove "wdt:"
              obj: t[1].slice( 3 ),   // remove "wd:"
            }) )
          );

        }

        // validate all where-clauses
        // we only accept those that ...
        // * are non-empty
        // * use proper Wikidata parts
        if( (where.length > 0) && where.every( (w) => /^P\d+$/.test( w.prop ) && /^Q\d+$/.test( w.obj ) ) ) {
          targets.push({
            key: entry.sparql.replace(/[^A-Z0-9]/ig, ''),
            query: where,
          } );
        }

      }
    }
  }

  // group queries for faster processing
  groupQueries( monitoredQueries, targets );

}

// set up temp file
const tempFilePath = Path.join( Config.cachePath, 'sparqlResults.tmp.tsv' );
const tempFile = Fs.createWriteStream( tempFilePath, {});
const appendTemp = Util.promisify( tempFile.write ).bind( tempFile );


export default function getSparql( entry, queries=monitoredQueries ){

  // check all monitored queries
  for( const query of queries ) {

    // get corresponding values
    const values = getObjectValues( entry, query.prop );

    // match values
    if( values ){
      for( const value of values ) {
        if( value in query.children ) {

          // shortcut
          const child = query.children[value];

          // collect all hits
          for( const hit of child.hits ) {
            appendTemp( `${hit}\t${entry.id}\n` );
          }

          // call recursion, if child-queries are left
          if( child.queries.length > 0 ) {
            getSparql( entry, child.queries );
          }

        }
      }
    }

  }

}


/**
 * group queries by similar triples,
 * so they can be answered using fewer checks later on
 */
function groupQueries( res, queries ) {

  // process all queries
  while( queries.length > 0 ) {

    // count properties by frequency
    const props = {};
    for( const q of queries ) {
      for( const w of q.query ) {
        if( !(w.prop in props ) ) {
          props[w.prop] = 0;
        }
        props[w.prop] += 1;
      }
    }

    // select most frequent property
    const topProp = Object
      .entries( props )
      .sort( (a,b) => b[1] - a[1] )[0][0];

    // split the list of queries into
    // non-matches and matches by value
    const remainder = [];
    const byValue = {};
    for( const q of queries ) {

      // determine matching entry
      const match = q.query.find( (el) => el.prop == topProp );

      if( !match ) {

        // query doesnt use the most frequent property
        // => keep it for next iteration
        remainder.push( q );

      } else {

        // query includes the pattern

        // remove the entry from the query
        q.query = q.query.filter( (w) => w != match );

        // collect by value
        if( !(match.obj in byValue) ) {
          byValue[ match.obj ] = {
            obj:      match.obj,
            queries:  [],
            hits:     [],
          };
        }

        // assign query
        if( q.query.length < 1 ) {
          byValue[ match.obj ].hits.push( q.key );
        } else {
          byValue[ match.obj ].queries.push( q );
        }

      }

    }

    // add an entry for this property-value combination
    const entry = {
      prop:     topProp,
      children: {},
    };
    res.push( entry );

    // add matching queries to result
    // and process them recursively
    for( const group of Object.values( byValue ) ){
      const child = {
        obj:      group.obj,
        queries:  [],
        hits:     group.hits,
      };
      entry.children[ group.obj ] = child;
      if( group.queries.length > 0 ) {
        groupQueries( child.queries, group.queries );
      }
    }

    // continue to iterate with the remainder
    queries = remainder;

  }

}
