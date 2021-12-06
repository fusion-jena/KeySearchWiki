import fs         	from 'fs';
import readline   	from 'readline';
import localConfig  from './config';

/**
 * generate single run for a specific similarity model
 *
 *
 */

export default async function generateSingleRun(sim){

  // for each query type, generate runs
  var files = fs.readdirSync(localConfig.queriesDir);

  for (let file of files){
    console.log(file);
    const rl = readline.createInterface({
      input: fs.createReadStream( localConfig.queriesDir + file ),
    });

    let trecRun = fs.createWriteStream(`${localConfig.runs}${sim}-${file.replace('-queries.txt','')}.run`, {flags: 'a'});


    for await (const line of rl) {

      if(line !=''){

        console.log(line);

        // extract query keywords
        let split = line.split(' ');
        let queryID = split.shift();
        let keywords = split.join(' ');

        //send search request to Elas4RDF service
        let res = await fetch(`${localConfig.elas4rdf_search}/?id=${localConfig.datasetID}&query=${encodeURIComponent(keywords)}&type=entities`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json();

        console.log(data.results.total_entities);

        let rank = 1 ;

        for (let entity of data.results.entities){
          let run_entry = `${queryID} Q0 ${entity.entity.replace(localConfig.ns.entity, '')} ${rank} ${entity.score} ${sim}`;
          trecRun.write(run_entry);
          trecRun.write('\r\n');
          rank ++ ;
        }

      }

    }

    rl.close();

  }
}
