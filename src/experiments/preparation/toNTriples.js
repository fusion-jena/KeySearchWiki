/**
 * Generate N-triples from targets entities and object descriptions
 *
 *
 */

import fs         	from 'fs';
import readline   	from 'readline';
import localConfig  from './../config';
const { performance } = require('perf_hooks');
import { experPrep as Log } from './../../util/logger';

export default async function toNTriples(){

  Log.info('Generate N-Triples segment from target entities ... ');

  const t0 = performance.now();

  let nTriple = fs.createWriteStream(localConfig.n_triple, {flags: 'a'});

  // read-interface to the source file
  const rlTargets = readline.createInterface({
    input: fs.createReadStream( localConfig.wiki_targets ),
  });

  let entitySet = new Set();

  for await (const line of rlTargets) {
    let entry = JSON.parse(line);
    entitySet.add(entry.id);
    let subject = `<${localConfig.ns.entity}${entry.id}>`;
    if(entry.label != ''){
      // label triple
      nTriple.write(`${subject} <${localConfig.prop.label}> "${entry.label}"@en .`);
      nTriple.write('\r\n');
    }
    if(entry.description != ''){
      // description triple
      nTriple.write(`${subject} <${localConfig.prop.desc}> "${entry.description}"@en .`);
      nTriple.write('\r\n');
    }

    if(Object.keys(entry.claims).length != 0){
      Object.keys(entry.claims).forEach(key => {
        entry.claims[key].forEach(object => {
          if(object.type == 'wikibase-item'){
            nTriple.write(`${subject} <${localConfig.ns.property}${key}> <${localConfig.ns.entity}${object.value}> .`);
            nTriple.write('\r\n');
          }
          else{
            nTriple.write(`${subject} <${localConfig.ns.property}${key}> "${object.value}" .`);
            nTriple.write('\r\n');
          }
        });
      });
    }
  }

  const t1 = performance.now();

  Log.info('Generate N-Triples segment from objects description ... ');

  const rlDesc = readline.createInterface({
    input: fs.createReadStream( localConfig.object_desc),
  });

  for await (const line of rlDesc) {
    let element = JSON.parse(line);
    //avoid adding double description/label triples
    if(!entitySet.has(element.id)){
      if(element.description != ''){
      // description triple
        nTriple.write(`<${localConfig.ns.entity}${element.id}> <${localConfig.prop.desc}> "${element.description}"@en .`);
        nTriple.write('\r\n');
      }
      if(element.label != ''){
      // description triple
        nTriple.write(`<${localConfig.ns.entity}${element.id}> <${localConfig.prop.label}> "${element.label}"@en .`);
        nTriple.write('\r\n');
      }
    }

  }

  const t2 = performance.now();

  rlDesc.close();
  rlTargets.close();

  Log.info(`
  time (targets): ${(t1 - t0) / 1000} s
  time (object desc.): ${(t2 - t1) / 1000} s
  `);

}
