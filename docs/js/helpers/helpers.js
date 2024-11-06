/*
This file is part of the mitoTree project and authored by Noah Hurmer.

Copyright 2024, Noah Hurmer & mitoTree.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/


// This file contains helper functions that are used in multiple scripts


// truncates text based on available space
function truncateText(text, maxWidth) {
    const maxChars = Math.floor(maxWidth / 5); // TODO think this way is a bit dumb
    return text.length > maxChars ? text.slice(0, maxChars - 1) + '..' : text;
}


// similarity of strings
// used to show/order best search result first
function getSimilarityScore(nodeName, searchTerm) {
    const positionIndex = nodeName.indexOf(searchTerm);
    const lengthDifference = Math.abs(nodeName.length - searchTerm.length);

    // score combines position index and length difference, with position index weighted higher for better matches
    return positionIndex + lengthDifference;
}


// used to highlight backmutations on the node info page
// makes backmutation hg signature snippet italic
function formatHGSignature(hgSignature) {
    if (!hgSignature) return 'N/A';
    // split the HG signature into individual mutations, assuming space separation
    const mutations = hgSignature.split(/\s+/);

    // regex for normal mutations:
    const normalMutationRegex = /^\d+(\.\d+)?[-a-z]$/i;

    // regex for backmutations:
    const backMutationRegex = /^[-a-z]\d+(\.\d+)?$/i;

    const formattedMutations = mutations.map(mutation => {
        if (backMutationRegex.test(mutation)) {
            return `<em>${mutation}</em>`;
        } else if (normalMutationRegex.test(mutation)) {
            return mutation;
        } else {
            return mutation;
        }
    });

    return formattedMutations.join(' ');
}

document.addEventListener('DOMContentLoaded', function () {
    const toTopButton = document.getElementById('toTopButton');

    if (toTopButton) {
        // show or hide button based on scroll position
        window.addEventListener('scroll', function () {
            if (window.scrollY > 200) {
                toTopButton.style.display = 'block';
            } else {
                toTopButton.style.display = 'none';
            }
        });

        // scroll to the top of the page
        toTopButton.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});



// remnant function used to gather a full hg signature recursively before a list of this was available
// kept for now
// concatenates HGs of all ancestors of a node
function getFullHG(node) {
    const hgMap = {};
    let currentNode = node;

    // traverse through the node and all ancestors in reverse order (youngest first)
    while (currentNode) {
        if (currentNode.data.HG) {
            const hgMutations = currentNode.data.HG.split(/\s+/);
            hgMutations.forEach(mutation => {
                const match = mutation.match(/^(\d+(?:\.\d+)?)([-a-z])$/i);
                if (match) {
                    const position = match[1];
                    const base = match[2];
                    // only add the mutation if it's not already in the map (first occurrence is the youngest)
                    if (!hgMap[position]) {
                        hgMap[position] = `${position}${base}`;
                    }
                }
            });
        }
        currentNode = currentNode.parent;
    }

    // extract the last mutations for each position and sort by numeric position
    const sortedMutations = Object.values(hgMap).sort((a, b) => {
        const posA = parseFloat(a.match(/^\d+(?:\.\d+)?/)[0]);
        const posB = parseFloat(b.match(/^\d+(?:\.\d+)?/)[0]);
        return posA - posB;
    });

    // join the sorted mutations into a single string
    return sortedMutations.join(' ');
}
