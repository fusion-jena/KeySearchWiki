/**
 * construct sparql query to execute sparql query of a set category
 * @param     {String}             sparqlID      id for sparqlquery (actual sparql query removing any spaces/special characters)
 * @param     {String}             path          actual sparql query corrsponding to set category
 */

export default function getSparql( sparqlID, path ) {

  return   `
    SELECT DISTINCT ?query ?item
    WHERE
    {
      VALUES ?query {<${sparqlID}>}
      OPTIONAL { ${path} }
    }
    `;

}
