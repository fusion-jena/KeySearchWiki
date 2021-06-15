
import * as fs                          from 'fs';
import request                          from './../conn';
import generateCandidate                from './../candidate-generation/generateCandidate';

(async function(){

  generateCandidate(fs, request);

})();
