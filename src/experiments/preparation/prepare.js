import getTargetEntities                   from './getTargetEntities';
import getObjectDesc                       from './getObjectDesc';
import toNTriples                          from './toNTriples';

/**
 * prepare the data to be indexed in a N-triples format
 *
 *
 */

(async function(){

  await getTargetEntities();
  await getObjectDesc();
  await toNTriples();
})();
