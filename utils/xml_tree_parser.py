# This file is part of the mitoTree project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoTree.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


#################################
#
# basic functions used to build the trees
# parse tree form xml file and create attributed json tree
#
# funs to create radial and linear trees
#
#################################

import xml.etree.ElementTree as ET


# parse xml inputfile
def xml_tree_parsing(xml_file):
    tree = ET.parse(xml_file)
    root = tree.getroot()

    return tree, root


# creates newick file of xml tree
# input output of xml_tree_parsing
def create_newick_tree(tree, root) :
    # recursive fun to process nodes and their children
    def xml_to_newick(node):
        label = node.attrib.get('Id', 'N/A')

        if len(node) == 0:
            return label

        children_newick = []
        for child in node:
            children_newick.append(xml_to_newick(child))

        children_str = ','.join(children_newick)

        # string in Newick format: (child1,child2,...,childN)label
        return f'({children_str}){label}'

    newick_str = xml_to_newick(root)

    return newick_str + ';'


# function to strip and prune tree
# used to create radial tree
# returns an ElementTree
# provide an id_list of nodes to keep (i.e. superhaplos)
# drops siblings and children of nodes in this list, effectively pruning branches
# set remove_add flag to drop unnecessary inbetween nodes and promote superhaplos up depths
def create_bare_tree(tree, root, id_list, remove_add = False):
    # helper fun to keep only id_list nodes
    def filter_nodes(element, is_root=False):
        # if the element's 'Id' attribute is in the id_list, process its children
        include_element = is_root or element.get('Id') in id_list
        new_element = ET.Element(element.tag, attrib=element.attrib) if include_element else None

        for child in element:
            filtered_child = filter_nodes(child)
            if filtered_child is not None:
                if new_element is None:
                    # create element if any of its children are to be included
                    new_element = ET.Element(element.tag, attrib=element.attrib)
                new_element.append(filtered_child)

        return new_element

    # helper fun to drop unnecessary parent nodes with single children after eliminating non-list nodes
    def promote_single_child_nodes(element):
        if element is None:
            return None

        while len(element) == 1 and element.get('Id') not in id_list:
            # promote the only child by replacing this node with its child
            child = element[0]
            element = child

        # recursively process the remaining children of current node
        for i, child in enumerate(element):
            promoted_child = promote_single_child_nodes(child)
            if promoted_child is not child:
                element.remove(child)
                element.insert(i, promoted_child)

        return element


    filtered_root = filter_nodes(root, True)

    if filtered_root is None:
        raise ValueError("No nodes with the specified IDs found.")

    if remove_add:
        filtered_root = promote_single_child_nodes(filtered_root)

    return ET.ElementTree(filtered_root)


# create json tree from ElementTree
# also writes additional arguments if supplied
# color_dict - dictionary of motif to color
# superhaplo_id - list of designated superhaplogroups
# phylo_superhaplo_id - second list of superhaplos (used in radial tree atm)
# profiles - dictionary of motif to list of accession numbers
def tree_to_json(tree, root, color_dict=None, superhaplo_id=None, phylo_superhaplo_id=None, profiles=None):
    # recursive fun to process node by node
    def parse_node(node, inherited_color=None, is_root=False):
        node_id = node.attrib.get("Id")
        node_color = color_dict.get(node_id, inherited_color) if color_dict else inherited_color
        is_superhaplo = superhaplo_id is not None and (node_id in superhaplo_id or is_root)
        is_phylo_superhaplo = phylo_superhaplo_id is not None and node_id in phylo_superhaplo_id

        node_dict = {
            "name": node_id,
            "HG": node.attrib.get("HG", "")
        }

        if color_dict:
            node_dict["colorcode"] = node_color

        if is_superhaplo:
            node_dict["is_superhaplo"] = True

        if is_phylo_superhaplo:
            node_dict["is_phylo_superhaplo"] = True

        if profiles and profiles[node_id]:
            node_dict["profiles"] = sorted(profiles[node_id])

        node_dict["children"] = [parse_node(child, node_color) for child in node]

        return node_dict

    json_tree = parse_node(root, is_root=True)
    return json_tree
