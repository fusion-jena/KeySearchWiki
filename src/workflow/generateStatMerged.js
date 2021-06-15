import * as fs                          from 'fs';
import generateStatMerged               from './../final-dataset-generation/generateStat';

(async function(){

  generateStatMerged(fs, 'merged-dataset.json', 'statistics-merged-dataset.json');

})();
