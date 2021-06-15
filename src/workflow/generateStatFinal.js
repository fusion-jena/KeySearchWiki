import * as fs                          from 'fs';
import generateStatFinal                from './../final-dataset-generation/generateStat';

(async function(){

  generateStatFinal(fs,'final-dataset.json','statistics-final-dataset.json');

})();
