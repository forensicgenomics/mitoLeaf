/*
This file is part of the mitoTree project and authored by Noah Hurmer.

Copyright 2024, Noah Hurmer & mitoTree.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/


/*
This file handles the creation of the linear collapsible tree visible on the explore page.

creation as well as interactive behavior is handled here
 */


// necessary to handle viewing subtrees if called from nodeInfo page
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const nodeId = urlParams.get('nodeId');

    if (nodeId) {
        // load the collapsible tree with the specific subtree
        createCollapsibleTree("data/tree.json", nodeId);
    } else {
        // load the full collapsible tree if no nodeId is specified
        createCollapsibleTree("data/tree.json");
    }
});


let root, svg,
    width = 1000,
    height = 1000,
    i = 0,
    duration = 500;

// these are used as 'the size a node should have'
const overallWidth = 80;
const overallHeight = 21;

const margin = {top: 40, right: 90, bottom: 30, left: 90};
const container = d3.select("#collapsible-tree");

// man fun to initialize the tree
function createCollapsibleTree(dataUrl, rootNodeId = null) {
    d3.select("#collapsible-tree").select("svg").remove();

    svg = container.append("svg")
        .attr("id", "collapsible-svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    d3.json(dataUrl).then(function (treeData) {

        let rootNode;
        if (rootNodeId) {
            // if a specific node ID is provided, filter the tree to find that node and its descendants
            rootNode = filterSubtree(treeData, rootNodeId);
        } else {
            // otherwise, use the full tree
            rootNode = d3.hierarchy(treeData, d => d.children);
        }

        root = rootNode;
        root.x0 = height / 2;
        root.y0 = 0;

        // collapse the tree to specific nodes
        if (root.children) {
            root.children.forEach(collapse);
        }

        update(root);
        resizeContainer(root);
    }).catch(function (error) {
        console.error('Error loading or processing the JSON data:', error);
    });

}

