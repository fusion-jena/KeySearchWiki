import Config                   from './../config/config';
import JSONStream               from 'JSONStream';
import streamRawEntry           from './streamRawEntry';

/**
 * merge partial files from different folder into single file (folders should be placed in 'dataset' output folder)
 * (in case you manually run separate partial runs, happens when one retrieves data from sparql endpoint and one wants to continue from checkpoint after network error)
 *
 * @param     {Object}      fs              object for file system node module
 * @param     {String}      fileName        name of file to merge
 */

export default function mergeFiles(fs, fileName){

  console.log('Merging files. . .');

  let merged = fs.createWriteStream(Config.rawData, {flags: 'a'});
  merged.write('[');
  merged.write('\r\n');

  // helper function to get directories in a folder
  const getDirectories = sourceFolder =>
    fs.readdirSync(sourceFolder, { withFileTypes: true })
      .filter(type => type.isDirectory())
      .map(type => Config.outputGS + type.name + '/');

  //get all directories
  let directories = getDirectories(Config.outputGS);

  let directNr = directories.length ;

  directories.forEach(direct => {
    // use stream to read per element (parse does not work for large strings)
    let stream = fs.createReadStream(direct + fileName , {encoding: 'utf8'});

    let parser = JSONStream.parse('*');
    stream.pipe(parser);

    parser.on('data', entry => {
      try{
        let jsonString = JSON.stringify(entry);
        //remove url prefixes
        let removedPrefix = jsonString.replace(/http:\/\/www\.wikidata\.org\/entity\//gm, '');
        //write into output file
        merged.write(removedPrefix);
      }
      catch(e){
        if(e.message == 'Invalid string length'){
          streamRawEntry(entry,merged);
        }
      }
      merged.write(',');
      //add line break
      merged.write('\r\n');
    });

    parser.on('end', () => {
      directNr -- ;
      if(directNr == 0){
        merged.write(']');
      }
    });

  });

}
