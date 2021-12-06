import Config from '../../../config/config';
import { getObjectValues } from '../../util';

import Fs from 'fs';
import Path from 'path';
import Util from 'util';


// set up temp file
const tempFilePath = Path.join( Config.cachePath, 'getDirectTypes.tmp.tsv' );
const tempFile = Fs.createWriteStream( tempFilePath, {});
const appendTemp = Util.promisify( tempFile.write ).bind( tempFile );

export default async function getDirectTypes( entry ){

  // store direct classes for all entities
  const classes = getObjectValues( entry, 'P31' );
  if( classes ){
    appendTemp(JSON.stringify({ page: entry.id, result: classes }) );
    appendTemp('\n');
  }

}
