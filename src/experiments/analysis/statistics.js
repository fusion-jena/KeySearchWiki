/**
 *
 *
 *
 */

import fs         	from 'fs';
import readline   	from 'readline';
import localConfig  from './../config';

(async function(){

  // read-interface to the source file
  const rl = readline.createInterface({
    input: fs.createReadStream( localConfig.results + 'BM25-mh-result-query.txt'),
  });

  let one = 0 , zero = 0 , chunk1 = 0, chunk2 = 0, chunk3 = 0, chunk4 = 0, chunk5 = 0 ;
  let totalQueries = 0 , sum = 0, metricAll = 0 ;

  for await (const line of rl) {
    let array = line.split('\t');
    let metricValue = Number(array[2]);
    if(array[1] != 'all'){
      totalQueries ++ ;
      sum += metricValue;
      if(metricValue == 1){
        one ++ ;
      }
      if(metricValue == 0){
        zero ++ ;
      }
      if(metricValue <= 1 && metricValue > 0.8){
        chunk1 ++ ;
      }
      if(metricValue <= 0.8 && metricValue > 0.6){
        chunk2 ++ ;
      }
      if(metricValue <= 0.6 && metricValue > 0.4){
        chunk3 ++ ;
      }
      if(metricValue <= 0.4 && metricValue > 0.2){
        chunk4 ++ ;
      }
      if(metricValue <= 0.2 && metricValue >= 0){
        chunk5 ++ ;
      }
    }
    else {
      metricAll = metricValue;
    }
  }


  console.log(`
    # queries               : ${totalQueries}
    # queries with results  : ${totalQueries - zero}, % ${(totalQueries - zero)/totalQueries}
    P@10 over with results  : ${sum / (totalQueries - zero)}
    P@10 over all           : ${metricAll}, (${sum / totalQueries})
    1                       : ${one} , % ${one/totalQueries}
    [ 1   , 0.8 [           : ${chunk1} , % ${chunk1/totalQueries}
    [ 0.8 , 0.6 [           : ${chunk2} , % ${chunk2/totalQueries}
    [ 0.6 , 0.4 [           : ${chunk3} , % ${chunk3/totalQueries}
    [ 0.4 , 0.2 [           : ${chunk4} , % ${chunk4/totalQueries}
    [ 0.2 , 0   ]           : ${chunk5} , % ${chunk5/totalQueries}
    0                       : ${zero} , % ${zero/totalQueries}`
  );

  rl.close();


})();
