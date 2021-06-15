import Config                   from './../config/config';
import JSONStream               from 'JSONStream';

const { performance } = require('perf_hooks');

/**
 * merge native , multi-hop , multi-key datasets and their metrics
 *
 * @param     {Object}      fs              object for file system node module
 *
 */

export default function mergeEntries(fs){

  const start = performance.now();

  console.log('Merging . . .');

  let native = fs.createReadStream(Config.datasetNative , {encoding: 'utf8'});
  let datasetMerged = fs.createWriteStream(Config.mergedDataset, {flags: 'a'});
  let metricMerged = fs.createWriteStream(Config.metricDatasetMerged, {flags: 'a'});

  let dataset = [];

  datasetMerged.write('[');
  datasetMerged.write('\r\n');

  let parser = JSONStream.parse('*');
  native.pipe(parser);

  parser.on('data', entry => {
    dataset.push(entry);
    let metric = entry.metrics;
    metric['queryID'] = entry.queryID;
    metricMerged.write(JSON.stringify(metric));
    metricMerged.write('\r\n');
  });

  parser.on('end', () => {
    console.log('done with native !');

    let multiHop = fs.createReadStream(Config.multihopNewDataset , {encoding: 'utf8'});

    let parser = JSONStream.parse('*');
    multiHop.pipe(parser);


    parser.on('data', entry => {
      dataset.push(entry);
      let metric = entry.metrics;
      metric['queryID'] = entry.queryID;
      metricMerged.write(JSON.stringify(metric));
      metricMerged.write('\r\n');
    });

    parser.on('end', () => {
      console.log('done with multi-hop !');

      let multiKey = fs.createReadStream(Config.multikeyNewDataset , {encoding: 'utf8'});

      let parser = JSONStream.parse('*');
      multiKey.pipe(parser);


      parser.on('data', entry => {
        dataset.push(entry);
        let metric = entry.metrics;
        metric['queryID'] = entry.queryID;
        metricMerged.write(JSON.stringify(metric));
        metricMerged.write('\r\n');
      });

      parser.on('end', () => {
        console.log('done with multi-key !');

        dataset.forEach((item, i) => {
          datasetMerged.write(JSON.stringify(item));
          if(i!=  dataset.length - 1){
            datasetMerged.write(',');
          }
          datasetMerged.write('\r\n');
        });

        datasetMerged.write(']');

        const end = performance.now();

        console.log(`Time taken: ${(end - start) / 1000} s`);
        console.log('# total entries : ' + dataset.length);

      });
    });

  });

}
