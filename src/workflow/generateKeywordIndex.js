import * as fs                          from 'fs';
import generateKeywordIndex             from './../complex-queries-generation/multi-hop/generateKeywordIndex';

(async function(){

  generateKeywordIndex(fs);

})();
