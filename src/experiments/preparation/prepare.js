import getTargetEntities                   from './getTargetEntities';
import getObjectDesc                       from './getObjectDesc';
import toNTriples                          from './toNTriples';

(async function(){

  await getTargetEntities();
  await getObjectDesc();
  await toNTriples();
})();
