import path from 'path';

const Config = {

  // enable/disable sending requests to endpoint
  endpointEnabled: false,

  // maximum parallel queries
  maxParallelQueries:   5,

  //default waiting time on 429 in case server does not give any "Retry-After" time
  //time in seconds
  defaultDelay: 10 ,

  // number of times to rerun the same query
  maxRetries: 20 ,

  //limit depth for category hierarchy exploration
  depthLimit: 3 ,

  // set category from where to start
  checkpoint: 1,

  // endpoint to query
  endpoint:     'https://query.wikidata.org/sparql' ,

  // maximum number of parameters in an SQLite query
  // (Maximum Number Of Host Parameters In A Single SQL Statement)
  cacheMaxValuesSQLite: 32766,

  //output directory
  outputGS: path.join(__dirname,'..', '..','/dataset/'),

  //raw dataset files
  rawData: path.join(__dirname,'..', '..','/dataset/raw-data.json'),
  statsRawData: path.join(__dirname,'..', '..','/dataset/statistics-raw-data.json'),

  //intermediate dataset file
  datasetIntermediate: path.join(__dirname,'..', '..','/dataset/intermediate-dataset.json'),
  metricDatasetIntermediate: path.join(__dirname,'..', '..','/dataset/metrics-intermediate-dataset.json'),

  //native dataset files
  datasetNative: path.join(__dirname,'..', '..','/dataset/native-dataset.json'),
  metricDatasetNative: path.join(__dirname,'..', '..','/dataset/metrics-native-dataset.json'),
  statisticDatasetNative: path.join(__dirname,'..', '..','/dataset/statistics-native-dataset.json'),

  //keyword index
  keywordEntryIndex: path.join(__dirname,'..', '..','/dataset/keyword-entry-index.json'),

  //new multi-hop dataset files
  metricMultihopNewDataset: path.join(__dirname,'..', '..','/dataset/metrics-new-dataset-multi-hop.json'),
  //metricMultihopBefore: path.join(__dirname,'..', '..','/dataset/metrics-before-multi-hop.json'),
  statisticMultihopNewDataset: path.join(__dirname,'..', '..','/dataset/statistics-new-dataset-multi-hop.json'),
  multihopNewDataset: path.join(__dirname,'..', '..','/dataset/new-dataset-multi-hop.json'),

  // new multi-keyword dataset files
  metricMultikeyNewDataset: path.join(__dirname,'..', '..','/dataset/metrics-new-dataset-multi-key.json'),
  //metricMultikeyBefore: path.join(__dirname,'..', '..','/dataset/metrics-before-multi-key.json'),
  statisticMultikeyNewDataset: path.join(__dirname,'..', '..','/dataset/statistics-new-dataset-multi-key.json'),
  multikeyNewDataset: path.join(__dirname,'..', '..','/dataset/new-dataset-multi-key.json'),

  //merged dataset files
  mergedDataset: path.join(__dirname,'..', '..','/dataset/merged-dataset.json'),
  metricDatasetMerged: path.join(__dirname,'..', '..','/dataset/metrics-merged-dataset.json'),
  statisticDatasetMerged: path.join(__dirname,'..', '..','/dataset/statistics-merged-dataset.json'),

  //final dataset files
  finalDataset: path.join(__dirname,'..', '..','/dataset/final-dataset.json'),
  metricDatasetFinal: path.join(__dirname,'..', '..','/dataset/metrics-final-dataset.json'),
  statisticDatasetFinal: path.join(__dirname,'..', '..','/dataset/statistics-final-dataset.json'),

  //final format files
  jsonFormat: path.join(__dirname,'..', '..','/dataset/KeySearchWiki-JSON.json'),
  queryLabel: path.join(__dirname,'..', '..','/dataset/KeySearchWiki-queries-label.txt'),
  queryIRI: path.join(__dirname,'..', '..','/dataset/KeySearchWiki-queries-iri.txt'),
  qrelsTREC: path.join(__dirname,'..', '..','/dataset/KeySearchWiki-qrels-trec.txt'),
  queryNatur: path.join(__dirname,'..', '..','/dataset/KeySearchWiki-queries-naturalized.txt'),

  //output plots
  plotMetric: path.join(__dirname,'..', '..','/charts/'),

  //output evaluation
  eval: path.join(__dirname,'..', '..','/eval/'),

  //cache database files
  cachePath: path.join(__dirname,'..', '..','/cache/'),


  //dowload location for wikipedia dumps
  downloadPath: path.join(__dirname,'..', '..','/wikipedia-dump/'),

  //logs
  apiErrorLog: path.join(__dirname,'..', '..','/dataset/api-errors-log.log'),
  pipelineLog: path.join(__dirname,'..', '..','/dataset/pipeline-log.log'),
  wikipediaHitLog: path.join(__dirname,'..', '..','/dataset/wikipedia-hit-log.log'),

  cachePopLog: path.join(__dirname,'..', '..','/cache/global-cache-population-log.log'),
  wikipediaCachePopLog: path.join(__dirname,'..', '..','/cache/wikipedia-cache-population-log.log'),
  downloadLog: path.join(__dirname,'..', '..','/wikipedia-dump/download-log.log'),

};
export default Config;


// make sure all paths actually exist
import mkdirp from 'mkdirp';
['outputGS', 'plotMetric', 'eval', 'cachePath','downloadPath' ]
  .map( (prop) => mkdirp.sync( Config[ prop ] ) );