// collapses a node based on if it has superhaplo descendants
// recursively checks for its children
function collapse(d) {
    if (d.children) {
        let hasSuperhaplogroupDescendant = false;

        function checkDescendants(node) {
            // TODO change here which superhaplo to use
            if (node.data.is_phylo_superhaplo === true) {
                hasSuperhaplogroupDescendant = true;
                return;
            }
            if (node.children) {
                node.children.forEach(checkDescendants);
            }
        }

        d.children.forEach(checkDescendants);

        if (hasSuperhaplogroupDescendant) {
            d.children.forEach(collapse);
        } else {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }
}

// helper to find out how deep the tree currently is
function getCurrentTreeDepth(node, depth = 0) {
    if (!node.children || node.children.length === 0) {
        return depth;
    }
    return Math.max(...node.children.map(child => getCurrentTreeDepth(child, depth + 1)));
}

// given a tree root, it resizes the svg element
// height is based on how deep the tree is
// width of the greatest x attribute of any node
function resizeContainer(root) {
  const currHeight = d3.max(root.descendants(), d => d.x);
  const currWidth = getCurrentTreeDepth(root) * overallWidth
  d3.select("#collapsible-tree svg")
    .attr("width", currWidth + margin.left + margin.right)
    .attr("height", currHeight + margin.top + margin.bottom);
}

// given a node, returns a d3 like string of points
// calculates a polygon that covers the current node
// then moves diagonally out to its children
function calculatePolygonPoints(d) {
    const childNodes = d.children || [];
    const twothirdswidth = overallWidth / 6;
    let overallWidthStart = overallWidth;
    if (d === root) {
        overallWidthStart = 1.5 * overallWidth;
    }
    let points = [
        [d.y - overallWidthStart / 2, d.x + overallHeight / 2],
        [d.y + twothirdswidth, d.x + overallHeight / 2]
    ];

    if (childNodes.length > 0) {
        const childMinX = d3.min(childNodes, child => child.x);
        const childMaxX = d3.max(childNodes, child => child.x);

        points = points.concat([
            [d.y + overallWidth / 3, childMaxX + overallHeight / 2],
            [d.y + overallWidth / 2, childMaxX + overallHeight / 2],
            [d.y + overallWidth / 2, childMinX - overallHeight / 2],
            [d.y + overallWidth / 3, childMinX - overallHeight / 2]
        ]);
    }

    points = points.concat([
        [d.y + twothirdswidth, d.x - overallHeight / 2],
        [d.y - overallWidthStart / 2, d.x - overallHeight / 2]
    ]);

    return points.map(p => p.join(",")).join(" ");
}

// function to redraw the tree after any interaction
// given a tree root, it draws all elements
// background polygons
// node - circles, labels
// links & tooltip
function update(source) {
    const treeData = d3.tree()
        .separation((a, b) => a.parent === b.parent ? 1 : 2)
        // usage of 'nodeSize' over 'size' seems better
        .nodeSize([overallHeight, overallWidth])(root);

    const nodes = treeData.descendants();
    const links = treeData.descendants().slice(1);

    // calculate the difference to move the tree down
    const minX = d3.min(root.descendants(), d => d.x);
    const xOffset = Math.abs(root.x - minX);

    nodes.forEach(d => {
        // d.y = d.depth * overallWidth; // make sure node width are constant length (not needed when nodeSize)
        d.x += xOffset;// move the tree down, because setting nodeSize, draws root at [0,0]
    });

    // ************ Polygons ****************

    // add polygons for each node
    const poly = svg.selectAll('polygon')
        .data(nodes, function (d) {
            return d.id || (d.id = ++i);
        });

    // enter new polygons
    const polyEnter = poly.enter().append('polygon')
        .attr('points', function (d) {
            return calculatePolygonPoints(d);
        })
        .style("fill", function (d) {
            return d.data.colorcode || "none";
        })
        .style("stroke", "none")
        .style("fill-opacity", 0);

    // merge new and existing polygons
    const polyUpdate = polyEnter.merge(poly);

    // gradually increase opacity for entering/moving polygons
    polyUpdate.transition()
        .duration(duration)
        .style("fill-opacity", 0.4)
        .attr('points', function (d) {
            return calculatePolygonPoints(d);
        });

    // fade out exiting polygons to remove old ones properly
    poly.exit().transition()
        .duration(duration)
        .style("fill-opacity", 0)
        .remove();


    // *********** Nodes **************
    const tooltip = d3.select("#tooltip");
    const node = svg.selectAll('g.node')
        .data(nodes, function (d) {
            return d.id || (d.id = ++i);
        });

    // new nodes
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('id', d => `node-${d.id}`)
        .attr("transform", `translate(${source.y0},${source.x0})`)
        .on('click', click)
        // tooltip hover event
        .on('mouseover', function (event, d) {
            let text = `<em>ID:</em> ${d.data.name} <br> <em>HG:</em> ${d.data.HG}` || "NA";
            tooltip.transition()
                .duration(200)
                .style('opacity', 1);
            tooltip.html(text)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px')
                .style('background-color', d.data.colorcode || "#ffffff");
        })
        .on('mouseout', function () {
            console.log('Mouse out');
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });

    // add node circles
    nodeEnter.append('circle')
        .attr('class', 'node')
        .style("fill", function (d) {
            return d._children ? "lightsteelblue" : "#fff";
        })
        .attr("stroke", "black")
        .attr("r", 4.5);

    // node labels
    nodeEnter.append('text')
        .attr("dy", ".35em")
        .attr("x", -8)
        .attr("cursor", "pointer")
        // TODO yeah so this fixed value here is not great
        .text(d => truncateText(d.data.name, overallWidth / 1.3))
        .attr("text-anchor", "end")
        .style("font", "11px sans-serif");

    // merge old and new nodes
    const nodeUpdate = nodeEnter.merge(node);
    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", function (d) {
            return "translate(" + d.y + "," + d.x + ")";
        });
    nodeUpdate.select('circle.node')
        .style("fill", function (d) {
            return d._children ? "lightsteelblue" : "#fff";
        });

    // remove exiting nodes
    node.exit().transition()
        .duration(duration)
        .attr("transform", function (d) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();
    node.exit().select('circle')
        .attr('r', 1e-6);
    node.exit().select('text')
        .style('fill-opacity', 1e-6);


    // ************ Links ****************

    // get links
    const link = svg.selectAll('path.link')
        .data(links, function (d) {
            return d.id;
        });

    // new links
    const linkEnter = link.enter().insert('path', "g")
        .attr("class", "link")
        .attr('d', function (d) {
            var o = {x: source.x0, y: source.y0};
            return rightAnglePath(o, o);
        })
        .style("fill", "none")
        .style("stroke", "#ccc")
        .style("stroke-width", "2px");

    // merge old and new
    const linkUpdate = linkEnter.merge(link);
    linkUpdate.transition()
        .duration(duration)
        .attr('d', function (d) {
            return rightAnglePath(d, d.parent);
        });

    // remove exiting links
    link.exit().transition()
        .duration(duration)
        .attr('d', function (d) {
            var o = {x: source.x, y: source.y};
            return rightAnglePath(o, o);
        })
        .remove();

    // links end


    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });

    // click event handler for nodes
    // reads toggle selection and performs selected action on click
    function click(event, d) {
        const expandOption = document.querySelector('input[name="tripple"]:checked').value;

        if (expandOption === "N") {
            window.location.href = `nodeInfo.html?nodeId=${encodeURIComponent(d.data.name)}`;
        } else if (d.children) {
            collapseNode(d);
        } else if (expandOption === "Y") {
            expandFully(d); // Expand all descendants
        } else if (expandOption === "I") {
                expandNode(d);
        }
        // TODO probably make this async/await so the resizing isnt as jerky
        update(d);
        resizeContainer(root);
    }

    // given two nodes, returns d3 like paths string
    // represents a non symmetric path with a right angle kink
    function rightAnglePath(s, d) {
        const horizontalOffset = -2 * overallWidth / 3;

        return `M ${s.y} ${s.x}
                H ${s.y + horizontalOffset}
                V ${d.x}
                H ${d.y}`;
    }

    // rehighlight nodes from search after updating
    highlightNodes();
} // end of update function

