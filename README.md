# KeySearchWiki
## An Automatically Generated Dataset for Keyword Search over Wikidata
KeySearchWiki is a dataset for evaluating keyword search systems over [Wikidata](https://www.wikidata.org/wiki/Wikidata:Main_Page).
This dataset is particularly designed for the Type Search task (as defined by [J. Pound et al.](https://dl.acm.org/doi/pdf/10.1145/1772690.1772769) under Type Query), where the goal is to retrieve a list of entities having a specific type given by a user query (e.g., Paul Auster novels).

KeySearchWiki consists of 14745 queries and their corresponding relevant Wikidata entities.
The dataset was automatically generated by leveraging Wikidata and Wikipedia set categories (e.g., [Category:American television directors](https://www.wikidata.org/wiki/Q8032156)) as data sources for both relevant entities and queries.
Relevant entities are gathered by carefully navigating the Wikipedia set categories hierarchy in all available languages.
Furthermore, those categories are refined and combined to derive more complex queries (e.g., multi-hop queries).

The dataset generation workflow is explained in detail in the paper and the steps needed to reproduce the generated dataset and intermediate results are described in [Reproduce dataset generation](#reproduce-dataset-generation).

## Usage

### Format
The KeySearchWiki dataset is published on [Zenodo](https://doi.org/10.5281/zenodo.4955200) and includes the following files:

- `KeySearchWiki-JSON.json`: the set of final dataset entries in JSON format. Each data entry consists of the following properties:

| Property | Description | Example |
| --- | --- | --- |
| `queryID` | Unique identifier of the query given by `prefix-number`, where prefix = [NT (native), MK (multi-keyword), or MH (multi-hop)] | `NT12986`, `MK18808`, `MH76`|
| `query` | Natural language query in this form: <keyword1 keyword2 ... target>| `female Germany television actor human` |
| `keywords` | IRIs of the entities (or literals) corresponding to the keywords in Wikidata, together with their labels, types and a boolean indicator `isiri`. If the keyword is literal `isiri = false`, if it is an IRI `isiri = true` | `{"iri":"Q183","label":"Germany","isiri":"true","types":[{"type":"Q6256","typeLabel":"country"},{"type":"Q43702","typeLabel":"federation"},{"type":"Q3624078","typeLabel":"sovereign state"},{"type":"Q63791824","typeLabel":"countries bordering the Baltic Sea"}]`|
| `target` | Type of entities to retrieve given by its Wikidata IRI and label | `{"iri":"Q5","label":"human"}` |
| `relevantEntities` | Entities that are relevant results to the query given by their Wikidata IRI and label | `{"iri":"Q16904614","label":"Zoological Garden of Monaco"}` as relevant result to the query `Europe zoo` |

- `KeySearchWiki-queries-label.txt`: A text file containing the queries. Each line containing space-seperated queryID and query: `MK18808 programmer University of Houston human`.
- `KeySearchWiki-queries-iri.txt`: A text file containing queries, each line contains space-seperated queryID and IRIs of query elements: `MK18808 Q5482740 Q1472358 Q5` (could be be directly used by systems that omit a preceding [Entity Linking](https://en.wikipedia.org/wiki/Entity_linking) step).
- `KeySearchWiki-qrels-trec.txt`: A text file containing relevant entities in the [TREC format](https://trec.nist.gov/data/qrels_eng/): `MK18808 0 Q92877 1`.

### Examples

| queryID | query | keywords | target | relevantEntities
| --- | --- | --- | --- | --- |
| NT12986 | female Germany television actor human | female(Q6581072), Germany(Q183), television actor(Q10798782) | human(Q5) | e.g., Q100220, Q100269|
| MK18808 | programmer University of Houston human | programmer(Q5482740), University of Houston(Q1472358)| human(Q5) | e.g., Q92877, Q6847972|
| MH76 | World Music Awards album | World Music Awards(Q375990) | album(Q482994) | e.g., Q1351397, Q4802828|

## Reproduce dataset generation
### Dataset generation workflow
The dataset generation workflow is illustrated in the following figure (see paper for more details).

![approach!](figs/approach.png)

The dataset is accompanied with cache files ([KeySearchWiki-cache.zip](https://doi.org/10.5281/zenodo.4946914)), a collection of SQLite database files containing all data retrieved either from Wikidata/Wikimedia endpoints via SPARQL/[MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page) in the candidate generation step during the period from February to April 2021.
The dataset generation pipeline consumes the cache.

To reproduce the workflow, the steps below should be followed:

1. Install [Node.js (version v14.16.1 or higher)](https://nodejs.org/en/)
2. Install dependencies: run `npm install` in the project root folder.
3. In the root folder create a folder `./cache/` , unzip `KeySearchWiki-cache.zip` and put the content of the inner folder `cache-backup-V2` in the created `cache` folder.
4. To generate the raw entries run `npm run generateCandidate` in the root folder. The output files can be found under `./dataset/` . In addition to log files (debugging), statistics files, the pipeline initial output is: `./dataset/raw-data.json`.
5. To generate the intermediate entries run `npm run cleanCandidate` in the root folder. Find the output entries under: `./dataset/intermediate-dataset.json`.
6. To generate the native entries run `npm run generateNativeEntry` in the root folder. Find the output entries under: `./dataset/native-dataset.json` (together with statistics (dataset characteristics) and metrics (Filtering criteria) files).
7. To generate the multi-hop new entries: first create the Keyword Index by running `npm run generateKeywordIndex`. After the process has finished, run `npm run generateNewEntryHop` to generate the entries. Find the output data under: `./dataset/new-dataset-multi-hop.json` (together with statistics/metrics files).
8. To generate the multi-keyword new entries run `npm run generateNewEntryKW`. Find the output under: `./dataset/new-dataset-multi-key.json` (together with statistics/metrics files).
9. To generate the final entries. First merge all the entries by running `npm run mergeEntries`. After the process has finished, run `npm run diversifyEntries` to perform the Entry Selection step. Find the output file under: `./dataset/final-dataset.json`. Generate statistics/metrics files by running `npm run generateStatFinal`.
10. Generate the files in final format described in [Format](#format) by running `npm run generateFinalFormat`. All KeySearchWiki dataset files are also found under `./dataset`.

Note that some steps will take a long time. Consider waiting till each process has finished.

### Dataset characteristics and analysis
One could be interested in producing some charts (ones in paper) to have more insights about the dataset characteristics and specially about how the used metrics are distributed over the final entries (coverage, number of relevant entities, and number of query terms (keyword+target), see paper for more details).

Another interesting point is to analysis relevant entities produced via SPARQL and their counterparts in KeySearchWiki dataset (see Limitations section in paper).

To generate those chart, first run `npm run compareSPARQL`. After the process has finished, run `npm run generatePlots` generatePlots to generate all charts. Find them under `./charts/`.

<!---## Cite , consider updating codemeta with paper link and also zenodo metadata-->

## License
This project is licensed under the [MIT License](https://github.com/fusion-jena/KeySearchWiki/blob/master/LICENSE).
