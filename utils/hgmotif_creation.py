# This file is part of the mitoTree project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoTree.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


# helper file to create a hgmotivs csv from an .emp input file


def parse_haplo_motifs(input_file):
    """
    Reads an input file that contains lines like:

        #! ALL
        mt-MRCA    mt-MRCA    1    73G 146C 152C ...
        L0         L0         1    73G 146C 152C ...
        ...

    and writes a CSV file with columns:

        haplogroup,hg-signature

    It skips lines starting with '#!' and assumes tab-delimited columns,
    where the 4th column contains the motif string.
    """
    haplogroup_dict = {}

    with open(input_file, 'r') as fin:
        for line in fin:
            line = line.strip()
            if not line or line.startswith("#!"):
                continue

            cols = line.split('\t')
            if len(cols) < 4:
                print(f"Row does not have 4 columns: {line}")
                continue

            haplogroup = cols[0].strip()
            signature = cols[3].strip()

            haplogroup_dict[haplogroup] = signature

        print(f"Created dict with haplogroup-motif pairs from {input_file}.")
        return haplogroup_dict


def check_same_haplos(json_tree, haplogroup_dict):

    haplos = set()

    def traverse(node):
        if "name" in node:
            haplos.add(node["name"])
        if "children" in node:
            for child in node["children"]:
                traverse(child)

    traverse(json_tree)

    if set(haplogroup_dict.keys()) != haplos:
        return False

    return True