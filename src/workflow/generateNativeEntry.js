import * as fs                          from 'fs';
import generateNativeEntry              from './../post-processing/generateNativeEntry';

(async function(){

  generateNativeEntry(fs);

})();
