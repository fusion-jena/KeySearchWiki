/**
 * check, if the entry is an instance of the given class
 *
 * @param {Object} entry
 * @param {String} klass
 * @returns {Boolean}
 */
export function isInstanceOf( entry, klass ) {
  return ('P31' in entry.claims) && entry.claims.P31.some( (el) => el?.mainsnak?.datavalue?.value?.id == klass );
}


/**
 * extract all values for the given DatatypeProperty from entry
 *
 * @param {Object} entry
 * @param {String} prop
 * @returns {Array}
 */
export function getDataValues( entry, prop ) {

  // property needs to exist
  if( !(prop in entry.claims) ) {
    return;
  }

  // get all values
  return entry.claims[ prop ].map( (el) => el.mainsnak.datavalue.value );

}


/**
 * extract all values for the given ObjectProperty from entry
 *
 * @param {Object} entry
 * @param {String} prop
 * @returns {Array}
 */
export function getObjectValues( entry, prop ) {

  // property needs to exist
  if( !(prop in entry.claims) ) {
    return;
  }

  const classes = entry.claims[ prop ].map( (el) => el?.mainsnak?.datavalue?.value?.id ).filter( (el) => el );
  if (classes.length == 0 ) {
    return ;
  }
  else {
    return classes;
  }

}


/**
 * emit all combinations of the elements given in the member arrays of lists
 * note that all permutations use the same array, so the results might need to be cloned for further processing
 *
 * @param  {Array.<Array>} lists
 */
export function* getCombinations( lists ) {

  if( lists.length < 1 ) {

    // no more lists
    yield [];

  } else {
    // determine last list; the one processed here
    const lastIndex = lists.length - 1;

    for( const partial of getCombinations( lists.slice( 0, -1 ) ) ) {

      if( lists[lastIndex] && (lists[lastIndex].length > 0) ) {
        // some elements in "our" list
        for( const el of lists[lastIndex] ) {
          partial[lastIndex] = el;
          yield partial;
        }
      } else {
        // empty list
        partial[lastIndex] = undefined;
        yield partial;
      }

    }
  }

}
