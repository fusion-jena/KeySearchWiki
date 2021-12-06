import localConfig  from './config';
import generateSingleRun  from './generateSingleRun';

/**
 * generate runs for each elasticsearch similarity model
 *
 *
 */

export default async function iterateSimilarity(){

  for (let sim of localConfig.similarity) {
    console.log(sim.type);

    // close used index
    await fetch(`${localConfig.elastic_endpoint}/${localConfig.index}/_close`, {
      method: 'POST'
    });


    // change similarity settings
    await fetch(`${localConfig.elastic_endpoint}/${localConfig.index}/_settings`, {
      body: `{"index": { "similarity": { "default": ${JSON.stringify(sim)}}}}`,
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'PUT'
    });

    // re-open index
    await fetch(`${localConfig.elastic_endpoint}/${localConfig.index}/_open`, {
      method: 'POST'
    });

    // set a delay to avoid index shards to fail
    await new Promise(resolve => setTimeout(resolve, localConfig.delay*1000));

    // generate run using current similarity model
    await generateSingleRun(sim.type);

  }
}
