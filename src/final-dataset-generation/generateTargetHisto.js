import Config                   from './../config/config';
import JSONStream               from 'JSONStream';
import fs                       from 'fs';

/**
 * generate statistics about targets frequency per query type
 *
 *
 */

(async function(){

  console.log('Generate statistics about targets frequency per query type. . .');

  let dataset = fs.createReadStream(Config.outputGS + 'KeySearchWiki-JSON.json' , {encoding: 'utf8'});

  let stats = {MH: {} , MK: {}, NT: {}};

  let parser = JSONStream.parse('*');
  dataset.pipe(parser);

  parser.on('data', entry => {

    let queryID = entry.queryID;
    let target = entry.target.label;
    let object;
    if(queryID.includes('NT')){
      object = stats.NT;
    }
    if(queryID.includes('MK')){
      object = stats.MK;
    }
    if(queryID.includes('MH')){
      object = stats.MH;
    }

    if(target in object){
      object[target] ++ ;
    }
    else{
      object[target] = 1;
    }


  });

  parser.on('end', () => {

    //sort
    Object.keys(stats).forEach(key => {
      let object = stats[key];
      const sortedArr = Object.entries(object)
        .sort(([, v1], [, v2]) => v2 - v1);
      const sorted = Object.fromEntries(sortedArr);
      stats[key] = sorted;
    });

    fs.writeFileSync(Config.outputGS + 'histo.json', JSON.stringify(stats));

  });

})().catch( (e) => console.error(e) );
