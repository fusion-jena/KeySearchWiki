/**
 * stream writing entry, when JSON.Stringify fails by big json (Invalid string length)
 *
 *
 * @param     {Object}   data                 dateset entry
 * @param     {Object}   writeStream          writing stream object
 *
 *
 */

export default function streamRawEntry(data, writeStream){

  writeStream.write('{');

  Object.keys(data).forEach(key => {
    if(key != 'relevant'){
      writeStream.write(JSON.stringify(key));
      writeStream.write(':');
      writeStream.write(JSON.stringify(data[key]).replace(/http:\/\/www\.wikidata\.org\/entity\//gm, ''));
      if(key != 'comment'){
        writeStream.write(',');
      }
    }
    else{
      writeStream.write(JSON.stringify(key));
      writeStream.write(':');
      writeStream.write('{');
      Object.keys(data[key]).forEach(element => {
        if(element != 'wikipedia'){
          writeStream.write(JSON.stringify(element));
          writeStream.write(':');
          writeStream.write(JSON.stringify(data[key][element]).replace(/http:\/\/www\.wikidata\.org\/entity\//gm, ''));
          writeStream.write(',');
        }
        else{
          writeStream.write(JSON.stringify(element));
          writeStream.write(':');
          writeStream.write('[');
          let wikipediaArray = data[key][element];
          wikipediaArray.forEach(item => {
            writeStream.write('{');
            Object.keys(item).forEach( k => {
              if(!Array.isArray(item[k])){
                writeStream.write(JSON.stringify(k));
                writeStream.write(':');
                writeStream.write(JSON.stringify(item[k]).replace(/http:\/\/www\.wikidata\.org\/entity\//gm, ''));
                writeStream.write(',');
              }
              else{
                writeStream.write(JSON.stringify(k));
                writeStream.write(':');
                writeStream.write('[');
                item[k].forEach( (object, i) => {
                  writeStream.write(JSON.stringify(object).replace(/http:\/\/www\.wikidata\.org\/entity\//gm, ''));
                  if(i!=item[k].length - 1 ){
                    writeStream.write(',');
                  }
                });
                //close array in wikipedia item
                writeStream.write(']');
                if(k != 'catTypeCheckFailed'){
                  writeStream.write(',');
                }
              }
            });
            //close wikipedia item
            writeStream.write('}');
          });
          // close wikipedia array
          writeStream.write(']');
        }
      });
      //close relevant
      writeStream.write('}');
      writeStream.write(',');
    }
  });

  //close whole entry
  writeStream.write('}');
}
