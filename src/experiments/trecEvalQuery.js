import localConfig  from './config';
import fs         	from 'fs';
const util = require('util');
const exec = util.promisify(require('child_process').exec);

/**
 * generate evaluation metrics using trec_eval tool (https://github.com/usnistgov/trec_eval), query level
 * Download: https://trec.nist.gov/trec_eval/trec_eval-9.0.7.tar.gz , unzip in /experiments/trec-tool/trec_eval-9.0.7/
 * compile with make
 */

export default async function trecEvalAll(){

  // for each run file generate evaluation metrics
  console.log('Generating Eval. Metrics (query level) . . .');

  var files = fs.readdirSync(localConfig.runs);

  for (let file of files) {

    let type = file.replace('.run', '').slice(-2);
    let sim = file.replace('.run', '').slice(0, -3);

    if(type == 'mk'){
      let trecResQuery = fs.createWriteStream(`${localConfig.results}${sim}-${type}-result-query.txt`, {flags: 'a'});
      const { stdout } = await exec(`cd ${localConfig.trec_tool} ; ./trec_eval -q -c -M1000 -m map ${localConfig.qrelsDir}mk-qrels.txt ${localConfig.runs}${file}`);
      trecResQuery.write(stdout);
      //console.log(stdout);
    }
    if(type == 'mh'){
      let trecResQuery = fs.createWriteStream(`${localConfig.results}${sim}-${type}-result-query.txt`, {flags: 'a'});
      const { stdout }  = await exec(`cd ${localConfig.trec_tool} ; ./trec_eval -q -c -M1000 -m map ${localConfig.qrelsDir}mh-qrels.txt ${localConfig.runs}${file}`);
      trecResQuery.write(stdout);
      //console.log(stdout);
    }
    if(type == 'nt'){
      let trecResQuery = fs.createWriteStream(`${localConfig.results}${sim}-${type}-result-query.txt`, {flags: 'a'});
      const { stdout }  = await exec(`cd ${localConfig.trec_tool} ; ./trec_eval -q -c -M1000 -m map ${localConfig.qrelsDir}nt-qrels.txt ${localConfig.runs}${file}`);
      trecResQuery.write(stdout);
      //console.log(stdout);
    }

  }


}
