import localConfig  from './config';
import fs         	from 'fs';
const util = require('util');
const exec = util.promisify(require('child_process').exec);

/**
 * generate evaluation metrics using trec_eval tool (https://github.com/usnistgov/trec_eval)
 * Download: https://trec.nist.gov/trec_eval/trec_eval-9.0.7.tar.gz , unzip in /experiments/trec-tool/trec_eval-9.0.7/
 * compile with make
 */

export default async function trecEval(){

  // for each run file generate evaluation metrics
  console.log('Generating Eval. Metrics (summary level) . . .');

  var files = fs.readdirSync(localConfig.runs);

  for (let file of files) {

    let type = file.replace('.run', '').slice(-2);
    let sim = file.replace('.run', '').slice(0, -3);

    if(type == 'mk'){
      let trecRes = fs.createWriteStream(`${localConfig.results}${sim}-${type}-result-all.txt`, {flags: 'a'});
      const { stdout } = await exec(`cd ${localConfig.trec_tool} ; ./trec_eval -c -M1000 ${localConfig.qrelsDir}mk-qrels.txt ${localConfig.runs}${file}`);
      trecRes.write(stdout);
      //console.log(stdout);
    }
    if(type == 'mh'){
      let trecRes = fs.createWriteStream(`${localConfig.results}${sim}-${type}-result-all.txt`, {flags: 'a'});
      const { stdout } = await exec(`cd ${localConfig.trec_tool} ; ./trec_eval -c -M1000 ${localConfig.qrelsDir}mh-qrels.txt ${localConfig.runs}${file}`);
      trecRes.write(stdout);
      //console.log(stdout);
    }
    if(type == 'nt'){
      let trecRes = fs.createWriteStream(`${localConfig.results}${sim}-${type}-result-all.txt`, {flags: 'a'});
      const { stdout } = await exec(`cd ${localConfig.trec_tool} ; ./trec_eval -c -M1000 ${localConfig.qrelsDir}nt-qrels.txt ${localConfig.runs}${file}`);
      trecRes.write(stdout);
      //console.log(stdout);
    }

  }


}
