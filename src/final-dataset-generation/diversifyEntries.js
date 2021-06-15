import Config                   from './../config/config';
import JSONStream               from 'JSONStream';

const { performance } = require('perf_hooks');

/**
 * group queries that have same purpose and choose one representative (query signature as keyword types + target)
 *
 * @param     {Object}      fs              object for file system node module
 *
 */

export default function diversifyEntries(fs){

  const start = performance.now();

  console.log('Diversify . . .');

  let merged = fs.createReadStream(Config.mergedDataset , {encoding: 'utf8'});

  let entriesMap = new Map();
  let signature = {};

  let parser = JSONStream.parse('*');
  merged.pipe(parser);

  parser.on('data', entry => {
    entriesMap.set(entry.queryID, entry);
    let sigKeyword = [];
    entry.keywords.forEach(keyword => {
      let types = keyword.types.map(item => item.type);
      sigKeyword = sigKeyword.concat(types);
    });

    let sig = {target: entry.target.iri ,targetLabel: entry.target.label, key: sigKeyword.sort()};

    if(signature.hasOwnProperty(JSON.stringify(sig))){
      signature[JSON.stringify(sig)].push(entry.queryID);
    }
    else{
      signature[JSON.stringify(sig)] = [entry.queryID];
    }

  });

  parser.on('end', () => {

    console.log('Group by query type and select representative ... ');

    //let writeSig = fs.createWriteStream(Config.outputGS + 'signature.json', { flags: 'a' });
    let dataset = fs.createWriteStream(Config.finalDataset, { flags: 'a' });
    let metrics = fs.createWriteStream(Config.metricDatasetFinal, { flags: 'a' });

    let datasetArray = [];
    let allsig = [];

    Object.keys(signature).forEach(key => {
      let element = {signature: JSON.parse(key) , size: signature[key].length, subset: signature[key].slice(0, 5)};
      allsig.push(element);

      // group signature elements per entry type
      let group = {NT:[], MH:[] ,MK:[]};
      signature[key].forEach(query => {
        if(query.includes('NT')){
          group.NT.push(query);
        }
        if(query.includes('MK')){
          group.MK.push(query);
        }
        if(query.includes('MH')){
          group.MH.push(query);
        }
      });

      Object.keys(group).forEach(k => {
        if(group[k].length != 0){
          if(k == 'NT' || k =='MK'){
            let sample = group[k].sort()[0];
            let entr = entriesMap.get(sample);
            datasetArray.push(entr);
          }
          else{
          //if multihop select one with best coverage
            let candidate = [];
            group[k].forEach(can => {
              candidate.push(entriesMap.get(can));
            });

            candidate.sort((a, b) => (a.coverage < b.coverage) ? 1 : -1);
            datasetArray.push(candidate[0]);
          }
        }
      });
    });


    allsig.sort((a, b) => (a.size < b.size) ? 1 : -1);

    allsig.forEach(item => {
      //writeSig.write(JSON.stringify(item));
      //writeSig.write('\r\n');
    });

    dataset.write('[');
    dataset.write('\r\n');

    datasetArray.forEach((item, i) => {
      dataset.write(JSON.stringify(item));
      metrics.write(JSON.stringify(item.metrics));
      if(i!=  datasetArray.length - 1){
        dataset.write(',');
      }
      dataset.write('\r\n');
      metrics.write('\r\n');
    });

    dataset.write(']');

    const end = performance.now();

    console.log(`Time taken: ${(end - start) / 1000} s`);

    console.log('# distinct signatures: '+  Object.keys(signature).length);
    console.log('# final entries: '+  datasetArray.length);

  });

}
