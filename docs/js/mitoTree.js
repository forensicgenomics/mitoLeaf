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
        initCollapsibleTree(nodeId, nodeAsRoot, function() {
            if (nodeId && !nodeAsRoot) {
                const highlightedNodes = d3.select('#collapsible-tree').selectAll('g.node').filter(function (d) {
                    return d.matched === true;
                });

                if (!highlightedNodes.empty()) {
                    const highlightNode = highlightedNodes.node();
                    scrollToNode(highlightNode);
                }
            }
        });
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
            const searchInHidden = document.getElementById('tree-search-mode-toggle').checked;
            let searchTerm = searchInput.value.trim();
            if (!searchTerm) {
                resetSearch();
            } else {
                searchNodes(searchTerm, searchInHidden, function (bestMatchNode, resultsNumber) {
                    document.getElementById('search-results').textContent = `${resultsNumber} match(es) found`;
                    currentMatchIndex = matchedNodes.indexOf(bestMatchNode);
                    if (resultsNumber > 0) {
                        scrollToNode(bestMatchNode);
                        showNavigationButtons(); // show "Prev" and "Next" buttons
                    } else {
                        hideNavigationButtons();
                    }
                });
            }
        });
    }


    // event listeners for "Previous" and "Next" buttons
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');

    // used to change which node is focused
    // i.e. when using prev and next buttons
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
    function searchNodes(searchTerm, searchInHidden = false, callback=null) {
        let bestMatchNode = null;
        let bestScore = Infinity;
        let resultsNumber = 0;

        matchedNodes = [];
        let matchedDataNodes = [];

        // clear previous highlights
        d3.selectAll('g.node').each(function (d) {
            d.matched = false;
            d.focused = false;
        });

        // helpers to keep code dry
        // marks node to be highlighted and adds to matched array
        function markMatch(node) {
            node.matched = true; // mark node to be highlighted
            matchedDataNodes.push(node); // gather in array
        }
        // calc similarity score to determine best match and set it as such
        function updateBestMatch(node) {
            const score = node.data.name.length - searchTerm.length;
            if (score < bestScore) {
                bestScore = score;
                bestMatchNode = node;
            }
        }

        // recursive fun to search in all nodes and expand paths of matches
        function searchAllNodes(node) {
            if (node.data.name.includes(searchTerm)) {
                markMatch(node);
                updateBestMatch(node);

                // expand tree to show this node
                expandPathToNode(node);
            }

            let children = [];
            if (node.children) {
                children = node.children;
            }
            if (node._children) {
                children = children.concat(node._children);
            }
            children.forEach(child => {
                searchAllNodes(child);
            });
        }

        if (searchInHidden) {
            searchAllNodes(root);
        } else {
            // Search only visible nodes (DOM elements)
            d3.selectAll('g.node').each(function (node) {
                if (node.data.name.includes(searchTerm)) {
                    markMatch(node);
                    updateBestMatch(node);
                }
            });
        }

        resultsNumber = matchedDataNodes.length;

        // mark best match node to be focused
        if (bestMatchNode) {
            bestMatchNode.focused = true;
        }

        update(root, 0, function() {
            // map data nodes to DOM elements
            matchedDataNodes.forEach(function (d) {
                const nodeElement = d3.select('#collapsible-tree').selectAll('g.node').filter(function(datum) {
                    return datum === d;
                }).node();
                if (nodeElement) {
                    matchedNodes.push(nodeElement);
                }
            });

            // DOM element for the best match node
            if (bestMatchNode) {
                const bestMatchNodeElement = d3.select('#collapsible-tree').selectAll('g.node').filter(function(datum) {
                    return datum === bestMatchNode;
                }).node();

                if (bestMatchNodeElement) {
                    bestMatchNode = bestMatchNodeElement;
                } else {
                    bestMatchNode = null;
                }
            }

            // sort matched nodes by their x position to make navigating more sensible
            matchedNodes.sort((a, b) => {
                const nodeA = d3.select(a).datum();
                const nodeB = d3.select(b).datum();
                return nodeA.x - nodeB.x;
            });

            // instead of returning, use the callback to ensure no async problems when scrolling to the focused node
            if (callback) {
                callback(bestMatchNode, resultsNumber);
            }
        });
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
        const searchToggle = document.getElementById('tree-search-mode-toggle');

        searchToggle.checked = false;

        if (searchResults) {
            searchResults.textContent = '';
        }
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        resetSearchResults();
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

        // re-render the tree to update highlights
        update(root);

        hideNavigationButtons();
    }

    // handles redrawing the collapsible tree to the initial state
    const resetTreeButton = document.getElementById('reset-tree-button');
    if (resetTreeButton) {
        resetTreeButton.addEventListener('click', function () {
            resetSearch();

            // TODO which behaviour is desired?
            // reset to reset to specified subtree/highlighted node tree
            // or reset to completely base tree as if loading explore page without URL parameters
            // Another alternative to handle this could be to just load that page, not sure which is better


            // const urlParams = new URLSearchParams(window.location.search);
            // const nodeId = urlParams.get('nodeId');
            //
            // if (collapsibleTreeContainer) {
            //     // handle subtree or full tree
            //     if (nodeId) {
            //         createCollapsibleTree("data/tree.json", nodeId);
            //     } else {
            //         createCollapsibleTree("data/tree.json");
            //     }
            // }

            if (collapsibleTreeContainer) {
                createCollapsibleTree("data/tree.json")
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
    function initCollapsibleTree(nodeId = null, nodeAsRoot = false, callback = null) {
        try {
            createCollapsibleTree("data/tree.json", nodeId, nodeAsRoot, callback);
            console.log('Collapsible tree initialized successfully.');
        } catch (error) {
            console.error('Error initializing collapsible tree:', error);
        }
    }
});
