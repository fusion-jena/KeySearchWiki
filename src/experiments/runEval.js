import iterateSimilarity  from './iterateSimilarity';
import trecEvalAll           from './trecEvalAll';
import trecEvalQuery          from './trecEvalQuery';
import 'cross-fetch/polyfill';
const { performance } = require('perf_hooks');

(async function(){

  const t0 = performance.now();

  await iterateSimilarity();

  await trecEvalAll();
  //await trecEvalQuery();

  const t1 = performance.now();

  console.log(`
  time taken: ${(t1 - t0) / 1000} s
  `);

})();
