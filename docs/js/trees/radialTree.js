/*
This file is part of the mitoTree project and authored by Noah Hurmer.

Copyright 2024, Noah Hurmer & mitoTree.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/


/*
This file handles the creation of the radial tree visible on the home page.
A lot of this is basically D3 boilerplate
*/


// initializes the radial tree from a json data path
function createRadialTree(dataUrl) {
    d3.select("#radial-tree").select("svg").remove();

    const width = 1000;
    const height = 1000;
    const cx = width * 0.5;
    const cy = height * 0.56;
    const radius = Math.min(width, height) / 2 - 20;

    d3.json(dataUrl).then(function(data) {
        const tree = d3.tree()
            .size([2 * Math.PI, radius])
            // separates nodes from each other
            .separation((a, b) => {
                    // calc separation based on depth
                    const depthFactor = 1 / (a.depth + 1);
                    return (a.parent === b.parent ? 1 : 2) * depthFactor;
                });
        const root = tree(d3.hierarchy(data)
            // following line would be ordering of the nodes
            // .sort((a, b) => d3.ascending(a.data.name, b.data.name))
        );

        const maxDepth = getMaxDepth(root);

        // init svg element
        const svg = d3.select("#radial-tree")
            .append("svg")
            .attr("id", "radial-svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [-cx, -cy + 50, width, height]);


        // code remnant used to draw background arcs
        // keeping it in for now in case we want to make this viz downloadable
        //
        // const effectiveSeparation = calculateEffectiveAngularSeparation(root);
        //
        // svg.append("g")
        //     .attr("class", "background-arcs")  // Add a specific class for these paths
        //     .selectAll("path")
        //     .data(root.descendants())
        //     .join("path")
        //     .attr("d", d => {
        //         const depthDistance = radius / root.height;
        //         const shiftAmount = (1 / 5) * depthDistance;
        //     return calculateArcPath(d, depthDistance, shiftAmount, effectiveSeparation);
        // })
        //     .style("fill", d => d.data.colorcode || "transparent")
        //     .style("stroke", "none")
        //     .style("opacity", 0.3);


        // tree links using 'path' elements
        svg.append("g")
            .attr("class", "tree-links")
            .selectAll("path")
            .data(root.links())
            .join("path")
            .attr("d", d => rightAnglePath(d.source, d.target))
            .style("stroke", "#ccc")
            // would color the links
            //.style("stroke", d => d.source.data.colorcode || "#ccc")
            .style("stroke-width", 2.5)
            .style("fill", "none");

        // nodes (circles)
        svg.append("g")
            .selectAll("circle")
            .data(root.descendants())
            .join("circle")
            .on("click", click)
            .attr("cursor", "pointer")
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
            .style("fill", d => d.data.colorcode || "#999")
            .attr("r", 5.5);

        // node labels
        svg.append("g")
            .selectAll("text")
            // only add labels to superhaplos
            .data(root.descendants().filter(d => d.data.is_superhaplo === true))
            .join("text")
            .on("click", click)
            .attr("cursor", "pointer")
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0) rotate(${d.x >= Math.PI ? 180 : 0})`)
            .attr("dy", "0.31em")
            // change label offset from node position based on node it is root and on which side it is
            .attr("x", d => {
                if (!d.parent) return -6;
                if (d.x < Math.PI) {
                    return 6;
                } else {
                    return -6;
                }
            })
            // change label starting position based on if node is root and on which side it is
            .attr("text-anchor", d => {
                if (!d.parent) {
                    return "end"
                } else {
                    // meh not sure this works well with new data
                    if (d.data.name.length > 4) {
                        return "middle"
                    } else {
                        if (d.x < Math.PI) {
                            return "start"
                        } else {
                            return "end"
                        }
                    }
                }
            })
            .text(d => truncateText(d.data.name, radius / maxDepth))
            // fixed label font size; maybe not great
            .style("font", "15px sans-serif")
            // make root label font bolder
            .style("font-weight", d => !d.parent ? 700 : 500);

    }).catch(function(error) {
        console.error('Error loading or processing the JSON data:', error);
    });
}

// used path in this tree
// given two nodes, returns a d3 like path string
// that has a circular arc at some offset between radial likes to and from the nodes
function rightAnglePath(s, d) {
    const sx = s.y * Math.cos(s.x - Math.PI / 2);
    const sy = s.y * Math.sin(s.x - Math.PI / 2);

    // offset
    const radialDiff = 2 * (d.y - s.y) / 2.75;

    const arcEndX = (s.y + radialDiff) * Math.cos(d.x - Math.PI / 2);
    const arcEndY = (s.y + radialDiff) * Math.sin(d.x - Math.PI / 2);

    const ex = d.y * Math.cos(d.x - Math.PI / 2);
    const ey = d.y * Math.sin(d.x - Math.PI / 2);

    // flags that decide which way the arcs go
    let largeArcFlag = 0;
    let sweepFlag = 1;
    if (s.x > d.x) {
        sweepFlag = 0;
    }

    const midX = (s.y + radialDiff) * Math.cos(s.x - Math.PI / 2);
    const midY = (s.y + radialDiff) * Math.sin(s.x - Math.PI / 2);

    return `M ${sx},${sy}
            L ${midX},${midY}
            A ${s.y + radialDiff},${s.y + radialDiff} 0 ${largeArcFlag},${sweepFlag} ${arcEndX},${arcEndY}
            L ${ex},${ey}`;
}


// maximum depth level of the tree
function getMaxDepth(root) {
    let maxDepth = 0;

    root.each(function(d) {
        if (d.depth > maxDepth) {
            maxDepth = d.depth;
        }
    });

    return maxDepth;
}

// click event handler that redirects to the node info page
function click(event, d) {
    window.location.href = `nodeInfo.html?nodeId=${encodeURIComponent(d.data.name)}`;
}



// ******** remnants section **********
// following functions were used at some point and are kept for now
// in case we want to make these viz styles downloadable

// used to calculate radial angular separation for nodes
// this is used so that lineages cannot radial intersect each other
// given tree root, it returns a dict of separations per depth
function calculateEffectiveAngularSeparation(root) {
    const angularSeparation = {};

    // traverse the tree and calculate the angular separation
    root.descendants().forEach(d => {
        if (d.parent) {
            const siblings = d.parent.children;
            const index = siblings.indexOf(d);

            if (index > 0) {
                const prevSibling = siblings[index - 1];
                const separation = Math.abs(d.x - prevSibling.x);

                if (!angularSeparation[d.depth]) {
                    angularSeparation[d.depth] = [];
                }
                angularSeparation[d.depth].push(separation);
            }
        }
    });

    // calculate the average angular separation for each depth
    for (const depth in angularSeparation) {
        const separations = angularSeparation[depth];
        angularSeparation[depth] = separations.reduce((a, b) => a + b, 0) / separations.length;
    }

    return angularSeparation;
}

// number of nodes per depth
// given tree root, returns dict of node numbers per depth
function calculateNodesAtDepth(root) {
    const depthCounts = {};

    root.descendants().forEach(d => {
        if (!depthCounts[d.depth]) {
            depthCounts[d.depth] = 0;
        }
        depthCounts[d.depth]++;
    });

    return depthCounts;
}

// used to calculate the background arcs used previously
function calculateArcPath(d, depthDistance, shiftAmount, separationAngles) {
    let startAngle = d.x;
    let endAngle = d.x;

    const separationAngle = separationAngles[d.depth]

    if (d.parent && d.parent.children.length > 1) {
        const siblings = d.parent.children.filter(sibling => sibling !== d);

        // Find the nearest siblings on both sides
        const prevSibling = siblings.reduce((prev, curr) => (curr.x < d.x && (!prev || curr.x > prev.x)) ? curr : prev, null);
        const nextSibling = siblings.reduce((next, curr) => (curr.x > d.x && (!next || curr.x < next.x)) ? curr : next, null);

        console.log(`Node: ${d.data.name}, currentX: ${d.x}, prevSibling: ${prevSibling ? prevSibling.x : null}, nextSibling: ${nextSibling ? nextSibling.x : null}`);

        // Calculate start and end angles
        let lowerSep = d.x - separationAngle / 2
        let upperSep = d.x + separationAngle / 2

        // TODO so this next check is sorta problematic. Without the following, it overdraws its kids on the outside
        // if this check is put outside its parents if check (as the commented out code below), it wont overdraw its
        // kids in both directions, but also creates a lot of color holes
        // decide what to do
        // if we decide to let it overdraw its kinds no matter what, then remove the added complexity of supplying this
        // function with the full dict of separationAngles
        // if (d.children && d.children.length > 0) {
        //     lowerSep = Math.max(lowerSep, d.children[0].x - separationAngles[d.depth + 1] / 2)
        //     upperSep = Math.min(upperSep, d.children[d.children.length - 1].x + separationAngles[d.depth + 1] / 2)
        // }

        const prevAngle = prevSibling ? (d.x + prevSibling.x) / 2 : lowerSep;
        const nextAngle = nextSibling ? (d.x + nextSibling.x) / 2 : upperSep;

        startAngle = prevAngle;
        endAngle = nextAngle;

    } else if (d.parent) {
        // if no siblings, use the separation distance of that depth
        startAngle = d.x - separationAngle / 2;
        endAngle = d.x + separationAngle / 2;
    }

    // TODO the other part of the overdraw children check
    if (d.children && d.children.length > 0) {
        const childMinAngle = d.children[0].x - separationAngles[d.depth + 1] / 2;
        const childMaxAngle = d.children[d.children.length - 1].x + separationAngles[d.depth + 1] / 2;

        startAngle = Math.max(startAngle, childMinAngle);
        endAngle = Math.min(endAngle, childMaxAngle);
    }

    console.log(`Node: ${d.data.name}, startAngle: ${startAngle}, endAngle: ${endAngle}`);

    const arc = d3.arc()
        .innerRadius(d.y - shiftAmount - depthDistance / 2)
        .outerRadius(d.y - shiftAmount + depthDistance / 2)
        .startAngle(startAngle)
        .endAngle(endAngle);
    return arc();
}

// different link path variants tried out
// just a direct path from node to node in a radial tree
function straightPath(s, d) {
    const sx = s.y * Math.cos(s.x - Math.PI / 2);
    const sy = s.y * Math.sin(s.x - Math.PI / 2);
    const dx = d.y * Math.cos(d.x - Math.PI / 2);
    const dy = d.y * Math.sin(d.x - Math.PI / 2);

    return `M ${sx},${sy}
        L ${dx},${dy}`;
}
// curved path from node to node
function orthogonalPath(s, d) {
    const sx = s.y * Math.cos(s.x - Math.PI / 2);
    const sy = s.y * Math.sin(s.x - Math.PI / 2);

    const radialDiff = 2 * (d.y - s.y) / 2.75;

    const arcEndX = (s.y) * Math.cos(d.x - Math.PI / 2);
    const arcEndY = (s.y) * Math.sin(d.x - Math.PI / 2);

    const ex = d.y * Math.cos(d.x - Math.PI / 2);
    const ey = d.y * Math.sin(d.x - Math.PI / 2);

    let largeArcFlag = 0;
    let sweepFlag = 1;
    if (s.x > d.x) {
        sweepFlag = 0;
    }

    const midX = (s.y + radialDiff) * Math.cos(s.x - Math.PI / 2);
    const midY = (s.y + radialDiff) * Math.sin(s.x - Math.PI / 2);

    return `M ${sx},${sy}
            A ${s.y + radialDiff},${s.y + radialDiff} 0 ${largeArcFlag},${sweepFlag} ${arcEndX},${arcEndY}
            L ${ex},${ey}`;
}