// marks all descendants of a given node to be expanded recursively
function expandAllDescendantsOfNode(d) {
    expandNode(d)
    if (d.children) {
        d.children.forEach(expandAllDescendantsOfNode);
    }
}

// marks children of a given node to be expanded
function expandNode(node) {
    if (node._children) {
        node.children = node._children;
        node._children = null;
    }
}

// marks children of nodes to be collapsed
function collapseNode(node) {
    if (node.children) {
        node._children = node.children;
        node.children = null;
    }
}

// click event to fully expand the tree
// just recursively marks all children of the root th be expanded
// then redraws tree
function expandFully(node=root) {
    expandNode(node)

    if (node.children) {
        node.children.forEach(expandAllDescendantsOfNode);
    }
    update(node);
    resizeContainer(root);
}

// highlight matches of search
// removes highlight class from old nodes' text
// and adds the class to all matches' text element
function highlightNodes() {
    d3.selectAll('.node text')
        .classed('highlight-text', false);

    d3.selectAll('.node.search-result text')
        .classed('highlight-text', true);
}

// highlights the focused node (best match)
// removes focused class from old match
// adds the class to the current best match node text
function highlightFocusedNode(node) {
    d3.selectAll('.node text')
        .classed('focused-node', false);

    d3.select(node).select('text')
        .classed('focused-node', true);
}

// reset search results and remove all highlights
function resetSearchResults() {
    d3.selectAll('.node').classed('search-result', false);
    d3.selectAll('.node text').classed('highlight-text', false);
    d3.selectAll('.node text').classed('focused-node', false);
}

// creates a subtree given a node id
// used to draw specific subtrees calles from node info pages
// works by iterating recursively through the full tree until the nodeId noed is found
// returns ds.hierarchy created tree of that node as root
function filterSubtree(treeData, rootNodeId) {
    function findNode(data, nodeId) {
        if (data.name === nodeId) {
            return data; // Return this node and its children as the subtree
        }
        if (data.children) {
            for (const child of data.children) {
                const result = findNode(child, nodeId);
                if (result) return result;
            }
        }
        return null;
    }

    // subtree starting from the node with rootNodeId
    return d3.hierarchy(findNode(treeData, rootNodeId), d => d.children);
}
