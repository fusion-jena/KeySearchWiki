import Config from '../../../config/config';
import { getObjectValues } from '../../util';

import Fs from 'fs';
import Path from 'path';
import Util from 'util';

// set up temp file
const tempFilePath = Path.join( Config.cachePath, 'getSubclasses.tmp.tsv' );
const tempFile = Fs.createWriteStream( tempFilePath, {});
const appendTemp = Util.promisify( tempFile.write ).bind( tempFile );


/**
 * collect a file with class / superclass relations
 */
export default async function getClassHierarchy( entry ) {

  const superclasses = getObjectValues( entry, 'P279' );
  if( superclasses ) {
    await appendTemp(
      superclasses.map( (c) => `${entry.id}\t${c}`)
        .join( '\n' )
      + '\n'
    );
  }

}
