/*
This file is part of the mitoTree project and authored by Noah Hurmer.

Copyright 2024, Noah Hurmer & mitoTree.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/


/*
This file handles the haplogroups.html page.
All functionalities  present there are handled here.

Data used is fetched from tree.json and hgmotifs.json for full-HG-Sinature during has mutation search mode.
 */

document.addEventListener('DOMContentLoaded', function () {
    const nodesTableBody = document.getElementById('nodes-table-body');
    const searchInputID = document.getElementById('node-search-input');
    const idSearchButton = document.getElementById('search-button');
    const caseToggle = document.getElementById('case-toggle');
    const searchInputHG = document.getElementById('nodeHG-search-input');
    const hgSearchButton = document.getElementById('searchHG-button');
    const searchModeToggle = document.getElementById('search-mode-toggle');
    const showMoreButton = document.getElementById('show-more-button');
    const resetButton = document.getElementById('reset-button');
    const tableHeader = document.getElementById('hg-header');

    let nodesData = [];
    // array to hold filtered search results
    let filteredNodesData = [];
    let hgMotifsData = {};
    let currentCount = 0;
    // number of rows to show initially
    const resultsPerPage = 100;

    searchInputID.value = '';
    searchInputHG.value = '';

    // render table rows up to 'resultsPerPage' rows
    function renderTablePage() {
        const startIndex = currentCount;
        const endIndex = currentCount + resultsPerPage;
        const pageData = filteredNodesData.slice(startIndex, endIndex);

        // need search terms here in order to highlight
        const HGsearchTerms = getHGSearchTerms();

        pageData.forEach(node => {
            // show full HG-Sig when has mutation mode is active, normal HG-Sig otherwise
            const hgSignature = searchModeToggle.checked ? hgMotifsData[node.data.name] : node.data.HG

            // highlighting and cursive backmutations
            let formattedHGSignature = formatHGSignature(hgSignature, HGsearchTerms);

            const row = generateHGRow(node, formattedHGSignature)

            nodesTableBody.appendChild(row);
        });

        currentCount += pageData.length;

        // show more button
        if (currentCount >= filteredNodesData.length) {
            showMoreButton.style.display = 'none';
        } else {
            showMoreButton.style.display = 'block';
        }
    }

    // event listener for the show more button
    showMoreButton.addEventListener('click', function() {
        renderTablePage(); // Append next 100 results
    });

    // initial render
    function renderTable() {
        currentCount = 0;
        nodesTableBody.innerHTML = '';
        renderTablePage();
    }

    // filter nodes based on all search fields
    function combinedFilterNodes() {
        const searchTermID = searchInputID.value.trim();
        const caseSesitive = caseToggle.checked;
        const searchTermHG = searchInputHG.value.trim().toUpperCase();
        const mutationMode = searchModeToggle.checked;
        const searchResultsCounter = document.getElementById('search-results-counter');
        const searchResultsText = document.getElementById('search-results-text');

        filteredNodesData = nodesData;

        // filter by ID
        if (searchTermID) {
            filteredNodesData = filteredNodesData.filter(node => {
                if (caseSesitive) {
                    return node.data.name.includes(searchTermID);
                } else {
                    return node.data.name.toLowerCase().includes(searchTermID.toLowerCase());
                }
            });

            // sort results by best fit, calculating similarity score
            filteredNodesData = filteredNodesData.map(node => {
                const similarityScore = getSimilarityScore(node.data.name, searchTermID);
                return { node, similarityScore };
            });
            filteredNodesData.sort((a, b) => a.similarityScore - b.similarityScore);
            filteredNodesData = filteredNodesData.map(item => item.node);
        }

        // filter by HG
        if (searchTermHG) {
            const HGsearchTerms = getHGSearchTerms();

            // searching based on what is selected on the mode toggle
            if (mutationMode) {
                // has mutation active, i.e. mutation present in full hg
                filteredNodesData = filteredNodesData.filter(node => {
                    const fullHGSignature = hgMotifsData[node.data.name];
                    if (fullHGSignature) {
                        return HGsearchTerms.every(term => rexSearch(term, fullHGSignature));
                    }
                    return false;
                });
            } else {
                // exact signature mode, mutation has to occur on current node
                filteredNodesData = filteredNodesData.filter(node => {
                    if (node.data.HG) {
                        const hgLowerCase = node.data.HG.toLowerCase();

                        return HGsearchTerms.every(term => rexSearch(term, hgLowerCase));
                    }
                    return false;
                });
            }
        }

        // only show search results, if the search fields are not empty
        if (searchTermID || searchTermHG) {
            searchResultsCounter.style.display = 'block';
            searchResultsText.textContent = `${filteredNodesData.length} result(s) found`;
        }

        updateTableHeader();
        renderTable();
    }


    // returns HG search terms from input split and wildcard removal
    function getHGSearchTerms() {
        const searchTermHG = searchInputHG.value.trim().toUpperCase();
        return searchTermHG.split(/[\s,]+/).filter(term => term.length > 0)
            .map(term => {
                if (term === '.') {
                    return '\\.';
                } else if (term.includes('.')) {
                    return term.replace(/\./g, '\\.');
                }
                return term;
            });
    }


    // changes table header of hg column dependent on toggle
    function updateTableHeader() {
        if (searchModeToggle.checked) {
            tableHeader.textContent = 'Full HG-Signature';
        } else {
            tableHeader.textContent = 'HG-Signature';
        }
    }


    // fetch data and initial render
    Promise.all([
        d3.json('data/tree.json'),
        d3.json('data/hgmotifs.json')
    ]).then(function([treeData, motifsData]) {
        nodesData = [];

        // has to be done manually rather than with d3s hierarchy to preserve order
        // traverse the treeData and wrap data in 'data' field
        function traverseInOrder(node) {
            const wrappedNode = {
                data: {
                    name: node.name,
                    HG: node.HG,
                    ...node  // all other properties
                }
            };

            nodesData.push(wrappedNode);

            if (node.children) {
                node.children.forEach(traverseInOrder);
            }
        }

        traverseInOrder(treeData);

        hgMotifsData = motifsData;

        resetAndRenderAllNodes();
    }).catch(function(error) {
        console.error('Error loading or processing the JSON data:', error);
    });


    // event listeners for search inputs
    if (idSearchButton && hgSearchButton) {
        idSearchButton.addEventListener('click', combinedFilterNodes);
        hgSearchButton.addEventListener('click', combinedFilterNodes);
    }

    // search action when pressing enter
    searchInputID.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            combinedFilterNodes();
        }
    });
    searchInputHG.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            combinedFilterNodes();
        }
    });

    // event listener for the reset button
    if (resetButton) {
        resetButton.addEventListener('click', function () {
            searchInputID.value = '';
            searchInputHG.value = '';
            searchModeToggle.checked = false;
            resetAndRenderAllNodes();
        });
    }

    // event listener of mutation mode search toggle to change table header
    searchModeToggle.addEventListener('change', function () {
        updateTableHeader();
        combinedFilterNodes();
    });


    // handle node info page navigation
    function showNodeInfo(node) {
        console.log('Navigating to node info page for:', node);
        window.location.href = `nodeInfo.html?nodeId=${encodeURIComponent(node.data.name)}`;
    }

    // helper fun to reset searches and initially render on page load
    // also handles counter and show more button
    function resetAndRenderAllNodes() {
        filteredNodesData = nodesData;

        renderTable();

        const searchResultsCounter = document.getElementById('search-results-counter');
        searchResultsCounter.style.display = 'none';

        if (filteredNodesData.length > resultsPerPage) {
            showMoreButton.style.display = 'block';
        } else {
            showMoreButton.style.display = 'none';
        }
    }

    // function to download the filtered nodes data as CSV
    function downloadCSV() {
        let csvContent = "data:text/csv;charset=utf-8,";

        csvContent += "ID,HG-Signature\n";
        filteredNodesData.forEach(node => {
            const row = `${node.data.name},${node.data.HG || 'N/A'}`;
            csvContent += row + "\n";
        });

        // create a downloadable link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "filtered_nodes.csv");
        document.body.appendChild(link);

        link.click();
        document.body.removeChild(link);
    }

    // event listener for download button
    document.getElementById('download-button').addEventListener('click', downloadCSV);

});
