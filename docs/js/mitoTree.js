/*
This file is part of the mitoTree project and authored by Noah Hurmer.

Copyright 2024, Noah Hurmer & mitoTree.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/


/*
This file handles the loading of all trees on the page as well as any tree controls.

Following is handled:
 - Radial Tree
    - initial loading
    - downloading the svg

 - Linear Tree
    - initial loading
    - scrolling, dragging, centering
    - searching nodes & search controls
    - resetting, expanding
    - downloading svg

 */

document.addEventListener('DOMContentLoaded', function () {
    const radialTreeContainer = document.getElementById('radial-tree');
    const collapsibleTreeContainer = document.getElementById('collapsible-tree');
    let collapsibleTreeInitialized = false;
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    let currentMatchIndex;
    let matchedNodes = [];


    // initialize the radial tree if on the home page
    if (radialTreeContainer) {
        initRadialTree();
    }


    const urlParams = new URLSearchParams(window.location.search);
    const nodeId = urlParams.get('nodeId');

    // init collapsible tree
    const nodeAsRoot = urlParams.get('nodeAsRoot') === 'true';
    if (collapsibleTreeContainer) {
        initCollapsibleTree(nodeId, nodeAsRoot);

        if (nodeId && !nodeAsRoot) {
            const pollingInterval = setInterval(function () {
                const highlightedNodes = d3.select('#collapsible-tree').selectAll('g.node').filter(function (d) {
                    return d.matched === true;
                });

                if (!highlightedNodes.empty()) {
                    const highlightNode = highlightedNodes.node();
                    scrollToNode(highlightNode);
                    clearInterval(pollingInterval); // Stop polling
                }
            }, 200);
        }
    }

    // dragging of tree handled here
    if (collapsibleTreeContainer) {
        let isDragging = false;
        let startX;
        let scrollLeft;

        // mouse down event to start dragging
        collapsibleTreeContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            collapsibleTreeContainer.classList.add('dragging');
            startX = e.pageX - collapsibleTreeContainer.offsetLeft;
            scrollLeft = collapsibleTreeContainer.scrollLeft;
        });

        // mouse leave event to stop dragging
        collapsibleTreeContainer.addEventListener('mouseleave', () => {
            isDragging = false;
            collapsibleTreeContainer.classList.remove('dragging');
        });

        // mouse up event to stop dragging
        collapsibleTreeContainer.addEventListener('mouseup', () => {
            isDragging = false;
            collapsibleTreeContainer.classList.remove('dragging');
        });

        // mouse move event to perform dragging
        collapsibleTreeContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - collapsibleTreeContainer.offsetLeft;
            const walk = (x - startX); // scroll speed multiplier
            collapsibleTreeContainer.scrollLeft = scrollLeft - walk;
        });
    }

    // enter press action handler when searching on collapsible tree
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchButton.click();
            }
        });
    }

    // event handler for search button
    if (searchButton) {
        searchButton.addEventListener('click', function () {
            searchTerm = searchInput.value.trim();
            if (!searchTerm) {
                resetSearch();
            } else {
                const { bestMatchNode, resultsNumber } = searchNodes(searchTerm);
                document.getElementById('search-results').textContent = `${resultsNumber} match(es) found`;
                currentMatchIndex = matchedNodes.indexOf(bestMatchNode);
                if (resultsNumber > 0) {
                    scrollToNode(bestMatchNode);
                    showNavigationButtons(); // show "Previous" and "Next" buttons
                } else {
                    hideNavigationButtons();
                }
            }
        });
    }

    // event listeners for "Previous" and "Next" buttons
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');

    function changeFocus(next = true) {
        if (matchedNodes.length > 0) {

                // clear previous
                d3.selectAll('g.node').each(function (d) {
                    d.focused = false;
                });

                const offset = next ? 1 : -1;
                currentMatchIndex = (currentMatchIndex + offset + matchedNodes.length) % matchedNodes.length;
                const prevNode = matchedNodes[currentMatchIndex];

                // mark new node to be focused
                d3.select(prevNode).datum().focused = true;

                update(root);
                resizeContainer(root);

                scrollToNode(prevNode);
        }
    }

    if (prevButton) {
        prevButton.addEventListener('click', function () {
            changeFocus(false);
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', function () {
            changeFocus(true);
        });
    }

    // searching nodes and returning the best match and results count given the search input string
    function searchNodes(searchTerm) {
        let bestMatchNode = null;
        let bestScore = Infinity;
        let resultsNumber = 0;

        matchedNodes = [];

        d3.selectAll('g.node').each(function (d) {
            d.matched = false;
            d.bestMatch = false;
        });

        d3.selectAll('g.node').each(function (d) {
            const nodeName = d.data.name;
            if (nodeName.includes(searchTerm)) {
                d.matched = true; // mark to be highlighted
                matchedNodes.push(this); // all matched nodes stored here
                resultsNumber++;

                // calculate similarity score to determine best match
                const score = nodeName.length - searchTerm.length;
                if (score < bestScore) {
                    bestScore = score;
                    bestMatchNode = this;
                }
            }
        });

        // mark best match node to be highlighted
        if (bestMatchNode) {
            d3.select(bestMatchNode).datum().focused = true;
        }

        // sort matched nodes by their x position (vertical order)
        matchedNodes.sort((a, b) => {
            const nodeA = d3.select(a).datum();
            const nodeB = d3.select(b).datum();
            return nodeA.x - nodeB.x;
        });

        update(root);
        resizeContainer(root);

        return { bestMatchNode, resultsNumber };
    }

    // helpers to display search buttons
    function showNavigationButtons() {
        prevButton.style.display = 'inline-block';
        nextButton.style.display = 'inline-block';
    }
    function hideNavigationButtons() {
        prevButton.style.display = 'none';
        nextButton.style.display = 'none';
    }

    // scroll the container to a specific node
    function scrollToNode(node) {
        if (node && collapsibleTreeContainer) {
            const containerRect = collapsibleTreeContainer.getBoundingClientRect();
            const nodeRect = node.getBoundingClientRect();

            // horizontal scroll
            const currentScrollLeft = collapsibleTreeContainer.scrollLeft;
            const offsetLeft = nodeRect.left - containerRect.left;
            const newScrollLeft = currentScrollLeft + offsetLeft - (containerRect.width / 2) + (nodeRect.width / 2);

            collapsibleTreeContainer.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth'
            });

            // vertical scroll
            const nodeCenterY = nodeRect.top + window.scrollY - (window.innerHeight / 2) + (nodeRect.height / 2);

            window.scrollTo({
                top: nodeCenterY,
                behavior: 'smooth'
            });

        } else {
            console.error('Node or container not found.');
        }
    }

    // resets search input fields and highlights
    function resetSearch() {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.textContent = '';
        }
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        resetSearchResults(); // function from collapsibleTree.js
        matchedNodes = [];
        currentMatchIndex = 0;
        hideNavigationButtons();
    }

    // reset search results and remove all highlights
    function resetSearchResults() {
        d3.selectAll('g.node').each(function(d) {
            d.matched = false;
            d.focused = false;
        });

        // Re-render the tree to update highlights
        update(root);
        resizeContainer(root);

        // Hide navigation buttons
        hideNavigationButtons();
    }

    // handles redrawing the collapsible tree to the initial state
    const resetTreeButton = document.getElementById('reset-tree-button');
    if (resetTreeButton) {
        resetTreeButton.addEventListener('click', function () {
            resetSearch();

            const urlParams = new URLSearchParams(window.location.search);
            const nodeId = urlParams.get('nodeId');

            if (collapsibleTreeContainer) {
                // hadle subtree or full tree
                if (nodeId) {
                    createCollapsibleTree("data/tree.json", nodeId);
                } else {
                    createCollapsibleTree("data/tree.json");
                }
            }
        });
    }

    // event handler that fully expands collapsible tree
    const expandTreeButton = document.getElementById('expand-tree-button');
    if (expandTreeButton) {
        expandTreeButton.addEventListener('click', function () {
            resetSearch();
            expandFully();
        });
    }

    // download button handler
    const downloadButton = document.getElementById('download-button');
    if (downloadButton) {
        downloadButton.addEventListener('click', function () {
            let svgElement;

            if (radialTreeContainer) {
                svgElement = radialTreeContainer.querySelector('svg');
            } else if (collapsibleTreeContainer) {
                svgElement = collapsibleTreeContainer.querySelector('svg');
            }

            if (svgElement) {
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(svgElement);

                const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(svgBlob);
                const downloadLink = document.createElement("a");
                downloadLink.href = url;
                downloadLink.download = "tree.svg";  // name of the downloaded file
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);
            } else {
                console.error("No SVG element found to download.");
                alert("No SVG element found to download.");
            }
        });
    }


    // initialize the radial tree by calling function from radialTree.js
    function initRadialTree() {
        try {
            createRadialTree("data/radialTree.json");
            console.log('Radial tree initialized successfully.');
        } catch (error) {
            console.error('Error initializing radial tree:', error);
        }
    }

    // initialize the collapsible tree by calling function from collapsibleTree.js
    // if given a nodeId, inits with that node as root used for subtrees
    function initCollapsibleTree(nodeId = null, nodeAsRoot = false) {
        try {
            if (nodeId) {
                createCollapsibleTree("data/tree.json", nodeId, nodeAsRoot);
            } else {
                createCollapsibleTree("data/tree.json");
            }
            console.log('Collapsible tree initialized successfully.');
        } catch (error) {
            console.error('Error initializing collapsible tree:', error);
        }
    }
});
