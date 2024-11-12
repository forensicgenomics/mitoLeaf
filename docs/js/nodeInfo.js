/*
This file is part of the mitoTree project and authored by Noah Hurmer.

Copyright 2024, Noah Hurmer & mitoTree.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/


/*
File handles everything on the Haplogroup Info page.
That includes displaying the node attributes,
building the lineage tree,
retrieving the full hg signature as well as the profiles for this hg.

As it is dynamic, html element creation is handles here and not in the html file.
*/

document.addEventListener('DOMContentLoaded', function () {
    // url parameter used to decipher which node to show
    const urlParams = new URLSearchParams(window.location.search);
    const nodeId = urlParams.get('nodeId');
    const viewSubtreeButton = document.getElementById('view-subtree-button');
    const showInTreeButton = document.getElementById('show-in-tree-button');

    if (!nodeId) {
        document.getElementById('node-details').textContent = 'Node ID not found in the URL.';
        return;
    }

    // gather necessary data
    Promise.all([
        d3.json('data/hgmotifs.json'),
        d3.json('data/tree.json'),
        d3.csv('data/profiles.csv') // Load profiles data
    ]).then(([hgMotifsData, treeData, profilesData]) => {

        // build tree
        const root = d3.hierarchy(treeData);
        const node = root.descendants().find(d => d.data.name === nodeId);

        if (!node) {
            document.getElementById('node-details').textContent = 'Node not found in the data.';
            return;
        }

        // get full hg sig
        let fullHGSignature = hgMotifsData[nodeId] || 'N/A';

        // main block with profile and descendants sections in place
        document.getElementById('node-details').innerHTML = `
            <h2 class="card-title" style="align-items: center; background-color: ${node.data.colorcode || 'transparent'}">${node.data.name}
                <a href="documentation.html" title="More information" class="info-icon" style="padding-left: 10px; font-size: 16px; color: black;">ⓘ</a>
            </h2>
            <div class="card-body">
                <div class="card mb-3">
                    <div class="card-header"><strong>HG - Signature</strong></div>
                    <div class="card-body">${formatHGSignature(node.data.HG) || 'N/A'}</div>
                </div>
                <div id="profiles-section" class="card mb-3 d-none">
                    <div class="card-header"><strong>Representative Mitogenomes and Metadata</strong></div>
                    <div class="card-body table-responsive">
                        <table class="table table-bordered table-hover">
                            <thead>
                                <tr>
                                    <th>Accession Number</th>
                                    <th>Country</th>
                                    <th>Technology</th>
                                    <th>Assembly</th>
                                </tr>
                            </thead>
                            <tbody id="profile-list"></tbody>
                        </table>
                        <button id="show-more-profiles" class="btn btn-secondary d-none btn-sm">Show All</button>
                    </div>
                </div>
                <div class="card mb-3">
                    <div class="card-header"><strong>Lineage</strong></div>
                    <div class="card-body overflow-auto">
                        <div id="ancestor-tree"></div>
                    </div>
                </div>
                <div id="descendants-section" class="card mb-3 d-none">
                    <div class="card-header"><strong>Descendants</strong></div>
                    <div class="card-body">
                        <table class="table table-bordered table-hover">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>HG - Signature</th>
                                </tr>
                            </thead>
                            <tbody id="children-list"></tbody>
                        </table>
                        <button id="show-more-descendants" class="btn btn-secondary d-none btn-sm">Show All</button>
                    </div>
                </div>
                <div class="card mb-3">
                    <div class="card-header"><strong>Full HG - Signature</strong></div>
                    <div class="card-body">${formatHGSignature(fullHGSignature) || 'N/A'}</div>
                </div>
            </div>
        `;

        // lineage tree
        displayAncestors(getAncestors(node));
        // accession profiles table
        displayTable(node, profilesData, 'profiles-section', 'profile-list', 'show-more-profiles', 'profiles', 3, generateProfileRow);
        // children table
        displayTable(node, node.children || [], 'descendants-section', 'children-list', 'show-more-descendants', 'descendants', 3, generateHGRow);

        // subtree button handler to redirect to linear tree page
        if (viewSubtreeButton) {
            viewSubtreeButton.addEventListener('click', function () {
                console.log('Navigating to subtree of node:', nodeId);
                window.location.href = `explore_mitotree.html?nodeId=${encodeURIComponent(nodeId)}&nodeAsRoot=true`;
            });
        }

        // highlight in tree button handler to redirect to linear tree page
        if (showInTreeButton) {
            showInTreeButton.addEventListener('click', function () {
                console.log('Highlighting in full tree node:', nodeId);
                window.location.href = `explore_mitotree.html?nodeId=${encodeURIComponent(nodeId)}&nodeAsRoot=false`;
            });
        }

    }).catch(function (error) {
        console.error('Error loading or processing the JSON data:', error);
    });

    // given a node returns a list of all its parents until root
    function getAncestors(node) {
        const ancestors = [];
        let ancestor = node;

        while (ancestor) {
            ancestors.unshift(ancestor);
            ancestor = ancestor.parent;
        }
        return ancestors;
    }

    // generic table with a limit and a "Show All" button
    // the input "type" determines which table to display
    // supply the current node as well as the data to display in the table
    // supply the given list and button refs and row generating function
    // generates the table by calling the row gen function up to the supplied limit
    // builds the html element within the "sectionId"
    function displayTable(node, data, sectionId, listId, buttonId, type, limit, generateRowFn) {
        const section = document.getElementById(sectionId);
        const list = document.getElementById(listId);
        const showMoreButton = document.getElementById(buttonId);

        list.innerHTML = '';

        // filter input data based on type
        let filteredData = [];
        if (type === 'profiles' && node.data.profiles) {
            filteredData = data.filter(profile => {
                const matches = node.data.profiles.filter(nodeProfileAcc => {
                    // compare without trailing '+' but store value with + in data
                    // so that the table row shows the +
                    if (nodeProfileAcc.replace(/\+$/, '') === profile.accession_number) {
                        profile.accession_number = nodeProfileAcc;
                        return true;
                    }
                    return false;
                });

                return matches.length > 0; // Return true if there's a match
            });
        } else if (type === 'descendants') {
            filteredData = data;
        }

        if (filteredData.length > 0) {
            section.classList.remove('d-none');

            // generate rows up to limit number
            const initialData = filteredData.slice(0, limit);
            initialData.forEach(item => {
                list.appendChild(generateRowFn(item));
            });

            // button handler to extend limit
            if (filteredData.length > limit) {
                showMoreButton.classList.remove('d-none');
                showMoreButton.style.marginTop = '0px';
                showMoreButton.addEventListener('click', function () {
                    list.innerHTML = '';
                    filteredData.forEach(item => {
                        list.appendChild(generateRowFn(item));
                    });
                    showMoreButton.classList.add('d-none');
                });
            }
        } else {
            section.classList.add('d-none');
        }
    }

    // generates a table row for a given profile
    // returns html element
    function generateProfileRow(profile) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${profile.accession_number}</td>
            <td>${profile.country || 'N/A'}</td>
            <td>${profile.technology || 'N/A'}</td>
            <td>${profile.assembly || 'N/A'}</td>
        `;
        return row;
    }


    // create lineage tree from given ancestors
    function displayAncestors(ancestors) {
        const ancestorTreeDiv = document.getElementById('ancestor-tree');
        ancestorTreeDiv.innerHTML = '';

        // fixed node sizes
        const nodeSpacing = 70;
        // entire svg size
        const svgHeight = 70;
        const svgWidth = nodeSpacing * ancestors.length;

        const svg = d3.select('#ancestor-tree')
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight);

        // place nodes
        ancestors.forEach((d, i) => {
            d.x = (i + 0.5) * nodeSpacing;
            d.y = svgHeight / 2;
        });

        // create necessary links
        const ancestorLinks = ancestors.slice(1).map((d, i) => ({
            source: ancestors[i],
            target: d
        }));

        // paths between nodes
        svg.append("g")
            .selectAll("path")
            .data(ancestorLinks)
            .enter()
            .append("path")
            .attr("d", d => straightPath(d.source, d.target))
            .style("stroke", "#ccc")
            .style("stroke-width", 2.5)
            .style("fill", "none");

        // node circles with click event
        svg.selectAll('circle')
            .data(ancestors)
            .enter()
            .append('circle')
            .on("click", click)
            .attr("cursor", "pointer")
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', 5)
            .style('fill', d => d.data.colorcode || '#fff');

        // node labels
        svg.selectAll('text')
            .data(ancestors)
            .enter()
            .append('text')
            .on("click", click)
            .attr("cursor", "pointer")
            .attr('x', d => d.x)
            .attr('y', d => d.y - 15)
            .attr('text-anchor', 'middle')
            .style('font', '12px sans-serif')
            .text(d => truncateText(d.data.name, nodeSpacing));
    }

    // given two nodes, returns d3 like path sting as a simple straight path
    function straightPath(s, d) {
        return `M ${s.x},${s.y} L ${d.x},${d.y}`;
    }

    // on click handler for nodes in lineage tree that redirect to the respective node info page
    function click(event, d) {
        window.location.href = `nodeInfo.html?nodeId=${encodeURIComponent(d.data.name)}`;
    }
});
