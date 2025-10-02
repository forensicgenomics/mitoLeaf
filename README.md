# mitoLEAF Visualization

**mitoLEAF** (Mitochondrial DNA Lineage, Evolution, Annotation Framework) is a web-based tool designed to visualize and explore human mitochondrial DNA phylogenetic trees. It provides a way to browse haplogroups, view hierarchical tree structures, and examine detailed node information for individual mitochondrial mutations.
It gathers data from Genbank, builds a phylogenetic tree and plots it data using d3.js.

## WebApp

### Features
- **Explore mitoLeaf**: Interactive phylogenetic tree visualization, including radial and collapsible views.
- **Haplogroup Search**: Search for Haplogroups by ID or by HG signature.
- **Node Details**: Detailed view of HG information, including HG signatures, ancestors, descendants and profiles.
- **Downloads**: Different tree data files as well as visualizations available to download.

### Usage
Documentation on how to use the website in [Usage](docs/textfiles/documentation.md).

### Citation
Huber N, Hurmer N, Dür A, Parson W. [mitoLEAF: mitochondrial DNA Lineage, Evolution, Annotation Framework](https://pmc.ncbi.nlm.nih.gov/articles/PMC12153335/).

NAR Genom Bioinform. 2025 Jun 11;7(2). doi: 10.1093/nargab/lqaf079. PMID: 40503051; PMCID: PMC12153335.

## Development

### Project Structure

The web-app is in the directory 'docs/'.
'utils/' and other python files are the current tree creating pipeline.
Exact pipeline from end to end is still coming.


### Updating Version Workflow

The following describes the current way to update tree data:

    1. Replace any data files in `inputfiles` that have changed.
       Take care to name them the same. Reference `utils/path_defaults.py` if not clear.
       Mostly, update or add any `*source*_representatives.csv` and `*source*_metadata.csv` files when updating profiles.
       Tree files and last run date files should also be updated.
       Version is automatically read from these later two if possible.
    2. Execute `tree_dat_process.py` from the root directory.
    4. Add/Replace any relevant information regarding the new update in `textfiles/news.md`.

Currently, there is no streamlined way implemented to add new sources beyond the three existing ones. This may come in a future iteration.
    

### Contributing

Contributions are welcome! Please fork this repository and submit a pull request with any improvements, bug fixes, or new features.

### License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/). See the [LICENSE](./LICENSE) file for details.


## Acknowledgements

This project was funded by the FWF and developed in collaboration with the Institute of Mathematics LFU, AFDIL AFMES, and UNTHSC.
