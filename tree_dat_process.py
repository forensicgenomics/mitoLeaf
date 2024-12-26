# This file is part of the mitoTree project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoTree.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


###############################
#
# This file is currently the pipeline to create all data needed for the webapp
# It reads the relevant files in './inputfiles' and writes the processed data to './docs/data'
#
# Both radial and linear json trees used for the js visualization are created
# as well as other tree formats such as newick
# and all downloadable tables
#
################################

import json
import pandas as pd
from shutil import copyfile

from utils.file_readers import csv_as_dict, read_txt
from utils.xml_tree_parser import xml_tree_parsing, tree_to_json, create_bare_tree, create_newick_tree

from utils.path_defaults import *


### profile attributes table
# reads profile country and tech files and merges them
# to accession#, country, technology, assembly
# writes result as 'profiles.csv'
sequencing_tech_df = pd.read_csv(SEQ_TECH)
country_df = pd.read_csv(COUNTRY, sep=';')
sequencing_tech_df.columns = ['accession_number', 'technology', 'assembly']
country_df.columns = ['accession_number', 'country']

comb_acc_table = pd.merge(sequencing_tech_df, country_df, how='left', on='accession_number')
comb_acc_table.fillna('NA', inplace=True)

comb_acc_table.to_csv(f'{DATA_DEST}profiles.csv', index=False)
###


### profiles data
# reads profiles of haplogroups file
# writes resulting motif, num_profiles, profiles table as 'mito_representatives.csv'
mito_representatives_df = pd.read_csv(MOTIF_REPRESENTATIVES, sep='\t')
mito_representatives_df.columns = ['motif', 'num_profiles', 'profiles']
mito_representatives_df['profiles'] = mito_representatives_df['profiles'].fillna('')
mito_representatives_df.to_csv(f'{DATA_DEST}mito_representatives.csv', index=False)

# used to embedd accession# into json tree
profiles_dict = mito_representatives_df.set_index('motif')['profiles'].apply(lambda x: x.split()).to_dict()
####


### create trees

# parse tree from xml input file
tree, root = xml_tree_parsing(XML_FILE)

# read tree attributes files
hg_motif_dict = csv_as_dict(HGMOTIFS_FILE)
color_dict = csv_as_dict(COLORCODE_FILE, delimiter=",")
superhaplo = read_txt(SUPERHAPLO_FILE)
phylo_superhaplo = read_txt(PHYLO_SUPERHAPLO_FILE)

# write full hg data table as 'hgmotifs.json'
with open(f'{DATA_DEST}hgmotifs.json', 'w') as json_file:
    json.dump(hg_motif_dict, json_file, indent=4)

# create linear tree with helper function to json file with all attributes
# and write as 'tree.son'
json_tree = tree_to_json(tree, root, color_dict, superhaplo, phylo_superhaplo, profiles=profiles_dict)
with open(f'{DATA_DEST}tree.json', 'w') as json_file:
    json.dump(json_tree, json_file, indent=4)

# creates a newick data file of the full mt-mcra tree
# and write it as 'fullTree.nwk'
newick_tree = create_newick_tree(tree, root)
with open(f'{DATA_DEST}fullTree.nwk', 'w') as nwk_file:
    nwk_file.write(newick_tree)


### radial stunted tree
# bare tree without single parent nodes that aren't superhaplo
# writes tree as json and nwk files
bare_tree = create_bare_tree(tree, root, superhaplo, remove_add=True)
bare_tree_json = tree_to_json(bare_tree, bare_tree.getroot(), color_dict, superhaplo, phylo_superhaplo)
with open(f'{DATA_DEST}radialTree.json', 'w') as json_file:
    json.dump(bare_tree_json, json_file, indent=4)
# newick radial tree
newick_radial_tree = create_newick_tree(bare_tree, bare_tree.getroot())
with open(f'{DATA_DEST}pruned_radialTree.nwk', 'w') as nwk_file:
    nwk_file.write(newick_radial_tree)

###


# copy inputfiles unchanged that should be downloadable to the appropriate dir
copyfile("./inputfiles/mitoTree_v1.0_phm.xml", f"{DATA_DEST}mitoTree_v1.0_phm.xml")
