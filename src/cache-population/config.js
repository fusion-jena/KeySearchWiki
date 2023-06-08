import path from 'path';
/**
 * settings to generate Wikidata caches beforehand
 */
export default {

  // wikidata dump version
  wdDump: path.join(__dirname,'..', '..', '..', 'wikidata-20210920-all.json.gz'),

  /**
   * interval to log progress while traversing the dump
   */
  logInterval: 10000,

  /**
   * config for wikipedia cache population
   */

  // wikipedia dump version
  dumpDate : '20210920',
  // wikipedia database user
  user: 'root',
  // wikipedia database password
  password: 'wikipedia',
  // wikipedia database name
  databaseName: 'wikipedia',


  linkPrefix: 'https://dumps.wikimedia.org/',
  tables : ['categorylinks.sql.gz', 'page.sql.gz', 'page_props.sql.gz'],
  dumpLocation: path.join(__dirname,'..', '..','wikipedia-dump/'),
  importError: path.join(__dirname,'..', '..','cache/import-error-log.json'),
  timeLog: path.join(__dirname,'..', '..','cache/time-log.json'),
  downloadError: path.join(__dirname,'..', '..','wikipedia-dump/download-error-log.json'),
  wikidataDumpLangList: path.join(__dirname,'..', '..','wikipedia-dump/wd-lang-list.json'),
  catGroupedBylang: path.join(__dirname,'..', '..','wikipedia-dump/cat-by-lang.json'),
  maxValues: 10000

};
