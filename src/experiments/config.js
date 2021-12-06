import path       from 'path';

const Config = {
  //experiments input/data
  experiment: path.join(__dirname,'..', '..','/experiments/'),

  // elasticsearch similarity models
  similarity : [
    {type: 'BM25'},
    {type: 'DFR', basic_model: 'g', after_effect: 'l', normalization: 'z'},
    {type: 'LMDirichlet'},
    {type: 'LMJelinekMercer'}
  ] ,
  // top-10 targets (from final dataset)
  targets: ['Q5', 'Q482994', 'Q7889', 'Q7366', 'Q134556', 'Q95074', 'Q11424', 'Q105543609', 'Q169930', 'Q21191270'],
  // queries location
  queriesDir:path.join(__dirname,'..', '..','/experiments/queries/'),
  qrelsDir: path.join(__dirname,'..', '..','/experiments/qrels/'),

  // runs location
  runs: path.join(__dirname,'..', '..','/experiments/runs/'),
  // data location
  data: path.join(__dirname,'..', '..','/experiments/data/'),
  experPrep: path.join(__dirname,'..', '..','/experiments/data/log.log'),
  // trec tool location
  trec_tool: path.join(__dirname,'trec-tool/trec_eval-9.0.7'),
  //results location
  results: path.join(__dirname,'..', '..','/experiments/results/'),
  // elasticsearch endpoint
  elastic_endpoint: 'http://localhost:9200',
  // elasticsearch index name
  index: 'eindex',
  // search service endpoint
  elas4rdf_search: 'http://localhost:8080/elas4rdf-rest-0.0.1-SNAPSHOT/high-level',
  // dataset ID
  datasetID: 'wiki-subset',
  // namespaces
  ns: {
    entity:'http://www.wikidata.org/entity/',
    property: 'http://www.wikidata.org/prop/direct/'
  },
  //properties
  prop:{
    label: 'http://www.w3.org/2000/01/rdf-schema#label',
    desc: 'http://schema.org/description'
  },
  // delay to avoid index shards to fail in seconds
  delay: 5,
  //full dump location
  wiki_dump_json: path.join(__dirname,'..', '..', '..', 'wikidata-20210920-all.json.gz'),
  // targets entities dump location
  wiki_targets: path.join(__dirname,'..', '..','/experiments/data/targets.ndjson'),
  // file with object description location
  object_desc: path.join(__dirname,'..', '..','/experiments/data/object-desc.ndjson'),
  //N-triples file location
  n_triple: path.join(__dirname,'..', '..','/experiments/data/wiki-subset.nt'),

  //interval to log progress while traversing the dump
  logInterval: 10000,
};
export default Config;
import mkdirp from 'mkdirp';
['experiment', 'queriesDir', 'qrelsDir', 'runs', 'data' , 'results']
  .map( (prop) => mkdirp.sync( Config[ prop ] ) );
